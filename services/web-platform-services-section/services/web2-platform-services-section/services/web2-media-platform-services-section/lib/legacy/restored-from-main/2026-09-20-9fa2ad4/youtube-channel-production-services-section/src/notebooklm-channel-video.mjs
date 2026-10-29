import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";

/** @param {{lesson: object, curriculum: object, script: object}} input @returns {{bytes: Buffer, title: string, prompt: string}} */
export function channelVideoSource({ lesson, curriculum, script, source } = {}) {
  if (source?.bytes instanceof Uint8Array && typeof source.title === "string" && Array.isArray(source.citations) && Array.isArray(source.limitations)) return { bytes: Buffer.from(source.bytes), title: source.title, prompt: `Create a ${source.format ?? "cinematic"} instructional video that accurately teaches ${lesson?.title} from the supplied verified research packet, including its cited scope and limitations.` };
  if (typeof lesson?.title !== "string" || typeof curriculum?.title !== "string" || typeof script?.description !== "string") throw new TypeError("NotebookLM channel video requires the planned curriculum lesson and admitted script");
  const lines = [`# ${lesson.title}`, "", "## Course source", curriculum.title, curriculum.purpose ?? "", curriculum.audience ?? "", "", "## Lesson source", lesson.promise ?? "", `Competencies: ${(lesson.competencies ?? []).join(", ")}`, `Prerequisites: ${(lesson.prerequisites ?? []).join(", ")}`, "", "## Instructional script", script.description, ...(script.segments ?? []).flatMap((segment) => [`### ${segment.heading}`, ...(segment.lines ?? []), segment.narration ?? ""]), ""];
  return { bytes: Buffer.from(lines.join("\n"), "utf8"), title: `${lesson.title} — ${curriculum.title} lesson source`, prompt: `Create a cinematic instructional video that accurately teaches ${lesson.title} from this supplied course and lesson source.` };
}

/** @param {{spec: object, lesson: object, curriculum: object, script: object, workDirectory: string, environment?: NodeJS.ProcessEnv, dryRun?: boolean, client?: object, formOrder?: Function}} options @returns {Promise<{artifactPath?: string, sha256?: string, byteLength?: number, renderer: string, order: object}>} */
export async function renderNotebookLmChannelVideo({ spec, lesson, curriculum, script, source, workDirectory, environment = process.env, dryRun = false, client, formOrder } = {}) {
  const binding = spec?.video;
  if (binding?.renderer !== "persistent-notebook-channel-video") throw new TypeError("NotebookLM renderer requires a persistent-notebook channel-video binding");
  const provider = formOrder ? null : await import("@red-cup-engineering/persistent-notebook-enterprise/channel-video-client");
  const packet = channelVideoSource({ lesson, curriculum, script, source: source && { ...source, format: binding.format } });
  const order = (formOrder ?? provider.formChannelVideoOrder)({ customer: spec.id, notebook: binding.notebook, sourceBytes: packet.bytes, sourceTitle: packet.title, prompt: packet.prompt, format: binding.format, style: binding.style, language: binding.language, sourceLifecyclePolicy: binding.sourceLifecyclePolicy });
  if (dryRun) return { renderer: binding.renderer, order };
  const channelClient = client ?? provider.createChannelVideoClient({ agentUrl: environment[binding.agentCardUrlEnv], expectedAgentCardIdentity: binding.agentCardIdentity });
  const delivery = await channelClient.request(order);
  const artifact = await channelClient.materialize(delivery);
  await mkdir(workDirectory, { recursive: true });
  const artifactPath = join(workDirectory, `${artifact.sha256.slice(7)}.mp4`);
  try { await writeFile(artifactPath, artifact.bytes, { flag: "wx", mode: 0o600 }); }
  catch (error) { if (error?.code !== "EEXIST" || `sha256:${createHash("sha256").update(await readFile(artifactPath)).digest("hex")}` !== artifact.sha256) throw error; }
  return { renderer: binding.renderer, order, artifactPath, sha256: artifact.sha256, byteLength: artifact.byteLength, mediaType: artifact.mediaType };
}
