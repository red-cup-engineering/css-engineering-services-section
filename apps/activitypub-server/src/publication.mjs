/**
 * A site's publications served over ActivityPub: an actor whose outbox is what the site lists as
 * published (read live, so rebuilds show), whose verified inbox arrivals go to the caller's custody,
 * mounted as an HTTP application. The site supplies `context.listPublications()`, `context.site.baseIri`.
 *
 * `config`: `identifier`, `actorName`, `summary`, `keyPairs` and the provider's other options, with
 * `custody(arrival)` (and optionally `authorizeInbox`) or a whole `inbox`; `createProvider` and
 * `createApplication` replace the ActivityPub section's publication provider and application.
 */
import { createPublicationActivityPubProvider } from "@red-cup-engineering/activitypub-services-section/publication";
import { activityPubApplication } from "@red-cup-engineering/activitypub-services-section/app";

/** The ActivityPub application for a site's publications. */
export async function publicationActivityPubApplication(context, config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new TypeError("ActivityPub configuration must be an object");
  if (typeof context?.listPublications !== "function") throw new TypeError("ActivityPub needs the site's listPublications()");
  const {
    createProvider = createPublicationActivityPubProvider, createApplication = activityPubApplication,
    custody, authorizeInbox, inbox, ...providerOptions
  } = config;
  if (custody !== undefined && typeof custody !== "function") throw new TypeError("ActivityPub custody must be a function");
  if (authorizeInbox !== undefined && typeof authorizeInbox !== "function") throw new TypeError("ActivityPub authorizeInbox must be a function");
  if (inbox !== undefined && custody !== undefined) throw new TypeError("ActivityPub configuration accepts either inbox or custody, not both");
  if (authorizeInbox !== undefined && custody === undefined) throw new TypeError("ActivityPub authorizeInbox accompanies custody; include it in an explicit inbox otherwise");
  const custodyInbox = custody === undefined ? undefined : Object.freeze({ onActivity: custody, ...(authorizeInbox === undefined ? {} : { authorizeInbox }) });
  const provider = await createProvider({
    ...providerOptions,
    origin: providerOptions.origin ?? context.site?.baseIri,
    listPublications: context.listPublications,
    ...((inbox ?? custodyInbox) === undefined ? {} : { inbox: inbox ?? custodyInbox }),
  });
  if (!provider || typeof provider.fetch !== "function") throw new TypeError("ActivityPub provider must have fetch(request)");
  const application = await createApplication(provider);
  if (!application || typeof application !== "object" || Array.isArray(application)) throw new TypeError("ActivityPub application must be an HTTP application");
  return application;
}

/** The publication application as an application factory a host calls with its context. */
export function createPublicationActivityPubFactory(config) {
  return (context) => publicationActivityPubApplication(context, config);
}
