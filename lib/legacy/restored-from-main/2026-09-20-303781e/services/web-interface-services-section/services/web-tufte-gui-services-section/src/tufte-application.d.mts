import type { WebApplicationSpecification, WebApplicationContext, WebContext, WebApplicationResource, WebApplicationEngine, WebMiddleware } from '@red-cup-engineering/web-server-services-section';
import type { BodyParseOptions } from '@red-cup-engineering/read-http-request-body-service/web';
import type { TufteModel } from './tufte-browser.mjs';
import type { RenderTufteDocumentOptions } from './render-tufte-document.mjs';
export type { WebContext, WebApplicationContext, WebExecutionContext, WebFetchHandler, WebApplicationResource, WebApplicationEngine } from '@red-cup-engineering/web-server-services-section';
export interface TufteEnhancement { navigation?: boolean; forms?: boolean; /** Each same-origin module exports mount(element, props). */ components?: Readonly<Record<string, string>>; }
export interface TuftePageOptions { status?: number; headers?: HeadersInit; document?: RenderTufteDocumentOptions; enhance?: boolean | TufteEnhancement; }
export interface TuftePage extends TuftePageOptions { readonly kind: 'tufte.page'; readonly model: TufteModel; readonly status: number; }
/** Enhancement-only response; Location is admitted HTTP(S), status records the native redirect. */
export interface TufteRedirectProjection { readonly kind: 'tufte.redirect'; readonly location: string; readonly status: 301 | 302 | 303 | 307 | 308; }
export type TuftePageHandler = (context: WebApplicationContext) => TuftePage | Response | Promise<TuftePage | Response>;
export interface TuftePageResource extends Omit<WebApplicationResource, 'handler' | 'methods' | 'produces'> { load: TuftePageHandler; }
export type TufteActionInput = WebApplicationContext['input'];
export type TufteActionContext = WebApplicationContext;
export interface TufteActionResource extends Omit<WebApplicationResource, 'handler' | 'produces'> { body?: BodyParseOptions; run: (context: TufteActionContext) => TuftePage | Response | Promise<TuftePage | Response>; }
export interface TufteApplicationOptions extends Omit<WebApplicationSpecification, 'resources'> {
  pages?: readonly TuftePageResource[]; actions?: readonly TufteActionResource[]; resources?: readonly WebApplicationResource[];
  document?: RenderTufteDocumentOptions; enhance?: boolean | TufteEnhancement;
  /** Shared reader limits; default 1 MiB encoded and decoded. Each action can specialize them. */
  body?: BodyParseOptions;
  /** Replaces the default same-origin check, e.g. verified webhook signature or CSRF token. */
  csrf?: (context: WebContext) => boolean | Response | Promise<boolean | Response>;
  /** Inject the session/authentication service here or in resource middlewares. */
  authorize?: WebMiddleware;
}
export const TUFTE_RUNTIME_PATH: string;
export function tuftePage(model: TufteModel, options?: TuftePageOptions): TuftePage;
export function tufteRedirect(location: string, status?: 301 | 302 | 303 | 307 | 308): Response;
export function sameOriginTufteAction(context: WebContext): boolean;
export function createTufteApplication(options?: TufteApplicationOptions): WebApplicationEngine;
