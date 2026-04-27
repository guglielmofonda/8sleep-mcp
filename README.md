# Eight Sleep MCP

A Model Context Protocol (MCP) server for Gu's Eight Sleep Pod.

This repo is tuned for the current Hermes workflow:
- live pod temperature / power control
- sleep data, alarms, and schedules
- overnight automation via Hermes cron jobs

## What this repo does well

- Query device status and presence
- Read sleep score, stages, HRV, heart rate, respiratory rate, and timing
- Set alarms and temperature schedules
- Control pod temperature and power
- Support shared Pod side-specific control through household pairing data

## Important implementation notes

- Temperature values are **raw levels** from `-100` to `100`, not literal °C/°F.
- Working power and temperature writes use the app API:
  `PUT https://app-api.8slp.net/v1/users/<USER_ID>/temperature`
- For shared Pods, resolve left/right user IDs from `pairing.leftUserId` and `pairing.rightUserId` in household summary data.
- Do **not** use `assignment.leftUserId/rightUserId` for side-specific temperature writes.
- Do **not** rely on `client-api.8slp.net/v1/devices/<DEVICE_ID>` with `leftOn/rightOn` for power control; it can return success without actually changing the Pod state.

Useful raw-level reference:

| Celsius | Raw level |
|---:|---:|
| 21°C | -50 |
| 24°C | -25 |
| 26°C | -8 |
| 27°C | 0 |

## Build

```bash
cd ~/Code/8sleep-mcp
npm install
npm run build
```

## Hermes setup

Hermes can load this repo as a native MCP server and then run overnight cron jobs against it.

### 1) Create a secrets file

Keep credentials out of config YAML:

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

### 2) Create a wrapper script

Create `~/.hermes-athena/secrets/run-eight-sleep-mcp.sh`:

```bash
#!/bin/sh
set -eu
. ~/.hermes-athena/secrets/eight_sleep.env
export EIGHT_SLEEP_EMAIL EIGHT_SLEEP_PASSWORD EIGHT_SLEEP_USER_ID
exec node ~/Code/8sleep-mcp/build/index.js
```

Then make it executable:

```bash
chmod 700 ~/.hermes-athena/secrets/run-eight-sleep-mcp.sh
```

### 3) Add Hermes MCP config

Mirror this into both `~/.hermes/config.yaml` and `~/.hermes-athena/config.yaml` if you use both:

```yaml
mcp_servers:
  eight_sleep:
    command: "/Users/guglielmofondq/.hermes-athena/secrets/run-eight-sleep-mcp.sh"
    args: []
    timeout: 120
    connect_timeout: 60
```

Restart Hermes after changing the config.

## Overnight automation with Hermes cron jobs

For a stable overnight workflow, use **small recurring cron jobs** instead of one giant always-on loop.

Recommended pattern:
- one cron job per time slice
- keep each job prompt self-contained
- include `Do not create any new cron jobs.` in the prompt
- use `deliver: local` unless you explicitly want a message
- for jobs after midnight, treat them as part of the night that started the previous day

A clean schedule shape is:

- 21:30 — bedtime start
- 23:30 — step 2
- 00:30 — step 3
- 06:45 — wake ramp
- 07:30 — turn off

Weekly logic I use here:
- Mon / Wed / Fri / Sun = solo night
- Thu / Sat = couple night
- Tue = off

Example cron job prompt structure:

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

## Available functions

- `getUsers`
- `getUserPreferences`
- `updateUserPreferences`
- `getDeviceStatus`
- `setDevicePower`
- `getPresence`
- `getTemperature`
- `setTemperature`
- `getTemperatureSchedules`
- `setTemperatureSchedule`
- `updateTemperatureSchedule`
- `deleteTemperatureSchedule`
- `getSleepData`
- `getSleepScore`
- `getSleepStages`
- `getHrv`
- `getHeartRate`
- `getRespiratoryRate`
- `getSleepTiming`
- `getSleepFitnessTrends`
- `getAlarms`
- `setAlarm`
- `updateAlarm`
- `deleteAlarm`

## Fork attribution

This repo is a fork of [`elizabethtrykin/8sleep-mcp`](https://github.com/elizabethtrykin/8sleep-mcp). The Hermes wrapper and setup pattern here were adapted from that project for Gu's current workflow.
