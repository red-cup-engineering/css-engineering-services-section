---
title: "Social consensus as sheaf gluing"
subtitle: "Disagreement, CRDT merge, and coordination as separate invariants"
date: 2026-06-26
status: "public standalone draft"
tiles:
  - socializing
  - communicating
  - knowing
keywords:
  - social consensus
  - sheaf theory
  - CRDT
  - CALM theorem
  - discourse sheaves
  - distributed systems
  - paraconsistency
  - federation
---

# Social consensus as sheaf gluing

## Abstract

Distributed social systems often conflate three questions: whether local participants agree, whether replicated state will converge, and whether a coordination protocol is required.
This paper separates them.
We model a social system as an observer category equipped with local states and translation maps: each observer holds a stalk of claims, channels supply restriction or translation morphisms, and consensus is the existence of a global section.
In this framing, disagreement is not merely pairwise difference; it is an obstruction to gluing.
Conflict-free replicated data types (CRDTs) appear as monotone accumulation along a knowledge order, with merge computing a least upper bound.
The CALM theorem supplies the distributed-systems boundary: monotone programs are exactly those admitting coordination-free consistent implementations.
The resulting picture has two orthogonal axes.
The static axis asks whether a cover of observer states glues, measured by a cohomological obstruction.
The dynamic axis asks whether the update regime is monotone enough to converge without coordination.
Agreement can fail while monotone merge remains coordination-free; conversely, local agreement can hold inside a regime whose future updates require coordination.
This distinction gives a compact mathematical language for social federation, Matrix-style state resolution, AT-style replicated repositories, collaborative documents, and paraconsistent multi-party knowledge.

## 1. Introduction

Social software is full of words that sound like consensus but mean different things.
A chat room "agrees" on its current state after resolving an event DAG.
A collaborative document "converges" after replicas exchange updates.
A social network "federates" when independently hosted servers exchange records.
A group "has common ground" when its participants can act as if some claim is shared.
These are related, but they are not the same phenomenon.

The difference matters because many systems treat all conflict as a problem to be removed by ordering.
If two replicas write different values, pick a winner.
If two branches of a room DAG disagree, impose an authority ordering.
If two communities interpret the same sign differently, normalize the representation.
These techniques are sometimes necessary.
But they hide a more general structure: disagreement can be preserved, measured, and carried without explosion; convergence can occur without agreement; and coordination can be required by dynamics even when a present snapshot appears locally consistent.

This paper proposes a compact model:

> A social system is a sheaf-like system of observer-local states over an observer category.
> Consensus is gluing.
> Disagreement is an obstruction to gluing.
> Replication is monotone knowledge accumulation.
> Coordination is a property of the update regime, not the same thing as present disagreement.

The model is deliberately modest.
It does not claim that every social or distributed system literally computes sheaf cohomology.
Instead, it provides a translation table among four established bodies of work:

1. sheaf models of opinion dynamics and local-to-global consistency;
2. lattice-valued sheaves and Tarski-style fixed-point operators;
3. CRDTs and semilattice-based replicated state;
4. the CALM theorem's monotonicity criterion for coordination-free consistency.

The payoff is a separation that ordinary language blurs:

- **Gluing:** do the local views admit a coherent shared section?
- **Merging:** do replicas monotonically accumulate information toward a common state?
- **Coordination:** does the program require non-monotone choices, negation, or ordering to preserve consistency?

These are independent enough to deserve separate invariants.

## 2. Observer fields

Let \(O\) be an observer category.
Its objects are observers: people, agents, servers, devices, organizations, or communities.
A morphism \(\alpha : o_i \to o_j\) is a channel or translation from observer \(o_i\)'s frame to observer \(o_j\)'s frame.
In an ordinary graph model, this would be an edge.
In the categorical model, direction and composition matter: a translation from \(i\) to \(j\), followed by a translation from \(j\) to \(k\), gives a composite translation from \(i\) to \(k\).

Each observer \(o\) has a local state \(V(o)\).
Depending on the application, this state might be:

- a set of claims;
- a document replica;
- an opinion vector;
- a signed repository;
- a room-state map;
- a knowledge lattice element;
- a paraconsistent collection of positive and negative witnesses.

The assignment \(V : O \to \mathcal{C}\) should be read as a multi-observer system valued in some category \(\mathcal{C}\) of states.
The morphisms of \(O\) induce translations, restrictions, or comparison maps among local states.

The discrete case is important.
If \(O\) has only identity morphisms, then \(V\) is just a family of independent local states.
There is no social structure beyond coexistence.
The genuinely social content lives in non-identity morphisms: who can hear whom, which perspective can translate into another, which replicas cover a target, and which overlaps must agree.

## 3. Consensus as a global section

Given local states over observers, consensus is not necessarily unanimity.
A better mathematical object is a global section: a coherent assignment compatible with all the local views and translation maps.

In sheaf language, local data glue when they agree on overlaps.
The global section is the glued object.
For a cover \(\mathcal{U} = \{U_i\}\), one can think of the data as:

\[ s_i \in V(U_i) \]

with compatibility conditions on pairwise overlaps:

\[ s_i|_{U_i \cap U_j} = s_j|_{U_i \cap U_j}. \]

If compatible, the \(s_i\) glue to a global section \(s\).
If not, there is an obstruction.
In classical sheaf cohomology, the first cohomology group \(H^1\) is one place where such gluing obstructions appear.
In computational sheaf models, related obstruction data can be made explicit over a graph or cell complex.

Hansen and Ghrist's discourse sheaves show how networked agents can hold local opinions while expressing different projections over communication channels [Hansen and Ghrist 2021].
Ghrist and Riess's lattice-valued sheaves show how complete lattices and Galois connections can replace vector spaces, leading to Tarski-style fixed-point operators whose degree-zero behavior recovers global sections [Ghrist and Riess 2022].
These are exactly the ingredients needed for social consensus beyond vector averaging: local states may be ordered, partially defined, contradictory, or translated through non-invertible maps.

The key conceptual move is this:

> Agreement is not a scalar.
> It is the existence of a coherent global section over a chosen cover.

That phrase has two important qualifications.

First, consensus is **cover-relative**.
The same observers may glue over one cover and fail over another.
A target observer's replica-cover can be tree-shaped and glue, while the whole comparison graph contains a cycle of opposed claims.
Therefore, "the group agrees" is incomplete without specifying which cover is being assembled.

Second, consensus is not always binary.
The obstruction can be measured, decomposed, localized, or carried forward.
A system can know not only that gluing failed, but where and why.

## 4. Disagreement as obstruction, not explosion

Many systems treat contradiction as failure.
Classical logic encourages that reflex: from contradiction, everything follows.
Social systems cannot work that way.
Groups routinely hold inconsistent testimony, competing interpretations, and unresolved disputes without becoming meaningless.

A paraconsistent social state distinguishes three outcomes:

1. a claim is supported;
2. its contrary is supported;
3. both are supported and must be held as a stable conflict.

This "held conflict" should not be identified with absurdity.
It is a valid state of knowledge: there are witnesses on both sides.

In a network, pairwise contradiction is not yet a global obstruction.
Suppose three observers form a path:

\[ o_0 -- o_1 -- o_2. \]

If \(o_0\) and \(o_2\) support a claim while \(o_1\) supports its contrary, both edges are opposed, but the opposition graph has no cycle.
The cover can still glue into a held conflict: the global section records both witnesses.
Now put four observers in a cycle with alternating positive and negative stances:

\[ o_0 -- o_1 -- o_2 -- o_3 -- o_0. \]

The opposition now wraps around a cycle.
The obstruction is no longer merely local.
It is a loop of incompatible translation obligations.
This is the prototype for a first-cohomology obstruction: the disagreement is topological.

This distinction is easy to miss in ordinary conflict handling.
Pairwise opposition is an edge property.
Standing disagreement is a cycle property.
A system that only counts conflicts but not their topology cannot tell a tree-shaped disagreement that can be glued into a stable record from a cyclic disagreement that creates a genuine obstruction.

## 5. CRDT merge as monotone knowledge accumulation

CRDTs address a different question.
A conflict-free replicated data type allows replicas to update locally and converge after exchanging information.
In the state-based style, replica states form a join-semilattice and merge computes a least upper bound [Shapiro et al. 2011]:

\[ x \sqcup y = \operatorname{lub}(x,y). \]

This is not a theory of social agreement by itself.
It is a theory of monotone state accumulation.
If replicas eventually receive the same updates and merge with the same semilattice law, they converge to the same state.

For social data, the join should usually be read as a knowledge join.
If one replica has witness \(a\) and another has witness \(b\), merge should not choose between them unless the application explicitly asks for a non-monotone decision.
It should retain both.
If \(a\) and \(b\) conflict, the merged state is not "the winner."
It is the state that knows both witnesses exist.

This reading explains why multi-value registers are more social than last-writer-wins registers.
A last-writer-wins register turns concurrent disagreement into an ordering accident.
A multi-value register preserves the fact of concurrency and conflict.
In a paraconsistent lattice, different concurrent values can join to a stable conflict rather than to absurdity.

The CRDT equation is therefore:

\[ \operatorname{merge}(A,B)[k] = A[k] \vee_k B[k], \]

where \(\vee_k\) is knowledge-order join.
The result is monotone: more messages only add knowledge.
It is idempotent, commutative, and associative when the underlying join is.
These algebraic laws explain eventual convergence.

But convergence is not consensus.
Replicas can converge to a shared state that contains a disagreement.
The CRDT has solved distribution, not necessarily resolved meaning.

## 6. CALM and the coordination boundary

The CALM theorem gives a second independent axis.
CALM stands for "consistency as logical monotonicity."
In the formulation presented by Hellerstein and Alvaro, the programs with consistent, coordination-free distributed implementations are exactly those expressible in monotonic logic [Hellerstein and Alvaro 2019].

This aligns cleanly with the CRDT story.
If updates only accumulate information, then replicas do not need to pause and agree before proceeding.
If a conclusion can be revoked by future information, then some form of coordination, ordering, or stratification may be required.

The crucial point is that CALM is about **program dynamics**, not merely present state.
A group may presently agree while running a non-monotone procedure that will require coordination later.
Conversely, a group may presently disagree while its replicated state still accumulates monotonically and coordination-free.

This yields the paper's central separation:

| Axis | Question | Mathematical signal |
|---|---|---|
| Static gluing | Do the local views assemble into a global section over this cover? | obstruction vanishes or not |
| Dynamic coordination | Can the update process run consistently without coordination? | monotonicity / CALM |
| Replicated convergence | Will replicas receiving the same updates reach the same state? | semilattice merge / CRDT laws |

The axes interact, but they do not collapse.

## 7. Orthogonality of disagreement and coordination

The common error is to infer coordination cost from visible disagreement.
That is too crude.

### 7.1 Disagreement without coordination cost

Consider a state-based CRDT whose values are sets of witnessed claims.
Two replicas concurrently record contrary claims:

\[ \{p\}, \quad \{\neg p\}. \]

Merge gives:

\[ \{p,\neg p\}. \]

If the application's lattice treats this as a held conflict, the merge is still monotone and coordination-free.
The system has not reached classical agreement, but it has converged consistently.
The disagreement belongs to the static gluing axis; the update process remains CALM.

### 7.2 Agreement with coordination cost

Now consider a system whose current replicas agree but whose future program uses non-monotone negation, uniqueness, threshold absence, or a total-order election.
The current snapshot may glue, but the update regime may still require coordination to preserve consistency.
A present global section does not imply a coordination-free future.

### 7.3 The invariant pair

A social distributed system should therefore report at least two bits of structure:

1. whether the chosen cover glues;
2. whether the update regime is coordination-free.

Better systems report more: the obstruction's location, the cover that produced it, the monotone part of the program, and the non-monotone residues that require coordination.

This is the central theorem-like claim:

> Social disagreement and distributed coordination are orthogonal invariants.
> Disagreement measures failure of gluing over a cover.
> Coordination measures failure of monotone update discipline.
> A system can have either without the other.

## 8. Protocol readings

The model becomes concrete when read against modern social and distributed protocols.

### 8.1 Collaborative documents

Collaborative editors built on CRDTs already treat replicas as local states exchanging monotone updates.
The social-consensus model adds a missing layer: when two users edit the same semantic cell differently, convergence should not be confused with agreement.
The merged document may faithfully preserve both edits while marking the cell as contested.

### 8.2 Matrix-style room state

Matrix rooms are event DAGs whose state resolution algorithm reconciles conflicted state events through authorization chains and ordering rules [Matrix Specification].
In the present language, the event DAG is a witness ledger, and state resolution is a gluing procedure over branches of that ledger.
Matrix's actual algorithm includes authority and power-level semantics; those are not reducible to sheaf gluing.
But the conceptual problem it solves is recognizable: assemble a coherent room state from locally produced, partially ordered events.

### 8.3 AT-style repositories and firehoses

AT Protocol repositories are signed per-account record stores, and the sync specification describes a repository event stream, or firehose, that carries real-time updates [AT Protocol].
Read through the observer-field model, a repository is an observer-scoped local state; a commit is a witnessed update; a firehose is broadcast of updates across the social field.
Merging repositories is not itself a theory of truth.
It is the replicated-state substrate on which truth, disagreement, and application semantics can be layered.

### 8.4 Federated social systems

Federated systems such as ActivityPub-style networks face the same split.
Server delivery, inbox/outbox mechanics, and record synchronization can be monotone even while communities disagree about moderation, identity, or interpretation.
The social-consensus model says not to hide those disagreements behind transport success.
Transport convergence is not cultural consensus.

## 9. Research program

This model suggests several concrete research directions.

### Problem 1. Cover-relative consensus APIs

Social and collaborative systems should expose which cover is being glued.
A room, repository, moderation cluster, or document section may each define a different cover.
APIs should report consensus relative to that cover, not as a global boolean.

### Problem 2. Obstruction-carrying conflict records

Instead of reducing conflict to winner selection, systems should preserve obstruction records: which observers disagreed, on which overlaps, and whether the obstruction is tree-shaped, cyclic, or higher-dimensional.

### Problem 3. CRDTs with paraconsistent value lattices

CRDT practice should more explicitly separate semilattice convergence from application-level agreement.
Paraconsistent value lattices make it possible for merge to preserve contrary witnesses without collapsing into error.

### Problem 4. CALM decomposition for social programs

Given a social application, decompose its logic into monotone and non-monotone parts.
The monotone part can run coordination-free; the non-monotone residue requires ordering, authority, voting, locking, or some other coordination surface.

### Problem 5. State-resolution as gluing plus authority

Matrix-style state resolution should be studied as a combination of gluing and authority.
The gluing part asks which branches assemble; the authority part decides which writes are admissible.
Keeping those layers separate would make state resolution easier to reason about and compare across protocols.

## 10. Conclusion

The strongest claim of this paper is a separation of concerns.
Social consensus is not one thing.
It has at least three layers:

1. local views gluing into a global section;
2. replicas converging by monotone merge;
3. update programs requiring or avoiding coordination.

Treating these layers separately clarifies why conflict-free replication can preserve disagreement, why present agreement does not guarantee coordination-free future updates, and why federation should expose rather than erase contested residues.

The useful slogan is:

> Consensus is gluing; merge is knowledge accumulation; coordination is the cost of non-monotonicity.

That slogan is small enough for engineering, but precise enough to connect social software with sheaf theory, CRDTs, and CALM.
It gives a public mathematical language for building systems that can hold disagreement without pretending it has disappeared.

## References

[AT Protocol] "Sync."
AT Protocol specifications.
Describes repository event streams, including the firehose of commit and sync events. https://atproto.com/specs/sync

[Ghrist and Riess 2022] Robert Ghrist and Hans Riess.
"Cellular Sheaves of Lattices and the Tarski Laplacian." *Homology, Homotopy and Applications* 24(1), 325--345, 2022. https://arxiv.org/abs/2007.04099

[Hansen and Ghrist 2021] Jakob Hansen and Robert Ghrist.
"Opinion Dynamics on Discourse Sheaves." *SIAM Journal on Applied Algebra and Geometry* 5(3), 426--460, 2021. https://arxiv.org/abs/2005.12798

[Hellerstein and Alvaro 2019] Joseph M.
Hellerstein and Peter Alvaro.
"Keeping CALM: When Distributed Consistency Is Easy." arXiv:1901.01930, 2019. https://arxiv.org/abs/1901.01930

[Matrix Specification] "Room Version 11."
Matrix Specification.
Describes state resolution over conflicted state sets and authorization chains. https://spec.matrix.org/v1.9/rooms/v11/

[Shapiro et al. 2011] Marc Shapiro, Nuno Preguica, Carlos Baquero, and Marek Zawirski.
"Conflict-free Replicated Data Types."
SSS 2011.
Research report RR-7687, INRIA, 2011. https://inria.hal.science/hal-00932836
