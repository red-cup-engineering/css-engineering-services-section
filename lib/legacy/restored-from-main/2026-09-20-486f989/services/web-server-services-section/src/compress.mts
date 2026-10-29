// Service-facing content-coding exports. The computation lives in
// @red-cup-engineering/code-http-content-coding-service.

export {
  CODINGS,
  compress,
  compressStream,
  decompress,
  decompressStream,
  supportedCompressionCodings,
  zstdSupported,
} from "@red-cup-engineering/code-http-content-coding-service";
