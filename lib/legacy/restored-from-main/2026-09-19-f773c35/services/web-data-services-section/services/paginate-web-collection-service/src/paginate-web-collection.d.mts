export interface CollectionPage<T> {
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly offset: number;
  readonly items: readonly T[];
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly previousPage: number | null;
  readonly nextPage: number | null;
}

export interface CollectionPageLinks {
  readonly self: string;
  readonly first: string;
  readonly previous: string | null;
  readonly next: string | null;
  readonly last: string;
}

export interface PageOptions {
  readonly page?: number;
  readonly pageSize?: number;
}

export interface PageUrlOptions {
  readonly pageParam?: string;
}

export interface WebPaginationOptions extends PageOptions, PageUrlOptions {
  readonly baseUrl: string | URL;
}

export type PaginatedWebCollection<T> = CollectionPage<T> & {
  readonly links: CollectionPageLinks;
};

export function pageCollection<T>(items: readonly T[], options?: PageOptions): CollectionPage<T>;
export function collectionPageUrl(baseUrl: string | URL, page: number, options?: PageUrlOptions): string;
export function collectionPageLinks<T>(page: CollectionPage<T>, baseUrl: string | URL, options?: PageUrlOptions): CollectionPageLinks;
export function paginateWebCollection<T>(items: readonly T[], options: WebPaginationOptions): PaginatedWebCollection<T>;
export function paginationLinkHeader(links: CollectionPageLinks): string;
