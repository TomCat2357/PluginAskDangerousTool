---
description: "Edit the ask list for dangerous tool protection"
argument-hint: "[add|remove|show|init] [outside|always] [command] [--scope user|project]"
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
1. **Project root**: `<projectroot>/.claude/.asklist.md`
2. **User home**: `~/.claude/.asklist.md`

If no settings file exists, all commands/tools will require confirmation (ask for all).

## Arguments

- `show` - Display current ask list settings
- `add outside <command>` - Add a command that requires confirmation when targeting outside the project
- `add always <command>` - Add a command that always requires confirmation
- `remove outside <command>` - Remove a command from the outside list
- `remove always <command>` - Remove a command from the always list
- `init` - Initialize `.asklist.md` from example template
- `--scope [user|project]` - Specify the scope for the settings file
  - `user` - Save to `~/.claude/.asklist.md` (global settings for all projects)
  - `project` - Save to `<projectroot>/.claude/.asklist.md` (project-specific settings)
  - If not specified, defaults to project scope for `add/remove/init`, and shows both for `show`

### Command Format

Commands should be in the format: `<type> <pattern>`

- `bash <command>` - Bash command prefix (e.g., `bash rm`, `bash git clean`)
- `mcp <pattern>` - MCP tool pattern (e.g., `mcp mcp__filesystem__*`)
- `write <toolname>` - Write/Edit tool (e.g., `write Write`, `write Edit`)

## Interactive Mode

When run without arguments or with only `--scope`, the command enters interactive mode and guides you through the configuration process with questions.

## Instructions

### For Interactive Mode (no arguments or only `--scope`):
1. Determine the target scope (user or project based on `--scope`, default to project)
2. Use AskUserQuestion to guide the user through configuration:
   - Ask which action they want to perform (show, add, remove, init)
   - For add/remove: Ask which list (outside or always)
   - For add/remove: Ask for the command format (provide examples: `bash rm`, `mcp mcp__filesystem__*`, `write Write`)
3. Execute the selected action

### For `show` command:
1. If `--scope user` is specified, only show `~/.claude/.asklist.md`
2. If `--scope project` is specified, only show `<projectroot>/.claude/.asklist.md`
3. If no scope is specified, show both files (project first, then user)
4. Display the current lists in a readable format
5. Show entries grouped by list (ask_outside_project, ask_always)
6. Indicate when no settings file exists

### For `init` command:
1. Determine the target location based on `--scope`:
   - `--scope user`: `~/.claude/.asklist.md`
   - `--scope project` or no scope: `<projectroot>/.claude/.asklist.md`
2. Copy from `example.asklist.md` in the plugin root (e.g. `~/.claude/plugins/marketplaces/ask-dangerous-tool-plugin/example.asklist.md`) to the target location
3. If the file already exists, do not overwrite it unless the user explicitly asks

### For `add` and `remove` commands:
1. Determine the target location based on `--scope`:
   - `--scope user`: `~/.claude/.asklist.md`
   - `--scope project` or no scope: `<projectroot>/.claude/.asklist.md`
2. Check if the target settings file exists
3. If no settings file exists, initialize it from `example.asklist.md` (plugin root)
4. Load the existing settings
5. Parse the YAML frontmatter to get current settings
6. Determine the target list based on the second argument:
   - `outside` → `ask_outside_project` list
   - `always` → `ask_always` list
7. Add or remove the command from the appropriate list
8. Write the updated settings back to the file

## Settings File Format

```markdown
---
# Commands/tools that require confirmation when targeting paths outside the project
ask_outside_project:
  - bash rm
  - bash mv
  - mcp mcp__filesystem__*
  - write Write
  - write Edit

# Commands/tools that always require confirmation regardless of target paths
ask_always:
  - bash dd
  - bash sudo rm -rf
---

# Notes

Additional notes can go here.
```

## Example Usage

### Interactive Mode
- `/ask-dangerous-tool:edit-asklist` - Enter interactive mode (project scope)
- `/ask-dangerous-tool:edit-asklist --scope user` - Enter interactive mode (user scope)

### Show Command
- `/ask-dangerous-tool:edit-asklist show` - Show current settings (both project and user)
- `/ask-dangerous-tool:edit-asklist show --scope user` - Show only user-level settings
- `/ask-dangerous-tool:edit-asklist show --scope project` - Show only project-level settings

### Add Command
- `/ask-dangerous-tool:edit-asklist add outside "bash rm"` - Add `bash rm` to ask_outside_project (project scope)
- `/ask-dangerous-tool:edit-asklist add always "bash dd"` - Add `bash dd` to ask_always (project scope)
- `/ask-dangerous-tool:edit-asklist add outside "mcp mcp__filesystem__*" --scope user` - Add to user-level ask_outside_project
- `/ask-dangerous-tool:edit-asklist add outside "write Write"` - Add Write tool to ask_outside_project

### Remove Command
- `/ask-dangerous-tool:edit-asklist remove outside "bash rm"` - Remove `bash rm` from ask_outside_project (project scope)
- `/ask-dangerous-tool:edit-asklist remove always "bash dd"` - Remove `bash dd` from ask_always

### Init Command
- `/ask-dangerous-tool:edit-asklist init` - Initialize `.asklist.md` from template (project scope)
- `/ask-dangerous-tool:edit-asklist init --scope user` - Initialize user-level `.asklist.md` from template
