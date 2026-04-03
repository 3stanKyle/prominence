# PRD: Claude Code Usage HUD

## Introduction

A desktop HUD (Heads-Up Display) built with Electron that shows Claude Code plan usage limits — both current session and weekly limits across all models. It lives in the system tray and expands into a floating overlay on click, showing usage counts, progress bars, and time until reset. It auto-launches via a Claude Code hook whenever a CLI session starts.

## Goals

- Show real-time usage data for the current Claude Code session and weekly plan limits
- Display usage per model (Opus, Sonnet, Haiku) with progress bars and time-until-reset countdowns
- Run as a system tray app with an expandable floating overlay
- Auto-launch via Claude Code session-start hook
- Be lightweight and unobtrusive — never block workflow

## User Stories

### US-001: Set up Electron app scaffold
**Description:** As a developer, I need a minimal Electron app structure so the HUD can run as a desktop application.

**Acceptance Criteria:**
- [ ] Electron app bootstrapped with main process and renderer
- [ ] App starts and shows a window
- [ ] Package.json has start/build scripts
- [ ] Typecheck/lint passes

### US-002: System tray integration
**Description:** As a user, I want the HUD to live in my system tray so it doesn't clutter my taskbar or workspace.

**Acceptance Criteria:**
- [ ] App minimizes to system tray on launch (no taskbar entry)
- [ ] Tray icon shows a recognizable icon (e.g., usage gauge or Claude logo)
- [ ] Right-click tray icon shows context menu with "Show", "Refresh", "Quit" options
- [ ] Left-click tray icon toggles the overlay
- [ ] Typecheck/lint passes

### US-003: Floating overlay window
**Description:** As a user, I want to click the tray icon to see a compact floating overlay with my usage data so I can check limits at a glance.

**Acceptance Criteria:**
- [ ] Overlay appears near the system tray when tray icon is clicked
- [ ] Overlay is always-on-top, frameless, and semi-transparent
- [ ] Overlay closes when clicking outside it or pressing Escape
- [ ] Overlay is draggable to reposition
- [ ] Typecheck/lint passes

### US-004: Fetch usage data
**Description:** As a developer, I need to retrieve Claude Code usage data (session and weekly limits per model) so the HUD can display it.

**Acceptance Criteria:**
- [ ] Identify and implement the best available method to get usage data (API, CLI parsing, local files, or a combination)
- [ ] Data includes: model name, current usage count, max limit, and reset time for each model
- [ ] Data includes: current session usage if available
- [ ] Handles errors gracefully (shows "unavailable" rather than crashing)
- [ ] Typecheck/lint passes

### US-005: Display usage with progress bars
**Description:** As a user, I want to see my usage per model as progress bars with counts so I know how close I am to my limits.

**Acceptance Criteria:**
- [ ] Each model (Opus, Sonnet, Haiku) shown as a labeled row
- [ ] Progress bar fills proportionally to usage/limit ratio
- [ ] Progress bar color changes: green (<60%), yellow (60-85%), red (>85%)
- [ ] Shows "X / Y" text (e.g., "142 / 200") next to each bar
- [ ] Typecheck/lint passes

### US-006: Display time until reset
**Description:** As a user, I want to see a countdown showing when my usage limits reset so I can plan my work.

**Acceptance Criteria:**
- [ ] Shows human-readable countdown (e.g., "Resets in 2d 14h 23m")
- [ ] Countdown updates in real time (every minute)
- [ ] Shows reset time for weekly limits
- [ ] Typecheck/lint passes

### US-007: Auto-refresh and manual refresh
**Description:** As a user, I want the data to stay current without manual intervention, but also be able to force a refresh.

**Acceptance Criteria:**
- [ ] Data auto-refreshes on a configurable interval (default: every 5 minutes)
- [ ] "Refresh" button in overlay triggers immediate data fetch
- [ ] "Refresh" option in tray context menu triggers immediate data fetch
- [ ] Shows "Last updated: X minutes ago" timestamp
- [ ] Typecheck/lint passes

### US-008: Claude Code session-start hook
**Description:** As a user, I want the HUD to auto-launch whenever I start a Claude Code CLI session so I never forget to check my usage.

**Acceptance Criteria:**
- [ ] Claude Code hook configured to run on session start (via settings.json or .claude/hooks)
- [ ] Hook launches the HUD if not already running
- [ ] If HUD is already running, hook triggers a data refresh instead of launching a duplicate
- [ ] Hook does not block or delay the Claude Code session startup
- [ ] Typecheck/lint passes

### US-009: Session usage display
**Description:** As a user, I want to see usage for my current Claude Code session separately from weekly totals.

**Acceptance Criteria:**
- [ ] Overlay has a "Current Session" section separate from "Weekly Usage"
- [ ] Session section shows token/message count if available
- [ ] Clear visual separation between session and weekly data
- [ ] Typecheck/lint passes

## Functional Requirements

- FR-1: Electron app runs as a system tray application with no taskbar window on launch
- FR-2: Left-clicking the tray icon toggles a floating, always-on-top, frameless overlay window
- FR-3: Overlay displays per-model usage as color-coded progress bars with "used / limit" text
- FR-4: Overlay displays a live countdown to the next weekly usage reset
- FR-5: Overlay has separate sections for current session usage and weekly plan usage
- FR-6: App fetches usage data on launch, on a recurring interval (default 5 min), and on manual refresh
- FR-7: App is launchable via a Claude Code session-start hook
- FR-8: If already running, receiving a second launch signal triggers a refresh (no duplicate instances)
- FR-9: Right-click tray context menu provides "Show", "Refresh", and "Quit" options
- FR-10: Overlay closes on Escape key or click-outside

## Non-Goals

- No historical usage trends or graphs
- No alert/notification system for approaching limits
- No multi-account support
- No built-in auto-updater for the app itself
- No mobile or web companion app
- No editing or managing Claude Code settings from the HUD

## Design Considerations

- Keep the overlay compact — aim for ~300px wide, content-height adaptive
- Use a dark theme to match typical developer environments
- Progress bars should be the dominant visual element — scannable in under 2 seconds
- Consider rounded corners and subtle drop shadow for the overlay
- Use system-native fonts for clarity

## Technical Considerations

- **Data source:** Investigate Claude Code local files (e.g., `~/.claude/` directory) for cached usage data, CLI output parsing, or any available API endpoints. Prioritize the most reliable and least invasive method.
- **Single instance:** Use Electron's `app.requestSingleInstanceLock()` to prevent duplicates; second launch sends a refresh signal to the running instance
- **IPC:** Use Electron IPC for main process (tray, data fetching) to renderer (overlay UI) communication
- **Hook integration:** Claude Code hooks are configured in `.claude/settings.json` under the `hooks` key — the session-start hook should run a shell command to launch or signal the app
- **Performance:** Keep memory footprint low (<50MB); minimize polling frequency when overlay is hidden

## Success Metrics

- HUD launches in under 2 seconds from hook trigger
- Usage data is accurate and matches Claude Code's own reporting
- Overlay is readable at a glance — user can check limits in under 3 seconds
- App uses less than 50MB of memory while idle in the tray

## Open Questions

- What is the exact data source for usage limits? Need to investigate `~/.claude/` directory structure and any available API endpoints.
- Does Claude Code expose session-level usage data, or only weekly totals?
- What are the exact weekly limit numbers per model for the user's plan tier?
- Should the overlay position be saved between sessions?
