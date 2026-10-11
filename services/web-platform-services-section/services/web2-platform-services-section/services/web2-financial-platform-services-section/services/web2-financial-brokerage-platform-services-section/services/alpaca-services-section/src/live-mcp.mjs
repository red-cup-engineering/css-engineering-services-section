/** Live MCP is a projection of the custody-bound brokerage system. */
const references = {
  type: 'object',
  required: ['contractReference', 'authorityGrantReference', 'intentReference'],
  properties: Object.fromEntries(['contractReference', 'authorityGrantReference', 'intentReference'].map(key => [key, { type: 'string', minLength: 1, maxLength: 512 }])),
  additionalProperties: false,
};
const decisionReferences = { ...references, required: ['contractReference', 'authorityGrantReference', 'marketDecisionReference', 'evidencePacketReference'], properties: Object.fromEntries(['contractReference', 'authorityGrantReference', 'marketDecisionReference', 'evidencePacketReference'].map(key => [key, { type: 'string', minLength: 1, maxLength: 512 }])) };
const observationReferences = { ...references, required: ['authorityGrantReference'], properties: {authorityGrantReference: {type:'string',minLength:1,maxLength:512}} };
export const alpacaLiveTools = Object.freeze([
  { name: 'alpaca_live_observe', description: 'Read and persist the account and positions under its current live read authority. No credentials or order effect.', inputSchema: observationReferences },
  { name: 'alpaca_live_execute_market_decision', description: 'Persist and execute the funded Alpaca legs of a current joint fleet decision through current live authority; record individual outcomes without claiming portfolio completion.', inputSchema: decisionReferences },
  { name: 'alpaca_live_execution_readiness', description: 'Check the exact current live contract, revocable authority and funded intent. Returns no credentials.', inputSchema: references },
  { name: 'alpaca_live_execute_intent', description: 'Execute and reconcile an admitted live fleet intent. The upstream executor derives the deterministic order ID, checks current capital and records broker outcomes.', inputSchema: references },
]);

export function createAlpacaLiveMcp({ brokerage }) {
  if (!brokerage || typeof brokerage.preflight !== 'function' || typeof brokerage.execute !== 'function') {
    throw new TypeError('custody-bound-principal-brokerage-system-required');
  }
  return async function handle(message) {
    const id = message?.id ?? null;
    const result = value => ({ jsonrpc: '2.0', id, result: value });
    const error = (code, reason) => ({ jsonrpc: '2.0', id, error: { code, message: reason } });
    if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') return error(-32600, 'invalid request');
    if (message.id === undefined) return undefined;
    if (message.method === 'initialize') return result({ protocolVersion: message.params?.protocolVersion ?? '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: '561-alpaca-live', version: '0.2.0' } });
    if (message.method === 'ping') return result({});
    if (message.method === 'tools/list') return result({ tools: alpacaLiveTools });
    if (message.method !== 'tools/call') return error(-32601, 'method not found');
    const name = message.params?.name;
    if (!alpacaLiveTools.some(tool => tool.name === name)) return error(-32602, 'unknown live tool');
    try {
      const input = message.params?.arguments;
      const schema = name === 'alpaca_live_observe' ? observationReferences : name === 'alpaca_live_execute_market_decision' ? decisionReferences : references;
      if (!input || typeof input !== 'object' || Array.isArray(input)
        || Object.keys(input).some(key => !schema.required.includes(key))
        || schema.required.some(key => typeof input[key] !== 'string' || !input[key].trim() || input[key].length > 512)) throw new TypeError('exact-execution-references-required');
      if (name === 'alpaca_live_observe') {
        if (typeof brokerage.observe?.preflight !== 'function') throw new TypeError('live-account-observer-unavailable');
        const admitted = await brokerage.observe.preflight(input);
        if (admitted.grant.venue !== 'alpaca-trading-live') throw new TypeError('live-read-authority-required');
        const value = await brokerage.observe(input);
        return result({content:[{type:'text',text:JSON.stringify(value)}],structuredContent:value});
      }
      if (name === 'alpaca_live_execute_market_decision') {
        if (typeof brokerage.executeMarketDecision !== 'function') throw new TypeError('fleet-decision-executor-unavailable');
        const value = await brokerage.executeMarketDecision(input);
        return result({ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value });
      }
      const admitted = await brokerage.preflight(input);
      if (admitted.mode !== 'live') throw new TypeError('live-authority-required');
      const value = name === 'alpaca_live_execute_intent' ? await brokerage.execute(input) : admitted;
      return result({ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value });
    } catch (failure) {
      return result({ isError: true, content: [{ type: 'text', text: failure instanceof Error ? failure.message : String(failure) }] });
    }
  };
}
