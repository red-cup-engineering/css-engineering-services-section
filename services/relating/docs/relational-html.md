# Relational HTML

Relational HTML is the package's current answer to "can a document carry a program without becoming an arbitrary JavaScript runtime?"

The implemented surface is small and useful:

- `rmnProjector` restricts JSON to closed, well-typed RMN terms.
- `htmlIsRelational(html)` admits an HTML document only when every script is `type="application/rmn+json"` and every script body passes RMN term admission.
- `extractRelationalScripts(html)` returns the admitted script bodies.
- `settleRelationalHtml(html)` parses, checks, and evaluates those RMN bodies.
- `sessionIsRelational(messages)` and `settleRelationalSession(messages)` apply the same gate to open message streams.
- `application/rmn+json` maps to the `assertion` corner in HTTP media-type negotiation.

The result is not a browser sandbox and not a new HTML interpreter.
The package does not read JavaScript, execute the DOM, or claim a formal strong-normalization proof for the whole Node evaluator.
The claim is narrower: a document can carry a package-admitted RMN morphism as JSON, and `@emsenn/relating` can reject non-RMN scripts before any host-language execution is involved.

## Product Reading

Most web systems have three separate things:

- markup in HTML
- behavior in JavaScript
- data in JSON or hidden attributes

Relational HTML folds those into one document boundary without making JavaScript the semantic source.
The markup remains HTML.
The behavior is an RMN term body.
The data remains ordinary JSON-shaped carrier material.
The interpreter is the package, not an inline script.

This is why the surface belongs under `@emsenn/relating/writing`: it is a representation boundary.
It lets downstream packages ask, as pure data, whether a document's executable content is inside the package term language before they project it into a browser, HTTP response, audit log, or agent handoff.

## Boundaries

RelMath currently gives this surface the CHL spine: a de-Bruijn simply typed lambda calculus with products and unit, plus a Lean proof of Church-Rosser / confluence.
The Node package implements the JSON notation, a closedness check, a bidirectional type checker for the core, complete-development evaluation, and a fuel-bound settlement loop.

That is enough to document the admission gate and the package behavior.
It is not enough to claim arbitrary HTML completion is decidable, or that every future domain extension of RMN has a Lean-backed termination proof.
When in doubt, describe the checked boundary: closed, well-typed RMN script bodies are admitted; plain data, open terms, and non-RMN scripts are rejected.

## Example

```js
import {
  htmlIsRelational,
  settleRelationalHtml,
} from "@emsenn/relating/writing";

const program = JSON.stringify(["pair", ["star"], ["star"]]);
const html = `<script type="application/rmn+json">${program}</script>`;

htmlIsRelational(html); // true
settleRelationalHtml(html); // [["pair", ["star"], ["star"]]]
```

See [`examples/relational-html.mjs`](../examples/relational-html.mjs) for the runnable product smoke.
