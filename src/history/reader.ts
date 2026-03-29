/**
 * Reads and parses ~/.local/share/shy/history.log
 *
 * Log format (one line per event):
 *   <ISO-timestamp> CMD <cwd> <command>
 *   <ISO-timestamp> EXIT <exit-code>
 */

import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const DEFAULT_LOG_PATH = join(
  homedir(),
  '.local/share/shy/history.log'
);

export interface CommandEntry {
  timestamp: string;
  cwd: string;
  command: string;
  exitCode?: number;
}

export function readHistory(
  logPath = DEFAULT_LOG_PATH,
  limit = 100
): CommandEntry[] {
  if (!existsSync(logPath)) return [];

  const lines = readFileSync(logPath, 'utf-8').trim().split('\n').filter(Boolean);
  const entries: CommandEntry[] = [];
  let pending: CommandEntry | null = null;

  for (const line of lines) {
    const cmdMatch = line.match(/^(\S+) CMD (\S+) (.+)$/);
    const exitMatch = line.match(/^(\S+) EXIT (\d+)$/);

    if (cmdMatch) {
      if (pending) entries.push(pending);
      const [, timestamp, cwd, command] = cmdMatch;
      pending = { timestamp, cwd, command };
    } else if (exitMatch && pending) {
      pending.exitCode = parseInt(exitMatch[2], 10);
      entries.push(pending);
      pending = null;
    }
  }

  if (pending) entries.push(pending);

  return entries.slice(-limit);
}

export function getLastCommand(logPath = DEFAULT_LOG_PATH): CommandEntry | null {
  const history = readHistory(logPath, 1);
  return history.length > 0 ? history[history.length - 1] : null;
}

export function getErrors(
  logPath = DEFAULT_LOG_PATH,
  limit = 20
): CommandEntry[] {
  return readHistory(logPath).filter(
    (e) => e.exitCode !== undefined && e.exitCode !== 0
  ).slice(-limit);
}

export function searchHistory(
  pattern: string,
  logPath = DEFAULT_LOG_PATH
): CommandEntry[] {
  const re = new RegExp(pattern, 'i');
  return readHistory(logPath).filter((e) => re.test(e.command));
}
