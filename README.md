# shy — Shell AI Companion

An AI companion that knows what's happening in your terminal. Shell hooks silently record your activity, and when you need help — shy routes your question through Claude Code, which already knows your projects, files, and tools.

```
$ make deploy
...error: relation "users" does not exist

$ shy what just failed
→ Deploy failed: the "users" table doesn't exist. Run: make db-migrate && make deploy

$ cat error.log | shy explain these errors
→ Connection pool exhausted — 50 idle transactions holding connections. Look for uncommitted BEGIN blocks.

$ shy compress all jpgs in subdirs using parallel
→ find . -name '*.jpg' | parallel -j8 jpegoptim --strip-all
```

## Why shy?

Every AI shell tool makes you choose:

- **Wrap your shell** (fragile, breaks vim/htop) — Butterfish, Warp
- **Require tmux** (not everyone uses it) — TmuxAI, ShellSage
- **No shell context** (you paste manually) — ChatGPT, AIChat
- **AI bolted onto something else** (history tool, not a companion) — Atuin

shy is different: **hooks record everything, Claude Code is the brain, shy is the glue**.

## How It Works

```
┌─────────────┐  preexec/precmd   ┌────────────────┐
│  Your Shell  │ ────────────────▸ │  history.log   │
│  (zsh/bash/  │                   │  (append-only)  │
│   fish/any)  │                   └───────┬────────┘
└─────────────┘                            │
                                           │ MCP server
$ shy why did it fail                      │ (reads on demand)
       │                                   │
       ▼                                   ▼
┌─────────────┐                   ┌─────────────────┐
│   shy CLI    │──── prompt ─────▸│   Claude Code    │
│  (thin)      │◂─── response ───│   (the brain)    │
└─────────────┘                   └─────────────────┘
```

1. **Shell hooks** append every command, exit code, and cwd to a log file. Lightweight, fire-and-forget.
2. **shy MCP server** exposes shell history to Claude Code as structured resources — history is only read when needed, not streamed.
3. **shy CLI** forwards your prompt to Claude Code, which combines shell context (via MCP) with project context (files, git, tools) and responds.

The key insight: shy doesn't need its own LLM connection. Claude Code already runs, already knows your projects, already has tools. shy just gives it shell awareness.

## Features

- **Terminal-agnostic** — WezTerm, Alacritty, kitty, iTerm2, xterm, anything. No tmux required.
- **No quotes needed** — arguments are always a prompt: `shy why did this fail` not `shy "why did this fail"`.
- **Pipe-friendly** — `cat file | shy explain this` or `shy fix the command | xclip`. Standard Unix citizen.
- **Multi-shell** — native hooks for zsh, bash (via bash-preexec), and fish.
- **Claude Code as brain** — no separate SDK, no daemon, no warm connection to manage. Claude Code handles everything.
- **MCP-native** — shell history exposed as MCP resources. Any MCP-compatible client can use it.
- **Single context** — hooks from all terminal sessions write to the same log. shy sees your complete workflow.
- **Private** — runs locally. Shell history stays on your machine.

## Usage

```bash
# Ask about what just happened
shy why did that fail

# Pipe data for analysis
cat logs/app.log | shy summarize the errors
kubectl get pods | shy which pods are crashing

# Get command suggestions
shy find files larger than 100MB modified this week

# Chain with other tools
shy write a commit message for staged changes | git commit -F -

# Install hooks for your shell
shy install
```

## Install

```bash
shy install          # hooks only: commands, exit codes, cwd, timestamps
shy install --full   # hooks + script(1) wrapper: captures command output too
```

Tier 1 (default) adds lightweight shell hooks — zero overhead, no output capture.
Tier 2 (`--full`) wraps your session in `script(1)` — one PTY layer (same as tmux), captures everything. See [Output Capture](docs/output-capture.md) for the full analysis.

### Claude Code integration

Add shy's MCP server to your Claude Code config (`~/.claude.json`):

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

Claude Code will then have access to your shell history when answering questions.

## Configuration

`~/.config/shy/config.toml`:

```toml
[history]
path = "~/.local/share/shy/history.log"
max_entries = 500        # max recent commands exposed via MCP

[claude-code]
continue_session = true  # reuse existing Claude Code session
```

## Docs

- [Architecture](docs/architecture.md) — components, data flow, design decisions
- [Output Capture](docs/output-capture.md) — how shy captures command output, all approaches compared
- [Competitive Landscape](docs/landscape.md) — how shy compares to existing tools

## Status

🚧 Early development — design phase.

## License

MIT
