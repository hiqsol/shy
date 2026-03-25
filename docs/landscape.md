# Competitive Landscape

## Direct Competitors

### TmuxAI
- **What:** AI assistant that reads tmux pane content
- **How:** Captures visible terminal via `tmux capture-pane`, sends to LLM
- **Pros:** Works well within tmux, sees command output
- **Cons:** Tmux-only (no standalone terminal support), captures visible text only (not full history), no daemon (cold start each query)
- **Gap shy fills:** Terminal-agnostic, persistent daemon, full command history not just visible pane

### ShellSage
- **What:** ~150 lines of Python, reads tmux pane for AI context
- **How:** Similar to TmuxAI — `tmux capture-pane` → LLM
- **Pros:** Minimal, easy to understand
- **Cons:** Tmux-only, no persistence, no daemon, very basic
- **Gap shy fills:** Everything — ShellSage is a proof of concept, shy is a full tool

### Butterfish
- **What:** Shell wrapper that interposes on terminal I/O
- **How:** Wraps your shell process, intercepts stdin/stdout
- **Pros:** Sees everything including command output
- **Cons:** Fragile — breaks on complex TUI apps (vim, htop), adds latency to every keystroke, shell wrapping is fundamentally unreliable
- **Gap shy fills:** Non-invasive hooks instead of wrapping, no impact on shell performance

### Atuin
- **What:** Shell history tool with sync, search, and AI features
- **How:** Replaces shell history with SQLite database, adds AI query on top
- **Pros:** Excellent history management, cross-machine sync, nice TUI
- **Cons:** AI is a bolt-on feature (not the core), no persistent session, no streaming context, focused on history search not AI assistance
- **Gap shy fills:** AI-first design, persistent warm session, real-time context streaming

## Adjacent Tools (not direct competitors)

### AIChat
- **What:** CLI chat interface for multiple LLM providers
- **How:** Standalone REPL or pipe interface for LLM queries
- **Pros:** Multi-provider, good pipe support, roles/sessions
- **Cons:** No shell awareness at all — doesn't know what commands you're running
- **Gap shy fills:** Shell context awareness via hooks

### Warp
- **What:** AI-native terminal emulator
- **How:** Custom terminal with built-in AI, block-based command grouping
- **Pros:** Deep integration, sees command output natively
- **Cons:** Proprietary terminal — must abandon your current terminal, macOS-focused, not open source
- **Gap shy fills:** Works with any terminal, open source

### GitHub Copilot CLI / Amazon Q CLI
- **What:** AI command suggestion tools
- **How:** Standalone commands (`gh copilot suggest`, `q chat`)
- **Pros:** Good for command generation
- **Cons:** No persistent context, no shell history awareness, cold start each time
- **Gap shy fills:** Persistent context, warm session, knows your full session history

### Aider
- **What:** AI pair programming in the terminal
- **How:** Git-aware coding assistant, works with files
- **Pros:** Excellent for code editing, git integration
- **Cons:** Code-focused, not shell-focused. Doesn't help with command-line workflows, devops, log analysis
- **Gap shy fills:** Shell workflow focus vs code editing focus

## shy's Unique Position

No existing tool combines all of:
1. **Terminal-agnostic** — works in any terminal emulator
2. **Persistent daemon** — warm LLM session, no cold start
3. **Shell hooks** — non-invasive, fire-and-forget activity streaming
4. **CLAUDE.md support** — project-aware context
5. **Pipe-friendly** — standard Unix I/O citizen
6. **Multi-shell** — zsh, bash, fish with native hooks for each

The closest gap in the market is between TmuxAI (shell-aware but tmux-only) and AIChat (terminal-agnostic but shell-unaware). shy bridges both.
