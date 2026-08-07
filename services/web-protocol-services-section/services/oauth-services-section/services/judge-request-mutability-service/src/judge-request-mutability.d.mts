export function judgeRequestMutability(input: { method: string | undefined; mutableFace: boolean }):
  | { allowed: true }
  | { allowed: false; status: 403; reason: string };
