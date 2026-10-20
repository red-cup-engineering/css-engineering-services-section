# market-bazaar-navigation-modules
## Requirements
- `pure-input-admission`: projectCommerceNavigation consumes only the exact typed JSON input and returns the exact output without input mutation, network, environment or clock reads. Reject malformed schema/configuration, duplicate or unknown identities, invalid explicit-timezone now, unsupported role-kind combinations, duplicate selected pairs and unknown query.source by TypeError. Empty sources are valid. Follow normative deterministic-projection-contract input admission and declaration ordering.
- `pure-coverage`: Produce exactly one coverage entry per configured source in source order, preserving observation evidence and configured URL. Apply deterministic-projection-contract disposition precedence and EXACT public reasons, including withdrawn/unverified/expired consent, absent observation, URL drift, invalid/future/stale clock, unavailable/incomplete/invalid read and malformed digest/payload. Only current observations contribute rows; a refused source never suppresses healthy siblings. Do not reflect arbitrary error text.
- `pure-commerce-mapping`: For Bazaar map ONLY body.offerings for Shop and body.offers with body.settlement for original x402, using exact deterministic-projection-contract field paths, price admission, typed identity and row inclusion. Preserve original public rows and seller/edition/status without invention, coming-soon inspection and unavailable action. Invalid required row identity/container or duplicate IDs refuses the source atomically; absent/malformed fixed quote stays price null. Original action URL admission is independent; unsafe source scheme/credential/private/local target remains inert original evidence and normalized url null. No action URL is fetched.
- `pure-search-selection`: Use original row order, exact source filtering and trimmed case-insensitive substring q across original id/title/description/string keywords through shared TUFTE semantics. Output filtered Bazaar items only; retain all coverage. Resolve selected pairs from all admitted items before query filtering in supplied reference order; missing identity never substitutes a title match. Market items empty, Bazaar venues empty, and Market selection invalid.
- `pure-comparison`: No selection yields null comparison. Selection returns found original items and EXACT deterministic-projection-contract comparison reason precedence. Fixed quotes, exact asset/network/unit and same complete typed declared outcome are all required for priceComparable. Different source row/SKU/operation labels and equal amounts do not infer equivalent outcomes. Preserve both original terms without FX, ranking winner, budget or transaction.
- `pure-market-metrics`: For Market admit only exact index-health/mpp-catalog/bazaar-summary containers and emit exact deterministic-projection-contract metric names, order, value mapping, units, populations, methods, sourceField and venue limitations. Unsupported commercial metrics remain explicit null; sourceDate is original publisher evidence or null. Never sum venue populations or turn reported providers/catalog entries/house surfaces into independently controlled sellers.
- `pure-output-invariants`: Return exact admitted role/origin/revision and ordered global limitations shown in examples. Empty sources yield empty coverage/items/venues and null comparison. All observations/inputs and original rows remain unchanged. Source-listed qualification never claims external consent, sale, useful delivery, revenue or independent seller control.
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
- `retained-exact-examples` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | The returned limitations are exactly the ordered strings in admitted examples. Empty configured sources produce empty coverage/items/venues and null comparison in the pure operation, without inventing sources; the runtime still returns unavailable for a dynamic read without any healthy configured source. For a coming-soon Shop row retain the original merchant object from top-level merchant as its declared seller and original source row unchanged; the UI offers inspection only, never purchase. A revoked source preserves source observation timestamps/digest in coverage but status refused and reason consent-revoked, no rows. A source failure preserves fetch observation time, sets digest null and returns original bounded failure reason. Examples use fake host-controlled sources and grants and establish no external consent.
- `retained-meaningful-runtime` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | The default Worker and factory are required delivered source, not stubs or optional TODOs. The pure JSON operation does not return functions. Factory/default live HTTP paths must actually fetch admitted complete source observations, derive the SAME projection, render shared TUFTE, dispatch native MCP and perform exact merchant Request/Response forwarding. Test-only fetch/clock injection is through factory options supplied by the trusted host, never HTTP arguments. Do not stop at schema/model generation or a landing page.
- `retained-no-authority-invention` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | Do not infer independent seller control, listing consent, rights, qualified ranking, order/payment authority, completed delivery, revenue or feature parity from URLs, index telemetry, fixtures, a source projection or native fabrication. [claims: original-requirement]
- `retained-no-merchant-change` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | Do not import/rebundle original merchant src/worker.mjs or change original merchant/Shop source, state, secrets, payee, routes, SKU, signed bodies, payment or recovery headers. Pass the SAME original Request and actual Response for every forwarded Market route without reading or retrying it. [claims: original-requirement]
- `retained-no-shadow-registry` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | Do not persist, retitle, copy into an independently mutable database or merchant catalog, proxy paid endpoints, add a charged discovery layer, sum overlapping venue populations, implement economic qualification or custom MCP/HTML escaping. [claims: original-requirement]
- `retained-no-unbounded-network` | Web Engineering design producer and independent source receiver | production-contract-retained | https://github.com/red-cup-engineering/computer-web-engineering-services-section/blob/625f615598d3088a695bff6c82d958be53fc40de/content/text/documents/articles/specifications/2026-10-20-market-bazaar-design.md | Mandatory complete generated production source and separate runtime receiving; not a pure JSON assay claim | Do not follow redirects, read unconfigured URLs, forward guest credentials to sources, consume private/local targets, accept request-derived source/consent configuration or install write tools. [claims: original-requirement]
- `deterministic-projection-contract` | Web Engineering design producer and independent source receiver | attempt-002-design-refinement | source-owned:2026-10-20-market-bazaar-design.md#deterministic-projection-vocabulary-and-payload-mappings | Exact pure output semantics and mandatory complete runtime implementation/receiving | ## Deterministic projection vocabulary and payload mappings This refinement answers native attempt-002 OPEN_QUESTION. The original requirements, roles, architecture and complete runtime obligations remain binding. The registered operation is JSON-valued; it cannot return or accept a factory, Request, Response or executable fake. Mandatory full runtime receiving is a separate construction/acceptance effect, not a claim made by the pure clause cases. ### Input admission, disposition and ordering The pure operation never fetches, reads a clock, mutates input, or depends on environment. All input/output schemas are exact additionalProperties:false contracts. Throw TypeError for malformed schema/role/canonical origin/now/configuration; duplicate source IDs, duplicate observation source IDs, unknown observation source IDs, unknown non-null query.source, duplicate selected identity pairs, or descriptor kinds outside the role are malformed input. Bazaar admits shop-catalog/x402-catalog descriptors; Market admits index-health/mpp-catalog/bazaar-summary. Missing configured-source observation is coverage, not a TypeError. Dates now, observedAt and expiresAt must parse finite ISO timestamps with explicit timezone; sourceDate remains the exact nullable publisher string and is never invented. Duplicate source row IDs make that payload invalid. Query q uses trim and case-insensitive substring on original id, title, description and original string keywords; source filter is exact. Query filtering changes only items; coverage and venues remain in configured order. Selected references resolve against ALL admitted Bazaar items before q/source filtering; their supplied order is preserved. Missing selected IDs leave only actually found items in comparison and reason selected-offer-not-found, without substituting any item. HTTP/tool adapters turn that reason into explicit not-found. Market selection must be empty. Empty configured sources remain valid pure input. Coverage has one entry per descriptor in declaration order. Its url is ALWAYS the configured URL, never a drifted observation URL. Copy nullable observedAt/sourceDate/digest from the source observation when present, otherwise null; the only digest override is unavailable/incomplete status, whose digest is null. Do not coerce malformed observation dates into null/current. Each source disposition uses the FIRST applicable rule below; current items/venues exist only for current coverage:  /  Condition, in precedence order  /  coverage.status  /  coverage.reason  /   /  ---  /  ---  /  ---  /   /  consent.status revoked  /  refused  /  consent-revoked  /   /  consent.status unverified  /  refused  /  consent-unverified  /   /  consent expiresAt is not null and is at or before now  /  refused  /  consent-expired  /   /  Bazaar descriptor with public-market-observation consent  /  refused  /  consent-not-commerce  /   /  no observation for configured source  /  unavailable  /  observation-missing  /   /  observation.url differs byte-for-byte from configured url  /  refused  /  observation-url-mismatch  /   /  observedAt missing or not a finite explicit-timezone ISO timestamp  /  refused  /  observation-time-invalid  /   /  observedAt later than now  /  refused  /  observation-from-future  /   /  now minus observedAt exceeds maxAgeSeconds (equality is current)  /  stale  /  observation-stale  /   /  observation.status unavailable  /  unavailable  /  recognized error from the fixed reader vocabulary below, else source-unavailable  /   /  observation.status incomplete  /  incomplete  /  source-byte-limit if error matches it, else source-incomplete  /   /  observation.status invalid  /  refused  /  recognized invalid reader error below, else source-payload-invalid  /   /  ok observation digest not lowercase sha256 colon plus exactly sixty-four hex digits  /  refused  /  observation-digest-invalid  /   /  ok payload fails its kind contract below  /  refused  /  source-payload-invalid  /   /  otherwise  /  current  /  null  /  The fixed unavailable reader reasons are source-timeout, source-network-error, source-binding-unavailable, source-redirect, source-payment-required, source-http-error and source-unavailable. Fixed invalid reader reasons are source-content-type, source-json-invalid and source-payload-invalid. No arbitrary source error/body/header text is reflected as reason. Reader precedence after obtaining response: redirect; payment-required; other non-success; JSON MIME admission (application/json or application/*+json, optional parameters); streaming byte bound; JSON parse; kind contract. A deadline abort produces source-timeout/unavailable, byte overflow source-byte-limit/incomplete. Runtime observedAt is completion/failure time; sourceDate is null unless the original payload explicitly provides sourceDate as a string. A successful sourceDate remains publisher evidence even when it is not a parseable timestamp; it cannot override observedAt freshness. ### Exact original commerce containers and fields Shop body is an object with offerings array, optional merchant object/string/null. Rows whose status is not live or coming-soon are excluded before further row validation; hidden/private rows never appear as current items. No bare-array/items/offers fallback. Each offering is an object with nonempty string id/title and string status. description is row.blurb when string, otherwise empty string. seller is body.merchant if object/string, otherwise null. edition is row.book.edition.digest if nonempty string, otherwise null. protocol is shop. price is non-null ONLY when row.priceCents is a positive safe integer number and row.currency is a nonempty string; amount is its exact decimal integer string, asset the original currency, network null, unit minor-currency-per-edition. Otherwise price null, while inspection and original evidence remain. URL is configured source origin plus /goods/ plus encodeURIComponent(row.id), independently action-admitted. Status is the exact row.status; coming-soon remains inspectable and has no purchase action. Preserve row itself verbatim as original; title/id/status malformed or duplicate id refuses the whole source atomically, never a partial successful feed. Do not infer seller control from merchant metadata. Original merchant body is an object with offers array and settlement object; do not treat it as an array or Shop offerings. Each listed offer is an object with nonempty string sku/name, string description when present, and string method/url when present; row.listed === false is excluded BEFORE remaining row validation. Missing listed means included; duplicate included sku or invalid required identity/title refuses the payload. id=row.sku; title=row.name; description=row.description when string else empty; protocol=x402; seller=row.seller only when object/string else null; edition=row.compute.configuration.release when nonempty string else null. status is unavailable if row.compute.configuration.available === false, otherwise live. url is the exact row.url when it passes action admission, else null; never synthesize from route/request/example. Preserve method, operation, gateway, route, request, recovery, price display and the entire row only inside original; do not copy them into guessed new fields. A fixed quote requires row.amountAtomic matching positive canonical unsigned decimal integer text, settlement.scheme === exact, nonempty settlement.asset/network strings, and NO non-null row.tariff or row.pricing. Then amount=row.amountAtomic, asset=body.settlement.asset, network=body.settlement.network, unit=atomic-asset-per-original-operation. Otherwise price=null. Never parse row.price currency display, infer settlement from another row, dereference compute, or invoke the operation. Missing seller does not suppress legitimate source-listed inspection and never invents seller authority. Every unsafe original action URL is inert evidence only: normalized url=null, no active href, no fetch. Observed mapping basis: original https://market.561.group/v1/catalog returned recordType 561-group.x402-market-catalog, market, settlement {protocol,scheme,network,asset}, offers; observed source bytes sha256:ec12b1ab07f63d4a63d3b4efb4126780a4e27e672f62292368d409a62608fa12 retained at data/records/source-observation-records/commerce-navigation-20261020/merchant-catalog.json. This is field/container evidence, not a claim that dynamic offers or source status remain frozen. Shop mapping retains the independently observed original catalog and admitted coming-soon example, not a proposed new Shop endpoint. ### Comparison reason vocabulary Without selected references comparison is null. Otherwise return selected found items in reference order. Apply the following FIRST matching reason; priceComparable is true ONLY for fixed-price-comparable, false otherwise:  /  Condition  /  reason  /   /  ---  /  ---  /   /  any selected pair is missing from admitted all-items  /  selected-offer-not-found  /   /  fewer than two selected references  /  insufficient-selection  /   /  any selected price null  /  fixed-price-unavailable  /   /  asset differs  /  asset-mismatch  /   /  network differs, with null matching only null  /  network-mismatch  /   /  unit differs  /  unit-mismatch  /   /  any declared outcome key absent  /  outcome-identity-unavailable  /   /  declared outcome keys differ  /  outcome-mismatch  /   /  all prior checks pass  /  fixed-price-comparable  /  The declared outcome key is a typed tuple, never a title or SKU: Shop with edition uses [book-edition,edition]; x402 with compute.configuration.release uses [x402-compute-release,compute.package,compute.export,edition,original.method] only when package/export/method are nonempty strings. Otherwise no key. JSON tuple equality is exact and case sensitive. Book edition and compute release tuples are different outcomes even if a digest happens to match: ZIP release, EPUB edition and execution are not interchangeable deliverables. Same x402 SKU, operation label or amount without this declared compute outcome never establishes equality. Two selected sources declaring the same full typed tuple can be price-comparable; preserve both originals, amounts and rails and do not select a winner, convert currencies, debit a budget or invoke commerce. Unsafe/null action URL does not erase source terms; comparison does not certify that an action is available. ### Exact Market metrics Only current admitted Market sources produce venues; venues are in source order with exact coverage timestamps/digest/publisher/URL. Kind payload contracts: index-health is an object whose total_endpoints, distinct_services and distinct_providers, when present, are finite nonnegative safe integers; by_protocol/by_health when present are JSON objects. Missing fields yield null metrics, malformed present fields refuse the whole source. Their objects are retained exactly as publisher-reported breakdowns, never summed. mpp-catalog is an object with services array; every service is an object with endpoints array. bazaar-summary is an object with role=bazaar, items array and coverage array of unique string sourceId/status entries; count all projected items and distinct configured coverage sourceId surfaces, NOT purported independent sellers. Invalid required containers refuse the entire source. A source body may carry extra original fields; no network lookup or undocumented container fallback occurs. Metric arrays use the EXACT rows below in the stated order, followed by the common unknown metrics. sourceField uses JSON Pointer for direct fields, a literal formula for derived counts, and empty string for unreported values. Value is copied exactly for direct fields or null if absent. Numeric counts never measure commerce or independent control.  /  kind  /  name  /  value/path  /  unit  /  population  /  method  /  sourceField  /   /  ---  /  ---  /  ---  /  ---  /  ---  /  ---  /  ---  /   /  index-health  /  total_endpoints  /  body.total_endpoints or null  /  endpoint  /  publisher-index  /  source-reported  /  /total_endpoints  /   /  index-health  /  distinct_services  /  body.distinct_services or null  /  service  /  publisher-index  /  source-reported  /  /distinct_services  /   /  index-health  /  distinct_providers  /  body.distinct_providers or null  /  publisher-defined-provider  /  publisher-index  /  source-reported  /  /distinct_providers  /   /  index-health  /  by_protocol  /  body.by_protocol or null  /  publisher-count-breakdown  /  publisher-index  /  source-reported  /  /by_protocol  /   /  index-health  /  by_health  /  body.by_health or null  /  publisher-count-breakdown  /  publisher-index  /  source-reported  /  /by_health  /   /  mpp-catalog  /  catalog_services  /  body.services.length  /  catalog-entry  /  fetched-mpp-catalog  /  count-complete-array  /  /services.length  /   /  mpp-catalog  /  declared_endpoints  /  sum of service.endpoints.length  /  declared-endpoint  /  fetched-mpp-catalog  /  sum-complete-child-array-lengths  /  /services/*/endpoints.length  /   /  bazaar-summary  /  projected_offers  /  body.items.length  /  source-listed-offer  /  fetched-bazaar-projection  /  count-complete-array  /  /items.length  /   /  bazaar-summary  /  source_surfaces  /  distinct coverage.sourceId count  /  configured-source-surface  /  fetched-bazaar-projection  /  count-distinct-source-identities  /  /coverage/*/sourceId  /   /  bazaar-summary  /  independent_sellers  /  null  /  not-established  /  fetched-bazaar-projection  /  not-established-by-source  /  empty string  /  Common unknown metrics appended in order: signed_payments, revenue, useful_deliveries, each value=null, unit=not-established, population=not-established, method=not-reported, sourceField=empty string. No income/currency/unit estimate is inferred. Venue limitations are EXACT ordered strings. First, by kind: index-health: "Publisher-reported counts may overlap and do not establish independent actors or completed commerce."; mpp-catalog: "Catalog entries and declared endpoints do not establish independent providers or completed commerce."; bazaar-summary: "House source surfaces do not establish independently controlled sellers or completed commerce.". Second for every kind: "Revenue, signed payments and useful deliveries are not reported by this source.". Global limitations remain exactly the admitted ordered example strings. Coverage entries remain visible independently of kind, query and venue admission. ### Assay boundary and executable receiving progression The native derive_jsnode_modules clause-assay case schema is {operation,input,output,throws}; it admits only registered JSON operations. Therefore Requirements/Prohibitions in the revised production order describe observable pure projection behavior only. EVERY previous complete production clause is retained verbatim as a normative source constraint, including original request, exact source ownership, supplier APIs, ancillary factory/default exports, source readers, TUFTE/MCP/HTTP, immutable merchant Request/Response forwarding and complete V-model duties. The source writer consumes these constraints. Full runtime requirements are NOT weakened, optional, or discharged by pure cases. Production source must implement the full module; a pure-only module is refused at receiving. Native generation first derives pure clause cases and source against that complete order, with independent review of source and exact installed suppliers. Root then receives the candidate source and pure results before any immutable candidate artifact publication under a non-latest dist-tag through the existing source owner. Exact numeric artifact identity/integrity is an input to a SEPARATE source-free receiving-driver order owned by Web Engineering; it may import the actual candidate and expose only the test-only JSON operation runCommerceReceivingCase(scenario) inside isolated src/receiving/commerce-navigation-assay.mjs. The driver invokes actual factory/default Worker with trusted-host fake fetch/clock/bindings and returns JSON observations including Request/Response identity booleans. It is never exported by the production package, bundled or deployed. Native driver tests precede driver source; source consumer and independent root receiving execute predeclared positive/alternate/refusal HTTP/MCP/binding cases, retain unseen cases independently, and reject missing runtime behavior. This is not a handwritten test wrapper or fabricated runtime success. Candidate version/registry publication and driver dependency are selected only after exact source receiving, never invented in advance. Mandatory runtime acceptance remains: exact same original Request at merchant binding and same actual Response back; untouched signed binary bodies/headers/query/canonical URL; route exclusion and role-isolated native MCP negotiation/tools; URL action refusals/HTML escaping; fixed GET-only bounded source reads with no credential forwarding or item fetch; default env configuration/host admission; partial/all outage statuses; native TUFTE search/detail/compare; live DNS/TLS/resource identity, original Shop goods/catalog/checkout and original merchant unsigned challenge/recovery. No rollout until runtime receiving passes; no customer completion until all three distinct origins and useful actual resources are independently received. Driver failure returns to design/native derivation, never a production test API or manual patch.
- `portable-worker-closure` | Web Engineering source producer and independent source receiver | portable-fetch-webcrypto | source-owned:2026-10-20-market-bazaar-design.md#portable-worker-closure-and-source-evidence-refinement | Complete production module and candidate dependency capture | ## Portable Worker closure and source evidence refinement The complete generated production module must use portable Fetch, Request, Response, TextEncoder/TextDecoder, URL, AbortController and global crypto.subtle.digest for exact-byte SHA-256, shared by Node 24 and Workers. No node: builtin import, Buffer or Node process/filesystem API is permitted in the production module or its default Worker. This is a required production closure constraint, not a relaxation of the receiving driver's trusted dependency capture. The two selected published suppliers' captured module closures contain no Node builtin imports. Independently inspect the exact candidate closure before publication; refuse a generated builtin import rather than editing it by hand. Shop original catalog was independently fetched with the source's admitted public browser user agent; body.offerings contains the original public rows and body.merchant carries original merchant declaration. Bytes retained at data/records/source-observation-records/commerce-navigation-20261020/shop-catalog.json, sha256:3536e01809a3d2a983dc8883ba1d0af3b27ee722ddf31de38783e91963e5fe3a. This establishes original container/field mappings; observation is not seller consent or a new Shop interface. Shop rows with status other than live or coming-soon are excluded from current items (including hidden/private statuses); no included-row fallback or forced status. X402 non-null row.tariff or row.pricing keeps price null. Only method GET can offer a direct x402 navigation action; other declared methods remain inert terms requiring the original documented client and never cause a paid request. A missing named service binding produces source-binding-unavailable without external fallback.
- `uniform-url-admission` | Web Engineering design producer and independent source receiver | public-https-no-fixture-exception | source-owned:2026-10-20-market-bazaar-design.md#uniform-positive-fixture-and-url-law | Configuration and every active item URL, all roles, all fixtures | The host URL law applies identically to production and fixtures: only HTTPS with no userinfo or fragment, nonempty multi-label DNS hostname, no localhost or localhost suffix, and no special-use suffix .local, .internal, .home, .lan, .onion, .test, .invalid, .example or .arpa. Normalize hostname case and ignore a trailing DNS root dot for admission. Reject IP literals that are private, loopback, link-local, unspecified, multicast, documentation, benchmarking, carrier-grade NAT or otherwise non-global; IPv4-mapped IPv6 is tested as its underlying IPv4. Single-label and .example special-use targets are never active links. Configuration source URLs must pass the same law before any read; unsafe item URLs become null/inert instead of invalidating safe original evidence. Positive admitted fixtures use the actual public-form .561.group/index origins, but fixture source bodies, consent and hashes are synthetic and the pure operation performs no network. Native runtime cases supply host-only fake fetch/bindings; using a real public-form hostname never authorizes a live paid call. The explicit unsafe-action fixture uses a safe configured source and preserves the .example URL only inside original with normalized url null.
## Open questions
none
## Claims
- `original-requirement` | measured | world | Original source-authored Group requirement states distinct commerce roles, original identity/custody, consent, bounded authority and preservation obligations; this is observed governing source, not observed external seller authority or deployment | none | https://github.com/561-group/561-group-services-section/blob/32d5a53ef5f45b93feab17866147435fbedea8f3/lib/agency/requirements/market-bazaar-shop-agentic-composable-enterprise.json | sha256:7354ae36e6d04bdacfc111d1c1e00f7edf80d3ca974044f0416601dc83f8e9de | Read exact Group source bytes at the specified revision and retain the normative basis for all prohibitions
- `tufte-dependency` | measured | dependency | Published original @red-cup-engineering/web-page-tiling-engine@0.14.2 exposes the selected storefront/search/detail/composition/rendering contracts; complete installed graph still requires receiving | none | https://registry.561.group/@red-cup-engineering/web-page-tiling-engine/-/web-page-tiling-engine-0.14.2.tgz#package/src/tufte-storefront.mjs | sha256:ec4a7b6d199cf3fd81d3afde52971c7676a4e1ecbb6aaf7dcb5920e67ebd32e9 | Read original published archive in memory, verify its registry SHA512 integrity, then read actual storefront/composition/rendering exports; source-local unpublished later edition is not selected
- `mcp-dependency` | measured | dependency | Source manifest declares @red-cup-engineering/mcp-engineering-services-section@0.1.7; installed supplier exports and complete graph require independent native receiving | none | /home/emsenn/info/lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-networking-engineering-services-section/services/mcp-engineering-services-section/package.json | sha256:213ffa2296e0f2d700209a3e66895bc7eaeb6cc24134fe65e0bde742a7c736f4 | Read exact original source manifest bytes; not a claim of registry publication or full graph admission
- `source-timeout-bound` | conjectured | parameter | Proposed configurable per-source read deadline, not a proved optimum or service guarantee | 8000 millisecond | Current public source reads complete under this configured deadline | Complete source-read latency and timeout refusal | Trusted-host fake clock plus bounded live source observer | Refuse incomplete/timed-out source without dropping surviving sources | Initial conservative bounded host choice; receiver qualifies the actual configured limit
- `source-read-bound` | conjectured | parameter | Proposed configurable per-source byte ceiling, not a capacity reservation or proved optimal workload | 1048576 byte | Complete current public source catalogs fit the proposed finite bound | Whole-source byte completion and response time | Original bounded reader plus independent complete-source assay | Refuse incomplete source before displaying its rows | MPP public body observed below the proposed byte bound; host must qualify actual limits and capacity

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
- `pure-input-admission` -> projection `jsnode-modules`; acceptance `pure-projection-assays`; constraints `uniform-url-admission`, `portable-worker-closure`, `original-custody`, `http-mcp-semantics`, `deterministic-projection-contract`, `retained-original-demand`, `retained-source-ownership`, `retained-supplier-interfaces`, `retained-data-contracts`, `retained-projection-and-read-law`, `retained-http-and-mcp`, `retained-receiving`, `retained-exact-examples`, `retained-meaningful-runtime`, `retained-no-authority-invention`, `retained-no-merchant-change`, `retained-no-shadow-registry`, `retained-no-unbounded-network`
- `pure-coverage` -> projection `jsnode-modules`; acceptance `pure-projection-assays`; constraints `uniform-url-admission`, `portable-worker-closure`, `original-custody`, `http-mcp-semantics`, `deterministic-projection-contract`, `retained-original-demand`, `retained-source-ownership`, `retained-supplier-interfaces`, `retained-data-contracts`, `retained-projection-and-read-law`, `retained-http-and-mcp`, `retained-receiving`, `retained-exact-examples`, `retained-meaningful-runtime`, `retained-no-authority-invention`, `retained-no-merchant-change`, `retained-no-shadow-registry`, `retained-no-unbounded-network`
- `pure-commerce-mapping` -> projection `jsnode-modules`; acceptance `pure-projection-assays`; constraints `uniform-url-admission`, `portable-worker-closure`, `original-custody`, `http-mcp-semantics`, `deterministic-projection-contract`, `retained-original-demand`, `retained-source-ownership`, `retained-supplier-interfaces`, `retained-data-contracts`, `retained-projection-and-read-law`, `retained-http-and-mcp`, `retained-receiving`, `retained-exact-examples`, `retained-meaningful-runtime`, `retained-no-authority-invention`, `retained-no-merchant-change`, `retained-no-shadow-registry`, `retained-no-unbounded-network`
- `pure-search-selection` -> projection `jsnode-modules`; acceptance `pure-projection-assays`; constraints `uniform-url-admission`, `portable-worker-closure`, `original-custody`, `http-mcp-semantics`, `deterministic-projection-contract`, `retained-original-demand`, `retained-source-ownership`, `retained-supplier-interfaces`, `retained-data-contracts`, `retained-projection-and-read-law`, `retained-http-and-mcp`, `retained-receiving`, `retained-exact-examples`, `retained-meaningful-runtime`, `retained-no-authority-invention`, `retained-no-merchant-change`, `retained-no-shadow-registry`, `retained-no-unbounded-network`
- `pure-comparison` -> projection `jsnode-modules`; acceptance `pure-projection-assays`; constraints `uniform-url-admission`, `portable-worker-closure`, `original-custody`, `http-mcp-semantics`, `deterministic-projection-contract`, `retained-original-demand`, `retained-source-ownership`, `retained-supplier-interfaces`, `retained-data-contracts`, `retained-projection-and-read-law`, `retained-http-and-mcp`, `retained-receiving`, `retained-exact-examples`, `retained-meaningful-runtime`, `retained-no-authority-invention`, `retained-no-merchant-change`, `retained-no-shadow-registry`, `retained-no-unbounded-network`
- `pure-market-metrics` -> projection `jsnode-modules`; acceptance `pure-projection-assays`; constraints `uniform-url-admission`, `portable-worker-closure`, `original-custody`, `http-mcp-semantics`, `deterministic-projection-contract`, `retained-original-demand`, `retained-source-ownership`, `retained-supplier-interfaces`, `retained-data-contracts`, `retained-projection-and-read-law`, `retained-http-and-mcp`, `retained-receiving`, `retained-exact-examples`, `retained-meaningful-runtime`, `retained-no-authority-invention`, `retained-no-merchant-change`, `retained-no-shadow-registry`, `retained-no-unbounded-network`
- `pure-output-invariants` -> projection `jsnode-modules`; acceptance `pure-projection-assays`; constraints `uniform-url-admission`, `portable-worker-closure`, `original-custody`, `http-mcp-semantics`, `deterministic-projection-contract`, `retained-original-demand`, `retained-source-ownership`, `retained-supplier-interfaces`, `retained-data-contracts`, `retained-projection-and-read-law`, `retained-http-and-mcp`, `retained-receiving`, `retained-exact-examples`, `retained-meaningful-runtime`, `retained-no-authority-invention`, `retained-no-merchant-change`, `retained-no-shadow-registry`, `retained-no-unbounded-network`
- `pure-no-authority-invention` -> projection `jsnode-modules`; acceptance `pure-projection-assays`; constraints `uniform-url-admission`, `portable-worker-closure`, `original-custody`, `http-mcp-semantics`, `deterministic-projection-contract`, `retained-original-demand`, `retained-source-ownership`, `retained-supplier-interfaces`, `retained-data-contracts`, `retained-projection-and-read-law`, `retained-http-and-mcp`, `retained-receiving`, `retained-exact-examples`, `retained-meaningful-runtime`, `retained-no-authority-invention`, `retained-no-merchant-change`, `retained-no-shadow-registry`, `retained-no-unbounded-network`
