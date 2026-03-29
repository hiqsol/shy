#!/usr/bin/env node
/**
 * shy — Shell AI Companion
 *
 * Routes subcommands to the appropriate handler:
 *   shy mcp-server   — start MCP server (stdio transport, for Claude Code)
 *   shy install      — install shell hooks
 *   shy <prompt>     — forward prompt to Claude Code with shell context
 */

import { runMcpServer } from './mcp/server.js';
import { install } from './cli/install.js';
import { runPrompt } from './cli/prompt.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: shy <prompt> | shy mcp-server | shy install [--full]');
    process.exit(1);
  }

  const [subcommand, ...rest] = args;

  switch (subcommand) {
    case 'mcp-server':
      await runMcpServer();
      break;

    case 'install':
      await install(rest);
      break;

    default:
      // Everything else is a prompt
      await runPrompt(args);
      break;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
