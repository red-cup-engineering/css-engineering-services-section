/**
 * accounting/institution - economic institution and ledger action readings.
 *
 * This is organizing's economic/accounting facade over social gluing. It keeps
 * the generic desk, clearing, netting, Minsky-regime, and ledger report actions
 * in organizing while provider rails remain downstream.
 */
import {
  action,
  carrierFrom,
  classifyRegime,
  jsonResource,
  readFirstCohomologyOfSettlementFiltration,
  type Action,
  type ClosureRegimeData,
  type JsonRecord,
  type JsonValue,
} from "@red-cup-engineering/relating";
import type { Regime } from "@red-cup-engineering/socializing";
import {
  adjudicate as organizingAdjudicate,
  crossArena,
  federate as organizingFederate,
  institute as organizingInstitute,
  type Adjudication,
  type Constituent,
  type Federation,
  type Institution,
  type SocialBoundary,
} from "../organizing.mjs";
import loadLedger, { type Entry, type LoadedLedger } from "./ledger.mjs";
import {
  accountsReport,
  balanceReport,
  balanceSheetReport,
  cashflowReport,
  checkReport,
  incomeStatementReport,
  printReport,
  registerReport,
  renderAccounts,
  renderBalance,
  renderBalanceSheet,
  renderCashflow,
  renderCheck,
  renderIncomeStatement,
  renderPrint,
  renderRegister,
  renderStats,
  statsReport,
} from "./report.mjs";
import {
  debitNormalUtterance,
  induceLedgerTopology,
} from "./topology/ledger.mjs";
import {
  adjudicationCarrier,
  federationCarrier,
  institutionCarrier,
} from "../schemas.mjs";

export type { Adjudication, Constituent, Entry, Federation, Institution, LoadedLedger, SocialBoundary };

export interface AccountingDesk {
  readonly kind: "organizing.accounting.desk";
  readonly identity: string;
  readonly cohomologyRank: number;
  readonly glued: boolean;
}

export type MinskyRegime = "hedge" | "speculative" | "ponzi";

export function instituteEconomicBody(boundary: SocialBoundary): Institution {
  return organizingInstitute(boundary);
}

export function clearAndSettle(boundary: SocialBoundary): Adjudication {
  return organizingAdjudicate(boundary);
}

export function net(
  constituents: readonly Constituent[],
): { readonly nettingCost: number; readonly contested: number } {
  const ca = crossArena(constituents);
  return Object.freeze({ nettingCost: ca.federationOnly, contested: ca.contested });
}

export function federateVenues(covers: readonly SocialBoundary[]): Federation {
  return organizingFederate(covers);
}

export function minskyRegime(
  d: ClosureRegimeData,
): { readonly regime: Regime; readonly minsky: MinskyRegime } {
  const regime = regimeStringOf(d);
  const minsky: MinskyRegime =
    regime === "aperiodic" ? "ponzi" : regime === "transfinite-bounded" ? "speculative" : "hedge";
  return Object.freeze({ regime, minsky });
}

function regimeStringOf(d: ClosureRegimeData): Regime {
  switch (classifyRegime(d).kind) {
    case "ordinal.closure.regime.finite":
      return "strict";
    case "ordinal.closure.regime.scott":
      return "scott-continuous";
    case "ordinal.closure.regime.transfinite":
      return "transfinite-bounded";
    default:
      return "aperiodic";
  }
}

export function deskFromLedger(led: LoadedLedger, identity: string): AccountingDesk {
  const accounts = [...led.balances.keys()];
  const utterances = accounts.map((path) => debitNormalUtterance(path));
  const cohomologyRank =
    utterances.length === 0
      ? 0
      : readFirstCohomologyOfSettlementFiltration(
          induceLedgerTopology(utterances).settlement,
        ).generators.length;
  const name = identity.trim() !== "" ? identity.trim() : "desk";
  return Object.freeze({
    kind: "organizing.accounting.desk" as const,
    identity: name,
    cohomologyRank,
    glued: cohomologyRank === 0,
  });
}

const SEED_SCHEMA = Object.freeze({
  title: "SocialSeed",
  description: "an inter-agent membrane: newline-separated `agent|predicate` lines, or a JSON array of `[agent, predicate]` items.",
  type: ["string", "array"],
} as const);

const BOUNDARY_SCHEMA = Object.freeze({
  $id: "organizing/accounting/social-boundary",
  title: "SocialBoundary",
  type: "object",
  description: "the institution's three social boundary faces; any face may be omitted.",
  properties: { socializing: SEED_SCHEMA, computing: SEED_SCHEMA, gaming: SEED_SCHEMA },
} as const);

const ENTRIES_SCHEMA = Object.freeze({
  $id: "organizing/accounting/journal-entries",
  title: "JournalEntries",
  type: "array",
  description: "a journal: an array of parsed accounting Entry carriers loaded into the adjudicated record-state.",
  items: { $ref: "organizing/accounting-entry" },
} as const);

export const socialBoundaryCarrier = carrierFrom(BOUNDARY_SCHEMA);

export const nettingRequestCarrier = carrierFrom({
  $id: "organizing/accounting/netting-request",
  title: "NettingRequest",
  type: "object",
  required: ["constituents"],
  properties: {
    constituents: {
      type: "array",
      items: {
        type: "object",
        required: ["utterances"],
        properties: {
          name: { type: "string" },
          utterances: { type: "array" },
        },
      },
    },
  },
  description: "A multilateral netting request over named constituents and their utterances.",
} as const);

export const nettingResultCarrier = carrierFrom({
  $id: "organizing/accounting/netting-result",
  title: "NettingResult",
  type: "object",
  properties: {
    nettingCost: { type: "integer" },
    contested: { type: "integer" },
  },
  description: "The irreducible netting cost and contested overlap count of a multilateral netting.",
} as const);

export const venueFederationRequestCarrier = carrierFrom({
  $id: "organizing/accounting/venue-federation-request",
  title: "VenueFederationRequest",
  type: "object",
  required: ["venues"],
  properties: { venues: { type: "array", items: BOUNDARY_SCHEMA } },
  description: "A request to federate accounting venues by parallel-composing their social boundaries.",
} as const);

export const minskyRegimeRequestCarrier = carrierFrom({
  $id: "organizing/accounting/minsky-regime-request",
  title: "ClosureRegimeData",
  type: "object",
  required: ["scottContinuous", "finiteBase", "countableCofinality"],
  properties: {
    scottContinuous: { type: "boolean" },
    finiteBase: { type: "boolean" },
    countableCofinality: { type: "boolean" },
  },
  description: "Closure-regime data used to classify an accounting leverage settling's Minsky posture.",
} as const);

export const minskyRegimeCarrier = carrierFrom({
  $id: "organizing/accounting/minsky",
  title: "MinskyRegime",
  type: "object",
  properties: {
    regime: { type: "string" },
    minsky: { enum: ["hedge", "speculative", "ponzi"] },
  },
  description: "The closure-regime reading paired with its Minsky leverage posture.",
} as const);

export const journalEntriesCarrier = carrierFrom(ENTRIES_SCHEMA);

export const accountingDeskCarrier = carrierFrom({
  $id: "organizing/accounting/desk",
  title: "AccountingDesk",
  type: "object",
  properties: {
    kind: { const: "organizing.accounting.desk" },
    identity: { type: "string" },
    cohomologyRank: { type: "integer" },
    glued: { type: "boolean" },
  },
  description: "An accounting desk read from a loaded ledger's adjudicated record-state.",
} as const);

export const renderedReportCarrier = carrierFrom({
  $id: "organizing/accounting/rendered-report",
  title: "RenderedAccountingReport",
  type: "string",
  description: "A rendered accounting report string.",
} as const);

export const settleLedgerRequestCarrier = carrierFrom({
  $id: "organizing/accounting/settle-ledger-request",
  title: "SettleLedgerRequest",
  type: "object",
  required: ["transactions"],
  properties: { transactions: { type: "array" } },
  description: "A transaction set to settle into a ledger balance report.",
} as const);

function admitBoundary(input: JsonValue, verb: string): SocialBoundary {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${verb}: expected a { socializing?, computing?, gaming? } boundary object`);
  }
  const record = input as JsonRecord;
  return {
    ...(record["socializing"] === undefined ? {} : { socializing: record["socializing"] }),
    ...(record["computing"] === undefined ? {} : { computing: record["computing"] }),
    ...(record["gaming"] === undefined ? {} : { gaming: record["gaming"] }),
  };
}

function admitConstituents(input: JsonValue, verb: string): Constituent[] {
  const raw = input !== null && typeof input === "object" && !Array.isArray(input)
    ? (input as JsonRecord)["constituents"]
    : input;
  if (!Array.isArray(raw)) {
    throw new TypeError(`${verb}: expected { constituents: [{ name, utterances }...] } or an array`);
  }
  return raw.map((item, index) => {
    if (item === null || typeof item !== "object" || Array.isArray(item) || !Array.isArray((item as JsonRecord)["utterances"])) {
      throw new TypeError(`${verb}: constituents[${index}] must be a { name, utterances } object`);
    }
    const rec = item as JsonRecord;
    return {
      name: typeof rec["name"] === "string" ? rec["name"] : `participant-${index}`,
      utterances: rec["utterances"] as unknown as Constituent["utterances"],
    };
  });
}

function admitLedger(input: JsonValue, verb: string): LoadedLedger {
  if (!Array.isArray(input)) {
    throw new TypeError(`${verb}: expected a JSON array of journal entries`);
  }
  return loadLedger(input as unknown as Entry[]);
}

function reportOpts(
  args: JsonRecord,
): { account?: string | null; depth?: number | null; begin?: string | null; end?: string | null } {
  const account = typeof args["account"] === "string" && args["account"].trim() !== "" ? args["account"].trim() : null;
  const depthRaw = args["depth"];
  const depth = typeof depthRaw === "number" ? depthRaw : typeof depthRaw === "string" && depthRaw.trim() !== "" ? Number(depthRaw) : null;
  const begin = typeof args["begin"] === "string" && args["begin"].trim() !== "" ? args["begin"].trim() : null;
  const end = typeof args["end"] === "string" && args["end"].trim() !== "" ? args["end"].trim() : null;
  return { account, depth, begin, end };
}

const stringResource = (value: string): JsonValue => jsonResource(value);
const inputJson = (input: unknown, context: string): JsonValue => jsonResource(input, context);
const argsJson = (args: Record<string, unknown>): JsonRecord => jsonResource(args, "action args") as JsonRecord;

export const institutionAction: Action = action({
  verb: "institution",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Institute an economic body: glue a plurality of agents into one institution.",
  description: "Domain: a social boundary. Codomain: the organizing institution carrier read as an economic body.",
  domain: socialBoundaryCarrier,
  codomain: institutionCarrier,
  run: (input: unknown): JsonValue => jsonResource(instituteEconomicBody(admitBoundary(inputJson(input, "institution input"), "institution")), "institution"),
});

export const instituteAction: Action = action({
  verb: "institute",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Institute the economic body over a social boundary.",
  description: "Legacy accounting/economic alias of organizing's canonical institute action.",
  domain: socialBoundaryCarrier,
  codomain: institutionCarrier,
  run: (input: unknown): JsonValue => jsonResource(instituteEconomicBody(admitBoundary(inputJson(input, "institute input"), "institute")), "institution"),
});

export const adjudicateAction: Action = action({
  verb: "adjudicate",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Clear and settle a social boundary into one adjudicated record-state.",
  description: "Legacy accounting/economic alias of organizing's canonical adjudicate action.",
  domain: socialBoundaryCarrier,
  codomain: adjudicationCarrier,
  run: (input: unknown): JsonValue => jsonResource(clearAndSettle(admitBoundary(inputJson(input, "adjudicate input"), "adjudicate")), "adjudication"),
});

export const clearAndSettleAction: Action = action({
  verb: "clear-and-settle",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Clear and settle a social boundary into one adjudicated record-state.",
  description: "The financial clearing verb read as organizing adjudication.",
  domain: socialBoundaryCarrier,
  codomain: adjudicationCarrier,
  run: (input: unknown): JsonValue => jsonResource(clearAndSettle(admitBoundary(inputJson(input, "clear-and-settle input"), "clear-and-settle")), "adjudication"),
});

export const netAction: Action = action({
  verb: "net",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Multilaterally net participants and report the irreducible netting cost.",
  description: "Domain: `{ constituents: [{ name, utterances }...] }`. Codomain: `{ nettingCost, contested }`.",
  domain: nettingRequestCarrier,
  codomain: nettingResultCarrier,
  run: (input: unknown): JsonValue => jsonResource(net(admitConstituents(inputJson(input, "net input"), "net")) as unknown as JsonValue),
});

export const federateVenuesAction: Action = action({
  verb: "federate-venues",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Federate economic venues by parallel-composing their social boundaries.",
  description: "Domain: `{ venues: [<social boundary>...] }`. Codomain: the organizing federation carrier.",
  domain: venueFederationRequestCarrier,
  codomain: federationCarrier,
  run: (input: unknown): JsonValue => {
    if (input === null || typeof input !== "object" || Array.isArray(input) || !Array.isArray((input as JsonRecord)["venues"])) {
      throw new TypeError("federate-venues: expected a { venues: [...] } object");
    }
    const venues = ((input as JsonRecord)["venues"] as readonly JsonValue[]).map((cover, index) =>
      admitBoundary(cover, `federate-venues: venues[${index}]`));
    return jsonResource(federateVenues(venues), "federation");
  },
});

export const federateAction: Action = action({
  verb: "federate",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Federate venues/circuits, legacy accounting alias.",
  description: "Legacy accounting/economic alias. Organizing's canonical registry uses `federate`; this subpath also exposes the historical `{ venues }` wire.",
  domain: venueFederationRequestCarrier,
  codomain: federationCarrier,
  run: federateVenuesAction.run,
});

export const minskyRegimeAction: Action = action({
  verb: "minsky-regime",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Classify the leverage settling's Minsky posture.",
  description: "Domain: `{ scottContinuous, finiteBase, countableCofinality }`. Codomain: `{ regime, minsky }`.",
  domain: minskyRegimeRequestCarrier,
  codomain: minskyRegimeCarrier,
  run: (input: unknown): JsonValue => {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("minsky-regime: expected { scottContinuous, finiteBase, countableCofinality }");
    }
    const r = input as JsonRecord;
    const d: ClosureRegimeData = Object.freeze({
      kind: "settling.closureRegimeData" as const,
      scottContinuous: r["scottContinuous"] === true,
      finiteBase: r["finiteBase"] === true,
      countableCofinality: r["countableCofinality"] === true,
    });
    return jsonResource(minskyRegime(d) as unknown as JsonValue);
  },
});

export const ledgerLoadAction: Action = action({
  verb: "ledger-load",
  inputFormat: "json",
  outputFormat: "json",
  options: ["identity"],
  summary: "Load a journal into the adjudicated accounting record-state and read its desk.",
  description: "Domain: a journal array. Codomain: organizing.accounting.desk.",
  domain: journalEntriesCarrier,
  codomain: accountingDeskCarrier,
  run: (input: unknown, args: Record<string, unknown>): JsonValue => {
    const identity = typeof args["identity"] === "string" ? args["identity"] : "desk";
    return jsonResource(deskFromLedger(admitLedger(inputJson(input, "ledger-load input"), "ledger-load"), identity) as unknown as JsonValue, "accounting-desk");
  },
});

export const balanceAction: Action = action({
  verb: "balance",
  inputFormat: "json",
  outputFormat: "string",
  options: ["account", "depth", "end"],
  summary: "Balance report over the adjudicated accounting record-state.",
  description: "Domain: a journal array. Codomain: rendered balance report.",
  domain: journalEntriesCarrier,
  codomain: renderedReportCarrier,
  run: (input: unknown, args: Record<string, unknown>): JsonValue => {
    const led = admitLedger(inputJson(input, "balance input"), "balance");
    return stringResource(renderBalance(balanceReport(led, reportOpts(argsJson(args))), led));
  },
});

export const balsheetAction: Action = action({
  verb: "balsheet",
  inputFormat: "json",
  outputFormat: "string",
  options: ["end"],
  summary: "Balance-sheet report over the adjudicated accounting record-state.",
  description: "Domain: a journal array. Codomain: rendered balance-sheet report.",
  domain: journalEntriesCarrier,
  codomain: renderedReportCarrier,
  run: (input: unknown, args: Record<string, unknown>): JsonValue => {
    const led = admitLedger(inputJson(input, "balsheet input"), "balsheet");
    return stringResource(renderBalanceSheet(balanceSheetReport(led, reportOpts(argsJson(args))), led));
  },
});

export const incomestmtAction: Action = action({
  verb: "incomestmt",
  inputFormat: "json",
  outputFormat: "string",
  options: ["begin", "end"],
  summary: "Income-statement report over the adjudicated accounting record-state.",
  description: "Domain: a journal array. Codomain: rendered income-statement report.",
  domain: journalEntriesCarrier,
  codomain: renderedReportCarrier,
  run: (input: unknown, args: Record<string, unknown>): JsonValue => {
    const led = admitLedger(inputJson(input, "incomestmt input"), "incomestmt");
    return stringResource(renderIncomeStatement(incomeStatementReport(led, reportOpts(argsJson(args))), led));
  },
});

export const cashflowAction: Action = action({
  verb: "cashflow",
  inputFormat: "json",
  outputFormat: "string",
  options: ["begin", "end"],
  summary: "Cashflow report over the adjudicated accounting record-state.",
  description: "Domain: a journal array. Codomain: rendered cashflow report.",
  domain: journalEntriesCarrier,
  codomain: renderedReportCarrier,
  run: (input: unknown, args: Record<string, unknown>): JsonValue => {
    const led = admitLedger(inputJson(input, "cashflow input"), "cashflow");
    return stringResource(renderCashflow(cashflowReport(led, reportOpts(argsJson(args))), led));
  },
});

export const registerAction: Action = action({
  verb: "register",
  inputFormat: "json",
  outputFormat: "string",
  options: ["account", "begin", "end"],
  summary: "Register report over the adjudicated accounting record-state.",
  description: "Domain: a journal array. Codomain: rendered register report.",
  domain: journalEntriesCarrier,
  codomain: renderedReportCarrier,
  run: (input: unknown, args: Record<string, unknown>): JsonValue => {
    const led = admitLedger(inputJson(input, "register input"), "register");
    return stringResource(renderRegister(registerReport(led, reportOpts(argsJson(args))), led));
  },
});

export const accountsAction: Action = action({
  verb: "accounts",
  inputFormat: "json",
  outputFormat: "string",
  summary: "Accounts listing over the adjudicated accounting record-state.",
  description: "Domain: a journal array. Codomain: rendered accounts listing.",
  domain: journalEntriesCarrier,
  codomain: renderedReportCarrier,
  run: (input: unknown): JsonValue => {
    const led = admitLedger(inputJson(input, "accounts input"), "accounts");
    return stringResource(renderAccounts(accountsReport(led)));
  },
});

export const statsAction: Action = action({
  verb: "stats",
  inputFormat: "json",
  outputFormat: "string",
  summary: "Statistics report over the adjudicated accounting record-state.",
  description: "Domain: a journal array. Codomain: rendered statistics report.",
  domain: journalEntriesCarrier,
  codomain: renderedReportCarrier,
  run: (input: unknown): JsonValue => stringResource(renderStats(statsReport(admitLedger(inputJson(input, "stats input"), "stats")))),
});

export const checkAction: Action = action({
  verb: "check",
  inputFormat: "json",
  outputFormat: "string",
  summary: "Integrity check over the adjudicated accounting record-state.",
  description: "Domain: a journal array. Codomain: rendered no-halt check report.",
  domain: journalEntriesCarrier,
  codomain: renderedReportCarrier,
  run: (input: unknown): JsonValue => stringResource(renderCheck(checkReport(admitLedger(inputJson(input, "check input"), "check")))),
});

export const printAction: Action = action({
  verb: "print",
  inputFormat: "json",
  outputFormat: "string",
  options: ["format"],
  summary: "Print journal entries in a target accounting format.",
  description: "Domain: a journal array; --format selects beancount or hledger.",
  domain: journalEntriesCarrier,
  codomain: renderedReportCarrier,
  run: (input: unknown, args: Record<string, unknown>): JsonValue => {
    if (!Array.isArray(input)) throw new TypeError("print: expected a JSON array of journal entries");
    const format = typeof args["format"] === "string" ? args["format"] : undefined;
    return stringResource(renderPrint(printReport(input as unknown as Entry[], format === undefined ? {} : { format })));
  },
});

export const settleLedgerAction: Action = action({
  verb: "settle-ledger",
  inputFormat: "json",
  outputFormat: "string",
  summary: "Settle a transaction set into a ledger balance report.",
  description: "Domain: `{ transactions }`. Codomain: rendered balance report over the loaded record-state.",
  domain: settleLedgerRequestCarrier,
  codomain: renderedReportCarrier,
  run: (input: unknown): JsonValue => {
    if (input === null || typeof input !== "object" || Array.isArray(input) || !Array.isArray((input as JsonRecord)["transactions"])) {
      throw new TypeError("settle-ledger: expected a { transactions: [...] } object");
    }
    const led = loadLedger((input as JsonRecord)["transactions"] as unknown as Entry[]);
    return stringResource(renderBalance(balanceReport(led, {}), led));
  },
});

export const legacyAccountingInstitutionActions: readonly Action[] = Object.freeze([
  institutionAction,
  instituteAction,
  adjudicateAction,
  clearAndSettleAction,
  netAction,
  federateAction,
  minskyRegimeAction,
  ledgerLoadAction,
  balanceAction,
  balsheetAction,
  incomestmtAction,
  cashflowAction,
  registerAction,
  accountsAction,
  statsAction,
  checkAction,
  printAction,
  settleLedgerAction,
]);

export const accountingInstitutionActions: readonly Action[] = Object.freeze([
  institutionAction,
  clearAndSettleAction,
  netAction,
  federateVenuesAction,
  minskyRegimeAction,
  ledgerLoadAction,
  balanceAction,
  balsheetAction,
  incomestmtAction,
  cashflowAction,
  registerAction,
  accountsAction,
  statsAction,
  checkAction,
  printAction,
  settleLedgerAction,
]);
