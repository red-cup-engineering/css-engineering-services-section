// The system carrier for a principal's Alpaca mandate.  It composes the
// existing custody, observation, planning, and reconciled-execution
// capabilities without accepting broker secrets or a caller-selected mode.
import { formAggressivePortfolioIntent } from '@red-cup-engineering/alpha-portfolio-order-intent-service';
import { allocationsFor } from '@red-cup-engineering/mandate-portfolio-allocation-service/market-game';
import { createBrokerageAuthorityCustody } from "@red-cup-engineering/brokerage-authority-custody-service";
import { createAlpacaAdapter } from "@red-cup-engineering/pluggable-venue-adapter-service/alpaca";
import {
  createLiveExecutionAndReconciliationProvider,
  createPaperExecutionAndReconciliationProvider,
} from "@red-cup-engineering/brokerage-execution-transport-service";
import { createAlpacaPrincipalAccountReadService } from "../scripts/principal-account-read.mjs";
import { createMandatedPortfolioService } from "@red-cup-engineering/alpaca-principal-actuation-service/portfolio";

const PRODUCTS = Object.freeze({
  paper: Object.freeze({ product: "alpaca-trading-paper", baseUrl: "https://paper-api.alpaca.markets/" }),
  live: Object.freeze({ product: "alpaca-trading-live", baseUrl: "https://api.alpaca.markets/" }),
});

const reference = (value, label) => {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label}-required`);
  return value;
};

function modeFor({ contract, authorityGrant }) {
  const match = /^alpaca-trading-(paper|live)$/u.exec(contract?.venue ?? "");
  if (!match || authorityGrant?.venue !== contract.venue || authorityGrant.adapter !== contract.venue) {
    throw new TypeError("current-alpaca-contract-and-grant-required");
  }
  return match[1];
}

function requireRecordReceipt(receipt, label) {
  if (!receipt?.id && !receipt?.graph && !receipt?.recordReceipt) throw new TypeError(`${label}-record-receipt-required`);
  return receipt;
}

/**
 * Create the sole operational boundary for a principal-owned Alpaca account.
 *
 * The supplied `authorityCustody` is the only component that ever retrieves
 * credential bytes.  A request names a contract, revocable grant, and intent;
 * its mode is recovered from those current records, so a public caller cannot
 * convert a paper authorization into a live order by changing a flag.
 */
export function createPrincipalAlpacaBrokerageSystem({
  authorityCustody,
  transport,
  resolveAuthorityGrant,
  resolveExecutionRecords,
  resolveMandate,
  recordObservation,
  recordExecution,
  recordIntent,
  resolveFleetRecords,
  recordVenueOperation,
  recordCycle,
  trustedPromotionActorKeys = {},
  fetchImpl = fetch,
  clock = () => new Date().toISOString(),
} = {}) {
  if (typeof transport !== "function" || typeof resolveAuthorityGrant !== "function"
    || typeof resolveExecutionRecords !== "function" || typeof recordObservation !== "function"
    || typeof recordExecution !== "function") {
    throw new TypeError("principal-brokerage-system-boundaries-required");
  }

  // The custody service asks for the exact intent only at the moment it is
  // about to perform an order operation.  These records were freshly resolved
  // by the reconciled executor under all three references; they are removed
  // when that execution finishes and are never an ambient trading permission.
  const activeExecutions = new Map();
  const activeAuthorization = (mode) => async (intentReference) => {
    const records = activeExecutions.get(intentReference);
    if (!records || modeFor(records) !== mode || records.intent?.id !== intentReference) {
      throw new TypeError(`current-${mode}-intent-authorization-required`);
    }
    return records;
  };

  const custody = createBrokerageAuthorityCustody({
    authorityCustody,
    transport,
    resolveAuthorityGrant,
    resolvePaperOperationAuthorization: activeAuthorization("paper"),
    resolveLiveOperationAuthorization: activeAuthorization("live"),
    fetchImpl,
    clock,
  });
  const adapters = new Map();
  const adapterFor = (mode) => {
    let adapter = adapters.get(mode);
    if (!adapter) {
      const product = PRODUCTS[mode];
      adapter = createAlpacaAdapter({ product: product.product, baseUrl: product.baseUrl, authorityClient: custody, recordReceipt: recordVenueOperation });
      adapters.set(mode, adapter);
    }
    return adapter;
  };

  const resolveFor = (mode) => async (references) => {
    const exact = Object.freeze({
      contractReference: reference(references?.contractReference, "contract-reference"),
      authorityGrantReference: reference(references?.authorityGrantReference, "authority-grant-reference"),
      intentReference: reference(references?.intentReference, "intent-reference"),
    });
    const records = await resolveExecutionRecords(exact);
    if (records?.contract?.id !== exact.contractReference || records?.authorityGrant?.id !== exact.authorityGrantReference
      || records?.intent?.id !== exact.intentReference || modeFor(records) !== mode) {
      throw new TypeError(`current-${mode}-execution-records-required`);
    }
    activeExecutions.set(exact.intentReference, records);
    return records;
  };

  const paperExecutor = createPaperExecutionAndReconciliationProvider({
    resolvePaperExecutionRecords: resolveFor("paper"),
    adapter: adapterFor("paper"),
    trustedPromotionActorKeys,
    clock,
  });
  const liveExecutor = createLiveExecutionAndReconciliationProvider({
    resolveLiveExecutionRecords: resolveFor("live"),
    adapter: adapterFor("live"),
    clock,
  });

  const execute = async ({ contractReference, authorityGrantReference, intentReference } = {}) => {
    const references = Object.freeze({
      contractReference: reference(contractReference, "contract-reference"),
      authorityGrantReference: reference(authorityGrantReference, "authority-grant-reference"),
      intentReference: reference(intentReference, "intent-reference"),
    });
    // Select the executor only after a current, exact set of records is read.
    // The provider resolves the same records immediately before venue effects.
    const initial = await resolveExecutionRecords(references);
    const mode = modeFor(initial);
    try {
      const outcome = await (mode === "paper" ? paperExecutor : liveExecutor)(references);
      const executionRecord = await recordExecution({
        type: "principal-alpaca-execution-reconciled",
        contract: references.contractReference,
        authorityGrant: references.authorityGrantReference,
        intent: references.intentReference,
        mode,
        outcome,
        recordedAt: clock(),
      });
      return Object.freeze({ ...outcome, executionRecord: requireRecordReceipt(executionRecord, "principal-alpaca-execution") });
    } finally {
      activeExecutions.delete(references.intentReference);
    }
  };

  const observe = createAlpacaPrincipalAccountReadService({
    resolveAuthorityGrant,
    authorityCustody: custody,
    recordObservation,
    clock,
  });

  const executeMarketDecision = typeof resolveFleetRecords === 'function' && typeof recordIntent === 'function'
    ? async (references) => {
      const { contract, authorityGrant, decision, evidencePackets } = await resolveFleetRecords(references);
      if (modeFor({contract,authorityGrant}) !== 'live' || contract.id !== references.contractReference
        || authorityGrant.id !== references.authorityGrantReference || decision.id !== references.marketDecisionReference) throw new TypeError('current-live-fleet-bindings-required');
      allocationsFor(decision,{venue:'alpaca',principal:contract.principal,instrument:'__validate_only__',side:'long',at:clock()});
      const orders = decision.orders.filter(order => order.venue === 'alpaca');
      const executions = [];
      for (const order of orders) {
        const funded = allocationsFor(decision,{venue:'alpaca',principal:contract.principal,instrument:order.instrument,side:'long',at:clock()});
        if (funded.length !== 1 || funded[0].id !== order.id || order.carrier !== 'asset') throw new TypeError('one-funded-asset-order-per-instrument-required');
        const notional = Math.floor(Math.min(order.capitalCents / 100, contract.risk.maximumOrderNotional,
          contract.risk.maximumLossAmount, contract.capital.amount * contract.risk.concentrationLimit) * 100) / 100;
        if (!(notional > 0)) continue;
        const intent = formAggressivePortfolioIntent({contract,evidencePackets,symbol:order.instrument,side:'buy',notional,
          maximumLoss:notional,marketDecision:decision,asOf:clock(),thesis:order.thesis,falsifier:order.falsifier,
          liquidityPremise:'The funded quote defines displayed quantity and the maximum limit price.',
          executionPremise:'Current contract, authority, broker account and resting orders admit this funded fleet leg.',
          scenarios:[{name:'loss-of-entire-funded-position',pnl:-notional},{name:'no-fill',pnl:0}]});
        requireRecordReceipt(await recordIntent({contract,authorityGrant,intent}), 'fleet-intent');
        try {
          const outcome = await execute({contractReference:contract.id,authorityGrantReference:authorityGrant.id,intentReference:intent.id});
          executions.push({orderId:order.id,intentReference:intent.id,outcome});
        } catch (error) {
          executions.push({orderId:order.id,intentReference:intent.id,error:error instanceof Error?error.message:String(error)});
        }
      }
      return Object.freeze({type:'AlpacaFleetDecisionExecution',decision:decision.id,executions,
        disposition:executions.length?'venue-legs-recorded-reconciliation-required':'no-funded-alpaca-leg',portfolioCompletionClaimed:false});
    } : undefined;

  const portfolio = typeof resolveMandate === "function" && typeof recordCycle === "function"
    ? createMandatedPortfolioService({
      resolveMandate,
      readPrincipalAccount: observe,
      executeAuthorizedIntent: async ({ contract, authorityGrant, intent }) => {
        if (typeof recordIntent !== 'function') throw new TypeError('durable-portfolio-intent-recorder-required');
        requireRecordReceipt(await recordIntent({contract,authorityGrant,intent}), 'portfolio-intent');
        return execute({
        contractReference: contract.id,
        authorityGrantReference: authorityGrant.id,
        intentReference: intent.id,
      }); },
      recordCycle,
      clock,
    })
    : null;

  return Object.freeze({
    observe,
    execute,
    executeMarketDecision,
    runMandatedPortfolio: portfolio?.run,
    // Kept narrow for the public application: it can verify the current grant
    // before presenting an action, but cannot retrieve a credential or choose
    // a venue URL.
    preflight: async (references) => {
      const records = await resolveExecutionRecords(references);
      const mode = modeFor(records);
      await (mode === "paper" ? paperExecutor : liveExecutor).preflight(references);
      return Object.freeze({ mode, contract: records.contract.id, authorityGrant: records.authorityGrant.id, intent: records.intent.id });
    },
  });
}
