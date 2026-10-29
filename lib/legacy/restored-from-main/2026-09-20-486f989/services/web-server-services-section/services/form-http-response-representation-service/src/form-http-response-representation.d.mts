import type {
  JsonReprOptions,
  Repr,
  ReprOptions,
  TextReprOptions,
} from "@red-cup-engineering/http-server-application-contract-service";

export declare function jsonRepr(body: unknown, options?: number | JsonReprOptions): Repr;
export declare function textRepr(body: string, options?: number | TextReprOptions): Repr;
export declare function htmlRepr(body: string, options?: number | TextReprOptions): Repr;
export declare function emptyRepr(status?: number, options?: ReprOptions): Repr;
