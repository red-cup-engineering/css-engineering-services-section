/**
 * communicate/actions — communicating's core operation surface: the meme-transforming
 * morphisms, as cocone legs on the @red-cup-engineering/relating `acting` boundary.
 *
 * communicating WORKS OVER relating's meme carrier — its core morphisms read and produce memes
 * (meme in, meme out; dev/docs/notes/2026-06-21-communicating-as-end-meme-semiotics.md). That
 * meme→meme shape describes the CORE; it is not communicating's definition — readings/codecs that
 * project a meme into another carrier are legitimate communicating operations too (a language
 * package composes them onto this core). `actions(bundle)` spreads the core meme morphisms
 * (`memeActions`): communicate, semiose,
 * speak, listen, illocute, ground, translate, negate, conflate, refer, modalize,
 * presuppose, quote, compose. There is no parallel text-operation surface and no
 * messaging-operation surface here.
 *
 * The text↔meme factorization (decode_L / encode_L) is a CODEC boundary, not an
 * operation: the rich machinery (read/settle/articulate, resolveReferences, polarity,
 * temporal, presuppositions, roles/scope/logical-form, grammaticality, render,
 * similarity, the messaging channel/linear-resource law, the speech-act/common-ground/
 * semiosphere vocabularies) is alive as the morphisms' internal implementation and as
 * exported library functions, consumed by the per-language `@red-cup-engineering/communicating-in-<language>`
 * packages where raw text is admitted as `decode`/`encode` actions. The core no longer
 * admits raw text as an operation.
 *
 * The `bundle` parameter is retained for signature stability with the language
 * packages; the meme surface is bundle-independent (the meme carrier is
 * language-neutral; languages factor it through their codec).
 */
import type { Action } from "@red-cup-engineering/relating";

import type { CompiledBundle } from "../speaking/listening/algebra/index.mjs";
import { memeActions } from "./meme.mjs";
import { cohereAction, spacetimeAction, channelAction } from "./cohesion.mjs";

/** communicating's READING operations — operations that project a membrane into another carrier
 *  (not a meme). `cohere` reads a membrane's discourse cohesion as a graph-Laplacian invariant.
 *  Many communicating morphisms happen to transform memes; that is a description of those morphisms,
 *  never a requirement on the surface. */
export const readingActions: readonly Action[] = Object.freeze([cohereAction, spacetimeAction, channelAction]);

/**
 * communicating's operation surface over a chosen bundle: the meme-transforming morphisms together
 * with the membrane readings. Language packages compose this with their own codec surface
 * (decode/encode) and language-specific operations (e.g. prose conformance).
 */
export const actions = (_bundle: CompiledBundle): readonly Action[] => Object.freeze([...memeActions, ...readingActions]);
