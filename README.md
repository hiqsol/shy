# shy — Shell AI Companion

A persistent AI companion that lives in your terminal. It watches your shell activity, maintains a single context across all sessions, and responds instantly when you need help — no cold start, no copy-pasting, no tmux required.

```
$ make deploy && shy "what just failed?"
→ Deploy failed: migrations not applied. Run: make db-migrate && make deploy

$ cat error.log | shy "explain"
→ Connection pool exhausted — 50 idle transactions holding connections. Look for uncommitted BEGIN blocks.

$ shy "compress all jpgs in subdirs, parallel"
→ find . -name '*.jpg' | parallel -j8 jpegoptim --strip-all
```

## Why shy?

Every AI shell tool makes you choose:

- **Wrap your shell** (fragile, breaks vim/htop) — Butterfish, Warp
- **Require tmux** (not everyone uses it) — TmuxAI, ShellSage
- **No shell context** (you paste manually) — ChatGPT, AIChat
- **AI bolted onto something else** (history tool, not a companion) — Atuin

shy is different: **one companion, one context, all your shells, any terminal**.

## How It Works

```
┌─────────────┐     preexec/precmd hooks      ┌──────────────┐
│  Your Shell  │ ─────────────────────────────▸│  shy daemon  │
│  (zsh/bash/  │                               │  (warm LLM   │
│   fish/any)  │◂─────────────────────────────  │   session)   │
└─────────────┘     shy "question" / pipe      └──────────────┘
```

1. **Shell hooks** stream every command and exit code to the daemon via Unix socket. Lightweight, fire-and-forget — if the daemon isn't running, nothing happens.
2. **Daemon** stays resident, keeps an LLM session warm, and maintains a unified picture of your activity across all terminals.
3. **CLI** sends your question to the daemon and streams the response back. No cold start — the LLM already knows what you've been doing.

## Features

- **Terminal-agnostic** — WezTerm, Alacritty, kitty, iTerm2, xterm, anything. No tmux required.
- **Own personality** — shy has its own instruction file (`~/.config/shy/shy.md`). Define its expertise, tone, and behavior. Your companion, your rules.
- **Single context** — all terminal sessions feed into one daemon. Open three terminals? shy sees them all as one continuous workflow.
- **Pipe-friendly** — `cat file | shy "explain"` or `shy "fix" | xclip`. Standard Unix citizen.
- **Warm session** — daemon keeps the LLM connection alive. No 2–5s startup on each query.
- **Multi-shell** — native hooks for zsh, bash (via bash-preexec), and fish.
- **Private** — runs locally. Shell history stays on your machine.

## Usage

```bash
# Ask about what just happened
shy "why did that fail?"

# Pipe data for analysis
cat logs/app.log | shy "summarize the errors"
kubectl get pods | shy "which pods are crashing?"

# Get command suggestions
shy "find files larger than 100MB modified this week"

# Chain with other tools
shy "write a commit message for staged changes" | git commit -F -
```

## Configuration

`~/.config/shy/config.toml`:

```toml
[llm]
provider = "anthropic"     # anthropic, openai, ollama
model = "sonnet"           # model shorthand

[context]
max_history = 500          # commands to keep in rolling buffer
personality = "~/.config/shy/shy.md"

[daemon]
socket = "/tmp/shy.sock"
idle_timeout = "4h"        # auto-stop after inactivity
```

## Personality File

`~/.config/shy/shy.md` defines who shy is — like a system prompt that persists:

```markdown
You are a senior DevOps engineer. Be concise — one-liners when possible,
longer explanations only when asked. Prefer standard coreutils over
installing new tools. When suggesting commands, always explain flags.
```

This file is loaded once when the daemon starts. Change it and restart the daemon to update.

## Install

```bash
# Coming soon
shy install    # detects your shell, installs hooks
shy daemon start
```

## Docs

- [Architecture](docs/architecture.md) — components, data flow, design decisions
- [Competitive Landscape](docs/landscape.md) — how shy compares to existing tools

## Status

🚧 Early development — design phase.

## License

MIT
