# market-bazaar-navigation-modules
## Requirements
- `pure-input-admission`: projectCommerceNavigation consumes only the exact typed JSON input and returns the exact output without input mutation, network, environment or clock reads. Reject malformed schema/configuration, duplicate configured source IDs, duplicate observation source IDs, unknown observation source IDs, invalid explicit-timezone now, unsupported role-kind combinations, duplicate selected pairs, nonempty Market selection and unknown non-null query.source by TypeError. A structurally valid selected sourceId/id pair need not identify a configured source or current item; absent selected identity is comparison data not-found, never an input TypeError. Empty sources are valid. Follow normative deterministic-projection-contract input admission and declaration ordering.
- `pure-coverage`: Produce exactly one coverage entry per configured source in source order, preserving observation evidence and configured URL. Apply deterministic-projection-contract disposition precedence and EXACT public reasons, including withdrawn/unverified/expired consent, absent observation, URL drift, invalid/future/stale clock, unavailable/incomplete/invalid read and malformed digest/payload. Only current observations contribute rows; a refused source never suppresses healthy siblings. Do not reflect arbitrary error text.
- `pure-commerce-mapping`: For Bazaar map ONLY body.offerings for Shop and body.offers with body.settlement for original x402, using exact deterministic-projection-contract field paths, price admission, typed identity and row inclusion. Preserve original public rows and seller/edition/status without invention, coming-soon inspection and unavailable action. Invalid required row identity/container or duplicate IDs refuses the source atomically; absent/malformed fixed quote stays price null. Original action URL admission is independent; unsafe source scheme/credential/private/local target remains inert original evidence and normalized url null. No action URL is fetched.
- `pure-search-selection`: Use original row order, exact source filtering and trimmed case-insensitive substring q across original id/title/description/string keywords through shared TUFTE semantics. Output filtered Bazaar items only; retain all coverage. Resolve selected pairs from all admitted items before query filtering in supplied reference order; missing identity never substitutes a title match. Market items empty, Bazaar venues empty, and Market selection invalid.
- `pure-comparison`: No selection yields null comparison. Selection returns found original items and EXACT deterministic-projection-contract comparison reason precedence. Fixed quotes, exact asset/network/unit and same complete typed declared outcome are all required for priceComparable. Different source row/SKU/operation labels and equal amounts do not infer equivalent outcomes. Preserve both original terms without FX, ranking winner, budget or transaction.
- `pure-market-metrics`: For Market admit only exact index-health/mpp-catalog/bazaar-summary containers and emit exact deterministic-projection-contract metric names, order, value mapping, units, populations, methods, sourceField and venue limitations. Unsupported commercial metrics remain explicit null; sourceDate is original publisher evidence or null. Never sum venue populations or turn reported providers/catalog entries/house surfaces into independently controlled sellers.
- `pure-output-invariants`: Return exact admitted role/origin/revision and ordered global limitations shown in examples. For otherwise admitted input, empty sources yield empty coverage/items/venues; comparison is null ONLY if selected is empty, otherwise Bazaar returns {items:[],priceComparable:false,reason:selected-offer-not-found}. Nonempty Market selection is an input TypeError before projection. All observations/inputs and original rows remain unchanged. Source-listed qualification never claims external consent, sale, useful delivery, revenue or independent seller control.
## Prohibitions
- `pure-no-authority-invention`: Do not change source originals, turn price/display/count metadata into seller consent, independent control, qualified winner, sale/revenue/delivery or a completed transaction; do not include unsafe original action URLs as admitted actions. [claims: original-requirement]
## Laws
- `original-custody` | 561 Group | 32d5a53ef5f45b93feab17866147435fbedea8f3 | https://github.com/561-group/561-group-services-section/blob/32d5a53ef5f45b93feab17866147435fbedea8f3/lib/agency/requirements/market-bazaar-shop-agentic-composable-enterprise.json | Original three-domain production slice | Preserve original identities, source authority, consent, independent commerce and all strategic requirements without fabrication of acceptance
## Standards
- `http-mcp-semantics` | IETF HTTP and original MCP supplier | Source-qualified original supplier contracts | https://github.com/red-cup-engineering/mcp-engineering-services-section/blob/932b63a3e7b1295459986dec3683d604ead003b8/src/http.mjs | Read-only Fetch/HTTP and MCP projection | Reuse original MCP transport and origin/body admission, proper HTTP status/HEAD handling, exact canonical Request forwarding and no inferred payment power
- `retained-original-demand` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | Preserve the unabridged source requests: We want to get [https://market.561.group](https://market.561.group), bazaar.561.group, shop.561.group, each up as their own domain with the right resources at those sites. Subsequent instruction: Fix the unavailable fabrication path and keep going until all three sites are live with the right resources. Don’t stop at recording blockers. The native output serves the domain-launch slice; all strategic Group requirement cells, external independent seller consent, comparative outcomes and payment authority remain unsatisfied unless separately received.
- `retained-source-ownership` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | Generate src/commerce-navigation.mjs in the EXISTING @red-cup-engineering/computer-web-platform owner. This module composes HTTP/TUFTE/MCP; do not alter base computer-web-server, merchant, Shop, AOE or source-provider policy. Add named pure projectCommerceNavigation, ancillary createCommerceNavigator and default generic Worker exports in this same module; do not generate a new package, copied catalog, source-control script or replacement merchant. The default Worker reads only host env.COMMERCE_CONFIGURATION JSON, checks canonical host, and binds fixed deployment-owned sources; the instance owns that variable and its native deployment manifest.
- `retained-supplier-interfaces` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | The exact measured TUFTE dependency and source in Claims/Modules: ./storefront exports admitTufteStorefront(catalog), storefrontCatalogModel(catalog,{path,itemHref,parameters,search}), storefrontDetailModel(catalog,id,{catalogHref}), filterStorefrontItems(catalog,{term,facets}), and STOREFRONT_STYLES. Catalog is {title,description?,items,facets?,navigation?}; each item requires a unique presentation id and title, and may carry summary, keywords, facets, status:{label,note}, facts:[{label,value,detailOnly?}], actions:[{kind:'link',label,href}/{kind:'unavailable',label,reason}], detail safe HTML nodes and metadata. Facets are {key,label}. Human strings go through ./composition htmlElement(name,attributes,children), composeTufteTile(nodes,tile), and ./rendering renderTufteDocument(model,settings). TUFTE handles text escaping, URL admission and shared query filtering. No HTML fragments may contain source-provided raw HTML. The exact measured MCP dependency and source in Claims/Modules ./server exports createMcpServer({name,version,tools,resources?,instructions?}). Tool entries contain name, description, inputSchema, handler(args,context), and read-only annotations. ./http mcpResource({server,path,maxBodyBytes,sessions:false,allowedOrigins}) returns {handler(ctx),...}, and handler({request}) returns a Web Response. It performs actual body streaming/admission, origin checks and protocol negotiation. A tool handler returns native content:[{type:'text',text:JSON.stringify(result)}] and may include the same structuredContent. Do not author another MCP/JSON-RPC dispatcher. Public tools have no verifyToken because all selected tools are strictly read-only; no mutation tool is installed. New registered pure JSON operation projectCommerceNavigation(input) returns the exact JSON shape below. Ancillary module export createCommerceNavigator(configuration,{fetchImpl?,now?}={}) returns an object with fetch(request,env), using the same projector, existing TUFTE/MCP and fixed source readers. The factory is not a function-valued operation result. Test-only host arguments never cross HTTP/MCP arguments. Runtime uses global fetch and Date when host replacements are absent. The engine has no deployment credentials, accounts, signer, ledger, mutable catalog or durable state.
- `retained-data-contracts` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | Configuration: role is bazaar or market; origin is canonical HTTPS without credentials/query/fragment; title is presentation text; revision is source-selected immutable identity; sources is a list of unique descriptors. Descriptor: {id,kind,url,publisher,consent,maxAgeSeconds,maxBytes,timeoutMs,binding?}. kind is shop-catalog, x402-catalog, index-health, mpp-catalog or bazaar-summary. consent is {status,evidence,revision,expiresAt}; status is house-publication, seller-consented, public-market-observation, unverified or revoked. evidence/revision may be null only for unverified/revoked; expiration null means the particular house/public observation authorization has no asserted expiry. A supplied external seller-consented descriptor requires original seller evidence and cannot be fabricated from a reachable feed. Host configuration admission rejects private/local IP literals, credentials, fragments, non-HTTPS, duplicate source IDs, unsupported kinds, invalid expiry and nonpositive/nonfinite bounds. Configuration is never merged with request input. Observation: {sourceId,url,observedAt,sourceDate,digest,status,body,error}. status is ok, unavailable, invalid or incomplete. digest is sha256:<lowercase exact response-byte digest> for complete successful bytes, otherwise null. body is the original parsed public JSON or null. sourceDate is the publisher's actual supplied date or null; fetch time is not relabeled source time. error is a bounded public explanation, never tokens, headers or private body. Future, stale, unknown, incomplete, malformed or source-URL-mismatched observations do not supply current offers. They remain source coverage entries. Pure input: {role,origin,revision,now,query,sources,observations}. query is {q,source,selected}; source is source ID or null; selected is a list of {sourceId,id} references. Default query is empty, no selected references. The host supplies now and observations; the public only controls q, source and selected references. Wrong role/origin/configuration or malformed/duplicate query produces a TypeError before the live adapter fetches. Pure output: {role,origin,revision,coverage,items,comparison,venues,limitations}. coverage retains each configured source's {sourceId,url,status,observedAt,sourceDate,digest,reason}; status is current, stale, unavailable, refused or incomplete. items contains Bazaar results only, venues Market results only; other role's list is empty. comparison is null without selection; otherwise {items,priceComparable,reason}, with original selected items and explicit incompatible/missing-terms reasoning. limitations is an ordered list of plain source-scope statements, including house-only coverage and unreceived independent seller/transaction qualification. Missing requested selected identity is an explicit not-found result from the HTTP/tool layer; never select another offer by title. Bazaar item: {sourceId,id,publisher,seller,title,description,url,protocol,status,edition,price,qualification,original}. id is the original source product ID or original x402 SKU; seller is the exact declared original seller or null. publisher is the admitted source descriptor; this does not fill a missing seller. edition is original book edition digest or x402 compute.configuration.release, otherwise null. price is {amount,asset,network,unit} with exact integer amount string when source supports it, otherwise null. original is the original already-public offering row with no invented fields. qualification is source-listed unless a separate original qualification object is actually supplied and received; it is never verified because a URL responds. Shop row url is canonical source origin + /goods/ + encodeURIComponent(original id), protocol is shop, status preserves live/coming-soon; currency minor units are represented as asset original currency and unit minor-currency-per-edition, network null. x402 row url/method/SKU and current network/asset atomic amount are retained exactly; price unit is atomic-asset-per-original-operation; listed:false is excluded. Unknown price, non-fixed tariff, missing seller, hidden/private source and nonpositive malformed integer amount do not become a guessed fixed price. Every actionable item url must independently admit direct HTTPS, without credentials, fragment, localhost/single-label/local/private/special-use host or private/special-use IP literal. Unsafe original URLs remain unchanged only inside original; normalized item url is null and the UI action is unavailable, never an active href. Do not fetch item action URLs. Source-listed inspection may remain visible without a purchase action. Market venue: {sourceId,publisher,url,observedAt,sourceDate,digest,kind,metrics,limitations}. Metrics are {name,value,unit,population,method,sourceField}; economic metrics unsupported by the source remain null. index-health maps only original total_endpoints, distinct_services, distinct_providers, by_protocol and by_health with publisher-reported scope; MPP counts services.length and the sum of declared endpoints.length in a complete fetched catalog; these are catalog-entry/declared-endpoint counts, not independent actors, signed payments or useful deliveries. Bazaar summary counts actual projected items/source surfaces and says independent seller count unknown. Never sum external venue populations.
- `retained-projection-and-read-law` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | Process configured descriptors in declaration order, one observation per source. Retain failed coverage before processing healthy siblings. Admit successful complete observations only when source identity and freshness agree; reject malformed payload atomically per source. Filter source-listed public rows; preserve original row order. Search is case-insensitive substring over original title/description/id and declared keywords, with exact source filter using shared TUFTE filtering; no model inference or new economic ranking. Detail/selection uses the pair (sourceId,originalId), never title equality. Same edition may be disclosed, but different source row identity and rail remain distinct. Comparison is side-by-side, not an automatic winner: priceComparable requires every selected item have a fixed valid integer quote with the same asset, network, unit, and same declared operation/outcome identity; absent comparability returns false and an explicit reason. If comparable, do not change the original values or add FX; show exact source terms. No default source ownership boost, paid placement, quantity arithmetic, budget debit, endorsement or commercial contract occurs. Every fetch is exactly the configured GET URL with no user credentials, wallet headers or user query appended. Use binding.fetch(new Request(source.url,{method:'GET',redirect:'manual'})) when the descriptor names an existing env service binding; otherwise fetchImpl with redirect:'manual'. Reject any redirect/payment-required/non-success, unsupported MIME, over-budget stream or invalid JSON as a source-local refusal. Streaming byte limit is enforced before JSON parsing. SHA-256 digests use the runtime cryptographic primitive over exact complete bytes. Timeout aborts only that read; no automatic retry of a payment or source request. Configuration fixes finite limits; initial proposed bounds are {{source-read-bound}} bytes/source and {{source-timeout-bound}} milliseconds/source, based on the current complete MPP public-body observation, not capacity reservations. All sources can be fetched concurrently; no output list is considered complete if a source was cut off. No persistent cache is needed initially. In-request observations feed every representation of that request; no list import becomes a second mutable catalog. Optional future cache must be keyed by descriptor/consent revision and expose age; revoked/changed descriptors invalidate cached visibility. Loss of ephemeral observations loses no merchant data or accepted Work. No new R2/KV/DO is required for navigation. Durable source/fabrication/bundle/installation provenance remains with the existing release owner; root obtains fresh storage/capacity admission before materialization.
- `retained-http-and-mcp` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | Bazaar GET/HEAD / renders TUFTE search results and source coverage; /offers uses one source/id pair; /compare uses matched repeated source/id pairs. /discovery.json lists role, canonical origin, revision, source scope and exact free endpoint/tool links; /v1/discovery/search and /v1/discovery/compare return the same pure projection/results. POST /mcp mounts search_offers({q?,source?}), get_offer({source,id}), compare_offers({selected:[{sourceId,id}]}). Unknown fields, incomplete pairs and duplicate singleton parameters refuse HTTP Bad Request; missing selected ID returns HTTP Not Found. Public q is bounded by the exact maxLength in the input schema and selection by its exact maxItems; these are configured technical limits, not claims of optimum workload. GET/HEAD only for data/HTML; other methods HTTP Method Not Allowed, unknown path HTTP Not Found. HEAD uses corresponding headers/status without a body. Source directory can return HTTP OK without live data; data search/readout with all configured sources unavailable returns HTTP Service Unavailable; partial availability returns HTTP OK with explicit coverage. Market handles exactly /, /markets/discovery.json, /markets/observations, /markets/venues and /markets/mcp. Its MCP tools are list_markets({}), read_observations({source?}). All other requests go immediately to env.MERCHANT.fetch(originalRequest) before reading body or parsing the URL beyond exact routing. The original /mcp, /v1/*, /actors/*, /.well-known/*, settlement/recovery headers and raw signed bodies are neither interpreted nor rebuilt. Return the actual binding Response object unchanged. Missing required binding yields HTTP Service Unavailable for the forwarding branch, never a fallback copy. The generic generated default Worker entry reads only env.COMMERCE_CONFIGURATION as host configuration, selects configuration only by canonical request host and calls createCommerceNavigator; unknown host refuses HTTP Misdirected Request before sources. Bazaar has no merchant fallback and never serves original payable routes.
- `retained-receiving` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | Source contract assays: accepted two house catalogs retain all original identity/edition/source status; alternate q/source changes results without altering source order; unverified external consent, revoked consent, stale/future clock, malformed price, URL drift and incomplete body refuse their current records. A same-title and same-edition alternate with incompatible rails stays distinct and noncomparable. Same asset/network/unit without the same declared original outcome also remains noncomparable. Fixtures cannot establish independent seller consent or received sale. Component assays: native TUFTE renders both roles, escapes script-shaped source titles, rejects unsafe action schemes/credential/private/local hosts as active hrefs while retaining inert original evidence, has working URL search/detail/back links and original direct seller actions; MCP initialize/tools/list/tools/call and HTTP produce the same original records; fake source fetch observes only allowlisted configured GETs and no user credential forwarding; all-source/partial outage status is honest. Native test-only fake fetch and clock are host supplied, never request fields. Preservation assays: send signed-like binary/non-UTF8 POST bytes, payment and recovery headers, cookies, query order and canonical market URL to a fake merchant binding; assert same original Request identity at binding, one fetch, and same returned Response identity/headers/body. Test /mcp and original /v1/publications resource dispatch; root route and exact Market discovery do not reach merchant. Bazaar payable paths refuse. Probe live original catalog/Shop goods/unsigned x402 challenge before and after rollout; do not pay. Freeze original merchant deployment identifier and Shop catalog/accepted artifact fingerprints. Independent receiving: use exact built module/source/dependency digests, qualified native proposal, actual test results, esbuild/Worker manifest, service binding, DNS/TLS and installed release evidence. Verify a real human title search/detail/compare and real read-only MCP call, plus both original external Market observations with source times/units and uncertainties. Keep unseen cases with the receiver, including factory/default Worker HTTP/MCP behavior, unsafe item action URLs and same-price different-outcome comparison; five pure-generation examples are not whole-system receiving. A failed or malformed derivation returns its actual phase/refusal to the original Work; it is not repaired by hand or declared complete from a plan.
- `retained-exact-examples` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | The returned limitations are exactly the ordered strings in admitted examples. For otherwise admitted input, empty configured sources produce empty coverage/items/venues and null comparison ONLY when selected is empty; a nonempty Bazaar selection produces an empty-items comparison with priceComparable false and reason selected-offer-not-found, without inventing sources; the runtime still returns unavailable for a dynamic read without any healthy configured source. For a coming-soon Shop row retain the original merchant object from top-level merchant as its declared seller and original source row unchanged; the UI offers inspection only, never purchase. A revoked source preserves source observation timestamps/digest in coverage but status refused and reason consent-revoked, no rows. A source failure preserves fetch observation time, sets digest null and returns original bounded failure reason. Examples use fake host-controlled sources and grants and establish no external consent.
- `retained-meaningful-runtime` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | The default Worker and factory are required delivered source, not stubs or optional TODOs. The pure JSON operation does not return functions. Factory/default live HTTP paths must actually fetch admitted complete source observations, derive the SAME projection, render shared TUFTE, dispatch native MCP and perform exact merchant Request/Response forwarding. Test-only fetch/clock injection is through factory options supplied by the trusted host, never HTTP arguments. Do not stop at schema/model generation or a landing page.
- `retained-no-authority-invention` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | Do not infer independent seller control, listing consent, rights, qualified ranking, order/payment authority, completed delivery, revenue or feature parity from URLs, index telemetry, fixtures, a source projection or native fabrication. [claims: original-requirement]
- `retained-no-merchant-change` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | Do not import/rebundle original merchant src/worker.mjs or change original merchant/Shop source, state, secrets, payee, routes, SKU, signed bodies, payment or recovery headers. Pass the SAME original Request and actual Response for every forwarded Market route without reading or retrying it. [claims: original-requirement]
- `retained-no-shadow-registry` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | Do not persist, retitle, copy into an independently mutable database or merchant catalog, proxy paid endpoints, add a charged discovery layer, sum overlapping venue populations, implement economic qualification or custom MCP/HTML escaping. [claims: original-requirement]
- `retained-no-unbounded-network` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | Do not follow redirects, read unconfigured URLs, forward guest credentials to sources, consume private/local targets, accept request-derived source/consent configuration or install write tools. [claims: original-requirement]
- `deterministic-projection-contract` | Web Engineering design producer and independent source receiver | attempt-002-design-refinement | source-owned:2026-10-20-market-bazaar-design.md#deterministic-projection-vocabulary-and-payload-mappings | Exact pure output semantics and mandatory complete runtime implementation/receiving | ## Deterministic projection vocabulary and payload mappings This refinement answers native attempt-002 OPEN_QUESTION. The original requirements, roles, architecture and complete runtime obligations remain binding. The registered operation is JSON-valued; it cannot return or accept a factory, Request, Response or executable fake. Mandatory full runtime receiving is a separate construction/acceptance effect, not a claim made by the pure clause cases. ### Input admission, disposition and ordering The pure operation never fetches, reads a clock, mutates input, or depends on environment. All input/output schemas are exact additionalProperties:false contracts. Throw TypeError for malformed schema/role/canonical origin/now/configuration; duplicate source IDs, duplicate observation source IDs, unknown observation source IDs, unknown non-null query.source, duplicate selected identity pairs, or descriptor kinds outside the role are malformed input. Bazaar admits shop-catalog/x402-catalog descriptors; Market admits index-health/mpp-catalog/bazaar-summary. Missing configured-source observation is coverage, not a TypeError. Dates now, observedAt and expiresAt must parse finite ISO timestamps with explicit timezone; sourceDate remains the exact nullable publisher string and is never invented. Duplicate source row IDs make that payload invalid. Query q uses trim and case-insensitive substring on original id, title, description and original string keywords; source filter is exact. Query filtering changes only items; coverage and venues remain in configured order. Selected references resolve against ALL admitted Bazaar items before q/source filtering; their supplied order is preserved. Missing selected IDs leave only actually found items in comparison and reason selected-offer-not-found, without substituting any item. HTTP/tool adapters turn that reason into explicit not-found. Market selection must be empty. Empty configured sources remain valid pure input. Coverage has one entry per descriptor in declaration order. Its url is ALWAYS the configured URL, never a drifted observation URL. Copy nullable observedAt/sourceDate/digest from the source observation when present, otherwise null; the only digest override is unavailable/incomplete status, whose digest is null. Do not coerce malformed observation dates into null/current. Each source disposition uses the FIRST applicable rule below; current items/venues exist only for current coverage:  /  Condition, in precedence order  /  coverage.status  /  coverage.reason  /   /  ---  /  ---  /  ---  /   /  consent.status revoked  /  refused  /  consent-revoked  /   /  consent.status unverified  /  refused  /  consent-unverified  /   /  consent expiresAt is not null and is at or before now  /  refused  /  consent-expired  /   /  Bazaar descriptor with public-market-observation consent  /  refused  /  consent-not-commerce  /   /  no observation for configured source  /  unavailable  /  observation-missing  /   /  observation.url differs byte-for-byte from configured url  /  refused  /  observation-url-mismatch  /   /  observedAt missing or not a finite explicit-timezone ISO timestamp  /  refused  /  observation-time-invalid  /   /  observedAt later than now  /  refused  /  observation-from-future  /   /  now minus observedAt exceeds maxAgeSeconds (equality is current)  /  stale  /  observation-stale  /   /  observation.status unavailable  /  unavailable  /  recognized error from the fixed reader vocabulary below, else source-unavailable  /   /  observation.status incomplete  /  incomplete  /  source-byte-limit if error matches it, else source-incomplete  /   /  observation.status invalid  /  refused  /  recognized invalid reader error below, else source-payload-invalid  /   /  ok observation digest not lowercase sha256 colon plus exactly sixty-four hex digits  /  refused  /  observation-digest-invalid  /   /  ok payload fails its kind contract below  /  refused  /  source-payload-invalid  /   /  otherwise  /  current  /  null  /  The fixed unavailable reader reasons are source-timeout, source-network-error, source-binding-unavailable, source-redirect, source-payment-required, source-http-error and source-unavailable. Fixed invalid reader reasons are source-content-type, source-json-invalid and source-payload-invalid. No arbitrary source error/body/header text is reflected as reason. Reader precedence after obtaining response: redirect; payment-required; other non-success; JSON MIME admission (application/json or application/*+json, optional parameters); streaming byte bound; JSON parse; kind contract. A deadline abort produces source-timeout/unavailable, byte overflow source-byte-limit/incomplete. Runtime observedAt is completion/failure time; sourceDate is null unless the original payload explicitly provides sourceDate as a string. A successful sourceDate remains publisher evidence even when it is not a parseable timestamp; it cannot override observedAt freshness. ### Exact original commerce containers and fields Shop body is an object with offerings array, optional merchant object/string/null. Rows whose status is not live or coming-soon are excluded before further row validation; hidden/private rows never appear as current items. No bare-array/items/offers fallback. Each offering is an object with nonempty string id/title and string status. description is row.blurb when string, otherwise empty string. seller is body.merchant if object/string, otherwise null. edition is row.book.edition.digest if nonempty string, otherwise null. protocol is shop. price is non-null ONLY when row.priceCents is a positive safe integer number and row.currency is a nonempty string; amount is its exact decimal integer string, asset the original currency, network null, unit minor-currency-per-edition. Otherwise price null, while inspection and original evidence remain. URL is configured source origin plus /goods/ plus encodeURIComponent(row.id), independently action-admitted. Status is the exact row.status; coming-soon remains inspectable and has no purchase action. Preserve row itself verbatim as original; title/id/status malformed or duplicate id refuses the whole source atomically, never a partial successful feed. Do not infer seller control from merchant metadata. Original merchant body is an object with offers array and settlement object; do not treat it as an array or Shop offerings. Each listed offer is an object with nonempty string sku/name, string description when present, and string method/url when present; row.listed === false is excluded BEFORE remaining row validation. Missing listed means included; duplicate included sku or invalid required identity/title refuses the payload. id=row.sku; title=row.name; description=row.description when string else empty; protocol=x402; seller=row.seller only when object/string else null; edition=row.compute.configuration.release when nonempty string else null. status is unavailable if row.compute.configuration.available === false, otherwise live. url is the exact row.url when it passes action admission, else null; never synthesize from route/request/example. Preserve method, operation, gateway, route, request, recovery, price display and the entire row only inside original; do not copy them into guessed new fields. A fixed quote requires row.amountAtomic matching positive canonical unsigned decimal integer text, settlement.scheme === exact, nonempty settlement.asset/network strings, and NO non-null row.tariff or row.pricing. Then amount=row.amountAtomic, asset=body.settlement.asset, network=body.settlement.network, unit=atomic-asset-per-original-operation. Otherwise price=null. Never parse row.price currency display, infer settlement from another row, dereference compute, or invoke the operation. Missing seller does not suppress legitimate source-listed inspection and never invents seller authority. Every unsafe original action URL is inert evidence only: normalized url=null, no active href, no fetch. Observed mapping basis: original https://market.561.group/v1/catalog returned recordType 561-group.x402-market-catalog, market, settlement {protocol,scheme,network,asset}, offers; observed source bytes sha256:ec12b1ab07f63d4a63d3b4efb4126780a4e27e672f62292368d409a62608fa12 retained at data/records/source-observation-records/commerce-navigation-20261020/merchant-catalog.json. This is field/container evidence, not a claim that dynamic offers or source status remain frozen. Shop mapping retains the independently observed original catalog and admitted coming-soon example, not a proposed new Shop endpoint. ### Comparison reason vocabulary Without selected references comparison is null. Otherwise return selected found items in reference order. Apply the following FIRST matching reason; priceComparable is true ONLY for fixed-price-comparable, false otherwise:  /  Condition  /  reason  /   /  ---  /  ---  /   /  any selected pair is missing from admitted all-items  /  selected-offer-not-found  /   /  fewer than two selected references  /  insufficient-selection  /   /  any selected price null  /  fixed-price-unavailable  /   /  asset differs  /  asset-mismatch  /   /  network differs, with null matching only null  /  network-mismatch  /   /  unit differs  /  unit-mismatch  /   /  any declared outcome key absent  /  outcome-identity-unavailable  /   /  declared outcome keys differ  /  outcome-mismatch  /   /  all prior checks pass  /  fixed-price-comparable  /  The declared outcome key is a typed tuple, never a title or SKU: Shop with edition uses [book-edition,edition]; x402 with compute.configuration.release uses [x402-compute-release,compute.package,compute.export,edition,original.method] only when package/export/method are nonempty strings. Otherwise no key. JSON tuple equality is exact and case sensitive. Book edition and compute release tuples are different outcomes even if a digest happens to match: ZIP release, EPUB edition and execution are not interchangeable deliverables. Same x402 SKU, operation label or amount without this declared compute outcome never establishes equality. Two selected sources declaring the same full typed tuple can be price-comparable; preserve both originals, amounts and rails and do not select a winner, convert currencies, debit a budget or invoke commerce. Unsafe/null action URL does not erase source terms; comparison does not certify that an action is available. ### Exact Market metrics Only current admitted Market sources produce venues; venues are in source order with exact coverage timestamps/digest/publisher/URL. Kind payload contracts: index-health is an object whose total_endpoints, distinct_services and distinct_providers, when present, are finite nonnegative safe integers; by_protocol/by_health when present are JSON objects. Missing fields yield null metrics, malformed present fields refuse the whole source. Their objects are retained exactly as publisher-reported breakdowns, never summed. mpp-catalog is an object with services array; every service is an object with endpoints array. bazaar-summary is an object with role=bazaar, items array and coverage array of unique string sourceId/status entries; count all projected items and distinct configured coverage sourceId surfaces, NOT purported independent sellers. Invalid required containers refuse the entire source. A source body may carry extra original fields; no network lookup or undocumented container fallback occurs. Metric arrays use the EXACT rows below in the stated order, followed by the common unknown metrics. sourceField uses JSON Pointer for direct fields, a literal formula for derived counts, and empty string for unreported values. Value is copied exactly for direct fields or null if absent. Numeric counts never measure commerce or independent control.  /  kind  /  name  /  value/path  /  unit  /  population  /  method  /  sourceField  /   /  ---  /  ---  /  ---  /  ---  /  ---  /  ---  /  ---  /   /  index-health  /  total_endpoints  /  body.total_endpoints or null  /  endpoint  /  publisher-index  /  source-reported  /  /total_endpoints  /   /  index-health  /  distinct_services  /  body.distinct_services or null  /  service  /  publisher-index  /  source-reported  /  /distinct_services  /   /  index-health  /  distinct_providers  /  body.distinct_providers or null  /  publisher-defined-provider  /  publisher-index  /  source-reported  /  /distinct_providers  /   /  index-health  /  by_protocol  /  body.by_protocol or null  /  publisher-count-breakdown  /  publisher-index  /  source-reported  /  /by_protocol  /   /  index-health  /  by_health  /  body.by_health or null  /  publisher-count-breakdown  /  publisher-index  /  source-reported  /  /by_health  /   /  mpp-catalog  /  catalog_services  /  body.services.length  /  catalog-entry  /  fetched-mpp-catalog  /  count-complete-array  /  /services.length  /   /  mpp-catalog  /  declared_endpoints  /  sum of service.endpoints.length  /  declared-endpoint  /  fetched-mpp-catalog  /  sum-complete-child-array-lengths  /  /services/*/endpoints.length  /   /  bazaar-summary  /  projected_offers  /  body.items.length  /  source-listed-offer  /  fetched-bazaar-projection  /  count-complete-array  /  /items.length  /   /  bazaar-summary  /  source_surfaces  /  distinct coverage.sourceId count  /  configured-source-surface  /  fetched-bazaar-projection  /  count-distinct-source-identities  /  /coverage/*/sourceId  /   /  bazaar-summary  /  independent_sellers  /  null  /  not-established  /  fetched-bazaar-projection  /  not-established-by-source  /  empty string  /  Common unknown metrics appended in order: signed_payments, revenue, useful_deliveries, each value=null, unit=not-established, population=not-established, method=not-reported, sourceField=empty string. No income/currency/unit estimate is inferred. Venue limitations are EXACT ordered strings. First, by kind: index-health: "Publisher-reported counts may overlap and do not establish independent actors or completed commerce."; mpp-catalog: "Catalog entries and declared endpoints do not establish independent providers or completed commerce."; bazaar-summary: "House source surfaces do not establish independently controlled sellers or completed commerce.". Second for every kind: "Revenue, signed payments and useful deliveries are not reported by this source.". Global limitations remain exactly the admitted ordered example strings. Coverage entries remain visible independently of kind, query and venue admission. ### Assay boundary and executable receiving progression The native derive_jsnode_modules clause-assay case schema is {operation,input,output,throws}; it admits only registered JSON operations. Therefore Requirements/Prohibitions in the revised production order describe observable pure projection behavior only. Every complete original production clause is retained normatively as a source constraint, with carrier punctuation normalization, including original request, exact source ownership, supplier APIs, ancillary factory/default exports, source readers, TUFTE/MCP/HTTP, immutable merchant Request/Response forwarding and complete V-model duties. The source writer consumes these constraints. Full runtime requirements are NOT weakened, optional, or discharged by pure cases. Production source must implement the full module; a pure-only module is refused at receiving. Native generation first derives pure clause cases and source against that complete order, with independent review of source and exact installed suppliers. Root then receives the candidate source and pure results before any immutable candidate artifact publication under a non-latest dist-tag through the existing source owner. Exact numeric artifact identity/integrity is an input to a SEPARATE source-free receiving-driver order owned by Web Engineering; it may import the actual candidate and expose only the test-only JSON operation runCommerceReceivingCase(scenario) inside isolated src/receiving/commerce-navigation-assay.mjs. The driver invokes actual factory/default Worker with trusted-host fake fetch/clock/bindings and returns JSON observations including Request/Response identity booleans. It is never exported by the production package, bundled or deployed. Native driver tests precede driver source; source consumer and independent root receiving execute predeclared positive/alternate/refusal HTTP/MCP/binding cases, retain unseen cases independently, and reject missing runtime behavior. This is not a handwritten test wrapper or fabricated runtime success. Candidate version/registry publication and driver dependency are selected only after exact source receiving, never invented in advance. Mandatory runtime acceptance remains: exact same original Request at merchant binding and same actual Response back; untouched signed binary bodies/headers/query/canonical URL; route exclusion and role-isolated native MCP negotiation/tools; URL action refusals/HTML escaping; fixed GET-only bounded source reads with no credential forwarding or item fetch; default env configuration/host admission; partial/all outage statuses; native TUFTE search/detail/compare; live DNS/TLS/resource identity, original Shop goods/catalog/checkout and original merchant unsigned challenge/recovery. No rollout until runtime receiving passes; no customer completion until all three distinct origins and useful actual resources are independently received. Driver failure returns to design/native derivation, never a production test API or manual patch.
- `portable-worker-closure` | Web Engineering source producer and independent source receiver | portable-fetch-webcrypto | source-owned:2026-10-20-market-bazaar-design.md#portable-worker-closure-and-source-evidence-refinement | Complete production module and candidate dependency capture | ## Portable Worker closure and source evidence refinement The complete generated production module must use portable Fetch, Request, Response, TextEncoder/TextDecoder, URL, AbortController and global crypto.subtle.digest for exact-byte SHA-256, shared by Node 24 and Workers. No node: builtin import, Buffer or Node process/filesystem API is permitted in the production module or its default Worker. This is a required production closure constraint, not a relaxation of the receiving driver's trusted dependency capture. The two selected published suppliers' captured module closures contain no Node builtin imports. Independently inspect the exact candidate closure before publication; refuse a generated builtin import rather than editing it by hand. Shop original catalog was independently fetched with the source's admitted public browser user agent; body.offerings contains the original public rows and body.merchant carries original merchant declaration. Bytes retained at data/records/source-observation-records/commerce-navigation-20261020/shop-catalog.json, sha256:3536e01809a3d2a983dc8883ba1d0af3b27ee722ddf31de38783e91963e5fe3a. This establishes original container/field mappings; observation is not seller consent or a new Shop interface. Shop rows with status other than live or coming-soon are excluded from current items (including hidden/private statuses); no included-row fallback or forced status. X402 non-null row.tariff or row.pricing keeps price null. Only method GET can offer a direct x402 navigation action; other declared methods remain inert terms requiring the original documented client and never cause a paid request. A missing named service binding produces source-binding-unavailable without external fallback.
- `uniform-url-admission` | Web Engineering design producer and independent source receiver | public-https-no-fixture-exception | source-owned:2026-10-20-market-bazaar-design.md#uniform-positive-fixture-and-url-law | Configuration and every active item URL, all roles, all fixtures | The host URL law applies identically to production and fixtures: only HTTPS with no userinfo or fragment, nonempty multi-label DNS hostname, no localhost or localhost suffix, and no special-use suffix .local, .internal, .home, .lan, .onion, .test, .invalid, .example or .arpa. Normalize hostname case and ignore a trailing DNS root dot for admission. Reject IP literals that are private, loopback, link-local, unspecified, multicast, documentation, benchmarking, carrier-grade NAT or otherwise non-global; IPv4-mapped IPv6 is tested as its underlying IPv4. Single-label and .example special-use targets are never active links. Configuration source URLs must pass the same law before any read; unsafe item URLs become null/inert instead of invalidating safe original evidence. Positive admitted fixtures use the actual public-form .561.group/index origins, but fixture source bodies, consent and hashes are synthetic and the pure operation performs no network. Native runtime cases supply host-only fake fetch/bindings; using a real public-form hostname never authorizes a live paid call. The explicit unsafe-action fixture uses a safe configured source and preserves the .example URL only inside original with normalized url null.
- `default-worker-single-configuration` | Web Engineering design producer and independent source receiver | attempt-003-envelope-refinement | source-owned:2026-10-20-market-bazaar-design.md#exact-default-worker-configuration-envelope | Complete default Worker host admission, all routes and original binding identity | The default export is a standard Worker object with async fetch(request,env,ctx?) and ignores ctx. env.COMMERCE_CONFIGURATION MUST be a JSON STRING encoding exactly ONE factory configuration object with required keys {role,origin,title,revision,sources} and OPTIONAL navigation:[{href,label}], with the already-declared descriptor schema; keys beyond those required keys and optional navigation, null/scalars/arrays and host-keyed maps are invalid. This is the exact existing Causeway Wrangler variable shape, not a new envelope. Never accept configuration from query, headers, body, ctx, another env variable, global process state or a request-selected host map. Parse and admit this one object before dispatch, sources or forwarding. Missing/non-string/empty/unparseable/non-object/schema-invalid host configuration returns a fresh bounded HTTP 503 JSON response {"error":"configuration-unavailable"}, Content-Type application/json, with no source reads, merchant forwarding or exposed exception/configuration bytes. An invalid configuration supplied directly to createCommerceNavigator still throws TypeError; only the default Worker's host-configuration admission maps that failure to this response. After valid configuration admission, compare new URL(request.url).origin to the admitted configuration.origin (canonical HTTPS origin, no path/query/fragment; optional root slash is not a separate host). Mismatch returns HTTP 421 before any source read or forwarding. For a matching origin call the factory's fetch with the SAME original Request and env; do not rebuild or clone the request. Resolve service bindings only from their configured or role-declared env names, including required Market MERCHANT. Ignore unrelated env entries. Do not spread env into configuration or invent another wrapper. Return the exact factory Response object, and on a forwarded Market branch the exact MERCHANT Response; never wrap a successfully returned Response in the configuration-error handler. All original route, signed-body/header and Request/Response identity assays remain mandatory. No array/map selection, per-request configuration mutation or fallback copy exists.
- `exact-tufte-supplier-boundary` | Original published supplier and Web Engineering source receiver | attempt-004-complete-supplier-refinement | source-owned:2026-10-20-market-bazaar-design.md | Actual published TUFTE and admitted rendering fixture; mandatory generated complete runtime | ## Complete measured TUFTE supplier boundary This refinement answers native attempt-004 using the ACTUAL installed published @red-cup-engineering/web-page-tiling-engine 0.14.2, not the later source checkout. Source hashes: composition c831499eb4cf9113b8f483ccae0b851b38058976fedfc3984ba586dad4e23152; storefront ec4a7b6d199cf3fd81d3afde52971c7676a4e1ecbb6aaf7dcb5920e67ebd32e9; rendering d9ca01fdcd98d4bce2f29a80038b085f73dcc253ad8ae4e10eb28520bb237cc2; browser normalization 82d09b0140f3331ea2ce7f997fe63fca6bf368d400ce0a6e7663132e9a22eddf. Read original native storefront.test.mjs, shared-components.test.mjs and render-tufte-document.test.mjs at the source owner for positive/refusal conventions; those checkout tests are not asserted to have run against this published edition. The observed examples below were executed directly through the exact installed published exports. /composition htmlElement(name,attributes={},children=[]) returns a frozen safe node {kind:element,name,attributes,children}; bare string children become {kind:text,value:string}; null/undefined/false children are skipped. Child input is an ARRAY, never an HTML string. Pass source scalars as String(value) bare children; JSON objects as JSON.stringify(value) bare string children, not object nodes. Element/attribute names are author-controlled valid HTML names; URL-bearing attributes still require the independent action law. Attributes are scalar strings/numbers/true; false/null/undefined omit the attribute, true emits a boolean attribute. Never put source text in element/attribute names, event attributes, style/raw HTML, scripts or htmlFragment. htmlText(value) returns {kind:text,value}; renderHtmlNode escapes text/attribute values. htmlFragment is an author trust capability, not a sanitizer, and is NOT used for original source evidence. The ORIGINAL /composition implementation is: export function composeTufteTile(nodes, tile = {}) { return { ...tile, html: nodes.map(renderHtmlNode).join('') }; }. Input nodes is an array of the above safe nodes; tile is a plain object containing author-controlled id/title and optional span/role/lifecycle/confidence/side/eyebrow/live. Return is a PLAIN TILE OBJECT with an html STRING, not a document model, promise or Response. Original invocation composeTufteTile([htmlElement('p',{},['Source <coverage>'])],{id:'source-coverage',title:'Coverage',span:12}) returned exactly {id:'source-coverage',title:'Coverage',span:12,html:'<p>Source &lt;coverage&gt;</p>'}. This is attributed supplier evidence, not target implementation. /storefront admitTufteStorefront(catalog) validates and returns the SAME catalog object. Required catalog keys title:string,items:array; optional description/eyebrow:string, facets:[{key,label,labels?}], navigation:[{href,label,current?}], metadata:plain document metadata, footerHtml:author-trusted rendered string. Each item has unique nonempty string id, title:string; ID must not begin storefront-. Optional summary:string, keywords:string[], facets:{[facetKey]:string[]}, status:{label:string,note?:string}, facts:[{label:string,value:string,detailOnly?:boolean}], actions:[{kind:'link',label,href,download?},{kind:'unavailable',label,reason?}], detail:safe-node-array, metadata:plain metadata. No domain price, seller or consent semantics are decided by this supplier. Link admission in TUFTE alone permits more URL kinds than production policy; apply our stricter action admission BEFORE creating any link item. /storefront storefrontCatalogModel(catalog,{path='/',itemHref,parameters=new URLSearchParams(),search=true}={}) returns a DOCUMENT MODEL {title:catalog.title,subtitle:catalog.description,eyebrow:catalog.eyebrow,metadata:catalog.metadata,navigation:catalog.navigation,footerHtml:catalog.footerHtml,tiles:[...]}. path is an admitted relative path or HTTPS URL, itemHref is a host function receiving the presentation item.id and returning an admitted detail URL; it is not JSON or a callback from public input. The function internally derives query from parameters, filters catalog.items, adds an optional storefront-search form tile, always adds storefront-results {title:item count,span:12,live:polite,content only if empty}, and one already-composed HTML tile per filtered item. Item tiles contain escaped summary/status/facts, detail link when itemHref exists, and domain-supplied link/unavailable actions. Details beyond the short summary are only supplied on detail pages. This model is NOT HTML; pass it to renderTufteDocument. Unknown metadata is not an alternative query mechanism. /storefront storefrontDetailModel(catalog,presentationId,{catalogHref='/'}={}) returns null for missing identity; otherwise DOCUMENT MODEL {title:item.title,eyebrow:catalog.title,navigation:catalog.navigation,metadata:{description:item.summary,...item.metadata},footerHtml:catalog.footerHtml,tiles:[{id:'storefront-navigation',title:'Browse',span:12,links:[{href:catalogHref,label:'All '+catalog.title}]},detailItemTile]}. Detail item tile span is 12, contains full summary/facts/detail safe nodes, and original supplied actions. Null maps to HTTP404, never an invented item. The native supplier detail back link is sufficient; no custom HTML dispatcher is needed. /rendering renderTufteDocument(model={},settings={}) is SYNCHRONOUS and returns a complete HTML STRING beginning <!doctype html>, not a Response, render receipt, fragment, promise or {html} envelope. Selected model is a plain object {title:string,subtitle?:string,eyebrow?:string,revision:string,metadata?:{title?,description?,language?,canonical?,robots?,siteName?},navigation?:[{href,label,current?}],tiles:[tile,...]}. Its common safe tile body keys are content:string (escaped), html:string (trusted pre-rendered nodes ONLY), form:native form model, links:[{href,label}], data:JSON (escaped), and optional title/id/span/role. Data and content can be used for source facts; raw source HTML never becomes tile.html. Model revision must be set explicitly to configuration.revision, since the supplier otherwise defaults to unversioned. No model workspace, component, mastheadHtml/footerHtml, metadata structuredData, remote scripts or custom fragment is needed for this capability. SELECTED settings are exactly {styles:STOREFRONT_STYLES,language:'en'}. STOREFRONT_STYLES is a CSS STRING exported by /storefront; renderTufteDocument adds its built-in base CSS and appends this string into its generated style element. It is not a tile, URL, stylesheet filename or class name. settings.styles must never contain source text. Other optional renderer capabilities exist (theme,documentTitle,nonce,source,actionEndpoint,headHtml,clientScript,stylesheets,scripts,importMap,bootstrapData), but are OMITTED here, not filled with guessed structures. The resulting string is the HTML Response body with content-type text/html; charset=utf-8, using the route's proper status. The default model title and text are escaped by the supplier. No client JS asset is necessary for native GET form/detail/compare navigation. The renderer's tile ID token law is /^[a-z][a-z0-9-]*$/i with NO length bound; invalid IDs normalize to generated fallbacks, potentially breaking identity. Production HTML therefore uses presentation ID 'offer-' followed by lowercase two-digit hexadecimal UTF-8 bytes of JSON.stringify([originalSourceId,originalId]). The tuple serialization plus UTF-8 hex is injective over valid JSON strings, produces a safe token and never starts storefront-. It is ONLY a transient tile identity and lookup key. Do not truncate/hash ambiguously, lowercase original IDs, overwrite JSON items.id or use presentation ID in public source/id queries, action URLs or comparison. Every detail/link query uses original pair values encoded with URLSearchParams, and the model lookup resolves that exact pair to its presentation ID. Duplicate original IDs across different sources stay distinct. Pure original search still uses filterStorefrontItems on an adapter whose id is ORIGINAL id, title ORIGINAL title, summary ORIGINAL description, keywords ORIGINAL string keywords and facets.source contains ORIGINAL sourceId. That native function does not invoke catalog admission or require unique IDs across that array; it simply returns original rows in order using case-insensitive English substring + exact facets. Do not add presentation IDs to searchable words. For rendering, feed the ALREADY FILTERED projector items to storefrontCatalogModel with search:false and EMPTY parameters so it never filters presentation IDs or changes original search semantics. Prepend a native TUFTE form tile for original query inputs, then append coverage/comparison tiles made by composeTufteTile. Market uses ordinary document model/tiles and these same composition/rendering exports; it does not fabricate storefront items or economic offers. The measured native GET form model is {id:'navigation-search',title:'Find an offer',span:12,form:{action:'/',method:'get',fields:[{name:'q',label:'Search',kind:'search',value:currentQ},{name:'source',label:'Source',kind:'select',value:currentSourceOrEmpty,options:[{value:'',label:'All sources'},...configuredSourceOptions]}],submitters:[{label:'Search'}]}}. Source option values are original configured IDs, labels are publisher plus source identity; selected source is exact, not fuzzy. Native form normalizes fields to unique element IDs, preserves field.name including repeated names, escapes values/labels and produces labelled inputs/selects with a native GET submission. It does not fetch, invoke commerce or attach a new client state machine. Bazaar home and offer detail MUST expose an ordinary reachable native GET comparison form at /compare with repeated source/id field pairs, ordered exactly as the accepted route, each select labelled with original source/title/identity. Provide two pair controls with valid distinct current offer defaults when available; detail may preselect its own exact pair. Users choose the labelled controls and submit, without typing IDs or constructing a URL. Original source/id values are native select option values, never presentation IDs or a new packed parameter. A mismatched pair refuses rather than selecting another item. No packed new public selection parameter, custom form renderer or JS dispatcher is introduced. Observed direct supplier render fixture, original nodes, models and HTML byte hashes are retained at data/records/source-observation-records/commerce-navigation-20261020/supplier-interface-observation.json and tufte-{catalog,detail}-render.html. The JSON fixture evidence below supplies actual model/return shapes to the text-only provider; it is not a target implementation, target test code or a claim of complete runtime receiving. ## Inline executed supplier example {"catalog":{"title":"Fixture <catalog>","description":"Supplier contract observation.","facets":[{"key":"source","label":"Sources"}],"items":[{"id":"offer-5b2266697874757265222c226f726967696e616c2d626f6f6b225d","title":"Original <book>","summary":"A <script> is text.","facets":{"source":["fixture"]},"keywords":["original-book"],"status":{"label":"coming-soon","note":"Inspection only."},"facts":[{"label":"Original ID","value":"original-book"}],"actions":[{"kind":"unavailable","label":"Purchase unavailable","reason":"coming-soon"}]}]},"form":{"id":"navigation-search","title":"Find an offer","span":12,"form":{"action":"/","method":"get","fields":[{"name":"q","label":"Search","kind":"search","value":""},{"name":"source","label":"Source","kind":"select","value":"","options":[{"value":"","label":"All sources"},{"value":"fixture","label":"Fixture publisher"}]}],"submitters":[{"label":"Search"}]}},"composedTile":{"id":"source-coverage","title":"Coverage","span":12,"html":"<p>Source &lt;coverage&gt;</p>"},"model":{"title":"Fixture <catalog>","subtitle":"Supplier contract observation.","tiles":[{"id":"navigation-search","title":"Find an offer","span":12,"form":{"action":"/","method":"get","fields":[{"name":"q","label":"Search","kind":"search","value":""},{"name":"source","label":"Source","kind":"select","value":"","options":[{"value":"","label":"All sources"},{"value":"fixture","label":"Fixture publisher"}]}],"submitters":[{"label":"Search"}]}},{"id":"storefront-results","title":"1 item","span":12,"live":"polite"},{"id":"offer-5b2266697874757265222c226f726967696e616c2d626f6f6b225d","title":"Original <book>","span":4,"html":"<div class=\"tufte-storefront-item\"><p>A &lt;script&gt; is text.</p><p><strong>coming-soon</strong></p><dl><dt>Original ID</dt><dd>original-book</dd></dl><ul class=\"tufte-storefront-keywords\" aria-label=\"Keywords\"><li>original-book</li></ul><p><a href=\"/offers?source=fixture&amp;id=original-book\">View Original &lt;book&gt;</a></p><div class=\"tufte-storefront-actions\"><p aria-disabled=\"true\">Purchase unavailable — coming-soon</p></div></div>"},{"id":"source-coverage","title":"Coverage","span":12,"html":"<p>Source &lt;coverage&gt;</p>"}],"revision":"fixture-source-revision"},"detailModel":{"title":"Original <book>","eyebrow":"Fixture <catalog>","metadata":{"description":"A <script> is text."},"tiles":[{"id":"storefront-navigation","title":"Browse","span":12,"links":[{"href":"/","label":"All Fixture <catalog>"}]},{"id":"offer-5b2266697874757265222c226f726967696e616c2d626f6f6b225d","title":"Original <book>","span":12,"html":"<div class=\"tufte-storefront-item\"><p>A &lt;script&gt; is text.</p><p><strong>coming-soon</strong> — Inspection only.</p><dl><dt>Original ID</dt><dd>original-book</dd></dl><ul class=\"tufte-storefront-keywords\" aria-label=\"Keywords\"><li>original-book</li></ul><div class=\"tufte-storefront-actions\"><p aria-disabled=\"true\">Purchase unavailable — coming-soon</p></div></div>"}],"revision":"fixture-source-revision"},"missingDetail":null,"settings":{"stylesExport":"STOREFRONT_STYLES","language":"en"},"results":{"renderType":"string","htmlSha256":"86c4a97b9e3d47f6ff6158d70b70e390826536bc7914ec83fe56682dcdec3cea","detailHtmlSha256":"06844fd9b73a7444f0bdc6db73f86e9d441a6e2ab1dea768ddfd332e06fa9a1a","doctype":true,"escapedTitle":true,"escapedSummary":true,"nativeGetForm":true,"sourceSelect":true,"originalIdentityHref":true,"unavailableAction":true,"storefrontStyles":true,"detailBackLink":true},"mcpCalls":[{"message":{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"fixture","version":"1.0.0"}}},"status":200,"headers":[["cache-control","no-store"],["content-type","application/json"]],"body":{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-11-25","capabilities":{"tools":{"listChanged":false},"logging":{},"completions":{}},"serverInfo":{"name":"supplier-fixture","version":"1.0.0"}}},"isResponse":true},{"message":{"jsonrpc":"2.0","id":2,"method":"tools/list"},"status":200,"headers":[["cache-control","no-store"],["content-type","application/json"]],"body":{"jsonrpc":"2.0","id":2,"result":{"tools":[{"inputSchema":{"type":"object","additionalProperties":false,"properties":{}},"name":"read_fixture","description":"Read the explicit supplier fixture.","annotations":{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}}]}},"isResponse":true},{"message":{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"read_fixture","arguments":{}}},"status":200,"headers":[["cache-control","no-store"],["content-type","application/json"]],"body":{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"{\n  \"fixture\": \"original-source\"\n}"}],"structuredContent":{"fixture":"original-source"}}},"isResponse":true},{"message":{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"read_fixture","arguments":{"unknown":true}}},"status":200,"headers":[["cache-control","no-store"],["content-type","application/json"]],"body":{"jsonrpc":"2.0","id":4,"error":{"code":-32602,"message":"tool read_fixture arguments outside inputSchema: / must NOT have additional properties"}},"isResponse":true}]} Observation record SHA256 5fef803da0ebb1d9c1fee572c59c22c520775d65232680cb3c64ab83a2c0b21f. Full HTML files retain exact bytes; booleans above are direct supplier observations, not target tests or full system acceptance.
- `exact-mcp-supplier-boundary` | Original published supplier and Web Engineering source receiver | attempt-004-complete-supplier-refinement | source-owned:2026-10-20-market-bazaar-design.md | Actual published MCP and admitted transport/results; mandatory generated complete runtime | ## Complete measured native MCP supplier boundary Selected installed @red-cup-engineering/mcp-engineering-services-section 0.1.7 source hashes: server.mjs f127828579c09dc011dcd68243e53022c093d092dbfa61db2c66dbce2764bc0a; http.mjs 46476c3e5eb4d457386bf6c3c65221dcbd718e5f19bf3ac6fdd08de4868491b9; protocol-versions.mjs 68b5a0096eaf5e03225ba04e45ae56373233a735759c8bd0df7bfa6bc64946b2. Read original server.test.mjs/http.test.mjs for exact refusal/result conventions; directly executed initialize/tools/list/tools/call/invalid args against the installed supplier and retained actual JSON responses, not a custom dispatcher. /server createMcpServer({name:string,version:string,tools:[tool,...],instructions?:string}) returns a frozen object {name,version,handleMessage,onNotification,serveStdio}. tool is {name,description,inputSchema:JSONSchema,handler:async(args,context)=>object,annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true}}; the schema is the actual SignCell admission, additionalProperties:false and exact required keys. Handlers are host functions, never public request-supplied functions. Do not set pageSize, call serveStdio or install resource/prompt/write/auth tool catalogs. The selected stateless Fetch path never invokes supplier optional Node cursor/stdio helpers. No principal/payment authority is inferred from this public server. /http mcpResource({server,path:roleMcpPath,sessions:false,allowedOrigins:[configuration.origin]}) returns frozen resource {id:'mcp.endpoint',name:'MCP Endpoint',route:path,match:path,methods:['GET','HEAD','POST','DELETE'],handler:async(ctx)=>Response}. OPTIONAL maxBodyBytes is omitted, selecting the ACTUAL supplier finite default 4194304 bytes; it checks declared Content-Length and enforces streaming UTF-8 bytes before JSON parsing. The required invocation is resource.handler({request:originalMcpRequest}); ctx.req, ctx.input, Node streams and a second body reader are NOT required. The resource does not itself route pathname, so the navigator invokes this handler ONLY at the exact role MCP path. Return its actual Response; no custom JSON-RPC/HTTP encoder, error-status rewrite or body preconsumption. Omit modern, verifyToken, bind and loopbackBypass unless a receiving-authorized host context is genuinely required; no bearer auth is required for these free read-only tools. Source reads happen lazily inside an argument-admitted tool handler, not before native body/origin/protocol/schema checks; initialize/tools/list are metadata, not source-reader bypasses. A request-local source-read promise may be shared by tool representations; there is no durable cache. The selected native legacy stateless protocol versions are exactly ['2025-11-25','2025-06-18','2025-03-26','2024-11-05'], latest is the first. Requests use POST, Content-Type application/json, Accept application/json (or application/json, text/event-stream), and MCP-Protocol-Version:2025-11-25. JSON initialize request shape is {jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'receiving-client',version:'1.0.0'}}}; response result has protocolVersion,capabilities:{tools:{listChanged:false},logging:{},completions:{}},serverInfo:{name,version}. Choose server name bazaar.561.group for Bazaar and market.561.group/markets for Market; server version '1.0.0' denotes this API contract, not a fabrication/release receipt. No MCP session ID is issued or required with sessions:false. Modern protocol is not silently inferred; original Market /mcp remains the original merchant service untouched. Tools/list request {jsonrpc:'2.0',id:2,method:'tools/list',params:{}} returns {jsonrpc:'2.0',id:2,result:{tools:[advertised views]}} with no handler functions. Tools/call request {jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'search_offers',arguments:{q:'book'}}}. Supply each successful tool value as {content:[{type:'text',text:JSON.stringify(value)}],structuredContent:value}, where value is the exact plain object below. Native server also wraps a plain object automatically, but explicit identical JSON/structuredContent prevents arbitrary output shape. No outputSchema is necessary unless it exactly matches the selected envelope; inputSchema is mandatory. Tools are declared in the accepted role order. Optional argument defaults are q empty/source null/selected empty; unknown argument keys, wrong types or selection/query bounds refuse in native admission before any source read. An optional source filter or get_offer TOP-LEVEL source string that is not configured is a domain INVALID_SOURCE refusal before source reads, not a replacement source. Nested compare_offers selected sourceId/id references follow the pure missing-pair law instead; do not reject their unknown source as INVALID_SOURCE. Success tool values: search_offers is the FULL pure Bazaar projection with its accepted q/source. get_offer is {item:exactNormalizedItem,coverage:projection.coverage,limitations:projection.limitations,origin:projection.origin,revision:projection.revision}; resolve only the requested original pair. compare_offers selected inputSchema MUST include uniqueItems:true so duplicate tuples are native schema-refused before any source read; nested valid reference tuples resolve through the pure comparison law, then missing pair gives OFFER_NOT_FOUND only after current-source availability is established. compare_offers is {items:projection.comparison.items,priceComparable:projection.comparison.priceComparable,reason:projection.comparison.reason,coverage:projection.coverage,limitations:projection.limitations,origin:projection.origin,revision:projection.revision}. list_markets is {venues:projection.venues,coverage:projection.coverage,limitations:projection.limitations,origin:projection.origin,revision:projection.revision}. read_observations has the SAME Market envelope, filtering both venues and coverage to the exact requested source if provided, preserving order; otherwise all source observations. Empty compare selection is native argument refusal (at least one selected pair), while one valid selection is the exact insufficient-selection comparison. All envelope arrays/objects are the actual projection facts, not new source/seller authority. HTTP navigation/search/detail/compare routes still use the accepted 400/404/503 statuses. MCP semantic errors use the ORIGINAL supplier's transport/result contract, not those HTML-route statuses. Domain failures MUST throw a PLAIN non-Error object with exact string code/message, never Error, TypeError, subclass, Error.cause or a merely attached code property. The actual supplier formats CODE: message only for non-Error {code,message}; Error instances lose the public code. Missing requested current identity throws domain {code:'OFFER_NOT_FOUND',message:'No current offer exists for the requested original identity.'}; all-source failure on a dynamic tool throws {code:'SOURCE_UNAVAILABLE',message:'No configured source has a current complete observation.'}; unknown source throws {code:'INVALID_SOURCE',message:'The requested source is not configured.'}. Native mcpToolError returns result {isError:true,content:[{type:'text',text:code+': '+message}]} inside HTTP200. No source/private exception details escape. Invalid tool argument schema or unknown tool returns JSON-RPC error.code=-32602 inside native HTTP200; unknown RPC method gives -32601. Malformed JSON/UTF-8 gets HTTP400 with -32700; body too large HTTP413; unsupported protocol header HTTP400; foreign Origin HTTP403; GET/HEAD/DELETE at stateless endpoint HTTP405 with Allow:POST. Notifications have HTTP202 and no body. Accept only text/event-stream returns native single event 'event: message\ndata: '+JSON.stringify(answer)+'\n\n' with text/event-stream; Accept containing application/json receives JSON. Do not rewrite native server errors as alleged completed operations.
- `exact-reader-clock-ports` | Original published supplier and Web Engineering source receiver | attempt-004-complete-supplier-refinement | source-owned:2026-10-20-market-bazaar-design.md | Fixed configured source read and post-read projection time; mandatory generated complete runtime | ## Exact source reader and clock ports createCommerceNavigator(configuration,{fetchImpl,now}={}) accepts only host-supplied hooks. fetchImpl is a function taking ONE already constructed Fetch Request and returning a Promise<Response>; default is globalThis.fetch. Each source read constructs a new Request for EXACT descriptor.url with method GET, redirect manual, an AbortController signal and NO guest headers or credentials. Pass that Request directly as the sole fetchImpl argument; a named existing env binding uses binding.fetch with the SAME source-read Request shape. Missing named binding is source-binding-unavailable, with no public-network fallback. This source-read Request is deliberately different from original merchant forwarding. Only forwarding must preserve the SAME incoming Request and returned merchant Response identity. now is a zero-argument host function returning a finite explicit-timezone ISO timestamp STRING; default is new Date().toISOString(). It is not a Date object, number, frozen instant string, public query or dependency on process state. Validate its value before using it. Timestamp EACH source observation by calling now() when that read completes or fails, after all bytes/parsing or refusal, not once at request entry. After ALL source read promises settle, call now() AGAIN for the pure projection input.now; this avoids genuine read latency making fresh completion observations appear future. Preserve original sourceDate/digests and do not clamp times, copy projection time into source time, or invent a timestamp to hide a backwards clock. A genuinely future observation remains refused by the pure law. The independent receiving driver MUST include an advancing fake-clock case where source completion timestamps are later than request entry and projection now is later than all completions, checking fresh records remain current; also keep the genuine future-clock refusal case. Hooks never cross HTTP/MCP arguments, affect the original merchant branch or supply a new clock authority.
- `optional-source-normalization` | Web Engineering source producer and independent receiver | native-form-empty-selection | source-owned:2026-10-20-market-bazaar-design.md#optional-source-filter-normalization | Existing native GET and optional MCP source filters before pure admission | Before constructing pure input, HTTP navigation query and MCP OPTIONAL source arguments normalize missing or the exact empty string to null. The native All sources GET option submits source=; that is a valid unfiltered source selection, not an unknown configured ID. Do not trim, lowercase or otherwise rewrite any nonempty original source ID; nonempty unknown source still refuses. This rule applies only to optional search/read-observations source filters, not REQUIRED source identity in get_offer, /offers, selected comparison pairs or configured descriptors. Missing q defaults to empty and uses the existing trimmed query semantics. Direct pure input query.source remains exactly null or a known nonempty source ID; an empty direct pure value is still malformed. Independently receive default form submission with empty source, omitted source and a valid nonempty source, plus refusal of an unknown nonempty source, through actual HTTP and native MCP. No new public argument, fixture policy exception or change to original identities is introduced.
- `pure-empty-selection-intersections` | Web Engineering source producer and independent receiver | attempt-005-pure-intersection-refinement | source-owned:2026-10-20-market-bazaar-design.md#pure-empty-source-and-selection-intersections | Exact input admission versus source absence and comparison; all admitted pure inputs | For the registered PURE operation, structural input admission happens before source processing and empty-source shortcuts. Unknown configured observations and unknown non-null query.source are malformed input, even when sources is empty. An empty direct pure query.source is unknown and invalid; the separate optional HTTP/MCP filter normalization remains upstream. Market query.selected MUST be empty regardless of source/observation state; nonempty Market selection throws TypeError. Duplicate selected tuples are malformed and throw TypeError regardless of existence. Otherwise selected sourceId/id strings are references, not claims of existing configured sources or offers: a string pair that is not in admitted all-items (including an unknown source, a known source with missing item, empty string field or an unavailable/refused source) is a selected-offer-not-found datum, not an input TypeError. No selected reference creates source configuration or a fetch. Empty sources plus non-null query.source still throws; empty sources plus arbitrary valid q and null query.source is valid. For valid Bazaar input, comparison is null if and ONLY if selected.length is zero. With any selection, comparison is an object: preserve actually found items in selection order, set priceComparable false and reason selected-offer-not-found if ANY reference is missing. This first comparison reason wins over insufficient-selection, missing quote or incompatibility. Partial missing selection retains the found subset; all missing selection returns items empty. Resolve selected refs from all admitted items BEFORE q/source filtering, so a valid found comparison item can remain even when output.items is empty because q/source excludes it. With sources empty and valid nonempty selection, coverage/items/venues are empty, comparison exactly {items:[],priceComparable:false,reason:'selected-offer-not-found'}. Empty-source/null-comparison statements throughout this order are conditional on empty selection; they never erase this comparison rule or the preceding role/input admission. HTTP/tool layers keep original explicit not-found semantics; pure returns evidence and does not throw for missing offers.
- `host-navigation-source-scope` | Original behavior owner and independent source receiver | post-006-source-receiving-refinement | source-owned:2026-10-20-market-bazaar-design.md | Optional host navigation and mandatory human visible original scope | ## Host navigation and visible source scope refinement The independently received behavior M1 requires a usable human observation/navigation homepage with links to the actual Bazaar and Shop; M2/architecture also require original external source links. Native candidate006 did not satisfy this: Market render used JSON pre tiles without any links, and its exact configuration had no Shop-link authority. This refinement supplies the minimal original host-owned data and generic native presentation; it changes no pure input/output or original commerce engine. Factory/default configuration remains ONE object with required role,origin,title,revision,sources and optional navigation. If absent, navigation is an empty list, preserving original factory callers. If present it MUST be an array of exact plain {href,label} entries, both nonempty strings, no other entry keys. Admit href as either direct public HTTPS under the existing uniform URL law, or a single-leading-slash root-relative URL resolved against the canonical configuration origin under that same law; reject scheme-relative //, backslash/control, credentials, private/local/special-use host and fragment. Do not fetch navigation targets, derive a sibling hostname or merge public request data into navigation. Invalid navigation is configuration TypeError from factory and bounded default503 before any source read/forwarding. The pure projector schema still forbids unrelated keys; never pass navigation/title into pure input. Causeway config owns the real navigation href/label values. Generic engine uses only admitted configuration.navigation in native TUFTE model.navigation, rendered as real accessible anchors even during source outage; machine directory may also expose this original host navigation as data, but cannot replace human links with JSON. Market source venue URLs are already admitted descriptor.url and MUST be rendered as actual native source links with original publisher/source label. Required internal observation/discovery links are host navigation entries supplied by the instance, not inferred from a hostname. Preserve original merchant routes; Market includes an explicit free original /v1/catalog navigation link, no paid request or changed merchant path. No engine hardcoded 561 domains or source-provider hostname topology. Both human roles MUST visibly expose source scope next to source freshness/coverage: for EVERY configured descriptor, display sourceId,publisher,kind,url and consent.status,evidence,revision,expiresAt as safe original host-owned PUBLIC/redacted text. Include clear wording that house-publication means publisher-authorized projection, not independently controlled seller consent or transaction qualification, and public-market-observation is publisher testimony, not Bazaar membership. Native safe node composition or native data tile can render this configured-source-scope tile; no raw source HTML, private tokens or guessed authority. Evidence locators stay inert text unless independently admitted as safe links; do not dereference grant evidence. Source directory and source scope stay inspectable during no current observations; no stale/withdrawn source produces an admitted current offer. Include a usable role-local discovery link from configuration or the original fixed endpoint path. Grant metadata in discovery alone does not discharge B1's HUMAN visible scope requirement. Current instance selected Market navigation is original data: Bazaar https://bazaar.561.group, Shop https://shop.561.group, Market discovery /markets/discovery.json, dated observations /markets/observations, venue sources /markets/venues and original merchant catalog /v1/catalog. Original source links use each admitted descriptor.url including 402 Index health and MPP services. This link list is Causeway data, not reusable engine constants. Bazaar configuration may omit optional navigation; its own fixed discovery link and source-scope/source links still render. Existing canonical source URLs, bounds, bindings, merchant and Shop source remain unchanged. Native/source receiving must inspect actual rendered anchors and source-scope text for both healthy and unavailable sources, verify default/factory invalid navigation no effects and missing navigation compatibility, and retain all original B/M/P/R behavior. The complete original observable contract is delivered inline to the text-only writer below; a statement that an unavailable source document is retained is not enough.
- `native-mcp-domain-selected-correction` | Original behavior owner and independent source receiver | post-006-source-receiving-refinement | source-owned:2026-10-20-market-bazaar-design.md | Original native MCP domain object and pre-read duplicate/selected semantics | ## Native MCP domain and selected-reference receiving correction Use EXACT plain {code,message} domain objects and existing native mcpToolError; do not return domain Error instances with attached code. Original MCP 0.1.7 was directly invoked: a thrown plain OFFER_NOT_FOUND object produced HTTP200 result.isError true/content text beginning OFFER_NOT_FOUND:. A compare tool input schema with selected.uniqueItems:true rejected structural duplicate objects EVEN when property order differed, JSON-RPC -32602 and ZERO handler calls. Actual fixture record data/records/source-observation-records/commerce-navigation-20261020/mcp-domain-and-unique-items.json SHA2563ae8647ed1b82d1e5a1e3b370229ef56b1bcf021a1dbabde30edf2cb34327d21 is supplier evidence, not target implementation/test or complete runtime acceptance. Top-level optional source filter and get_offer source retain existing INVALID_SOURCE admission before reading when the configured source is unknown. compare_offers nested selected refs have no configured-source existence precheck: valid unknown/missing pairs use the same pure missing-pair law; after reads, if no current source then SOURCE_UNAVAILABLE wins, otherwise a missing selected pair throws plain OFFER_NOT_FOUND. Duplicate tuples are native schema-refused before reads using uniqueItems:true, not left for a post-read domain handler. Keep HTTP duplicate query validation before source reads. Preserve exact public reason/error text and every pure example; no new production operation or custom MCP status mapper.
- `complete-original-observable-contract` | Original behavior owner and independent source receiver | post-006-source-receiving-refinement | source-owned:2026-10-20-market-bazaar-design.md | Unabridged original operative B/M/P/R behavior, all required source/runtime products | ## Complete original observable B/M/P/R contract supplied to the writer The following is the ORIGINAL operative behavioral specification, not a narrowed summary; it is retained alongside all prior detailed/pure contracts. Source: https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/4a618823f837c351f618aaec2e9f8525b5b7ef5e/content/text/documents/articles/specifications/2026-10-20-market-bazaar-behavior.md . It includes human links/consent, source originals, machine behavior, preservation, bounds and actual receiving. No clause is discharged by pure projection tests. - B1: bazaar.561.group MUST serve its own searchable human HTML at /, offering detail at /offers?source=...&id=..., and side-by-side comparison at /compare?source=...&id=... using repeated source/id pairs. Original IDs are URL-encoded; requests never supply new upstream URLs. Active item actions MUST be direct HTTPS URLs without credentials or private/local hosts; an unsafe original URL survives only as inert original-source evidence with no actionable URL. It MUST search actual current source offerings and show original product/offer identity, publisher, known seller, origin link, offered delivery kind, price/asset/unit where declared, freshness, consent scope and uncertainty. Unknown seller/payee remains unknown. - B2: Bazaar MUST provide GET /discovery.json, /v1/discovery/search, /v1/discovery/compare and read-only POST /mcp with search_offers, get_offer, compare_offers. Human and machine views MUST consume the same request projection. Search supports q and source; compare returns the selected original records and explicit price-comparability result. No own catalog or duplicate offer authority is created. - B3: The initial eligible sources are the original public shop.561.group/catalog.json and market.561.group/v1/catalog, whose publication/configuration custody is held by Causeway. Neither URL proves individual seller rights, external seller consent or independent control. Where rights are unqualified, display source-listed inspection/navigation and mark transaction qualification unavailable. Coming-soon items remain source-visible and non-buyable. Source hidden/private items MUST NOT be included. - B4: Bazaar MUST retain book edition digest and artifact digests, original x402 SKU/cell/law, original invocation method/URL/schema, and original payment/recovery descriptors when present. It MUST NOT rename, merge or fabricate seller goods, mark a bare HTTP 402 as a paid delivery, or proxy purchases. A human follows the original Shop goods page; an agent inspects the original invocation. Different rails/units/assets are not price-comparable, even for the same edition, absent a separately qualified conversion contract. - B5: Revoked, expired, contested, unknown or unsupported external membership MUST NOT produce an admitted listing. Current house-publication status means only publisher-authorized source projection; it is not provider verification. External discovery is admitted only from source-owner grant with publication/representation scope, revision, expiry and revocation evidence. Public provenance redacts private consent material while preserving independently verifiable evidence locators. - M1: market.561.group MUST serve an observation/navigation HTML homepage, GET /markets/discovery.json, /markets/observations, /markets/venues and read-only POST /markets/mcp. It MUST link the actual Bazaar and Shop, and observe at least two unrelated external market publishers with source date, request time, source URL, method, measurement scope, units, coverage and uncertainty. It MUST NOT substitute the merchant offer catalog for this Market role. - M2: Initial external observations read 402 Index's published /api/v1/health and MPP's published /api/services. The former supplies publisher-reported endpoint/service/provider/health counts; the latter supplies a count of entries and declared endpoints in the complete fetched curated catalog. These populations overlap and MUST NOT be summed, equated with independent Shops, attributed to Group income, or treated as proven settlement/delivery. Unknown liquidity, demand, transactions, revenue and net contribution remain explicit null/unknown, never zero. Original external source links remain available. - P1: Existing market x402 catalog, well-known metadata, ActivityPub actor/outbox, merchant MCP, payable routes, request bodies, SKU, payee, settlement/recovery and installed state MUST remain served by the original merchant handler at their original paths and origin. A new navigation front controller serves only the homepage and exact /markets/ observation paths; every other request is forwarded intact to the existing immutable merchant Worker through its existing-platform service binding. The original merchant /mcp remains unchanged; observation MCP has its distinct path. No payable merchant endpoint is served under Bazaar merely because it shares code. - P2: Existing Shop /, /goods/*, /catalog.json, checkout/account/gift/fulfillment and accepted artifact identities MUST remain under its original Worker and storage. Preserve the currently installed behavior of /mcp; this does not assert that Shop MCP is live. The independently observed initial agent resource is /catalog.json. This slice does not require Shop source changes, purchases, unarming checkout or a second fulfillment store. - R1: Source requests are read-only, finite, allowlisted HTTPS without credentials, redirects or user-controlled targets. Each observation carries original source bytes digest, fetch clock, source clock when supplied, and complete/incomplete state. A failed source yields an explicit partial result alongside surviving sources. All unavailable sources yield 503 for dynamic search/readouts, while the source directory remains inspectable. A timeout, stale cached value or incomplete body MUST NOT be called a fresh current quote. - R2: Public query input cannot set source configuration, actor, consent, payee, clock, budget, release identity or upstream request headers. Mutating Bazaar methods and unknown MCP tools refuse. Reads create no order, charge, grant, seller signup or hidden referral fee. Public source visibility does not authorize external seller contact or purchase. - R3: Release receiving MUST independently verify DNS, canonical HTTPS/TLS, each origin's resource identity, source/deployed revision, working search/detail/comparison, machine discovery/MCP and meaningful positive/alternate/refusal cases. Domain attachment, HTTP 200 or a landing page is insufficient. Preserve original merchant/Shop smoke checks and before/after fingerprints without paying.
- `measured-tufte-query-facet` | Original published TUFTE supplier and Web Engineering source receiver | attempt-007-supplier-contract-correction | source-owned:2026-10-20-market-bazaar-design.md#measured-tufte-item-facets-and-query-facets--native-regression | Required original supplier search semantics and admitted native regression; no runtime acceptance | ## Measured TUFTE item facets and query facets — native regression The original published @red-cup-engineering/web-page-tiling-engine@0.14.2 ./storefront filterStorefrontItems(catalog, query) has DISTINCT item and query facet shapes. Each catalog item facets value is an array of strings; each query.facets value is one scalar string. For source filtering, item.facets.source is [item.sourceId], while query.facets.source is query.source, never [query.source]. With no source filter query.facets is {}. The existing trimmed case-insensitive substring term and source filter are combined. This is the measured original supplier contract, not a new filtering API or change to pure input/output schemas. The selected original supplier source src/tufte-storefront.mjs SHA256 ec4a7b6d199cf3fd81d3afde52971c7676a4e1ecbb6aaf7dcb5920e67ebd32e9 implements the decisive predicate `(item.facets?.[key] ?? []).includes(value)` for each `[key, value]` query facet. Attributed dependency evidence: the array belongs on the item; `value` is the scalar query string. The source-qualified direct supplier execution retained in data/records/source-observation-records/commerce-navigation-20261020/tufte-item-query-facets.json (SHA256 80cf34007122fe7abe4e80309a17f45a59fc55024d751b1ed75fc651ce7c0089) observes scalar query {term:"NEEDLE",facets:{source:"x"}} returning item "one", and the wrong array query {term:"NEEDLE",facets:{source:["x"]}} returning no items for that same catalog. This observation establishes the supplier boundary only. Native attempt-007 source candidate SHA256 2f933701a341f3028d375a45688f4ee72045e346a998f0116d42c544f11d857d incorrectly supplied an array query facet. Its original derived case keyword-search-preserves-inert-original-and-unquoted-inspection is promoted unchanged in name, operation, input and expected output as the additional admitted regression example. The original native case metadata clauses are pure-commerce-mapping, pure-search-selection, pure-comparison, pure-no-authority-invention and pure-output-invariants; throws is null. The source order carrier uses its existing four-field admitted-example schema, without altering those native payloads. Every preceding admitted example and operation/dependency schema is retained unchanged. The selected item must survive the keyword/source search while its unsafe original loopback URL remains inert, its malformed atomic-price spelling yields null price, and its single selected pair yields insufficient-selection. Comparison still resolves from all admitted items before display filtering. The original isolated replay observed 23 tests, 22 passes and one failure, with no skipped or truncated result. The sole output difference was top-level items being empty; comparison retained the original selected item. This is a rejected derivation, never target runtime or production acceptance. Original native clause-lot receipt jXjrp6CN89MD7p-Fhqd8myBe8PGqY99nxfea0ziX6XU and source-writer receipt qJgjbz2GBb0wP4hBycfldx4R2GOmffUVQsI04a9ayhQ retain the causal evidence. Bare Cedar Fog data/records/fabrication-run-records/commerce-navigation-20261020/attempt-007/pre-assay-readback/stdout.tap SHA256 2a1db8034fe8caccfc6d5fd56a8623da83a7c8f7b8a551b355ea9ea95bab49fd and exact native executor request SHA256 c9b10c621f53012c6137f01ec6cd9841a62a471a8489a196648be59261608493 identify the independent diagnostic replay. Full existing runtime, supplier, consent, navigation, source-scope, MCP, merchant preservation and independent receiving duties remain mandatory; this correction does not claim their fulfillment.

## Open questions
none
## Claims
- `original-requirement` | measured | world | Original source-authored Group requirement states distinct commerce roles, original identity/custody, consent, bounded authority and preservation obligations; this is observed governing source, not observed external seller authority or deployment | none | https://github.com/561-group/561-group-services-section/blob/32d5a53ef5f45b93feab17866147435fbedea8f3/lib/agency/requirements/market-bazaar-shop-agentic-composable-enterprise.json | sha256:7354ae36e6d04bdacfc111d1c1e00f7edf80d3ca974044f0416601dc83f8e9de | Read exact Group source bytes at the specified revision and retain the normative basis for all prohibitions
- `tufte-dependency` | measured | dependency | Published original @red-cup-engineering/web-page-tiling-engine@0.14.2 exposes the selected storefront/search/detail/composition/rendering contracts; complete installed graph still requires receiving | none | https://registry.561.group/@red-cup-engineering/web-page-tiling-engine/-/web-page-tiling-engine-0.14.2.tgz#package/src/tufte-storefront.mjs | sha256:ec4a7b6d199cf3fd81d3afde52971c7676a4e1ecbb6aaf7dcb5920e67ebd32e9 | Read original published archive in memory, verify its registry SHA512 integrity, then read actual storefront/composition/rendering exports; source-local unpublished later edition is not selected
- `mcp-dependency` | measured | dependency | Source manifest declares @red-cup-engineering/mcp-engineering-services-section@0.1.7; installed supplier exports and complete graph require independent native receiving | none | /home/emsenn/info/lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-networking-engineering-services-section/services/mcp-engineering-services-section/package.json | sha256:213ffa2296e0f2d700209a3e66895bc7eaeb6cc24134fe65e0bde742a7c736f4 | Read exact original source manifest bytes; not a claim of registry publication or full graph admission
- `source-timeout-bound` | conjectured | parameter | Proposed configurable per-source read deadline, not a proved optimum or service guarantee | 8000 millisecond | Current public source reads complete under this configured deadline | Complete source-read latency and timeout refusal | Trusted-host fake clock plus bounded live source observer | Refuse incomplete/timed-out source without dropping surviving sources | Initial conservative bounded host choice; receiver qualifies the actual configured limit
- `source-read-bound` | conjectured | parameter | Proposed configurable per-source byte ceiling, not a capacity reservation or proved optimal workload | 1048576 byte | Complete current public source catalogs fit the proposed finite bound | Whole-source byte completion and response time | Original bounded reader plus independent complete-source assay | Refuse incomplete source before displaying its rows | MPP public body observed below the proposed byte bound; host must qualify actual limits and capacity

- `executed-supplier-boundary` | measured | api | Actual installed published TUFTE rendering/model and native MCP HTTP/argument contracts directly invoked on explicit host fixture; this does not establish target runtime or deployment | none | /home/emsenn/info/lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-web-engineering-services-section/data/records/source-observation-records/commerce-navigation-20261020/supplier-interface-observation.json | sha256:5fef803da0ebb1d9c1fee572c59c22c520775d65232680cb3c64ab83a2c0b21f | Read actual published source and original native test conventions, invoke original supplier exports and retain exact models, response JSON and HTML digests; no target implementation or test source authored

- `native-mcp-plain-domain-unique-items` | measured | api | Actual published MCP plain domain-object formatting and structural uniqueItems argument refusal before handler calls | none | /home/emsenn/info/lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-web-engineering-services-section/data/records/source-observation-records/commerce-navigation-20261020/mcp-domain-and-unique-items.json | sha256:3ae8647ed1b82d1e5a1e3b370229ef56b1bcf021a1dbabde30edf2cb34327d21 | Direct original server/http invocation on explicit host supplier fixture; no target source or generated target test edited

- `executed-tufte-query-facet` | measured | api | Original selected published TUFTE distinguishes item string-array facets from query scalar-string facets; direct original supplier execution observes healthy scalar match and wrong array-query empty result; target acceptance remains pending | none | /home/emsenn/info/lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-web-engineering-services-section/data/records/source-observation-records/commerce-navigation-20261020/tufte-item-query-facets.json | sha256:80cf34007122fe7abe4e80309a17f45a59fc55024d751b1ed75fc651ce7c0089 | Executed original filterStorefrontItems against the retained same-catalog scalar and array query fixtures

## Modules
```json
{
  "operations": [
    {
      "name": "project-commerce-navigation",
      "module": "src/commerce-navigation.mjs",
      "exportName": "projectCommerceNavigation",
      "description": "Pure source-preserving Bazaar or Market projection of host-bound configured source observations. Also derive the required createCommerceNavigator and default Worker ancillary exports in this same module, per the complete supplier/data/algorithm/runtime clauses; no function-valued operation result.",
      "inputSchema": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "role",
          "origin",
          "revision",
          "now",
          "query",
          "sources",
          "observations"
        ],
        "properties": {
          "role": {
            "enum": [
              "bazaar",
              "market"
            ]
          },
          "origin": {
            "type": "string"
          },
          "revision": {
            "type": "string"
          },
          "now": {
            "type": "string"
          },
          "query": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "q",
              "source",
              "selected"
            ],
            "properties": {
              "q": {
                "type": "string",
                "maxLength": 256
              },
              "source": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "selected": {
                "type": "array",
                "maxItems": 8,
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "sourceId",
                    "id"
                  ],
                  "properties": {
                    "sourceId": {
                      "type": "string"
                    },
                    "id": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "sources": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "id",
                "kind",
                "url",
                "publisher",
                "consent",
                "maxAgeSeconds",
                "maxBytes",
                "timeoutMs"
              ],
              "properties": {
                "id": {
                  "type": "string"
                },
                "kind": {
                  "enum": [
                    "shop-catalog",
                    "x402-catalog",
                    "index-health",
                    "mpp-catalog",
                    "bazaar-summary"
                  ]
                },
                "url": {
                  "type": "string"
                },
                "publisher": {
                  "type": "string"
                },
                "consent": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "status",
                    "evidence",
                    "revision",
                    "expiresAt"
                  ],
                  "properties": {
                    "status": {
                      "enum": [
                        "house-publication",
                        "seller-consented",
                        "public-market-observation",
                        "unverified",
                        "revoked"
                      ]
                    },
                    "evidence": {
                      "type": [
                        "string",
                        "null"
                      ]
                    },
                    "revision": {
                      "type": [
                        "string",
                        "null"
                      ]
                    },
                    "expiresAt": {
                      "type": [
                        "string",
                        "null"
                      ]
                    }
                  }
                },
                "maxAgeSeconds": {
                  "type": "number",
                  "exclusiveMinimum": 0
                },
                "maxBytes": {
                  "type": "integer",
                  "minimum": 1
                },
                "timeoutMs": {
                  "type": "integer",
                  "minimum": 1
                },
                "binding": {
                  "type": "string"
                }
              }
            }
          },
          "observations": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "sourceId",
                "url",
                "observedAt",
                "sourceDate",
                "digest",
                "status",
                "body",
                "error"
              ],
              "properties": {
                "sourceId": {
                  "type": "string"
                },
                "url": {
                  "type": "string"
                },
                "observedAt": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "sourceDate": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "digest": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "status": {
                  "enum": [
                    "ok",
                    "unavailable",
                    "invalid",
                    "incomplete"
                  ]
                },
                "body": {},
                "error": {
                  "type": [
                    "string",
                    "null"
                  ]
                }
              }
            }
          }
        }
      },
      "outputSchema": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "role",
          "origin",
          "revision",
          "coverage",
          "items",
          "comparison",
          "venues",
          "limitations"
        ],
        "properties": {
          "role": {
            "enum": [
              "bazaar",
              "market"
            ]
          },
          "origin": {
            "type": "string"
          },
          "revision": {
            "type": "string"
          },
          "coverage": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "sourceId",
                "url",
                "status",
                "observedAt",
                "sourceDate",
                "digest",
                "reason"
              ],
              "additionalProperties": false,
              "properties": {
                "sourceId": {
                  "type": "string"
                },
                "url": {
                  "type": "string"
                },
                "status": {
                  "enum": [
                    "current",
                    "stale",
                    "unavailable",
                    "refused",
                    "incomplete"
                  ]
                },
                "observedAt": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "sourceDate": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "digest": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "reason": {
                  "enum": [
                    "consent-revoked",
                    "consent-unverified",
                    "consent-expired",
                    "consent-not-commerce",
                    "observation-missing",
                    "observation-url-mismatch",
                    "observation-time-invalid",
                    "observation-from-future",
                    "observation-stale",
                    "source-timeout",
                    "source-network-error",
                    "source-binding-unavailable",
                    "source-redirect",
                    "source-payment-required",
                    "source-http-error",
                    "source-unavailable",
                    "source-byte-limit",
                    "source-incomplete",
                    "source-content-type",
                    "source-json-invalid",
                    "source-payload-invalid",
                    "observation-digest-invalid",
                    null
                  ]
                }
              }
            }
          },
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "sourceId",
                "id",
                "publisher",
                "seller",
                "title",
                "description",
                "url",
                "protocol",
                "status",
                "edition",
                "price",
                "qualification",
                "original"
              ],
              "properties": {
                "sourceId": {
                  "type": "string"
                },
                "id": {
                  "type": "string"
                },
                "publisher": {
                  "type": "string"
                },
                "seller": {
                  "type": [
                    "object",
                    "string",
                    "null"
                  ]
                },
                "title": {
                  "type": "string"
                },
                "description": {
                  "type": "string"
                },
                "url": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "protocol": {
                  "enum": [
                    "shop",
                    "x402"
                  ]
                },
                "status": {
                  "type": "string"
                },
                "edition": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "price": {
                  "type": [
                    "object",
                    "null"
                  ],
                  "additionalProperties": false,
                  "required": [
                    "amount",
                    "asset",
                    "network",
                    "unit"
                  ],
                  "properties": {
                    "amount": {
                      "type": "string",
                      "pattern": "^(0|[1-9][0-9]*)$"
                    },
                    "asset": {
                      "type": "string"
                    },
                    "network": {
                      "type": [
                        "string",
                        "null"
                      ]
                    },
                    "unit": {
                      "type": "string"
                    }
                  }
                },
                "qualification": {
                  "const": "source-listed"
                },
                "original": {
                  "type": "object"
                }
              }
            }
          },
          "comparison": {
            "type": [
              "object",
              "null"
            ],
            "additionalProperties": false,
            "required": [
              "items",
              "priceComparable",
              "reason"
            ],
            "properties": {
              "items": {
                "type": "array",
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "sourceId",
                    "id",
                    "publisher",
                    "seller",
                    "title",
                    "description",
                    "url",
                    "protocol",
                    "status",
                    "edition",
                    "price",
                    "qualification",
                    "original"
                  ],
                  "properties": {
                    "sourceId": {
                      "type": "string"
                    },
                    "id": {
                      "type": "string"
                    },
                    "publisher": {
                      "type": "string"
                    },
                    "seller": {
                      "type": [
                        "object",
                        "string",
                        "null"
                      ]
                    },
                    "title": {
                      "type": "string"
                    },
                    "description": {
                      "type": "string"
                    },
                    "url": {
                      "type": [
                        "string",
                        "null"
                      ]
                    },
                    "protocol": {
                      "enum": [
                        "shop",
                        "x402"
                      ]
                    },
                    "status": {
                      "type": "string"
                    },
                    "edition": {
                      "type": [
                        "string",
                        "null"
                      ]
                    },
                    "price": {
                      "type": [
                        "object",
                        "null"
                      ],
                      "additionalProperties": false,
                      "required": [
                        "amount",
                        "asset",
                        "network",
                        "unit"
                      ],
                      "properties": {
                        "amount": {
                          "type": "string",
                          "pattern": "^(0|[1-9][0-9]*)$"
                        },
                        "asset": {
                          "type": "string"
                        },
                        "network": {
                          "type": [
                            "string",
                            "null"
                          ]
                        },
                        "unit": {
                          "type": "string"
                        }
                      }
                    },
                    "qualification": {
                      "const": "source-listed"
                    },
                    "original": {
                      "type": "object"
                    }
                  }
                }
              },
              "priceComparable": {
                "type": "boolean"
              },
              "reason": {
                "enum": [
                  "selected-offer-not-found",
                  "insufficient-selection",
                  "fixed-price-unavailable",
                  "asset-mismatch",
                  "network-mismatch",
                  "unit-mismatch",
                  "outcome-identity-unavailable",
                  "outcome-mismatch",
                  "fixed-price-comparable"
                ]
              }
            }
          },
          "venues": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "sourceId",
                "publisher",
                "url",
                "observedAt",
                "sourceDate",
                "digest",
                "kind",
                "metrics",
                "limitations"
              ],
              "properties": {
                "sourceId": {
                  "type": "string"
                },
                "publisher": {
                  "type": "string"
                },
                "url": {
                  "type": "string"
                },
                "observedAt": {
                  "type": "string"
                },
                "sourceDate": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "digest": {
                  "type": "string"
                },
                "kind": {
                  "enum": [
                    "index-health",
                    "mpp-catalog",
                    "bazaar-summary"
                  ]
                },
                "metrics": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "name",
                      "value",
                      "unit",
                      "population",
                      "method",
                      "sourceField"
                    ],
                    "properties": {
                      "name": {
                        "type": "string"
                      },
                      "value": {
                        "type": [
                          "number",
                          "object",
                          "null"
                        ]
                      },
                      "unit": {
                        "type": "string"
                      },
                      "population": {
                        "type": "string"
                      },
                      "method": {
                        "type": "string"
                      },
                      "sourceField": {
                        "type": "string"
                      }
                    }
                  }
                },
                "limitations": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                }
              }
            }
          },
          "limitations": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      }
    }
  ],
  "examples": [
    {
      "name": "no-source-is-no-invented-listing",
      "operation": "project-commerce-navigation",
      "input": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "now": "2026-10-20T23:00:00.000Z",
        "query": {
          "q": "",
          "source": null,
          "selected": []
        },
        "sources": [],
        "observations": []
      },
      "output": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "coverage": [],
        "items": [],
        "comparison": null,
        "venues": [],
        "limitations": [
          "Coverage is limited to the configured original sources.",
          "Independent external Shop consent, qualified selection and completed commerce are not established by this projection."
        ]
      }
    },
    {
      "name": "market-no-source-is-no-invented-activity",
      "operation": "project-commerce-navigation",
      "input": {
        "role": "market",
        "origin": "https://market.561.group",
        "revision": "fixture-revision",
        "now": "2026-10-20T23:00:00.000Z",
        "query": {
          "q": "",
          "source": null,
          "selected": []
        },
        "sources": [],
        "observations": []
      },
      "output": {
        "role": "market",
        "origin": "https://market.561.group",
        "revision": "fixture-revision",
        "coverage": [],
        "items": [],
        "comparison": null,
        "venues": [],
        "limitations": [
          "Coverage is limited to the configured original sources.",
          "Independent external Shop consent, qualified selection and completed commerce are not established by this projection."
        ]
      }
    },
    {
      "name": "source-coming-soon-preserved-not-bought",
      "operation": "project-commerce-navigation",
      "input": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "now": "2026-10-20T23:00:00.000Z",
        "query": {
          "q": "",
          "source": null,
          "selected": []
        },
        "sources": [
          {
            "id": "book-shop",
            "kind": "shop-catalog",
            "url": "https://shop.561.group/catalog.json",
            "publisher": "House Publisher",
            "consent": {
              "status": "house-publication",
              "evidence": "https://owner.example/authorized-projection",
              "revision": "fixture-grant",
              "expiresAt": null
            },
            "maxAgeSeconds": 300,
            "maxBytes": 1048576,
            "timeoutMs": 8000
          }
        ],
        "observations": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.561.group/catalog.json",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "status": "ok",
            "body": {
              "merchant": {
                "name": "House Merchant"
              },
              "offerings": [
                {
                  "id": "book",
                  "title": "Original Book",
                  "blurb": "A book.",
                  "status": "coming-soon",
                  "priceCents": 900,
                  "currency": "usd",
                  "book": {
                    "edition": {
                      "digest": "ni:///sha-256;fixture-edition"
                    }
                  }
                }
              ]
            },
            "error": null
          }
        ]
      },
      "output": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "coverage": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.561.group/catalog.json",
            "status": "current",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "reason": null
          }
        ],
        "items": [
          {
            "sourceId": "book-shop",
            "id": "book",
            "publisher": "House Publisher",
            "seller": {
              "name": "House Merchant"
            },
            "title": "Original Book",
            "description": "A book.",
            "url": "https://shop.561.group/goods/book",
            "protocol": "shop",
            "status": "coming-soon",
            "edition": "ni:///sha-256;fixture-edition",
            "price": {
              "amount": "900",
              "asset": "usd",
              "network": null,
              "unit": "minor-currency-per-edition"
            },
            "qualification": "source-listed",
            "original": {
              "id": "book",
              "title": "Original Book",
              "blurb": "A book.",
              "status": "coming-soon",
              "priceCents": 900,
              "currency": "usd",
              "book": {
                "edition": {
                  "digest": "ni:///sha-256;fixture-edition"
                }
              }
            }
          }
        ],
        "comparison": null,
        "venues": [],
        "limitations": [
          "Coverage is limited to the configured original sources.",
          "Independent external Shop consent, qualified selection and completed commerce are not established by this projection."
        ]
      }
    },
    {
      "name": "revoked-source-refuses-original-feed",
      "operation": "project-commerce-navigation",
      "input": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "now": "2026-10-20T23:00:00.000Z",
        "query": {
          "q": "",
          "source": null,
          "selected": []
        },
        "sources": [
          {
            "id": "book-shop",
            "kind": "shop-catalog",
            "url": "https://shop.561.group/catalog.json",
            "publisher": "House Publisher",
            "consent": {
              "status": "revoked",
              "evidence": "https://owner.example/authorized-projection",
              "revision": "fixture-grant",
              "expiresAt": null
            },
            "maxAgeSeconds": 300,
            "maxBytes": 1048576,
            "timeoutMs": 8000
          }
        ],
        "observations": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.561.group/catalog.json",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "status": "ok",
            "body": {
              "merchant": {
                "name": "House Merchant"
              },
              "offerings": [
                {
                  "id": "book",
                  "title": "Original Book",
                  "blurb": "A book.",
                  "status": "coming-soon",
                  "priceCents": 900,
                  "currency": "usd",
                  "book": {
                    "edition": {
                      "digest": "ni:///sha-256;fixture-edition"
                    }
                  }
                }
              ]
            },
            "error": null
          }
        ]
      },
      "output": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "coverage": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.561.group/catalog.json",
            "status": "refused",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "reason": "consent-revoked"
          }
        ],
        "items": [],
        "comparison": null,
        "venues": [],
        "limitations": [
          "Coverage is limited to the configured original sources.",
          "Independent external Shop consent, qualified selection and completed commerce are not established by this projection."
        ]
      }
    },
    {
      "name": "outage-is-not-zero-demand",
      "operation": "project-commerce-navigation",
      "input": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "now": "2026-10-20T23:00:00.000Z",
        "query": {
          "q": "",
          "source": null,
          "selected": []
        },
        "sources": [
          {
            "id": "book-shop",
            "kind": "shop-catalog",
            "url": "https://shop.561.group/catalog.json",
            "publisher": "House Publisher",
            "consent": {
              "status": "house-publication",
              "evidence": "https://owner.example/authorized-projection",
              "revision": "fixture-grant",
              "expiresAt": null
            },
            "maxAgeSeconds": 300,
            "maxBytes": 1048576,
            "timeoutMs": 8000
          }
        ],
        "observations": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.561.group/catalog.json",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": null,
            "status": "unavailable",
            "body": null,
            "error": "source-timeout"
          }
        ]
      },
      "output": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "coverage": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.561.group/catalog.json",
            "status": "unavailable",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": null,
            "reason": "source-timeout"
          }
        ],
        "items": [],
        "comparison": null,
        "venues": [],
        "limitations": [
          "Coverage is limited to the configured original sources.",
          "Independent external Shop consent, qualified selection and completed commerce are not established by this projection."
        ]
      }
    },
    {
      "name": "original-x402-offers-and-settlement-positive",
      "operation": "project-commerce-navigation",
      "input": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "now": "2026-10-20T23:00:00.000Z",
        "query": {
          "q": "",
          "source": null,
          "selected": []
        },
        "sources": [
          {
            "id": "house-x402",
            "kind": "x402-catalog",
            "url": "https://market.561.group/v1/catalog",
            "publisher": "House Publisher",
            "consent": {
              "status": "house-publication",
              "evidence": "https://owner.example/authorized-projection",
              "revision": "fixture-grant",
              "expiresAt": null
            },
            "maxAgeSeconds": 300,
            "maxBytes": 1048576,
            "timeoutMs": 8000
          }
        ],
        "observations": [
          {
            "sourceId": "house-x402",
            "url": "https://market.561.group/v1/catalog",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "status": "ok",
            "body": {
              "recordType": "561-group.x402-market-catalog",
              "settlement": {
                "protocol": "x402",
                "scheme": "exact",
                "network": "eip155:8453",
                "asset": "original-usdc-asset"
              },
              "offers": [
                {
                  "sku": "original-sku",
                  "name": "Original Release",
                  "description": "Accepted release.",
                  "method": "GET",
                  "url": "https://market.561.group/v1/publications/original",
                  "listed": true,
                  "amountAtomic": "9000000",
                  "seller": null,
                  "compute": {
                    "package": "@owner/releases",
                    "export": "readPaidRelease",
                    "configuration": {
                      "release": "ni:///sha-256;original-release",
                      "available": true
                    }
                  }
                }
              ]
            },
            "error": null
          }
        ]
      },
      "output": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "coverage": [
          {
            "sourceId": "house-x402",
            "url": "https://market.561.group/v1/catalog",
            "status": "current",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "reason": null
          }
        ],
        "items": [
          {
            "sourceId": "house-x402",
            "id": "original-sku",
            "publisher": "House Publisher",
            "seller": null,
            "title": "Original Release",
            "description": "Accepted release.",
            "url": "https://market.561.group/v1/publications/original",
            "protocol": "x402",
            "status": "live",
            "edition": "ni:///sha-256;original-release",
            "price": {
              "amount": "9000000",
              "asset": "original-usdc-asset",
              "network": "eip155:8453",
              "unit": "atomic-asset-per-original-operation"
            },
            "qualification": "source-listed",
            "original": {
              "sku": "original-sku",
              "name": "Original Release",
              "description": "Accepted release.",
              "method": "GET",
              "url": "https://market.561.group/v1/publications/original",
              "listed": true,
              "amountAtomic": "9000000",
              "seller": null,
              "compute": {
                "package": "@owner/releases",
                "export": "readPaidRelease",
                "configuration": {
                  "release": "ni:///sha-256;original-release",
                  "available": true
                }
              }
            }
          }
        ],
        "comparison": null,
        "venues": [],
        "limitations": [
          "Coverage is limited to the configured original sources.",
          "Independent external Shop consent, qualified selection and completed commerce are not established by this projection."
        ]
      }
    },
    {
      "name": "stale-observation",
      "operation": "project-commerce-navigation",
      "input": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "now": "2026-10-20T23:00:00.000Z",
        "query": {
          "q": "",
          "source": null,
          "selected": []
        },
        "sources": [
          {
            "id": "book-shop",
            "kind": "shop-catalog",
            "url": "https://shop.561.group/catalog.json",
            "publisher": "House Publisher",
            "consent": {
              "status": "house-publication",
              "evidence": "https://owner.example/authorized-projection",
              "revision": "fixture-grant",
              "expiresAt": null
            },
            "maxAgeSeconds": 300,
            "maxBytes": 1048576,
            "timeoutMs": 8000
          }
        ],
        "observations": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.561.group/catalog.json",
            "observedAt": "2026-10-20T22:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "status": "ok",
            "body": {
              "merchant": {
                "name": "House Merchant"
              },
              "offerings": [
                {
                  "id": "book",
                  "title": "Original Book",
                  "blurb": "A book.",
                  "status": "coming-soon",
                  "priceCents": 900,
                  "currency": "usd",
                  "book": {
                    "edition": {
                      "digest": "ni:///sha-256;fixture-edition"
                    }
                  }
                }
              ]
            },
            "error": null
          }
        ]
      },
      "output": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "coverage": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.561.group/catalog.json",
            "status": "stale",
            "observedAt": "2026-10-20T22:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "reason": "observation-stale"
          }
        ],
        "items": [],
        "comparison": null,
        "venues": [],
        "limitations": [
          "Coverage is limited to the configured original sources.",
          "Independent external Shop consent, qualified selection and completed commerce are not established by this projection."
        ]
      }
    },
    {
      "name": "future-observation",
      "operation": "project-commerce-navigation",
      "input": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "now": "2026-10-20T23:00:00.000Z",
        "query": {
          "q": "",
          "source": null,
          "selected": []
        },
        "sources": [
          {
            "id": "book-shop",
            "kind": "shop-catalog",
            "url": "https://shop.561.group/catalog.json",
            "publisher": "House Publisher",
            "consent": {
              "status": "house-publication",
              "evidence": "https://owner.example/authorized-projection",
              "revision": "fixture-grant",
              "expiresAt": null
            },
            "maxAgeSeconds": 300,
            "maxBytes": 1048576,
            "timeoutMs": 8000
          }
        ],
        "observations": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.561.group/catalog.json",
            "observedAt": "2026-10-21T00:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "status": "ok",
            "body": {
              "merchant": {
                "name": "House Merchant"
              },
              "offerings": [
                {
                  "id": "book",
                  "title": "Original Book",
                  "blurb": "A book.",
                  "status": "coming-soon",
                  "priceCents": 900,
                  "currency": "usd",
                  "book": {
                    "edition": {
                      "digest": "ni:///sha-256;fixture-edition"
                    }
                  }
                }
              ]
            },
            "error": null
          }
        ]
      },
      "output": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "coverage": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.561.group/catalog.json",
            "status": "refused",
            "observedAt": "2026-10-21T00:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "reason": "observation-from-future"
          }
        ],
        "items": [],
        "comparison": null,
        "venues": [],
        "limitations": [
          "Coverage is limited to the configured original sources.",
          "Independent external Shop consent, qualified selection and completed commerce are not established by this projection."
        ]
      }
    },
    {
      "name": "url-mismatched-observation",
      "operation": "project-commerce-navigation",
      "input": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "now": "2026-10-20T23:00:00.000Z",
        "query": {
          "q": "",
          "source": null,
          "selected": []
        },
        "sources": [
          {
            "id": "book-shop",
            "kind": "shop-catalog",
            "url": "https://shop.561.group/catalog.json",
            "publisher": "House Publisher",
            "consent": {
              "status": "house-publication",
              "evidence": "https://owner.example/authorized-projection",
              "revision": "fixture-grant",
              "expiresAt": null
            },
            "maxAgeSeconds": 300,
            "maxBytes": 1048576,
            "timeoutMs": 8000
          }
        ],
        "observations": [
          {
            "sourceId": "book-shop",
            "url": "https://other.561.group/catalog.json",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "status": "ok",
            "body": {
              "merchant": {
                "name": "House Merchant"
              },
              "offerings": [
                {
                  "id": "book",
                  "title": "Original Book",
                  "blurb": "A book.",
                  "status": "coming-soon",
                  "priceCents": 900,
                  "currency": "usd",
                  "book": {
                    "edition": {
                      "digest": "ni:///sha-256;fixture-edition"
                    }
                  }
                }
              ]
            },
            "error": null
          }
        ]
      },
      "output": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "coverage": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.561.group/catalog.json",
            "status": "refused",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "reason": "observation-url-mismatch"
          }
        ],
        "items": [],
        "comparison": null,
        "venues": [],
        "limitations": [
          "Coverage is limited to the configured original sources.",
          "Independent external Shop consent, qualified selection and completed commerce are not established by this projection."
        ]
      }
    },
    {
      "name": "malformed-source-container",
      "operation": "project-commerce-navigation",
      "input": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "now": "2026-10-20T23:00:00.000Z",
        "query": {
          "q": "",
          "source": null,
          "selected": []
        },
        "sources": [
          {
            "id": "book-shop",
            "kind": "shop-catalog",
            "url": "https://shop.561.group/catalog.json",
            "publisher": "House Publisher",
            "consent": {
              "status": "house-publication",
              "evidence": "https://owner.example/authorized-projection",
              "revision": "fixture-grant",
              "expiresAt": null
            },
            "maxAgeSeconds": 300,
            "maxBytes": 1048576,
            "timeoutMs": 8000
          }
        ],
        "observations": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.561.group/catalog.json",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "status": "ok",
            "body": {
              "items": []
            },
            "error": null
          }
        ]
      },
      "output": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "coverage": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.561.group/catalog.json",
            "status": "refused",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "reason": "source-payload-invalid"
          }
        ],
        "items": [],
        "comparison": null,
        "venues": [],
        "limitations": [
          "Coverage is limited to the configured original sources.",
          "Independent external Shop consent, qualified selection and completed commerce are not established by this projection."
        ]
      }
    },
    {
      "name": "market-index-health-exact-metric-vocabulary",
      "operation": "project-commerce-navigation",
      "input": {
        "role": "market",
        "origin": "https://market.561.group",
        "revision": "fixture-revision",
        "now": "2026-10-20T23:00:00.000Z",
        "query": {
          "q": "",
          "source": null,
          "selected": []
        },
        "sources": [
          {
            "id": "health-index",
            "kind": "index-health",
            "url": "https://402index.io/api/v1/health",
            "publisher": "Index Publisher",
            "consent": {
              "status": "public-market-observation",
              "evidence": "https://owner.example/authorized-projection",
              "revision": "fixture-grant",
              "expiresAt": null
            },
            "maxAgeSeconds": 300,
            "maxBytes": 1048576,
            "timeoutMs": 8000
          }
        ],
        "observations": [
          {
            "sourceId": "health-index",
            "url": "https://402index.io/api/v1/health",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "status": "ok",
            "body": {
              "total_endpoints": 12,
              "distinct_services": 4,
              "distinct_providers": 3,
              "by_protocol": {
                "x402": {
                  "endpoints": 12
                }
              },
              "by_health": {
                "healthy": 9,
                "unknown": 3
              }
            },
            "error": null
          }
        ]
      },
      "output": {
        "role": "market",
        "origin": "https://market.561.group",
        "revision": "fixture-revision",
        "coverage": [
          {
            "sourceId": "health-index",
            "url": "https://402index.io/api/v1/health",
            "status": "current",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "reason": null
          }
        ],
        "items": [],
        "comparison": null,
        "venues": [
          {
            "sourceId": "health-index",
            "publisher": "Index Publisher",
            "url": "https://402index.io/api/v1/health",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "kind": "index-health",
            "metrics": [
              {
                "name": "total_endpoints",
                "value": 12,
                "unit": "endpoint",
                "population": "publisher-index",
                "method": "source-reported",
                "sourceField": "/total_endpoints"
              },
              {
                "name": "distinct_services",
                "value": 4,
                "unit": "service",
                "population": "publisher-index",
                "method": "source-reported",
                "sourceField": "/distinct_services"
              },
              {
                "name": "distinct_providers",
                "value": 3,
                "unit": "publisher-defined-provider",
                "population": "publisher-index",
                "method": "source-reported",
                "sourceField": "/distinct_providers"
              },
              {
                "name": "by_protocol",
                "value": {
                  "x402": {
                    "endpoints": 12
                  }
                },
                "unit": "publisher-count-breakdown",
                "population": "publisher-index",
                "method": "source-reported",
                "sourceField": "/by_protocol"
              },
              {
                "name": "by_health",
                "value": {
                  "healthy": 9,
                  "unknown": 3
                },
                "unit": "publisher-count-breakdown",
                "population": "publisher-index",
                "method": "source-reported",
                "sourceField": "/by_health"
              },
              {
                "name": "signed_payments",
                "value": null,
                "unit": "not-established",
                "population": "not-established",
                "method": "not-reported",
                "sourceField": ""
              },
              {
                "name": "revenue",
                "value": null,
                "unit": "not-established",
                "population": "not-established",
                "method": "not-reported",
                "sourceField": ""
              },
              {
                "name": "useful_deliveries",
                "value": null,
                "unit": "not-established",
                "population": "not-established",
                "method": "not-reported",
                "sourceField": ""
              }
            ],
            "limitations": [
              "Publisher-reported counts may overlap and do not establish independent actors or completed commerce.",
              "Revenue, signed payments and useful deliveries are not reported by this source."
            ]
          }
        ],
        "limitations": [
          "Coverage is limited to the configured original sources.",
          "Independent external Shop consent, qualified selection and completed commerce are not established by this projection."
        ]
      }
    },
    {
      "name": "same-declared-outcome-fixed-quotes-comparable",
      "operation": "project-commerce-navigation",
      "input": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "now": "2026-10-20T23:00:00.000Z",
        "query": {
          "q": "",
          "source": null,
          "selected": [
            {
              "sourceId": "house-x402",
              "id": "original-sku"
            },
            {
              "sourceId": "house-x402",
              "id": "second-original-sku"
            }
          ]
        },
        "sources": [
          {
            "id": "house-x402",
            "kind": "x402-catalog",
            "url": "https://market.561.group/v1/catalog",
            "publisher": "House Publisher",
            "consent": {
              "status": "house-publication",
              "evidence": "https://owner.example/authorized-projection",
              "revision": "fixture-grant",
              "expiresAt": null
            },
            "maxAgeSeconds": 300,
            "maxBytes": 1048576,
            "timeoutMs": 8000
          }
        ],
        "observations": [
          {
            "sourceId": "house-x402",
            "url": "https://market.561.group/v1/catalog",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "status": "ok",
            "body": {
              "recordType": "561-group.x402-market-catalog",
              "settlement": {
                "protocol": "x402",
                "scheme": "exact",
                "network": "eip155:8453",
                "asset": "original-usdc-asset"
              },
              "offers": [
                {
                  "sku": "original-sku",
                  "name": "Original Release",
                  "description": "Accepted release.",
                  "method": "GET",
                  "url": "https://market.561.group/v1/publications/original",
                  "listed": true,
                  "amountAtomic": "9000000",
                  "seller": null,
                  "compute": {
                    "package": "@owner/releases",
                    "export": "readPaidRelease",
                    "configuration": {
                      "release": "ni:///sha-256;original-release",
                      "available": true
                    }
                  }
                },
                {
                  "sku": "second-original-sku",
                  "name": "Other Declared Release",
                  "description": "Accepted release.",
                  "method": "GET",
                  "url": "https://market.561.group/v1/publications/other",
                  "listed": true,
                  "amountAtomic": "9000000",
                  "seller": null,
                  "compute": {
                    "package": "@owner/releases",
                    "export": "readPaidRelease",
                    "configuration": {
                      "release": "ni:///sha-256;original-release",
                      "available": true
                    }
                  }
                }
              ]
            },
            "error": null
          }
        ]
      },
      "output": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "coverage": [
          {
            "sourceId": "house-x402",
            "url": "https://market.561.group/v1/catalog",
            "status": "current",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "reason": null
          }
        ],
        "items": [
          {
            "sourceId": "house-x402",
            "id": "original-sku",
            "publisher": "House Publisher",
            "seller": null,
            "title": "Original Release",
            "description": "Accepted release.",
            "url": "https://market.561.group/v1/publications/original",
            "protocol": "x402",
            "status": "live",
            "edition": "ni:///sha-256;original-release",
            "price": {
              "amount": "9000000",
              "asset": "original-usdc-asset",
              "network": "eip155:8453",
              "unit": "atomic-asset-per-original-operation"
            },
            "qualification": "source-listed",
            "original": {
              "sku": "original-sku",
              "name": "Original Release",
              "description": "Accepted release.",
              "method": "GET",
              "url": "https://market.561.group/v1/publications/original",
              "listed": true,
              "amountAtomic": "9000000",
              "seller": null,
              "compute": {
                "package": "@owner/releases",
                "export": "readPaidRelease",
                "configuration": {
                  "release": "ni:///sha-256;original-release",
                  "available": true
                }
              }
            }
          },
          {
            "sourceId": "house-x402",
            "id": "second-original-sku",
            "publisher": "House Publisher",
            "seller": null,
            "title": "Other Declared Release",
            "description": "Accepted release.",
            "url": "https://market.561.group/v1/publications/other",
            "protocol": "x402",
            "status": "live",
            "edition": "ni:///sha-256;original-release",
            "price": {
              "amount": "9000000",
              "asset": "original-usdc-asset",
              "network": "eip155:8453",
              "unit": "atomic-asset-per-original-operation"
            },
            "qualification": "source-listed",
            "original": {
              "sku": "second-original-sku",
              "name": "Other Declared Release",
              "description": "Accepted release.",
              "method": "GET",
              "url": "https://market.561.group/v1/publications/other",
              "listed": true,
              "amountAtomic": "9000000",
              "seller": null,
              "compute": {
                "package": "@owner/releases",
                "export": "readPaidRelease",
                "configuration": {
                  "release": "ni:///sha-256;original-release",
                  "available": true
                }
              }
            }
          }
        ],
        "comparison": {
          "items": [
            {
              "sourceId": "house-x402",
              "id": "original-sku",
              "publisher": "House Publisher",
              "seller": null,
              "title": "Original Release",
              "description": "Accepted release.",
              "url": "https://market.561.group/v1/publications/original",
              "protocol": "x402",
              "status": "live",
              "edition": "ni:///sha-256;original-release",
              "price": {
                "amount": "9000000",
                "asset": "original-usdc-asset",
                "network": "eip155:8453",
                "unit": "atomic-asset-per-original-operation"
              },
              "qualification": "source-listed",
              "original": {
                "sku": "original-sku",
                "name": "Original Release",
                "description": "Accepted release.",
                "method": "GET",
                "url": "https://market.561.group/v1/publications/original",
                "listed": true,
                "amountAtomic": "9000000",
                "seller": null,
                "compute": {
                  "package": "@owner/releases",
                  "export": "readPaidRelease",
                  "configuration": {
                    "release": "ni:///sha-256;original-release",
                    "available": true
                  }
                }
              }
            },
            {
              "sourceId": "house-x402",
              "id": "second-original-sku",
              "publisher": "House Publisher",
              "seller": null,
              "title": "Other Declared Release",
              "description": "Accepted release.",
              "url": "https://market.561.group/v1/publications/other",
              "protocol": "x402",
              "status": "live",
              "edition": "ni:///sha-256;original-release",
              "price": {
                "amount": "9000000",
                "asset": "original-usdc-asset",
                "network": "eip155:8453",
                "unit": "atomic-asset-per-original-operation"
              },
              "qualification": "source-listed",
              "original": {
                "sku": "second-original-sku",
                "name": "Other Declared Release",
                "description": "Accepted release.",
                "method": "GET",
                "url": "https://market.561.group/v1/publications/other",
                "listed": true,
                "amountAtomic": "9000000",
                "seller": null,
                "compute": {
                  "package": "@owner/releases",
                  "export": "readPaidRelease",
                  "configuration": {
                    "release": "ni:///sha-256;original-release",
                    "available": true
                  }
                }
              }
            }
          ],
          "priceComparable": true,
          "reason": "fixed-price-comparable"
        },
        "venues": [],
        "limitations": [
          "Coverage is limited to the configured original sources.",
          "Independent external Shop consent, qualified selection and completed commerce are not established by this projection."
        ]
      }
    },
    {
      "name": "same-price-different-declared-outcome-not-comparable",
      "operation": "project-commerce-navigation",
      "input": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "now": "2026-10-20T23:00:00.000Z",
        "query": {
          "q": "",
          "source": null,
          "selected": [
            {
              "sourceId": "house-x402",
              "id": "original-sku"
            },
            {
              "sourceId": "house-x402",
              "id": "second-original-sku"
            }
          ]
        },
        "sources": [
          {
            "id": "house-x402",
            "kind": "x402-catalog",
            "url": "https://market.561.group/v1/catalog",
            "publisher": "House Publisher",
            "consent": {
              "status": "house-publication",
              "evidence": "https://owner.example/authorized-projection",
              "revision": "fixture-grant",
              "expiresAt": null
            },
            "maxAgeSeconds": 300,
            "maxBytes": 1048576,
            "timeoutMs": 8000
          }
        ],
        "observations": [
          {
            "sourceId": "house-x402",
            "url": "https://market.561.group/v1/catalog",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "status": "ok",
            "body": {
              "recordType": "561-group.x402-market-catalog",
              "settlement": {
                "protocol": "x402",
                "scheme": "exact",
                "network": "eip155:8453",
                "asset": "original-usdc-asset"
              },
              "offers": [
                {
                  "sku": "original-sku",
                  "name": "Original Release",
                  "description": "Accepted release.",
                  "method": "GET",
                  "url": "https://market.561.group/v1/publications/original",
                  "listed": true,
                  "amountAtomic": "9000000",
                  "seller": null,
                  "compute": {
                    "package": "@owner/releases",
                    "export": "readPaidRelease",
                    "configuration": {
                      "release": "ni:///sha-256;original-release",
                      "available": true
                    }
                  }
                },
                {
                  "sku": "second-original-sku",
                  "name": "Other Declared Release",
                  "description": "Accepted release.",
                  "method": "GET",
                  "url": "https://market.561.group/v1/publications/other",
                  "listed": true,
                  "amountAtomic": "9000000",
                  "seller": null,
                  "compute": {
                    "package": "@owner/releases",
                    "export": "readPaidRelease",
                    "configuration": {
                      "release": "ni:///sha-256;different-original-release",
                      "available": true
                    }
                  }
                }
              ]
            },
            "error": null
          }
        ]
      },
      "output": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "coverage": [
          {
            "sourceId": "house-x402",
            "url": "https://market.561.group/v1/catalog",
            "status": "current",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "reason": null
          }
        ],
        "items": [
          {
            "sourceId": "house-x402",
            "id": "original-sku",
            "publisher": "House Publisher",
            "seller": null,
            "title": "Original Release",
            "description": "Accepted release.",
            "url": "https://market.561.group/v1/publications/original",
            "protocol": "x402",
            "status": "live",
            "edition": "ni:///sha-256;original-release",
            "price": {
              "amount": "9000000",
              "asset": "original-usdc-asset",
              "network": "eip155:8453",
              "unit": "atomic-asset-per-original-operation"
            },
            "qualification": "source-listed",
            "original": {
              "sku": "original-sku",
              "name": "Original Release",
              "description": "Accepted release.",
              "method": "GET",
              "url": "https://market.561.group/v1/publications/original",
              "listed": true,
              "amountAtomic": "9000000",
              "seller": null,
              "compute": {
                "package": "@owner/releases",
                "export": "readPaidRelease",
                "configuration": {
                  "release": "ni:///sha-256;original-release",
                  "available": true
                }
              }
            }
          },
          {
            "sourceId": "house-x402",
            "id": "second-original-sku",
            "publisher": "House Publisher",
            "seller": null,
            "title": "Other Declared Release",
            "description": "Accepted release.",
            "url": "https://market.561.group/v1/publications/other",
            "protocol": "x402",
            "status": "live",
            "edition": "ni:///sha-256;different-original-release",
            "price": {
              "amount": "9000000",
              "asset": "original-usdc-asset",
              "network": "eip155:8453",
              "unit": "atomic-asset-per-original-operation"
            },
            "qualification": "source-listed",
            "original": {
              "sku": "second-original-sku",
              "name": "Other Declared Release",
              "description": "Accepted release.",
              "method": "GET",
              "url": "https://market.561.group/v1/publications/other",
              "listed": true,
              "amountAtomic": "9000000",
              "seller": null,
              "compute": {
                "package": "@owner/releases",
                "export": "readPaidRelease",
                "configuration": {
                  "release": "ni:///sha-256;different-original-release",
                  "available": true
                }
              }
            }
          }
        ],
        "comparison": {
          "items": [
            {
              "sourceId": "house-x402",
              "id": "original-sku",
              "publisher": "House Publisher",
              "seller": null,
              "title": "Original Release",
              "description": "Accepted release.",
              "url": "https://market.561.group/v1/publications/original",
              "protocol": "x402",
              "status": "live",
              "edition": "ni:///sha-256;original-release",
              "price": {
                "amount": "9000000",
                "asset": "original-usdc-asset",
                "network": "eip155:8453",
                "unit": "atomic-asset-per-original-operation"
              },
              "qualification": "source-listed",
              "original": {
                "sku": "original-sku",
                "name": "Original Release",
                "description": "Accepted release.",
                "method": "GET",
                "url": "https://market.561.group/v1/publications/original",
                "listed": true,
                "amountAtomic": "9000000",
                "seller": null,
                "compute": {
                  "package": "@owner/releases",
                  "export": "readPaidRelease",
                  "configuration": {
                    "release": "ni:///sha-256;original-release",
                    "available": true
                  }
                }
              }
            },
            {
              "sourceId": "house-x402",
              "id": "second-original-sku",
              "publisher": "House Publisher",
              "seller": null,
              "title": "Other Declared Release",
              "description": "Accepted release.",
              "url": "https://market.561.group/v1/publications/other",
              "protocol": "x402",
              "status": "live",
              "edition": "ni:///sha-256;different-original-release",
              "price": {
                "amount": "9000000",
                "asset": "original-usdc-asset",
                "network": "eip155:8453",
                "unit": "atomic-asset-per-original-operation"
              },
              "qualification": "source-listed",
              "original": {
                "sku": "second-original-sku",
                "name": "Other Declared Release",
                "description": "Accepted release.",
                "method": "GET",
                "url": "https://market.561.group/v1/publications/other",
                "listed": true,
                "amountAtomic": "9000000",
                "seller": null,
                "compute": {
                  "package": "@owner/releases",
                  "export": "readPaidRelease",
                  "configuration": {
                    "release": "ni:///sha-256;different-original-release",
                    "available": true
                  }
                }
              }
            }
          ],
          "priceComparable": false,
          "reason": "outcome-mismatch"
        },
        "venues": [],
        "limitations": [
          "Coverage is limited to the configured original sources.",
          "Independent external Shop consent, qualified selection and completed commerce are not established by this projection."
        ]
      }
    },
    {
      "name": "special-use-action-is-inert-original-evidence",
      "operation": "project-commerce-navigation",
      "input": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "now": "2026-10-20T23:00:00.000Z",
        "query": {
          "q": "",
          "source": null,
          "selected": []
        },
        "sources": [
          {
            "id": "house-x402",
            "kind": "x402-catalog",
            "url": "https://market.561.group/v1/catalog",
            "publisher": "House Publisher",
            "consent": {
              "status": "house-publication",
              "evidence": "https://owner.example/authorized-projection",
              "revision": "fixture-grant",
              "expiresAt": null
            },
            "maxAgeSeconds": 300,
            "maxBytes": 1048576,
            "timeoutMs": 8000
          }
        ],
        "observations": [
          {
            "sourceId": "house-x402",
            "url": "https://market.561.group/v1/catalog",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "status": "ok",
            "body": {
              "recordType": "561-group.x402-market-catalog",
              "settlement": {
                "protocol": "x402",
                "scheme": "exact",
                "network": "eip155:8453",
                "asset": "original-usdc-asset"
              },
              "offers": [
                {
                  "sku": "original-sku",
                  "name": "Original Release",
                  "description": "Accepted release.",
                  "method": "GET",
                  "url": "https://merchant.example/v1/publications/original",
                  "listed": true,
                  "amountAtomic": "9000000",
                  "seller": null,
                  "compute": {
                    "package": "@owner/releases",
                    "export": "readPaidRelease",
                    "configuration": {
                      "release": "ni:///sha-256;original-release",
                      "available": true
                    }
                  }
                }
              ]
            },
            "error": null
          }
        ]
      },
      "output": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "coverage": [
          {
            "sourceId": "house-x402",
            "url": "https://market.561.group/v1/catalog",
            "status": "current",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "reason": null
          }
        ],
        "items": [
          {
            "sourceId": "house-x402",
            "id": "original-sku",
            "publisher": "House Publisher",
            "seller": null,
            "title": "Original Release",
            "description": "Accepted release.",
            "url": null,
            "protocol": "x402",
            "status": "live",
            "edition": "ni:///sha-256;original-release",
            "price": {
              "amount": "9000000",
              "asset": "original-usdc-asset",
              "network": "eip155:8453",
              "unit": "atomic-asset-per-original-operation"
            },
            "qualification": "source-listed",
            "original": {
              "sku": "original-sku",
              "name": "Original Release",
              "description": "Accepted release.",
              "method": "GET",
              "url": "https://merchant.example/v1/publications/original",
              "listed": true,
              "amountAtomic": "9000000",
              "seller": null,
              "compute": {
                "package": "@owner/releases",
                "export": "readPaidRelease",
                "configuration": {
                  "release": "ni:///sha-256;original-release",
                  "available": true
                }
              }
            }
          }
        ],
        "comparison": null,
        "venues": [],
        "limitations": [
          "Coverage is limited to the configured original sources.",
          "Independent external Shop consent, qualified selection and completed commerce are not established by this projection."
        ]
      }
    },
    {
      "name": "empty-sources-with-selected-missing-reference",
      "operation": "project-commerce-navigation",
      "input": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "now": "2026-10-20T23:00:00.000Z",
        "query": {
          "q": "",
          "source": null,
          "selected": [
            {
              "sourceId": "missing",
              "id": "missing"
            }
          ]
        },
        "sources": [],
        "observations": []
      },
      "output": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "coverage": [],
        "items": [],
        "comparison": {
          "items": [],
          "priceComparable": false,
          "reason": "selected-offer-not-found"
        },
        "venues": [],
        "limitations": [
          "Coverage is limited to the configured original sources.",
          "Independent external Shop consent, qualified selection and completed commerce are not established by this projection."
        ]
      }
    },
    {
      "name": "partial-missing-selection-resolves-before-q-filter",
      "operation": "project-commerce-navigation",
      "input": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "now": "2026-10-20T23:00:00.000Z",
        "query": {
          "q": "no-title-matches-this",
          "source": null,
          "selected": [
            {
              "sourceId": "book-shop",
              "id": "book"
            },
            {
              "sourceId": "book-shop",
              "id": "missing-item"
            }
          ]
        },
        "sources": [
          {
            "id": "book-shop",
            "kind": "shop-catalog",
            "url": "https://shop.561.group/catalog.json",
            "publisher": "House Publisher",
            "consent": {
              "status": "house-publication",
              "evidence": "https://owner.example/authorized-projection",
              "revision": "fixture-grant",
              "expiresAt": null
            },
            "maxAgeSeconds": 300,
            "maxBytes": 1048576,
            "timeoutMs": 8000
          }
        ],
        "observations": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.561.group/catalog.json",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "status": "ok",
            "body": {
              "merchant": {
                "name": "House Merchant"
              },
              "offerings": [
                {
                  "id": "book",
                  "title": "Original Book",
                  "blurb": "A book.",
                  "status": "coming-soon",
                  "priceCents": 900,
                  "currency": "usd",
                  "book": {
                    "edition": {
                      "digest": "ni:///sha-256;fixture-edition"
                    }
                  }
                }
              ]
            },
            "error": null
          }
        ]
      },
      "output": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "coverage": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.561.group/catalog.json",
            "status": "current",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "reason": null
          }
        ],
        "items": [],
        "comparison": {
          "items": [
            {
              "sourceId": "book-shop",
              "id": "book",
              "publisher": "House Publisher",
              "seller": {
                "name": "House Merchant"
              },
              "title": "Original Book",
              "description": "A book.",
              "url": "https://shop.561.group/goods/book",
              "protocol": "shop",
              "status": "coming-soon",
              "edition": "ni:///sha-256;fixture-edition",
              "price": {
                "amount": "900",
                "asset": "usd",
                "network": null,
                "unit": "minor-currency-per-edition"
              },
              "qualification": "source-listed",
              "original": {
                "id": "book",
                "title": "Original Book",
                "blurb": "A book.",
                "status": "coming-soon",
                "priceCents": 900,
                "currency": "usd",
                "book": {
                  "edition": {
                    "digest": "ni:///sha-256;fixture-edition"
                  }
                }
              }
            }
          ],
          "priceComparable": false,
          "reason": "selected-offer-not-found"
        },
        "venues": [],
        "limitations": [
          "Coverage is limited to the configured original sources.",
          "Independent external Shop consent, qualified selection and completed commerce are not established by this projection."
        ]
      }
    },
    {
      "name": "unknown-selected-source-is-data-not-input-error",
      "operation": "project-commerce-navigation",
      "input": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "now": "2026-10-20T23:00:00.000Z",
        "query": {
          "q": "",
          "source": null,
          "selected": [
            {
              "sourceId": "unknown-source",
              "id": "book"
            }
          ]
        },
        "sources": [
          {
            "id": "book-shop",
            "kind": "shop-catalog",
            "url": "https://shop.561.group/catalog.json",
            "publisher": "House Publisher",
            "consent": {
              "status": "house-publication",
              "evidence": "https://owner.example/authorized-projection",
              "revision": "fixture-grant",
              "expiresAt": null
            },
            "maxAgeSeconds": 300,
            "maxBytes": 1048576,
            "timeoutMs": 8000
          }
        ],
        "observations": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.561.group/catalog.json",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "status": "ok",
            "body": {
              "merchant": {
                "name": "House Merchant"
              },
              "offerings": [
                {
                  "id": "book",
                  "title": "Original Book",
                  "blurb": "A book.",
                  "status": "coming-soon",
                  "priceCents": 900,
                  "currency": "usd",
                  "book": {
                    "edition": {
                      "digest": "ni:///sha-256;fixture-edition"
                    }
                  }
                }
              ]
            },
            "error": null
          }
        ]
      },
      "output": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "fixture-revision",
        "coverage": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.561.group/catalog.json",
            "status": "current",
            "observedAt": "2026-10-20T23:00:00.000Z",
            "sourceDate": null,
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "reason": null
          }
        ],
        "items": [
          {
            "sourceId": "book-shop",
            "id": "book",
            "publisher": "House Publisher",
            "seller": {
              "name": "House Merchant"
            },
            "title": "Original Book",
            "description": "A book.",
            "url": "https://shop.561.group/goods/book",
            "protocol": "shop",
            "status": "coming-soon",
            "edition": "ni:///sha-256;fixture-edition",
            "price": {
              "amount": "900",
              "asset": "usd",
              "network": null,
              "unit": "minor-currency-per-edition"
            },
            "qualification": "source-listed",
            "original": {
              "id": "book",
              "title": "Original Book",
              "blurb": "A book.",
              "status": "coming-soon",
              "priceCents": 900,
              "currency": "usd",
              "book": {
                "edition": {
                  "digest": "ni:///sha-256;fixture-edition"
                }
              }
            }
          }
        ],
        "comparison": {
          "items": [],
          "priceComparable": false,
          "reason": "selected-offer-not-found"
        },
        "venues": [],
        "limitations": [
          "Coverage is limited to the configured original sources.",
          "Independent external Shop consent, qualified selection and completed commerce are not established by this projection."
        ]
      }
    },
    {
      "name": "keyword-search-preserves-inert-original-and-unquoted-inspection",
      "operation": "project-commerce-navigation",
      "input": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "assay-4",
        "now": "2026-10-20T23:00:00Z",
        "query": {
          "q": "  NEEDLE  ",
          "source": "x",
          "selected": [
            {
              "sourceId": "x",
              "id": "one"
            }
          ]
        },
        "sources": [
          {
            "id": "x",
            "kind": "x402-catalog",
            "url": "https://market.561.group/v1/catalog",
            "publisher": "Publisher",
            "consent": {
              "status": "house-publication",
              "evidence": "grant:fixture",
              "revision": "grant-1",
              "expiresAt": null
            },
            "maxAgeSeconds": 300,
            "maxBytes": 1024,
            "timeoutMs": 1000
          }
        ],
        "observations": [
          {
            "sourceId": "x",
            "url": "https://market.561.group/v1/catalog",
            "observedAt": "2026-10-20T23:00:00Z",
            "sourceDate": "publisher edition seven",
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "status": "ok",
            "body": {
              "settlement": {
                "scheme": "exact",
                "asset": "asset",
                "network": "network"
              },
              "offers": [
                {
                  "sku": "one",
                  "name": "Original",
                  "method": "GET",
                  "url": "https://127.0.0.1/private",
                  "amountAtomic": "01",
                  "keywords": [
                    "Needle"
                  ],
                  "price": "$1"
                },
                {
                  "listed": false
                }
              ]
            },
            "error": null
          }
        ]
      },
      "output": {
        "role": "bazaar",
        "origin": "https://bazaar.561.group",
        "revision": "assay-4",
        "coverage": [
          {
            "sourceId": "x",
            "url": "https://market.561.group/v1/catalog",
            "status": "current",
            "observedAt": "2026-10-20T23:00:00Z",
            "sourceDate": "publisher edition seven",
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "reason": null
          }
        ],
        "items": [
          {
            "sourceId": "x",
            "id": "one",
            "publisher": "Publisher",
            "seller": null,
            "title": "Original",
            "description": "",
            "url": null,
            "protocol": "x402",
            "status": "live",
            "edition": null,
            "price": null,
            "qualification": "source-listed",
            "original": {
              "sku": "one",
              "name": "Original",
              "method": "GET",
              "url": "https://127.0.0.1/private",
              "amountAtomic": "01",
              "keywords": [
                "Needle"
              ],
              "price": "$1"
            }
          }
        ],
        "comparison": {
          "items": [
            {
              "sourceId": "x",
              "id": "one",
              "publisher": "Publisher",
              "seller": null,
              "title": "Original",
              "description": "",
              "url": null,
              "protocol": "x402",
              "status": "live",
              "edition": null,
              "price": null,
              "qualification": "source-listed",
              "original": {
                "sku": "one",
                "name": "Original",
                "method": "GET",
                "url": "https://127.0.0.1/private",
                "amountAtomic": "01",
                "keywords": [
                  "Needle"
                ],
                "price": "$1"
              }
            }
          ],
          "priceComparable": false,
          "reason": "insufficient-selection"
        },
        "venues": [],
        "limitations": [
          "Coverage is limited to the configured original sources.",
          "Independent external Shop consent, qualified selection and completed commerce are not established by this projection."
        ]
      }
    }
  ],
  "dependencies": {
    "@red-cup-engineering/web-page-tiling-engine": "0.14.2",
    "@red-cup-engineering/mcp-engineering-services-section": "0.1.7"
  }
}
```
## Acceptance obligations
```json
[
  {
    "id": "pure-projection-assays",
    "kind": "assay",
    "statement": "Native pre-source clause assays cover ONLY registered JSON project-commerce-navigation Requirements and Prohibitions with complete positive, alternate and refusal examples, exact deterministic projection output and no runtime function/HTTP identity pretense. Keep unseen receiver cases independent. Pure success is a candidate source condition, never complete runtime receiving.",
    "claimIds": [
      "original-requirement"
    ]
  },
  {
    "id": "mandatory-runtime-and-live-assays",
    "kind": "assay",
    "statement": "Before production deployment independently receive actual generated ancillary factory/default Worker using a separately native-derived receiving driver bound to the exact reviewed immutable candidate artifact, then original owner build/deploy/live checks. ALL retained production contracts and deterministic-projection-contract runtime receiving duties remain mandatory. Require actual HTTP/MCP/TUFTE/source-boundary/default configuration behavior plus SAME original Request and Response identity, binary body/header/query preservation and complete role-specific live resources. Native pure clause cases cannot discharge this obligation; root receives actual driver/source/results and unseen cases. Do not weaken duties, add a production test API, manually patch implementation/tests or call a landing page complete.",
    "claimIds": [
      "original-requirement",
      "source-read-bound",
      "source-timeout-bound"
    ]
  }
]
```
## Traceability
- `pure-input-admission` -> projection `jsnode-modules`; acceptance `pure-projection-assays`; constraints `host-navigation-source-scope`, `native-mcp-domain-selected-correction`, `complete-original-observable-contract`, `pure-empty-selection-intersections`, `optional-source-normalization`, `exact-tufte-supplier-boundary`, `exact-mcp-supplier-boundary`, `exact-reader-clock-ports`, `default-worker-single-configuration`, `uniform-url-admission`, `portable-worker-closure`, `original-custody`, `http-mcp-semantics`, `deterministic-projection-contract`, `retained-original-demand`, `retained-source-ownership`, `retained-supplier-interfaces`, `retained-data-contracts`, `retained-projection-and-read-law`, `retained-http-and-mcp`, `retained-receiving`, `retained-exact-examples`, `retained-meaningful-runtime`, `retained-no-authority-invention`, `retained-no-merchant-change`, `retained-no-shadow-registry`, `retained-no-unbounded-network`
- `pure-coverage` -> projection `jsnode-modules`; acceptance `pure-projection-assays`; constraints `host-navigation-source-scope`, `native-mcp-domain-selected-correction`, `complete-original-observable-contract`, `pure-empty-selection-intersections`, `optional-source-normalization`, `exact-tufte-supplier-boundary`, `exact-mcp-supplier-boundary`, `exact-reader-clock-ports`, `default-worker-single-configuration`, `uniform-url-admission`, `portable-worker-closure`, `original-custody`, `http-mcp-semantics`, `deterministic-projection-contract`, `retained-original-demand`, `retained-source-ownership`, `retained-supplier-interfaces`, `retained-data-contracts`, `retained-projection-and-read-law`, `retained-http-and-mcp`, `retained-receiving`, `retained-exact-examples`, `retained-meaningful-runtime`, `retained-no-authority-invention`, `retained-no-merchant-change`, `retained-no-shadow-registry`, `retained-no-unbounded-network`
- `pure-commerce-mapping` -> projection `jsnode-modules`; acceptance `pure-projection-assays`; constraints `host-navigation-source-scope`, `native-mcp-domain-selected-correction`, `complete-original-observable-contract`, `pure-empty-selection-intersections`, `optional-source-normalization`, `exact-tufte-supplier-boundary`, `exact-mcp-supplier-boundary`, `exact-reader-clock-ports`, `default-worker-single-configuration`, `uniform-url-admission`, `portable-worker-closure`, `original-custody`, `http-mcp-semantics`, `deterministic-projection-contract`, `retained-original-demand`, `retained-source-ownership`, `retained-supplier-interfaces`, `retained-data-contracts`, `retained-projection-and-read-law`, `retained-http-and-mcp`, `retained-receiving`, `retained-exact-examples`, `retained-meaningful-runtime`, `retained-no-authority-invention`, `retained-no-merchant-change`, `retained-no-shadow-registry`, `retained-no-unbounded-network`
- `pure-search-selection` -> projection `jsnode-modules`; acceptance `pure-projection-assays`; constraints `measured-tufte-query-facet`, `host-navigation-source-scope`, `native-mcp-domain-selected-correction`, `complete-original-observable-contract`, `pure-empty-selection-intersections`, `optional-source-normalization`, `exact-tufte-supplier-boundary`, `exact-mcp-supplier-boundary`, `exact-reader-clock-ports`, `default-worker-single-configuration`, `uniform-url-admission`, `portable-worker-closure`, `original-custody`, `http-mcp-semantics`, `deterministic-projection-contract`, `retained-original-demand`, `retained-source-ownership`, `retained-supplier-interfaces`, `retained-data-contracts`, `retained-projection-and-read-law`, `retained-http-and-mcp`, `retained-receiving`, `retained-exact-examples`, `retained-meaningful-runtime`, `retained-no-authority-invention`, `retained-no-merchant-change`, `retained-no-shadow-registry`, `retained-no-unbounded-network`
- `pure-comparison` -> projection `jsnode-modules`; acceptance `pure-projection-assays`; constraints `host-navigation-source-scope`, `native-mcp-domain-selected-correction`, `complete-original-observable-contract`, `pure-empty-selection-intersections`, `optional-source-normalization`, `exact-tufte-supplier-boundary`, `exact-mcp-supplier-boundary`, `exact-reader-clock-ports`, `default-worker-single-configuration`, `uniform-url-admission`, `portable-worker-closure`, `original-custody`, `http-mcp-semantics`, `deterministic-projection-contract`, `retained-original-demand`, `retained-source-ownership`, `retained-supplier-interfaces`, `retained-data-contracts`, `retained-projection-and-read-law`, `retained-http-and-mcp`, `retained-receiving`, `retained-exact-examples`, `retained-meaningful-runtime`, `retained-no-authority-invention`, `retained-no-merchant-change`, `retained-no-shadow-registry`, `retained-no-unbounded-network`
- `pure-market-metrics` -> projection `jsnode-modules`; acceptance `pure-projection-assays`; constraints `host-navigation-source-scope`, `native-mcp-domain-selected-correction`, `complete-original-observable-contract`, `pure-empty-selection-intersections`, `optional-source-normalization`, `exact-tufte-supplier-boundary`, `exact-mcp-supplier-boundary`, `exact-reader-clock-ports`, `default-worker-single-configuration`, `uniform-url-admission`, `portable-worker-closure`, `original-custody`, `http-mcp-semantics`, `deterministic-projection-contract`, `retained-original-demand`, `retained-source-ownership`, `retained-supplier-interfaces`, `retained-data-contracts`, `retained-projection-and-read-law`, `retained-http-and-mcp`, `retained-receiving`, `retained-exact-examples`, `retained-meaningful-runtime`, `retained-no-authority-invention`, `retained-no-merchant-change`, `retained-no-shadow-registry`, `retained-no-unbounded-network`
- `pure-output-invariants` -> projection `jsnode-modules`; acceptance `pure-projection-assays`; constraints `host-navigation-source-scope`, `native-mcp-domain-selected-correction`, `complete-original-observable-contract`, `pure-empty-selection-intersections`, `optional-source-normalization`, `exact-tufte-supplier-boundary`, `exact-mcp-supplier-boundary`, `exact-reader-clock-ports`, `default-worker-single-configuration`, `uniform-url-admission`, `portable-worker-closure`, `original-custody`, `http-mcp-semantics`, `deterministic-projection-contract`, `retained-original-demand`, `retained-source-ownership`, `retained-supplier-interfaces`, `retained-data-contracts`, `retained-projection-and-read-law`, `retained-http-and-mcp`, `retained-receiving`, `retained-exact-examples`, `retained-meaningful-runtime`, `retained-no-authority-invention`, `retained-no-merchant-change`, `retained-no-shadow-registry`, `retained-no-unbounded-network`
- `pure-no-authority-invention` -> projection `jsnode-modules`; acceptance `pure-projection-assays`; constraints `host-navigation-source-scope`, `native-mcp-domain-selected-correction`, `complete-original-observable-contract`, `pure-empty-selection-intersections`, `optional-source-normalization`, `exact-tufte-supplier-boundary`, `exact-mcp-supplier-boundary`, `exact-reader-clock-ports`, `default-worker-single-configuration`, `uniform-url-admission`, `portable-worker-closure`, `original-custody`, `http-mcp-semantics`, `deterministic-projection-contract`, `retained-original-demand`, `retained-source-ownership`, `retained-supplier-interfaces`, `retained-data-contracts`, `retained-projection-and-read-law`, `retained-http-and-mcp`, `retained-receiving`, `retained-exact-examples`, `retained-meaningful-runtime`, `retained-no-authority-invention`, `retained-no-merchant-change`, `retained-no-shadow-registry`, `retained-no-unbounded-network`
