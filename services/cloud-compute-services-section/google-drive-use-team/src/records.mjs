import { googleDriveTermBytes, googleDriveTermId } from "./semantic-content.mjs";
const body = (value) => Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => key !== "id"));
export const digest = (value) => googleDriveTermId(value, "cloud-compute.google-drive-record");
export const canonical = (value) => googleDriveTermBytes(value, "cloud-compute.google-drive-record").toString("base64url");
export const contentRecord = (value) => Object.freeze({ id: digest(value), ...value });
export function assertContentRecord(value, label = "content record") { if (!value || typeof value !== "object" || value.id !== digest(body(value))) throw new Error(`${label} is not one exact canonical RMN record`); return value; }
export function activityObject(activity, type) { const object = activity?.object; return object?.type === type ? object : null; }
export function resourceObservations({ elapsedMilliseconds }) { return { elapsed: Number.isFinite(elapsedMilliseconds) ? { state: "measured", value: elapsedMilliseconds, unit: "millisecond" } : { state: "unknown", value: null, unit: "millisecond" } }; }
