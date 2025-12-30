# Ask Dangerous Tool

Claude Code plugin that prompts user confirmation before executing potentially dangerous operations.

## Features

- **Write Protection**: Asks for confirmation when listed Write/Edit tools target paths outside the project directory
- **Bash Guard**: Asks for confirmation for listed Bash prefixes that target paths outside the project
- **MCP Tool Guard**: Asks for confirmation for listed MCP tools that target paths outside the project
- **Customizable Ask List**: Configure per-project rules via `.asklist.md`

## Installation

### From Marketplace (Recommended)

```bash
/plugin marketplace add tomcat2357/pluginaskdangeroustool
/plugin install ask-dangerous-tool@ask-dangerous-tool-plugin
```

**IMPORTANT: After installing the plugin, you MUST restart your Claude Code session for the hooks to take effect.**

To restart:
- Exit the current session (Ctrl+C or type `exit`)
- Start a new Claude Code session

### As a Plugin

```bash
claude --plugin-dir /path/to/ask-dangerous-tool
```

### In Project

Copy the plugin to your project's `.claude-plugin/` directory.

## Configuration

### Settings File Location

This plugin loads settings from `.asklist.md` with the following priority:

1. **Project root**: `<projectroot>/.claude/.asklist.md`
2. **User home**: `~/.claude/.asklist.md`

If no settings file exists, all commands/tools will require confirmation (ask for all).

### Initial Setup

**Option 1: Copy the template**
```bash
mkdir -p .claude
cp /path/to/plugin/example.asklist.md .claude/.asklist.md
```

**Option 2: Use the built-in command**
```
/ask-dangerous-tool:edit-asklist init
```
This will initialize `.claude/.asklist.md` from the template if needed.

### Settings Format

```yaml
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
```

## Commands

### `/ask-dangerous-tool:edit-asklist`

Manage ask list settings interactively.

```
/ask-dangerous-tool:edit-asklist show              # Show current settings
/ask-dangerous-tool:edit-asklist add bash rm       # Add Bash prefix
/ask-dangerous-tool:edit-asklist add mcp mcp__*    # Add MCP pattern
/ask-dangerous-tool:edit-asklist add write Write   # Add Write tool
/ask-dangerous-tool:edit-asklist remove bash rm    # Remove Bash prefix
/ask-dangerous-tool:edit-asklist init              # Initialize from template
```

## How It Works

### Guard (`guard.js`)

- Monitors `Write`, `Edit`, `MultiEdit`, `Bash`, and `mcp__*` tools
- If no settings file exists, asks for confirmation for ALL tools
- When settings exist:
  - Checks `ask_always` first - always asks regardless of target paths
  - Checks `ask_outside_project` - asks only when targeting paths outside the project
  - Allows everything else

## Settings Format

The settings file uses YAML frontmatter in a Markdown file:

| Setting | Type | Description |
|---------|------|-------------|
| `ask_outside_project` | string[] | Entries that require confirmation when targeting outside the project |
| `ask_always` | string[] | Entries that always require confirmation regardless of target paths |

### Entry Format

Each entry has the format: `<type> <pattern>`

- **bash**: `bash <command>` - Matches bash commands by prefix
- **mcp**: `mcp <pattern>` - Matches MCP tools (supports `*` wildcard)
- **write**: `write <toolname>` - Matches Write/Edit/MultiEdit tools

### Wildcard Support

- MCP patterns support `*` suffix for prefix matching
- Example: `mcp mcp__filesystem__*` matches all filesystem tools

## Troubleshooting

### Hooks Not Working

If the plugin doesn't ask for confirmation when it should:

1. **Check if the plugin is installed and enabled:**
   ```bash
   /plugin
   ```
   You should see `ask-dangerous-tool@ask-dangerous-tool-plugin` in the list.

2. **Verify the plugin is enabled in settings:**
   Check `~/.claude/settings.json` - it should contain:
   ```json
   {
     "enabledPlugins": {
       "ask-dangerous-tool@ask-dangerous-tool-plugin": true
     }
   }
   ```

3. **RESTART YOUR SESSION:**
   Hooks are registered only at session startup. If you just installed the plugin, you MUST restart Claude Code:
   ```bash
   exit  # Exit current session
   claude  # Start new session
   ```

4. **Verify hooks are loaded:**
   After restarting, the hooks should be active. Check the debug logs if needed:
   ```bash
   grep -i "hook\|guard" ~/.claude/debug/*.txt | tail -20
   ```

### Manual Testing

You can test if `guard.js` works correctly:

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' | \
  node ~/.claude/plugins/cache/ask-dangerous-tool-plugin/ask-dangerous-tool/*/hooks/guard.js
```

This should return an "ask" decision if the plugin is properly installed.

## License

MIT
