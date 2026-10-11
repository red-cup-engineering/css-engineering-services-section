

import { fromSection, ref } from "@red-cup-engineering/html-structural-projection-service";
import { renderTuftePacket } from "@red-cup-engineering/web-page-tiling-engine";
import { schemaNodePath } from "@red-cup-engineering/metrologic/settling/schema/site";
import { isJsonRecord, jsonResource } from "@red-cup-engineering/json-services-section";

/** Resolve one schema node's `$ref`: local `#`/`#/$defs/X` against `root`, a
 *  cross-schema address through the catalog — the same delegation
 *  `resolveRefRuntime` performs for validation. Undefined when the address is
 *  outside the package surface (the loose-slot convention has no literal to
 *  walk here, so the property degrades to unsupported). */
function resolveSchemaNode(node, root) {
  const ref = node["$ref"];
  if (typeof ref !== "string") return node;
  if (ref === "#") return root;
  if (ref.startsWith("#/$defs/")) {
    const defs = root["$defs"];
    const sub = typeof defs === "object" && defs !== null ? (defs)[ref.slice("#/$defs/".length)] : undefined;
    return typeof sub === "object" && sub !== null ? resolveSchemaNode(sub, root) : undefined;
  }
  return undefined;
}

function schemaFormControlKind(node) {
  if (Array.isArray(node["enum"])) return { kind: "enum", enumValues: node["enum"] };
  const type = node["type"];
  if (type === "string") return { kind: "string" };
  if (type === "number" || type === "integer") return { kind: "number" };
  if (type === "boolean") return { kind: "boolean" };
  if (type === "object" && typeof node["properties"] === "object" && node["properties"] !== null) return { kind: "object" };
  return { kind: "unsupported" };
}

/** Walk one object schema's top-level properties into typed control
 *  descriptors, recursing into nested objects. Undefined when `schema` is not
 *  itself an object schema with properties — the caller's signal to fall back
 *  to the single free-form textarea. */
function schemaFormControls(schema, root, prefix = "") {
  if (schema["type"] !== "object" || typeof schema["properties"] !== "object" || schema["properties"] === null) return undefined;
  const properties = schema["properties"];
  const required = new Set(Array.isArray(schema["required"]) ? (schema["required"]) : []);
  const controls = [];
  for (const [key, rawProp] of Object.entries(properties)) {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    const prop = typeof rawProp === "object" && rawProp !== null ? (rawProp) : {};
    const resolved = resolveSchemaNode(prop, root);
    if (resolved === undefined) {
      controls.push({ propertyName: key, propertyPath: path, required: required.has(key), kind: "unsupported" });
      continue;
    }
    const { kind, enumValues } = schemaFormControlKind(resolved);
    if (kind === "object") {
      const nested = schemaFormControls(resolved, root, path);
      controls.push(nested === undefined
        ? { propertyName: key, propertyPath: path, required: required.has(key), kind: "unsupported" }
        : { propertyName: key, propertyPath: path, required: required.has(key), kind: "object", controls: nested });
      continue;
    }
    controls.push({ propertyName: key, propertyPath: path, required: required.has(key), kind, ...(enumValues === undefined ? {} : { enumValues }) });
  }
  return controls;
}

/** Resolve an endpoint's `domainSchema` (a bare `$ref`, or an inline literal)
 *  to the concrete schema it addresses, then its top-level control walk —
 *  undefined when unresolvable or not an object schema. */
function endpointSchemaFormControls(domainSchema) {
  if (domainSchema === undefined) return undefined;
  const root = resolveSchemaNode(domainSchema, domainSchema);
  return root === undefined ? undefined : schemaFormControls(root, root);
}

/** The inverse of the control walk: coerce one posted string value to the type
 *  its control descriptor declares. Numbers/booleans that fail to coerce are
 *  left as the raw string so the schema contract validator produces the rejection,
 *  rather than swallowing the error here. */
function coerceSchemaFormValue(control, raw) {
  if (control.kind === "number") {
    const value = Number(raw);
    return Number.isFinite(value) ? value : raw;
  }
  if (control.kind === "boolean") return raw === "true";
  if (control.kind === "enum" && control.enumValues !== undefined) {
    return control.enumValues.find((value) => String(value) === raw) ?? raw;
  }
  return raw;
}

function decodeSchemaFormValue(controls, params) {
  const out = {};
  for (const control of controls) {
    if (control.kind === "object" && control.controls !== undefined) {
      const nested = decodeSchemaFormValue(control.controls, params);
      if (Object.keys(nested).length > 0) out[control.propertyName] = nested;
      continue;
    }
    const raw = params.get(control.propertyPath);
    if (raw === null) continue;
    if (control.kind === "unsupported") {
      try {
        out[control.propertyName] = parseJsonValue(raw);
      } catch {
        out[control.propertyName] = raw;
      }
      continue;
    }
    out[control.propertyName] = coerceSchemaFormValue(control, raw);
  }
  return out;
}

function parseJsonValue(text) {
  return JSON.parse(text);
}

/**
 * Decode a posted `application/x-www-form-urlencoded` body back into the
 * input value shape `endpoint.domainSchema` declares, name-path property by
 * name-path property. Returns `undefined` when the schema does not resolve to a
 * walkable object shape, signalling the caller to leave the wire untouched
 * (the schema-less/free-form textarea path posts the whole input value as one
 * `body` control already handled upstream).
 */
export function decodeSchemaFormEntries(domainSchema, formBody) {
  const controls = endpointSchemaFormControls(domainSchema);
  if (controls === undefined) return undefined;
  return decodeSchemaFormValue(controls, new URLSearchParams(formBody));
}

function schemaFields(controls) {
  return controls.flatMap((control) => {
    if (control.kind === "object") return schemaFields(control.controls ?? []);
    const options = control.kind === "boolean" ? [true, false] : control.enumValues;
    return [{
      name: control.propertyPath, label: control.propertyPath, required: control.required,
      kind: options ? "select" : control.kind === "number" ? "number" : control.kind === "unsupported" ? "textarea" : "text",
      ...(options ? { options: options.map((value) => ({ value: String(value), label: String(value) })) } : {}),
      ...(control.kind === "unsupported" ? { description: "JSON value" } : {}),
    }];
  });
}

/** An operation whose input schema yields no native controls takes its input as one JSON body. */
function programBodyFormHtml(endpoint, base) {
  const subject = `operation:${endpoint.name}`;
  const source = jsonResource(endpoint, "operation endpoint");
  if (!isJsonRecord(source)) throw new TypeError("programFormHtml: endpoint must be an object");
  const reading = fromSection({ affirmed: Object.entries(source).map(([predicate, object]) => ({ predicate, object, citation: subject })) }, { subject });
  return renderTuftePacket(reading, { source, evidence: { base, subject } }, {
    title: endpoint.name,
    subtitle: endpoint.summary ?? "",
    tiles: [
      { id: "navigation", title: "Operations", links: [{ href: base || "/", label: "All operations" }], span: 12 },
      ...(endpoint.description ? [{ id: "description", title: "Description", content: endpoint.description, span: 12 }] : []),
      { id: "contract", title: "Input and output", table: { columns: ["Input", "Output"], rows: [[endpoint.input, endpoint.output]] }, span: 12 },
      { id: "invocation", title: "Run operation", span: 12, form: {
        id: "operation-input", action: `${base.replace(/\/+$/, "")}/${encodeURIComponent(endpoint.name)}`, method: "post",
        fields: [{ id: "body", name: "body", kind: "textarea", label: "Input" }],
        submitters: [{ label: "Run", kind: "submit" }],
      } },
    ],
  }).html;
}

/**
 * Render an operation with native controls derived from its input schema.
 * @param endpoint - The current operation endpoint declaration.
 * @param base - Its local mount path.
 * @returns A TUFTE-rendered SHP document with the existing invocation protocol.
 */
export function programFormHtml(endpoint, base) {
  const controls = endpointSchemaFormControls(endpoint.domainSchema);
  if (controls === undefined) return programBodyFormHtml(endpoint, base);
  const source = jsonResource(endpoint);
  const subject = `operation:${endpoint.name}`;
  const reading = fromSection({ affirmed: [{ predicate: "endpoint", object: source, citation: subject }] }, { subject });
  return renderTuftePacket(reading, { source, evidence: { base } }, {
    title: endpoint.name, subtitle: endpoint.summary ?? "",
    tiles: [
      { id: "navigation", title: "Operations", span: 12, links: [{ href: base || "/", label: "All operations" }] },
      { id: "description", title: "Description", content: endpoint.description ?? "", span: 12 },
      { id: "contract", title: "Input and output", table: { columns: ["Input", "Output"], rows: [[endpoint.input, endpoint.output]] }, span: 12 },
      { id: "invocation", title: "Run operation", span: 12, form: {
        action: `${base}/${encodeURIComponent(endpoint.name)}?input-format=form`, method: "post",
        fields: schemaFields(controls), submitters: [{ kind: "submit", label: "Run" }],
      } },
    ],
  }).html;
}

/**
 * Render program contracts, operation navigation, and composition frontier.
 * @param discovery - Current program discovery.
 * @param base - Its local mount path.
 * @param manifold - The available composition readout.
 * @returns A TUFTE-rendered SHP document preserving discovery and frontier evidence.
 */
export function programIndexHtml(discovery, base, manifold) {
  const routes = new Map(discovery.programs.map((program) => [`operation:${program.name}`, `${base}/${encodeURIComponent(program.name)}`]));
  const source = jsonResource({ discovery, manifold });
  const subject = `package:${discovery.package}`;
  const reading = fromSection({ affirmed: discovery.programs.map((program) => ({ predicate: "operation", object: ref(`operation:${program.name}`), citation: subject })) }, { subject });
  const extrema = manifold === undefined ? [] : [
    ...(["domains", "codomains", "incoming", "outgoing"]).map((key) => ({
      id: key, title: key, span: 6, table: { columns: ["Schema", "Operations"], rows: manifold.extrema[key].map((row) => [{ href: schemaNodePath(row.schema), text: row.schema }, row.operations.join(", ")]) },
    })),
    ...(["edges", "rejectedEdges"]).map((key) => ({
      id: key, title: key === "edges" ? "Local Hoare edges" : "Rejected local edges", span: 12,
      table: { columns: ["Schema", "From", "To", "Relation", "Accepted"], rows: manifold.extrema[key].map((row) => [
        { href: schemaNodePath(row.schema), text: row.schema }, row.from, row.to, row.relation, String(row.ok),
      ]) },
    })),
    { id: "apex", title: "Apex", data: manifold.apex, span: 12 },
  ];
  return renderTuftePacket(reading, { source, evidence: { base }, resolveHref: (id) => routes.get(id) }, {
    title: discovery.package,
    tiles: [
      { id: "interfaces", title: "Interfaces", span: 8, links: [
        ["openapi.json", "OpenAPI"], ["discovery", "Discovery"], ["operations-manifold", "Operations manifold"], ["feed", "Journal feed"], ["health", "Health"],
      ].map(([path, label]) => ({ href: `${base}/${path}`, label: label })) },
      { id: "mcp", title: "MCP", content: `POST ${base}/mcp`, span: 4 },
      { id: "operations", title: "Operations", span: 12, table: { columns: ["Operation", "Summary", "Input", "Output", "Contract", "Settlement"], rows: discovery.programs.map((program) => [
        { href: `${base}/${encodeURIComponent(program.name)}`, text: program.name }, program.summary ?? "", program.input, program.output, JSON.stringify(program.contract), JSON.stringify(program.settlement),
      ]) } },
      ...extrema,
    ],
  }).html;
}

/**
 * Render the program mounts from their current discovery records.
 * @param mounts - Current projected surfaces.
 * @param paths - Resolved local mount paths.
 * @returns A TUFTE-rendered SHP document with mount navigation.
 */
export function operationManifoldIndexHtml(mounts, paths) {
  const rows = mounts.map(({ name, induced }) => ({ name, path: paths.get(name) ?? `/${name}`, discovery: induced.discovery }));
  const source = jsonResource(rows);
  const routes = new Map(rows.map((row) => [`mount:${row.name}`, row.path]));
  const reading = fromSection({ affirmed: rows.map((row) => ({ predicate: "mount", object: ref(`mount:${row.name}`), citation: "manifold" })) }, { subject: "manifold" });
  return renderTuftePacket(reading, { source, resolveHref: (id) => routes.get(id) }, {
    title: "manifold", tiles: [{ id: "mounts", title: "Mounts", span: 12, table: {
      columns: ["Mount", "Package", "Operations"], rows: rows.map((row) => [{ href: row.path, text: row.name }, row.discovery.package, String(row.discovery.programs.length)]),
    } }],
  }).html;
}
