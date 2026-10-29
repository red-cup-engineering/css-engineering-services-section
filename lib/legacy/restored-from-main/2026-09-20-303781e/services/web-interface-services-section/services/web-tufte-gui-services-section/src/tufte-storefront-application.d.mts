import type { TufteApplicationOptions, TuftePageHandler } from './tufte-application.mjs';
import type { TufteStorefront } from './tufte-storefront.mjs';
import { createTufteApplication } from './tufte-application.mjs';
export interface TufteStorefrontApplicationOptions extends TufteApplicationOptions {
  catalog: TufteStorefront | ((context: Parameters<TuftePageHandler>[0]) => TufteStorefront | Promise<TufteStorefront>);
  path?: string;
  /** One shared-router :id parameter; the same pattern generates detail links. */
  itemPath?: string;
}
export function createTufteStorefront(options: TufteStorefrontApplicationOptions): ReturnType<typeof createTufteApplication>;
