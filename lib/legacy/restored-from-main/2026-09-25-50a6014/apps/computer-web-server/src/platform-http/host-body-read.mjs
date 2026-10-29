/**
 * Node request-body stream binding for pure HTTP request-content observations: the
 * networking section's body readers, each result observed as an HTTP body read.
 */
import {
  readBody as readBodyValue,
  readFormBody as readFormBodyValue,
  readJsonBody as readJsonBodyValue,
  readMultipartBody as readMultipartBodyValue,
  readTextBody as readTextBodyValue,
} from "@red-cup-engineering/http-services-section/body";

import { observeBodyRead } from "./body-read.mjs";

export async function readBody(req, options = {}) {
  return observeBodyRead("read-body", await readBodyValue(req, options));
}

export async function readTextBody(req, options = {}) {
  return observeBodyRead("read-text-body", await readTextBodyValue(req, options));
}

export async function readJsonBody(req, options = {}) {
  return observeBodyRead("read-json-body", await readJsonBodyValue(req, options));
}

export async function readFormBody(req, options = {}) {
  return observeBodyRead("read-form-body", await readFormBodyValue(req, options));
}

export async function readMultipartBody(req, options = {}) {
  return observeBodyRead("read-multipart-body", await readMultipartBodyValue(req, options));
}
