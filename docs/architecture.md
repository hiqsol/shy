# Architecture

shy has three components: shell hooks, a daemon, and a CLI.

## Shell Hooks

Minimal hooks injected into the user's shell. They stream commands and exit codes to the daemon via Unix socket.

**Zsh** — native `preexec`/`precmd`:
```zsh
shy_preexec()  { echo "CMD:$1" | socat - UNIX-CONNECT:/tmp/shy.sock 2>/dev/null; }
shy_precmd()   { echo "EXIT:$?" | socat - UNIX-CONNECT:/tmp/shy.sock 2>/dev/null; }
add-zsh-hook preexec shy_preexec
add-zsh-hook precmd shy_precmd
```

**Bash** — via [bash-preexec](https://github.com/rcaloras/bash-preexec):
```bash
preexec()  { echo "CMD:$1" | socat - UNIX-CONNECT:/tmp/shy.sock 2>/dev/null; }
precmd()   { echo "EXIT:$?" | socat - UNIX-CONNECT:/tmp/shy.sock 2>/dev/null; }
```

**Fish** — native events:
```fish
function shy_preexec --on-event fish_preexec
    echo "CMD:$argv" | socat - UNIX-CONNECT:/tmp/shy.sock 2>/dev/null
end
function shy_postexec --on-event fish_postexec
    echo "EXIT:$status" | socat - UNIX-CONNECT:/tmp/shy.sock 2>/dev/null
end
```

Hooks are fire-and-forget. If the daemon isn't running, `socat` fails silently — zero impact on shell performance.

## Daemon

Long-running background process. Responsibilities:

- Listen on a Unix socket for hook events and CLI queries
- Maintain a rolling buffer of shell activity (commands, exit codes, timestamps, cwd)
- Keep an LLM session warm (persistent connection, conversation history)
- Load the personality file (`~/.config/shy/shy.md`) on startup
- Handle input from multiple concurrent shell sessions

**Lifecycle:**
```
shy daemon start     # background, writes PID to /tmp/shy.pid
shy daemon stop      # graceful shutdown, saves context to disk
shy daemon status    # running? PID? uptime?
```

Auto-starts on first `shy` query if not already running. Auto-stops after configurable idle timeout (default 4h).

## CLI

Thin client. Connects to the daemon socket, sends a query, streams the response to stdout.

```
shy "question"                # ask with full shell context
echo data | shy "prompt"      # pipe + question
shy --no-context "prompt"     # raw LLM query, skip shell history
shy install                   # detect shell, install hooks
shy daemon start|stop|status  # manage daemon
```

Tokens stream back over the socket as they arrive — feels instant.

## Data Flow

```
Shell Hook (preexec)           CLI Query
       │                           │
       ▼                           ▼
   Unix Socket (/tmp/shy.sock)
       │
       ▼
   ┌─────────────────────────────────┐
   │           Daemon                │
   │                                 │
   │  ┌──────────┐  ┌────────────┐  │
   │  │ Activity  │  │ LLM Session│  │
   │  │ Buffer    │──▸│ (warm)     │  │
   │  │ (ring)    │  │            │  │
   │  └──────────┘  └────────────┘  │
   │                      │          │
   └──────────────────────┼──────────┘
                          ▼
                   Streamed Response
                   back to CLI
```

## Design Decisions

**Unix socket over HTTP.** Lower latency, no port conflicts, natural access control via file permissions. If the socket file doesn't exist, the daemon isn't running — clean failure mode.

**Ring buffer for context.** Fixed-size (default 500 entries). Old commands drop off naturally. No unbounded memory growth. Serialized to disk on daemon shutdown, restored on start.

**No shell wrapping.** shy never interposes on stdin/stdout. Hooks are append-only observers. This avoids the fragility of tools like Butterfish that wrap the entire shell process and break on TUI applications.

**Own personality file.** shy loads `~/.config/shy/shy.md` once at startup as the system prompt. It does not scan for or auto-load project-specific instruction files when the working directory changes. One companion, one personality, one context.

**Single unified context.** All terminal sessions — tiled terminals, tmux panes, separate windows — feed into the same daemon and the same LLM conversation. shy maintains one coherent picture of everything happening across your shells.

## Language Choice

TypeScript (Node.js or Bun):
- First-class Anthropic SDK
- Built-in Unix socket support (`net` module)
- Natural streaming via async iterators
- Single binary distribution via `bun build --compile`

Python is an alternative with equally good SDK support, but daemon management and single-binary distribution are more complex.
