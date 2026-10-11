# @red-cup-engineering/neocities-services-section

A credential-blind client for the Neocities hosting API. It publishes a built static site to one Neocities site: it uploads only changed files, removes what the build no longer contains, checks the result by reading the remote files back, and writes a deployment receipt. It sits beside `buttondown-services-section` and `internet-archive-services-section` under `web2-platform-services-section`.

It serves every Neocities site the Group runs, one site per fictional author on the founder's Supporter account (the first is `sigridsong`) and the founder's own `emsenn`.

## Layout

- `src/neocities.mjs` holds the API operations: `siteInfo`, `publicSiteInfo`, `apiKey`, `listFiles`, `uploadFiles`, `deleteFiles` and `publishSite`. Each takes `{token, fetch}` as parameters and never reads the environment. It also holds the pure parts: `readSiteTree`, `planSync`, `batchUploads` and `treeDigest`.
- `src/neocities-account.mjs` holds what Neocities offers only through its signed-in web pages: `accountSites`, `createSite` and `siteApiKey`. Each takes an injected, signed-in browser page and never stores anything. Signing in, the window and the saved session belong to the node's assisted browser (`assisted-browser-services-section`, account `neocities`).
- `scripts/neocities-site.mjs` (bin `neocities-site`) provisions a site: it creates the site and stores its key.
- `scripts/neocities-key.mjs` (bin `neocities-key`) stores one site's API key by hand.
- `scripts/neocities-publish.mjs` (bin `neocities-publish`) publishes a site directory according to its `neocities.json`.
- `scripts/credentials.mjs` keeps keys in `~/.config/561-group/neocities/<sitename>.api-key`, one file per site. Every file is mode 0600, in a 0700 directory. `NEOCITIES_API_KEY` overrides it for a single run, and `NEOCITIES_CREDENTIALS_DIR` moves the directory.

## Binding a site

A site directory binds itself to Neocities with a `neocities.json` file:

```json
{ "sitename": "sigridsong", "source": "dist", "prune": true, "receipts": "data/records/deployments", "maxDelete": 100 }
```

`neocities-publish <site-dir> [--dry-run] [--max-delete=N]` publishes it:

1. It asks Neocities which site the key belongs to, and refuses to go on if that isn't `sitename`. A wrong key can therefore never overwrite another site.
2. It reads the build. A build's `404.html` is also published as `not_found.html`, because that is the page Neocities serves for missing paths. Dotfiles are skipped.
3. It compares SHA-1 hashes with `/api/list`, then plans the uploads and the deletions. With `prune`, a remote directory that holds no built file is deleted whole, and the root `index.html` is never deleted.
4. It refuses a plan with more than `maxDelete` deletions (default 100) before writing anything, as rsync's `--max-delete` does. The limit is there because an empty or wrong build would otherwise delete the whole site.
5. It uploads in sequential batches (at most 50 MB and 100 files each), then deletes.
6. It lists the site again and requires every hash to match. The run fails if the site did not converge.
7. It writes a `NeocitiesDeploymentReceipt` to `receipts/<time>-<digest>.json`. The receipt holds the tree digest (sha256 over sorted `path sha1` lines), the uploaded files with their hashes, the deleted paths and `verified: true`. A run that changes nothing writes no receipt.

## Adding a site for a new author

```sh
neocities-site <sitename>      # create the site if needed and store its key
neocities-publish <site-dir>   # after giving the site directory a neocities.json and building it
```

Neocities has no API for creating a site, and it refuses the password-for-key exchange ("stale account") for any site never changed in its web UI, which includes every new site. `neocities-site` therefore drives the account's own settings pages in a browser (`src/neocities-account.mjs`, selectors from Neocities' `views/settings`):

1. If a stored key already opens the site, it stops there, so re-running it is safe.
2. It checks the name with the public `/api/info?sitename=`. A name that exists on some other account is refused.
3. It opens the account through the assisted browser: headless on the saved session (`~/.config/561-group/browser-sessions/neocities.json`) while it is good, otherwise a visible window (Windows Edge under WSL) where it waits up to 15 minutes while a person signs in. Neocities emails a code after the password, so that step cannot be automated, and it is needed only when the session lapses. `assisted-sign-in neocities` signs in ahead of time.
4. It creates the site through the "Create a new site" form. That form needs the Supporter plan.
5. It reads the site's active API key from its settings page, or generates one if the site has none. It never regenerates an existing key, because that would cut off every tool using it.
6. It confirms with `/api/info` that the key belongs to the site, stores it in `<sitename>.api-key`, and saves the refreshed session.

`neocities-key <sitename>` remains for storing a key by hand, by pasting it, or with `--password` for an established site.

Free sites may upload only an allowlist of file types. Supporter sites may upload any type (`Site#okay_to_upload?`). This client does not check types, so Neocities refuses a disallowed file and the publish stops with that error.

## Verified facts

These are from <https://neocities.org/api> (fetched 2026-09-30) and from Neocities' own source, <https://github.com/neocities/neocities> (`app/api.rb`, `app/settings.rb`, `models/site.rb`, read 2026-09-30).

- **Auth.** The API takes `Authorization: Bearer <key>`. HTTP Basic `sitename:password` also works, and any site on an account accepts the owner's password. Basic auth is refused with "stale account" when the site's `site_updated_at` is unset or too old.
- **`GET /api/key`** returns `{api_key}` and generates a key if the site has none.
- **`GET /api/list`** lists the whole site recursively. Every entry has `path` and `is_directory`; files also have `size` and `sha1_hash`.
- **`POST /api/upload`** takes `multipart/form-data`, and each field name is the destination path. Parent directories are created. Each file and each request is capped at 100 MB, and re-uploading an identical file succeeds.
- **`POST /api/delete`** takes repeated `filenames[]`. Deleting a directory deletes its contents. One invalid path cancels the whole request. The root and the root `index.html` are protected.
- **Errors** are `{"result":"error","error_type","message"}`, with status 400 for a bad request, 403 for bad auth and 404 for an unknown endpoint.
- **Etiquette.** Neocities asks for recurring updates at most once per ten minutes, no bursts and no parallel requests. This client sends one request at a time and uploads only what changed.
- **404 page.** Neocities serves `not_found.html`, which is in its new-site template.
