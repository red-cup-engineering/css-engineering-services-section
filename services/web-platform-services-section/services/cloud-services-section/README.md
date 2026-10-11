# Cloud Services Section

Networking and provider capabilities that give a machine or service a real
address on the internet: private mesh networking, public tunnel ingress, and
related provider integrations. Consumers (like a specific deployed site)
depend on these and supply their own hostnames/ports/credentials — the
capability itself carries no site-specific configuration.

## Holdings

- `services/tailscale-services-section/` — Tailscale private mesh networking.
- `services/cloudflare-services-section/` — Cloudflare Tunnel ingress.
- `services/discord-services-section/` — Discord integration services.
- `services/gcloud-services-section/` — Google Cloud provider services.
- `services/google-drive-use-team/` — Google Drive contracted-agent integration.
- `services/hugging-face-cpu-compute-provider/` — Hugging Face CPU compute provider.

Deno-specific cloud providers are implemented under the JavaScript section's
`services/deno-services-section/`.

GitHub's repository, Models, and Actions integrations are Web 2 software
platform services at
`../web2-platform-services-section/services/web2-software-platform-services-section/services/github-services-section/`.
