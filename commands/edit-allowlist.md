---
description: "Edit the allow list for dangerous tool protection"
argument-hint: "[add|remove|show|init] [bash|mcp|write] [pattern]"
allowed-tools:
  - Read
  - Write
  - Glob
  - AskUserQuestion
---

# Edit Allow List Command

Manage the allow list settings in `.claude/ask-dangerous-tool.local.md`.

## Settings File Locations

Settings are loaded with the following priority:
1. **Project scope**: `<projectroot>/.claude/ask-dangerous-tool.local.md` (highest priority)
2. **User scope**: `~/.claude/ask-dangerous-tool.local.md` (fallback)
3. **Defaults**: Empty lists (if no settings file exists)

## Arguments

- `show` - Display current allow list settings and which scope they're from
- `add bash <prefix>` - Add a Bash command prefix to allow list
- `add mcp <pattern>` - Add an MCP tool pattern to allow list (supports `*` wildcard)
- `add write <path>` - Add a path to write-outside-project allow list
- `remove bash <prefix>` - Remove a Bash command prefix
- `remove mcp <pattern>` - Remove an MCP tool pattern
- `remove write <path>` - Remove a write-outside-project path
- `init` - Initialize settings file from example template

## Instructions

### For `show` command:
1. Check which settings file exists (project or user scope)
2. Display the current lists in a readable format
3. Indicate which scope the settings are loaded from

### For `init` command:
1. **IMPORTANT**: Use AskUserQuestion to ask the user which scope to initialize (user or project)
2. Copy from `example.local.md` in the plugin root to the selected location:
   - User scope: `~/.claude/ask-dangerous-tool.local.md`
   - Project scope: `<projectroot>/.claude/ask-dangerous-tool.local.md`
3. Create the `.claude/` directory if it doesn't exist

### For `add` and `remove` commands:
1. Check if a settings file already exists (project scope first, then user scope)
2. If no settings file exists, **use AskUserQuestion** to ask which scope to create (user or project)
3. Load the existing settings or create new one
4. Parse the YAML frontmatter to get current settings
5. Add or remove the pattern from the appropriate list
6. Write the updated settings back to the file

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
