import {
  resource,
  responseMessage,
  type Resource,
  type ResponseMessage,
} from "@red-cup-engineering/organizing-with-the-web/topology";
import { negotiateType } from "@red-cup-engineering/relating/writing/http";
import { cacheControl, joinedHeader, linkHeader } from "@red-cup-engineering/relating/writing/http";

export type CoolUriRepresentation = {
  type: string;
  path: string;
  rel?: string;
};

export type CoolUriResourceOptions = {
  subjectPath?: string;
  subjectParam?: string;
  defaultType?: string;
  representations: readonly CoolUriRepresentation[];
  exists?: (subject: string) => boolean | Promise<boolean>;
};

export type CoolUriChoice = {
  subject: string;
  type: string;
  location: string;
  links: string;
};

function assertRepresentation(representation: CoolUriRepresentation): void {
  if (!representation.type) throw new TypeError("representation.type is required");
  if (!representation.path.startsWith("/")) throw new TypeError("representation.path must start with /");
}

function requireRepresentations(representations: readonly CoolUriRepresentation[]): void {
  if (representations.length === 0) throw new TypeError("at least one representation is required");
  for (const representation of representations) assertRepresentation(representation);
}

function pathFor(pattern: string, subject: string, subjectParam = "subject"): string {
  const encoded = encodeURIComponent(subject);
  return pattern.replace(`:${subjectParam}`, encoded);
}

function absolute(path: string, requestUrl: URL): string {
  return new URL(path, requestUrl).href;
}

export function coolUriChoice(
  subject: string,
  accept: string | undefined,
  requestUrl: URL,
  representations: readonly CoolUriRepresentation[],
  opts: { defaultType?: string; subjectParam?: string } = {},
): CoolUriChoice {
  requireRepresentations(representations);
  if (!subject) throw new TypeError("subject is required");
  const types = representations.map((representation) => representation.type);
  const type = negotiateType(accept, types) ?? opts.defaultType ?? representations[0]!.type;
  const representation = representations.find((candidate) => candidate.type === type) ?? representations[0]!;
  const links = linkHeader(representations.map((candidate) => ({
    href: absolute(pathFor(candidate.path, subject, opts.subjectParam), requestUrl),
    rel: candidate.rel ?? "alternate",
    type: candidate.type,
  })));
  return {
    subject,
    type: representation.type,
    location: absolute(pathFor(representation.path, subject, opts.subjectParam), requestUrl),
    links,
  };
}

function notFound(): ResponseMessage {
  return responseMessage(404, {
    headers: { "content-type": "text/plain; charset=utf-8" },
    body: "Not Found",
  });
}

function seeOther(choice: CoolUriChoice): ResponseMessage {
  return responseMessage(303, {
    headers: {
      location: choice.location,
      link: choice.links,
      vary: "Accept",
      "cache-control": cacheControl({ visibility: "public", maxAge: 300 }),
      "content-type": "text/plain; charset=utf-8",
    },
    body: `See Other: ${choice.location}\n`,
  });
}

/** The cool-URI redirect as a described resource: GET at the subject
 * address negotiates among the representations and answers 303. */
export function coolUriResource(options: CoolUriResourceOptions): Resource {
  const subjectPath = options.subjectPath ?? "/id/:subject";
  const subjectParam = options.subjectParam ?? "subject";
  requireRepresentations(options.representations);
  return resource(subjectPath, ["GET"], async (request, bindings) => {
    const subject = bindings[subjectParam];
    if (!subject) return notFound();
    if (options.exists && !await options.exists(subject)) return notFound();
    const accept = request.headers["accept"];
    const choiceOptions: { defaultType?: string; subjectParam?: string } = { subjectParam };
    if (options.defaultType !== undefined) choiceOptions.defaultType = options.defaultType;
    const choice = coolUriChoice(
      subject,
      accept === undefined ? undefined : joinedHeader(accept),
      request.target,
      options.representations,
      choiceOptions,
    );
    return seeOther(choice);
  });
}
