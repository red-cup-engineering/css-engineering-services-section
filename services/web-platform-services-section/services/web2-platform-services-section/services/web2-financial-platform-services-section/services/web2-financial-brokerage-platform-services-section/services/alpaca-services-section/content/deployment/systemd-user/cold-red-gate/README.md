# Alpaca loop deployment on Cold Red Gate

Host-specific variants of the two Alpaca loop `.service` units, for the box-law
move off `/home/emsenn/info` onto the VPS deploy tree at
`/home/emsenn/561-group/services/`. The `.timer` units one level up
(`../alpaca-esther-paper-trading-loop.timer`,
`../alpaca-esther-paper-redistributor-loop.timer`) carry no host paths and are
reused as-is on this host.

## Deploy tree layout expected by these units

Each loop gets its own directory under `/home/emsenn/561-group/services/`,
holding a minimal `package.json` pinning the published loop package and the
kill-switch package (for the `ExecStartPre` pre-check) at exact versions,
installed via `npm install` against `https://registry.561.group`:

```
/home/emsenn/561-group/services/alpaca-esther-paper-trading-loop/
  package.json   # pins @red-cup-engineering/alpaca-esther-paper-trading-loop
                 # and @red-cup-engineering/alpaca-account-kill-switch-service
  node_modules/.bin/alpaca-esther-paper-trading-loop
  node_modules/.bin/alpaca-check-kill-switch

/home/emsenn/561-group/services/alpaca-esther-paper-redistributor-loop/
  package.json   # pins @red-cup-engineering/alpaca-esther-paper-redistributor-loop
                 # and @red-cup-engineering/alpaca-account-kill-switch-service
  node_modules/.bin/alpaca-esther-paper-redistributor-loop
  node_modules/.bin/alpaca-check-kill-switch
```

`ExecStartPre`/`ExecStart` invoke those `node_modules/.bin` entries directly
(each target file carries its own `#!/usr/bin/env node` shebang).

## Credentials

`EnvironmentFile=%h/.config/alpaca-esther-paper.env` (mode 0600), holding
`ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY` and `..._SECRET`. Never the
laptop's `/home/emsenn/info/.env` — that file never leaves the laptop.

## Kill-switch state

`alpaca-check-kill-switch` writes its high-water-mark and tripped records to
`data/state/` relative to its own package install
(`node_modules/@red-cup-engineering/alpaca-account-kill-switch-service/data/state/`
under each loop's deploy directory) — under the deploy tree, outside any git
checkout. A fresh deploy tree starts with no prior high-water mark; the first
pre-check establishes the baseline rather than inheriting the laptop's.

## Install

```sh
mkdir -p ~/.config/systemd/user
cp alpaca-esther-paper-trading-loop.service alpaca-esther-paper-redistributor-loop.service ~/.config/systemd/user/
cp ../alpaca-esther-paper-trading-loop.timer ../alpaca-esther-paper-redistributor-loop.timer ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now alpaca-esther-paper-trading-loop.timer
systemctl --user enable --now alpaca-esther-paper-redistributor-loop.timer
systemctl --user list-timers 'alpaca-*'
```
