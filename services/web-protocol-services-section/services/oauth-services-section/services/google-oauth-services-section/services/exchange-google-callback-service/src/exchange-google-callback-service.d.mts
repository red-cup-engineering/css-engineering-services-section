export type GoogleIdentity = { email: string; emailVerified: boolean };

export declare function exchangeGoogleCallback(
  googleCode: string,
  config: { googleClientId: string; googleClientSecret: string; publicBaseUrl: string },
): Promise<GoogleIdentity>;
