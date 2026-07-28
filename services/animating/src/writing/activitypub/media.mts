/**
 * writing/activitypub/media — OCapped media upload: capability-gated admission of a
 * binary as an ActivityStreams media object (Image/Audio/Video/Document).
 *
 * Media is the worst ambient-authority surface in social software — apps normally get a
 * blanket `media:write` scope and can then upload anything, anywhere, forever, as you.
 * WMAP replaces the scope with a LOCUS you may play, so media authority is a capability:
 *   - ATTENUATE: a broad `…|media:upload` narrows to `…|media:upload:image` (a kind), and
 *     to a byte ceiling — a specific move, derived with provenance.
 *   - DELEGATE: a sub-agent (transcoder, captioner, thumbnailer) gets its own attenuated
 *     media capability ON YOUR BEHALF, no credential sharing (name-passing).
 *   - REVOKE: `Undo` the grant; the sub-agent's media authority evaporates.
 *   - `canInvoke`: the upload only goes through if the capability names a legal move.
 * Least-authority media across an agent swarm — the WMAP differentiator.
 *
 * The binary itself crosses via relating's `writing/http/multipart` codec (re-exported
 * helper below); admission is pure and cap-gated. The admitted object is the AS2 media
 * object the client then references in a `Create` (attachment/icon/image/url). Persisting
 * the bytes and witnessing the asset is the transport/ledger tier, not this admission.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";
import { ACTIVITYSTREAMS_CONTEXT } from "./index.mjs";
import { canInvoke, type Capability } from "./capability.mjs";
import type { Actor } from "./actor.mjs";

/** The AS2 media object kinds. */
export type MediaKind = "Image" | "Audio" | "Video" | "Document";

/** An ActivityStreams media object — the AS2 result of an OCapped upload, referenced by
 *  a later `Create`. Single-source carrier, bare descent-path `$id`. */
export const mediaObjectSchema = {
  $id: "animating/writing/activitypub/media",
  title: "MediaObject",
  description:
    "An ActivityStreams media object (Image/Audio/Video/Document) admitted through an OCapped upload — capability-gated, attenuable by kind and size, delegable, revocable. The client references it in a Create. $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: ["@context", "id", "type", "mediaType", "url"],
  properties: {
    "@context": { const: ACTIVITYSTREAMS_CONTEXT },
    id: { type: "string" },
    type: { enum: ["Image", "Audio", "Video", "Document"] },
    mediaType: { type: "string" },
    url: { type: "string" },
    name: { type: "string" },
    width: { type: "integer" },
    height: { type: "integer" },
    duration: { type: "number" },
    size: { type: "integer" },
  },
} as const;
export type MediaObject = FromSchema<typeof mediaObjectSchema>;
export const mediaObjectCarrier = carrierFrom(mediaObjectSchema);

/** The AS2 kind for a MIME type: image/* → Image, audio/* → Audio, video/* → Video, else Document. */
export function kindOfMediaType(mediaType: string): MediaKind {
  const top = mediaType.split("/", 1)[0]?.toLowerCase() ?? "";
  if (top === "image") return "Image";
  if (top === "audio") return "Audio";
  if (top === "video") return "Video";
  return "Document";
}

/** The locus a capability must grant to upload media for an actor. With `kind` it is the
 *  ATTENUATED form (`…|media:upload:image`), authorizing only that kind; without, the
 *  broad form authorizing any kind. */
export function mediaUploadLocus(actorId: string, kind?: MediaKind): string {
  return kind === undefined ? `${actorId}|media:upload` : `${actorId}|media:upload:${kind.toLowerCase()}`;
}

/** A media asset to admit: its MIME type, where it is served, and optional descriptors.
 *  (Storing the bytes is the transport tier; this admits the descriptor.) */
export interface MediaAsset {
  readonly mediaType: string;
  readonly url: string;
  readonly size?: number;
  readonly name?: string;
  readonly width?: number;
  readonly height?: number;
  readonly duration?: number;
}

/** Options bounding an admission (the byte ceiling a capability is attenuated to). */
export interface MediaAdmissionOptions {
  readonly maxBytes?: number;
}

/** The outcome of an OCapped media admission. */
export interface MediaAdmission {
  readonly object?: MediaObject;
  readonly denied?: string;
}

let MEDIA_MINTED = 0;
function mintMediaId(actorId: string): string {
  MEDIA_MINTED += 1;
  return `${actorId}/media/${MEDIA_MINTED}`;
}

/**
 * admitMedia — admit a binary asset as an AS2 media object, authorized WMAP-native by
 * CAPABILITY. The capability must grant either the broad `media:upload` locus or the
 * kind-attenuated `media:upload:<kind>` for this asset's kind, and be exercisable
 * (`canInvoke`). A kind-attenuated capability admits only its kind (an image cap cannot
 * upload audio). A byte ceiling (`maxBytes`, the size attenuation) is enforced. On
 * success the server mints the object id; otherwise `denied` says why.
 */
export function admitMedia(
  actor: Actor,
  capability: Capability,
  affordances: readonly string[],
  asset: MediaAsset,
  options: MediaAdmissionOptions = {},
): MediaAdmission {
  const kind = kindOfMediaType(asset.mediaType);
  const broad = mediaUploadLocus(actor.id);
  const narrow = mediaUploadLocus(actor.id, kind);
  const grantsThisKind = capability.grants === broad || capability.grants === narrow;
  if (!grantsThisKind || !canInvoke(affordances, capability)) {
    return { denied: `capability does not authorize media:upload (${kind}) for ${actor.id}` };
  }
  if (options.maxBytes !== undefined && asset.size !== undefined && asset.size > options.maxBytes) {
    return { denied: `media is ${asset.size} bytes, over the capability ceiling of ${options.maxBytes}` };
  }
  const object: MediaObject = {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    id: mintMediaId(actor.id),
    type: kind,
    mediaType: asset.mediaType,
    url: asset.url,
    ...(asset.name === undefined ? {} : { name: asset.name }),
    ...(asset.width === undefined ? {} : { width: asset.width }),
    ...(asset.height === undefined ? {} : { height: asset.height }),
    ...(asset.duration === undefined ? {} : { duration: asset.duration }),
    ...(asset.size === undefined ? {} : { size: asset.size }),
  };
  return { object };
}
