import { chargeNameOfSides, chargeSidesOf } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
export function chargeValueFromBits(positive, negative) {
    return chargeNameOfSides(positive, negative);
}
export function chargeBits(value) {
    return chargeSidesOf(value);
}
export function chargeValueFromEvidence(items) {
    let positive = false;
    let negative = false;
    for (const item of items){
        positive ||= Boolean(item.charge.value[0]);
        negative ||= Boolean(item.charge.value[1]);
    }
    return chargeValueFromBits(positive, negative);
}
