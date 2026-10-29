/**
 * Makes the already-selected curriculum the notebook renderer's bounded
 * source carrier. Subject research remains with its owner; the production
 * program never needs a channel-local research adapter.
 */
export async function sourceForLesson({ curriculum, lesson } = {}) {
  const bytes = Buffer.from(JSON.stringify({ curriculum, lesson }), "utf8");
  return { bytes, title: `Curriculum source: ${lesson?.title ?? "lesson"}`, carrierSha256: undefined, citations: [], limitations: [] };
}
