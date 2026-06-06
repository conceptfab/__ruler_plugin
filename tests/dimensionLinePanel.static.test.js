const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const panelPath = path.join(__dirname, "..", "src", "DimensionLine.jsx");

function readPanel() {
  return fs.readFileSync(panelPath, "utf8");
}

test("panel exposes the required dimension line actions and preset actions", () => {
  const source = readPanel();

  assert.match(source, /Dimension Line/);
  assert.match(source, /Create Dimension Line/);
  assert.match(source, /Update Selected/);
  assert.match(source, /Save Preset/);
  assert.match(source, /Load Preset/);
});

test("panel loads its own core file", () => {
  const source = readPanel();

  assert.match(source, /dimensionLineCore\.js/);
  assert.match(source, /\$\.evalFile\(coreFile\)/);
  assert.match(source, /typeof DimensionLineCore/);
});

test("Update Selected rebuilds the selected rig while preserving Start and End nulls", () => {
  const source = readPanel();

  assert.match(source, /var positions = captureNullPositions\(comp, prefix\);/);
  assert.match(source, /removeRigLayers\(comp, prefix\);/);
  assert.match(source, /createRig\(comp, settings, prefix, positions\);/);
});

test("panel creates the required dimension line layer names and DimLine prefix", () => {
  const source = readPanel();

  assert.match(source, /core\.nextPrefix\(names, "DimLine"\)/);
  assert.match(source, /_Controller/);
  assert.match(source, /_Start/);
  assert.match(source, /_End/);
  assert.match(source, /_Line/);
  assert.match(source, /_StartPoint/);
  assert.match(source, /_EndPoint/);
  assert.match(source, /_Label/);
});

test("controller carries the value and style controls only (no timing/animation)", () => {
  const source = readPanel();

  assert.match(source, /addSlider\(controller, "Value", settings\.value\)/);
  assert.match(source, /addSlider\(controller, "Decimals", settings\.decimals\)/);
  assert.match(source, /addSlider\(controller, "Line Width", settings\.lineWidth\)/);
  assert.match(source, /addSlider\(controller, "Point Size", settings\.pointSize\)/);
  assert.match(source, /addSlider\(controller, "Label Offset X", settings\.labelOffsetX\)/);
  assert.match(source, /addSlider\(controller, "Label Offset Y", settings\.labelOffsetY\)/);
  assert.doesNotMatch(source, /addCheckbox/);
  assert.doesNotMatch(source, /"Fit To Comp"/);
  assert.doesNotMatch(source, /"Start Frame"/);
  assert.doesNotMatch(source, /"End Frame"/);
  assert.doesNotMatch(source, /"Jump At"/);
});

test("label fallback text is written directly, then a live Source Text expression runs", () => {
  const source = readPanel();

  assert.match(source, /comp\.layers\.addText\(formatStaticLabel\(settings\.value, settings\)\)/);
  assert.match(source, /source\.expression = core\.buildLabelExpression\(\{ prefix: prefix, unit: settings\.unit \}\)/);
  assert.match(source, /numeric\.toFixed\(decimals\) \+ \(settings\.unit \|\| ""\)/);
});

test("line, point, and label positions are expression-driven from the Start and End nulls", () => {
  const source = readPanel();

  assert.match(source, /path\.property\("ADBE Vector Shape"\)\.expression = linePathExpression\(prefix\)/);
  assert.match(source, /ellipse\.property\("ADBE Vector Ellipse Size"\)\.expression = pointSizeExpression\(prefix\)/);
  assert.match(source, /layer\.property\("Transform"\)\.property\("Position"\)\.expression = startPositionExpression\(prefix\)/);
  assert.match(source, /layer\.property\("Transform"\)\.property\("Position"\)\.expression = endPositionExpression\(prefix\)/);
  assert.match(source, /layer\.property\("Transform"\)\.property\("Position"\)\.expression = labelPositionExpression\(prefix\)/);
});

test("line path runs straight from Start to End and the label sits at the midpoint", () => {
  const source = readPanel();

  assert.match(source, /createPath\(\[\[s\[0\], s\[1\]\], \[e\[0\], e\[1\]\]\], \[\], \[\], false\)/);
  assert.match(source, /var mid = \(s \+ e\) \/ 2;/);
  assert.match(source, /mid \+ \[ctrl\.effect\("Label Offset X"\)\("Slider"\), ctrl\.effect\("Label Offset Y"\)\("Slider"\)\]/);
});

test("dimension line is static: no reveal progress, trim, or arrow head", () => {
  const source = readPanel();

  assert.doesNotMatch(source, /endRevealProgressExpression/);
  assert.doesNotMatch(source, /progress/);
  assert.doesNotMatch(source, /ADBE Vector Filter - Trim/);
  assert.doesNotMatch(source, /Arrow/);
  assert.doesNotMatch(source, /linear\(time/);
});

test("start and end points are filled dots with a visible outline", () => {
  const source = readPanel();

  assert.match(source, /group\.name = "Start Point"/);
  assert.match(source, /group\.name = "End Point"/);
  assert.match(source, /ADBE Vector Graphic - Fill/);
  assert.match(source, /ADBE Vector Graphic - Stroke/);
  assert.match(source, /ADBE Vector Fill Color"\)\.setValue\(settings\.pointFill\)/);
  assert.match(source, /ADBE Vector Stroke Color"\)\.setValue\(settings\.pointStroke\)/);
  assert.match(source, /ADBE Vector Stroke Width"\)\.setValue\(settings\.pointStrokeWidth\)/);
});

test("generated infrastructure is shy and uses one label colour", () => {
  const source = readPanel();

  assert.match(source, /controller\.label = 8;/);
  assert.match(source, /controller\.enabled = false;/);
  assert.match(source, /controller\.shy = true;/);
  assert.match(source, /startNull\.label = 8;/);
  assert.match(source, /endNull\.label = 8;/);
  assert.match(source, /layer\.label = 8;/);
  assert.doesNotMatch(source, /\.label = (5|9|10|11|12|13|14);/);
});

test("panel exposes the specified controls", () => {
  const source = readPanel();

  assert.match(source, /"Value"/);
  assert.match(source, /Unit/);
  assert.match(source, /Decimals/);
  assert.match(source, /Line color/);
  assert.match(source, /Line width/);
  assert.match(source, /Point size/);
  assert.match(source, /Point fill/);
  assert.match(source, /Point stroke/);
  assert.match(source, /Stroke width/);
  assert.match(source, /Font/);
  assert.match(source, /Text align/);
  assert.match(source, /Text direction/);
  assert.match(source, /Text color/);
  assert.match(source, /Text size/);
  assert.match(source, /Text X offset/);
  assert.match(source, /Text Y offset/);
});

test("panel offers font, alignment, direction, swatches, and color picker", () => {
  const source = readPanel();

  assert.match(source, /app\.fonts\.allFonts/);
  assert.match(source, /ParagraphJustification\.LEFT_JUSTIFY/);
  assert.match(source, /ParagraphJustification\.CENTER_JUSTIFY/);
  assert.match(source, /ParagraphJustification\.RIGHT_JUSTIFY/);
  assert.match(source, /"Horizontal"/);
  assert.match(source, /"Vertical"/);
  assert.match(source, /"Along line"/);
  assert.match(source, /\$\.colorPicker\(\)/);
  assert.match(source, /var swatch = row\.add\("panel"\)/);
  assert.match(source, /swatch\.addEventListener\("mousedown", pickColor\)/);
});

test("panel saves and loads presets through the shared JSON dialogs", () => {
  const source = readPanel();

  assert.match(source, /File\.saveDialog\("Save dimension line preset"/);
  assert.match(source, /File\.openDialog\("Load dimension line preset"/);
  assert.match(source, /core\.serializePreset\(readPresetValues\(\)\)/);
  assert.match(source, /core\.deserializePreset\(readTextFile\(file\)\)/);
  assert.match(source, /file\.encoding = "UTF-8";/);
  assert.match(source, /Refusing to write an empty preset/);
});
