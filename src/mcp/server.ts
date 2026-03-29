/**
 * shy MCP server — exposes shell history to Claude Code
 *
 * Resources:
 *   shell://history       — recent commands with exit codes, cwd, timestamps
 *   shell://last-command  — the most recent command and its exit code
 *   shell://errors        — recent failed commands (exit code ≠ 0)
 *
 * Tools:
 *   get_shell_history(n)        — last N commands from the log
 *   get_last_command()          — the most recent command
 *   search_history(pattern)     — grep through command history
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  readHistory,
  getLastCommand,
  getErrors,
  searchHistory,
} from '../history/reader.js';

export async function runMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'shy',
    version: '0.1.0',
  });

  // Resources
  server.resource('shell://history', 'Recent shell commands with exit codes', async () => {
    const entries = readHistory(undefined, 100);
    return {
      contents: [
        {
          uri: 'shell://history',
          mimeType: 'text/plain',
          text: entries
            .map((e) =>
              `[${e.timestamp}] ${e.cwd} $ ${e.command}` +
              (e.exitCode !== undefined ? ` (exit ${e.exitCode})` : '')
            )
            .join('\n'),
        },
      ],
    };
  });

  server.resource('shell://last-command', 'The most recent shell command', async () => {
    const entry = getLastCommand();
    return {
      contents: [
        {
          uri: 'shell://last-command',
          mimeType: 'text/plain',
          text: entry
            ? `[${entry.timestamp}] ${entry.cwd} $ ${entry.command}` +
              (entry.exitCode !== undefined ? ` (exit ${entry.exitCode})` : '')
            : '(no commands recorded yet)',
        },
      ],
    };
  });

  server.resource('shell://errors', 'Recent failed shell commands', async () => {
    const entries = getErrors(undefined, 20);
    return {
      contents: [
        {
          uri: 'shell://errors',
          mimeType: 'text/plain',
          text: entries.length > 0
            ? entries
                .map((e) =>
                  `[${e.timestamp}] ${e.cwd} $ ${e.command} (exit ${e.exitCode})`
                )
                .join('\n')
            : '(no failed commands)',
        },
      ],
    };
  });

  // Tools
  server.tool(
    'get_shell_history',
    'Get the last N shell commands from the log',
    { n: z.number().int().positive().default(50) },
    async ({ n }) => {
      const entries = readHistory(undefined, n);
      return {
        content: [
          {
            type: 'text',
            text: entries
              .map((e) =>
                `[${e.timestamp}] ${e.cwd} $ ${e.command}` +
                (e.exitCode !== undefined ? ` (exit ${e.exitCode})` : '')
              )
              .join('\n') || '(no commands recorded yet)',
          },
        ],
      };
    }
  );

  server.tool(
    'get_last_command',
    'Get the most recent shell command',
    {},
    async () => {
      const entry = getLastCommand();
      return {
        content: [
          {
            type: 'text',
            text: entry
              ? `[${entry.timestamp}] ${entry.cwd} $ ${entry.command}` +
                (entry.exitCode !== undefined ? ` (exit ${entry.exitCode})` : '')
              : '(no commands recorded yet)',
          },
        ],
      };
    }
  );

  server.tool(
    'search_history',
    'Search shell history for commands matching a pattern',
    { pattern: z.string() },
    async ({ pattern }) => {
      const entries = searchHistory(pattern);
      return {
        content: [
          {
            type: 'text',
            text: entries
              .map((e) =>
                `[${e.timestamp}] ${e.cwd} $ ${e.command}` +
                (e.exitCode !== undefined ? ` (exit ${e.exitCode})` : '')
              )
              .join('\n') || `(no commands matching "${pattern}")`,
          },
        ],
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
