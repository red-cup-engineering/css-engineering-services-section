import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The public portfolio data root is supplied by its public owner. */
export const NODE_ROOT = process.env.YOUTUBE_CHANNEL_FEDERATION_DATA_ROOT
  ? resolve(process.env.YOUTUBE_CHANNEL_FEDERATION_DATA_ROOT)
  : resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const ACTOR = "urn:ame:emsweb-video-federation";
