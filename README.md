# Eight Sleep MCP

A Model Context Protocol (MCP) server for accessing Eight Sleep Pod data.

## Setup

### Prerequisites
- Node.js (v16+)
- Eight Sleep account

### Installation
1. Clone the repository
2. Run:
```bash
npm install
npm run build
```

### Configuration

#### Getting Your User ID
You need to get your Eight Sleep user ID once and add it to your configuration. This prevents the client from having to authenticate with email/password on every request. You have two options:

Option 1: Direct API Call
1. ```bash
curl -X POST https://client-api.8slp.net/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your_email","password":"your_password"}'
```

2. Add the user ID to your configuration as shown below.

Option 2: Using MCP Client
1. First set up your `.env` file without the user ID:
```env
EIGHT_SLEEP_EMAIL=your_email
EIGHT_SLEEP_PASSWORD=your_password
```

2. Run the MCP client once to get your user ID:
```bash
node build/index.js getUsers
```
The response will include your user ID. Save this value.

3. Add the user ID to your configuration as shown below.

#### Environment Variables
Create a `.env` file:

```env
# Eight Sleep Authentication
EIGHT_SLEEP_EMAIL=your_email
EIGHT_SLEEP_PASSWORD=your_password
EIGHT_SLEEP_USER_ID=your_user_id
EIGHT_SLEEP_CLIENT_ID=your_client_id
EIGHT_SLEEP_CLIENT_SECRET=your_client_secret
```

> **Important:** `EIGHT_SLEEP_EMAIL`, `EIGHT_SLEEP_PASSWORD`, and `EIGHT_SLEEP_USER_ID` are all required by the current client. The user ID lets tools target the right user, but the server still authenticates with email/password to obtain an access token.

### Claude Desktop Integration
Add to Claude Desktop's config (Settings → Developer → Edit Config):

```json
{
    "mcpServers": {
        "eight_sleep": {
            "command": "node",
            "args": ["/absolute/path/to/eight-sleep-mcp/build/index.js"],
            "env": {
                "EIGHT_SLEEP_EMAIL": "your_email",
                "EIGHT_SLEEP_PASSWORD": "your_password",
                "EIGHT_SLEEP_USER_ID": "your_user_id",
                "EIGHT_SLEEP_CLIENT_ID": "your_client_id",
                "EIGHT_SLEEP_CLIENT_SECRET": "your_client_secret"
            }
        }
    }
}
```

> **Important**: Adding your user ID to the configuration is required to avoid having to authenticate with email/password on every request. Make sure to get it using one of the methods above.

Restart Claude Desktop after saving.

## Available Functions

### User Information
- `getUsers` - Get user profile information
- `getUserPreferences` - Get user preferences (units, timezone, bed side)
- `updateUserPreferences` - Update user preferences

### Device Control
- `getDeviceStatus` - Get device status (online, firmware, water level)
- `setDevicePower` - Turn device on/off
- `getPresence` - Check if user is in bed

### Temperature Control
- `getTemperature` - Get current temperature settings
- `setTemperature` - Set immediate temperature raw level (-100 to 100)
- `getTemperatureSchedules` - Get temperature schedules
- `setTemperatureSchedule` - Create temperature schedule
- `updateTemperatureSchedule` - Update temperature schedule
- `deleteTemperatureSchedule` - Delete temperature schedule

### Sleep Data
- `getSleepData` - Get detailed sleep data for date range
- `getSleepScore` - Get sleep score for a date
- `getSleepStages` - Get sleep stages (awake, light, deep, REM)
- `getHrv` - Get Heart Rate Variability data
- `getHeartRate` - Get heart rate data
- `getRespiratoryRate` - Get respiratory rate data
- `getSleepTiming` - Get bedtime and wake time
- `getSleepFitnessTrends` - Get sleep fitness trends

### Alarm Management
- `getAlarms` - Get all alarms
- `setAlarm` - Create new alarm
- `updateAlarm` - Update existing alarm
- `deleteAlarm` - Delete alarm

## Function Parameters

For date-based functions, use the format `YYYY-MM-DD`. For example:
```typescript
getSleepData({
  startDate: "2024-03-15",
  endDate: "2024-03-16"  // optional
})
```

For temperature settings, Eight Sleep uses raw heating/cooling levels, not literal °C/°F:
```typescript
setTemperature({
  level: -50,  // raw level -100 to 100; about 21°C / 70°F
  duration: 3600  // seconds, optional
})
```

Useful conversions from the community pyEight lookup table:

| Celsius | Raw level |
|---:|---:|
| 21°C | -50 |
| 24°C | -25 |
| 26°C | -8 |
| 27°C | 0 |

The server uses Eight Sleep's app API for temperature control:

- Turn on: `PUT https://app-api.8slp.net/v1/users/<USER_ID>/temperature` with `{ "currentState": { "type": "smart" } }`
- Set target: same endpoint with `{ "currentLevel": <raw_level> }`
- Optional duration: same endpoint with `{ "timeBased": { "level": <raw_level>, "durationSeconds": <seconds> } }`
- Turn off: same endpoint with `{ "currentState": { "type": "off" } }`

Do not use `client-api.8slp.net/v1/devices/<DEVICE_ID>` with `{ "leftOn": true, "rightOn": true }` for power. It can return success while the app still reports the Pod as off.

For alarms:
```typescript
setAlarm({
  time: "07:00",
  daysOfWeek: [1,2,3,4,5],  // Mon-Fri
  vibration: true,
  sound: "chime"  // optional
})
```

For temperature schedules:
```typescript
setTemperatureSchedule({
  startTime: "22:00",
  level: -20,
  daysOfWeek: [0,1,2,3,4,5,6]  // Every day
})
```