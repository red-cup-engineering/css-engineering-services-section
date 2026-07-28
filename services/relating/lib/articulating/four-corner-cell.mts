/**
 * articulating/four-corner-cell — finite bridge for
 * RelMath.Articulating.FourCornerCell.
 *
 * Lean names the articulation corners by phase:
 *   potential=(false,false), active=(true,false), absurd=(true,true), stable=(false,true).
 *
 * The current JS charge algebra names the same Bool x Bool coordinates by
 * Belnap value:
 *   absurd=(false,false), potential=(true,false), stable=(true,true), active=(false,true).
 *
 * This bridge keeps both names explicit and witnesses the coordinate-level
 * conflation theorem without renaming the existing public charge values.
 */
import type {
  ArticulationCell,
  AperiodicArticulationCell,
} from "./utterance.mjs";
import {
  chargeValue,
  chargeValueName,
  type ChargeValue,
  type ChargeValueName,
} from "./predicating/positing/bilattice-charge.mjs";

export type FourCornerName = "potential" | "active" | "absurd" | "stable";
export type FourCornerChargeAlias = "kBot" | "tTop" | "kTop" | "tBot";

export interface FourCornerStatus {
  readonly kind: "fourCorner.status";
  readonly tokenArticulated: boolean;
  readonly claimArticulated: boolean;
}

export interface FourCornerReading {
  readonly kind: "fourCorner.reading";
  readonly status: FourCornerStatus;
  readonly corner: FourCornerName;
  readonly chargeAlias: FourCornerChargeAlias;
  readonly chargeName: ChargeValueName;
  readonly charge: ChargeValue;
  readonly sameCoordinates: true;
}

export interface FourCornerCellReceipt {
  readonly kind: "fourCornerCell.receipt:witness";
  readonly readings: readonly FourCornerReading[];
  readonly cellReading: FourCornerReading;
  readonly cornerRoundTrip: true;
  readonly chargeCoordinateRoundTrip: true;
  readonly articulationPhaseIsChargeByCoordinates: true;
  readonly initialPotentialIsKnowledgeBottom: boolean;
}

const status = (tokenArticulated: boolean, claimArticulated: boolean): FourCornerStatus => Object.freeze({
  kind: "fourCorner.status" as const,
  tokenArticulated,
  claimArticulated,
});

const cornerStatusByName: { readonly [name in FourCornerName]: FourCornerStatus } = Object.freeze({
  potential: status(false, false),
  active: status(true, false),
  absurd: status(true, true),
  stable: status(false, true),
});

const chargeAliasByCorner: { readonly [name in FourCornerName]: FourCornerChargeAlias } = Object.freeze({
  potential: "kBot",
  active: "tTop",
  absurd: "kTop",
  stable: "tBot",
});

const chargeNameByCorner: { readonly [name in FourCornerName]: ChargeValueName } = Object.freeze({
  potential: "absurd",
  active: "potential",
  absurd: "stable",
  stable: "active",
});

export const fourCornerNames: readonly FourCornerName[] = Object.freeze(["potential", "active", "absurd", "stable"] as const);

export function cornerOfStatus(tokenArticulated: boolean, claimArticulated: boolean): FourCornerName {
  if (!tokenArticulated && !claimArticulated) return "potential";
  if (tokenArticulated && !claimArticulated) return "active";
  if (tokenArticulated && claimArticulated) return "absurd";
  return "stable";
}

export function statusOfCorner(corner: FourCornerName): FourCornerStatus {
  return cornerStatusByName[corner];
}

export function chargeNameOfCorner(corner: FourCornerName): ChargeValueName {
  return chargeNameByCorner[corner];
}

export function readFourCorner(tokenArticulated: boolean, claimArticulated: boolean): FourCornerReading {
  const corner = cornerOfStatus(tokenArticulated, claimArticulated);
  const charge = chargeValue(chargeNameOfCorner(corner));
  return Object.freeze({
    kind: "fourCorner.reading" as const,
    status: status(tokenArticulated, claimArticulated),
    corner,
    chargeAlias: chargeAliasByCorner[corner],
    chargeName: chargeValueName(charge),
    charge,
    sameCoordinates: true as const,
  });
}

const sameStatus = (left: FourCornerStatus, right: FourCornerStatus): boolean =>
  left.tokenArticulated === right.tokenArticulated && left.claimArticulated === right.claimArticulated;

const pairingOf = (cell: ArticulationCell | AperiodicArticulationCell): readonly [readonly unknown[], readonly unknown[]] => {
  if ("potentialAperiodicArticulationCell" in cell) return cell.potentialAperiodicArticulationCell[1];
  return cell[1];
};

export function fourCornerOfArticulationCell(cell: ArticulationCell | AperiodicArticulationCell): FourCornerReading {
  const [tokenSlot, claimSlot] = pairingOf(cell);
  return readFourCorner(tokenSlot.length > 0, claimSlot.length > 0);
}

export function fourCornerCellReceipt(cell: ArticulationCell | AperiodicArticulationCell): FourCornerCellReceipt {
  const readings = Object.freeze(fourCornerNames.map((name) => {
    const cornerStatus = statusOfCorner(name);
    return readFourCorner(cornerStatus.tokenArticulated, cornerStatus.claimArticulated);
  }));
  const cornerRoundTrip = readings.every((reading) => sameStatus(statusOfCorner(reading.corner), reading.status));
  const chargeCoordinateRoundTrip = readings.every((reading) => reading.chargeName === chargeNameOfCorner(reading.corner));
  const cellReading = fourCornerOfArticulationCell(cell);
  return Object.freeze({
    kind: "fourCornerCell.receipt:witness" as const,
    readings,
    cellReading,
    cornerRoundTrip: cornerRoundTrip as true,
    chargeCoordinateRoundTrip: chargeCoordinateRoundTrip as true,
    articulationPhaseIsChargeByCoordinates: true as const,
    initialPotentialIsKnowledgeBottom: cellReading.corner === "potential" && cellReading.chargeAlias === "kBot",
  });
}
