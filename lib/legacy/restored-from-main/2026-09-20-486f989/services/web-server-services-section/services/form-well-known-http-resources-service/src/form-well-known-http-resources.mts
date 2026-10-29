import type {
  App,
  Handler,
  Repr,
  Resource,
} from "@red-cup-engineering/http-server-application-contract-service";

export type WellKnownEntry = {
  name: string;
  handler?: Handler;
  repr?: Repr | ((pathRemainder: string, ctx: Parameters<Handler>[0]) => Repr | Promise<Repr>);
  methods?: readonly string[];
  produces?: readonly string[];
  prefix?: boolean;
};

export type WellKnownOptions = {
  basePath?: string;
};

const WELL_KNOWN_TOKEN = /^[A-Za-z0-9._~-]+$/;

function assertWellKnownName(name: string): void {
  if (!WELL_KNOWN_TOKEN.test(name) || name === "." || name === "..") {
    throw new TypeError(`invalid well-known name: ${name}`);
  }
}

function wellKnownBase(basePath: string | undefined): string {
  if (!basePath) return "/.well-known";
  const trimmed = basePath.replace(/\/+$/, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
}

function entryHandler(entry: WellKnownEntry): Handler {
  if (entry.handler) return entry.handler;
  if (!entry.repr) throw new TypeError(`well-known entry ${entry.name} needs a handler or repr`);
  const representation = entry.repr;
  return async (ctx) => {
    const remainder = ctx.params.remainder ?? "";
    return typeof representation === "function" ? await representation(remainder, ctx) : representation;
  };
}

export function wellKnown(entries: readonly WellKnownEntry[], options: WellKnownOptions = {}): App {
  const basePath = wellKnownBase(options.basePath);
  const resources: Resource[] = entries.map((entry) => {
    assertWellKnownName(entry.name);
    const path = `${basePath}/${entry.name}`;
    const resource: Resource = {
      match: entry.prefix
        ? new RegExp(`^${escapeRegex(path)}(?:/(?<remainder>.*))?$`)
        : path,
      methods: entry.methods ?? ["GET", "HEAD"],
      handler: entryHandler(entry),
    };
    if (entry.produces) resource.produces = entry.produces;
    return resource;
  });
  return { resources };
}
