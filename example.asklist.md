---
# Commands/tools that require confirmation when targeting paths outside the project
# Format: "<type> <pattern>"
# Types: bash, mcp, write
ask_outside_project:
  # Bash commands
  - bash rm
  - bash mv
  - bash cp
  - bash ln
  - bash chmod
  - bash chown
  - bash chgrp
  - bash truncate
  - bash rsync
  - bash tar
  - bash unzip
  - bash zip
  - bash sed -i
  - bash perl -i
  - bash find -delete
  - bash xargs rm
  - bash git clean
  - bash git rm
  - bash git reset
  - bash git restore

  # MCP tools (supports wildcard * at the end)
  - mcp mcp__filesystem__write_file
  - mcp mcp__filesystem__delete_file
  - mcp mcp__filesystem__move_file
  - mcp mcp__filesystem__copy_file
  - mcp mcp__filesystem__create_directory
  - mcp mcp__filesystem__remove_directory
  # Example: Allow all tools from a specific MCP server
  # - mcp mcp__server__*

  # Write/Edit tools
  - write Write
  - write Edit
  - write MultiEdit

# Commands/tools that always require confirmation regardless of target paths
# Format: "<type> <pattern>"
ask_always:
  # Example: Dangerous bash commands
  # - bash dd
  # - bash sudo rm -rf
  # - bash mkfs
---

# Ask List Settings

This file lists commands/tools that should trigger confirmation dialogs.

## How to Use

1. Copy this file to `.asklist.md` in your project root or `~/.claude/.asklist.md`
2. Customize the lists for your workflow

## Settings Priority

1. `<projectroot>/.asklist.md` (project-specific)
2. `~/.claude/.asklist.md` (user-wide fallback)

## Entry Format

Each entry has the format: `<type> <pattern>`

- **bash**: `bash <command>` - Matches bash commands by prefix
- **mcp**: `mcp <pattern>` - Matches MCP tools (supports `*` wildcard)
- **write**: `write <toolname>` - Matches Write/Edit/MultiEdit tools

## Lists

- **ask_outside_project**: Ask only when targeting paths outside the project
- **ask_always**: Always ask regardless of target paths

## Notes

- Bash entries are prefix matches (e.g., `bash rm` matches `rm -rf foo`)
- For bash wrappers like `sudo`, the guard strips common prefixes automatically
- MCP patterns support wildcards: `mcp mcp__server__*` matches all tools from that server
- If a tool matches `ask_always`, it will ask regardless of target paths
