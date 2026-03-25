# shy — Shell AI Companion

A persistent AI companion that lives in your terminal. Like having a second pair of eyes watching your shell — with its own personality, its own memory, and a single context across all your terminal sessions.

```
$ make deploy && shy "what just failed?"
→ The deploy failed because migrations weren't run. Try: make db-migrate && make deploy

$ cat error.log | shy "explain"
→ Connection pool exhausted — 50 connections held by idle transactions. Check for uncommitted BEGIN blocks.

$ shy "refactor last command to use parallel"
→ find . -name '*.gz' | parallel -j8 gunzip
```

## Why shy?

Every AI coding tool either:
- **Wraps your shell** (fragile, breaks workflows) — Butterfish, Warp
- **Requires tmux** (not everyone uses it) — TmuxAI, ShellSage
- **Has no shell context** (you paste manually) — ChatGPT, AIChat
- **Bolts AI onto something else** (history tool, not a companion) — Atuin

shy fills the gap: **a true companion** — one personality, one context across all shells, always watching, instantly available.

## How It Works

```
┌─────────────┐     preexec/precmd hooks      ┌──────────────┐
│  Your Shell  │ ──────────────────────────────▸│  shy daemon  │
│  (zsh/bash/  │                                │  (warm LLM   │
│   fish/any)  │◂─────────────────────────────  │   session)   │
└─────────────┘     shy "question" / pipe       └──────────────┘
```

1. **Shell hooks** (zsh `preexec`/`precmd`, bash via `bash-preexec`, fish events) stream commands + exit codes to the daemon via Unix socket
2. **Daemon** stays running, keeps LLM session warm with full shell context
3. **CLI** (`shy "question"` or `echo data | shy "explain"`) gets instant answers — no cold start

## Features

- **Terminal-agnostic** — works in any terminal: WezTerm, Alacritty, kitty, iTerm2, plain xterm. No tmux required
- **One personality** — define who shy is in `~/.config/shy/claude.md` — its character, expertise, preferences. Your companion, your rules
- **Single context** — one unified context across all terminal sessions. shy sees everything, remembers everything from this session
- **Pipe-friendly** — `cat file | shy "explain"` or `shy "fix this" | pbcopy` — standard Unix citizen
- **Warm session** — no 2-5s cold start on each query, LLM connection stays alive
- **Multi-shell** — hooks for zsh (native), bash (via bash-preexec), fish (events)
- **Private** — runs locally, your shell history never leaves your machine unless you ask

## Install

```bash
# TODO: installation instructions (npm/pip/binary)
shy install   # sets up shell hooks for your current shell
```

## Usage

```bash
# Ask about what just happened
shy "why did that fail?"

# Pipe data for analysis
cat logs/error.log | shy "summarize errors"
kubectl get pods | shy "which pods are failing?"

# Get command suggestions
shy "compress all jpgs in subdirs, parallel"

# Pipe output somewhere
shy "write a git commit message for staged changes" | git commit -F -
```

## Configuration

shy reads `~/.config/shy/config.toml`:

```toml
[llm]
provider = "anthropic"     # anthropic, openai, ollama
model = "sonnet"           # model shorthand

[context]
max_history = 500          # commands to keep in context
personality = "~/.config/shy/claude.md"  # shy's personality and instructions

[daemon]
socket = "/tmp/shy.sock"   # Unix socket path
idle_timeout = "4h"        # shut down after inactivity
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for technical details.

## Landscape

See [docs/landscape.md](docs/landscape.md) for comparison with existing tools.

## Status

🚧 Early development — architecture designed, implementation starting.

## License

MIT
