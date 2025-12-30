---
description: "Edit the ask list for dangerous tool protection"
argument-hint: "[add|remove|show|init] [bash|mcp|write] [pattern]"
allowed-tools:
  - Read
  - Write
  - Glob
  - AskUserQuestion
---

# Edit Ask List Command

Manage the ask list settings in `.asklist.md`.

## Settings File Location

Settings are loaded from (in priority order):
1. **Project root**: `<projectroot>/.asklist.md`
2. **User home**: `~/.claude/.asklist.md`

If no settings file exists, all commands/tools are treated as allowed.

## Arguments

- `show` - Display current ask list settings
- `add bash <prefix>` - Add a Bash command prefix that requires confirmation when targeting outside the project
- `add mcp <pattern>` - Add an MCP tool pattern that requires confirmation when targeting outside the project (supports `*` wildcard)
- `add write <tool>` - Add a Write/Edit tool name that requires confirmation when targeting outside the project
- `remove bash <prefix>` - Remove a Bash command prefix
- `remove mcp <pattern>` - Remove an MCP tool pattern
- `remove write <tool>` - Remove a Write/Edit tool name
- `init` - Initialize `.asklist.md` from example template

## Instructions

### For `show` command:
1. Check if `<projectroot>/.asklist.md` exists, then `~/.claude/.asklist.md`
2. Display the current lists in a readable format
3. Indicate when no settings file exists

### For `init` command:
1. Copy from `example.asklist.md` in the plugin root (e.g. `~/.claude/plugins/marketplaces/ask-dangerous-tool-plugin/example.asklist.md`) to `<projectroot>/.asklist.md`
2. If the file already exists, do not overwrite it unless the user explicitly asks

### For `add` and `remove` commands:
1. Check if `<projectroot>/.asklist.md` exists
2. If no settings file exists, initialize it from `example.asklist.md` (plugin root)
3. Load the existing settings
4. Parse the YAML frontmatter to get current settings
5. Add or remove the pattern from the appropriate list
6. Write the updated settings back to the file

## Settings File Format

```markdown
---
bash_ask_outside_project_prefixes:
  - rm
  - mv
mcp_ask_outside_project:
  - mcp__filesystem__write_file
  - mcp__filesystem__*
write_ask_outside_project:
  - Write
  - Edit
---

# Notes

Additional notes can go here.
```

## Example Usage

- `/ask-dangerous-tool:edit-asklist show` - Show current settings
- `/ask-dangerous-tool:edit-asklist add bash rm` - Ask when `rm` targets paths outside the project
- `/ask-dangerous-tool:edit-asklist add mcp mcp__filesystem__*` - Ask for matching MCP tools when they target paths outside the project
- `/ask-dangerous-tool:edit-asklist add write Write` - Ask when Write targets paths outside the project
- `/ask-dangerous-tool:edit-asklist remove bash rm` - Remove `rm` from the list
- `/ask-dangerous-tool:edit-asklist init` - Initialize `.asklist.md` from template
