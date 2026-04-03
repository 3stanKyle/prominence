# Prominence Setup Guide

## Prerequisites

- Node.js 18+
- Electron (installed via `npm install`)
- Claude Code CLI

## Installation

```bash
git clone <repo-url> prominence
cd prominence
npm install
```

## Running

```bash
npm start
```

The app launches minimized to the system tray. Left-click the tray icon to toggle the usage overlay.

## Claude Code Session-Start Hook

Prominence can auto-launch whenever you start a Claude Code CLI session. Add the following hook to your Claude Code settings file.

### Automatic Setup

Add this configuration to `~/.claude/settings.json` (create the file if it doesn't exist):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "npm start --prefix /path/to/prominence &",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

**Important:** Replace `/path/to/prominence` with the actual absolute path to your Prominence installation directory.

### How It Works

1. When you start a Claude Code CLI session, the `SessionStart` hook fires.
2. The hook runs `npm start --prefix /path/to/prominence` in the background (the trailing `&` ensures it doesn't block session startup).
3. If Prominence is already running, the single-instance lock detects the second launch, triggers a data refresh on the existing instance, and the second process exits immediately.
4. The `timeout: 5` setting ensures the hook doesn't hold up session startup even without the background `&`.

### Configuration Options

| Field | Value | Purpose |
|-------|-------|---------|
| `matcher` | `"startup"` | Only fires on new sessions (not on resume) |
| `command` | `npm start --prefix ...` | Launches Prominence from any working directory |
| `timeout` | `5` | Max seconds to wait before proceeding with session |

### Verifying the Hook

1. Start a new Claude Code session: `claude`
2. Check your system tray for the Prominence icon
3. Left-click the icon to verify the usage overlay appears

### Troubleshooting

- **Hook not firing:** Ensure `~/.claude/settings.json` is valid JSON. Use `cat ~/.claude/settings.json | python -m json.tool` to validate.
- **App not launching:** Verify the path in the command is correct and `npm start` works when run manually from that directory.
- **Duplicate instances:** This is handled automatically. The second instance triggers a refresh and exits cleanly.

### Using with a Built App

If you've packaged Prominence with `npm run build`, replace the command with the path to the built executable:

```json
{
  "command": "/path/to/prominence/dist/Prominence &"
}
```

### Merging with Existing Settings

If you already have a `~/.claude/settings.json` file, merge the `hooks` key into your existing configuration. For example, if you already have other hooks:

```json
{
  "existingKey": "existingValue",
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "npm start --prefix /path/to/prominence &",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```
