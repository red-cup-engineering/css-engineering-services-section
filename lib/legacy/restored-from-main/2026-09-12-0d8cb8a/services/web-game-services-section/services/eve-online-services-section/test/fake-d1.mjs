// In-memory stand-in for a Cloudflare D1Database, for use in node --test
// specs across this package (not just src/db/store.mjs — any agent whose
// code takes a D1-shaped `env.DB` can drive it against this fake). No
// sqlite dependency: it's a small hand-rolled SQL subset over plain JS
// objects, deliberately narrow rather than a general SQL engine.
//
// Supported statement shapes only:
//   CREATE TABLE t (col TYPE [PRIMARY KEY [AUTOINCREMENT]] [NOT NULL]
//                    [UNIQUE] [DEFAULT (datetime('now'))|'literal']
//                    [REFERENCES other(col)], ...)
//   INSERT INTO t (col, ...) VALUES (?, ...)
//     [ON CONFLICT(col) DO UPDATE SET col = excluded.col, ...]
//     [RETURNING col, ... | *]
//   UPDATE t SET col = ? [, col = ?]* WHERE <cond> [RETURNING col, ... | *]
//   SELECT col, ... | * FROM t [WHERE <cond>] [ORDER BY col [ASC|DESC], ...]
//                     [LIMIT ?|n]
// <cond> is an AND-only list of: col = ?, col IS NULL, col IS NOT NULL,
// col >= ?, col <= ?, col > ?, col < ?. No OR, no JOIN, no subqueries,
// no DELETE — none of this package's v1 queries need them; extend the
// parser here (not by adding a real SQL dependency) if a later agent does.
//
// `db.exec(sql)` runs one or more semicolon-separated CREATE TABLE and/or
// ALTER TABLE ... ADD COLUMN statements (e.g. the contents of
// migrations/0001_init.sql followed by migrations/0002_ai_provider.sql) to
// seed the schema. `db.prepare(sql)` mirrors the D1 API: .bind(...args)
// returns an object with async first()/run()/all(), and prepare()'s own
// first()/run()/all() work directly for parameter-less statements.

function splitTopLevel(str, sep) {
  const parts = [];
  let depth = 0;
  let inQuote = false;
  let cur = "";
  for (const ch of str) {
    if (ch === "'") inQuote = !inQuote;
    if (!inQuote) {
      if (ch === "(") depth += 1;
      else if (ch === ")") depth -= 1;
    }
    if (ch === sep && depth === 0 && !inQuote) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

function literalFromToken(token) {
  if (token === "?") return { placeholder: true };
  if (token.startsWith("'") && token.endsWith("'")) {
    return { placeholder: false, value: token.slice(1, -1) };
  }
  if (/^-?\d+$/.test(token)) return { placeholder: false, value: parseInt(token, 10) };
  if (/^-?\d+\.\d+$/.test(token)) return { placeholder: false, value: parseFloat(token) };
  if (/^NULL$/i.test(token)) return { placeholder: false, value: null };
  if (/^TRUE$/i.test(token)) return { placeholder: false, value: 1 };
  if (/^FALSE$/i.test(token)) return { placeholder: false, value: 0 };
  return { placeholder: false, value: token };
}

function parseColumnDef(defStr) {
  const trimmed = defStr.trim();
  const nameMatch = trimmed.match(/^(\w+)/);
  if (!nameMatch) throw new Error(`fake-d1: cannot parse column definition: ${defStr}`);
  const name = nameMatch[1];
  const rest = trimmed.slice(name.length);
  const primaryKey = /\bPRIMARY\s+KEY\b/i.test(rest);
  const autoIncrement = /\bAUTOINCREMENT\b/i.test(rest);
  const notNull = /\bNOT\s+NULL\b/i.test(rest);
  const unique = /\bUNIQUE\b/i.test(rest);
  const defaultMatch = rest.match(/\bDEFAULT\s+(\((?:[^()]|\([^()]*\))*\)|'[^']*'|[^\s,]+)/i);
  let defaultSpec = null;
  if (defaultMatch) {
    const raw = defaultMatch[1];
    if (/datetime\(\s*'now'\s*\)/i.test(raw)) {
      defaultSpec = { kind: "now" };
    } else if (raw.startsWith("'") && raw.endsWith("'")) {
      defaultSpec = { kind: "literal", value: raw.slice(1, -1) };
    } else {
      defaultSpec = { kind: "literal", value: raw };
    }
  }
  return { name, primaryKey, autoIncrement, notNull, unique, default: defaultSpec };
}

function parseCreateTable(sql) {
  const match = sql.match(/^\s*CREATE TABLE\s+(\w+)\s*\(([\s\S]+)\)\s*$/i);
  if (!match) throw new Error(`fake-d1: cannot parse CREATE TABLE statement: ${sql}`);
  const table = match[1];
  const columns = splitTopLevel(match[2], ",").map(parseColumnDef);
  return { table, columns };
}

// ALTER TABLE t ADD COLUMN col TYPE [NOT NULL] [DEFAULT ...] — the one ALTER
// shape migrations/0002_ai_provider.sql needs (adding nullable/defaulted
// columns to an existing table). Backfills existing rows with the column's
// default (or null) so pre-migration rows read the same as a real D1
// ALTER TABLE ADD COLUMN would produce.
function parseAlterTableAddColumn(sql) {
  const match = sql.match(/^\s*ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+([\s\S]+)$/i);
  if (!match) throw new Error(`fake-d1: cannot parse ALTER TABLE statement: ${sql}`);
  const table = match[1];
  const column = parseColumnDef(match[2]);
  return { table, column };
}

function parseWhereClause(str) {
  // No parens appear inside our supported conditions, so a plain regex
  // split on AND is safe here (splitTopLevel's paren-depth tracking is
  // for comma-separated lists like column/value lists, not this).
  return str.split(/\s+AND\s+/i).map(parseCondition);
}

function parseCondition(raw) {
  const cond = raw.trim();
  let m = cond.match(/^(\w+)\s*=\s*\?$/);
  if (m) return { col: m[1], op: "eq", param: true };
  m = cond.match(/^(\w+)\s+IS\s+NOT\s+NULL$/i);
  if (m) return { col: m[1], op: "isNotNull", param: false };
  m = cond.match(/^(\w+)\s+IS\s+NULL$/i);
  if (m) return { col: m[1], op: "isNull", param: false };
  m = cond.match(/^(\w+)\s*(>=|<=|>|<)\s*\?$/);
  if (m) return { col: m[1], op: m[2], param: true };
  throw new Error(`fake-d1: unsupported WHERE condition: ${raw}`);
}

function parseOrderBy(str) {
  return splitTopLevel(str, ",").map((part) => {
    const m = part.match(/^(\w+)(?:\s+(ASC|DESC))?$/i);
    if (!m) throw new Error(`fake-d1: cannot parse ORDER BY clause: ${part}`);
    return { col: m[1], dir: (m[2] || "ASC").toUpperCase() };
  });
}

function stripTrailingClause(s, keywordRegex) {
  const m = s.match(keywordRegex);
  if (!m) return { rest: s, captured: null };
  return { rest: s.slice(0, m.index), captured: m[1] };
}

function parseInsert(sqlNoSemicolon) {
  let s = sqlNoSemicolon;
  let step = stripTrailingClause(s, /\sRETURNING\s+([\s\S]+)$/i);
  const returningSpec = step.captured ? step.captured.trim() : null;
  s = step.rest;

  let conflictCol = null;
  let conflictAssignments = [];
  const conflictMatch = s.match(/\sON CONFLICT\s*\(\s*(\w+)\s*\)\s*DO UPDATE SET\s+([\s\S]+)$/i);
  if (conflictMatch) {
    conflictCol = conflictMatch[1];
    conflictAssignments = splitTopLevel(conflictMatch[2], ",").map((a) => {
      const m = a.match(/^(\w+)\s*=\s*excluded\.(\w+)$/i);
      if (!m) throw new Error(`fake-d1: unsupported ON CONFLICT assignment: ${a}`);
      return { col: m[1], sourceCol: m[2] };
    });
    s = s.slice(0, conflictMatch.index);
  }

  const baseMatch = s.match(/^INSERT INTO\s+(\w+)\s*\(\s*([^)]+?)\s*\)\s*VALUES\s*\(\s*([^)]+?)\s*\)\s*$/i);
  if (!baseMatch) throw new Error(`fake-d1: cannot parse INSERT statement: ${sqlNoSemicolon}`);
  const table = baseMatch[1];
  const cols = splitTopLevel(baseMatch[2], ",");
  const valueTokens = splitTopLevel(baseMatch[3], ",").map(literalFromToken);
  return { type: "insert", table, cols, valueTokens, conflictCol, conflictAssignments, returningSpec };
}

function parseUpdate(sqlNoSemicolon) {
  let s = sqlNoSemicolon;
  let step = stripTrailingClause(s, /\sRETURNING\s+([\s\S]+)$/i);
  const returningSpec = step.captured ? step.captured.trim() : null;
  s = step.rest;

  const whereMatch = s.match(/\sWHERE\s+([\s\S]+)$/i);
  if (!whereMatch) throw new Error(`fake-d1: UPDATE without WHERE is not supported: ${sqlNoSemicolon}`);
  const whereStr = whereMatch[1];
  s = s.slice(0, whereMatch.index);

  const baseMatch = s.match(/^UPDATE\s+(\w+)\s+SET\s+([\s\S]+)$/i);
  if (!baseMatch) throw new Error(`fake-d1: cannot parse UPDATE statement: ${sqlNoSemicolon}`);
  const table = baseMatch[1];
  const setAssignments = splitTopLevel(baseMatch[2], ",").map((a) => {
    const m = a.match(/^(\w+)\s*=\s*(.+)$/);
    if (!m) throw new Error(`fake-d1: unsupported SET assignment: ${a}`);
    return { col: m[1], token: literalFromToken(m[2].trim()) };
  });
  const whereConditions = parseWhereClause(whereStr);
  return { type: "update", table, setAssignments, whereConditions, returningSpec };
}

function parseSelect(sqlNoSemicolon) {
  let s = sqlNoSemicolon;

  let step = stripTrailingClause(s, /\sLIMIT\s+(\?|\d+)\s*$/i);
  const limitToken = step.captured;
  s = step.rest;

  step = stripTrailingClause(s, /\sORDER BY\s+([\s\S]+)$/i);
  const orderByStr = step.captured;
  s = step.rest;

  step = stripTrailingClause(s, /\sWHERE\s+([\s\S]+)$/i);
  const whereStr = step.captured;
  s = step.rest;

  const baseMatch = s.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+(\w+)\s*$/i);
  if (!baseMatch) throw new Error(`fake-d1: cannot parse SELECT statement: ${sqlNoSemicolon}`);
  const colsSpec = baseMatch[1].trim();
  const table = baseMatch[2];
  const whereConditions = whereStr ? parseWhereClause(whereStr) : [];
  const orderSpec = orderByStr ? parseOrderBy(orderByStr) : null;
  return { type: "select", table, colsSpec, whereConditions, orderSpec, limitToken };
}

function parseSql(sql) {
  const s = sql.trim().replace(/;\s*$/, "");
  if (/^INSERT/i.test(s)) return parseInsert(s);
  if (/^UPDATE/i.test(s)) return parseUpdate(s);
  if (/^SELECT/i.test(s)) return parseSelect(s);
  throw new Error(`fake-d1: unsupported statement (only INSERT/UPDATE/SELECT): ${sql}`);
}

function project(row, colsSpec) {
  if (colsSpec.trim() === "*") return { ...row };
  const out = {};
  for (const col of splitTopLevel(colsSpec, ",")) {
    out[col] = Object.prototype.hasOwnProperty.call(row, col) ? row[col] : null;
  }
  return out;
}

function matchRow(row, resolvedConditions) {
  return resolvedConditions.every((c) => {
    const rv = row[c.col];
    switch (c.op) {
      case "eq":
        return rv === c.value;
      case "isNull":
        return rv === null || rv === undefined;
      case "isNotNull":
        return !(rv === null || rv === undefined);
      case ">=":
        return rv >= c.value;
      case "<=":
        return rv <= c.value;
      case ">":
        return rv > c.value;
      case "<":
        return rv < c.value;
      default:
        throw new Error(`fake-d1: unknown condition operator: ${c.op}`);
    }
  });
}

function sortRows(rows, orderSpec) {
  if (!orderSpec) return rows;
  const copy = [...rows];
  copy.sort((a, b) => {
    for (const { col, dir } of orderSpec) {
      const va = a[col];
      const vb = b[col];
      if (va === vb) continue;
      if (va === null || va === undefined) return dir === "ASC" ? -1 : 1;
      if (vb === null || vb === undefined) return dir === "ASC" ? 1 : -1;
      if (va < vb) return dir === "ASC" ? -1 : 1;
      if (va > vb) return dir === "ASC" ? 1 : -1;
    }
    return 0;
  });
  return copy;
}

export function createFakeD1() {
  const tables = new Map();

  function getTable(name) {
    const table = tables.get(name);
    if (!table) {
      throw new Error(`fake-d1: unknown table "${name}" (call exec() with its CREATE TABLE first)`);
    }
    return table;
  }

  async function exec(sql) {
    const statements = sql
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const statement of statements) {
      if (/^ALTER TABLE/i.test(statement)) {
        const { table, column } = parseAlterTableAddColumn(statement);
        const existing = getTable(table);
        existing.columns.push(column);
        const fillValue = column.default
          ? column.default.kind === "now"
            ? new Date().toISOString()
            : column.default.value
          : null;
        for (const row of existing.rows) row[column.name] = fillValue;
        continue;
      }
      const { table, columns } = parseCreateTable(statement);
      tables.set(table, { columns, rows: [], nextId: 1 });
    }
    return { success: true };
  }

  function resolveParams(tokens, args) {
    let i = 0;
    return tokens.map((t) => (t.placeholder ? args[i++] : t.value));
  }

  function resolveWhere(conditions, args, startIndex) {
    let i = startIndex;
    return conditions.map((c) => (c.param ? { ...c, value: args[i++] } : c));
  }

  function runInsert(ast, args) {
    const table = getTable(ast.table);
    const values = resolveParams(ast.valueTokens, args);
    const rowData = {};
    for (const col of table.columns) {
      const idx = ast.cols.indexOf(col.name);
      if (idx !== -1) {
        rowData[col.name] = values[idx];
      } else if (col.default) {
        rowData[col.name] = col.default.kind === "now" ? new Date().toISOString() : col.default.value;
      } else {
        rowData[col.name] = null;
      }
    }

    if (ast.conflictCol) {
      const existing = table.rows.find((r) => r[ast.conflictCol] === rowData[ast.conflictCol]);
      if (existing) {
        for (const { col, sourceCol } of ast.conflictAssignments) {
          existing[col] = rowData[sourceCol];
        }
        return { row: existing, inserted: false };
      }
    }

    for (const col of table.columns) {
      if (col.notNull && (rowData[col.name] === null || rowData[col.name] === undefined)) {
        throw new Error(`NOT NULL constraint failed: ${ast.table}.${col.name}`);
      }
      const enforceUnique = col.unique || (col.primaryKey && !col.autoIncrement);
      if (enforceUnique && rowData[col.name] !== null && rowData[col.name] !== undefined) {
        if (table.rows.some((r) => r[col.name] === rowData[col.name])) {
          throw new Error(`UNIQUE constraint failed: ${ast.table}.${col.name}`);
        }
      }
    }

    const pkCol = table.columns.find((c) => c.autoIncrement);
    if (pkCol) {
      rowData[pkCol.name] = table.nextId;
      table.nextId += 1;
    }
    table.rows.push(rowData);
    return { row: rowData, inserted: true };
  }

  function runUpdate(ast, args) {
    const table = getTable(ast.table);
    let i = 0;
    const resolvedSet = ast.setAssignments.map((a) => ({
      col: a.col,
      value: a.token.placeholder ? args[i++] : a.token.value,
    }));
    const resolvedWhere = resolveWhere(ast.whereConditions, args, i);
    const matched = table.rows.filter((r) => matchRow(r, resolvedWhere));
    for (const row of matched) {
      for (const { col, value } of resolvedSet) row[col] = value;
    }
    return matched;
  }

  function runSelect(ast, args) {
    const table = getTable(ast.table);
    const resolvedWhere = resolveWhere(ast.whereConditions, args, 0);
    let rows = table.rows.filter((r) => matchRow(r, resolvedWhere));
    rows = sortRows(rows, ast.orderSpec);
    if (ast.limitToken) {
      const paramsUsedByWhere = ast.whereConditions.filter((c) => c.param).length;
      const limit = ast.limitToken === "?" ? args[paramsUsedByWhere] : parseInt(ast.limitToken, 10);
      rows = rows.slice(0, limit);
    }
    return rows.map((r) => project(r, ast.colsSpec));
  }

  function prepare(sql) {
    const ast = parseSql(sql);
    const exec = (args) => {
      return {
        async first() {
          if (ast.type === "select") {
            const rows = runSelect(ast, args);
            return rows[0] ?? null;
          }
          if (ast.type === "insert") {
            const { row } = runInsert(ast, args);
            return ast.returningSpec ? project(row, ast.returningSpec) : null;
          }
          if (ast.type === "update") {
            const matched = runUpdate(ast, args);
            return ast.returningSpec && matched[0] ? project(matched[0], ast.returningSpec) : null;
          }
          throw new Error(`fake-d1: unreachable statement type ${ast.type}`);
        },
        async run() {
          if (ast.type === "insert") {
            const table = tables.get(ast.table);
            const pkCol = table?.columns.find((c) => c.autoIncrement);
            const { row } = runInsert(ast, args);
            return { success: true, meta: { last_row_id: pkCol ? row[pkCol.name] : null, changes: 1 } };
          }
          if (ast.type === "update") {
            const matched = runUpdate(ast, args);
            return { success: true, meta: { changes: matched.length } };
          }
          if (ast.type === "select") {
            const rows = runSelect(ast, args);
            return { success: true, meta: { changes: rows.length } };
          }
          throw new Error(`fake-d1: unreachable statement type ${ast.type}`);
        },
        async all() {
          if (ast.type === "select") {
            return { results: runSelect(ast, args), success: true };
          }
          if (ast.type === "insert") {
            const { row } = runInsert(ast, args);
            return { results: ast.returningSpec ? [project(row, ast.returningSpec)] : [], success: true };
          }
          if (ast.type === "update") {
            const matched = runUpdate(ast, args);
            return {
              results: ast.returningSpec ? matched.map((r) => project(r, ast.returningSpec)) : [],
              success: true,
            };
          }
          throw new Error(`fake-d1: unreachable statement type ${ast.type}`);
        },
      };
    };
    return {
      bind: (...args) => exec(args),
      first: () => exec([]).first(),
      run: () => exec([]).run(),
      all: () => exec([]).all(),
    };
  }

  return { exec, prepare };
}
