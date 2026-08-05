import { generateKeyPairSync, randomBytes } from "node:crypto";
import { createAgentCardSigningConfiguration } from "@red-cup-engineering/a2a-agent-card-discovery-service";

export function ephemeralAgentCardSigning(baseUrl, label = "fixture") {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    ...createAgentCardSigningConfiguration({
    baseUrl,
    kid: `${label}-ed25519`,
    privateKey,
    publicJwk: publicKey.export({ format: "jwk" }),
    }),
    dependencyCallbackKey: randomBytes(32),
  };
}
