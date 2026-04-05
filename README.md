# Prominence

**A desktop HUD that tracks your Claude Code usage in real time.**

Prominence is a lightweight Electron app that lives in your system tray and shows your Claude Code plan usage at a glance. It displays per-model usage bars, reset countdowns, extra usage balance, and an animated pixel character that walks when you're actively using Claude Code.

Built for Claude Code power users who want to keep an eye on their limits without leaving their terminal.

![Windows](https://img.shields.io/badge/platform-Windows-blue)
![macOS](https://img.shields.io/badge/platform-macOS-blue)
![Linux](https://img.shields.io/badge/platform-Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)

<!-- Add a screenshot here -->
<!-- ![Prominence HUD](docs/screenshot.png) -->

## Features

- **Real-time usage tracking** - 5-hour and 7-day usage limits with color-coded progress bars (green/yellow/red)
- **Per-model breakdown** - See Opus, Sonnet, and other model-specific usage when available
- **Reset countdown** - Know exactly when your limits reset
- **Extra usage balance** - See your remaining monthly overage credits
- **Plan detection** - Automatically detects your Pro/Max plan
- **Activity indicator** - Animated pixel character walks when Claude Code is running, idles when it's not
- **Glass HUD design** - Frosted glass card with Claude orange branding
- **Draggable & persistent** - Position the HUD anywhere on screen, it stays put
- **Auto-refresh** - Updates every 5 minutes, with manual refresh button
- **Single instance** - Relaunching just refreshes the existing HUD
- **Auto-launch hook** - Optionally starts with every Claude Code session
- **Lightweight** - ~60MB memory in tray, no visible window until you need it

## Quick Start

### From Source

```bash
git clone https://github.com/3stankyle/prominence.git
cd prominence
npm install
npm start
```

Click the orange pixel character in your system tray to open the HUD.

### Download Binary

Check [Releases](https://github.com/3stankyle/prominence/releases) for pre-built installers:

| Platform | Download |
|----------|----------|
| Windows  | `Prominence-Setup-x.x.x.exe` |
| macOS    | `Prominence-x.x.x.dmg` |
| Linux    | `Prominence-x.x.x.AppImage` |

## Requirements

- **Claude Code** installed and logged in (`claude login`)
- **Node.js 18+** (if running from source)
- An active **Claude Pro or Max** subscription

Prominence reads your OAuth token from `~/.claude/.credentials.json` (created when you log in to Claude Code) and calls the Anthropic API directly. No API keys needed.

## How It Works

Prominence fetches usage data from `api.anthropic.com/api/oauth/usage` using your existing Claude Code OAuth token. It never stores or transmits your data anywhere else.

```
System Tray Icon
    |
    v
Floating Glass HUD
    |
    +-- 5-Hour Usage ████████░░ 34%
    +-- 7-Day Usage  ██░░░░░░░░  5%
    +-- Sonnet (7d)  █░░░░░░░░░  2%
    |
    +-- Resets in 4h 23m
    |
    +-- Extra Usage: $2000.00 remaining
    |
    +-- [REFRESH]  Updated just now
```

## Auto-Launch with Claude Code

You can configure Prominence to start automatically whenever you open a Claude Code session. Add this to your `~/.claude/settings.json`:

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

Replace `/path/to/prominence` with your actual install path. The single-instance lock means relaunching just refreshes the existing HUD.

## Usage

| Action | How |
|--------|-----|
| Open HUD | Click tray icon |
| Move HUD | Drag the title bar |
| Refresh data | Click REFRESH button or use tray menu |
| Minimize to tray | Click the `–` button |
| Close to tray | Click the `x` button |
| Quit app | Right-click tray icon > Quit |
| Keyboard close | Press `Escape` |

## Development

```bash
npm install          # install dependencies
npm start            # compile + launch
npm run typecheck    # type check without building
npm run build        # package for distribution
```

### Project Structure

```
src/
  main/
    index.ts          # App lifecycle, IPC handlers, auto-refresh
    tray.ts           # System tray icon and context menu
    overlay.ts        # Floating HUD window management
    usageService.ts   # Anthropic API client for usage data
    preload.ts        # Secure IPC bridge for renderer
  renderer/
    index.html        # HUD UI: glass card, progress bars, animations
```

### Architecture

- **Main process** manages the tray icon, BrowserWindow, and all API calls
- **Renderer process** displays the HUD with vanilla HTML/CSS/JS (no framework)
- **IPC bridge** connects them securely via `contextBridge.exposeInMainWorld`
- **Data source**: Direct HTTPS to `api.anthropic.com/api/oauth/usage` with OAuth token from `~/.claude/.credentials.json`

## Building Releases

Tagged releases trigger GitHub Actions to build installers for all platforms:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow produces Windows `.exe`, macOS `.dmg`, and Linux `.AppImage` artifacts attached to the GitHub Release.

## Privacy

Prominence only communicates with `api.anthropic.com` using your existing Claude Code OAuth token. It does not:

- Collect telemetry or analytics
- Send data to any third-party service
- Store credentials (reads from `~/.claude/` which Claude Code manages)
- Require any additional API keys

## Contributing

PRs welcome. Please keep changes focused and ensure `npm run typecheck` passes.

## License

MIT - see [LICENSE](LICENSE)

---

*Built by [3stankyle](https://github.com/3stankyle) for the Claude Code community.*
