# Ask Dangerous Tool

Claude Code plugin that prompts user confirmation before executing potentially dangerous operations.

## Features

- **Write Protection**: Asks for confirmation when writing/editing files outside the project directory
- **Bash Guard**: Asks for confirmation for Bash commands not in the allow list
- **MCP Tool Guard**: Asks for confirmation for MCP tools not in the allow list
- **Customizable Allow Lists**: Configure per-project allow lists via `.local.md` settings

## Installation

### As a Plugin

```bash
claude --plugin-dir /path/to/ask-dangerous-tool
```

### In Project

Copy the plugin to your project's `.claude-plugin/` directory.

## Configuration

1. Copy `example.local.md` to `.claude/ask-dangerous-tool.local.md` in your project:

```bash
cp /path/to/plugin/example.local.md .claude/ask-dangerous-tool.local.md
```

2. Edit the allow lists as needed:

```yaml
---
bash_allow_prefixes:
  - pwd
  - ls
  - git status
mcp_allow_list:
  - mcp__serena__read_file
  - mcp__serena__*
write_allow_outside_project:
  - ~/.config/myapp
---
```

## Commands

### `/ask-dangerous-tool:edit-allowlist`

Manage allow list settings interactively.

```
/ask-dangerous-tool:edit-allowlist show              # Show current settings
/ask-dangerous-tool:edit-allowlist add bash npm run  # Add Bash prefix
/ask-dangerous-tool:edit-allowlist add mcp mcp__*    # Add MCP pattern
/ask-dangerous-tool:edit-allowlist remove bash rm    # Remove Bash prefix
/ask-dangerous-tool:edit-allowlist init              # Initialize from template
```

## How It Works

### Write/Edit Guard (`writepath-guard.js`)

- Monitors `Write`, `Edit`, `MultiEdit` tools
- Allows operations inside project directory automatically
- Asks for confirmation for operations outside project directory
- Respects `write_allow_outside_project` settings

### Command Guard (`command-guard.js`)

- Monitors `Bash` and `mcp__*` tools
- Allows commands matching `bash_allow_prefixes` (prefix match)
- Allows MCP tools matching `mcp_allow_list` (exact or wildcard match)
- Asks for confirmation for everything else

## Settings Format

The settings file uses YAML frontmatter in a Markdown file:

| Setting | Type | Description |
|---------|------|-------------|
| `bash_allow_prefixes` | string[] | Bash command prefixes to auto-allow |
| `mcp_allow_list` | string[] | MCP tool names/patterns to auto-allow |
| `write_allow_outside_project` | string[] | Paths outside project to allow writing |

### Wildcard Support

- `mcp_allow_list` supports `*` suffix for prefix matching
- Example: `mcp__serena__*` matches all Serena tools

## License

MIT
