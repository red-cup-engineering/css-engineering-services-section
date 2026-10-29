import { createContentAddressedObjectStorage } from "@red-cup-engineering/fileset-object-storage-service";
import { createGoogleDriveObjectCustody } from "@red-cup-engineering/google-drive-object-custody-service";
import { listenS3Gateway } from "@red-cup-engineering/s3-gateway-service";
import { createGoogleAccessTokenProvider } from "./google-access-token.mjs";
import { createGoogleDriveLibraryProjector } from "./google-drive-library-projector.mjs";
import { createRcloneGoogleAccessTokenProvider } from "./rclone-google-access-token.mjs";

export function composeGoogleDriveS3Gateway(configuration, { fetchImpl = globalThis.fetch,
  clock = () => new Date(), execFile } = {}) {
  const accessTokenProvider = configuration.googleCredentials.rcloneRemote
    ? createRcloneGoogleAccessTokenProvider({ remote: configuration.googleCredentials.rcloneRemote,
      ...(execFile ? { execFile } : {}), clock })
    : createGoogleAccessTokenProvider({ ...configuration.googleCredentials, fetchImpl, clock });
  const custody = createGoogleDriveObjectCustody({ rootFolderId: configuration.rootFolderId,
    accessTokenProvider, fetchImpl, uploadChunkBytes: configuration.uploadChunkBytes });
  const storage = createContentAddressedObjectStorage({ custody, clock });
  const libraryProjector = createGoogleDriveLibraryProjector({ custody, storage,
    rootFolderId: configuration.rootFolderId });
  const credentials = { [configuration.accessKeyId]: { secretAccessKey: configuration.secretAccessKey,
    buckets: configuration.buckets } };
  return Object.freeze({ custody, storage, libraryProjector, credentials, accessTokenProvider });
}

export async function serveGoogleDriveS3Gateway(configuration, options = {}) {
  const composed = composeGoogleDriveS3Gateway(configuration, options);
  const server = await listenS3Gateway({ storage: composed.storage, credentials: composed.credentials,
    hostname: configuration.hostname, port: configuration.port, clock: options.clock });
  return Object.freeze({ ...composed, server, address: server.address() });
}
