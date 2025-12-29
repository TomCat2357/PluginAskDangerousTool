---
# Bash command prefixes that are allowed without confirmation
# Commands starting with these prefixes will be auto-allowed
bash_allow_prefixes:
  - pwd
  - ls
  - cat
  - head
  - tail
  - echo
  - git status
  - git diff
  - git log
  - git branch
  - npm run
  - npm test
  - npx

# MCP tool patterns that are allowed without confirmation
# Supports exact match or wildcard (*) at the end
mcp_allow_list:
  # Serena read-only tools
  - mcp__serena__read_file
  - mcp__serena__list_dir
  - mcp__serena__find_file
  - mcp__serena__search_for_pattern
  - mcp__serena__find_symbol
  - mcp__serena__find_referencing_symbols
  - mcp__serena__get_symbols_overview
  - mcp__serena__get_current_config
  - mcp__serena__list_memories
  - mcp__serena__read_memory
  - mcp__serena__check_onboarding_performed
  - mcp__serena__initial_instructions
  - mcp__serena__think_about_collected_information
  - mcp__serena__think_about_task_adherence
  - mcp__serena__think_about_whether_you_are_done
  # Example: Allow all tools from a specific MCP server
  # - mcp__github__*

# Paths outside the project that are allowed for Write/Edit
# These paths will not trigger the "outside project" warning
write_allow_outside_project:
  # Example: Allow writing to a shared config directory
  # - ~/.config/myapp
  # - /tmp/build-output
---

# Ask Dangerous Tool - Local Settings

This file configures which tools and commands are allowed without confirmation.

## How to Use

1. Copy this file to `.claude/ask-dangerous-tool.local.md` in your project
2. Customize the allow lists for your workflow
3. The plugin will read these settings automatically

## Categories

### bash_allow_prefixes
Commands that start with these prefixes are auto-allowed. Be careful with commands that can be chained (e.g., `ls; rm -rf /`).

### mcp_allow_list
MCP tool names that are auto-allowed. Use `*` at the end for prefix matching (e.g., `mcp__server__*`).

### write_allow_outside_project
Paths outside the current project where Write/Edit operations are allowed. Use absolute paths.

## Tips

- Start with a minimal allow list and add as needed
- Use `/ask-dangerous-tool:edit-allowlist` command to manage settings
- This file is gitignored, so each user can have their own settings
