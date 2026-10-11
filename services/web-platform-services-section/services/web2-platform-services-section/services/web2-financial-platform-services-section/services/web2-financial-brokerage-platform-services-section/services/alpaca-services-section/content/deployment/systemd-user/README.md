# Alpaca loop deployment

The systemd user units that run the two Alpaca loops and gate them behind the kill switch.

## Why these exist here

The loops ran on some host between 2026-07-22 and 2026-07-24 and produced real decision
journals, but their unit files were never committed. When the kill switch tripped on
2026-07-23 it disabled units that existed only on that machine, so there was nothing in the
repository to re-enable and no record of what the schedule had been. These units are written
from what the code itself expects: `alpaca-account-kill-switch-service/src/systemd-timers.mjs`
names `alpaca-esther-paper-trading-loop.timer` in `KNOWN_ALPACA_TIMER_UNITS` and additionally
globs `systemctl --user list-unit-files` for anything matching, so the unit names here must
match that constant or a trip will not reach them.

## The kill switch runs as ExecStartPre, not as its own timer

If the kill switch were a separate scheduled unit, a loop firing in the same minute could
start before the trip landed. As `ExecStartPre` a nonzero exit prevents the loop from running
at all, so a tripped account cannot trade in the window between checks.

## Schedule

Weekdays, hourly across the US regular session in UTC. The loops read Alpaca's own clock and
exit cleanly when the market is closed, so a firing outside session hours costs nothing and is
not worth encoding around daylight-saving shifts here.

## Install

```sh
mkdir -p ~/.config/systemd/user
cp *.service *.timer ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now alpaca-esther-paper-trading-loop.timer
systemctl --user enable --now alpaca-esther-paper-redistributor-loop.timer
systemctl --user list-timers 'alpaca-*'
```

Credentials come from the repository `.env` via `EnvironmentFile`. The loops trade the
live account when `ALPACA_ACCOUNT_ESTHER_LIVE_TRADING_KEY` and `..._SECRET` are set, and
the paper account from `ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY` and `..._SECRET`
otherwise. Going live is adding the live pair to the environment file the units read.

Before enabling, confirm the kill switch is not still holding a trip from the 2026-07-23
incident: `cat ../../../services/alpaca-account-kill-switch-service/data/state/tripped/latest.json`.
That trip was a false positive against a paper-account rebalance, and the reset-discontinuity
guard added to `kill-switch.mjs` on 2026-08-27 prevents it recurring, but the recorded
high-water mark may still need clearing for the first run to pass.
