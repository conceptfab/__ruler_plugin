const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const PANEL_FILES = [
  "RulerAnimator.jsx",
  "rulerAnimatorCore.js",
  "DimensionAnimator.jsx",
  "dimensionAnimatorCore.js",
  "DimensionLine.jsx",
  "dimensionLineCore.js",
];

function defaultScriptUiPanelsDirectory(platform, version) {
  if (platform === "darwin") {
    return path.posix.join(
      "/Applications",
      `Adobe After Effects ${version}`,
      "Scripts",
      "ScriptUI Panels",
    );
  }

  if (platform === "win32") {
    return path.win32.join(
      "C:\\Program Files\\Adobe",
      `Adobe After Effects ${version}`,
      "Support Files",
      "Scripts",
      "ScriptUI Panels",
    );
  }

  return "";
}

function installDirectory(env = process.env, platform = process.platform) {
  if (env.AE_SCRIPTUI_PANELS) {
    return path.resolve(env.AE_SCRIPTUI_PANELS);
  }

  return defaultScriptUiPanelsDirectory(platform, env.AE_VERSION || "2026");
}

function installPanel(options = {}) {
  const env = options.env || process.env;
  const platform = options.platform || process.platform;
  const projectRoot = options.projectRoot || PROJECT_ROOT;
  const sourceDirectory = path.join(projectRoot, "src");
  const destinationDirectory = installDirectory(env, platform);

  if (!destinationDirectory) {
    throw new Error(
      "Unsupported OS. Set AE_SCRIPTUI_PANELS to your After Effects ScriptUI Panels folder.",
    );
  }

  fs.mkdirSync(destinationDirectory, { recursive: true });

  for (const fileName of PANEL_FILES) {
    const sourcePath = path.join(sourceDirectory, fileName);
    const destinationPath = path.join(destinationDirectory, fileName);

    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Missing source file: ${sourcePath}`);
    }

    fs.copyFileSync(sourcePath, destinationPath);
    console.log(`Copied ${fileName} -> ${destinationPath}`);
  }

  console.log(`Installed After Effects animator panels to: ${destinationDirectory}`);
  return destinationDirectory;
}

if (require.main === module) {
  try {
    installPanel();
  } catch (error) {
    console.error(error.message || String(error));
    process.exit(1);
  }
}

module.exports = {
  PANEL_FILES,
  defaultScriptUiPanelsDirectory,
  installDirectory,
  installPanel,
};
