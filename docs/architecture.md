# Architecture

shy has three components: shell hooks, an MCP server, and a CLI.

## Shell Hooks

Minimal hooks injected into the user's shell. They append commands and exit codes to a log file.

**Zsh** — native `preexec`/`precmd`:
```zsh
shy_preexec()  { echo "$(date -Iseconds) CMD $PWD $1" >> ~/.local/share/shy/history.log; }
shy_precmd()   { echo "$(date -Iseconds) EXIT $?" >> ~/.local/share/shy/history.log; }
add-zsh-hook preexec shy_preexec
add-zsh-hook precmd shy_precmd
```

**Bash** — via [bash-preexec](https://github.com/rcaloras/bash-preexec):
```bash
preexec()  { echo "$(date -Iseconds) CMD $PWD $1" >> ~/.local/share/shy/history.log; }
precmd()   { echo "$(date -Iseconds) EXIT $?" >> ~/.local/share/shy/history.log; }
```

**Fish** — native events:
```fish
function shy_preexec --on-event fish_preexec
    echo (date -Iseconds)" CMD $PWD $argv" >> ~/.local/share/shy/history.log
end
function shy_postexec --on-event fish_postexec
    echo (date -Iseconds)" EXIT $status" >> ~/.local/share/shy/history.log
end
```

Hooks write to a plain text log file — not to any LLM, not to any daemon. If the log file doesn't exist, the write fails silently. Zero impact on shell performance.

## MCP Server

shy exposes shell history as MCP (Model Context Protocol) resources. Claude Code (or any MCP-compatible client) connects to it.

**Resources exposed:**
- `shell://history` — recent commands with exit codes, cwd, timestamps
- `shell://last-command` — the most recent command and its exit code
- `shell://errors` — recent failed commands (exit code ≠ 0)

**Tools exposed:**
- `get_shell_history(n)` — last N commands from the log
- `get_command_output(timestamp)` — output for a specific command (Tier 2 only, from `script` log)
- `search_history(pattern)` — grep through command history

The MCP server reads the log file on demand — it doesn't accumulate state or maintain an LLM context. Each request is a fresh read.

**Running the server:**
```bash
shy mcp-server          # stdio transport (for Claude Code integration)
```

**Claude Code config** (`~/.claude.json`):
```json
{
  "mcpServers": {
    "shy": {
      "command": "shy",
      "args": ["mcp-server"]
    }
  }
}
```

Once configured, Claude Code automatically has access to your shell history when answering questions — no special prompt needed.

## CLI

Thin client that routes prompts to Claude Code. No SDK, no API keys, no daemon.

```
shy why did it fail           # all args are the prompt, no quotes needed
echo data | shy explain this  # pipe + prompt
shy install                   # detect shell, install hooks
shy mcp-server                # start MCP server (stdio)
```

**How the CLI routes to Claude Code:**

```bash
# Simplified: what shy does internally
claude -p --continue "$(shy mcp-context) $USER_PROMPT"
```

shy prepends recent shell context to the user's prompt and sends it to Claude Code via `claude -p --continue`. The `--continue` flag reuses the existing Claude Code session, preserving project context.

If piped data is present (`echo data | shy explain`), it's included in the prompt as well.

## Data Flow

```
┌─────────────┐                    ┌────────────────┐
│  Shell Hook  │───write──────────▸│  history.log   │
│  (preexec)   │                   │  (append-only)  │
└─────────────┘                    └───────┬────────┘
                                           │
                                    ┌──────┴───────┐
                                    │  MCP Server   │
                                    │  (reads log)  │
                                    └──────┬───────┘
                                           │
shy why did it fail                        │
       │                                   │
       ▼                                   ▼
┌──────────────────────────────────────────────┐
│              Claude Code                      │
│                                               │
│  ┌────────────┐     ┌─────────────────────┐  │
│  │ Project     │     │  shy MCP resources  │  │
│  │ context     │────▸│  + user prompt      │  │
│  │ (CLAUDE.md, │     │                     │  │
│  │  files,git) │     │  ──▸ response       │  │
│  └────────────┘     └─────────────────────┘  │
└───────────────────────────┬──────────────────┘
                            ▼
                     Response to stdout
```

## Design Decisions

**Claude Code is the brain.** shy doesn't need its own LLM connection, API keys, or daemon. Claude Code already runs on the user's machine, already knows the project context (files, git history, CLAUDE.md), already has tools (Bash, file editing, web search). shy just gives it shell awareness via MCP.

**MCP for integration.** The Model Context Protocol is the standard way to extend Claude Code with new capabilities. By exposing shell history as MCP resources, shy integrates cleanly without custom protocols. Any MCP-compatible client benefits — not just Claude Code.

**Hooks write to file, not to an LLM.** Shell activity is recorded continuously but only sent to Claude on demand. This means: no wasted tokens, no context pollution, and hooks work even when Claude Code isn't running.

**No daemon.** The previous architecture had a daemon to keep an LLM session warm. With Claude Code as the brain, this is unnecessary — Claude Code manages its own sessions. shy is stateless.

**Plain text log file.** Append-only, one line per event, human-readable. Easy to inspect (`tail -f`), easy to rotate, no database dependency. Format: `<ISO-timestamp> CMD|EXIT <data>`.

**No quotes on arguments.** Everything after `shy` is the prompt. `shy why did this fail` works — no need for `shy "why did this fail"`. Shell glob/expansion edge cases are handled by treating argv as-is.

**Single log across all shells.** All terminal sessions — tiled terminals, tmux panes, separate windows — write to the same log file. Via MCP, Claude Code sees the complete picture across all shells.

**Two-tier capture.** Tier 1 (hooks only) is zero-overhead and captures commands. Tier 2 (`script(1)` wrapper) captures full output for users who want it. See [Output Capture](docs/output-capture.md).

## Language Choice

TypeScript (Bun preferred):
- First-class MCP SDK (`@modelcontextprotocol/sdk`)
- Built-in Unix socket support
- Natural streaming via async iterators
- Single binary distribution via `bun build --compile`

## What shy is NOT

- **Not a terminal emulator** — shy doesn't replace your terminal (unlike Warp)
- **Not a shell wrapper** — shy doesn't wrap or intercept your shell (unlike Butterfish)
- **Not an LLM client** — shy doesn't call Claude directly. Claude Code does.
- **Not a daemon** — shy is stateless. Start it, use it, done.
