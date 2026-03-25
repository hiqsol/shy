# Architecture

## Components

### 1. Shell Hooks

Lightweight hooks injected into the user's shell that stream activity to the daemon.

**Zsh** — native `preexec` / `precmd`:
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

Hooks are fire-and-forget — if the daemon isn't running, the `socat` call fails silently with no impact on shell performance.

### 2. Daemon

Long-running process that:
- Listens on a Unix socket for hook events and CLI queries
- Maintains a rolling buffer of shell activity (commands, exit codes, timestamps, cwd)
- Keeps an LLM session warm (persistent connection, conversation context)
- Reads project context files (CLAUDE.md) when cwd changes
- Handles concurrent queries from multiple shell sessions

**Lifecycle:**
```
shy daemon start     # starts in background, writes PID to /tmp/shy.pid
shy daemon stop      # graceful shutdown
shy daemon status    # check if running
```

Auto-starts on first `shy` invocation if not running. Auto-stops after configurable idle timeout (default 4h).

### 3. CLI

The user-facing command. Thin client that sends queries to the daemon via Unix socket.

```
shy "question"              # ask about shell context
echo data | shy "prompt"    # pipe + question
shy --no-context "prompt"   # skip shell history, just LLM
shy install                 # set up hooks for current shell
shy daemon start|stop|status
```

**Response streaming:** daemon streams tokens back over the socket, CLI prints them as they arrive — feels instant.

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

## Language Choice

Node.js/TypeScript preferred:
- Anthropic SDK is first-class
- Unix socket support built-in (`net` module)
- Streaming is natural (async iterators)
- Single binary via `pkg` or `bun build --compile`

Python is the alternative — equally good SDK support, but daemon management and binary distribution are harder.

## Key Design Decisions

**Unix socket over HTTP:** Lower latency, no port conflicts, natural access control (file permissions). Falls back gracefully — if socket doesn't exist, daemon isn't running.

**Ring buffer for context:** Fixed-size (default 500 commands). Old commands fall off naturally. No unbounded memory growth. Serialized to disk on shutdown, restored on start.

**No shell wrapping:** shy never interposes on your shell's stdin/stdout. Hooks are append-only observers. This avoids the fragility of tools like Butterfish that wrap the entire shell process.

**CLAUDE.md awareness:** When the daemon detects a cwd change (from hook data), it checks for CLAUDE.md / .claude.md and includes project context in the next LLM query. This gives project-specific answers without manual configuration.

**Multi-session support:** Multiple terminals can connect to the same daemon. Each gets its own activity stream but shares the LLM session. Useful for users with tiled terminal setups.
