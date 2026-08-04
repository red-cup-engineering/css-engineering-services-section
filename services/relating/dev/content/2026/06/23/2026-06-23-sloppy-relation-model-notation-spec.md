# Relation Model Notation as Agent Tool Bytecode: A Research Memo

## Abstract

Relation Model Notation, or RMN, is best understood not merely as an internal representation, not merely as a Lisp-like term calculus, and not merely as a portable DSL.
Its game-changing implementation path is as a high-level, typed, total, carrier-aware execution notation for self-describing tools.

In the present software landscape, tools are usually published as opaque endpoints.
A tool registry may advertise a name, a description, an input schema, an output schema, and a network location.
But the body of the tool—the actual morphism from input to output—remains hidden inside server code.
Agents call such tools by trust, not by understanding.
They can inspect the interface but not the semantics.
They can compose tools only externally, by prompt or orchestration logic, not by algebraically composing the tools’ own executable bodies.

RMN changes the status of a tool.
A tool can publish not only that it exists, not only how it is called, but what relation-model it embodies.
The tool’s body can travel as deterministic executable data.
It can be inspected, evaluated locally, cached, composed, logged, replayed, ported to another language, tested against conformance vectors, and, in its proof-core fragment, type-checked as a Curry–Howard witness.

The central thesis of this memo is:

> RMN can become the portable semantic substrate for agent tools: a proof-adjacent virtual machine where pure tool bodies are published as typed relation morphisms rather than hidden host-language closures.

The corresponding product thesis is:

> Tools whose semantics travel with them.

The corresponding infrastructure thesis is:

> An action is not an endpoint.
> An endpoint is one projection of an action.
> The action itself is a relation model.

This memo analyzes RMN as a richer base than Lisp, a higher-level analogue to WebAssembly, a semantic counterpart to OpenAPI/MCP, and a practical route toward tool ecologies that can inspect, compose, replay, and republish their own capabilities.

---

## 1. The Problem: Tools Are Opaque Endpoints

Modern agent systems depend on tools.
The agent asks a model to reason; the model delegates certain operations to external capabilities: search, file access, email, calendar, code execution, database queries, business APIs, wallet operations, sensors, robotics, and so on.

The emerging infrastructure around such capabilities tends to standardize discovery and invocation.
A tool advertises:

```text
name
description
input schema
output schema
transport
authentication
```

This is useful, but it is shallow.
It describes the boundary of the tool, not the semantic body of the tool.

The actual tool body remains something like:

```text
trust me, my server code does what this description says
```

For human API clients, this is normal.
For agent systems, it is a serious limitation.

An agent trying to use an opaque tool cannot directly determine:

```text
whether the tool is pure
whether it can be run locally
whether it can be safely cached
whether it composes with another tool
whether it preserves an invariant
whether two tools are extensionally equivalent over a sample
whether the tool body changed between versions
whether the tool is just a projection of another tool
whether the tool can be replayed from a log
whether the tool depends on boundary effects
```

At best, the agent sees a natural-language description and JSON schema.
This is not nothing, but it is not enough for a tool ecology that can reason about itself.

The fundamental problem is that current tool systems standardize the **interface** while leaving the **morphism** opaque.

RMN addresses that problem by making the morphism itself portable.

---

## 2. The RMN Shift: From Tool Interface to Tool Body

The core shift is simple:

```text
Before:
  tool = name + schema + endpoint + opaque implementation

After:
  tool = name + carrier domain + carrier codomain + executable relation body + projections
```

In the latter model, the endpoint is not the tool.
The endpoint is merely one projection of the tool into a transport.

The tool itself is a relation model: a morphism from one carrier to another.

RMN is the notation in which that morphism can be carried.

A tool can therefore say:

```text
Here is my input carrier.
Here is my output carrier.
Here is my executable RMN body.
Here are my conformance vectors.
Here are the transports through which you may invoke me.
```

This is a radically different object from an ordinary API endpoint.

It is closer to a mathematical artifact than a service description.
It is executable, but not in the usual arbitrary-code sense.
It is structured, finite, pure, inspectable, and carrier-aware.

A client that receives such a tool can choose:

```text
call the host server
run the RMN body locally
compile the RMN body to another runtime
compose it with another RMN body
inspect its shape before execution
cache the result if the input matches
log the invocation with the body included
compare the body to a previous version
type-check the proof-core fragment
```

That is the seed of a different kind of tool infrastructure.

---

## 3. Why RMN Is Not “Just Lisp”

RMN resembles Lisp in the superficial sense that it uses s-expressions.
It is homoiconic in the practical sense: executable structures are represented as data.
It has lambdas, application, products, unit, and list-like structural recursion.

But the analogy to Lisp is misleading if taken too far.

Lisp is a general symbolic programming tradition.
RMN is not simply a general-purpose programming language with parentheses.
RMN is a canonical notation for relation morphisms over carriers.

The base is richer in several important ways.

### 3.1 Typed proof-core

RMN carries a simply typed lambda calculus spine with products and unit.
This matters because some RMN terms are not merely executable; in the CHL core they can be read as proofs under Curry–Howard.

This gives RMN a proof-adjacent floor.
The evaluator can run more than the proof-core, but the checker can distinguish the proof fragment from domain computation.

This separation is important.
It prevents the system from pretending every executable term is a proof.
Domain primitives such as charge, mark, field, append, coincide, and fold are executable relation operations, but they are not automatically proof-core inhabitants.

That distinction is unusually mature for a small tool language.
It supports a future in which tools carry both executable bodies and, for certain fragments, checkable proof witnesses.

### 3.2 Totality pressure

RMN Core is shaped toward total computation.
The current structural recursion primitive is a fold over admitted array carriers.
This is much closer to total functional programming than to arbitrary host-language scripting.

This matters for agents because arbitrary execution power is a liability.
The point is not to let agents download arbitrary plugins and run them with ambient authority.
The point is to let agents run bounded, deterministic, pure relation morphisms whose effects are explicit at the boundary.

A small total calculus is much easier to sandbox, port, inspect, and reason about than a general-purpose scripting language.

### 3.3 Carrier awareness

Lisp traditionally operates over its own data structures.
RMN operates over carriers admitted from JSON and decoded back into JSON.
The carrier bridge is not an incidental serialization trick.
It is the boundary law that lets RMN live inside an action system.

The bridge says:

```text
JSON carrier input
  → admitted RMN term
  → evaluation
  → carrier-decodable normal form
  → JSON carrier output
```

This means RMN terms are not merely symbolic programs.
They are morphisms over a transport-neutral carrier universe.

### 3.4 Domain primitives

RMN includes relation-domain primitives that are not standard Lisp features:

```text
mark
charge
generator
settle
coincide
field
append
cond
fold
FOUR-valued operations
knowledge/truth order operations
```

This gives the notation a domain-specific mathematical base.
It is not merely cons cells and lambda.
It has a built-in relation substrate.

The FOUR charge algebra is particularly important.
It means RMN does not collapse truth-like computation into Boolean evaluation.
It can directly express paraconsistent and bilattice-valued operations, including knowledge-order and truth-order joins/meets.

For agent tools, this is not decorative.
Agents regularly operate under incomplete, inconsistent, or contested information.
A Boolean substrate is often too brittle.
RMN begins with a richer base of value.

### 3.5 Morphism publication, not interactive programming

Lisp is usually experienced as a language for programming.
RMN should be positioned as a notation for publishing morphisms.

That changes the design target.
RMN does not need every convenience of a source language.
It needs a small canonical core that many runtimes can agree on.
The nice-to-type Lispy surface can come later and compile down to RMN.

The right division is:

```text
Relation Modeling Language source = what humans write
Relation Model Notation = what travels
RMN evaluator = what runtimes implement
Relating action = where RMN lives as a tool body
```

That is a stronger architecture than trying to make RMN itself pleasant to author.

---

## 4. The Closest Analogue: WebAssembly, But for Relation Morphisms

A useful comparison is WebAssembly.
WASM provides a portable compilation target that can be run in multiple environments.
It is sandboxable, deterministic within its model, and widely implementable.

RMN could play a similar role for agent tools, but at a much higher semantic level.

WASM says:

```text
Here is portable low-level code.
Run it safely and efficiently.
```

RMN says:

```text
Here is a portable relation morphism.
Run it, inspect it, compose it, and preserve its carrier semantics.
```

This is not a replacement for WASM.
It occupies a different layer.

WASM is good when you want efficient portable computation.
RMN is good when you want semantic transparency, carrier preservation, compositionality, and tool algebra.

A WASM module does not naturally tell you:

```text
my domain carrier is X
my codomain carrier is Y
I am a relation descent
I preserve this structure
I am pure over admitted carriers
I compose with tools whose domain equals my codomain
```

RMN can.

That makes RMN a better substrate for agentic capability exchange, where the central issue is not raw speed but intelligibility and safe composition.

The phrase “agent tool bytecode” is tempting.
But bytecode suggests low-level execution.
RMN should be described more carefully as:

> High-level semantic bytecode for portable relation morphisms.

Or:

> A carrier-aware virtual machine for self-describing tools.

The second phrase is more accurate.

---

## 5. The Agent Tool Bytecode Thesis

The strongest implementation thesis is:

> RMN should become the preferred bytecode for pure agent tools.

In this model, an agent runtime classifies tools into two broad classes:

```text
Boundary tools:
  Effectful tools that touch the world:
  filesystem, network, email, calendar, database, wallet, sensors, robotics.

RMN tools:
  Pure relation morphisms over carriers:
  transformations, projections, judgments, classifications, closures, readers, analyzers.
```

Boundary tools remain host-mediated.
They cannot be safely reduced to pure RMN because their purpose is to produce or observe effects.

But most interior tool logic does not need to be opaque host code.
It can be RMN.

This yields an architecture:

```text
effectful boundary
  → admitted carrier
  → RMN interior morphism graph
  → carrier output
  → effectful boundary, if needed
```

Instead of every tool being an opaque RPC call, the tool ecology becomes stratified:

```text
opaque effects only at the boundary
pure morphisms in the middle
portable RMN bodies wherever possible
```

This is exactly the discipline agent systems need.
It gives the runtime a basis for local execution, auditability, caching, composition, replay, and safety analysis.

---

## 6. The Core Object: A Typed Executable Morphism Packet

The game-changing implementation should not merely be an interpreter.
The interpreter is necessary, but the actual object to build around is the **typed executable morphism packet**.

A morphism packet contains:

```text
identifier
version
domain carrier id
codomain carrier id
input codec(s)
output codec(s)
RMN body
human summary
machine-readable description
conformance profile
optional proof-core declarations
test vectors
hash/canonical digest
```

This packet is what a registry publishes, what an agent downloads, what a runtime verifies, and what another tool can compose.

A minimal packet might look conceptually like:

```json
{
  "kind": "relating.morphism.packet",
  "id": "example/conflate-charge",
  "version": "0.1.0",
  "domain": "relating/articulating/predicating/positing/charge-value-name",
  "codomain": "relating/articulating/predicating/positing/charge-value-name",
  "bodyFormat": "rmn-core-0.1",
  "body": ["lam", ["conflate", ["var", 0]]],
  "purity": "pure",
  "totality": "structural",
  "conformance": ["RMN-Syntax", "RMN-Eval", "RMN-Carrier", "RMN-Action"]
}
```

The key is that the packet is not merely documentation.
The packet is executable.

An agent runtime that receives this packet can run it without the original server, assuming it trusts the packet source or verifies its digest and conformance.

This gives agent systems a new unit of capability exchange.

---

## 7. Discovery Becomes Semantic Discovery

Current tool discovery is largely lexical and schematic.
A client sees names, descriptions, and JSON schemas.

With RMN, discovery can become semantic.

A discovery client can ask:

```text
Which actions have RMN bodies?
Which actions are pure?
Which actions are boundary-only?
Which actions compose by carrier identity?
Which actions are just projections?
Which actions are folds?
Which actions branch on coincidence?
Which actions use FOUR charge operations?
Which actions are identity morphisms?
Which actions are structurally equivalent?
Which actions have changed semantically since the last version?
```

This is not fantasy.
These are syntactic and semantic queries over the RMN body and carrier declarations.

That makes possible a new kind of agent tool browser:

```text
not just “available tools”
but “available morphisms”
```

The registry becomes a category-like surface.
Actions are arrows.
Carriers are objects.
RMN bodies are executable arrow terms.
Composition is not merely orchestration; it is algebraic construction.

A discovery client can build a graph:

```text
Carrier A --f--> Carrier B --g--> Carrier C
```

and synthesize:

```text
g ∘ f : Carrier A → Carrier C
```

as a new RMN action body.

That synthesized composite can itself be published as a tool.

This is the heart of the game changer:

> Tool ecologies can metabolize themselves.

---

## 8. Composition as a First-Class Operation

The first flagship implementation should demonstrate composition.

Given two RMN action packets:

```text
f : A → B
g : B → C
```

the system should synthesize:

```text
g ∘ f : A → C
```

If each action body is a unary lambda:

```text
f = λx. bodyF
g = λy. bodyG
```

then a composite can be represented as:

```text
λx. g(f(x))
```

In RMN:

```json
["lam", ["app", g, ["app", f, ["var", 0]]]]
```

More carefully, a production implementation should avoid variable capture and may inline or reference body terms depending on packet format.
But the basic composition law is direct.

This gives you several immediate product features:

```text
compose two tools
compose a whole pipeline
check carrier compatibility
normalize the composite
export composite as a new action
publish composite through every transport
log composite invocation as one play
expand composite for audit
```

Imagine an MCP client that connects to two servers, downloads their RMN-capable discovery surfaces, finds compatible tools, and offers:

```text
I can compose these three operations into a local pure tool.
Run locally? Publish as new tool? Save to registry?
```

That is not how current tool ecosystems behave.

Current agents chain tools by prompt-level planning.
RMN enables tool chaining at the morphism level.

---

## 9. Local Execution and Partial Decentralization

If a tool body is RMN and pure, the client does not necessarily need to call the server.

This has major consequences.

### 9.1 Reduced latency

Pure tools can be run locally.
The agent avoids network round trips.

### 9.2 Offline operation

If an agent has cached the morphism packet and carrier schemas, it can run pure tools offline.

### 9.3 Reduced server costs

Hosts can publish semantic tools once and let clients execute them locally.

### 9.4 Better auditability

The client can inspect the exact term it will run.

### 9.5 Deterministic replay

A log containing input, output, timestamp, action metadata, and RMN body can be replayed.

### 9.6 Selective trust

The client can trust a server only for boundary admissions and effectful operations, while independently executing interior morphisms.

This is a powerful split:

```text
trust the server for effects
trust the RMN evaluator for pure morphism execution
```

That is far better than trusting the server for everything.

---

## 10. Logs That Contain the Morphism

Action logs usually record something like:

```text
caller
tool name
arguments
result
timestamp
```

That is not enough for deep replay.
If the tool implementation changes later, the log no longer fully determines what happened.

RMN allows a stronger log:

```text
caller
action declaration
domain/codomain
RMN body
input
output
timestamp
```

A log row can carry the actual morphism body used at the time of invocation.

This turns logs into semantic witnesses.

A future auditor can ask:

```text
What action was invoked?
What RMN body did it carry?
What input carrier was admitted?
What output carrier was produced?
Does re-evaluation reproduce the output?
Did the action body differ from the current version?
Was the morphism pure?
Was this a boundary play or an interior morphism?
```

For serious agent systems, this is a substantial advance.
It moves from observability to replayable semantic accountability.

This is especially important for any domain where agents are making consequential transformations: finance, law, research, governance, software deployment, editorial pipelines, blockchain operations, robotics, or infrastructure automation.

---

## 11. RMN and Proof-Carrying Tools

RMN should not overclaim proof.
Not every RMN term is a proof.
Domain operations are executable but not automatically proof-core terms.

That restraint is exactly what makes the proof story credible.

RMN has a typed CHL core.
Within that core, terms can be checked as inhabitants of types.
Under Curry–Howard, a well-typed term can be read as a proof of its type-as-proposition.

This supports a future concept of **proof-carrying tool fragments**.

A tool packet might include:

```text
executable RMN body
proof-core witness of some invariant
conformance vectors
carrier declarations
```

For example, a tool might not prove its entire domain behavior, but it may include proof-core witnesses for structural identities, product laws, or compositional claims.

The product idea is not “all tools are formally verified.” That would be unrealistic.

The product idea is:

```text
Some fragments are executable.
Some fragments are checkable.
Some fragments are both.
The system knows which is which.
```

That is a practical proof-adjacent design.

It allows an incremental path:

```text
1. publish executable RMN bodies
2. add conformance vectors
3. add syntax/type validators
4. add proof-core witnesses
5. add domain-specific typed extensions
6. add theorem-backed optimizing passes
```

This is much more plausible than demanding full verification upfront.

---

## 12. Comparison to Existing Tool Standards

### 12.1 OpenAPI

OpenAPI describes HTTP APIs: paths, methods, request bodies, responses, schemas, security, and metadata.

OpenAPI is boundary-oriented.
It tells a client how to call a service.
It does not normally carry the executable semantics of the service.

RMN complements OpenAPI by supplying the body of pure actions.

A Relating-style system can project an RMN-backed action to OpenAPI, but the OpenAPI surface is just one projection.
The action itself is richer than the OpenAPI operation.

### 12.2 MCP

MCP standardizes how models and clients discover and call tools, resources, and prompts.
It is a major step toward agent tool interoperability.

But MCP tools are still generally opaque.
They provide names, descriptions, schemas, and invocation mechanisms.

RMN can make MCP tools semantically portable.

An RMN-capable MCP server could expose:

```text
tools/list:
  includes ordinary tool schema
  includes or links RMN morphism packet for pure tools

resources/list:
  includes carrier schemas
  includes RMN conformance vectors
  includes discovery carrier

tools/call:
  may be bypassed for pure RMN tools if client chooses local evaluation
```

This creates a tiered MCP ecology:

```text
opaque MCP tools
RMN-described MCP tools
locally executable RMN MCP tools
proof-core-checkable RMN MCP tools
```

The upgrade path is incremental.

### 12.3 WebAssembly

WASM is portable low-level code.

RMN is portable high-level relation semantics.

WASM is excellent for performance and language portability.
RMN is excellent for inspectability, carrier semantics, and morphism composition.

They could coexist.
A future runtime might compile RMN to WASM for speed.
But RMN should remain the canonical semantic form.

### 12.4 Smart contracts

Smart contracts are executable code published into a shared environment.
They are inspectable and deterministic, but they are usually tied to a blockchain execution model and global state.

RMN is not a smart contract language.
It does not define consensus, accounts, gas, or persistent global state.

However, RMN can learn from smart contracts: publishing executable semantics matters.

The difference is that RMN is for pure relation morphisms in tool ecologies, not necessarily for adversarial global settlement.

### 12.5 Lisp and Scheme

Lisp gives homoiconic symbolic computation.

RMN gives canonical relation-morphism notation.

A future RML surface may be Lispy, but RMN itself should remain a small canonical JSON form.
This allows many independent interpreters and conformance suites.

The Lisp lineage is aesthetic and structural.
The RMN goal is infrastructure.

---

## 13. The First Game-Changer Demo

The demo should be as concrete as possible.

### Demo title

**Portable Tool Semantics: Local Execution and Composition of RMN-Capable MCP Tools**

### Setup

Two RMN-capable tool servers expose discovery surfaces.

Server A publishes:

```text
utter : Mark × Mark → Utterance
articulate : Utterance → ArticulationCell
predicate : ArticulationCell → PredicationSite
```

Server B publishes:

```text
posit : PredicationSite → PositPresheaf
settle : PositPresheaf → SettlementFiltration
read-classification : SettlementFiltration → SettlingClassification
```

Each pure action includes:

```text
carrier domain
carrier codomain
RMN body
conformance profile
```

### Client behavior

The client downloads both discovery surfaces.

It finds composable actions:

```text
utterance → articulation → predication → posit → settle → classification
```

It synthesizes a composite RMN body:

```text
readClassification ∘ settle ∘ posit ∘ predicate ∘ articulate
```

It publishes the composite locally as:

```text
classify-utterance : Utterance → SettlingClassification
```

It exposes that composite as:

```text
CLI command
HTTP endpoint
MCP tool
OpenAPI path
```

It runs the composite locally, without calling either server for the interior pure morphisms.

It logs the invocation with:

```text
input
output
composite RMN body
component action references
timestamp
caller
```

### Why this demo matters

This demonstrates all the unique claims:

```text
tool semantics travel
pure tools run locally
tools compose by carrier identity
composites become new tools
logs contain executable morphism bodies
transports are projections, not the core
```

This is the head-snap moment.

It shows that RMN is not just a notation.
It is a substrate for tool ecologies that can build new tools out of existing tools.

---

## 14. The Minimal Implementation Stack

A practical first implementation should have five parts.

### 14.1 RMN Core Library

This library implements:

```text
Ty validation
Tm validation
canonical JSON
carrierToTerm
termToCarrier
evaluate
evaluateRunTerm
structural equality
FOUR charge tables
field/append/coincide/cond/fold
resource limits
error classes
```

This exists in TypeScript already in seed form.
The next step is to turn it into a crisp reference implementation with a formal spec and test suite.

### 14.2 RMN Conformance Suite

The conformance suite should include JSONL vectors:

```text
syntax-valid.jsonl
syntax-invalid.jsonl
eval-chl.jsonl
eval-domain.jsonl
carrier-roundtrip.jsonl
fold.jsonl
action-runterm.jsonl
proof-core.jsonl
composition.jsonl
```

Each vector should include:

```json
{
  "schema": "rmn/conformance/vector",
  "class": "RMN-Eval",
  "name": "conflate-stable",
  "input": ["conflate", ["charge", "stable"]],
  "output": ["charge", "absurd"]
}
```

For action vectors:

```json
{
  "schema": "rmn/conformance/action-vector",
  "name": "identity-object",
  "runTerm": ["lam", ["var", 0]],
  "input": {"b":2,"a":1},
  "output": {"a":1,"b":2}
}
```

The suite should be language-neutral.
Every interpreter must pass the same vectors.

### 14.3 RMN Inspector

An inspector CLI should show:

```text
term validity
free variables
closed/unclosed status
opcode inventory
fold usage
field accesses
charge operations
estimated cost
carrier-decodability of sample output
possible composition signatures
```

Example:

```text
rmn inspect action.rmn.json
```

Output:

```text
valid: yes
closed: yes
shape: unary lambda
uses: field, object construction, append
domain: predication.site
codomain: predication.posit.presheaf
purity: pure
```

This is important because RMN’s value is not merely that it runs.
Its value is that it can be inspected.

### 14.4 RMN Composer

A composer should accept action packets and synthesize composites.

Example:

```text
rmn compose articulate predicate posit settle \
  --name induce-relation \
  --out induce-relation.packet.json
```

It should:

```text
check codomain/domain compatibility
build composite RMN body
preserve metadata
include component references
run sample vectors
emit a new morphism packet
```

This is the technical heart of the “tool ecology metabolizes itself” claim.

### 14.5 RMN-Aware Discovery Client

A client should ingest Relating/MCP/OpenAPI-like discovery surfaces and extract RMN-capable actions.

It should support:

```text
list pure RMN tools
run pure tool locally
fall back to server call
compose local tools
publish composite
verify conformance profile
```

This client is the bridge from current tool infrastructure to RMN-native tool infrastructure.

---

## 15. Implementation Roadmap

### Phase 0: Name and Spec Stabilization

Deliverables:

```text
RMN Core v0.1 spec
terminology cleanup
README rewrite
docs/rmn.md
docs/rmn-core.md
docs/rmn-conformance.md
```

Key naming decisions:

```text
Relation Model Notation = canonical notation
RMN Core = current JSON s-expression core
runTerm = action-carried RMN term
Relation Modeling Language = future human-friendly source language
```

Avoid calling RMN merely “IR” in public docs. “IR” is acceptable internally during migration, but externally it undersells the object.

### Phase 1: Reference Interpreter Hardening

Deliverables:

```text
standalone @emsenn/rmn-core package or subpath
strict validators
clear error classes
fuel/resource limits
canonical JSON tests
carrier bridge tests
full FOUR tables
fold tests
```

The goal is to make the TypeScript implementation obviously usable as a reference interpreter.

### Phase 2: Conformance Vectors

Deliverables:

```text
test/vectors/rmn-core/*.jsonl
conformance runner
machine-readable conformance report
Lean-derived vectors where available
cross-check vectors for carrier bridge
```

The aim is to allow another implementer to write a Python or Rust interpreter without reverse-engineering the TypeScript.

### Phase 3: RMN Action Packets

Deliverables:

```text
morphism packet schema
packet canonical hash
packet validator
packet examples
packet signing placeholder
packet registry format
```

The action packet is the exchange unit.

### Phase 4: Inspector and Composer

Deliverables:

```text
rmn inspect
rmn compose
rmn normalize
rmn eval
rmn run-action
```

The demo becomes possible here.

### Phase 5: Multi-Language Interpreters

Start with:

```text
TypeScript reference
Python interpreter
Rust interpreter
Lean evaluator/spec relation
```

The Python interpreter is for adoption and experimentation.
The Rust interpreter is for embedding and performance.
The Lean relation is for proof authority.

### Phase 6: RMN-Capable MCP/Agent Demo

Deliverables:

```text
RMN-capable MCP server
RMN discovery resource
RMN local execution client
RMN composition demo
composite republishing demo
EAVT replay demo
```

This is the first serious public demonstration.

---

## 16. Research Questions

RMN opens several research directions.

### 16.1 What is the right type system for domain primitives?

The current proof-core is intentionally conservative.
Domain primitives execute but are not proof-core terms.

Future work can ask:

```text
Can charge operations receive types?
Can carrier schemas induce RMN types?
Can field projection be typed by object carrier schemas?
Can fold be typed by array carrier schemas?
Can domain/codomain carrier ids become propositions?
```

A gradual path is best.
Avoid prematurely pretending the whole domain calculus is fully typed.

### 16.2 Can schemas become types?

Currently carrier schemas and proof-core types are different layers.

A research direction is to define a bridge:

```text
JSON Schema carrier → RMN structural type
```

This would allow stronger static checks:

```text
field access validity
array fold element type
codomain decodability
composition safety beyond carrier id equality
```

But JSON Schema is complex.
A restricted carrier type calculus may be preferable.

### 16.3 Can RMN terms be normalized and compared semantically?

Structural equality of terms is easy.
Semantic equivalence is hard.

But for RMN’s small total core, many useful equivalences may be decidable or testable:

```text
identity elimination
composition associativity
constant folding
charge table normalization
field projection over object literals
append over array literals
fold over array literals
```

A normalizer could support semantic diffing:

```text
this action changed only by inlining
this action changed charge behavior
this action added a field dependency
this action is extensionally equivalent over supplied vectors
```

### 16.4 What is the right cost model?

Agents need to know whether local execution is cheap.

RMN can support a simple cost model:

```text
term size
number of applications
fold over array length
field lookups
append sizes
normalization steps
```

This can support safe local execution and prevent resource attacks.

### 16.5 Can RMN support partial evaluation?

Given a composite tool with known constants, RMN can partially evaluate the term before publishing.

This would allow:

```text
specialized tools
optimized pipelines
precomputed static portions
smaller action packets
```

Partial evaluation is especially promising because RMN is pure and carrier-structured.

### 16.6 Can RMN become a categorical query language?

The carrier/action graph suggests categorical querying:

```text
find all paths from A to B
find all endomorphisms on A
find all actions preserving a carrier invariant
find all composites yielding C
find all tools whose body factors through B
```

This is more than API discovery.
It is morphism discovery.

### 16.7 Can logs become proof obligations?

If a log includes an RMN body, input, and output, replay can verify the output.

A stronger future system might attach obligations:

```text
output must equal evaluate(body, input)
body hash must match packet hash
packet domain must match input carrier
packet codomain must decode output
```

Then each invocation log becomes a checkable witness.

---

## 17. Risks and Failure Modes

### 17.1 Overclaiming formal verification

The most serious narrative risk is claiming RMN “proves tools correct.” It does not, by itself.

RMN makes tools inspectable and portable.
The proof-core can check some terms.
Conformance vectors can test implementations.
Domain theorems can support certain operations.
But full correctness requires additional specifications and proofs.

The correct claim is:

```text
RMN creates a path from opaque tools toward proof-adjacent, testable, portable semantics.
```

### 17.2 Making RMN too large

The core must stay small.
If every convenience becomes a core opcode, multi-language implementation becomes harder.

Keep RMN Core minimal.
Put conveniences in the human-facing source language.

### 17.3 Confusing RMN with the source language

RMN should remain canonical notation.
It should not be optimized for hand authoring.

The Lispy surface language can be beautiful.
RMN should be boring, stable, and precise.

### 17.4 Underdeveloped tooling

The idea only becomes real when developers can inspect, run, compose, and test RMN terms easily.

A spec without tooling will feel academic.
The inspector and composer are essential.

### 17.5 Carrier schema complexity

If RMN tries to absorb all of JSON Schema’s complexity into its type system, the project may stall.

Use carrier ids and runtime validation first.
Add typed schema fragments later.

### 17.6 Performance

A naïve interpreter may be slow for large folds or deeply nested terms.

This is acceptable for early use.
Later runtimes can add:

```text
normalization caches
bytecode
JIT compilation
WASM compilation
Rust interpreter
partial evaluation
```

But the first goal is semantic portability, not speed.

---

## 18. Product Positioning

The product should not be introduced as:

```text
a Lisp
an IR
a DSL
a JSON evaluator
a toy language
```

It should be introduced as:

```text
portable tool semantics
semantic action bodies
relation-model bytecode
a carrier-aware VM for agent tools
self-describing morphism packets
```

Possible slogans:

```text
Tools whose semantics travel with them.

An endpoint is one projection of an action.

Publish the morphism, not just the route.

Agent tools should be inspectable, composable, and replayable.

RMN is how relation models move.

Opaque tools are endpoints. RMN tools are morphisms.
```

The strongest short pitch:

> RMN lets an agent receive a tool and inspect, run, compose, cache, replay, or republish the tool’s actual relation body—not merely call an opaque endpoint.

The strongest technical pitch:

> RMN is a JSON-native, typed, total, carrier-aware notation for executable relation morphisms, designed as a portable semantic substrate for agent tool systems.

The strongest infrastructure pitch:

> RMN turns tool registries from catalogs of endpoints into categories of executable morphisms.

---

## 19. Strategic Importance

The AI tool ecosystem is moving quickly toward standard tool protocols.
But standardizing calls is not enough.
If every tool remains an opaque server function, agents will inherit the worst properties of the API economy:

```text
brittle orchestration
uninspectable behavior
duplicated wrappers
shallow schemas
weak replay
hard-to-audit transformations
trust-heavy execution
```

RMN offers a different path.

It says: pure tool logic should travel as data.

That does not eliminate the need for servers, permissions, credentials, or boundary effects.
But it radically clarifies where trust is required.

A mature RMN tool ecology would have:

```text
effectful boundary tools for world access
pure RMN tools for interior relation transformations
portable morphism packets for discovery
composition by carrier identity
local execution where possible
logs that include executable bodies
conformance suites across languages
proof-core checking for selected fragments
```

This is a plausible substrate for agent systems that are safer, more inspectable, more portable, and more capable of building on their own tools.

The long-term vision is not merely that agents call RMN tools.

The long-term vision is that agents can reason about tools as algebraic objects.

That means agents can ask:

```text
What can I compose?
What can I run locally?
What changed?
What is pure?
What is boundary-effectful?
What is replayable?
What is equivalent?
What is proven?
What is only tested?
What carrier does this produce?
What tools become available after this morphism?
```

This is the difference between tool use and tool understanding.

---

## 20. The Big Implementation

The big thing to build is:

# The RMN Semantic Tool Runtime

Its responsibilities:

```text
ingest tool discovery
extract RMN action packets
validate RMN syntax
verify conformance profile
inspect action bodies
run pure actions locally
compose compatible actions
publish composites as new tools
log invocations with RMN bodies
replay logs deterministically
fall back to boundary calls for effects
```

A minimal MVP could be:

```text
rmn eval
rmn inspect
rmn compose
rmn packet validate
rmn packet run
relating serve --publish-rmn
rmn-mcp-client --local-pure-tools
```

The flagship flow:

```text
1. Start two RMN-capable servers.
2. Client fetches both discovery surfaces.
3. Client finds composable RMN tools.
4. Client synthesizes a composite.
5. Client runs the composite locally.
6. Client republishes the composite as a new MCP tool.
7. Client logs the invocation with full RMN body.
8. Replay verifies the output.
```

This demonstrates the full thesis.

If successful, RMN becomes not just a feature of Relating but a portable layer other systems can implement.

---

## 21. Conclusion

RMN’s significance is easy to miss if it is described as an internal representation.
It is not merely an IR.
It is the canonical portable notation for executable relation models.

It is Lisp-like, but richer in the direction that matters for agent infrastructure: typed proof-core, totality pressure, carrier admission, paraconsistent value primitives, structural recursion, deterministic evaluation, action-body embedding, transport-neutral projection, and conformance testing.

The major implementation opportunity is to make RMN the semantic substrate for agent tools.

Instead of opaque endpoints, tools can become self-describing morphism packets.
Instead of prompt-level orchestration alone, agents can compose tools algebraically.
Instead of trusting every server-side closure, clients can run pure RMN bodies locally.
Instead of logs that merely name a tool, logs can include the actual morphism body used.
Instead of registries of routes, we can have categories of executable relation models.

The game changer is not that RMN is a new programming language.

The game changer is that RMN lets the semantics of a tool travel with the tool.

That enables a tool ecology that can inspect itself, compose itself, replay itself, and eventually reason about itself.

That is the thing to build.
