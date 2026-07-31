import {
  createCloudTasksMessageQueue,
  createGoogleApiRequest,
  createGoogleOidcVerifier,
} from "@red-cup-engineering/gcloud-runtime-authorities-service";
import { createImmutableContentCustody } from "@red-cup-engineering/immutable-content-custody-service";
import { createR2RestClient, r2RestConfiguration } from "@red-cup-engineering/resource-brokerage-service-section/src/r2-rest.js";

function required(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required for the cloud ActivityPub runtime`);
  return value;
}

function canonicalOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw new TypeError("ACTIVITYPUB_ORIGIN must be one canonical HTTPS origin"); }
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new TypeError("ACTIVITYPUB_ORIGIN must be one canonical HTTPS origin");
  }
  return url.origin;
}

/**
 * Construct the shared production scheduler for a Cloud Run ActivityPub face.
 * Cloud Tasks owns authenticated retrial and immutable R2 custody carries the
 * exact Fedify message.  There is no process-local or filesystem fallback.
 */
export function createCloudActivityPubRuntime(options = {}) {
  const environment = options.environment ?? process.env;
  const origin = canonicalOrigin(required(environment, "ACTIVITYPUB_ORIGIN"));
  const workerOrigin = canonicalOrigin(required(environment, "ACTIVITYPUB_WORKER_ORIGIN"));
  const project = required(environment, "GOOGLE_CLOUD_PROJECT");
  const location = required(environment, "CLOUD_TASKS_LOCATION");
  const queueName = required(environment, "CLOUD_TASKS_QUEUE");
  const serviceAccountEmail = required(environment, "CLOUD_TASKS_SERVICE_ACCOUNT");
  const workerPath = options.workerPath ?? "/_private/activitypub-worker";
  if (!/^\/_private\/[a-z0-9][a-z0-9-]*$/u.test(workerPath)) throw new TypeError("cloud ActivityPub worker path is invalid");
  const targetUrl = new URL(workerPath, workerOrigin).href;
  const request = (options.createGoogleApiRequest ?? createGoogleApiRequest)(options.googleApiRequestOptions);
  const immutableOptions = options.immutableContentCustodyOptions
    ?? { r2: createR2RestClient(r2RestConfiguration(environment)) };
  const immutable = (options.createImmutableContentCustody ?? createImmutableContentCustody)(immutableOptions);
  if (!immutable || typeof immutable.put !== "function" || typeof immutable.get !== "function") {
    throw new TypeError("immutable content custody must expose put and get");
  }
  const authenticate = (options.createGoogleOidcVerifier ?? createGoogleOidcVerifier)({
    audience: targetUrl,
    serviceAccountEmail,
    ...(options.oidcVerifierOptions ?? {}),
  });
  const queue = (options.createCloudTasksMessageQueue ?? createCloudTasksMessageQueue)({
    project,
    location,
    queue: queueName,
    targetUrl,
    audience: targetUrl,
    serviceAccountEmail,
    request,
    custody: immutable,
    authenticate,
  });
  return Object.freeze({ origin, workerOrigin, targetUrl, queue });
}
