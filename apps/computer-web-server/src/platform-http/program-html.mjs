

import { fromSection, ref } from "@red-cup-engineering/html-structural-projection-service";
import { renderTuftePacket } from "@red-cup-engineering/web-page-tiling-engine";
import { schemaNodePath } from "@red-cup-engineering/metrologic/settling/schema/site";
import { isJsonRecord, jsonResource } from "@red-cup-engineering/json-services-section";

import { endpointSchemaFormControls, schemaFields, decodeSchemaFormEntries } from "@red-cup-engineering/web-page-tiling-engine/schema-form";
export { decodeSchemaFormEntries } from "@red-cup-engineering/web-page-tiling-engine/schema-form";

/** An operation whose input schema yields no native controls takes its input as one JSON body. */
function programBodyFormHtml(endpoint, base) {
  const subject = `operation:${endpoint.name}`;
  const source = jsonResource(endpoint, "operation endpoint");
  if (!isJsonRecord(source)) throw new TypeError("programFormHtml: endpoint must be an object");
  const reading = fromSection({ affirmed: Object.entries(source).map(([predicate, object]) => ({ predicate, object, citation: subject })) }, { subject });
  return renderTuftePacket(reading, { source, evidence: { base, subject } }, {
    title: endpoint.name,
    subtitle: endpoint.summary ?? "",
    tiles: [
      { id: "navigation", title: "Operations", links: [{ href: base || "/", label: "All operations" }], span: 12 },
      ...(endpoint.description ? [{ id: "description", title: "Description", content: endpoint.description, span: 12 }] : []),
      { id: "contract", title: "Input and output", table: { columns: ["Input", "Output"], rows: [[endpoint.input, endpoint.output]] }, span: 12 },
      { id: "invocation", title: "Run operation", span: 12, form: {
        id: "operation-input", action: `${base.replace(/\/+$/, "")}/${encodeURIComponent(endpoint.name)}`, method: "post",
        fields: [{ id: "body", name: "body", kind: "textarea", label: "Input" }],
        submitters: [{ label: "Run", kind: "submit" }],
      } },
    ],
  }).html;
}

/**
 * Render an operation with native controls derived from its input schema.
 * @param endpoint - The current operation endpoint declaration.
 * @param base - Its local mount path.
 * @returns A TUFTE-rendered SHP document with the existing invocation protocol.
 */
export function programFormHtml(endpoint, base) {
  const controls = endpointSchemaFormControls(endpoint.domainSchema);
  if (controls === undefined) return programBodyFormHtml(endpoint, base);
  const source = jsonResource(endpoint);
  const subject = `operation:${endpoint.name}`;
  const reading = fromSection({ affirmed: [{ predicate: "endpoint", object: source, citation: subject }] }, { subject });
  return renderTuftePacket(reading, { source, evidence: { base } }, {
    title: endpoint.name, subtitle: endpoint.summary ?? "",
    tiles: [
      { id: "navigation", title: "Operations", span: 12, links: [{ href: base || "/", label: "All operations" }] },
      { id: "description", title: "Description", content: endpoint.description ?? "", span: 12 },
      { id: "contract", title: "Input and output", table: { columns: ["Input", "Output"], rows: [[endpoint.input, endpoint.output]] }, span: 12 },
      { id: "invocation", title: "Run operation", span: 12, form: {
        action: `${base}/${encodeURIComponent(endpoint.name)}?input-format=form`, method: "post",
        fields: schemaFields(controls), submitters: [{ kind: "submit", label: "Run" }],
      } },
    ],
  }).html;
}

/**
 * Render program contracts, operation navigation, and composition frontier.
 * @param discovery - Current program discovery.
 * @param base - Its local mount path.
 * @param manifold - The available composition readout.
 * @returns A TUFTE-rendered SHP document preserving discovery and frontier evidence.
 */
export function programIndexHtml(discovery, base, manifold) {
  const routes = new Map(discovery.programs.map((program) => [`operation:${program.name}`, `${base}/${encodeURIComponent(program.name)}`]));
  const source = jsonResource({ discovery, manifold });
  const subject = `package:${discovery.package}`;
  const reading = fromSection({ affirmed: discovery.programs.map((program) => ({ predicate: "operation", object: ref(`operation:${program.name}`), citation: subject })) }, { subject });
  const extrema = manifold === undefined ? [] : [
    ...(["domains", "codomains", "incoming", "outgoing"]).map((key) => ({
      id: key, title: key, span: 6, table: { columns: ["Schema", "Operations"], rows: manifold.extrema[key].map((row) => [{ href: schemaNodePath(row.schema), text: row.schema }, row.operations.join(", ")]) },
    })),
    ...(["edges", "rejectedEdges"]).map((key) => ({
      id: key, title: key === "edges" ? "Local Hoare edges" : "Rejected local edges", span: 12,
      table: { columns: ["Schema", "From", "To", "Relation", "Accepted"], rows: manifold.extrema[key].map((row) => [
        { href: schemaNodePath(row.schema), text: row.schema }, row.from, row.to, row.relation, String(row.ok),
      ]) },
    })),
    { id: "apex", title: "Apex", data: manifold.apex, span: 12 },
  ];
  return renderTuftePacket(reading, { source, evidence: { base }, resolveHref: (id) => routes.get(id) }, {
    title: discovery.package,
    tiles: [
      { id: "interfaces", title: "Interfaces", span: 8, links: [
        ["openapi.json", "OpenAPI"], ["discovery", "Discovery"], ["operations-manifold", "Operations manifold"], ["feed", "Journal feed"], ["health", "Health"],
      ].map(([path, label]) => ({ href: `${base}/${path}`, label: label })) },
      { id: "mcp", title: "MCP", content: `POST ${base}/mcp`, span: 4 },
      { id: "operations", title: "Operations", span: 12, table: { columns: ["Operation", "Summary", "Input", "Output", "Contract", "Settlement"], rows: discovery.programs.map((program) => [
        { href: `${base}/${encodeURIComponent(program.name)}`, text: program.name }, program.summary ?? "", program.input, program.output, JSON.stringify(program.contract), JSON.stringify(program.settlement),
      ]) } },
      ...extrema,
    ],
  }).html;
}

/**
 * Render the program mounts from their current discovery records.
 * @param mounts - Current projected surfaces.
 * @param paths - Resolved local mount paths.
 * @returns A TUFTE-rendered SHP document with mount navigation.
 */
export function operationManifoldIndexHtml(mounts, paths) {
  const rows = mounts.map(({ name, induced }) => ({ name, path: paths.get(name) ?? `/${name}`, discovery: induced.discovery }));
  const source = jsonResource(rows);
  const routes = new Map(rows.map((row) => [`mount:${row.name}`, row.path]));
  const reading = fromSection({ affirmed: rows.map((row) => ({ predicate: "mount", object: ref(`mount:${row.name}`), citation: "manifold" })) }, { subject: "manifold" });
  return renderTuftePacket(reading, { source, resolveHref: (id) => routes.get(id) }, {
    title: "manifold", tiles: [{ id: "mounts", title: "Mounts", span: 12, table: {
      columns: ["Mount", "Package", "Operations"], rows: rows.map((row) => [{ href: row.path, text: row.name }, row.discovery.package, String(row.discovery.programs.length)]),
    } }],
  }).html;
}
