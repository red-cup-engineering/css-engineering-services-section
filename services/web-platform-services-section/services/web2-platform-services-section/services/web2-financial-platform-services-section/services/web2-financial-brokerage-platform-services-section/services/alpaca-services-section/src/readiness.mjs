const present = (value) => typeof value === "string" && value.trim() !== "";

export function assessBrokerageMarketReadiness(env = process.env, { alpacaRead, paperReadService, authoritativeObservationResolver, independentBooks, strategyActors, computeLedger, contextAssay, replayAssay, obsmetrologiaProofBuild, obsmetrologiaPromotionProvider, paperExecutionProvider, unionSettlementProvider, consumeUnionGrant } = {}) {
  const checks = Object.freeze({
    providerPayoutIdentity: present(env.X402_PAY_TO),
    facilitatorCredentialId: present(env.CDP_API_KEY_ID),
    facilitatorCredentialSecret: present(env.CDP_API_KEY_SECRET),
    appendOnlyWitnessAgent: present(env.WITNESS_JOURNAL_RDF_AGENT),
    appendOnlyWitnessRoot: present(env.BROKERAGE_X402_DATA_ROOT),
    settlementWitnessAccount: present(env.BROKERAGE_X402_ACCOUNT),
    independentBooksRoot: present(env.BROKERAGE_BOOKS_DATA_ROOT),
    independentBooksAccount: present(env.BROKERAGE_BOOKS_ACCOUNT),
    virtualsApiCredential: present(env.VIRTUALS_LITE_API_KEY),
    virtualsOperatorName: present(env.BROKERAGE_VIRTUALS_OPERATOR_NAME),
    virtualsOperatorWallet: /^0x[0-9a-fA-F]{40}$/u.test(env.BROKERAGE_VIRTUALS_OPERATOR_WALLET ?? ""),
    virtualsStateRoot: present(env.BROKERAGE_VIRTUALS_STATE_ROOT),
    unionActivityPubOrigin: present(env.BROKERAGE_UNION_ACTIVITYPUB_ORIGIN),
    unionActivityPubIdentifier: present(env.BROKERAGE_UNION_ACTIVITYPUB_IDENTIFIER),
    unionActivityPubName: present(env.BROKERAGE_UNION_ACTIVITYPUB_NAME),
    unionAgentCard: present(env.BROKERAGE_UNION_A2A_AGENT_CARD),
    unionKeysPath: present(env.BROKERAGE_UNION_ACTIVITYPUB_KEYS_PATH),
    unionProtocolStatePath: present(env.BROKERAGE_UNION_ACTIVITYPUB_STATE_PATH),
    unionBearerTokenFile: present(env.BROKERAGE_UNION_ACTIVITYPUB_BEARER_TOKEN_FILE),
    unionMarketStateRoot: present(env.BROKERAGE_UNION_MARKET_STATE_ROOT),
    unionOffersValidUntil: present(env.BROKERAGE_UNION_OFFERS_VALID_UNTIL),
    unionSettlementProvider: typeof unionSettlementProvider === "function" || typeof consumeUnionGrant === "function",
    publicResearchProducts: true,
    paperCredentialNamesPresent: present(env.ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY) && present(env.ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET),
    paperReadProvider: typeof paperReadService?.observeEstherPaperAccount === "function" || typeof alpacaRead === "function",
    authoritativeObservationResolver: typeof authoritativeObservationResolver === "function",
    independentBooks: independentBooks === true || (present(env.BROKERAGE_BOOKS_DATA_ROOT) && present(env.BROKERAGE_BOOKS_ACCOUNT)),
    strategyActors: strategyActors === true,
    computeLedger: computeLedger === true,
    contextAssay: contextAssay === true,
    replayAssay: replayAssay === true,
    obsmetrologiaProofBuild: obsmetrologiaProofBuild === true,
    obsmetrologiaPromotionProvider: typeof obsmetrologiaPromotionProvider === "function",
    paperExecutionProvider: typeof paperExecutionProvider === "function",
    principalAlpacaReadProvider: typeof paperReadService?.observeEstherPaperAccount === "function" || typeof alpacaRead === "function",
  });
  const publicMarketReady = checks.providerPayoutIdentity && checks.facilitatorCredentialId && checks.facilitatorCredentialSecret
    && checks.appendOnlyWitnessAgent && checks.appendOnlyWitnessRoot && checks.settlementWitnessAccount
    && checks.independentBooksRoot && checks.independentBooksAccount && checks.publicResearchProducts;
  const virtualsMarketReady = checks.virtualsApiCredential && checks.virtualsOperatorName && checks.virtualsOperatorWallet && checks.virtualsStateRoot
    && checks.appendOnlyWitnessAgent && checks.independentBooksRoot && checks.independentBooksAccount && checks.publicResearchProducts;
  const unionMarketReady = checks.unionActivityPubOrigin && checks.unionActivityPubIdentifier && checks.unionActivityPubName && checks.unionAgentCard
    && checks.unionKeysPath && checks.unionProtocolStatePath && checks.unionBearerTokenFile && checks.unionMarketStateRoot && checks.unionOffersValidUntil
    && checks.unionSettlementProvider && checks.appendOnlyWitnessAgent && checks.independentBooksRoot && checks.independentBooksAccount && checks.publicResearchProducts;
  const paperReadReady = checks.paperCredentialNamesPresent && checks.paperReadProvider && checks.authoritativeObservationResolver && checks.independentBooks;
  const paperExecutionReady = paperReadReady && checks.paperExecutionProvider && checks.obsmetrologiaProofBuild && checks.obsmetrologiaPromotionProvider;
  const strategyImprovementReady = checks.strategyActors && checks.computeLedger && checks.contextAssay && checks.replayAssay
    && checks.obsmetrologiaProofBuild && checks.obsmetrologiaPromotionProvider && checks.independentBooks;
  return Object.freeze({
    type: "BrokerageMarketReadinessAssessment", version: 1, publicMarketReady, virtualsMarketReady, unionMarketReady,
    alpacaPrincipalReadReady: paperReadReady, paperReadReady, paperExecutionReady, strategyImprovementReady, liveAccountsAuthorized: false, liveReady: false, checks,
    missing: Object.entries(checks).filter(([, admitted]) => !admitted).map(([name]) => name),
    rule: "code cast is not seating: paper reads require an injected readonly provider, resolver, credentials, and books; execution and strategy improvement require separately injected, assayed authority; live accounts remain unauthorized",
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const assessment = assessBrokerageMarketReadiness();
  console.log(JSON.stringify(assessment, null, 2));
  process.exitCode = assessment.publicMarketReady ? 0 : 1;
}
