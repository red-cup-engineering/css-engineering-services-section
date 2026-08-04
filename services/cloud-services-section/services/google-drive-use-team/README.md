# Google Drive Use Team

This SDSS child is a directly contractable software-use enterprise. It turns
one purpose-bearing customer request into one bounded Google Drive v3 use or a
typed refusal:

- store one new file in Google Drive;
- retrieve one exact file from Google Drive;
- list one bounded page of Google Drive file metadata.

The purpose fixes the provider operation. Customers do not choose a command,
endpoint, method, header set, environment, retry, or fallback. Contracting is
`Offer<ServiceSolicitation> -> Offer<GoogleDriveUseOffer> ->
Accept<PurposeBoundCapability> -> Accept<GoogleDriveUseProduct>|Reject`.

Credentials remain with the customer or its custodian. A live invocation
supplies credential bytes out of band and binds them to a non-secret
`credentialGrantId` carried by the request and single-use capability. The team
never writes credential material. Dry-run exercises the complete contract
boundary without network access.

Operational evidence is append-only dated JSONL under `data/`. The prior
`content/exchanges/exchange-20260719-034120-85dea7.json` 401 is retained as
historical evidence of the pre-contract harness. `run-one-exchange.mjs` is now
a refusal-only retirement pointer; use the package's advertised
`solicit-service` and `invoke-service` faces.

Use it now without hand-authoring the contract activities:

```sh
# Safe contract/dry run; no token and no network.
node examples/use-google-drive.mjs \
  --customer urn:ame:my-enterprise \
  --credential-grant-id urn:grant:my-enterprise-google-drive \
  --purpose list

# Live list. The secret stays in the process environment; only the grant ID is recorded.
GOOGLE_DRIVE_ACCESS_TOKEN='...' \
GOOGLE_DRIVE_CREDENTIAL_GRANT_ID='urn:grant:my-enterprise-google-drive' \
node examples/use-google-drive.mjs \
  --customer urn:ame:my-enterprise \
  --credential-grant-id urn:grant:my-enterprise-google-drive \
  --purpose list --page-size 25 --live

# Or use customer-held offline OAuth credentials; the client refreshes once at
# Google's fixed token endpoint and does not record any credential bytes.
GOOGLE_DRIVE_OAUTH_CLIENT_ID='...' \
GOOGLE_DRIVE_OAUTH_CLIENT_SECRET='...' \
GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN='...' \
GOOGLE_DRIVE_CREDENTIAL_GRANT_ID='urn:grant:my-enterprise-google-drive' \
node examples/use-google-drive.mjs \
  --customer urn:ame:my-enterprise \
  --credential-grant-id urn:grant:my-enterprise-google-drive \
  --purpose list --live

# Store a local file without placing its contents on the command line.
GOOGLE_DRIVE_ACCESS_TOKEN='...' \
GOOGLE_DRIVE_CREDENTIAL_GRANT_ID='urn:grant:my-enterprise-google-drive' \
node examples/use-google-drive.mjs \
  --customer urn:ame:my-enterprise \
  --credential-grant-id urn:grant:my-enterprise-google-drive \
  --purpose store --name report.json --content-file ./report.json --live
```

```sh
npm run check
npm test
```

Passing provider tests establishes contract behavior, not customer usefulness,
valid credentials, live Google capacity, price, or authorization to store or
read any customer's data.
