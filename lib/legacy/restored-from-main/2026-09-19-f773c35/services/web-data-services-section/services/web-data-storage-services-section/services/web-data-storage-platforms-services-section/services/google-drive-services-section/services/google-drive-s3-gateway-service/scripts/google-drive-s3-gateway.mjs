#!/usr/bin/env node

import { googleDriveS3Configuration, redactedGoogleDriveS3Configuration } from "../src/configuration.mjs";
import { serveGoogleDriveS3Gateway } from "../src/google-drive-s3-gateway.mjs";

const command = process.argv[2] ?? "help";

if (command === "help" || command === "--help" || command === "-h") {
  process.stdout.write("usage: google-drive-s3-gateway <doctor|serve>\n");
} else if (command === "doctor") {
  const configuration = googleDriveS3Configuration(process.env);
  process.stdout.write(`${JSON.stringify({ status: "configuration-admitted", configuration: redactedGoogleDriveS3Configuration(configuration) }, null, 2)}\n`);
} else if (command === "serve") {
  const configuration = googleDriveS3Configuration(process.env);
  const running = await serveGoogleDriveS3Gateway(configuration);
  const address = running.address;
  process.stdout.write(`${JSON.stringify({ status: "listening", endpoint: `http://${address.address}:${address.port}`,
    buckets: configuration.buckets, credentialMaterialIncluded: false })}\n`);
  const stop = () => running.server.close(() => process.exit(0));
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
} else {
  process.stderr.write(`unknown command: ${command}\n`); process.exitCode = 2;
}
