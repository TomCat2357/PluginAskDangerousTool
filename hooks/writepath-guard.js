#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Read settings from .claude/ask-dangerous-tool.local.md
 * Priority: project scope > user scope > defaults
 * Format: YAML frontmatter with write_allow_outside_project paths
 */
function loadSettings(projectRoot) {
  const defaults = {
    write_allow_outside_project: []
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

    // Parse write_allow_outside_project as YAML array
    const allowMatch = yaml.match(/write_allow_outside_project:\s*\r?\n((?:\s*-\s*.+\r?\n?)*)/);
    if (allowMatch) {
      const lines = allowMatch[1].split(/\r?\n/);
      settings.write_allow_outside_project = lines
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

function realOrResolve(p, baseDir) {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(baseDir, p);
  }
}

function isInsideProject(absTarget, absProjectRoot) {
  const rel = path.relative(absProjectRoot, absTarget);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

function isInAllowList(absTarget, allowList, absProjectRoot) {
  for (const pattern of allowList) {
    const absPattern = realOrResolve(pattern, absProjectRoot);
    // Check if target is inside allowed path or matches exactly
    const rel = path.relative(absPattern, absTarget);
    if (rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))) {
      return true;
    }
  }
  return false;
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

const input = readStdinJson();
const toolName = input.tool_name || "";
const toolInput = input.tool_input || {};

if (!["Write", "Edit", "MultiEdit"].includes(toolName)) {
  decide("allow", "Not a write/edit tool.");
  process.exit(0);
}

const projectRoot =
  process.env.CLAUDE_PROJECT_DIR ||
  process.env.PROJECT_DIR ||
  process.cwd();

const absProjectRoot = realOrResolve(projectRoot, process.cwd());
const settings = loadSettings(absProjectRoot);

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
  decide(
    "ask",
    `Could not determine target path(s) for ${toolName}. Continue?`
  );
  process.exit(0);
}

// Check each path
for (const p of uniquePaths) {
  const absTarget = realOrResolve(p, absProjectRoot);

  if (!isInsideProject(absTarget, absProjectRoot)) {
    // Outside project - check if in allow list
    if (isInAllowList(absTarget, settings.write_allow_outside_project, absProjectRoot)) {
      continue; // Allowed
    }

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

decide("allow", "All target paths are within the project root or in allow list.");
process.exit(0);
