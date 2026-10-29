import type { WebResponseRepresentation } from "@red-cup-engineering/http-server-application-contract-service/web";
export type { WebResponseRepresentation } from "@red-cup-engineering/http-server-application-contract-service/web";
export declare function strongEntityTag(body: string | Uint8Array<ArrayBuffer>): Promise<string>;
export declare function formResponse(request: Request, representation?: WebResponseRepresentation): Promise<Response>;
