# Architecture

shy has three components: shell hooks, a daemon, and a CLI.

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

Hooks write to a plain text log file — not to the daemon, not to an LLM. If the log file or directory doesn't exist, the write fails silently. Zero impact on shell performance.

## Daemon

Long-running background process with one job: keep a Claude SDK session warm and ready.

**What the daemon does:**
- Maintains a warm connection to the Claude API (no cold start on queries)
- Loads the personality file (`~/.config/shy/shy.md`) on startup
- Listens on a Unix socket for queries from the CLI
- On each query: reads relevant history from the log file, builds a prompt, sends to Claude, streams response back

**What the daemon does NOT do:**
- Does not receive shell activity from hooks (hooks write to a file, not the daemon)
- Does not keep shell history in LLM context between queries (only loads what's needed per query)
- Does not waste tokens on commands you never ask about

**Lifecycle:**
```
shy daemon start     # background, writes PID to /tmp/shy.pid
shy daemon stop      # graceful shutdown
shy daemon status    # running? PID? uptime?
```

Auto-starts on first `shy` query if not already running. Auto-stops after configurable idle timeout (default 4h).

## CLI

Thin client. Sends the user's prompt to the daemon via Unix socket, streams the response to stdout.

```
shy why did it fail           # all args are the prompt, no quotes needed
echo data | shy explain this  # pipe + prompt
shy daemon start|stop|status  # manage daemon
shy install                   # detect shell, install hooks
```

## Data Flow

```
┌─────────────┐                    ┌────────────────┐
│  Shell Hook  │───write──────────▸│  history.log   │
│  (preexec)   │                   │  (append-only)  │
└─────────────┘                    └───────┬────────┘
                                           │
shy why did it fail                        │ read on demand
       │                                   │
       ▼                                   ▼
┌──────────────────────────────────────────────┐
│                  Daemon                       │
│                                               │
│  ┌────────────┐     ┌─────────────────────┐  │
│  │ Personality │     │ Claude SDK (warm)   │  │
│  │ (shy.md)    │────▸│                     │  │
│  └────────────┘     │ history + prompt ──▸ │  │
│                      │ ◂── streamed tokens │  │
│                      └─────────────────────┘  │
└───────────────────────────┬──────────────────┘
                            ▼
                     Streamed Response
                     back to CLI → stdout
```

## Design Decisions

**Hooks write to file, not daemon.** Shell activity is recorded continuously but only sent to Claude on demand. This means: no wasted tokens, no context pollution, and hooks work even when the daemon is stopped.

**Daemon is a warm connection, not a context store.** The daemon's value is eliminating cold start latency. It doesn't accumulate shell history in the LLM conversation — each query builds its own context from the log file. This keeps token usage predictable.

**Unix socket for CLI↔daemon.** Lower latency than HTTP, no port conflicts, natural access control via file permissions. If the socket doesn't exist, the daemon isn't running — clean failure mode.

**Plain text log file.** Append-only, one line per event, human-readable. Easy to inspect (`tail -f`), easy to rotate, no database dependency. Format: `<ISO-timestamp> CMD|EXIT <data>`.

**No quotes on arguments.** Everything after `shy` is the prompt. `shy why did this fail` works — no need for `shy "why did this fail"`. Shell glob/expansion edge cases are handled by treating argv as-is.

**Own personality file.** shy loads `~/.config/shy/shy.md` as the system prompt. One companion, one personality. Does not auto-load per-project instruction files.

**Single log across all shells.** All terminal sessions — tiled terminals, tmux panes, separate windows — write to the same log file. When shy reads history, it sees the complete picture of what's happening across all shells.

**Claude SDK only.** Uses the Anthropic SDK directly. No abstraction layer for multiple providers — one integration, done right.

## Language Choice

TypeScript (Bun preferred):
- First-class Anthropic SDK
- Built-in Unix socket support
- Natural streaming via async iterators
- Single binary distribution via `bun build --compile`
