# Ask Dangerous Tool

Claude Code plugin that prompts user confirmation before executing potentially dangerous operations.

## Features

- **Write Protection**: Asks for confirmation when listed Write/Edit tools target paths outside the project directory
- **Bash Guard**: Asks for confirmation for listed Bash prefixes that target paths outside the project
- **MCP Tool Guard**: Asks for confirmation for listed MCP tools that target paths outside the project
- **Customizable Permission List**: Configure per-project rules via `.permission.md`

## Installation

### As a Plugin

```bash
claude --plugin-dir /path/to/ask-dangerous-tool
```

### In Project

Copy the plugin to your project's `.claude-plugin/` directory.

## Configuration

### Settings File Location

This plugin loads settings from `.permission.md` in the project root:

1. **Project root**: `<projectroot>/.permission.md`

If no settings file exists, all commands/tools are allowed by default.

### Initial Setup

**Option 1: Copy the template**
```bash
cp /path/to/plugin/example.permission.md .permission.md
```

**Option 2: Use the built-in command**
```
/ask-dangerous-tool:edit-allowlist init
```
This will initialize `.permission.md` from the template if needed.

### Settings Format

```yaml
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
```

## Commands

### `/ask-dangerous-tool:edit-allowlist`

Manage permission list settings interactively.

```
/ask-dangerous-tool:edit-allowlist show              # Show current settings
/ask-dangerous-tool:edit-allowlist add bash rm       # Add Bash prefix
/ask-dangerous-tool:edit-allowlist add mcp mcp__*    # Add MCP pattern
/ask-dangerous-tool:edit-allowlist add write Write  # Add Write tool
/ask-dangerous-tool:edit-allowlist remove bash rm    # Remove Bash prefix
/ask-dangerous-tool:edit-allowlist init              # Initialize from template
```

## How It Works

### Write/Edit Guard (`writepath-guard.js`)

- Monitors `Write`, `Edit`, `MultiEdit` tools
- Allows operations inside project directory automatically
- Asks for confirmation when the tool is listed in `write_ask_outside_project` and the target is outside the project

### Command Guard (`command-guard.js`)

- Monitors `Bash` and `mcp__*` tools
- Asks for confirmation when:
  - The Bash command matches `bash_ask_outside_project_prefixes` and targets outside the project
  - The MCP tool matches `mcp_ask_outside_project` and targets outside the project
- Allows everything else

## Settings Format

The settings file uses YAML frontmatter in a Markdown file:

| Setting | Type | Description |
|---------|------|-------------|
| `bash_ask_outside_project_prefixes` | string[] | Bash prefixes that require confirmation when they target outside the project |
| `mcp_ask_outside_project` | string[] | MCP tool names/patterns that require confirmation when they target outside the project |
| `write_ask_outside_project` | string[] | Write/Edit tool names that require confirmation when they target outside the project |

### Wildcard Support

- `mcp_ask_outside_project` supports `*` suffix for prefix matching
- Example: `mcp__filesystem__*` matches all filesystem tools

## License

MIT
