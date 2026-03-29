/**
 * shy <prompt> — forward prompt to Claude Code with shell context
 *
 * Reads piped stdin (if present), prepends recent shell context,
 * and delegates to `claude -p --continue`.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { readHistory } from '../history/reader.js';

function readStdin(): string {
  // Only read stdin if it is not a TTY (i.e. data was piped)
  if (process.stdin.isTTY) return '';
  try {
    return readFileSync('/dev/stdin', 'utf-8');
  } catch {
    return '';
  }
}

function buildContext(): string {
  const entries = readHistory(undefined, 20);
  if (entries.length === 0) return '';

  const lines = entries
    .map((e) =>
      `${e.cwd} $ ${e.command}` +
      (e.exitCode !== undefined ? `  # exit ${e.exitCode}` : '')
    )
    .join('\n');

  return `Recent shell history:\n${lines}\n\n`;
}

// TODO: implement full routing to claude -p --continue
export async function runPrompt(args: string[]): Promise<void> {
  const userPrompt = args.join(' ');
  const piped = readStdin();
  const context = buildContext();

  const fullPrompt = [
    context,
    piped ? `Piped input:\n${piped}\n\n` : '',
    userPrompt,
  ]
    .filter(Boolean)
    .join('');

  // Placeholder: print the composed prompt until claude routing is implemented
  console.log('[shy] Would send to Claude Code:');
  console.log(fullPrompt);

  // Real implementation:
  // execFileSync('claude', ['-p', '--continue', fullPrompt], { stdio: 'inherit' });
}
