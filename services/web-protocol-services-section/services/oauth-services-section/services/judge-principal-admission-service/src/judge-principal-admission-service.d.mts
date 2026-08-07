export declare function resolveAdmissionPolicy(config: {
  admitEmail?: (email: string) => boolean;
  allowedEmail?: string;
}): (email: string) => boolean;

export declare function judgePrincipalAdmission(
  identity: { email: string; emailVerified: boolean },
  admit: (email: string) => boolean,
): { admitted: true; email: string } | { admitted: false; reason: string };
