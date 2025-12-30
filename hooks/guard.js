#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Read settings from .asklist.md
 * Priority: 1. <projectroot>/.asklist.md  2. ~/.claude/.asklist.md
 */
function loadSettings(projectRoot) {
  const defaults = {
    bash_ask_outside_project_prefixes: [],
    mcp_ask_outside_project: [],
    write_ask_outside_project: []
  };

  // Priority 1: Project root
  const projectSettingsPath = path.join(projectRoot, ".asklist.md");
  if (fs.existsSync(projectSettingsPath)) {
    return parseSettings(projectSettingsPath, defaults);
  }

  // Priority 2: User home ~/.claude/
  const userSettingsPath = path.join(os.homedir(), ".claude", ".asklist.md");
  if (fs.existsSync(userSettingsPath)) {
    return parseSettings(userSettingsPath, defaults);
  }

  return defaults;
}

function parseSettings(settingsPath, defaults) {
  try {
    const content = fs.readFileSync(settingsPath, "utf8");
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return defaults;

    const yaml = match[1];
    const settings = { ...defaults };

    // Parse bash_ask_outside_project_prefixes
    const bashMatch = yaml.match(/bash_ask_outside_project_prefixes:\s*\r?\n((?:\s*-\s*.+\r?\n?)*)/);
    if (bashMatch) {
      const lines = bashMatch[1].split(/\r?\n/);
      settings.bash_ask_outside_project_prefixes = lines
        .map(line => line.match(/^\s*-\s*(.+)/))
        .filter(m => m)
        .map(m => m[1].trim().replace(/^["']|["']$/g, ""));
    }

    // Parse mcp_ask_outside_project
    const mcpMatch = yaml.match(/mcp_ask_outside_project:\s*\r?\n((?:\s*-\s*.+\r?\n?)*)/);
    if (mcpMatch) {
      const lines = mcpMatch[1].split(/\r?\n/);
      settings.mcp_ask_outside_project = lines
        .map(line => line.match(/^\s*-\s*(.+)/))
        .filter(m => m)
        .map(m => m[1].trim().replace(/^["']|["']$/g, ""));
    }

    // Parse write_ask_outside_project
    const writeMatch = yaml.match(/write_ask_outside_project:\s*\r?\n((?:\s*-\s*.+\r?\n?)*)/);
    if (writeMatch) {
      const lines = writeMatch[1].split(/\r?\n/);
      settings.write_ask_outside_project = lines
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

function expandHome(p) {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

function realOrResolve(p, baseDir) {
  const expanded = expandHome(p);
  try {
    return fs.realpathSync(expanded);
  } catch {
    return path.resolve(baseDir, expanded);
  }
}

function isInsideProject(absTarget, absProjectRoot) {
  const rel = path.relative(absProjectRoot, absTarget);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

function tokenizeCommand(command) {
  const tokens = [];
  let current = "";
  let quote = null;
  let escape = false;

  for (const ch of command) {
    if (escape) {
      current += ch;
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (quote) {
      if (ch === quote) {
        quote = null;
        continue;
      }
      current += ch;
      continue;
    }
    if (ch === "'" || ch === "\"") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function stripQuotes(value) {
  return value.replace(/^["']|["']$/g, "");
}

function looksLikePath(value) {
  if (!value) return false;
  if (value.includes("://")) return false;
  if (value === "." || value === "..") return true;
  if (value.startsWith("~/") || value === "~") return true;
  if (value.startsWith("./") || value.startsWith("../")) return true;
  if (/^[A-Za-z]:[\\/]/.test(value)) return true;
  if (path.isAbsolute(value)) return true;
  if (value.includes("/")) return true;
  return false;
}

function extractPathCandidates(command) {
  const tokens = tokenizeCommand(command);
  const candidates = [];
  const pathValueFlags = new Set([
    "-C",
    "--cwd",
    "--work-tree",
    "--directory"
  ]);

  for (let i = 0; i < tokens.length; i++) {
    const token = stripQuotes(tokens[i] || "");
    if (!token) continue;

    if (pathValueFlags.has(token) && tokens[i + 1]) {
      candidates.push(stripQuotes(tokens[i + 1]));
      i += 1;
      continue;
    }

    const eqIndex = token.indexOf("=");
    if (eqIndex > 0) {
      const value = token.slice(eqIndex + 1);
      if (looksLikePath(value)) {
        candidates.push(value);
      }
      continue;
    }

    if (looksLikePath(token)) {
      candidates.push(token);
    }
  }

  return candidates;
}

function resolvePathCandidate(candidate, projectRoot) {
  if (!candidate) return null;
  let value = candidate;
  if (value === "~") {
    value = os.homedir();
  } else if (value.startsWith("~/")) {
    value = path.join(os.homedir(), value.slice(2));
  }
  if (/^[A-Za-z]:[\\/]/.test(value)) {
    return path.resolve(value);
  }
  if (path.isAbsolute(value)) {
    return path.resolve(value);
  }
  return path.resolve(projectRoot, value);
}

function findOutsideTargetsFromCommand(command, absProjectRoot) {
  const candidates = extractPathCandidates(command);
  const outside = [];

  for (const candidate of candidates) {
    const absTarget = realOrResolve(
      resolvePathCandidate(candidate, absProjectRoot) || candidate,
      absProjectRoot
    );
    if (!isInsideProject(absTarget, absProjectRoot)) {
      outside.push(absTarget);
    }
  }

  return [...new Set(outside)];
}

function matchesPrefix(command, prefix) {
  if (!command || !prefix) return false;
  return (
    command === prefix ||
    command.startsWith(prefix + " ") ||
    command.startsWith(prefix + "\t") ||
    command.startsWith(prefix + ";") ||
    command.startsWith(prefix + "&") ||
    command.startsWith(prefix + "|")
  );
}

function matchesAnyPrefix(command, prefixes) {
  const trimmed = command.trim();
  if (!trimmed) return false;

  const variants = [trimmed];
  if (trimmed.startsWith("sudo ")) {
    variants.push(trimmed.replace(/^sudo\s+/, ""));
  }
  if (trimmed.startsWith("env ")) {
    variants.push(trimmed.replace(/^env\s+/, ""));
  }

  for (const prefix of prefixes) {
    for (const variant of variants) {
      if (matchesPrefix(variant, prefix)) {
        return true;
      }
    }
  }

  return false;
}

function matchesMcpPattern(toolName, pattern) {
  if (toolName === pattern) return true;
  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    return toolName.startsWith(prefix);
  }
  return false;
}

function truncateForReason(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function collectPathCandidatesFromInput(input, candidates, depth) {
  if (!input || typeof input !== "object") return;
  if (depth > 4) return;

  const pathKeys = new Set([
    "path",
    "file_path",
    "filePath",
    "filepath",
    "target_path",
    "targetPath",
    "source_path",
    "sourcePath",
    "dest_path",
    "destPath",
    "output_path",
    "outputPath",
    "directory",
    "dir"
  ]);

  const pathArrayKeys = new Set([
    "paths",
    "file_paths",
    "files",
    "targets",
    "sources",
    "destinations"
  ]);

  for (const [key, value] of Object.entries(input)) {
    if (pathKeys.has(key) && typeof value === "string" && value.trim()) {
      candidates.push(value.trim());
      continue;
    }
    if (pathArrayKeys.has(key) && Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim()) {
          candidates.push(item.trim());
        }
      }
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        collectPathCandidatesFromInput(item, candidates, depth + 1);
      }
      continue;
    }
    if (value && typeof value === "object") {
      collectPathCandidatesFromInput(value, candidates, depth + 1);
    }
  }
}

function findOutsideTargetsFromInput(toolInput, absProjectRoot) {
  const candidates = [];
  collectPathCandidatesFromInput(toolInput, candidates, 0);

  const uniqueCandidates = [...new Set(candidates)];
  const outside = [];

  for (const candidate of uniqueCandidates) {
    const absTarget = realOrResolve(
      resolvePathCandidate(candidate, absProjectRoot) || candidate,
      absProjectRoot
    );
    if (!isInsideProject(absTarget, absProjectRoot)) {
      outside.push(absTarget);
    }
  }

  return [...new Set(outside)];
}

// Main logic
const projectRoot =
  process.env.CLAUDE_PROJECT_DIR ||
  process.env.PROJECT_DIR ||
  process.cwd();

const absProjectRoot = realOrResolve(projectRoot, process.cwd());
const settings = loadSettings(absProjectRoot);
const input = readStdinJson();
const toolName = input.tool_name || "";
const toolInput = input.tool_input || {};

// Handle Bash tool
if (toolName === "Bash") {
  const command = (toolInput.command || "").trim();

  if (!matchesAnyPrefix(command, settings.bash_ask_outside_project_prefixes)) {
    decide("allow", "Bash command not in ask list.");
    process.exit(0);
  }

  const outsideTargets = findOutsideTargetsFromCommand(command, absProjectRoot);
  if (outsideTargets.length === 0) {
    decide("allow", "No outside-project paths detected for Bash command.");
    process.exit(0);
  }

  decide(
    "ask",
    [
      "プロジェクト外に干渉する可能性のあるBashコマンドです。",
      `command: ${truncateForReason(command, 100)}`,
      `targets: ${outsideTargets.join(", ")}`,
      "実行を許可しますか？"
    ].join("\n")
  );
  process.exit(0);
}

// Handle MCP tools (mcp__*)
if (toolName.startsWith("mcp__")) {
  const matchesList = settings.mcp_ask_outside_project.some(pattern =>
    matchesMcpPattern(toolName, pattern)
  );

  if (!matchesList) {
    decide("allow", "MCP tool not in ask list.");
    process.exit(0);
  }

  const outsideTargets = findOutsideTargetsFromInput(toolInput, absProjectRoot);
  if (outsideTargets.length === 0) {
    decide("allow", "No outside-project paths detected for MCP tool.");
    process.exit(0);
  }

  decide(
    "ask",
    [
      "プロジェクト外に干渉する可能性のあるMCPツールです。",
      `tool: ${toolName}`,
      `targets: ${outsideTargets.join(", ")}`,
      "実行を許可しますか？"
    ].join("\n")
  );
  process.exit(0);
}

// Handle Write/Edit/MultiEdit tools
if (["Write", "Edit", "MultiEdit"].includes(toolName)) {
  if (!settings.write_ask_outside_project.includes(toolName)) {
    decide("allow", "Write/Edit tool not in ask list.");
    process.exit(0);
  }

  // Extract paths from tool_input
  const pathCandidates = [];

  for (const key of ["file_path", "path", "filePath", "filepath"]) {
    if (typeof toolInput[key] === "string" && toolInput[key].trim()) {
      pathCandidates.push(toolInput[key].trim());
    }
  }

  if (Array.isArray(toolInput.edits)) {
    for (const e of toolInput.edits) {
      if (e && typeof e.file_path === "string" && e.file_path.trim()) {
        pathCandidates.push(e.file_path.trim());
      }
      if (e && typeof e.path === "string" && e.path.trim()) {
        pathCandidates.push(e.path.trim());
      }
    }
  }

  const uniquePaths = [...new Set(pathCandidates)];

  if (uniquePaths.length === 0) {
    decide("allow", `No target paths detected for ${toolName}.`);
    process.exit(0);
  }

  // Check each path
  for (const p of uniquePaths) {
    const absTarget = realOrResolve(p, absProjectRoot);

    if (!isInsideProject(absTarget, absProjectRoot)) {
      decide(
        "ask",
        [
          "プロジェクト外への書き込み/編集が検出されました。",
          `projectRoot: ${absProjectRoot}`,
          `target: ${absTarget}`,
          "続行しますか？"
        ].join("\n")
      );
      process.exit(0);
    }
  }

  decide("allow", "All target paths are within the project root.");
  process.exit(0);
}

// Fallback
decide("allow", "Tool not in scope.");
process.exit(0);
