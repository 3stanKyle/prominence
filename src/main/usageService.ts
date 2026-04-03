import { execFile } from 'child_process';
import { getOverlayWindow } from './overlay';

export interface ModelUsage {
  name: string;
  used: number;
  limit: number;
  resetTime: string | null;
}

export interface SessionUsage {
  used: number;
  limit: number;
}

export interface UsageData {
  models: ModelUsage[];
  session: SessionUsage;
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
 * Fetch usage data by running `claude usage` CLI command and parsing its output.
 * Returns null if the data source is unavailable.
 */
export function fetchUsageData(): Promise<UsageData | null> {
  return new Promise((resolve) => {
    execFile('claude', ['usage'], { timeout: 10000 }, (error, stdout, stderr) => {
      if (error || !stdout) {
        resolve(null);
        return;
      }

      const parsed = parseUsageOutput(stdout);
      resolve(parsed);
    });
  });
}

/**
 * Parse the text output from `claude usage` into structured UsageData.
 * Returns null if the output cannot be parsed.
 */
function parseUsageOutput(output: string): UsageData | null {
  try {
    const models: ModelUsage[] = [];
    let resetTime: string | null = null;
    let sessionUsed = 0;
    let sessionLimit = 0;

    const lines = output.split('\n').map((l) => l.trim()).filter(Boolean);

    for (const line of lines) {
      // Try to match model usage lines like "Opus: 142 / 200" or "claude-sonnet-4-6: 50 / 100"
      const modelMatch = line.match(/^(.+?):\s*(\d+)\s*\/\s*(\d+)/i);
      if (modelMatch) {
        const name = normalizeModelName(modelMatch[1].trim());
        const used = parseInt(modelMatch[2], 10);
        const limit = parseInt(modelMatch[3], 10);
        models.push({ name, used, limit, resetTime: null });
        continue;
      }

      // Try to match reset time like "Resets: 2026-04-07T00:00:00Z" or "Resets in 3d 2h"
      const resetMatch = line.match(/reset[s]?\s*(?:in\s+)?:?\s*(.+)/i);
      if (resetMatch) {
        resetTime = resetMatch[1].trim();
        continue;
      }

      // Try to match session line like "Session: 25 / 100"
      const sessionMatch = line.match(/session:\s*(\d+)\s*\/\s*(\d+)/i);
      if (sessionMatch) {
        sessionUsed = parseInt(sessionMatch[1], 10);
        sessionLimit = parseInt(sessionMatch[2], 10);
      }
    }

    // If we parsed no models, the output wasn't in the expected format
    if (models.length === 0) {
      return null;
    }

    // Apply reset time to all models
    if (resetTime) {
      for (const model of models) {
        model.resetTime = resetTime;
      }
    }

    return {
      models,
      session: { used: sessionUsed, limit: sessionLimit },
    };
  } catch {
    return null;
  }
}

/**
 * Normalize model names to friendly display names.
 */
function normalizeModelName(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('opus')) return 'Opus';
  if (lower.includes('sonnet')) return 'Sonnet';
  if (lower.includes('haiku')) return 'Haiku';
  // Return original with first letter capitalized
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
