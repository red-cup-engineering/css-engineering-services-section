# market-bazaar-navigation-modules
## Requirements
- `original-demand`: Preserve the unabridged source requests: We want to get [https://market.561.group](https://market.561.group), bazaar.561.group, shop.561.group, each up as their own domain with the right resources at those sites. Subsequent instruction: Fix the unavailable fabrication path and keep going until all three sites are live with the right resources. Don’t stop at recording blockers. The native output serves the domain-launch slice; all strategic Group requirement cells, external independent seller consent, comparative outcomes and payment authority remain unsatisfied unless separately received.
- `source-ownership`: Generate src/commerce-navigation.mjs in the EXISTING @red-cup-engineering/computer-web-platform owner. This module composes HTTP/TUFTE/MCP; do not alter base computer-web-server, merchant, Shop, AOE or source-provider policy. Add named pure projectCommerceNavigation, ancillary createCommerceNavigator and default generic Worker exports in this same module; do not generate a new package, copied catalog, source-control script or replacement merchant. The default Worker reads only host env.COMMERCE_CONFIGURATION JSON, checks canonical host, and binds fixed deployment-owned sources; the instance owns that variable and its native deployment manifest.
- `supplier-interfaces`: The exact measured TUFTE dependency and source in Claims/Modules: ./storefront exports admitTufteStorefront(catalog), storefrontCatalogModel(catalog,{path,itemHref,parameters,search}), storefrontDetailModel(catalog,id,{catalogHref}), filterStorefrontItems(catalog,{term,facets}), and STOREFRONT_STYLES. Catalog is {title,description?,items,facets?,navigation?}; each item requires a unique presentation id and title, and may carry summary, keywords, facets, status:{label,note}, facts:[{label,value,detailOnly?}], actions:[{kind:'link',label,href}|{kind:'unavailable',label,reason}], detail safe HTML nodes and metadata. Facets are {key,label}. Human strings go through ./composition htmlElement(name,attributes,children), composeTufteTile(nodes,tile), and ./rendering renderTufteDocument(model,settings). TUFTE handles text escaping, URL admission and shared query filtering. No HTML fragments may contain source-provided raw HTML. The exact measured MCP dependency and source in Claims/Modules ./server exports createMcpServer({name,version,tools,resources?,instructions?}). Tool entries contain name, description, inputSchema, handler(args,context), and read-only annotations. ./http mcpResource({server,path,maxBodyBytes,sessions:false,allowedOrigins}) returns {handler(ctx),...}, and handler({request}) returns a Web Response. It performs actual body streaming/admission, origin checks and protocol negotiation. A tool handler returns native content:[{type:'text',text:JSON.stringify(result)}] and may include the same structuredContent. Do not author another MCP/JSON-RPC dispatcher. Public tools have no verifyToken because all selected tools are strictly read-only; no mutation tool is installed. New registered pure JSON operation projectCommerceNavigation(input) returns the exact JSON shape below. Ancillary module export createCommerceNavigator(configuration,{fetchImpl?,now?}={}) returns an object with fetch(request,env), using the same projector, existing TUFTE/MCP and fixed source readers. The factory is not a function-valued operation result. Test-only host arguments never cross HTTP/MCP arguments. Runtime uses global fetch and Date when host replacements are absent. The engine has no deployment credentials, accounts, signer, ledger, mutable catalog or durable state.
- `data-contracts`: Configuration: role is bazaar or market; origin is canonical HTTPS without credentials/query/fragment; title is presentation text; revision is source-selected immutable identity; sources is a list of unique descriptors. Descriptor: {id,kind,url,publisher,consent,maxAgeSeconds,maxBytes,timeoutMs,binding?}. kind is shop-catalog, x402-catalog, index-health, mpp-catalog or bazaar-summary. consent is {status,evidence,revision,expiresAt}; status is house-publication, seller-consented, public-market-observation, unverified or revoked. evidence/revision may be null only for unverified/revoked; expiration null means the particular house/public observation authorization has no asserted expiry. A supplied external seller-consented descriptor requires original seller evidence and cannot be fabricated from a reachable feed. Host configuration admission rejects private/local IP literals, credentials, fragments, non-HTTPS, duplicate source IDs, unsupported kinds, invalid expiry and nonpositive/nonfinite bounds. Configuration is never merged with request input. Observation: {sourceId,url,observedAt,sourceDate,digest,status,body,error}. status is ok, unavailable, invalid or incomplete. digest is sha256:<lowercase exact response-byte digest> for complete successful bytes, otherwise null. body is the original parsed public JSON or null. sourceDate is the publisher's actual supplied date or null; fetch time is not relabeled source time. error is a bounded public explanation, never tokens, headers or private body. Future, stale, unknown, incomplete, malformed or source-URL-mismatched observations do not supply current offers. They remain source coverage entries. Pure input: {role,origin,revision,now,query,sources,observations}. query is {q,source,selected}; source is source ID or null; selected is a list of {sourceId,id} references. Default query is empty, no selected references. The host supplies now and observations; the public only controls q, source and selected references. Wrong role/origin/configuration or malformed/duplicate query produces a TypeError before the live adapter fetches. Pure output: {role,origin,revision,coverage,items,comparison,venues,limitations}. coverage retains each configured source's {sourceId,url,status,observedAt,sourceDate,digest,reason}; status is current, stale, unavailable, refused or incomplete. items contains Bazaar results only, venues Market results only; other role's list is empty. comparison is null without selection; otherwise {items,priceComparable,reason}, with original selected items and explicit incompatible/missing-terms reasoning. limitations is an ordered list of plain source-scope statements, including house-only coverage and unreceived independent seller/transaction qualification. Missing requested selected identity is an explicit not-found result from the HTTP/tool layer; never select another offer by title. Bazaar item: {sourceId,id,publisher,seller,title,description,url,protocol,status,edition,price,qualification,original}. id is the original source product ID or original x402 SKU; seller is the exact declared original seller or null. publisher is the admitted source descriptor; this does not fill a missing seller. edition is original book edition digest or x402 compute.configuration.release, otherwise null. price is {amount,asset,network,unit} with exact integer amount string when source supports it, otherwise null. original is the original already-public offering row with no invented fields. qualification is source-listed unless a separate original qualification object is actually supplied and received; it is never verified because a URL responds. Shop row url is canonical source origin + /goods/ + encodeURIComponent(original id), protocol is shop, status preserves live/coming-soon; currency minor units are represented as asset original currency and unit minor-currency-per-edition, network null. x402 row url/method/SKU and current network/asset atomic amount are retained exactly; price unit is atomic-asset-per-original-operation; listed:false is excluded. Unknown price, non-fixed tariff, missing seller, hidden/private source and nonpositive malformed integer amount do not become a guessed fixed price. Every actionable item url must independently admit direct HTTPS, without credentials, fragment, localhost/single-label/local/private/special-use host or private/special-use IP literal. Unsafe original URLs remain unchanged only inside original; normalized item url is null and the UI action is unavailable, never an active href. Do not fetch item action URLs. Source-listed inspection may remain visible without a purchase action. Market venue: {sourceId,publisher,url,observedAt,sourceDate,digest,kind,metrics,limitations}. Metrics are {name,value,unit,population,method,sourceField}; economic metrics unsupported by the source remain null. index-health maps only original total_endpoints, distinct_services, distinct_providers, by_protocol and by_health with publisher-reported scope; MPP counts services.length and the sum of declared endpoints.length in a complete fetched catalog; these are catalog-entry/declared-endpoint counts, not independent actors, signed payments or useful deliveries. Bazaar summary counts actual projected items/source surfaces and says independent seller count unknown. Never sum external venue populations.
- `projection-and-read-law`: Process configured descriptors in declaration order, one observation per source. Retain failed coverage before processing healthy siblings. Admit successful complete observations only when source identity and freshness agree; reject malformed payload atomically per source. Filter source-listed public rows; preserve original row order. Search is case-insensitive substring over original title/description/id and declared keywords, with exact source filter using shared TUFTE filtering; no model inference or new economic ranking. Detail/selection uses the pair (sourceId,originalId), never title equality. Same edition may be disclosed, but different source row identity and rail remain distinct. Comparison is side-by-side, not an automatic winner: priceComparable requires every selected item have a fixed valid integer quote with the same asset, network, unit, and same declared operation/outcome identity; absent comparability returns false and an explicit reason. If comparable, do not change the original values or add FX; show exact source terms. No default source ownership boost, paid placement, quantity arithmetic, budget debit, endorsement or commercial contract occurs. Every fetch is exactly the configured GET URL with no user credentials, wallet headers or user query appended. Use binding.fetch(new Request(source.url,{method:'GET',redirect:'manual'})) when the descriptor names an existing env service binding; otherwise fetchImpl with redirect:'manual'. Reject any redirect/payment-required/non-success, unsupported MIME, over-budget stream or invalid JSON as a source-local refusal. Streaming byte limit is enforced before JSON parsing. SHA-256 digests use the runtime cryptographic primitive over exact complete bytes. Timeout aborts only that read; no automatic retry of a payment or source request. Configuration fixes finite limits; initial proposed bounds are {{source-read-bound}} bytes/source and {{source-timeout-bound}} milliseconds/source, based on the current complete MPP public-body observation, not capacity reservations. All sources can be fetched concurrently; no output list is considered complete if a source was cut off. No persistent cache is needed initially. In-request observations feed every representation of that request; no list import becomes a second mutable catalog. Optional future cache must be keyed by descriptor/consent revision and expose age; revoked/changed descriptors invalidate cached visibility. Loss of ephemeral observations loses no merchant data or accepted Work. No new R2/KV/DO is required for navigation. Durable source/fabrication/bundle/installation provenance remains with the existing release owner; root obtains fresh storage/capacity admission before materialization.
- `http-and-mcp`: Bazaar GET/HEAD / renders TUFTE search results and source coverage; /offers uses one source/id pair; /compare uses matched repeated source/id pairs. /discovery.json lists role, canonical origin, revision, source scope and exact free endpoint/tool links; /v1/discovery/search and /v1/discovery/compare return the same pure projection/results. POST /mcp mounts search_offers({q?,source?}), get_offer({source,id}), compare_offers({selected:[{sourceId,id}]}). Unknown fields, incomplete pairs and duplicate singleton parameters refuse HTTP Bad Request; missing selected ID returns HTTP Not Found. Public q is bounded by the exact maxLength in the input schema and selection by its exact maxItems; these are configured technical limits, not claims of optimum workload. GET/HEAD only for data/HTML; other methods HTTP Method Not Allowed, unknown path HTTP Not Found. HEAD uses corresponding headers/status without a body. Source directory can return HTTP OK without live data; data search/readout with all configured sources unavailable returns HTTP Service Unavailable; partial availability returns HTTP OK with explicit coverage. Market handles exactly /, /markets/discovery.json, /markets/observations, /markets/venues and /markets/mcp. Its MCP tools are list_markets({}), read_observations({source?}). All other requests go immediately to env.MERCHANT.fetch(originalRequest) before reading body or parsing the URL beyond exact routing. The original /mcp, /v1/*, /actors/*, /.well-known/*, settlement/recovery headers and raw signed bodies are neither interpreted nor rebuilt. Return the actual binding Response object unchanged. Missing required binding yields HTTP Service Unavailable for the forwarding branch, never a fallback copy. The generic generated default Worker entry reads only env.COMMERCE_CONFIGURATION as host configuration, selects configuration only by canonical request host and calls createCommerceNavigator; unknown host refuses HTTP Misdirected Request before sources. Bazaar has no merchant fallback and never serves original payable routes.
- `receiving`: Source contract assays: accepted two house catalogs retain all original identity/edition/source status; alternate q/source changes results without altering source order; unverified external consent, revoked consent, stale/future clock, malformed price, URL drift and incomplete body refuse their current records. A same-title and same-edition alternate with incompatible rails stays distinct and noncomparable. Same asset/network/unit without the same declared original outcome also remains noncomparable. Fixtures cannot establish independent seller consent or received sale. Component assays: native TUFTE renders both roles, escapes script-shaped source titles, rejects unsafe action schemes/credential/private/local hosts as active hrefs while retaining inert original evidence, has working URL search/detail/back links and original direct seller actions; MCP initialize/tools/list/tools/call and HTTP produce the same original records; fake source fetch observes only allowlisted configured GETs and no user credential forwarding; all-source/partial outage status is honest. Native test-only fake fetch and clock are host supplied, never request fields. Preservation assays: send signed-like binary/non-UTF8 POST bytes, payment and recovery headers, cookies, query order and canonical market URL to a fake merchant binding; assert same original Request identity at binding, one fetch, and same returned Response identity/headers/body. Test /mcp and original /v1/publications resource dispatch; root route and exact Market discovery do not reach merchant. Bazaar payable paths refuse. Probe live original catalog/Shop goods/unsigned x402 challenge before and after rollout; do not pay. Freeze original merchant deployment identifier and Shop catalog/accepted artifact fingerprints. Independent receiving: use exact built module/source/dependency digests, qualified native proposal, actual test results, esbuild/Worker manifest, service binding, DNS/TLS and installed release evidence. Verify a real human title search/detail/compare and real read-only MCP call, plus both original external Market observations with source times/units and uncertainties. Keep unseen cases with the receiver, including factory/default Worker HTTP/MCP behavior, unsafe item action URLs and same-price different-outcome comparison; five pure-generation examples are not whole-system receiving. A failed or malformed derivation returns its actual phase/refusal to the original Work; it is not repaired by hand or declared complete from a plan.
- `exact-examples`: The returned limitations are exactly the ordered strings in admitted examples. Empty configured sources produce empty coverage/items/venues and null comparison in the pure operation, without inventing sources; the runtime still returns unavailable for a dynamic read without any healthy configured source. For a coming-soon Shop row retain the original merchant object from top-level merchant as its declared seller and original source row unchanged; the UI offers inspection only, never purchase. A revoked source preserves source observation timestamps/digest in coverage but status refused and reason consent-revoked, no rows. A source failure preserves fetch observation time, sets digest null and returns original bounded failure reason. Examples use fake host-controlled sources and grants and establish no external consent.
- `meaningful-runtime`: The default Worker and factory are required delivered source, not stubs or optional TODOs. The pure JSON operation does not return functions. Factory/default live HTTP paths must actually fetch admitted complete source observations, derive the SAME projection, render shared TUFTE, dispatch native MCP and perform exact merchant Request/Response forwarding. Test-only fetch/clock injection is through factory options supplied by the trusted host, never HTTP arguments. Do not stop at schema/model generation or a landing page.
## Prohibitions
- `no-authority-invention`: Do not infer independent seller control, listing consent, rights, qualified ranking, order/payment authority, completed delivery, revenue or feature parity from URLs, index telemetry, fixtures, a source projection or native fabrication. [claims: original-requirement]
- `no-merchant-change`: Do not import/rebundle original merchant src/worker.mjs or change original merchant/Shop source, state, secrets, payee, routes, SKU, signed bodies, payment or recovery headers. Pass the SAME original Request and actual Response for every forwarded Market route without reading or retrying it. [claims: original-requirement]
- `no-shadow-registry`: Do not persist, retitle, copy into an independently mutable database or merchant catalog, proxy paid endpoints, add a charged discovery layer, sum overlapping venue populations, implement economic qualification or custom MCP/HTML escaping. [claims: original-requirement]
- `no-unbounded-network`: Do not follow redirects, read unconfigured URLs, forward guest credentials to sources, consume private/local targets, accept request-derived source/consent configuration or install write tools. [claims: original-requirement]
## Laws
- `original-custody` | 561 Group | 32d5a53ef5f45b93feab17866147435fbedea8f3 | https://github.com/561-group/561-group-services-section/blob/32d5a53ef5f45b93feab17866147435fbedea8f3/lib/agency/requirements/market-bazaar-shop-agentic-composable-enterprise.json | Original three-domain production slice | Preserve original identities, source authority, consent, independent commerce and all strategic requirements without fabrication of acceptance
## Standards
- `http-mcp-semantics` | IETF HTTP and original MCP supplier | Source-qualified original supplier contracts | https://github.com/red-cup-engineering/mcp-engineering-services-section/blob/932b63a3e7b1295459986dec3683d604ead003b8/src/http.mjs | Read-only Fetch/HTTP and MCP projection | Reuse original MCP transport and origin/body admission, proper HTTP status/HEAD handling, exact canonical Request forwarding and no inferred payment power
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
                  "type": [
                    "string",
                    "null"
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
                "type": "string"
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
        "origin": "https://bazaar.example",
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
        "origin": "https://bazaar.example",
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
        "origin": "https://market.example",
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
        "origin": "https://market.example",
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
        "origin": "https://bazaar.example",
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
            "url": "https://shop.example/catalog.json",
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
            "url": "https://shop.example/catalog.json",
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
        "origin": "https://bazaar.example",
        "revision": "fixture-revision",
        "coverage": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.example/catalog.json",
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
            "url": "https://shop.example/goods/book",
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
        "origin": "https://bazaar.example",
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
            "url": "https://shop.example/catalog.json",
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
            "url": "https://shop.example/catalog.json",
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
        "origin": "https://bazaar.example",
        "revision": "fixture-revision",
        "coverage": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.example/catalog.json",
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
        "origin": "https://bazaar.example",
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
            "url": "https://shop.example/catalog.json",
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
            "url": "https://shop.example/catalog.json",
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
        "origin": "https://bazaar.example",
        "revision": "fixture-revision",
        "coverage": [
          {
            "sourceId": "book-shop",
            "url": "https://shop.example/catalog.json",
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
    "id": "native-and-live-assays",
    "kind": "assay",
    "statement": "Derive behavioral tests before source from all clauses, keeping unseen independent cases separate; assay real named pure export AND complete ancillary factory/default Worker on exact installed TUFTE/MCP. Cover original source identity, search/detail/compare, different rails, coming-soon refusal, grant withdrawal, private source, malformed/incomplete/stale feed, partial/all outage, JSON/HTML/MCP agreement, canonical host and immutable signed Request/Response forwarding. Native proposal remains unaccepted until independent root receiving; source result is not deployment. Independently verify source-derived malicious action URLs are inert for unsafe scheme, credentials and private/local host; verify same-price different-outcome items remain noncomparable. Factory and default Worker HTTP/MCP tests are mandatory production assays, beyond pure projection examples.",
    "claimIds": [
      "source-read-bound",
      "source-timeout-bound"
    ]
  }
]
```
## Traceability
- `original-demand` -> projection `jsnode-modules`; acceptance `native-and-live-assays`; constraints `original-custody`, `http-mcp-semantics`
- `source-ownership` -> projection `jsnode-modules`; acceptance `native-and-live-assays`; constraints `original-custody`, `http-mcp-semantics`
- `supplier-interfaces` -> projection `jsnode-modules`; acceptance `native-and-live-assays`; constraints `original-custody`, `http-mcp-semantics`
- `data-contracts` -> projection `jsnode-modules`; acceptance `native-and-live-assays`; constraints `original-custody`, `http-mcp-semantics`
- `projection-and-read-law` -> projection `jsnode-modules`; acceptance `native-and-live-assays`; constraints `original-custody`, `http-mcp-semantics`
- `http-and-mcp` -> projection `jsnode-modules`; acceptance `native-and-live-assays`; constraints `original-custody`, `http-mcp-semantics`
- `receiving` -> projection `jsnode-modules`; acceptance `native-and-live-assays`; constraints `original-custody`, `http-mcp-semantics`
- `exact-examples` -> projection `jsnode-modules`; acceptance `native-and-live-assays`; constraints `original-custody`, `http-mcp-semantics`
- `meaningful-runtime` -> projection `jsnode-modules`; acceptance `native-and-live-assays`; constraints `original-custody`, `http-mcp-semantics`
- `no-authority-invention` -> projection `jsnode-modules`; acceptance `native-and-live-assays`; constraints `original-custody`, `http-mcp-semantics`
- `no-merchant-change` -> projection `jsnode-modules`; acceptance `native-and-live-assays`; constraints `original-custody`, `http-mcp-semantics`
- `no-shadow-registry` -> projection `jsnode-modules`; acceptance `native-and-live-assays`; constraints `original-custody`, `http-mcp-semantics`
- `no-unbounded-network` -> projection `jsnode-modules`; acceptance `native-and-live-assays`; constraints `original-custody`, `http-mcp-semantics`
