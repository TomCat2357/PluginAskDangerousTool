---
description: "Edit the allow list for dangerous tool protection"
argument-hint: "[add|remove|show] [bash|mcp|write] [pattern]"
allowed-tools:
  - Read
  - Write
  - Glob
---

# Edit Allow List Command

Manage the allow list settings in `.claude/ask-dangerous-tool.local.md`.

## Arguments

- `show` - Display current allow list settings
- `add bash <prefix>` - Add a Bash command prefix to allow list
- `add mcp <pattern>` - Add an MCP tool pattern to allow list (supports `*` wildcard)
- `add write <path>` - Add a path to write-outside-project allow list
- `remove bash <prefix>` - Remove a Bash command prefix
- `remove mcp <pattern>` - Remove an MCP tool pattern
- `remove write <path>` - Remove a write-outside-project path
- `init` - Initialize settings file from example template

## Instructions

1. First, read the current settings file at `.claude/ask-dangerous-tool.local.md`
2. If the file doesn't exist and user runs `init`, copy from `example.local.md` in the plugin root
3. Parse the YAML frontmatter to get current settings
4. Based on the user's command:
   - `show`: Display the current lists in a readable format
   - `add`: Add the pattern to the appropriate list
   - `remove`: Remove the pattern from the appropriate list
   - `init`: Create the settings file from template
5. Write the updated settings back to the file

## Settings File Format

```markdown
---
bash_allow_prefixes:
  - pwd
  - ls
  - git status
mcp_allow_list:
  - mcp__serena__read_file
  - mcp__serena__*
write_allow_outside_project:
  - /some/external/path
---

# Notes

Additional notes can go here.
```

## Example Usage

- `/ask-dangerous-tool:edit-allowlist show` - Show current settings
- `/ask-dangerous-tool:edit-allowlist add bash npm run` - Allow `npm run` commands
- `/ask-dangerous-tool:edit-allowlist add mcp mcp__github__*` - Allow all GitHub MCP tools
- `/ask-dangerous-tool:edit-allowlist remove bash rm` - Remove `rm` from allow list
- `/ask-dangerous-tool:edit-allowlist init` - Initialize settings from template
