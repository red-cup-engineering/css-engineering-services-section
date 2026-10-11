import { createDemoWorld as createArena } from "../src/demo-world.mjs";

export function createDemoWorld() {
  return createArena({ positionLimit: 50, entityKind: "actor", includeJoinedTick: true });
}
