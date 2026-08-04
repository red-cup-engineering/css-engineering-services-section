/**
 * communicate/morphisms - the generating meme morphisms.
 *
 * Argument-free morphisms are Meme -> Meme. Option-bearing morphisms consume one
 * product carrier whose formerly-option fields live beside a `meme` field, and
 * all morphisms return a meme carrier.
 */
import type { Action } from "@red-cup-engineering/relating";

import { speakAction } from "./speak.mjs";
import { listenAction } from "./listen.mjs";
import { illocuteAction } from "./illocute.mjs";
import { groundAction } from "./ground.mjs";
import { translateAction } from "./translate.mjs";
import { negateAction } from "./negate.mjs";
import { conflateAction } from "./conflate.mjs";
import { referAction } from "./refer.mjs";
import { modalizeAction } from "./modalize.mjs";
import { presupposeAction } from "./presuppose.mjs";
import { quoteAction } from "./quote.mjs";
import { composeAction } from "./compose.mjs";

export { speakAction } from "./speak.mjs";
export { listenAction } from "./listen.mjs";
export { illocuteAction } from "./illocute.mjs";
export { groundAction } from "./ground.mjs";
export { translateAction } from "./translate.mjs";
export { negateAction } from "./negate.mjs";
export { conflateAction } from "./conflate.mjs";
export { referAction } from "./refer.mjs";
export { modalizeAction } from "./modalize.mjs";
export { presupposeAction } from "./presuppose.mjs";
export { quoteAction } from "./quote.mjs";
export { composeAction } from "./compose.mjs";

export const morphismActions: readonly Action[] = Object.freeze([
  speakAction,
  listenAction,
  illocuteAction,
  groundAction,
  translateAction,
  negateAction,
  conflateAction,
  referAction,
  modalizeAction,
  presupposeAction,
  quoteAction,
  composeAction,
]);
