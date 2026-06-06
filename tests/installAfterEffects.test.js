const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PANEL_FILES,
  defaultScriptUiPanelsDirectory,
  installDirectory,
  installPanel,
} = require("../scripts/install-after-effects");

const PROJECT_ROOT = path.resolve(__dirname, "..");

test("install script copies all panel source files", () => {
  assert.deepEqual(PANEL_FILES, [
    "RulerAnimator.jsx",
    "rulerAnimatorCore.js",
    "DimensionAnimator.jsx",
    "dimensionAnimatorCore.js",
    "DimensionLine.jsx",
    "dimensionLineCore.js",
  ]);
});

test("every PANEL_FILES entry exists in src/", () => {
  for (const fileName of PANEL_FILES) {
    const sourcePath = path.join(PROJECT_ROOT, "src", fileName);
    assert.ok(fs.existsSync(sourcePath), `missing source file: ${sourcePath}`);
  }
});

test("installPanel copies every panel file with matching bytes and no extras", () => {
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), "ae-install-"));
  try {
    const result = installPanel({
      env: { AE_SCRIPTUI_PANELS: destination },
      platform: "darwin",
      projectRoot: PROJECT_ROOT,
    });
    assert.equal(result, path.resolve(destination));

    for (const fileName of PANEL_FILES) {
      const sourcePath = path.join(PROJECT_ROOT, "src", fileName);
      const copiedPath = path.join(destination, fileName);
      assert.ok(fs.existsSync(copiedPath), `not copied: ${fileName}`);
      assert.deepEqual(
        fs.readFileSync(copiedPath),
        fs.readFileSync(sourcePath),
        `byte mismatch: ${fileName}`,
      );
    }

    // Only the allowlisted files land — no stray content shipped.
    assert.deepEqual(fs.readdirSync(destination).sort(), [...PANEL_FILES].sort());
  } finally {
    fs.rmSync(destination, { recursive: true, force: true });
  }
});

test("installPanel throws when a required source file is missing", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ae-src-"));
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), "ae-dest-"));
  try {
    fs.mkdirSync(path.join(projectRoot, "src"));
    // Provide only the first file, so a later one is missing.
    fs.writeFileSync(path.join(projectRoot, "src", PANEL_FILES[0]), "x");

    assert.throws(
      () =>
        installPanel({
          env: { AE_SCRIPTUI_PANELS: destination },
          platform: "darwin",
          projectRoot,
        }),
      /Missing source file/,
    );
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
    fs.rmSync(destination, { recursive: true, force: true });
  }
});

test("install script resolves default macOS After Effects 2026 panel directory", () => {
  assert.equal(
    defaultScriptUiPanelsDirectory("darwin", "2026"),
    "/Applications/Adobe After Effects 2026/Scripts/ScriptUI Panels",
  );
});

test("install script resolves default Windows After Effects 2026 panel directory", () => {
  assert.equal(
    defaultScriptUiPanelsDirectory("win32", "2026"),
    "C:\\Program Files\\Adobe\\Adobe After Effects 2026\\Support Files\\Scripts\\ScriptUI Panels",
  );
});

test("install script supports custom version and explicit destination override", () => {
  assert.equal(
    installDirectory({ AE_VERSION: "2025" }, "darwin"),
    "/Applications/Adobe After Effects 2025/Scripts/ScriptUI Panels",
  );

  assert.equal(
    installDirectory({ AE_SCRIPTUI_PANELS: "./custom-panels" }, "darwin"),
    path.resolve("./custom-panels"),
  );
});

test("the Python installer ships the same file allowlist as the JS installer", () => {
  const pySource = fs.readFileSync(
    path.join(PROJECT_ROOT, "scripts", "install-after-effects.py"),
    "utf8",
  );
  const match = pySource.match(/PANEL_FILES\s*=\s*\[([\s\S]*?)\]/);
  assert.ok(match, "PANEL_FILES list not found in install-after-effects.py");

  const pyFiles = match[1]
    .split(",")
    .map((entry) => entry.trim().replace(/^["']|["']$/g, ""))
    .filter((entry) => entry.length > 0);

  assert.deepEqual(pyFiles, PANEL_FILES);
});
