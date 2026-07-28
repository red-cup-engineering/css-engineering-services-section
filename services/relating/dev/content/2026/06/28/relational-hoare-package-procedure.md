# Relational Hoare procedure for Node package structure

This procedure classifies a Node package from the relational quality of its
functions, not from its current folders, product names, or framework habits.

It applies to any package.
The package can be a library, service, app, CLI, framework plugin, data tool, or
mixed historical pile. The only required input is the set of functions the
package actually depends on: exported functions, process entrypoints, handlers,
codecs, validators, constructors, evaluators, renderers, and meaningful internal
helpers whose postconditions other code relies on.

## Core reading

Every function is read as a relational Hoare triple:

```text
{ admitted material, available world, constraints, history }
  operation
{ resulting material, changed world, boundary observation, witness }
```

Equivalently:

```text
{ P(M, W, H) } f { Q(M', W', B, E) }
```

Where:

- `M` is relational material: support, ports, fibers, charges, values,
  constraints, possible motions, closures, and phase laws.
- `W` is the host world: files, sockets, clocks, argv, environment variables,
  package manifests, dynamic imports, stores, devices, user sessions, and
  processes.
- `H` is history: prior exposures, ledgers, caches, transactions, revisions,
  traces, and observations already made.
- `B` is boundary: what an observer is allowed to see without possessing the
  whole material.
- `E` is evidence: the witness that this operation happened under this aperture,
  lens, phase, and boundary.

The placement question is not "what is this function about?"
It is:

> What kind of world must be present for this triple to be true, and what kind of
> witness does the postcondition produce?

## The classification axes

For each function, write down the smallest honest triple.
Then classify the triple along these axes.

### 1. Precondition substrate

```text
only admitted values and mathematical constraints  -> material
package symbols, runtime validators, module forms  -> package phase
argv/files/sockets/env/clock/process/network        -> live exposure
screen/session/interaction/inspector state          -> optics
```

If a function can be stated over admitted values without mentioning Node,
filesystem, package exports, UI state, or a running process, its precondition is
material.

If the precondition is about ESM symbols, schemas as runtime values, generated
declaration files, package-local registries, or importable normal forms, its
precondition is package phase.

If the precondition requires a host fact, the function is an exposure aperture or
live dynamic.

If the precondition requires an authored observer position, viewport, selection,
interaction flow, or inspection session, the function is optical.

### 2. Postcondition product

```text
new admissible material / law / certificate         -> material
validated carrier / codec result / normal form      -> package phase
host mutation / served endpoint / persisted record  -> live exposure
rendered boundary / navigable view / interaction    -> optics
```

The postcondition decides placement more strongly than the function's inputs.
A parser over a string may still be package phase if its product is a wire-format
normal form. A renderer over pure data is optics if its product is an authored
boundary view. A function that returns JSON but also writes a file is not pure
because the postcondition includes a changed host world.

### 3. World frame

Ask what remains unchanged.

```text
W' = W, H' = H                              -> pure material or package phase
W' = W, H' extends by derivable witness      -> material with history law
W' changes in host-observable ways           -> live exposure
W' may not change, but observer state changes -> optics
```

A function with the same value input and output can still be in different roots
depending on frame:

```text
normalizeTerm(term)               -> material or package phase
normalizeTermFromFile(path)       -> live exposure
showNormalizedTermInWorkbench(x)  -> optics
```

### 4. Totality and failure

```text
total over admitted material                    -> material law
partial because input is not admitted            -> admission or codec
partial because host world may fail              -> service
partial because observer action may be invalid   -> app
```

Do not hide partiality in a generic helper bucket.
Failure says which aperture was crossed.

If failure means "this value is not a member of the carrier", the function is
admission, validation, or codec realization.

If failure means "the host did not provide the promised world", the function is a
service.

If failure means "the observer asked for an unavailable projection", the function
is an app or projection surface.

### 5. Motion

```text
no motion; only relation-preserving transform     -> material or package phase
closure/settling/descent over configurations      -> material
dispatch over registered actions                  -> package phase
process lifecycle, polling, serving, watching     -> service
navigation, comparison, staged intervention       -> app
```

Motion is not automatically "service".
Intrinsic motion of relational material belongs with the material law.
Host motion belongs to services.
Observer motion belongs to apps.

### 6. Boundary and visibility

```text
bulk material can be inspected directly            -> material/package phase
only a projection is returned                      -> projection/optics
projection is protocol/wire shaped                 -> package phase codec
projection is served live                          -> service
projection is authored for human navigation        -> app
```

Boundary observation without bulk access is a first-class computational regime.
Do not demote it to "display code" unless the postcondition is merely pixels.

### 7. Evidence

```text
certificate of law / obstruction / invariant       -> material
receipt of validation / decoding / evaluation      -> package phase
exposure ledger row / trace / persisted witness    -> service or store surface
interaction trace / inspection annotation          -> app
```

The evidence type is often the cleanest placement signal.
If the witness proves a law, it is material.
If it proves the package realized a law on a value, it is package phase.
If it proves something happened in the host world, it is a service witness.
If it proves what an observer saw or did, it is optical evidence.

## Root assignment

After classifying triples, assign roots by existence mode:

```text
material law        -> lib/
package realization -> src/
live exposure       -> services/
authored optics     -> apps/
```

These names are not mandatory for every package in the ecosystem, but the modes
are mandatory if the package has those triples. A package that does not ship an
app has no `apps/`. A pure package may have no `services/`. A service-only
package still has material triples inside it; the procedure will usually split
those into a package-local `lib/` or an upstream shared package.

## Splitting rule

A single function whose triple crosses modes must be split at the first changed
world.

```text
read file -> parse -> validate -> settle -> render -> write response
```

becomes:

```text
service aperture: read file or request body
src codec: parse wire material
src admission/carrier: validate admitted material
lib law: settle or derive
src projection: produce boundary representation
service endpoint: write response
app optic: authored inspection or interaction, if present
```

Mixed functions are not "impure utilities".
They are uncut exposure chains.

## Directory derivation procedure

1. Inventory every meaningful function without using current directories as
   evidence.
2. For each function, write the smallest relational Hoare triple.
3. Mark every mention of `W`, `H`, `B`, and `E` in the triple.
4. Classify the precondition substrate, postcondition product, world frame,
   failure mode, motion, boundary, and evidence.
5. Assign the function to the earliest root that can state the triple honestly:
   `lib/`, `src/`, `services/`, or `apps/`.
6. If no single root can state the triple honestly, split the function into
   consecutive triples and classify each piece.
7. Name directories by the invariant being produced, not by a product nickname.
8. Export only stable phase surfaces from the package manifest. Services become
   bins or process mounts. Apps become separate shipped surfaces only when they
   are meant to be consumed as apps.
9. Add a boundary check that forbids lower roots from importing higher roots.

The import direction follows the triple dependency:

```text
apps      may depend on src/lib and remote service boundaries
services  may depend on src/lib
src       may depend on lib
lib       may depend only on lib and external pure dependencies
```

`lib/` cannot import `src/`, because material law cannot depend on package
realization.

`src/` cannot import `services/`, because package phase cannot depend on a live
host exposure.

`services/` cannot import `apps/`, because a process aperture cannot depend on a
particular authored observer.

## Audit record template

Use one record per function or per tightly coupled function family:

```text
symbol:
current path:
callers:

triple:
  precondition:
  operation:
  postcondition:
  world frame:
  witness:

classification:
  precondition substrate:
  postcondition product:
  failure mode:
  motion:
  boundary:
  evidence:

forced placement:
split required:
new symbols:
export status:
verification:
```

## Placement tests

A placement is wrong if any of these are true:

- The function needs host facts but lives below the host boundary.
- The function states a mathematical law but imports package registries,
  process APIs, or app state.
- The function's postcondition is a boundary projection, but it is named as if it
  were the material itself.
- The function produces a witness, but the witness is thrown away or hidden as
  incidental logging.
- The function validates admission and performs host I/O in one unbroken body.
- The function is placed by topic label rather than by the triple it realizes.

## Worked miniature

```text
assertUserRecord(value)
```

Triple:

```text
{ unknown value, carrier schema available as package symbol }
  assertUserRecord
{ admitted UserRecord or validation failure receipt }
```

Placement: `src/admission` or `src/carriers`.
It is not material law, because the precondition requires a runtime package
schema and the postcondition is admission into the package phase.

```text
mergeUserRecords(a, b)
```

Triple:

```text
{ admitted UserRecord a and b, merge constraints }
  mergeUserRecords
{ admitted UserRecord c, merge certificate or obstruction }
```

Placement: `lib/`.
It is material law if no host world, registry, or observer state is required.

```text
mergeUserRecordsFromDisk(pathA, pathB, outPath)
```

Triple:

```text
{ filesystem paths exist, process can read/write }
  mergeUserRecordsFromDisk
{ output file changed, exposure ledger receipt }
```

Placement: `services/`.
The material merge inside it must be factored out.

```text
showMergeConflict(recordA, recordB, obstruction)
```

Triple:

```text
{ admitted records, obstruction, observer session }
  showMergeConflict
{ navigable boundary view of the obstruction }
```

Placement: `apps/`.
It is optics over material, not the material itself.

## Relation to ordinary computation

Classical computation is the special case where triples are fully observed,
strictly finite, low-contradiction, crystalline, normal-form-oriented, and
function-like:

```text
{ input value } deterministic transform { output value }
```

This procedure does not assume that special case.
It also handles triples where settlement does not collapse, contradiction is
preserved as structure, only a boundary is observable, identity moves through a
history, or coherence failure is the significant result.

That is why the procedure asks about material, world, boundary, and witness.
Those are the parts ordinary function signatures erase.
