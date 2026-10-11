// world-keeper — a hosted world is kept running by visits, never by a hand.
//
// A durable world (feltos world-host/worker) pays its clock what elapsed wall time owes it, and drops
// presence that has gone silent, on every GET /world; each visit pays a bounded part and the host says
// what is still owed in the `x-world-ticks-owed` header. The node's declared job calls keepWorld on a
// schedule, so a world nobody is watching still advances, and a missed run costs nothing the next one
// does not repay (the host forgives owed time past its own ceiling, so the work is O(visits), not
// O(elapsed time)). The keeper holds no state of its own: the world's clock is the world's.

export const TICKS_OWED_HEADER = "x-world-ticks-owed";

/**
 * Visit a hosted world until it owes its clock nothing, or maxVisits visits have been made.
 * @param {{url: string, fetch?: typeof fetch, maxVisits?: number}} options
 * @returns {Promise<{visits: number, owed: number|null, present: object|null}>} owed is null when the host does not report it.
 */
export async function keepWorld({ url, fetch: request = globalThis.fetch, maxVisits = 12 }) {
  if (typeof url !== "string" || !/^https?:\/\//u.test(url)) throw new TypeError("keepWorld needs the world's http(s) url");
  if (!Number.isSafeInteger(maxVisits) || maxVisits < 1) throw new TypeError("maxVisits must be a positive integer");
  const world = new URL("/world", url);
  let visits = 0;
  let owed = null;
  let present = null;
  while (visits < maxVisits) {
    const response = await request(world, { headers: { accept: "application/json" }, cache: "no-store" });
    visits += 1;
    if (!response.ok) throw new Error(`world ${world.href} answered ${response.status}`);
    present = (await response.json())?.present ?? null;
    const reported = response.headers.get(TICKS_OWED_HEADER);
    owed = reported === null ? null : Number(reported);
    if (owed === null || !(owed > 0)) break;
  }
  return { visits, owed, present };
}
