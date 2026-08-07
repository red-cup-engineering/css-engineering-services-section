import assert from "node:assert/strict";
import test from "node:test";
import { createCloudActivityPubRuntime } from "../src/cloud-runtime.mjs";

const environment = {
  ACTIVITYPUB_ORIGIN: "https://bare-cedar-fog.561.group",
  ACTIVITYPUB_WORKER_ORIGIN: "https://codex-activitypub-a2d7mjqbfa-uc.a.run.app",
  GOOGLE_CLOUD_PROJECT: "five-six-one-group-dev",
  CLOUD_TASKS_LOCATION: "us-central1",
  CLOUD_TASKS_QUEUE: "activitypub",
  CLOUD_TASKS_SERVICE_ACCOUNT: "activitypub@example.iam.gserviceaccount.com",
  CLOUDFLARE_R2_ACCOUNT_ID: "337e54ee6dc7d488933f473204a6d89e",
  CLOUDFLARE_R2_BUCKET: "red-cup-engineering-resource-brokerage",
  CLOUDFLARE_API_TOKEN: "assay-token",
};

test("cloud runtime binds an authenticated custody-only queue to the canonical origin", () => {
  let queueOptions;
  const immutable = { put() {}, get() {} };
  const runtime = createCloudActivityPubRuntime({
    environment,
    createGoogleApiRequest: () => "google-request",
    createImmutableContentCustody: (input) => { assert.equal(typeof input.r2.get, "function"); return immutable; },
    createGoogleOidcVerifier: (input) => ({ verified: input }),
    createCloudTasksMessageQueue: (input) => { queueOptions = input; return { consume() {} }; },
  });
  assert.equal(runtime.origin, environment.ACTIVITYPUB_ORIGIN);
  assert.equal(runtime.workerOrigin, environment.ACTIVITYPUB_WORKER_ORIGIN);
  assert.equal(runtime.targetUrl, `${environment.ACTIVITYPUB_WORKER_ORIGIN}/_private/activitypub-worker`);
  assert.equal(queueOptions.custody, immutable);
  assert.equal(queueOptions.request, "google-request");
  assert.equal(queueOptions.authenticate.verified.audience, runtime.targetUrl);
  assert.equal(queueOptions.serviceAccountEmail, environment.CLOUD_TASKS_SERVICE_ACCOUNT);
});

test("cloud runtime refuses a noncanonical or incomplete production boundary", () => {
  assert.throws(() => createCloudActivityPubRuntime({ environment: { ...environment, ACTIVITYPUB_ORIGIN: "http://localhost:8000" } }), /canonical HTTPS origin/u);
  assert.throws(() => createCloudActivityPubRuntime({ environment: { ...environment, ACTIVITYPUB_WORKER_ORIGIN: "" } }), /ACTIVITYPUB_WORKER_ORIGIN/u);
  assert.throws(() => createCloudActivityPubRuntime({ environment: { ...environment, CLOUD_TASKS_QUEUE: "" } }), /CLOUD_TASKS_QUEUE/u);
});
