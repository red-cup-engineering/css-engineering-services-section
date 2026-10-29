import {
  chargeValue,
  chargeValueNames,
  type ChargeValueName,
} from "@lenticule-science/articulating/predicating/positing";

export function chargeSidesOf(
  name: ChargeValueName,
): readonly [boolean, boolean] {
  const [truth, falsity] = chargeValue(name).coordinates;
  return [truth.name === "present", falsity.name === "present"];
}

export function chargeNameOfSides(
  truthPresent: boolean,
  falsityPresent: boolean,
): ChargeValueName {
  for (const name of chargeValueNames) {
    const [truth, falsity] = chargeSidesOf(name);
    if (truth === truthPresent && falsity === falsityPresent) return name;
  }
  throw new TypeError(
    "The four-valued charge algebra is total on evidence-side pairs",
  );
}

export function joinKnowledgeNames(
  names: Iterable<ChargeValueName>,
): ChargeValueName {
  let truth = false;
  let falsity = false;
  for (const name of names) {
    const pair = chargeSidesOf(name);
    truth ||= pair[0];
    falsity ||= pair[1];
  }
  return chargeNameOfSides(truth, falsity);
}
