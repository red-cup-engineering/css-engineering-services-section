---
name: the ontological spine is a definability tower
description: A working note deriving the package ontology relationality → agent → games → computing as the unique total order in which each layer's defining closure becomes expressible. The keystone result: ~ (negation), unlike Boolean ¬, has fixed points {⊥, ⊤}, which is the algebraic permission for a relation to model itself and thereby become an agent. Includes the Liar-settles proposition, the definability-order theorem (sketch), the language-downstream-of-agency corollary, and a gauge reading of agency as broken self-duality.
date: 2026-06-15
status: working-note (some results proved, lfp-existence at games/computing marked sketch)
audience: future agents working the package ontology
---

# The ontological spine is a definability tower

> Orientation for future agents: the package DAG `relationality → agent → games → computing → (products)` is **not** a layout choice.
> It is the unique total order in which each layer's defining closure operator becomes *expressible*.
> This note derives that.
> The single most important fact: agency exists because negation has a fixed point.
> Read §1 before arguing about edge directions.

## 0. The two primitives, stated so we can compute

A **value object** $\mathbf 4 = \mathbf 2^{\bowtie}$: charges $\langle p,n\rangle\in\{0,1\}^2$, knowledge order $\langle p,n\rangle\le_k\langle p',n'\rangle\iff p\le p'\wedge n\le n'$ (componentwise), truth order with the second coordinate reversed.
Negation $\sim\langle p,n\rangle=\langle n,p\rangle$; conflation $-\langle p,n\rangle=\langle\lnot n,\lnot p\rangle$.
(This is `@emsenn/relating/algebra`'s `ChargeValue`: `potential`=t=⟨1,0⟩, `potential`=f=⟨0,1⟩, `active`=⊤=⟨1,1⟩, `stable`=⊥=⟨0,0⟩.)

A **process**: fix a cell-set $\Phi$ and a $\le_k$-monotone rule-operator $C$ on the valuation lattice $\mathrm{Val}=\mathbf 4^{\Phi}$ (complete under pointwise $\le_k$).
A **settling** is $S=(\Phi,C,v_\kappa)$ with $v_\kappa=\mathrm{lfp}(C)\ge_k v_0$ and $\kappa$ the closure ordinal (Knaster–Tarski).
That is *relationality*: a relation, settled.

Everything below is built by **one recursion** — name a closure on the previous apex, take its least fixed point.
"What depends on what" becomes: *on what data is the next closure even definable?*

## 1. The keystone: $\sim$ has fixed points; that is why agency is possible

Classical two-valued logic cannot model self-reference: $\lnot$ on $\mathbf 2$ has no fixed point, so $\lambda=\lnot\lambda$ has no settled value — the Liar explodes.
In $\mathbf 4$ this fails to fail.

**Proposition 1 (self-dual locus).** $\mathrm{Fix}(\sim)=\{\bot,\top\}$, and these are exactly the truth-neutral charges (the $\le_t$-incomparable pair, the $\le_k$ extremes).

*Proof.* $\sim\langle p,n\rangle=\langle n,p\rangle=\langle p,n\rangle\iff p=n$, giving $\langle0,0\rangle=\bot$ and $\langle1,1\rangle=\top$.
Both are $\le_t$-neutral and are the bottom/top of $\le_k$. $\square$

**Proposition 2 (reflexive settlings always settle).** Let $\lambda$ be a self-referential cell with accumulation rule $C(v)(\lambda)=v(\lambda)\vee_k{\sim}v(\lambda)$.
Then $C$ is $\le_k$-monotone and its iteration has a least fixed point: $\bot$ from the uninformed seed, $\top$ from any seeded start.
The Liar is never paradoxical — it is *uninformative* ($\bot$) or *contested* ($\top$).

*Proof.* $\sim$ is a $\le_k$-automorphism, $\vee_k$ is monotone, so $C$ is monotone; Knaster–Tarski gives the lfp.
Compute: $\bot\vee_k{\sim}\bot=\bot$; $t\vee_k{\sim}t=t\vee_k f=\top$, then $\top\vee_k\top=\top$. $\square$

This is the hinge. **Self-modeling is well-defined precisely because negation has fixed points**, and a self-model is forced onto the knowledge axis: an agent can be *uninformed* or *contested* about itself, never flatly true/false about itself.
Not mysticism — $\mathrm{Fix}(\sim)=\{\bot,\top\}$.

## 2. The four strata as least fixed points

- **$\mathrm L_0$ relationality.** Apex: the settled section $v_\kappa=\mathrm{lfp}(C_R)$.
  A relation, evaluated to convergence.
- **$\mathrm L_1$ agency** $=\mathrm{lfp}$ of the **reflexive closure** $\mathfrak A$.
  Adjoin meta-cells $\widehat\Phi=\{\widehat\varphi\}$ with reflection rules $\widehat\varphi\leftarrow v(\varphi)$ and close.
  Monotone (Prop.
  2 is the worst case), so the lfp exists: a settling containing a copy of its own settled charges — a self-model. *An agent is the initial algebra of $X\mapsto\mathrm{Settle}(X+\mathrm{SelfModel}(X))$.* Handedness is the boundary involution $(-)^\perp:=\sim$ on the agent's input/output cells.
- **$\mathrm L_2$ games (CGS)** $=\mathrm{lfp}$ of the **interaction closure**.
  Objects: agents.
  A morphism $A\to B$ is a strategy = a settling on $A^\perp\,\|\,B$ ($O$-side on $A$, $P$-side on $B$); composition is knowledge-join at shared loci, then settle (cut).
  The $*$-autonomous structure $(\otimes=\|,\ (-)^\perp,\ \invamp)$ is agency closed under interaction.
- **$\mathrm L_3$ computing** $=\mathrm{lfp}$ of the **exponential closure**: adjoin the $!$-comonad (copy/discard); the Kleisli sub-CCC is where a duplicable *program* lives.
  The four paradigms appear as sub-categories.
  The computer = CGS closed under $!$.

## 3. The order is a theorem, not a convention

**Theorem (definability forces $\mathrm L_0\sqsubset\mathrm L_1\sqsubset\mathrm L_2\sqsubset \mathrm L_3$).** Each closure's *signature* references structure introduced only as the previous apex:

- $\mathfrak A$ (reflexive) quantifies over a settling's own cells ⇒ needs $\mathrm L_0$.
- interaction is a relation *between dual-handed objects*; "$O$-side/$P$-side" is the boundary $(-)^\perp$ ⇒ needs the handedness of $\mathrm L_1$.
- $!$ is a comonad *on a $*$-autonomous category* ⇒ needs the linear category $\mathrm L_2$.

Hence no stratum can be posed before its predecessor's fixed point exists; the tower is **totally ordered**. $\square$ (The three "needs" are signature-inclusions, rigorous; lfp-existence at $\mathrm L_2,\mathrm L_3$ rests on the corpus's KZ-diamond / Kleisli results, status *sketch*.)

This is exactly the spine the `computing` package states in plain English: *"CGS is downstream of games; games of agents; agents of relationality."* It is derived, not stipulated.
You cannot define interaction without agents to interact, nor a self-relating dual object without settlings to be reflexive about, nor duplicable computation without the linear interaction category.

**Corollary (language is downstream of agency).** Parsing is a map $\text{Utterance}\to\text{Settling}$ that factors through an agent's reflexive closure (construal *is* an agent predicating about an utterance), so $\textsf{language}\to \textsf{agent}$.
Symmetrically `content`, `llm`, `web`, `git`, `hive`, … are objects of $\mathrm L_2/\mathrm L_3$ — strategies/programs — hence below.
Agency is constitutive; everything linguistic or computational is a *use* of it.
(Today's edge `agent → language` is therefore inverted and should be flipped.)

## 4. Coda — the gauge reading: agency is broken self-duality

The Klein-four gauge $K_4=\langle\sim,-\rangle$ splits by monotonicity:

- $\{\mathrm{id},\sim\}\cong\mathbb Z/2$ is **$\le_k$-monotone** — may appear *inside* closure rules.
  The **dynamical** symmetry (handedness).
- $\{-,\sim\!-\}$ is **$\le_k$-antitone** ($-$ sends the knowledge-bottom to the top) — can relate two finished settlings but **never occur in the process**.
  Conflation is **pure gauge**, never dynamics.

So $\mathrm L_0$ carries the full $K_4$ symmetrically: a bare relation has no preferred handedness; the copycat/identity strategy is the $K_4$-fixed (self-dual) **vacuum**.
Forming an agent is choosing a handedness — *spontaneously breaking* the $(-)^\perp$ self-duality to its stabilizer.
A symmetric peer is the unbroken vacuum; an agent is the generic, symmetry-broken excitation.
Agency is the Higgs mechanism of relational self-duality, and Prop.
1 says the order parameter lives on $\{\bot,\top\}$ — which is why self-knowledge here is always *open* or *contested*, never settled.

## 5. The product layer: where the tower terminates and makes money

The substrate spine is not the whole DAG — it is the top of it.
The DAG **terminates in deployed products for real-world consumption**, through a fixed three-tier realization spine the repo calls *the lawful spine* (`services/llm-server`: "apps/llm-computer bound to transports… The service→app edge is the lawful spine"):

```
lib/<domain>           the mathematics (the L0–L3 spine + domains)
  └─ apps/<domain>-computer    the domain MADE OPERATIONAL but PURE
  │                            ("no network, no keys, no clock it was not handed")
      └─ services/<domain>-server   the app BOUND TO TRANSPORTS
                                    ("the only place keys and sockets enter") = the product
```

This is the apex tower's bottom strata (Realizability → the running machine) as a build convention.
The revenue surfaces (the leaves of the DAG) cluster into product lines:

1. **Media** — `content-farm` + `newsroom` (SWARM-backed autonomous newsroom) → `newswire`/`newscable`/`content-server`: agentic content generation, editorial gates, NewsArticle JSON-LD, feeds, syndication.
2. **Crypto/financial** — `hive-server` → `hive-swarm-server` → `propolis` (N autonomous curation+market agents), plus `waggle`/`farolfi` (wallet + double-entry books).
3. **Games** — `farstone` (a playable MUD on the `fizzos` MUD-OS kernel) and `qwzspace-server` (a 3D web game engine: space = icosahedral ℤ⁶→ℝ³ cut-and-project quasicrystal, existence = bilattice charge, "paraconsistent death = alive→⊤").
4. **AI/agent infra** — `llm-server` (OpenAI-compatible API), `agent-swarm-server`, `llm-claude-harness`/`llm-openai-codex-harness` (MCP hubs the CLIs wire into).
5. **Dev tooling** — `jsnode-server`, `conformance-tics`, `web-computer`.

Two structural facts for future agents:

- **`@emsenn/web` is the universal service-tier dependency** — it is what turns a pure `<domain>-computer` into a served product.
  Transports live at the web layer.
- **`@emsenn/animating` is what makes a service *autonomous*** — it appears in exactly the no-human-in-the-loop products (newsroom, agent-swarm-server, propolis, fizzos).
  Agency at the top of the math spine (§2, $\mathrm L_1$) is *literally* what lets a product run itself at the bottom.
  The keystone of §1 (self-modeling via $\mathrm{Fix}(\sim)$) is the same structure that lets a swarm operate unsupervised.

## 6. What this note does NOT yet do

- lfp-existence at games/computing is taken on faith from the KZ-diamond results — make it rigorous.
- Develop §4 into an actual order-parameter / moduli statement for "how much agency" a settling carries.

## References (in-repo)

- `lib/relating/src/algebra/bilattice-charge.mts` — $\mathbf 4$, the gauge group, the orders.
- `lib/animating`, `lib/gaming`, `lib/computing` — the $\mathrm L_1,\mathrm L_2,\mathrm L_3$ realizations; `computing`'s package.json description states the spine.
- `sites/research.
  561.group/content/triage/2026/05/25/voidmath/...
  ` — the apex-tower, KZ-diamond, and four-bilattice journals (Knaster–Tarski / Lambek recursion; FOUR ≅ 2^⋈ ≅ Chu(2,0)).
