# Codec Boundary Tree

Codec paths encode the relational shape of a boundary. They are not a flat list
of feature names.

The public tree starts at the boundary substrate and then refines by syntax:

```text
@emsenn/relating/codecs
  /text
    /json
      /jsonl
        /eavt
          /datom
          /triple
          /lean
    /xml
      /html
      /svg
        /radial
  /host
    /javascript
      /numbers
  /boundary
    /wire
```

JSON bytes, JSON Lines rows, EAVT rows, and datom specializations occupy
successively deeper textual JSON boundaries. EAVT/datoms are textual JSONL
relational row material, not peers of HTML or SVG.

HTML and SVG sit under `text/xml` because their boundary form is an XML-family
textual projection. The JavaScript number door sits under
`host/javascript/numbers` because it crosses between exact carrier arithmetic and
host numeric/decimal representations.

This is intentionally analogous to media-type structure: `text/html`,
`application/json`, `application/ld+json`, `image/svg+xml`, and related forms all
record morphology in the path. The relating package does not cargo-cult MIME
types, but it uses the same insight: boundary representations form a typed tree.
