// The carrier for an adaptive investment operation.  This is intentionally
// neither a signal-to-order script nor an account dashboard: it holds the
// causal link from dated evidence through competing research programs and
// model selection to bounded execution, reconciliation, and measured active
// return.  The broker boundary remains separately owned.
import { createInvestmentResearchCommittee, INVESTMENT_RESEARCH_FRONTIER_ROLES } from "../services/investment-research-work-lot-service/src/committee.mjs";
import { createStrategyProgramSynthesisMarket } from "@red-cup-engineering/strategy-program-synthesis-work-lot-service";
import { assayStrategyProgram } from "@red-cup-engineering/strategy-program-synthesis-work-lot-service/strategy-program-candidate-assay";
import { createGeneratedStrategyFoldReplay } from "../scripts/replay-folds.mjs";
import { createCausalPortfolioLearningCircuit } from "../scripts/circuit.mjs";
import { runMandatedPortfolioCycle } from "./autonomous-portfolio.mjs";
import { allocateMandatePortfolio } from "@red-cup-engineering/mandate-portfolio-allocation-service";
import { replayTransactionCosts } from "@red-cup-engineering/transaction-cost-replay-service";
import { selectModelCandidate } from "@red-cup-engineering/model-tournament-service";
import { reconcileAccountEvidence } from "@red-cup-engineering/account-evidence-reconciliation-service";

const finite = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number) || Object.is(number, -0)) throw new TypeError(`${label}-must-be-finite`);
  return number;
};

const nonEmpty = (value, label) => {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label}-required`);
  return value.trim();
};

const receipt = (value, label) => {
  if (!value?.id && !value?.graph && !value?.recordReceipt) throw new TypeError(`${label}-receipt-required`);
  return value;
};

function accountValue(observation) {
  const value = observation?.account?.equity ?? observation?.equity;
  if (value === undefined) throw new TypeError("broker-account-equity-required");
  return finite(value, "broker-account-equity");
}

function accountWeights(observation) {
  const equity = accountValue(observation);
  if (equity <= 0) throw new RangeError("broker-account-equity-must-be-positive");
  if (!Array.isArray(observation?.positions)) throw new TypeError("broker-position-observations-required");
  const weights = Object.create(null);
  for (const position of observation.positions) {
    const symbol = nonEmpty(position?.symbol, "broker-position-symbol").toUpperCase();
    const value = finite(position?.market_value ?? position?.marketValue ?? 0, `broker-position-${symbol}-market-value`);
    weights[symbol] = (weights[symbol] ?? 0) + value / equity;
  }
  return Object.freeze(weights);
}

function agentForecasts(committee, observedAt) {
  if (!Number.isFinite(Date.parse(observedAt))) throw new TypeError("research-observation-time-required");
  return Object.freeze((committee?.seats ?? []).flatMap(({ provider, candidate }) =>
    (candidate?.sections ?? []).map((section) => Object.freeze({
      provider,
      symbol: section.symbol,
      // Research candidates carry their supplied evidence references, not an
      // invented observation timestamp.  Bind them to this cycle's dated
      // context instead of letting an absent timestamp silently disable them.
      observedAt,
      horizonDays: section.horizonDays,
      expectedExcessReturn: finite(section.expectedExcessReturn, "research-expected-excess-return"),
      confidence: finite(section.confidence, "research-confidence"),
      falsifiers: Object.freeze([...(candidate.falsifiers ?? [])]),
      evidenceReferences: Object.freeze([...(section.evidenceReferences ?? [])]),
    })),
  ));
}

function causalVariant(result) {
  const selected = result?.tournament?.selectedUsingValidationOnly;
  if (typeof selected !== "string") throw new TypeError("causal-tournament-selection-required");
  if (selected.endsWith("obsmetrologia-technical")) return "obsmetrologiaTechnical";
  if (selected.endsWith("technical-analysis")) return "technical";
  if (selected.endsWith("return-risk-baseline")) return "baseline";
  throw new TypeError("unknown-causal-tournament-selection");
}

function modelMetrics(metrics, label) {
  if (!metrics || typeof metrics !== "object") throw new TypeError(`${label}-metrics-required`);
  return Object.freeze({
    informationRatio: finite(metrics.informationRatio, `${label}-information-ratio`),
    maximumDrawdown: finite(metrics.maximumDrawdown, `${label}-maximum-drawdown`),
  });
}

function selectPortfolioCandidate({ causalResult, programReplays, mandate, policy }) {
  const variant = causalVariant(causalResult);
  const cashWeights = Object.freeze(Object.fromEntries(Object.keys(causalResult.currentDecision.targetWeights).map((symbol) => [symbol, 0])));
  const candidates = [{
    id: "urn:investment-system:cash-preservation-baseline",
    authorActor: "urn:ame:cash-preservation-baseline",
    validation: Object.freeze({ informationRatio: 0, maximumDrawdown: 0 }),
    holdout: Object.freeze({ informationRatio: 0, maximumDrawdown: 0 }),
    currentDecision: Object.freeze({
      type: "CurrentUnresolvedPortfolioDecision",
      version: 1,
      targetWeights: cashWeights,
      cashWeight: 1,
      outcomeResolved: false,
      effect: "cash-preservation-baseline",
    }),
    provenance: Object.freeze({ kind: "cash-preservation-baseline" }),
  }, {
    id: `urn:investment-system:causal:${variant}`,
    authorActor: "urn:ame:causal-portfolio-learning-circuit",
    validation: modelMetrics(causalResult.evaluations[variant].validation, "causal-validation"),
    holdout: modelMetrics(causalResult.evaluations[variant].holdout, "causal-holdout"),
    currentDecision: causalResult.currentDecision,
    provenance: Object.freeze({ kind: "causal-model-tournament", variant }),
  }];
  for (const replay of programReplays) {
    candidates.push({
      id: replay.id,
      authorActor: replay.provider,
      validation: modelMetrics(replay.result.validation.metrics, `program-${replay.id}-validation`),
      holdout: modelMetrics(replay.result.holdout.metrics, `program-${replay.id}-holdout`),
      currentDecision: replay.result.currentDecision,
      provenance: Object.freeze({ kind: "synthesized-strategy-program", source: replay.source, assay: replay.assay }),
    });
  }
  const tournament = selectModelCandidate({
    candidates: candidates.map(({ id, authorActor, validation, holdout }) => ({ id, authorActor, validation, holdout })),
    policy: policy ?? {
      metric: "informationRatio",
      direction: "maximize",
      maximumHoldoutDrawdown: finite(mandate.maximumDrawdown ?? 1, "mandate-maximum-drawdown"),
    },
  });
  const selected = candidates.find(({ id }) => id === tournament.selectedUsingValidationOnly);
  if (!selected) throw new TypeError("portfolio-candidate-selection-unresolved");
  return Object.freeze({ tournament, selected: Object.freeze(selected), candidates: Object.freeze(candidates) });
}

/**
 * Calculate the account's observed excess return over a named benchmark.
 * Cash flows are explicitly removed from account P&L; this is a performance
 * observation, not a claim that a strategy has established alpha.
 */
export function measureBenchmarkRelativePerformance({
  periodStartedAt,
  periodEndedAt,
  startingEquity,
  endingEquity,
  benchmarkStartingPrice,
  benchmarkEndingPrice,
  externalCashFlow = 0,
  benchmark = "SPY",
} = {}) {
  if (!Number.isFinite(Date.parse(periodStartedAt)) || !Number.isFinite(Date.parse(periodEndedAt))
    || Date.parse(periodEndedAt) <= Date.parse(periodStartedAt)) throw new TypeError("ordered-performance-period-required");
  const initial = finite(startingEquity, "starting-equity");
  const final = finite(endingEquity, "ending-equity");
  const benchmarkStart = finite(benchmarkStartingPrice, "benchmark-starting-price");
  const benchmarkEnd = finite(benchmarkEndingPrice, "benchmark-ending-price");
  const cashFlow = finite(externalCashFlow, "external-cash-flow");
  if (initial <= 0 || benchmarkStart <= 0 || benchmarkEnd <= 0) throw new RangeError("positive-performance-values-required");
  const accountReturn = (final - cashFlow) / initial - 1;
  const benchmarkReturn = benchmarkEnd / benchmarkStart - 1;
  return Object.freeze({
    type: "BenchmarkRelativePerformance",
    version: 1,
    periodStartedAt,
    periodEndedAt,
    benchmark: nonEmpty(benchmark, "benchmark"),
    startingEquity: initial,
    endingEquity: final,
    externalCashFlow: cashFlow,
    accountReturn,
    benchmarkReturn,
    excessReturn: accountReturn - benchmarkReturn,
    outperformedBenchmark: accountReturn > benchmarkReturn,
    alphaEstablished: false,
    effect: "observed-account-return-relative-to-benchmark",
  });
}

/**
 * Adapt a selected institutional portfolio to the existing principal Alpaca
 * system.  This is the only path in this module that can lead to a venue
 * effect: it recovers the current principal contract and grant, then delegates
 * each resulting order to the established reconciled executor.  A model never
 * receives broker credentials or a venue URL.
 */
export function createPrincipalAlpacaInvestmentExecutionBridge({
  resolveMandate,
  executeAuthorizedIntent,
  recordCycle,
  clock = () => new Date().toISOString(),
} = {}) {
  if (typeof resolveMandate !== "function" || typeof executeAuthorizedIntent !== "function" || typeof recordCycle !== "function") {
    throw new TypeError("principal-investment-execution-boundaries-required");
  }
  return Object.freeze({
    async authorize({ decision, mandate, beforeAccount, selection }) {
      if (!decision?.targetWeights || selection?.tournament?.selectionPolicySatisfied !== true) {
        return Object.freeze({ authorized: false, reason: "selected-strategy-does-not-satisfy-holdout-risk-policy" });
      }
      const current = await resolveMandate();
      const contract = current?.contract;
      const authorityGrant = current?.authorityGrant;
      if (contract?.type !== "PrincipalBrokerageServiceContract" || authorityGrant?.type !== "RevocableBrokerageAuthorityGrant"
        || authorityGrant.revoked !== false || !current?.evidencePacket || !beforeAccount) {
        return Object.freeze({ authorized: false, reason: "current-principal-mandate-or-broker-evidence-unavailable" });
      }
      if (contract.risk?.maximumAggregateNotional === undefined || mandate?.type !== "PortfolioAllocationMandate") {
        return Object.freeze({ authorized: false, reason: "portfolio-or-principal-risk-boundary-incomplete" });
      }
      return Object.freeze({
        authorized: true,
        contract,
        authorityGrant,
        evidencePacket: current.evidencePacket,
        driftTolerance: current.driftTolerance,
        turnoverCapFraction: current.turnoverCapFraction,
        minimumOrderNotional: current.minimumOrderNotional,
        suspended: current.suspended === true,
        authorizedAt: clock(),
      });
    },
    async execute({ authorization, decision, mandate, beforeAccount }) {
      if (authorization?.authorized !== true) throw new TypeError("current-principal-execution-authorization-required");
      const cycle = await runMandatedPortfolioCycle({
        contract: authorization.contract,
        authorityGrant: authorization.authorityGrant,
        observation: beforeAccount,
        targetWeights: decision.targetWeights,
        driftTolerance: authorization.driftTolerance,
        turnoverCapFraction: authorization.turnoverCapFraction,
        minimumOrderNotional: authorization.minimumOrderNotional,
        evidencePacket: authorization.evidencePacket,
        suspended: authorization.suspended,
        clock,
        executeIntent: executeAuthorizedIntent,
      });
      const cycleReceipt = receipt(await recordCycle({
        type: "institutional-investment-decision-executed",
        decision,
        authorization,
        cycle,
        recordedAt: clock(),
      }), "principal-investment-cycle");
      return Object.freeze({ ...cycle, cycleReceipt });
    },
  });
}

function assertMarketSnapshot(value) {
  if (!value || typeof value !== "object" || !value.barsBySymbol || typeof value.barsBySymbol !== "object"
    || !Number.isFinite(Date.parse(value.asOf)) || typeof value.benchmark !== "string") {
    throw new TypeError("point-in-time-market-snapshot-required");
  }
  return value;
}

/**
 * Compose the existing upstream research, model, replay, allocation,
 * brokerage, and books capabilities into one persistent investment system.
 *
 * The system deliberately cannot discover account credentials and cannot
 * submit an order itself.  A principal-owned broker boundary must authorize
 * each winning decision against current account evidence and then perform the
 * venue effect.  That makes this live-capable without giving a model ambient
 * permission to trade.
 */
export function createInstitutionalInvestmentOperatingSystem({
  contractInference,
  researchRoles = INVESTMENT_RESEARCH_FRONTIER_ROLES,
  collectMarketSnapshot,
  readBrokerAccount,
  readPerformanceWindow,
  causalProviders,
  replayProgram,
  buildGeneratedReplayInput,
  authorizeExecution,
  executeTargetPortfolio,
  recordSystemEvent,
  clock = () => new Date().toISOString(),
} = {}) {
  if (typeof contractInference !== "function" || typeof collectMarketSnapshot !== "function"
    || typeof readBrokerAccount !== "function" || typeof readPerformanceWindow !== "function" || typeof replayProgram !== "function"
    || typeof buildGeneratedReplayInput !== "function" || typeof authorizeExecution !== "function"
    || typeof executeTargetPortfolio !== "function" || typeof recordSystemEvent !== "function") {
    throw new TypeError("investment-system-boundaries-required");
  }
  // This is the existing typed, provider-distinct committee, now equipped
  // to examine far more than a price series. It returns research only; the
  // strategy tournament, principal mandate and venue executor still decide.
  const committee = createInvestmentResearchCommittee({ contractInference, roles: researchRoles });
  const synthesize = createStrategyProgramSynthesisMarket({ contractInference });
  const causal = createCausalPortfolioLearningCircuit({ recordResult: recordSystemEvent, providers: causalProviders });
  const replayGeneratedStrategy = createGeneratedStrategyFoldReplay({
    replayProgram,
    allocateMandatePortfolio,
    replayTransactionCosts,
  });

  async function record(type, value, recordedAt = clock()) {
    return receipt(await recordSystemEvent({ type, value, recordedAt }), "investment-system-event");
  }

  return Object.freeze({
    async run({
      researchRequest,
      synthesisRequest,
      mandate,
      modelSelectionPolicy,
      execution = { enabled: false },
    } = {}) {
      if (!mandate || mandate.type !== "PortfolioAllocationMandate") throw new TypeError("portfolio-allocation-mandate-required");
      if (!researchRequest || !synthesisRequest) throw new TypeError("research-and-synthesis-requests-required");
      const [market, beforeAccount] = await Promise.all([
        collectMarketSnapshot({ asOf: clock(), benchmark: researchRequest.benchmark ?? "SPY" }),
        readBrokerAccount({ observedAt: clock() }),
      ]);
      assertMarketSnapshot(market);
      const performanceWindow = await readPerformanceWindow({ benchmark: market.benchmark, asOf: market.asOf });
      const performance = measureBenchmarkRelativePerformance({ ...performanceWindow, benchmark: market.benchmark });
      const currentWeights = accountWeights(beforeAccount);
      const research = await committee(researchRequest);
      const researchForecasts = agentForecasts(research, market.asOf);
      const causalResult = await causal({
        barsBySymbol: market.barsBySymbol,
        benchmark: market.benchmark,
        asOf: market.asOf,
        agentForecasts: researchForecasts,
        currentWeights,
        mandate,
      });
      const population = await synthesize(synthesisRequest);
      const replayInput = await buildGeneratedReplayInput({ market, mandate, currentWeights, research, causalResult });
      const programReplays = [];
      const programResidues = [];
      for (const member of population.candidates) {
        const source = member.candidate?.strategySource;
        const assay = assayStrategyProgram({ source, authorActor: member.provider });
        if (assay.admitted !== true) {
          programResidues.push(Object.freeze({ provider: member.provider, candidate: member.index, disposition: "static-assay-refused", assay }));
          continue;
        }
        try {
          const result = await replayGeneratedStrategy({ ...replayInput, source, staticAssay: assay });
          programReplays.push(Object.freeze({
            id: `urn:investment-system:generated:${member.index}:${member.provider}`,
            provider: member.provider,
            source,
            assay,
            result,
          }));
        } catch (error) {
          programResidues.push(Object.freeze({
            provider: member.provider,
            candidate: member.index,
            disposition: "deterministic-replay-refused",
            reason: error instanceof Error ? error.message : String(error),
          }));
        }
      }
      const selection = selectPortfolioCandidate({ causalResult, programReplays, mandate, policy: modelSelectionPolicy });
      const decision = Object.freeze({
        type: "InstitutionalPortfolioDecision",
        version: 1,
        decidedAt: market.asOf,
        marketSnapshot: market.id ?? null,
        benchmark: market.benchmark,
        candidate: selection.selected.id,
        targetWeights: selection.selected.currentDecision.targetWeights,
        cashWeight: selection.selected.currentDecision.cashWeight,
        validation: selection.selected.validation,
        holdout: selection.selected.holdout,
        provenance: selection.selected.provenance,
        outcomeResolved: false,
        liveVenueEffect: false,
      });
      const decisionReceipt = await record("institutional-portfolio-decision", {
        market: market.id ?? null,
        research,
        population,
        causalResult,
        programReplays,
        programResidues,
        selection,
        decision,
      }, market.asOf);

      let authorization = null;
      let executionOutcome = null;
      let afterAccount = null;
      let reconciliation = null;
      if (execution?.enabled === true) {
        authorization = await authorizeExecution({
          decision,
          decisionReceipt,
          mandate,
          beforeAccount,
          research,
          selection,
        });
        if (authorization?.authorized !== true) throw new TypeError("principal-execution-authorization-refused");
        executionOutcome = await executeTargetPortfolio({
          authorization,
          decision,
          mandate,
          beforeAccount,
        });
        afterAccount = await readBrokerAccount({ observedAt: clock() });
        if (executionOutcome?.expectedAccountSnapshot && afterAccount?.normalizedSnapshot) {
          reconciliation = reconcileAccountEvidence({
            expected: executionOutcome.expectedAccountSnapshot,
            observed: afterAccount.normalizedSnapshot,
          });
        }
      }
      const result = Object.freeze({
        type: "InstitutionalInvestmentSystemCycle",
        version: 1,
        asOf: market.asOf,
        decision,
        decisionReceipt,
        research,
        strategyPopulation: population,
        programResidues: Object.freeze(programResidues),
        tournament: selection.tournament,
        authorization,
        executionOutcome,
        beforeAccount,
        afterAccount,
        reconciliation,
        performance,
        liveVenueEffect: executionOutcome?.liveVenueEffect === true,
        effect: execution?.enabled === true ? "authorized-broker-portfolio-cycle" : "research-and-portfolio-decision-recorded",
      });
      const resultReceipt = await record("institutional-investment-system-cycle", result, clock());
      return Object.freeze({ ...result, resultReceipt });
    },
  });
}
