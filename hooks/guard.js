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
    ask_outside_project: [],
    ask_always: []
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

    // Parse ask_outside_project
    const outsideMatch = yaml.match(/ask_outside_project:\s*\r?\n((?:\s+.+\r?\n?)*)/);
    if (outsideMatch) {
      const lines = outsideMatch[1].split(/\r?\n/);
      settings.ask_outside_project = lines
        .map(line => line.match(/^\s*-\s*(.+)/))
        .filter(m => m)
        .map(m => m[1].trim().replace(/^["']|["']$/g, ""));
    }

    // Parse ask_always
    const alwaysMatch = yaml.match(/ask_always:\s*\r?\n((?:\s+.+\r?\n?)*)/);
    if (alwaysMatch) {
      const lines = alwaysMatch[1].split(/\r?\n/);
      settings.ask_always = lines
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

function parseEntry(entry) {
  const parts = entry.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const type = parts[0];
  const pattern = parts.slice(1).join(" ");
  return { type, pattern };
}

function matchesEntryPattern(toolName, command, entry) {
  const parsed = parseEntry(entry);
  if (!parsed) return false;

  const { type, pattern } = parsed;

  if (type === "bash") {
    if (!command) return false;
    return matchesAnyPrefix(command, [pattern]);
  } else if (type === "mcp") {
    return matchesMcpPattern(toolName, pattern);
  } else if (type === "write") {
    return ["Write", "Edit", "MultiEdit"].includes(toolName) && toolName === pattern;
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
const command = toolName === "Bash" ? (toolInput.command || "").trim() : "";

// Check ask_always first - always ask regardless of target paths
for (const entry of settings.ask_always) {
  if (matchesEntryPattern(toolName, command, entry)) {
    const parsed = parseEntry(entry);
    const displayName = parsed ? `${parsed.type} ${parsed.pattern}` : entry;
    decide(
      "ask",
      [
        "常に確認が必要なコマンド/ツールです。",
        `entry: ${displayName}`,
        toolName === "Bash" ? `command: ${truncateForReason(command, 100)}` : `tool: ${toolName}`,
        "実行を許可しますか？"
      ].join("\n")
    );
    process.exit(0);
  }
}

// Check ask_outside_project - ask only if targeting outside project
for (const entry of settings.ask_outside_project) {
  if (matchesEntryPattern(toolName, command, entry)) {
    let outsideTargets = [];

    if (toolName === "Bash") {
      outsideTargets = findOutsideTargetsFromCommand(command, absProjectRoot);
    } else if (toolName.startsWith("mcp__")) {
      outsideTargets = findOutsideTargetsFromInput(toolInput, absProjectRoot);
    } else if (["Write", "Edit", "MultiEdit"].includes(toolName)) {
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
      for (const p of uniquePaths) {
        const absTarget = realOrResolve(p, absProjectRoot);
        if (!isInsideProject(absTarget, absProjectRoot)) {
          outsideTargets.push(absTarget);
        }
      }
    }

    if (outsideTargets.length > 0) {
      const parsed = parseEntry(entry);
      const displayName = parsed ? `${parsed.type} ${parsed.pattern}` : entry;
      decide(
        "ask",
        [
          "プロジェクト外に干渉する可能性があるコマンド/ツールです。",
          `entry: ${displayName}`,
          toolName === "Bash" ? `command: ${truncateForReason(command, 100)}` : `tool: ${toolName}`,
          `targets: ${outsideTargets.join(", ")}`,
          "実行を許可しますか？"
        ].join("\n")
      );
      process.exit(0);
    }

    // Matched entry but no outside targets - allow
    decide("allow", "Matched entry but no outside-project paths detected.");
    process.exit(0);
  }
}

// No matches in either list - allow
decide("allow", "Tool/command not in ask list.");
process.exit(0);
