# Eight Sleep MCP — Personal Setup Guide

## What this is for

This repo is configured for Gu's current setup:
- Hermes native MCP access to Eight Sleep
- overnight cron-job automation
- shared Pod side-specific temperature control when needed
- morning shutdown automation through HomeKit / Shortcuts if desired

## Core API facts

- Temperature values are **raw levels** from `-100` to `100`, not literal °C/°F.
- Working control path:
  `PUT https://app-api.8slp.net/v1/users/<USER_ID>/temperature`
- For shared Pods, resolve side users from household pairing data:
  - `pairing.leftUserId`
  - `pairing.rightUserId`
- Do **not** use `assignment.leftUserId/rightUserId` for side-specific writes.
- Do **not** rely on `client-api.8slp.net/v1/devices/<DEVICE_ID>` with `leftOn/rightOn` for power control.

Useful raw-level reference:

| Celsius | Raw level |
|---:|---:|
| 21°C | -50 |
| 24°C | -25 |
| 26°C | -8 |
| 27°C | 0 |

## Hermes MCP setup

### 1) Build the repo

```bash
cd ~/Code/8sleep-mcp
npm install
npm run build
```

### 2) Create a secrets file

```bash
mkdir -p ~/.hermes-athena/secrets
chmod 700 ~/.hermes-athena/secrets
```

Create `~/.hermes-athena/secrets/eight_sleep.env`:

```env
EIGHT_SLEEP_EMAIL="your_email@example.com"
EIGHT_SLEEP_PASSWORD="your_password"
EIGHT_SLEEP_USER_ID="your_user_id"
```

### 3) Create the wrapper script

Create `~/.hermes-athena/secrets/run-eight-sleep-mcp.sh`:

```bash
#!/bin/sh
set -eu
. ~/.hermes-athena/secrets/eight_sleep.env
export EIGHT_SLEEP_EMAIL EIGHT_SLEEP_PASSWORD EIGHT_SLEEP_USER_ID
exec node ~/Code/8sleep-mcp/build/index.js
```

Then:

```bash
chmod 700 ~/.hermes-athena/secrets/run-eight-sleep-mcp.sh
```

### 4) Add Hermes config

Add the server to `~/.hermes/config.yaml` and mirror it into `~/.hermes-athena/config.yaml` if both are used:

```yaml
mcp_servers:
  eight_sleep:
    command: "/Users/guglielmofondq/.hermes-athena/secrets/run-eight-sleep-mcp.sh"
    args: []
    timeout: 120
    connect_timeout: 60
```

Restart Hermes after editing the config.

## Overnight cron-job pattern

Use **small recurring cron jobs** instead of one giant always-on job.

Recommended slices:
- 21:30 — bedtime start
- 23:30 — step 2
- 00:30 — step 3
- 06:45 — wake ramp
- 07:30 — turn off

Recommended prompt guardrails:
- `Do not create any new cron jobs.`
- keep each job self-contained
- use `deliver: local` unless a message is wanted
- for jobs after midnight, treat them as part of the night that started the previous day

Weekly pattern used here:
- Mon / Wed / Fri / Sun = solo night
- Thu / Sat = couple night
- Tue = off

Example prompt:

```text
Tonight's Eight Sleep job.

Rules:
- Do not create any new cron jobs.
- If tonight is a solo night, use the solo temperature plan.
- If tonight is a couple night, use side-specific temperature control.
- If tonight is Tuesday, do nothing.
- For after-midnight jobs, keep using the night that started the previous day.
- Verify Pod state before changing anything.
```

## Optional morning shutdown automation

If you want the Pod to turn off automatically in the morning:

1. Home app → Automation → new automation
2. Trigger Bedroom Gu light turning on
3. Add time window if desired
4. Run a Shortcut that calls the Eight Sleep app API and sends `{ "currentState": { "type": "off" } }`
5. Turn off "Ask Before Running"

## Useful repo notes

- The repo intentionally keeps the app-api control path documented because it is the reliable one.
- Side control should always resolve via household pairing, not assignment.
- If a change looks like it worked but the Pod state did not change, verify with `getTemperature` / `getDeviceStatus`.

## Fork attribution

This repo is a fork of [`elizabethtrykin/8sleep-mcp`](https://github.com/elizabethtrykin/8sleep-mcp). The Hermes wrapper and setup pattern here were adapted from that project for Gu's current workflow.
