import type { App } from "@red-cup-engineering/http-server-application-contract-service";

export declare function mergeApps(...apps: App[]): App;
export declare function compose(app: App, ...plugins: Array<(app: App) => App>): App;
