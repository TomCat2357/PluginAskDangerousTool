---
# Commands/tools that require confirmation only when they target paths outside the project
# Unlisted commands/tools are always allowed
bash_ask_outside_project_prefixes:
  - rm
  - mv
  - cp
  - ln
  - chmod
  - chown
  - chgrp
  - truncate
  - dd
  - rsync
  - tar
  - unzip
  - zip
  - sed -i
  - perl -i
  - find -delete
  - xargs rm
  - git clean
  - git rm
  - git reset
  - git restore

# MCP tool names/patterns that require confirmation when they target paths outside the project
# Supports exact match or wildcard (*) at the end
mcp_ask_outside_project:
  # Example: filesystem-style tools
  - mcp__filesystem__write_file
  - mcp__filesystem__delete_file
  - mcp__filesystem__move_file
  - mcp__filesystem__copy_file
  - mcp__filesystem__create_directory
  - mcp__filesystem__remove_directory
  # Example: Allow all tools from a specific MCP server
  # - mcp__server__*

# Write/Edit tools that require confirmation when they target paths outside the project
write_ask_outside_project:
  - Write
  - Edit
  - MultiEdit
---

# Permission Settings

This file lists commands/tools that should trigger confirmation only when they
act on paths outside the project.

## How to Use

1. Copy this file to `.permission.md` in your project root
2. Customize the lists for your workflow

## Notes

- Bash entries are prefix matches. If you use wrappers like `sudo`, add
  `sudo rm` as a separate entry.
- Write entries should match tool names (Write/Edit/MultiEdit).
- If no outside-project path can be detected, the command is allowed.
