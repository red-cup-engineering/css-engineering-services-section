#!/usr/bin/env node
/**
 * @module plan-next-lesson
 * Chooses a curriculum channel's next lesson: the lowest-sequence lesson
 * whose prerequisites are already produced (present in inventory) and
 * which is not itself already produced. Pure; no I/O, no clock reads
 * beyond an explicitly supplied `now`.
 *
 * Curricula are not one shape across the four education channels, so
 * this module carries the small adapters that normalize each into one
 * common {@link NormalizedLesson} list: the AI, mathematics, and modern
 * business channels each publish a `CourseRevision` with a `lessons`
 * array (`{id, sequence, title, prerequisites}`); the climate channel
 * has no curriculum at all -- its "lessons" are places from its place
 * market, accepted here as `{places: [...]}` and turned into one
 * prerequisite-free lesson per place in list order. A curriculum that
 * stores lessons in yet another shape gets its own adapter added here,
 * never a second planner.
 */
import { readFile, writeFile } from "node:fs/promises";
import { runJsonMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

function requiredText(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

function requiredPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${label} must be a positive integer`);
  return value;
}

/**
 * @typedef {Object} NormalizedLesson
 * @property {string} [lessonId] - the curriculum's own lesson id, when it has one
 * @property {string} title
 * @property {number} sequence
 * @property {string[]} prerequisites - lessonIds of other lessons in this same curriculum
 */

/**
 * Adapts an AI/mathematics/modern-business `CourseRevision` (`{lessons:
 * [{id, sequence, title, prerequisites}]}`) into normalized lessons.
 * @param {{lessons: ReadonlyArray<object>}} curriculum
 * @returns {NormalizedLesson[]}
 */
function normalizeCourseRevisionLessons(curriculum) {
  return curriculum.lessons.map((lesson, index) => ({
    lessonId: requiredText(lesson.id, `lessons[${index}].id`),
    title: requiredText(lesson.title, `lessons[${index}].title`),
    sequence: requiredPositiveInteger(lesson.sequence, `lessons[${index}].sequence`),
    prerequisites: Array.isArray(lesson.prerequisites) ? lesson.prerequisites.map((id, prerequisiteIndex) => requiredText(id, `lessons[${index}].prerequisites[${prerequisiteIndex}]`)) : [],
  }));
}

/**
 * Adapts the climate channel's place list (`{places: [...]}`, each entry
 * a place name string or a place object carrying at least a name) into
 * one prerequisite-free normalized lesson per place, sequenced by list
 * order.
 * @param {{places: ReadonlyArray<string|{id?: string, name?: string, title?: string}>}} curriculum
 * @returns {NormalizedLesson[]}
 */
function normalizePlaceLessons(curriculum) {
  return curriculum.places.map((place, index) => {
    const name = typeof place === "string" ? place : requiredText(place?.name ?? place?.title, `places[${index}].name`);
    const lessonId = typeof place === "object" && place !== null && typeof place.id === "string" && place.id.trim() !== "" ? place.id.trim() : undefined;
    return {
      ...(lessonId ? { lessonId } : {}),
      title: `${requiredText(name, `places[${index}]`)}: Climate History and Outlook`,
      sequence: index + 1,
      prerequisites: [],
    };
  });
}

/**
 * Normalizes any of this section's supported curriculum shapes into one
 * common lesson list, sorted by sequence.
 * @param {unknown} curriculum
 * @returns {NormalizedLesson[]}
 * @throws {TypeError} when the curriculum matches no known shape
 */
export function normalizeCurriculumLessons(curriculum) {
  if (!curriculum || typeof curriculum !== "object" || Array.isArray(curriculum)) throw new TypeError("normalizeCurriculumLessons requires a curriculum object");
  let lessons;
  if (Array.isArray(curriculum.lessons)) lessons = normalizeCourseRevisionLessons(curriculum);
  else if (Array.isArray(curriculum.places)) lessons = normalizePlaceLessons(curriculum);
  else throw new TypeError("normalizeCurriculumLessons recognizes no known curriculum shape (expected a `lessons` or `places` array)");
  return [...lessons].sort((left, right) => left.sequence - right.sequence);
}

/** A lesson's inventory-matching identity: its lessonId when the curriculum has one, else its title. */
function lessonKey(lesson) {
  return lesson.lessonId ?? lesson.title;
}

/** The inventory-side title with any trailing " | <channel title>" suffix stripped, for title matching. */
function coreTitle(title) {
  return String(title ?? "").split(" | ")[0].trim();
}

/**
 * Matches one inventory row to a normalized lesson: by lessonId when the
 * row carries one, else by exact title after stripping a trailing
 * " | <channel title>" suffix.
 * @param {{lessonId?: string, title?: string}} row
 * @param {NormalizedLesson[]} lessons
 * @returns {NormalizedLesson|undefined}
 */
function matchInventoryRow(row, lessons) {
  if (typeof row?.lessonId === "string" && row.lessonId) return lessons.find((lesson) => lesson.lessonId === row.lessonId);
  const title = coreTitle(row?.title);
  return lessons.find((lesson) => lesson.title === title);
}

/**
 * Chooses a curriculum channel's next lesson: the lowest-sequence lesson
 * not already produced whose every prerequisite lessonId is already
 * produced.
 * @param {{curriculum: object, inventory?: ReadonlyArray<{lessonId?: string, title?: string}>, now: string}} options
 * @returns {{lessonId?: string, title: string, sequence: number, prerequisites: string[], plannedAt: string}}
 * @throws {TypeError} when no eligible lesson remains
 */
export function planNextLesson({ curriculum, inventory = [], now } = {}) {
  const plannedAt = requiredText(now, "now");
  if (!Array.isArray(inventory)) throw new TypeError("planNextLesson requires an array inventory");
  const lessons = normalizeCurriculumLessons(curriculum);
  const produced = new Set(
    inventory
      .map((row) => matchInventoryRow(row, lessons))
      .filter(Boolean)
      .map((lesson) => lessonKey(lesson)),
  );
  const eligible = lessons.filter((lesson) => !produced.has(lessonKey(lesson)) && lesson.prerequisites.every((prerequisite) => produced.has(prerequisite)));
  const chosen = eligible[0];
  if (!chosen) throw new TypeError("planNextLesson found no eligible next lesson: every lesson is either already produced or blocked on an unproduced prerequisite");
  return { ...chosen, plannedAt };
}


async function main({ argv }) {
  const curriculumPath = argument("--curriculum", argv);
  const inventoryPath = argument("--inventory", argv);
  const outPath = argument("--out", argv);
  if (!curriculumPath) throw new Error("usage: plan-next-lesson.mjs --curriculum <path> [--inventory <path>] [--out <path>] [--now <iso>]");
  const curriculum = JSON.parse(await readFile(curriculumPath, "utf8"));
  const inventory = inventoryPath ? JSON.parse(await readFile(inventoryPath, "utf8")) : [];
  const now = argument("--now", argv) ?? new Date().toISOString();
  const lesson = planNextLesson({ curriculum, inventory, now });
  if (outPath) await writeFile(outPath, `${JSON.stringify(lesson, null, 2)}\n`, "utf8");
  return lesson;
}

runJsonMain(main, import.meta.url);
