# Eight Sleep MCP — Personal Setup Guide

## My Use Case

When the **Bedroom Gu** Philips Hue lights turn on between 6–10am, the Eight Sleep Pod 3 automatically turns off. The chain:

```
Philips Hue light turns on (6–10am)
  → HomeKit detects the event
    → HomeKit automation triggers Apple Shortcut
      → "Turn Off Eight Sleep" Shortcut hits Eight Sleep API
        → Pod 3 turns off (~5–15 second latency)
```

Claude Desktop also has full MCP access to Eight Sleep — all 24 tools — for querying sleep data, controlling temperature, managing alarms, etc.

---

## Phase 1: MCP Server (Claude Desktop)

### What this repo is

A fork of [`elizabethtrykin/8sleep-mcp`](https://github.com/elizabethtrykin/8sleep-mcp) with a critical bug fixed: the original only registered 8 of 24 defined tools. This fork registers all 24, including the missing `setDevicePower` needed for the automation.

### Install & build

```bash
cd ~/Code/8sleep-mcp
npm install
npm run build
```

### Get your User ID

The OAuth2 token endpoint (`auth-api.8slp.net/v1/tokens`) requires undocumented client credentials. Use the older login endpoint instead:

```bash
curl -s -X POST https://client-api.8slp.net/v1/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: Eight%20Sleep/1.37 CFNetwork/1408.0.4 Darwin/22.5.0" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}'
```

The response contains `session.userId` and `session.token`. Save the `userId`.

### Claude Desktop config

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "eight_sleep": {
      "command": "node",
      "args": ["/Users/guglielmofonda/Code/8sleep-mcp/build/index.js"],
      "env": {
        "EIGHT_SLEEP_EMAIL": "YOUR_EMAIL",
        "EIGHT_SLEEP_PASSWORD": "YOUR_PASSWORD",
        "EIGHT_SLEEP_USER_ID": "YOUR_USER_ID"
      }
    }
  }
}
```

> **Note:** No JSON comments allowed — the config parser rejects them. All three env vars are required; the code throws if email/password are missing even though README implies userId alone suffices.

Quit Claude Desktop fully (Cmd+Q), reopen, confirm 24 tools appear under the hammer icon.

---

## Phase 2: Apple Shortcut — "Turn Off Eight Sleep"

Create this in the Shortcuts app. It makes two HTTP calls:

### Step 1: Authenticate

- **Action:** Get Contents of URL
- **URL:** `https://client-api.8slp.net/v1/login`
- **Method:** POST
- **Headers:** `User-Agent: Eight%20Sleep/1.37 CFNetwork/1408.0.4 Darwin/22.5.0`
- **Body (JSON):**
  ```json
  {
    "email": "YOUR_EMAIL",
    "password": "YOUR_PASSWORD"
  }
  ```
- **Next actions:**
  1. Get Dictionary Value → key `session` → save as variable `session`
  2. Get Dictionary Value from `session` → key `token` → save as variable `authToken`

### Step 2: Turn off pod

- **Action:** Get Contents of URL
- **URL:** `https://client-api.8slp.net/v1/users/YOUR_USER_ID/devices/power`
- **Method:** POST
- **Headers:** `Authorization: Bearer [authToken variable]`
- **Body (JSON):**
  ```json
  { "on": false }
  ```

### Step 3 (optional): Notification

- **Action:** Show Notification → "Eight Sleep turned off"

Test by running the shortcut manually and confirming the pod turns off.

---

## Phase 3: HomeKit Automation

**Prerequisite:** A Home Hub (HomePod, Apple TV, or iPad) must be set up — required for automations to run without your phone present.

### Steps

1. Open **Home app** → **Automation** tab → **+** New Automation
2. Trigger: **An Accessory is Controlled** → select **Bedroom Gu** → **When it turns on**
3. Time condition: **Between 6:00 AM and 10:00 AM**
4. Action: **Convert to Shortcut** → add **Run Shortcut** → select **Turn Off Eight Sleep**
5. **Toggle OFF "Ask Before Running"** — critical, otherwise it prompts every time
6. Save

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Claude Desktop shows only 8 tools | Rebuild: `npm run build` in `8sleep-mcp/`. Check config path is absolute. |
| Auth API returns 401 | Wrong email/password, or Eight Sleep account uses SSO (Google/Apple login) — set a password via the Eight Sleep app first |
| Shortcut fails | Run manually with Shortcuts debug; check `access_token` variable is populated |
| HomeKit automation doesn't fire | Confirm Home Hub is online. Check "Ask Before Running" is OFF. Test outside 6–10am window won't trigger — expected |
| Pod doesn't turn off | Test Shortcut in isolation. Verify user ID is correct in Step 2 URL |
| ~15 second delay | Normal — Hue Bridge → HomeKit → Shortcut → API chain. Not reduceable easily |

---

## Bug Fixed vs Original

`src/index.ts` in the original repo only called `server.tool()` for 8 functions, leaving 16 defined-but-unreachable:

| Added | Category |
|---|---|
| `getAlarms`, `setAlarm`, `updateAlarm`, `deleteAlarm` | Alarms |
| `getDeviceStatus`, `setDevicePower` | Device control |
| `getRespiratoryRate`, `getHeartRate`, `getSleepTiming`, `getSleepFitnessTrends` | Sleep data |
| `getTemperatureSchedules`, `setTemperatureSchedule`, `updateTemperatureSchedule`, `deleteTemperatureSchedule` | Temperature scheduling |
| `getUserPreferences`, `updateUserPreferences` | Preferences |

Void-returning tools now return confirmation messages instead of `undefined`.
