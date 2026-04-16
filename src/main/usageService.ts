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
  error?: string;
}

const CRED_PATH = path.join(os.homedir(), '.claude', '.credentials.json');

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
 * Read the OAuth credentials from ~/.claude/.credentials.json
 */
function readCredentials(): { accessToken: string; refreshToken: string; expiresAt: number } | null {
  try {
    const raw = fs.readFileSync(CRED_PATH, 'utf8');
    const creds = JSON.parse(raw);
    const oauth = creds?.claudeAiOauth;
    if (!oauth?.accessToken) return null;
    return {
      accessToken: oauth.accessToken,
      refreshToken: oauth.refreshToken || '',
      expiresAt: oauth.expiresAt || 0,
    };
  } catch {
    return null;
  }
}

/**
 * Refresh the OAuth access token using the refresh token.
 * Updates the credentials file on success.
 */
function refreshAccessToken(refreshToken: string): Promise<string | null> {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/api/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }
        try {
          const data = JSON.parse(body);
          if (!data.access_token) {
            resolve(null);
            return;
          }
          // Update credentials file
          const raw = fs.readFileSync(CRED_PATH, 'utf8');
          const creds = JSON.parse(raw);
          creds.claudeAiOauth.accessToken = data.access_token;
          if (data.refresh_token) creds.claudeAiOauth.refreshToken = data.refresh_token;
          if (data.expires_in) creds.claudeAiOauth.expiresAt = Date.now() + data.expires_in * 1000;
          fs.writeFileSync(CRED_PATH, JSON.stringify(creds), 'utf8');
          resolve(data.access_token);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
    req.write(postData);
    req.end();
  });
}

/**
 * Get a valid access token, refreshing if expired.
 */
async function getValidToken(): Promise<{ token: string } | { error: string }> {
  const creds = readCredentials();
  if (!creds) {
    return { error: 'No credentials found — open Claude Code to sign in' };
  }

  // Check if token is expired (with 60s buffer)
  if (creds.expiresAt && Date.now() > creds.expiresAt - 60000) {
    if (!creds.refreshToken) {
      return { error: 'Token expired — open Claude Code to re-authenticate' };
    }
    const newToken = await refreshAccessToken(creds.refreshToken);
    if (!newToken) {
      return { error: 'Token expired and refresh failed — open Claude Code to re-authenticate' };
    }
    return { token: newToken };
  }

  return { token: creds.accessToken };
}

/**
 * Fetch usage data from the Anthropic OAuth usage API.
 * Returns UsageData with error field if something goes wrong.
 */
export async function fetchUsageData(): Promise<UsageData | null> {
  const tokenResult = await getValidToken();
  if ('error' in tokenResult) {
    return { buckets: [], extraUsage: null, error: tokenResult.error };
  }

  return new Promise((resolve) => {
    const options: https.RequestOptions = {
      hostname: 'api.anthropic.com',
      path: '/api/oauth/usage',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenResult.token}`,
        'anthropic-beta': 'oauth-2025-04-20',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 401) {
          resolve({ buckets: [], extraUsage: null, error: 'Authentication failed — open Claude Code to re-authenticate' });
          return;
        }
        if (res.statusCode !== 200) {
          resolve({ buckets: [], extraUsage: null, error: `API error (${res.statusCode})` });
          return;
        }
        const parsed = parseApiResponse(body);
        if (!parsed) {
          resolve({ buckets: [], extraUsage: null, error: 'Could not parse usage data' });
          return;
        }
        resolve(parsed);
      });
    });

    req.on('error', (err) => {
      resolve({ buckets: [], extraUsage: null, error: `Network error: ${err.message}` });
    });
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ buckets: [], extraUsage: null, error: 'Request timed out' });
    });
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
