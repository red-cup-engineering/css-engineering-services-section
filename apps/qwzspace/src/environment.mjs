// environment — what the sky, the sea and the weather look like at a world time. Pure: a function
// of the FeltOS calendar (the same arithmetic the world clock keeps) and a game's static world
// description, so every tier and every client agrees on the light and the water at a given tick.
//
// Time may be fractional: a client interpolating between two ticks gets a sun and a tide between
// theirs, and at a whole tick the reading agrees with the clock's own phase and tide labels.

import { DAY_LENGTH, PHASES, TIDE_CYCLE, TIDE_LENGTH, TIDES } from "@red-cup-engineering/feltos/calendar";

// The lit part of the day is dawn, day and dusk; night is the last quarter.
const LIT = (PHASES.length - 1) / PHASES.length;
const NOON_ELEVATION = 55;
const MIDNIGHT_DEPTH = 30;

// How each of the clock's weathers reads as light, cloud, rain, haze and wind (0..1). A weather
// the table does not know reads as overcast rather than failing: the world may grow new weathers.
export const WEATHER_LOOKS = Object.freeze({
  clear: Object.freeze({ cloud: 0.1, precipitation: 0, fog: 0, wind: 0.2 }),
  heat: Object.freeze({ cloud: 0, precipitation: 0, fog: 0.15, wind: 0.1 }),
  rain: Object.freeze({ cloud: 0.8, precipitation: 0.6, fog: 0.3, wind: 0.5 }),
  storm: Object.freeze({ cloud: 1, precipitation: 1, fog: 0.5, wind: 1 }),
});
const OVERCAST = Object.freeze({ cloud: 0.6, precipitation: 0, fog: 0.2, wind: 0.3 });

const finiteTime = (time) => {
  const t = Number(time);
  if (!Number.isFinite(t) || t < 0) throw new TypeError("environment: time must be a nonnegative number");
  return t;
};

/** The sun at a time: azimuth in degrees clockwise from north, elevation in degrees above the
 *  horizon, and daylight (0 at night, 1 in full day, civil twilight between). */
export function sunAt(time) {
  const f = (finiteTime(time) % DAY_LENGTH) / DAY_LENGTH;
  const elevation = f < LIT
    ? NOON_ELEVATION * Math.sin(Math.PI * f / LIT)
    : -MIDNIGHT_DEPTH * Math.sin(Math.PI * (f - LIT) / (1 - LIT));
  const azimuth = (f < LIT ? 90 + 180 * f / LIT : 270 + 180 * (f - LIT) / (1 - LIT)) % 360;
  const daylight = Math.max(0, Math.min(1, (elevation + 6) / 18));
  return Object.freeze({ azimuth, elevation, daylight });
}

/** The water level at a time, in metres about the datum: a cosine through the clock's tides, at
 *  its lowest in the middle of `low` and its highest in the middle of `high`. */
export function tideLevelAt(time, { meanHighWater = 1 } = {}) {
  const low = TIDES.indexOf("low") * TIDE_LENGTH + TIDE_LENGTH / 2;
  return -meanHighWater * Math.cos(2 * Math.PI * (finiteTime(time) - low) / TIDE_CYCLE);
}

/** The whole environment a scene is drawn under: the clock's reading plus the sun, the water and
 *  the weather's look. `world` is the game's static description ({tide, terrain}); both optional. */
export function environmentAt(clock, world = {}) {
  const time = finiteTime(clock?.time ?? 0);
  const weather = String(clock?.weather ?? "clear");
  return Object.freeze({
    time,
    phase: clock?.phase ?? null,
    season: clock?.season ?? null,
    tide: clock?.tide ?? null,
    sun: sunAt(time),
    water: Object.freeze({ level: tideLevelAt(time, { meanHighWater: world.tide?.levels?.meanHighWater ?? world.tide?.meanHighWater ?? 1 }) }),
    weather: Object.freeze({ kind: weather, ...(WEATHER_LOOKS[weather] ?? OVERCAST) }),
    ...(world.terrain ? { terrain: world.terrain } : {}),
  });
}
