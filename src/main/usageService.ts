import https from 'https';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getOverlayWindow } from './overlay';

export interface UsageBucket {
  label: string;
  utilization: number; // 0-100 percentage
  resetsAt: string | null; // ISO date string
}

export interface ExtraUsage {
  isEnabled: boolean;
  monthlyLimit: number;
  usedCredits: number;
}

export interface UsageData {
  buckets: UsageBucket[];
  extraUsage: ExtraUsage | null;
}

/**
 * Fetch usage data and push it to the renderer via 'usage-data-updated' IPC.
 */
export async function refreshAndPush(): Promise<void> {
  const data = await fetchUsageData();
  const win = getOverlayWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send('usage-data-updated', data);
  }
}

/**
 * Read the OAuth access token from ~/.claude/.credentials.json
 */
function readAccessToken(): string | null {
  try {
    const credPath = path.join(os.homedir(), '.claude', '.credentials.json');
    const raw = fs.readFileSync(credPath, 'utf8');
    const creds = JSON.parse(raw);
    return creds?.claudeAiOauth?.accessToken || null;
  } catch {
    return null;
  }
}

/**
 * Fetch usage data from the Anthropic OAuth usage API.
 * Returns null if the data source is unavailable.
 */
export function fetchUsageData(): Promise<UsageData | null> {
  return new Promise((resolve) => {
    const token = readAccessToken();
    if (!token) {
      resolve(null);
      return;
    }

    const options: https.RequestOptions = {
      hostname: 'api.anthropic.com',
      path: '/api/oauth/usage',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'anthropic-beta': 'oauth-2025-04-20',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }
        resolve(parseApiResponse(body));
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

/**
 * Parse the API JSON response into our UsageData format.
 */
function parseApiResponse(body: string): UsageData | null {
  try {
    const raw = JSON.parse(body);
    const buckets: UsageBucket[] = [];

    // 5-hour window
    if (raw.five_hour) {
      buckets.push({
        label: '5-Hour',
        utilization: raw.five_hour.utilization ?? 0,
        resetsAt: raw.five_hour.resets_at || null,
      });
    }

    // 7-day overall
    if (raw.seven_day) {
      buckets.push({
        label: '7-Day',
        utilization: raw.seven_day.utilization ?? 0,
        resetsAt: raw.seven_day.resets_at || null,
      });
    }

    // Per-model 7-day buckets
    const modelKeys: Array<{ key: string; label: string }> = [
      { key: 'seven_day_opus', label: 'Opus (7d)' },
      { key: 'seven_day_sonnet', label: 'Sonnet (7d)' },
      { key: 'seven_day_cowork', label: 'Cowork (7d)' },
      { key: 'seven_day_oauth_apps', label: 'OAuth Apps (7d)' },
    ];

    for (const { key, label } of modelKeys) {
      if (raw[key] && raw[key].utilization != null) {
        buckets.push({
          label,
          utilization: raw[key].utilization,
          resetsAt: raw[key].resets_at || null,
        });
      }
    }

    // Extra usage (overages)
    let extraUsage: ExtraUsage | null = null;
    if (raw.extra_usage && raw.extra_usage.is_enabled) {
      extraUsage = {
        isEnabled: true,
        monthlyLimit: raw.extra_usage.monthly_limit ?? 0,
        usedCredits: raw.extra_usage.used_credits ?? 0,
      };
    }

    if (buckets.length === 0) {
      return null;
    }

    return { buckets, extraUsage };
  } catch {
    return null;
  }
}
