#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Read settings from .claude/ask-dangerous-tool.local.md
 * Priority: project scope > user scope > defaults
 * Format: YAML frontmatter with bash_allow_prefixes and mcp_allow_list
 */
function loadSettings(projectRoot) {
  const defaults = {
    bash_allow_prefixes: [],
    mcp_allow_list: []
  };

  // Try project scope first
  const projectPath = path.join(projectRoot, ".claude", "ask-dangerous-tool.local.md");
  if (fs.existsSync(projectPath)) {
    return parseSettings(projectPath, defaults);
  }

  // Fall back to user scope
  const userPath = path.join(os.homedir(), ".claude", "ask-dangerous-tool.local.md");
  if (fs.existsSync(userPath)) {
    return parseSettings(userPath, defaults);
  }

  // No settings found, return defaults
  return defaults;
}

function parseSettings(settingsPath, defaults) {
  try {
    const content = fs.readFileSync(settingsPath, "utf8");
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return defaults;

    const yaml = match[1];
    const settings = { ...defaults };

    // Parse bash_allow_prefixes
    const bashMatch = yaml.match(/bash_allow_prefixes:\s*\r?\n((?:\s*-\s*.+\r?\n?)*)/);
    if (bashMatch) {
      const lines = bashMatch[1].split(/\r?\n/);
      settings.bash_allow_prefixes = lines
        .map(line => line.match(/^\s*-\s*(.+)/))
        .filter(m => m)
        .map(m => m[1].trim().replace(/^["']|["']$/g, ""));
    }

    // Parse mcp_allow_list
    const mcpMatch = yaml.match(/mcp_allow_list:\s*\r?\n((?:\s*-\s*.+\r?\n?)*)/);
    if (mcpMatch) {
      const lines = mcpMatch[1].split(/\r?\n/);
      settings.mcp_allow_list = lines
        .map(line => line.match(/^\s*-\s*(.+)/))
        .filter(m => m)
        .map(m => m[1].trim().replace(/^["']|["']$/g, ""));
    }

    return settings;
  } catch {
    return defaults;
  }
}

function readStdinJson() {
  const raw = fs.readFileSync(0, "utf8") || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function decide(decision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: decision,
        permissionDecisionReason: reason
      }
    })
  );
}

const projectRoot =
  process.env.CLAUDE_PROJECT_DIR ||
  process.env.PROJECT_DIR ||
  process.cwd();

const settings = loadSettings(projectRoot);
const input = readStdinJson();
const toolName = input.tool_name || "";
const toolInput = input.tool_input || {};

// Handle Bash tool
if (toolName === "Bash") {
  const command = (toolInput.command || "").trim();

  // If no settings, ask for all
  if (settings.bash_allow_prefixes.length === 0) {
    decide(
      "ask",
      [
        "許可リストが未設定のため、Bashコマンドの確認が必要です。",
        `command: ${command.substring(0, 100)}${command.length > 100 ? "..." : ""}`,
        "実行を許可しますか？"
      ].join("\n")
    );
    process.exit(0);
  }

  for (const prefix of settings.bash_allow_prefixes) {
    if (
      command === prefix ||
      command.startsWith(prefix + " ") ||
      command.startsWith(prefix + "\t") ||
      command.startsWith(prefix + ";") ||
      command.startsWith(prefix + "&") ||
      command.startsWith(prefix + "|")
    ) {
      decide("allow", `Bash command allowed: ${prefix}`);
      process.exit(0);
    }
  }

  // Not in allow list
  decide(
    "ask",
    [
      "許可リスト外のBashコマンドです。",
      `command: ${command.substring(0, 100)}${command.length > 100 ? "..." : ""}`,
      "実行を許可しますか？"
    ].join("\n")
  );
  process.exit(0);
}

// Handle MCP tools (mcp__*)
if (toolName.startsWith("mcp__")) {
  // If no settings, ask for all
  if (settings.mcp_allow_list.length === 0) {
    decide(
      "ask",
      [
        "許可リストが未設定のため、MCPツールの確認が必要です。",
        `tool: ${toolName}`,
        "実行を許可しますか？"
      ].join("\n")
    );
    process.exit(0);
  }

  // Check exact match or prefix match (for mcp__server__ patterns)
  for (const pattern of settings.mcp_allow_list) {
    if (toolName === pattern) {
      decide("allow", `MCP tool allowed: ${toolName}`);
      process.exit(0);
    }
    // Support wildcard pattern like "mcp__serena__*"
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      if (toolName.startsWith(prefix)) {
        decide("allow", `MCP tool allowed by pattern: ${pattern}`);
        process.exit(0);
      }
    }
  }

  // Not in allow list
  decide(
    "ask",
    [
      "許可リスト外のMCPツールです。",
      `tool: ${toolName}`,
      "実行を許可しますか？"
    ].join("\n")
  );
  process.exit(0);
}

// Fallback (should not reach here due to matcher)
decide("allow", "Not a Bash or MCP tool.");
process.exit(0);
