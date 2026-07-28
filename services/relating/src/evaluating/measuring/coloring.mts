/**
 * evaluating/measuring/coloring — RMN normalizers for finite graph-coloring witnesses.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";
import { objectTerm, stringTerm } from "../projecting/index.mjs";

const field = (key: string): Tm => tm.field(key, tm.var(0));

const properColoringWitness = objectTerm([
  ["colorCount", field("colorCount")],
  ["colors", field("colors")],
  ["kind", stringTerm("meme-analysis.coloring.proper:witness")],
]);

const properColoringObstruction = objectTerm([
  ["colorCount", field("colorCount")],
  ["kind", stringTerm("meme-analysis.coloring.proper-obstruction")],
]);

/** Normalize a finite proper-coloring witness/obstruction. */
export const properColoringTerm: Tm = tm.lam(
  tm.cond(
    tm.coincide(field("kind"), stringTerm("meme-analysis.coloring.proper:witness")),
    properColoringWitness,
    properColoringObstruction,
  ),
);

const factorMapWitness = objectTerm([
  ["colors", field("colors")],
  ["equivalent", field("equivalent")],
  ["graphHom", field("graphHom")],
  ["kind", stringTerm("meme-analysis.coloring.factorMap:witness")],
  ["proper", field("proper")],
]);

const factorMapObstruction = objectTerm([
  ["colors", field("colors")],
  ["equivalent", field("equivalent")],
  ["graphHom", field("graphHom")],
  ["kind", stringTerm("meme-analysis.coloring.factorMap-obstruction")],
  ["proper", field("proper")],
  ["reason", field("reason")],
]);

/** Normalize `proper coloring iff graph hom into complete palette` witnesses. */
export const coloringFactorMapTerm: Tm = tm.lam(
  tm.cond(
    tm.coincide(field("kind"), stringTerm("meme-analysis.coloring.factorMap:witness")),
    factorMapWitness,
    factorMapObstruction,
  ),
);

/** Normalize complete-graph chromatic-number extremal witnesses. */
export const completeGraphChromaticTerm: Tm = tm.lam(objectTerm([
  ["chromaticNumber", field("chromaticNumber")],
  ["kind", stringTerm("meme-analysis.coloring.completeGraphChromatic:witness")],
  ["lowerBoundByInjection", field("lowerBoundByInjection")],
  ["properColoringCountAtSelfPalette", field("properColoringCountAtSelfPalette")],
  ["requiresAllColours", field("requiresAllColours")],
  ["selfColoring", field("selfColoring")],
  ["vertexCount", field("vertexCount")],
]));

const handshakeWitness = objectTerm([
  ["degreeSum", field("degreeSum")],
  ["degreeSumEven", field("degreeSumEven")],
  ["degrees", field("degrees")],
  ["directedEdgeCount", field("directedEdgeCount")],
  ["kind", stringTerm("meme-analysis.coloring.handshakeDegreeParity:witness")],
  ["oddDegreeCount", field("oddDegreeCount")],
  ["oddDegreeCountEven", field("oddDegreeCountEven")],
]);

const handshakeObstruction = objectTerm([
  ["kind", stringTerm("meme-analysis.coloring.handshakeDegreeParity-obstruction")],
  ["reason", field("reason")],
]);

/** Normalize finite handshake/odd-degree parity witnesses. */
export const handshakeDegreeParityTerm: Tm = tm.lam(
  tm.cond(
    tm.coincide(field("kind"), stringTerm("meme-analysis.coloring.handshakeDegreeParity:witness")),
    handshakeWitness,
    handshakeObstruction,
  ),
);

const oddWalkWitness = objectTerm([
  ["closed", field("closed")],
  ["kind", stringTerm("meme-analysis.coloring.oddClosedWalkBipartiteObstruction:witness")],
  ["notBipartite", field("notBipartite")],
  ["oddLength", field("oddLength")],
  ["start", field("start")],
  ["validWalk", field("validWalk")],
  ["walk", field("walk")],
]);

const oddWalkObstruction = objectTerm([
  ["closed", field("closed")],
  ["kind", stringTerm("meme-analysis.coloring.oddClosedWalkBipartiteObstruction-obstruction")],
  ["oddLength", field("oddLength")],
  ["reason", field("reason")],
  ["start", field("start")],
  ["validWalk", field("validWalk")],
  ["walk", field("walk")],
]);

/** Normalize odd-closed-walk obstructions to Bool-colorability. */
export const oddClosedWalkBipartiteObstructionTerm: Tm = tm.lam(
  tm.cond(
    tm.coincide(field("kind"), stringTerm("meme-analysis.coloring.oddClosedWalkBipartiteObstruction:witness")),
    oddWalkWitness,
    oddWalkObstruction,
  ),
);

/** Normalize the finite `RelMath.Order.CombinatoricsExtremal` bundled receipt. */
export const combinatoricsExtremalTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite Ramsey `R(3,3) <= 6` monochromatic-triangle witness. */
export const ramseyThreeThreeTerm: Tm = tm.lam(tm.var(0));
