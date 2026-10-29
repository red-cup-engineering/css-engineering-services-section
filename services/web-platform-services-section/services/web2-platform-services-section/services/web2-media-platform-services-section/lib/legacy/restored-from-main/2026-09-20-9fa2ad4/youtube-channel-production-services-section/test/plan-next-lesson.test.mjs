import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCurriculumLessons, planNextLesson } from "../scripts/plan-next-lesson.mjs";

const courseRevisionCurriculum = {
  type: "MathematicsCourseRevision",
  lessons: [
    { id: "order-before-distance", sequence: 1, title: "Order before distance", prerequisites: [] },
    { id: "lorentzian-geometry", sequence: 2, title: "Lorentzian geometry", prerequisites: ["order-before-distance"] },
    { id: "intervals-to-points", sequence: 3, title: "From intervals to points", prerequisites: ["lorentzian-geometry"] },
  ],
};

const placesCurriculum = {
  places: ["Fairbanks, Alaska", "Miami, Florida", { name: "Lagos, Nigeria" }],
};

test("normalizeCurriculumLessons adapts a CourseRevision lessons array", () => {
  const lessons = normalizeCurriculumLessons(courseRevisionCurriculum);
  assert.equal(lessons.length, 3);
  assert.deepEqual(lessons[0], { lessonId: "order-before-distance", title: "Order before distance", sequence: 1, prerequisites: [] });
});

test("normalizeCurriculumLessons adapts a places list into sequenced, prerequisite-free lessons", () => {
  const lessons = normalizeCurriculumLessons(placesCurriculum);
  assert.equal(lessons.length, 3);
  assert.deepEqual(lessons[0], { title: "Fairbanks, Alaska: Climate History and Outlook", sequence: 1, prerequisites: [] });
  assert.deepEqual(lessons[2], { title: "Lagos, Nigeria: Climate History and Outlook", sequence: 3, prerequisites: [] });
});

test("normalizeCurriculumLessons rejects an unrecognized curriculum shape", () => {
  assert.throws(() => normalizeCurriculumLessons({ type: "Unknown" }), TypeError);
});

test("planNextLesson picks the lowest-sequence lesson with satisfied prerequisites and not yet produced", () => {
  const lesson = planNextLesson({ curriculum: courseRevisionCurriculum, inventory: [], now: "2026-09-02T00:00:00.000Z" });
  assert.equal(lesson.lessonId, "order-before-distance");
  assert.equal(lesson.plannedAt, "2026-09-02T00:00:00.000Z");
});

test("planNextLesson skips a lesson already in inventory by lessonId", () => {
  const lesson = planNextLesson({
    curriculum: courseRevisionCurriculum,
    inventory: [{ lessonId: "order-before-distance", title: "Order before distance | Mathematics in Relation" }],
    now: "2026-09-02T00:00:00.000Z",
  });
  assert.equal(lesson.lessonId, "lorentzian-geometry");
});

test("planNextLesson matches inventory by exact title after stripping a channel title suffix", () => {
  const lesson = planNextLesson({
    curriculum: courseRevisionCurriculum,
    inventory: [{ title: "Order before distance | Mathematics in Relation" }],
    now: "2026-09-02T00:00:00.000Z",
  });
  assert.equal(lesson.lessonId, "lorentzian-geometry");
});

test("planNextLesson blocks a lesson whose prerequisite is not yet produced", () => {
  const inventory = [
    { title: "Order before distance | Mathematics in Relation" },
  ];
  // lorentzian-geometry (seq 2) is producible; intervals-to-points (seq 3) is not, since its
  // prerequisite lorentzian-geometry is not yet in inventory -- planNextLesson must choose seq 2.
  const lesson = planNextLesson({ curriculum: courseRevisionCurriculum, inventory, now: "2026-09-02T00:00:00.000Z" });
  assert.equal(lesson.lessonId, "lorentzian-geometry");
});

test("planNextLesson throws when every lesson is already produced", () => {
  const inventory = courseRevisionCurriculum.lessons.map((lesson) => ({ lessonId: lesson.id, title: lesson.title }));
  assert.throws(() => planNextLesson({ curriculum: courseRevisionCurriculum, inventory, now: "2026-09-02T00:00:00.000Z" }), TypeError);
});

test("planNextLesson plans the first place for a places curriculum with no inventory", () => {
  const lesson = planNextLesson({ curriculum: placesCurriculum, inventory: [], now: "2026-09-02T00:00:00.000Z" });
  assert.equal(lesson.title, "Fairbanks, Alaska: Climate History and Outlook");
  assert.equal(lesson.sequence, 1);
});

test("planNextLesson matches a places curriculum's inventory by title (no lessonId available)", () => {
  const lesson = planNextLesson({
    curriculum: placesCurriculum,
    inventory: [{ title: "Fairbanks, Alaska: Climate History and Outlook | Climate in Relation" }],
    now: "2026-09-02T00:00:00.000Z",
  });
  assert.equal(lesson.title, "Miami, Florida: Climate History and Outlook");
});
