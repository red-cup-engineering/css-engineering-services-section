export const CONTENT_READER_CONTRACT_VERSION: "content-reader/v1";

export interface SourceDependency {
  readonly kind: "filesystem-directory" | "filesystem-file";
  readonly href: string;
  readonly sha256?: string;
}

export interface SourceRecord {
  readonly contractVersion: "content-reader/v1";
  readonly id: string;
  readonly extension: string;
  readonly provenance: {
    readonly kind: "filesystem";
    readonly root: string;
    readonly href: string;
    readonly sha256: string;
    readonly byteLength: number;
  };
  readonly dependencies: readonly SourceDependency[];
}

export interface MarkdownDocumentReading {
  readonly subject: string;
  readonly format: "yaml" | "toml" | null;
  readonly frontmatter: Readonly<Record<string, unknown>>;
  readonly body: string;
  readonly structure: unknown;
  readonly features: readonly unknown[];
  readonly assertions: readonly unknown[];
}

export interface MarkdownReadOptions {
  readonly coordinate?: string;
  readonly subject?: string;
  readonly frontmatterFormats?: readonly ("yaml" | "toml")[];
  readonly jsonObjectFrontmatter?: boolean;
}

export type MarkdownSourceRecord = SourceRecord & {
  readonly bytes: Uint8Array;
  readonly document: MarkdownDocumentReading;
};

export interface FilesystemContentReader {
  readonly contractVersion: "content-reader/v1";
  readonly kind: "filesystem-content-reader";
  readonly root: string;
  readonly extensions: readonly string[];
  listRecords(): Promise<readonly SourceRecord[]>;
  readRecord(record: string | Pick<SourceRecord, "id">): Promise<SourceRecord & { readonly bytes: Uint8Array }>;
  readMarkdownRecord(record: string | Pick<SourceRecord, "id">, options?: MarkdownReadOptions): Promise<MarkdownSourceRecord>;
}

export function readFilesystemMarkdownRecord(
  reader: Pick<FilesystemContentReader, "readRecord">,
  record: string | Pick<SourceRecord, "id">,
  options?: MarkdownReadOptions,
): Promise<MarkdownSourceRecord>;

export function createFilesystemContentReader(options: {
  root: string;
  extensions?: readonly string[];
}): Promise<FilesystemContentReader>;
