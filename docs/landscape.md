# Competitive Landscape

## Direct Competitors

### TmuxAI
- **What:** AI assistant that reads tmux pane content
- **How:** `tmux capture-pane` → sends visible text to LLM
- **Strengths:** Works well within tmux, sees command output
- **Limitations:** Tmux-only, captures visible text only (not full history), cold start on each query
- **How shy differs:** Works in any terminal, persistent daemon with warm session, full command history

### ShellSage
- **What:** ~150 lines of Python, reads tmux pane for AI context
- **How:** Similar to TmuxAI — `tmux capture-pane` → LLM
- **Strengths:** Minimal, easy to understand
- **Limitations:** Tmux-only, no persistence, no daemon, very basic
- **How shy differs:** Full-featured companion vs proof of concept

### Butterfish
- **What:** Shell wrapper that interposes on terminal I/O
- **How:** Wraps your shell process, intercepts stdin/stdout
- **Strengths:** Sees everything including command output
- **Limitations:** Fragile — breaks TUI apps (vim, htop), adds latency to every keystroke
- **How shy differs:** Non-invasive hooks, zero shell performance impact

### Atuin
- **What:** Shell history replacement with sync, search, and AI features
- **How:** SQLite-backed history database with AI query layer
- **Strengths:** Excellent history management, cross-machine sync, nice TUI
- **Limitations:** AI is a bolt-on feature, no persistent LLM session, no streaming context
- **How shy differs:** AI-first, persistent warm session, real-time activity streaming

## Adjacent Tools

### AIChat
- **What:** CLI chat interface for multiple LLM providers
- **Strengths:** Multi-provider, good pipe support, roles/sessions
- **Limitations:** No shell awareness — doesn't know what commands you're running
- **How shy differs:** Continuous shell context via hooks

### Warp
- **What:** AI-native terminal emulator
- **Strengths:** Deep integration, sees command output natively
- **Limitations:** Proprietary, must replace your terminal, macOS-focused
- **How shy differs:** Works with any terminal, open source

### GitHub Copilot CLI / Amazon Q CLI
- **What:** AI command suggestion tools
- **Strengths:** Good for command generation from natural language
- **Limitations:** No persistent context, no shell history awareness, cold start
- **How shy differs:** Persistent context and warm session, knows your full workflow

### Aider
- **What:** AI pair programming in the terminal
- **Strengths:** Excellent for code editing, git-aware
- **Limitations:** Code-focused, not shell-focused. Doesn't help with devops, log analysis, system administration
- **How shy differs:** Shell workflow focus vs code editing focus

## shy's Unique Position

No existing tool combines all of:

1. **Terminal-agnostic** — works in any terminal emulator, no tmux required
2. **Persistent daemon** — warm LLM session, no cold start
3. **Non-invasive hooks** — fire-and-forget activity streaming, never wraps your shell
4. **Own personality** — user-defined system prompt, one consistent companion
5. **Single context** — unified view across all shell sessions
6. **Pipe-friendly** — standard Unix I/O, composable with other tools
7. **Multi-shell** — native hooks for zsh, bash, and fish

The closest tools are TmuxAI (shell-aware but tmux-only) and AIChat (terminal-agnostic but shell-unaware). shy bridges the gap.
