import { stat, readFile } from "node:fs/promises";
import * as nodeFs from "node:fs";
import { join, resolve, normalize } from "node:path";
import { sep } from "node:path";
import { extensionType, isCompressible } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/media-type";
import { negotiateEncoding } from "@red-cup-engineering/http-services-section/negotiation";
import "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/content-coding";
import { byterangesCloseDelimiter, byterangesPartHeader, contentRange, multipartRangeBoundary, parseRanges } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/byte-range";
import { httpDate } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/date";
import { ifMatch, ifModifiedSince, ifNoneMatch, ifRange, ifUnmodifiedSince } from "@red-cup-engineering/http-services-section/conditional-request";
import { appendVary, ensureDateHeader, applyCacheControl, applySecurityHeaders } from "@red-cup-engineering/http-services-section/response";
import { compress, supportedCompressionCodings } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/content-coding";
export const DEFAULT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".xml": "application/xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".ttl": "text/turtle; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".wasm": "application/wasm",
    ".pdf": "application/pdf",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg"
};
const DEFAULT_INDEX = [
    "index.html",
    "index.htm"
];
const MAX_BUFFER = 2 * 1024 * 1024;
const PRECOMPRESSED_EXTENSIONS = {
    br: ".br",
    gzip: ".gz",
    zstd: ".zst"
};
function safePath(root, urlPath) {
    let decoded;
    try {
        decoded = decodeURIComponent(urlPath);
    } catch  {
        return null;
    }
    const clean = normalize(decoded).replace(/^(\.\.\/|\/)+/, "");
    if (clean.split(/[\\/]/).includes("..")) return null;
    const full = resolve(join(root, clean));
    const rootPath = resolve(root);
    return full === rootPath || full.startsWith(rootPath + sep) ? full : null;
}
export function staticFiles(opts) {
    const { root, basePath = "", index = DEFAULT_INDEX, maxBuffer = MAX_BUFFER, etag = true, lastModified = true, dotFiles = "ignore", extensions = [], precompressed = true, cacheControl: cachePolicy, security } = opts;
    return async (ctx)=>{
        const { req, res } = ctx;
        let urlPath = ctx.url.pathname;
        if (basePath) {
            const prefix = basePath.startsWith("/") ? basePath.replace(/\/$/, "") : `/${basePath.replace(/\/$/, "")}`;
            if (urlPath !== prefix && !urlPath.startsWith(`${prefix}/`)) {
                res.writeHead(404).end();
                return;
            }
            urlPath = urlPath.slice(prefix.length) || "/";
        }
        ensureDateHeader(res, Date.now());
        applyCacheControl(res, cachePolicy);
        applySecurityHeaders(res, security);
        const fullPath = safePath(root, urlPath);
        if (!fullPath) {
            res.writeHead(403).end();
            return;
        }
        const base = fullPath.split("/").pop() ?? "";
        if (base.startsWith(".")) {
            if (dotFiles === "deny") {
                res.writeHead(403).end();
                return;
            }
            if (dotFiles === "ignore") {
                res.writeHead(404).end();
                return;
            }
        }
        let filePath = fullPath;
        let st = null;
        try {
            st = await stat(filePath);
        } catch  {}
        if (st?.isDirectory()) {
            for (const idx of index){
                const idxPath = join(filePath, idx);
                try {
                    const s = await stat(idxPath);
                    if (s.isFile()) {
                        filePath = idxPath;
                        st = s;
                        break;
                    }
                } catch  {}
            }
        } else if (!st?.isFile()) {
            for (const ext of extensions){
                const extPath = fullPath + "." + ext;
                try {
                    const s = await stat(extPath);
                    if (s.isFile()) {
                        filePath = extPath;
                        st = s;
                        break;
                    }
                } catch  {}
            }
        }
        if (!st?.isFile()) {
            res.writeHead(404).end();
            return;
        }
        const type = extensionType(filePath);
        let selectedPath = filePath;
        let selectedStat = st;
        let selectedCoding = "identity";
        const rangeRequested = req.headers.range !== undefined;
        const compressible = isCompressible(type);
        if (!rangeRequested && compressible && precompressed !== false) {
            const variants = await precompressedVariants(filePath, precompressed);
            if (variants.length) {
                const coding = negotiateEncoding(req.headers["accept-encoding"], [
                    "identity",
                    ...variants.map((variant)=>variant.coding)
                ]);
                if (coding === null) {
                    appendVary(res, "Accept-Encoding");
                    res.writeHead(406, {
                        "Content-Type": "text/plain; charset=utf-8"
                    }).end(req.method === "HEAD" ? undefined : "Not Acceptable");
                    return;
                }
                const variant = variants.find((item)=>item.coding === coding);
                if (variant) {
                    selectedPath = variant.path;
                    selectedStat = variant.stat;
                    selectedCoding = variant.coding;
                }
            }
        }
        const etagVal = etag ? `"${selectedStat.size.toString(36)}-${selectedStat.mtimeMs.toString(36)}"` : undefined;
        const mtime = lastModified ? new Date(selectedStat.mtimeMs) : undefined;
        if (etagVal) res.setHeader("ETag", etagVal);
        if (mtime) res.setHeader("Last-Modified", httpDate(mtime));
        if (etagVal && !ifMatch(req.headers["if-match"], etagVal)) {
            res.writeHead(412).end();
            return;
        }
        if (mtime && !ifUnmodifiedSince(req.headers["if-unmodified-since"], mtime)) {
            res.writeHead(412).end();
            return;
        }
        if (etagVal && ifNoneMatch(req.headers["if-none-match"], etagVal)) {
            res.writeHead(req.method === "GET" || req.method === "HEAD" ? 304 : 412).end();
            return;
        }
        if (!etagVal && mtime && ifModifiedSince(req.headers["if-modified-since"], mtime)) {
            res.writeHead(req.method === "GET" || req.method === "HEAD" ? 304 : 412).end();
            return;
        }
        res.setHeader("Content-Type", type);
        res.setHeader("Accept-Ranges", "bytes");
        const ranges = ifRange(req.headers["if-range"], {
            ...etagVal !== undefined ? {
                etag: etagVal
            } : {},
            ...mtime !== undefined ? {
                lastModified: mtime
            } : {}
        }) ? parseRanges(req.headers["range"], st.size) : null;
        if (ranges === 416) {
            res.writeHead(416, {
                "Content-Range": contentRange(null, st.size)
            }).end();
            return;
        }
        if (ranges) {
            const coding = negotiateEncoding(req.headers["accept-encoding"], [
                "identity"
            ]);
            if (coding === null) {
                appendVary(res, "Accept-Encoding");
                res.writeHead(406, {
                    "Content-Type": "text/plain; charset=utf-8"
                }).end(req.method === "HEAD" ? undefined : "Not Acceptable");
                return;
            }
            if (ranges.length > 1) {
                const boundary = multipartRangeBoundary(st.size, ranges);
                res.setHeader("Content-Type", `multipart/byteranges; boundary=${boundary}`);
                res.writeHead(206);
                if (req.method === "HEAD") {
                    res.end();
                    return;
                }
                await writeMultipartFileRanges(res, filePath, ranges, st.size, type, boundary);
                return;
            }
            const range = ranges[0];
            const { start, end } = range;
            res.setHeader("Content-Range", contentRange(range, st.size));
            res.setHeader("Content-Length", end - start + 1);
            res.writeHead(206);
            if (req.method === "HEAD") {
                res.end();
                return;
            }
            nodeFs.createReadStream(filePath, {
                start,
                end
            }).pipe(res);
            return;
        }
        if (selectedCoding !== "identity") {
            appendVary(res, "Accept-Encoding");
            res.setHeader("Content-Encoding", selectedCoding);
            res.setHeader("Content-Length", selectedStat.size);
            res.writeHead(200);
            if (req.method === "HEAD") {
                res.end();
                return;
            }
            nodeFs.createReadStream(selectedPath).pipe(res);
            return;
        }
        if (st.size <= maxBuffer) {
            const buf = await readFile(filePath);
            const coding = negotiateEncoding(req.headers["accept-encoding"], compressible ? [
                ...supportedCompressionCodings(),
                "identity"
            ] : [
                "identity"
            ]);
            if (coding === null) {
                appendVary(res, "Accept-Encoding");
                res.writeHead(406, {
                    "Content-Type": "text/plain; charset=utf-8"
                }).end(req.method === "HEAD" ? undefined : "Not Acceptable");
                return;
            }
            if (compressible) {
                appendVary(res, "Accept-Encoding");
                if (coding !== "identity") {
                    const out = await compress(buf, coding);
                    res.setHeader("Content-Encoding", coding);
                    res.setHeader("Content-Length", out.length);
                    res.writeHead(200).end(req.method === "HEAD" ? undefined : out);
                    return;
                }
            }
            res.setHeader("Content-Length", buf.length);
            res.writeHead(200).end(req.method === "HEAD" ? undefined : buf);
        } else {
            const coding = negotiateEncoding(req.headers["accept-encoding"], [
                "identity"
            ]);
            if (coding === null) {
                appendVary(res, "Accept-Encoding");
                res.writeHead(406, {
                    "Content-Type": "text/plain; charset=utf-8"
                }).end(req.method === "HEAD" ? undefined : "Not Acceptable");
                return;
            }
            res.setHeader("Content-Length", st.size);
            if (req.method === "HEAD") {
                res.writeHead(200).end();
                return;
            }
            res.writeHead(200);
            nodeFs.createReadStream(filePath).pipe(res);
        }
    };
}
function pipeFileRange(res, path, range) {
    return new Promise((resolve, reject)=>{
        const stream = nodeFs.createReadStream(path, {
            start: range.start,
            end: range.end
        });
        stream.on("error", reject);
        stream.on("end", resolve);
        stream.pipe(res, {
            end: false
        });
    });
}
async function writeMultipartFileRanges(res, path, ranges, total, type, boundary) {
    try {
        for (const range of ranges){
            res.write(byterangesPartHeader(boundary, type, range, total));
            await pipeFileRange(res, path, range);
            res.write("\r\n");
        }
        res.end(byterangesCloseDelimiter(boundary));
    } catch  {
        res.destroy();
    }
}
async function precompressedVariants(filePath, option) {
    const allowed = option === true ? [
        "br",
        "gzip",
        "zstd"
    ] : option.filter((coding)=>coding !== "identity" && coding !== "deflate");
    const variants = [];
    for (const coding of allowed){
        if (coding !== "br" && coding !== "gzip" && coding !== "zstd") continue;
        const suffix = PRECOMPRESSED_EXTENSIONS[coding];
        if (!suffix) continue;
        const path = `${filePath}${suffix}`;
        try {
            const st = await stat(path);
            if (st.isFile()) variants.push({
                coding,
                path,
                stat: st
            });
        } catch  {}
    }
    return variants;
}
