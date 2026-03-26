# Output Capture

Capturing command output reliably without harming the shell is the hardest problem shy solves. This document compares every known approach and explains the chosen solution.

## The Problem

Shell hooks (`preexec`/`precmd`) can capture:
- ✅ Command text (`make deploy`)
- ✅ Exit code (`1`)
- ✅ Working directory (`/home/user/project`)
- ✅ Timestamp
- ❌ Command output (stdout/stderr)

Without output, shy knows *what* you ran and *whether* it failed, but not *why*. That's the difference between "your deploy failed" and "your deploy failed because the users table doesn't exist."

## Approaches Compared

### 1. `preexec`/`precmd` hooks only

How it works: Shell fires a function before (`preexec`) and after (`precmd`) each command. We log the command text, cwd, and `$?` exit code.

```
✅ Reliable — native shell mechanism, used by Atuin, iTerm2, Ghostty
✅ Zero overhead — one `echo >>` per command
✅ Terminal-agnostic — works in any terminal
✅ Non-invasive — no process wrapping, no PTY, no fd redirection
❌ No output — only metadata
```

**Verdict:** Perfect for commands + exit codes. Not enough on its own.

### 2. `exec > >(tee ...)` redirection

How it works: In `precmd`, redirect shell stdout through `tee` into a log file using `exec > >(tee /tmp/output)`.

```
⚠️  Unreliable — 70-80% failure rate in zsh (Cline project measured this)
⚠️  Stdout only — stderr needs separate handling
❌ Masks exit codes — tee returns 0 regardless of command status
❌ Breaks interactive programs — fd redirection confuses curses/readline
❌ Race conditions — process substitution timing is unpredictable
```

**Verdict:** Not viable. Too fragile for production use.

Sources:
- [Cline terminal capture failures](https://github.com/cline/cline/issues/4313) — "zsh is basically unusable, fails 70-80%"
- [VSCode + Zsh issues](https://github.com/microsoft/vscode/issues/254790) — commands run but extensions get no output
- [Oh My Zsh tee discussion](https://github.com/ohmyzsh/ohmyzsh/discussions/12095) — exit code masking with tee

### 3. OSC 133 terminal protocol

How it works: Modern terminals (kitty, Ghostty, WezTerm, iTerm2) support [semantic shell integration](https://sw.kovidgoyal.net/kitty/shell-integration/) via escape sequences that mark prompt boundaries:

```
OSC 133;A — start of prompt
OSC 133;B — start of command
OSC 133;C — start of command output
OSC 133;D;exitcode — end of output
```

The terminal knows exactly where each command's output begins and ends.

```
✅ Reliable — terminal-native, well-tested
✅ Full output — terminal has the complete scrollback
✅ Non-invasive — just escape sequences in the prompt
❌ Terminal-dependent — only kitty, Ghostty, WezTerm, iTerm2
❌ No API for external tools — output lives in terminal scrollback, no standard way to query it programmatically
❌ Excludes xterm, Alacritty (no OSC 133), and SSH sessions
```

**Verdict:** Great technology, wrong constraint. shy must be terminal-agnostic.

### 4. tmux `capture-pane`

How it works: tmux stores pane content in a buffer. `tmux capture-pane -p` dumps it. Combined with preexec/precmd markers, you can extract specific command output.

```
✅ Reliable — tmux is battle-tested
✅ Full output — captures everything visible in the pane
❌ Requires tmux — not everyone uses it
❌ Scrollback limits — large outputs get truncated
❌ Multi-pane confusion — need to track which pane ran which command
```

Sources:
- [zsh-tmux-capture plugin](https://github.com/kevinhwang91/zsh-tmux-capture)

**Verdict:** Good if you already use tmux. Not universal.

### 5. eBPF kernel tracing

How it works: Attach eBPF probes to kernel syscalls (`execve`, `write`) to monitor all shell activity system-wide.

```
✅ Captures everything — commands, output, even background processes
✅ No shell modification — kernel-level observation
❌ Requires root / CAP_BPF — not available to regular users
❌ Massive data volume — captures ALL processes, not just your shell
❌ Complex filtering — need to associate PIDs with TTYs
❌ Overkill — monitoring infrastructure for a shell companion
```

Sources:
- [Monitor commands with eBPF](https://nvd.codes/post/monitor-any-command-typed-at-a-shell-with-ebpf/)

**Verdict:** Wrong tool for the job. Built for security monitoring, not shell companions.

### 6. Explicit piping

How it works: User manually pipes output to shy: `make deploy 2>&1 | shy what failed`.

```
✅ Always works — standard Unix
✅ Zero setup — no hooks, no daemon
✅ User controls what shy sees
❌ Manual — user must remember to pipe
❌ After-the-fact only with copy-paste
```

**Verdict:** Always available as a fallback. Not automatic.

### 7. `script(1)` session wrapper ← chosen approach

How it works: The classic Unix `script` command (part of util-linux, pre-installed everywhere) creates a pseudo-terminal and logs all I/O to a file. Run `script -q logfile` and everything inside that session — input, output, escape sequences — gets recorded.

```
✅ Captures everything — stdout, stderr, interactive programs, colors
✅ Battle-tested — exists since V7 Unix (1979), part of util-linux
✅ Terminal-agnostic — works in any terminal, any multiplexer
✅ Pre-installed — available on every Linux/macOS system
✅ Transparent — programs can't tell they're inside script
✅ Handles interactive programs — vim, htop, ssh all work normally
⚠️  Adds one PTY layer — same overhead as running inside tmux/screen
⚠️  Raw log includes escape sequences — needs parsing to extract clean text
⚠️  Optional — not everyone wants full capture
```

**Verdict:** The only approach that is reliable, universal, and captures full output.

## Chosen Design: Two Tiers

### Tier 1: Lightweight (default)

`shy install` adds preexec/precmd hooks to your shell.

Captures: command text, exit code, working directory, timestamp, duration.

No output capture. No PTY. Zero overhead. Works everywhere.

### Tier 2: Full capture (opt-in)

`shy install --full` additionally wraps your shell session in `script`.

Captures: everything from Tier 1 + complete terminal output.

Adds one PTY layer (same as tmux/screen). User explicitly opts in.

### How Tier 2 works

On shell startup (via `.zshrc` / `.bashrc`), if full capture is enabled:

```bash
# Only wrap once (don't nest)
if [ -z "$SHY_RECORDING" ]; then
    export SHY_RECORDING=1
    exec script -q -f "$HOME/.local/share/shy/output.log" /bin/zsh
fi
```

This replaces the current shell with a `script`-wrapped session. The `-q` flag suppresses `script`'s own messages. The `-f` flag flushes after each write (important for real-time reading by the daemon).

The result:
- `~/.local/share/shy/history.log` — structured command log (from hooks)
- `~/.local/share/shy/output.log` — raw terminal output (from `script`)

The daemon correlates both: it reads the structured log to find which commands ran, then reads the output log to find what they produced.

### Parsing `script` output

`script` records raw terminal I/O including ANSI escape sequences. To extract clean text:

1. Strip ANSI escapes: `sed 's/\x1b\[[0-9;]*[a-zA-Z]//g'`
2. Or use a terminal emulator library to replay the stream
3. The daemon can do this on demand — only parse output when the user asks about a specific command

The raw log also preserves timing information when using `script --timing`. This lets shy know exactly when each byte was written, enabling precise correlation with the command log.

### Log rotation

Both log files need rotation to avoid unbounded growth:

- **history.log**: append-only text, ~100 bytes per command. At 500 commands/day, that's ~50KB/day. Rotate weekly.
- **output.log**: raw terminal stream, varies wildly. A `cat` of a large file could produce megabytes. Rotate daily or cap at a configurable size (default: 50MB).

The daemon handles rotation — it truncates logs on startup and periodically checks size.

## Summary

| | Tier 1 (lightweight) | Tier 2 (full) |
|---|---|---|
| Install | `shy install` | `shy install --full` |
| Commands | ✅ | ✅ |
| Exit codes | ✅ | ✅ |
| Output | ❌ | ✅ |
| Overhead | Zero | One PTY layer |
| Dependencies | None | `script` (pre-installed) |
| Interactive programs | No effect | Work normally |
| Explicit pipe | Always available | Always available |
