export interface BrowserProfile {
  name: string;
  viewport: { width: number; height: number };
  isMobile?: boolean;
  hasTouch?: boolean;
  colorScheme?: 'light' | 'dark' | 'no-preference';
  reducedMotion?: 'reduce' | 'no-preference';
}

export interface BrowserDiagnostic {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  route: string;
  profile: string;
  detail?: unknown;
}

export interface BrowserPageLike {
  on?(event: string, listener: (...values: any[]) => void): void;
  goto(url: string, options: { waitUntil: 'load'; timeout: number }): Promise<{ status(): number } | null>;
  url(): string;
  evaluate<T>(callback: () => T): Promise<T>;
  keyboard: { press(key: string): Promise<void> };
  close?(): Promise<void>;
}

export interface BrowserLike {
  newContext(options: Record<string, unknown>): Promise<{
    newPage(): Promise<BrowserPageLike>;
    close?(): Promise<void>;
  }>;
}

export interface BrowserConformanceResult {
  kind: 'browser-site-conformance';
  version: 1;
  origin: string;
  passed: boolean;
  profiles: Array<Pick<BrowserProfile, 'name' | 'viewport'>>;
  observations: Array<Record<string, unknown>>;
  diagnostics: BrowserDiagnostic[];
}

export function representativeBrowserProfiles(): BrowserProfile[];

export function conformBrowserSite(options: {
  browser: BrowserLike;
  origin: string | URL;
  paths?: string[];
  profiles?: BrowserProfile[];
  maxRoutes?: number;
  timeoutMs?: number;
  overflowTolerance?: number;
  accessibilityAudit?: (page: BrowserPageLike, context: { route: string; profile: string; url: string }) => Promise<Array<Partial<BrowserDiagnostic> & Pick<BrowserDiagnostic, 'code' | 'message'>>>;
}): Promise<BrowserConformanceResult>;
