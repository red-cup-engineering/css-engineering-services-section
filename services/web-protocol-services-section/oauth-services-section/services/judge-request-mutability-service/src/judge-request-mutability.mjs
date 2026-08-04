// judgeRequestMutability — method + face -> decision. A face is the network
// interface a request arrived on. A read-only face refuses every mutating
// method before authentication is even considered, so a public serving path
// stays inert by construction; write authority exists only on a mutable face.
/**
 * @param {{ method: string | undefined, mutableFace: boolean }} input
 * @returns {{ allowed: true } | { allowed: false, status: 403, reason: string }}
 */
export function judgeRequestMutability({ method, mutableFace }) {
  const reads = new Set(["GET", "HEAD", "OPTIONS"]);
  if (mutableFace || reads.has(String(method ?? "").toUpperCase())) return { allowed: true };
  return { allowed: false, status: 403, reason: "this face is read-only; mutating operations require the machine's own local face" };
}
