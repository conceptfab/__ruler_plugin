const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PANEL_FILES,
  defaultScriptUiPanelsDirectory,
  installDirectory,
} = require("../scripts/install-after-effects");

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
