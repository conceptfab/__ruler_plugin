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

test("panel uses readable production-oriented section labels", () => {
  const source = readPanel();

  assert.match(source, /Range/);
  assert.match(source, /Motion/);
  assert.match(source, /Appearance/);
  assert.match(source, /First label point/);
  assert.match(source, /Last label point/);
  assert.match(source, /Values/);
  assert.match(source, /Setup guide line/);
});

test("panel uses color picker buttons instead of hex-only color entry", () => {
  const source = readPanel();

  assert.match(source, /\$\.colorPicker\(\)/);
  assert.match(source, /addColorControl\(appearanceLeft, "Line color"/);
  assert.match(source, /addColorControl\(appearanceLeft, "Point fill"/);
  assert.match(source, /addColorControl\(appearanceRight, "Point stroke"/);
  assert.match(source, /addColorControl\(appearanceRight, "Text color"/);
  assert.match(source, /"Pick"/);
});

test("panel uses visible stepper controls for numeric visual controls", () => {
  const source = readPanel();

  assert.match(source, /addStepperEdit\(appearanceLeft, "Line width"/);
  assert.match(source, /addStepperEdit\(appearanceLeft, "Point size"/);
  assert.match(source, /addStepperEdit\(appearanceRight, "Stroke width"/);
  assert.match(source, /addStepperEdit\(appearanceRight, "Text size"/);
  assert.match(source, /addStepperEdit\(rangeRight, "Duration"/);
  assert.match(source, /decrementButton = row\.add\("button", undefined, "-"\)/);
  assert.match(source, /incrementButton = row\.add\("button", undefined, "\+"\)/);
});

test("panel exposes human text controls for font and alignment", () => {
  const source = readPanel();

  assert.match(source, /addFontControl\(appearanceRight, "Font"/);
  assert.match(source, /addAlignmentControl\(appearanceRight, "Text align"/);
  assert.match(source, /addTextOrientationControl\(appearanceRight, "Text direction"/);
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

test("panel constrains color rows so Pick buttons remain visible", () => {
  const source = readPanel();

  assert.match(source, /input\.preferredSize\.width = 82;/);
  assert.match(source, /button\.preferredSize\.width = 54;/);
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
  assert.match(source, /linear\(time, inPoint, inPoint \+ duration, startPercent, 100\);/);
});

test("panel shows the first labeled point at animation start", () => {
  const source = readPanel();

  assert.match(source, /if \(index <= startIndex\) \{/);
  assert.match(source, /var progress = linear\(time, inPoint, inPoint \+ duration, startIndex, endIndex\);/);
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
});
