const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const panelPath = path.join(__dirname, "..", "src", "DimensionAnimator.jsx");

function readPanel() {
  return fs.readFileSync(panelPath, "utf8");
}

test("panel exposes the required dimension actions and preset actions", () => {
  const source = readPanel();

  assert.match(source, /Dimension Animator/);
  assert.match(source, /Create Dimension/);
  assert.match(source, /Update Selected/);
  assert.match(source, /Save Preset/);
  assert.match(source, /Load Preset/);
});

test("Update Selected rebuilds the selected rig while preserving Base, Value, and End nulls", () => {
  const source = readPanel();

  assert.match(source, /var positions = captureNullPositions\(comp, prefix\);/);
  assert.match(source, /removeRigLayers\(comp, prefix\);/);
  assert.match(source, /createRig\(comp, settings, prefix, positions\);/);
});

test("panel creates the required dimension layer names and Dim prefix", () => {
  const source = readPanel();

  assert.match(source, /core\.nextPrefix\(names, "Dim"\)/);
  assert.match(source, /_Controller/);
  assert.match(source, /_Base/);
  assert.match(source, /_Value/);
  assert.match(source, /_End/);
  assert.match(source, /_Line/);
  assert.match(source, /_BasePoint/);
  assert.match(source, /_ValuePoint/);
  assert.match(source, /_EndPoint/);
  assert.match(source, /_ValueLabel/);
  assert.match(source, /_EndLabel/);
});

test("controller carries live value, timing, and style controls", () => {
  const source = readPanel();

  assert.match(source, /addSlider\(controller, "Start Value", settings\.startValue\)/);
  assert.match(source, /addSlider\(controller, "End Value", settings\.endValue\)/);
  assert.match(source, /addSlider\(controller, "Decimals", settings\.decimals\)/);
  assert.match(source, /addSlider\(controller, "Jump At", settings\.jumpAt\)/);
  assert.match(source, /addCheckbox\(controller, "Count", settings\.count\)/);
  assert.match(source, /addCheckbox\(controller, "Fit To Comp", settings\.fitToComp\)/);
  assert.match(source, /addSlider\(controller, "Start Frame", settings\.startFrame\)/);
  assert.match(source, /addSlider\(controller, "End Frame", settings\.endFrame\)/);
  assert.match(source, /addSlider\(controller, "Line Width", settings\.lineWidth\)/);
  assert.match(source, /addSlider\(controller, "Point Size", settings\.pointSize\)/);
  assert.match(source, /addSlider\(controller, "Label Offset X", settings\.labelOffsetX\)/);
  assert.match(source, /addSlider\(controller, "Label Offset Y", settings\.labelOffsetY\)/);
});

test("static label text is written directly without Source Text expressions", () => {
  const source = readPanel();

  assert.match(source, /comp\.layers\.addText\(formatStaticLabel\(settings\.startValue, settings\)\)/);
  assert.match(source, /comp\.layers\.addText\(formatStaticLabel\(settings\.endValue, settings\)\)/);
  assert.doesNotMatch(source, /core\.buildStaticValueExpression/);
  assert.doesNotMatch(source, /core\.buildValueExpression/);
  assert.match(source, /dimensionAnimatorCore\.js/);
  assert.match(source, /\$\.evalFile\(coreFile\)/);
});

test("intermediate value label is always the fixed Start Value", () => {
  const source = readPanel();
  const start = source.indexOf("function createValueLabelLayer");
  const end = source.indexOf("function createEndLabelLayer");
  const valueLabelSource = source.slice(start, end);

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  assert.match(valueLabelSource, /comp\.layers\.addText\(formatStaticLabel\(settings\.startValue, settings\)\)/);
  assert.match(valueLabelSource, /layer\.name = prefix \+ "_ValueLabel"/);
  assert.doesNotMatch(valueLabelSource, /effectName: "End Value"/);
  assert.doesNotMatch(valueLabelSource, /linear\(time/);
});

test("end value label is written directly from End Value", () => {
  const source = readPanel();
  const start = source.indexOf("function createEndLabelLayer");
  const end = source.indexOf("function applyTextDocumentStyle");
  const endLabelSource = source.slice(start, end);

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  assert.match(endLabelSource, /comp\.layers\.addText\(formatStaticLabel\(settings\.endValue, settings\)\)/);
  assert.match(endLabelSource, /layer\.name = prefix \+ "_EndLabel"/);
  assert.doesNotMatch(endLabelSource, /effectName: "Start Value"/);
  assert.doesNotMatch(endLabelSource, /linear\(time/);
});

test("static label text is written as a fallback before Source Text expressions run", () => {
  const source = readPanel();

  assert.match(source, /function formatStaticLabel\(value, settings\)/);
  assert.match(source, /numeric\.toFixed\(decimals\) \+ \(settings\.unit \|\| ""\)/);
  assert.match(source, /comp\.layers\.addText\(formatStaticLabel\(settings\.startValue, settings\)\)/);
  assert.match(source, /comp\.layers\.addText\(formatStaticLabel\(settings\.endValue, settings\)\)/);
});

test("line, base point, value point, end point, and label positions are expression-driven from nulls", () => {
  const source = readPanel();

  assert.match(source, /path\.property\("ADBE Vector Shape"\)\.expression = linePathExpression\(prefix\)/);
  assert.match(source, /ellipse\.property\("ADBE Vector Ellipse Size"\)\.expression = pointSizeExpression\(prefix\)/);
  assert.match(source, /layer\.property\("Transform"\)\.property\("Position"\)\.expression = basePositionExpression\(prefix\)/);
  assert.match(source, /layer\.property\("Transform"\)\.property\("Position"\)\.expression = valuePositionExpression\(prefix\)/);
  assert.match(source, /layer\.property\("Transform"\)\.property\("Position"\)\.expression = endPositionExpression\(prefix\)/);
  assert.match(source, /layer\.property\("Transform"\)\.property\("Position"\)\.expression = valueLabelPositionExpression\(prefix\)/);
  assert.match(source, /layer\.property\("Transform"\)\.property\("Position"\)\.expression = endLabelPositionExpression\(prefix\)/);
  assert.match(source, /layer\.property\("Transform"\)\.property\("Opacity"\)\.expression = endRevealOpacityExpression\(prefix\)/);
  assert.match(source, /v \+ \[ctrl\.effect\("Label Offset X"\)\("Slider"\), ctrl\.effect\("Label Offset Y"\)\("Slider"\)\]/);
  assert.match(source, /e \+ \[ctrl\.effect\("Label Offset X"\)\("Slider"\), ctrl\.effect\("Label Offset Y"\)\("Slider"\)\]/);
  assert.doesNotMatch(source, /var mid = \(s \+ e\) \/ 2;/);
  assert.doesNotMatch(source, /var ratio =/);
  assert.doesNotMatch(source, /s \+ \(e - s\) \* ratio/);
  assert.doesNotMatch(source, /e \+ \(s - e\) \* ratio/);
});

test("endpoint is constrained to the Base-Value axis so the geometry stays collinear", () => {
  const source = readPanel();

  assert.match(source, /endNull\.property\("Transform"\)\.property\("Position"\)\.expression = endPositionConstraintExpression\(prefix\)/);
  assert.match(source, /function endPositionConstraintExpression\(prefix\)/);
  assert.match(source, /var axis = v - b;/);
  assert.match(source, /var t = \(\(raw\[0\] - b\[0\]\) \* axis\[0\] \+ \(raw\[1\] - b\[1\]\) \* axis\[1\]\) \/ len2;/);
  assert.match(source, /b \+ axis \* t;/);
});

test("dimension rig does not create an arrow head", () => {
  const source = readPanel();

  assert.doesNotMatch(source, /Arrow Size/);
  assert.doesNotMatch(source, /Arrow size/);
  assert.doesNotMatch(source, /End Arrow/);
  assert.doesNotMatch(source, /arrowPathExpression/);
  assert.doesNotMatch(source, /arrowPath/);
});

test("base, value, and end points are filled dots with a visible outline", () => {
  const source = readPanel();

  assert.match(source, /group\.name = "Base Point"/);
  assert.match(source, /group\.name = "Value Point"/);
  assert.match(source, /group\.name = "End Point"/);
  assert.match(source, /ADBE Vector Graphic - Fill/);
  assert.match(source, /ADBE Vector Graphic - Stroke/);
  assert.match(source, /ADBE Vector Fill Color"\)\.setValue\(settings\.pointFill\)/);
  assert.match(source, /ADBE Vector Stroke Color"\)\.setValue\(settings\.pointStroke\)/);
  assert.match(source, /ADBE Vector Stroke Width"\)\.setValue\(settings\.pointStrokeWidth\)/);
});

test("dimension line starts at Base to Value and reveals toward End with no trim filter", () => {
  const source = readPanel();

  assert.match(source, /thisComp\.layer\("' \+ prefix \+ '_Base"\)\.transform\.position/);
  assert.match(source, /thisComp\.layer\("' \+ prefix \+ '_Value"\)\.transform\.position/);
  assert.match(source, /var liveEnd = s \+ \(e - s\) \* progress;/);
  assert.match(source, /createPath\(\[\[b\[0\], b\[1\]\], \[s\[0\], s\[1\]\], \[liveEnd\[0\], liveEnd\[1\]\]\]/);
  assert.doesNotMatch(source, /ADBE Vector Filter - Trim/);
  assert.doesNotMatch(source, /lineRevealExpression/);
});

test("endpoint and end value are hidden on the first frame until reveal completes", () => {
  const source = readPanel();

  assert.match(source, /function endRevealProgressExpression\(prefix\)/);
  assert.match(source, /progress = linear\(time, t0, t1, 0, 1\);/);
  assert.match(source, /progress = time < jump \? 0 : 1;/);
  assert.match(source, /progress >= 1 \? 100 : 0;/);
  assert.match(source, /createEndPointLayer[\s\S]*Opacity"\)\.expression = endRevealOpacityExpression\(prefix\)/);
  assert.match(source, /createEndLabelLayer[\s\S]*Opacity"\)\.expression = endRevealOpacityExpression\(prefix\)/);
});

test("generated infrastructure is shy and uses one label colour", () => {
  const source = readPanel();

  assert.match(source, /controller\.label = 8;/);
  assert.match(source, /controller\.enabled = false;/);
  assert.match(source, /controller\.shy = true;/);
  assert.match(source, /baseNull\.label = 8;/);
  assert.match(source, /valueNull\.label = 8;/);
  assert.match(source, /endNull\.label = 8;/);
  assert.match(source, /layer\.label = 8;/);
  assert.doesNotMatch(source, /\.label = (5|9|10|11|12|13|14);/);
});

test("panel exposes the specified controls", () => {
  const source = readPanel();

  assert.match(source, /Start value/);
  assert.match(source, /End value/);
  assert.match(source, /Unit/);
  assert.match(source, /Decimals/);
  assert.match(source, /Count up/);
  assert.match(source, /Jump at \(%\)/);
  assert.match(source, /Fit animation to composition/);
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
  assert.match(source, /addColorControl\(lineColumn, "Point fill"/);
  assert.match(source, /addColorControl\(lineColumn, "Point stroke"/);
});

test("panel saves and loads Dimension presets through JSON dialogs", () => {
  const source = readPanel();

  assert.match(source, /File\.saveDialog\("Save dimension preset"/);
  assert.match(source, /File\.openDialog\("Load dimension preset"/);
  assert.match(source, /core\.serializePreset\(readPresetValues\(\)\)/);
  assert.match(source, /core\.deserializePreset\(readTextFile\(file\)\)/);
  assert.match(source, /file\.encoding = "UTF-8";/);
  assert.match(source, /Refusing to write an empty preset/);
});
