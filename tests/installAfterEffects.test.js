const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");
const assert = require("node:assert/strict");

// The After Effects installer is the Python script scripts/install-after-effects.py.
// These tests drive that script directly (copy into a temp dir, then assert),
// rather than testing a JS module.
const PROJECT_ROOT = path.resolve(__dirname, "..");
const INSTALLER = path.join(PROJECT_ROOT, "scripts", "install-after-effects.py");

const EXPECTED_PANEL_FILES = [
  "RulerAnimator.jsx",
  "rulerAnimatorCore.js",
  "DimensionAnimator.jsx",
  "dimensionAnimatorCore.js",
  "DimensionLine.jsx",
  "dimensionLineCore.js",
];

function declaredPanelFiles() {
  const source = fs.readFileSync(INSTALLER, "utf8");
  const match = source.match(/PANEL_FILES\s*=\s*\[([\s\S]*?)\]/);
  assert.ok(match, "PANEL_FILES list not found in install-after-effects.py");
  return match[1]
    .split(",")
    .map((entry) => entry.trim().replace(/^["']|["']$/g, ""))
    .filter((entry) => entry.length > 0);
}

function findPython() {
  for (const exe of ["python3", "python"]) {
    try {
      execFileSync(exe, ["--version"], { stdio: "ignore" });
      return exe;
    } catch (error) {
      // try the next candidate
    }
  }
  return null;
}

const PYTHON = findPython();
const needsPython = PYTHON ? false : "python is not available on PATH";

function runInstaller(args, extraEnv) {
  const env = { ...process.env };
  delete env.AE_SCRIPTUI_PANELS;
  delete env.AE_VERSION;
  execFileSync(PYTHON, [INSTALLER, ...args], {
    env: { ...env, ...extraEnv },
    stdio: "ignore",
  });
}

test("the installer declares exactly the six panel files", () => {
  assert.deepEqual(declaredPanelFiles(), EXPECTED_PANEL_FILES);
});

test("every declared panel file exists in src/", () => {
  for (const fileName of EXPECTED_PANEL_FILES) {
    assert.ok(
      fs.existsSync(path.join(PROJECT_ROOT, "src", fileName)),
      `missing source file: ${fileName}`,
    );
  }
});

test(
  "the installer copies every panel file (via AE_SCRIPTUI_PANELS) with matching bytes and no extras",
  { skip: needsPython },
  () => {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), "ae-install-"));
    try {
      runInstaller([], { AE_SCRIPTUI_PANELS: dest });

      for (const fileName of EXPECTED_PANEL_FILES) {
        const copied = path.join(dest, fileName);
        assert.ok(fs.existsSync(copied), `not copied: ${fileName}`);
        assert.deepEqual(
          fs.readFileSync(copied),
          fs.readFileSync(path.join(PROJECT_ROOT, "src", fileName)),
          `byte mismatch: ${fileName}`,
        );
      }

      // Only the allowlisted files land — no stray content shipped.
      assert.deepEqual(fs.readdirSync(dest).sort(), [...EXPECTED_PANEL_FILES].sort());
    } finally {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  },
);

test(
  "the installer accepts an explicit destination argument",
  { skip: needsPython },
  () => {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), "ae-install-arg-"));
    try {
      runInstaller([dest], {});
      assert.deepEqual(fs.readdirSync(dest).sort(), [...EXPECTED_PANEL_FILES].sort());
    } finally {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  },
);
