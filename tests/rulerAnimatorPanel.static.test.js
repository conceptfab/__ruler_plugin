const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const panelPath = path.join(__dirname, "..", "src", "RulerAnimator.jsx");

function readPanel() {
  return fs.readFileSync(panelPath, "utf8");
}

test("panel exposes the required creation and update actions", () => {
  const source = readPanel();

  assert.match(source, /Create Ruler/);
  assert.match(source, /Update Selected/);
});

test("Update Selected applies panel settings to the rig and preserves nulls", () => {
  const source = readPanel();

  // update rebuilds from the current panel settings while keeping the nulls
  assert.match(source, /var positions = captureNullPositions\(comp, prefix\);/);
  assert.match(source, /removeRigLayers\(comp, prefix\);/);
  assert.match(source, /createRig\(comp, settings, prefix, positions\);/);
});

test("a Range-section button pushes the panel timing onto the selected rig", () => {
  const source = readPanel();

  assert.match(source, /Apply timing to selected rig/);
  // it lives with the timing controls, not the bottom action row
  assert.match(source, /var fitButtonRow = rangeGroup\.add\("group"\)/);
  // it writes the panel's fit + start/end frame straight to the controller
  assert.match(source, /effects\.property\("Fit To Comp"\)/);
  assert.match(source, /effects\.property\("Start Frame"\)/);
  assert.match(source, /effects\.property\("End Frame"\)/);
  assert.match(source, /setValue\(fitToCompInput\.value \? 1 : 0\)/);
  assert.match(source, /setValue\(parseFloat\(endFrameInput\.text\) \|\| 0\)/);
  assert.doesNotMatch(source, /Load Selected/);
});

test("panel uses readable production-oriented section labels", () => {
  const source = readPanel();

  assert.match(source, /Range/);
  assert.match(source, /Motion/);
  assert.match(source, /Appearance/);
  assert.match(source, /Label points/);
  assert.match(source, /"Line & point"/);
  assert.match(source, /"Text"/);
  assert.match(source, /Values/);
  assert.match(source, /Setup guide line/);
});

test("panel offers color picking on every color row", () => {
  const source = readPanel();

  assert.match(source, /\$\.colorPicker\(\)/);
  assert.match(source, /addColorControl\(lineColumn, "Line color"/);
  assert.match(source, /addColorControl\(lineColumn, "Point fill"/);
  assert.match(source, /addColorControl\(lineColumn, "Point stroke"/);
  assert.match(source, /addColorControl\(textColumn, "Text color"/);
});

test("panel shows a color swatch next to each color field", () => {
  const source = readPanel();

  assert.match(source, /var swatch = row\.add\("panel"\)/);
  assert.match(source, /function paintSwatch\(\)/);
  assert.match(source, /core\.parseHexColor\(input\.text\)/);
  // the swatch itself opens the picker on click
  assert.match(source, /swatch\.addEventListener\("mousedown", pickColor\)/);
  // repaint is exposed so loading a preset can refresh the swatch
  assert.match(source, /input\.repaintSwatch = paintSwatch/);
});

test("panel uses visible stepper controls for numeric visual controls", () => {
  const source = readPanel();

  assert.match(source, /addStepperEdit\(lineColumn, "Line width"/);
  assert.match(source, /addStepperEdit\(lineColumn, "Point size"/);
  assert.match(source, /addStepperEdit\(lineColumn, "Stroke width"/);
  assert.match(source, /addStepperEdit\(textColumn, "Text size"/);
  // up/down arrow spinner stacked on the right, plus arrow-key support
  assert.match(source, /var spinner = row\.add\("group"\)/);
  assert.match(source, /spinner\.orientation = "column"/);
  assert.match(source, /upButton\.onClick/);
  assert.match(source, /downButton\.onClick/);
  assert.match(source, /addEventListener\("keydown"/);
});

test("panel exposes human text controls for font and alignment", () => {
  const source = readPanel();

  assert.match(source, /addFontControl\(textColumn, "Font"/);
  assert.match(source, /addAlignmentControl\(textColumn, "Text align"/);
  assert.match(source, /addTextOrientationControl\(textColumn, "Text direction"/);
  assert.match(source, /app\.fonts\.allFonts/);
  assert.match(source, /"Left"/);
  assert.match(source, /"Center"/);
  assert.match(source, /"Right"/);
  assert.match(source, /"Horizontal"/);
  assert.match(source, /"Vertical"/);
  assert.match(source, /"Along line"/);
});

test("panel reads selected font, text alignment, and direction into settings", () => {
  const source = readPanel();

  assert.match(source, /labelFont: selectedFontName\(labelFontInput\)/);
  assert.match(source, /labelJustification: selectedJustification\(labelAlignInput\)/);
  assert.match(source, /labelOrientation: selectedTextOrientation\(labelOrientationInput\)/);
  assert.match(source, /ParagraphJustification\.LEFT_JUSTIFY/);
  assert.match(source, /ParagraphJustification\.CENTER_JUSTIFY/);
  assert.match(source, /ParagraphJustification\.RIGHT_JUSTIFY/);
});

test("panel color rows use a clickable swatch and hex field, no extra button", () => {
  const source = readPanel();

  assert.match(source, /swatch\.preferredSize = \[32, 20\]/);
  assert.match(source, /swatch\.helpTip = "Click to pick a color"/);
  assert.doesNotMatch(source, /undefined, "Pick"/);
});

test("panel loads the core file relative to the panel file at runtime", () => {
  const source = readPanel();

  assert.match(source, /\$\.evalFile\(coreFile\)/);
  assert.match(source, /File\(\$\.fileName\)/);
});

test("panel reloads core fresh and verifies it (guards against a stale cached global)", () => {
  const source = readPanel();

  // The old short-circuit returned a cached global before reading the on-disk
  // core, so a stale version could shadow an updated file. It must be gone.
  assert.doesNotMatch(source, /if \(typeof RulerAnimatorCore !== "undefined"\) \{\s*return RulerAnimatorCore;/);
  assert.match(source, /var REQUIRED = \[/);
  assert.match(source, /rulerAnimatorCore\.js is outdated/);
});

test("panel includes final line positioning preview support", () => {
  const source = readPanel();

  assert.match(source, /Setup guide line/);
  assert.match(source, /guideLayer\s*=\s*true/);
});

test("panel keeps line layers in comp-space", () => {
  const source = readPanel();

  assert.match(source, /configureShapeLayerAtCompOrigin\(layer\)/);
  assert.doesNotMatch(source, /fromComp/);
});

test("panel draws the animated line from the start point to the visible end", () => {
  const source = readPanel();

  assert.match(source, /Visible End/);
  assert.match(source, /var endIndex = ctrl\.effect\("Visible End"\)\("Slider"\);/);
  assert.match(source, /var endPoint = s \+ \(e - s\) \* \(endIndex \/ divisions\);/);
  assert.match(source, /createPath\(\[\[s\[0\], s\[1\]\], \[endPoint\[0\], endPoint\[1\]\]\]/);
  assert.doesNotMatch(source, /var startPoint = s \+ \(e - s\) \* \(startIndex \/ divisions\);/);
});

test("panel starts the line reveal at the first labeled point", () => {
  const source = readPanel();

  assert.match(source, /var startPercent = endIndex > 0 \? \(startIndex \/ endIndex\) \* 100 : 0;/);
  assert.match(source, /linear\(time, t0, t1, startPercent, 100\);/);
});

test("panel shows the first labeled point at animation start", () => {
  const source = readPanel();

  assert.match(source, /if \(index <= startIndex\) \{/);
  assert.match(source, /var progress = linear\(time, t0, t1, startIndex, endIndex\);/);
});

test("panel offers fit-to-comp and an explicit start/end frame range", () => {
  const source = readPanel();

  // UI: a fit-to-comp checkbox plus start/end frame fields
  assert.match(source, /Fit animation to composition/);
  assert.match(source, /makeRow\(rangeGroup, "Frame range"\)/);
  assert.match(source, /var startFrameInput = framesRow\.add\("edittext"/);
  assert.match(source, /var endFrameInput = framesRow\.add\("edittext"/);
  assert.match(source, /function syncFramesEnabled\(\)/);

  // controller carries the timing as Fit To Comp / Start Frame / End Frame
  assert.match(source, /addCheckbox\(controller, "Fit To Comp", settings\.fitToComp\)/);
  assert.match(source, /addSlider\(controller, "Start Frame", settings\.startFrame\)/);
  assert.match(source, /addSlider\(controller, "End Frame", settings\.endFrame\)/);

  // expressions span the whole comp when fitting, else the chosen frame range
  assert.match(source, /var fit = ctrl\.effect\("Fit To Comp"\)\("Checkbox"\);/);
  assert.match(source, /fit > 0\.5 \? thisComp\.duration - thisComp\.frameDuration \* 2 : ctrl\.effect\("End Frame"\)\("Slider"\) \* thisComp\.frameDuration/);
  assert.doesNotMatch(source, /Animation Duration/);
});

test("panel creates the required ruler layer names", () => {
  const source = readPanel();

  assert.match(source, /_Controller/);
  assert.match(source, /_Start_NULL/);
  assert.match(source, /_End_NULL/);
  assert.match(source, /_Line/);
  assert.match(source, /_Point_/);
  assert.match(source, /_Label_/);
});

test("panel creates points from the visible range and labels non-zero points", () => {
  const source = readPanel();

  assert.match(source, /core\.visibleIndices\(settings\.visibleStart, settings\.visibleEnd\)/);
  assert.match(source, /index\s*===\s*0/);
  assert.match(source, /createLabelLayer/);
  assert.match(source, /createPointLayer\(comp, prefix, settings, 0\);/);
});

test("panel animates point and label opacity when the reveal reaches each division", () => {
  const source = readPanel();

  assert.match(source, /pointOpacityExpression/);
  assert.match(source, /linear\(progress,\s*index\s*-\s*0\.05,\s*index,\s*0,\s*100\)/);
});

test("panel builds label position as one vector expression with offset", () => {
  const source = readPanel();

  assert.doesNotMatch(source, /pointPositionExpression\(prefix,\s*divisions,\s*index\),\s*"\+ \[0,/);
  assert.match(source, /basePointPositionExpression/);
});

test("panel applies selected font and alignment to label text layers", () => {
  const source = readPanel();

  assert.match(source, /if \(settings\.labelFont\) \{/);
  assert.match(source, /doc\.font = settings\.labelFont;/);
  assert.match(source, /doc\.justification = settings\.labelJustification \|\| ParagraphJustification\.CENTER_JUSTIFY;/);
});

test("panel applies horizontal vertical or line-parallel rotation to label text layers", () => {
  const source = readPanel();

  assert.match(source, /applyLabelOrientation\(layer, prefix, settings\);/);
  assert.match(source, /settings\.labelOrientation === "vertical"/);
  assert.match(source, /rotation\.setValue\(90\);/);
  assert.match(source, /settings\.labelOrientation === "alongLine"/);
  assert.match(source, /rotation\.expression = labelAlongLineRotationExpression\(prefix\);/);
  assert.match(source, /Math\.atan2\(e\[1\] - s\[1\], e\[0\] - s\[0\]\)/);
  assert.match(source, /radiansToDegrees/);
});

test("panel exposes save and load preset actions backed by the core", () => {
  const source = readPanel();

  assert.match(source, /Save Preset/);
  assert.match(source, /Load Preset/);
  assert.match(source, /core\.serializePreset\(readPresetValues\(\)\)/);
  assert.match(source, /core\.deserializePreset\(readTextFile\(file\)\)/);
});

test("panel saves and loads presets through JSON file dialogs", () => {
  const source = readPanel();

  assert.match(source, /File\.saveDialog\("Save ruler preset"/);
  assert.match(source, /File\.openDialog\("Load ruler preset"/);
  assert.match(source, /function writeTextFile\(file, text\)/);
  assert.match(source, /function readTextFile\(file\)/);
  assert.match(source, /file\.encoding = "UTF-8";/);
});

test("panel write guards against producing an empty preset file", () => {
  const source = readPanel();

  assert.match(source, /Refusing to write an empty preset/);
  assert.match(source, /file\.lineFeed = "Unix";/);
  assert.match(source, /file\.length === 0/);
});

test("panel collects all values and re-selects dropdowns on load", () => {
  const source = readPanel();

  assert.match(source, /function readPresetValues\(\)/);
  assert.match(source, /function applyPresetValues\(values\)/);
  assert.match(source, /selectDropdownByProperty\(labelFontInput, "postScriptName", values\.labelFont\)/);
  assert.match(source, /selectDropdownByProperty\(labelAlignInput, "justificationName", values\.labelAlign\)/);
  assert.match(source, /selectDropdownByProperty\(labelOrientationInput, "orientationName", values\.labelOrientation\)/);
  // loading a preset repaints the color swatches (programmatic .text won't)
  assert.match(source, /refreshColorSwatch\(lineColorInput\)/);
});
