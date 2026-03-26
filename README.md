# shy — Shell AI Companion

An AI companion that knows what's happening in your terminal. Shell hooks silently record your activity, and a warm daemon responds instantly when you need help — no cold start, no copy-pasting.

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

shy is different: **hooks record everything, a warm daemon answers instantly, any terminal**.

## How It Works

```
┌─────────────┐  preexec/precmd   ┌────────────┐
│  Your Shell  │ ────────────────▸ │  Log File  │
│  (zsh/bash/  │                   │  (~/.local/ │
│   fish/any)  │                   │  share/shy) │
└─────────────┘                    └─────┬──────┘
                                         │
$ shy why did it fail                    │
       │                                 │
       ▼                                 │
┌─────────────┐  reads history     ┌─────┘
│ shy daemon  │◂───────────────────┘
│ (warm SDK   │
│  session)   │──▸ streamed response to stdout
└─────────────┘
```

1. **Shell hooks** append every command and exit code to a log file. Lightweight, fire-and-forget — no data goes to the LLM until you ask.
2. **Daemon** stays resident with a warm Claude SDK connection and your personality loaded. No shell data flows into it until needed.
3. When you run `shy <prompt>`, the daemon reads as much history as it needs from the log, combines it with your question, and streams the response.

The key insight: shell activity is *recorded* continuously but only *sent to Claude* on demand. No wasted tokens on commands you never ask about.

## Features

- **Terminal-agnostic** — WezTerm, Alacritty, kitty, iTerm2, xterm, anything. No tmux required.
- **Instant response** — daemon keeps Claude connection warm. No 2–5s cold start per query.
- **Own personality** — shy has its own instruction file (`~/.config/shy/shy.md`). Define its expertise, tone, and behavior.
- **Single context** — hooks from all terminal sessions write to the same log. shy sees your complete workflow.
- **No quotes needed** — arguments are always a prompt: `shy why did this fail` not `shy "why did this fail"`.
- **Pipe-friendly** — `cat file | shy explain this` or `shy fix the command | xclip`. Standard Unix citizen.
- **Multi-shell** — native hooks for zsh, bash (via bash-preexec), and fish.
- **Private** — runs locally. Shell history stays on your machine.
- **Claude-powered** — uses the Anthropic SDK directly. One provider, done right.

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

# Manage the daemon
shy daemon start|stop|status

# Install hooks for your shell
shy install
```

## Configuration

`~/.config/shy/config.toml`:

```toml
[claude]
model = "sonnet"           # claude model shorthand

[context]
max_history = 500          # max recent commands to include per query
personality = "~/.config/shy/shy.md"

[daemon]
socket = "/tmp/shy.sock"
idle_timeout = "4h"        # auto-stop after inactivity

[history]
path = "~/.local/share/shy/history.log"
```

## Personality File

`~/.config/shy/shy.md` defines who shy is:

```markdown
You are a senior DevOps engineer. Be concise — one-liners when possible,
longer explanations only when asked. Prefer standard coreutils over
installing new tools. When suggesting commands, always explain flags.
```

## Install

```bash
shy install          # hooks only: commands, exit codes, cwd, timestamps
shy install --full   # hooks + script(1) wrapper: captures command output too
```

Tier 1 (default) adds lightweight shell hooks — zero overhead, no output capture.
Tier 2 (`--full`) wraps your session in `script(1)` — one PTY layer (same as tmux), captures everything. See [Output Capture](docs/output-capture.md) for the full analysis.

Auto-starts the daemon on first `shy` query. Requires `ANTHROPIC_API_KEY` or key in config.

## Docs

- [Architecture](docs/architecture.md) — components, data flow, design decisions
- [Output Capture](docs/output-capture.md) — how shy captures command output, all approaches compared
- [Competitive Landscape](docs/landscape.md) — how shy compares to existing tools

## Status

🚧 Early development — design phase.

## License

MIT
