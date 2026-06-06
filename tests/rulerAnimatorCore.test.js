const test = require("node:test");
const assert = require("node:assert/strict");

const core = require("../src/rulerAnimatorCore");

test("parseLabels trims comma separated labels and drops empty entries", () => {
  assert.deepEqual(core.parseLabels("80 cm, 100 cm, , 120 cm "), [
    "80 cm",
    "100 cm",
    "120 cm",
  ]);
});

test("labelSlotsForRange excludes the unlabeled start point", () => {
  assert.deepEqual(core.labelSlotsForRange(0, 3), [1, 2, 3]);
  assert.deepEqual(core.labelSlotsForRange(4, 6), [4, 5, 6]);
});

test("validateSettings accepts six divisions with visible points four through six", () => {
  const result = core.validateSettings({
    divisions: 6,
    visibleStart: 4,
    visibleEnd: 6,
    labels: ["80 cm", "100 cm", "120 cm"],
    fitToComp: true,
  });

  assert.deepEqual(result.errors, []);
});

test("validateSettings requires labels only for visible non-start points", () => {
  const result = core.validateSettings({
    divisions: 6,
    visibleStart: 0,
    visibleEnd: 2,
    labels: ["80 cm"],
    fitToComp: true,
  });

  assert.deepEqual(result.errors, [
    "Label count must match visible non-start points: expected 2, got 1.",
  ]);
});

test("validateSettings rejects invalid ranges", () => {
  const result = core.validateSettings({
    divisions: 6,
    visibleStart: 7,
    visibleEnd: 4,
    labels: [],
    fitToComp: true,
  });

  assert.equal(result.errors.includes("Visible point range must be inside 0...division count."), true);
  assert.equal(result.errors.includes("Visible point start must be less than or equal to visible point end."), true);
});

test("parseHexColor converts six digit hex colors to After Effects RGB floats", () => {
  assert.deepEqual(core.parseHexColor("#3366ff"), [0.2, 0.4, 1]);
  assert.deepEqual(core.parseHexColor("ffffff"), [1, 1, 1]);
});

test("nextPrefix returns the next available two digit ruler prefix", () => {
  const existing = [
    "Ruler_01_Controller",
    "Ruler_01_Line",
    "Ruler_02_Controller",
  ];

  assert.equal(core.nextPrefix(existing, "Ruler"), "Ruler_03");
});

test("serializePreset writes a typed, versioned snapshot and fills missing fields", () => {
  const json = core.serializePreset({ divisions: "6", labels: 'a "quoted" label' });
  const parsed = JSON.parse(json);

  assert.equal(parsed.type, "ae-measure-preset");
  assert.equal(parsed.version, 1);
  assert.equal(parsed.values.divisions, "6");
  assert.equal(parsed.values.labels, 'a "quoted" label');
  assert.equal(parsed.values.lineColor, "#2563eb");
  assert.equal(parsed.values.showFinalLine, true);
});

test("deserializePreset round-trips every field including quoted labels", () => {
  const values = {
    divisions: "8",
    visibleStart: "2",
    visibleEnd: "8",
    labels: 'a "quoted" label, b',
    fitToComp: false,
    startFrame: "0",
    endFrame: "60",
    showFinalLine: false,
    lineColor: "#112233",
    lineWidth: "5",
    pointSize: "30",
    pointFill: "#445566",
    pointStroke: "#778899",
    pointStrokeWidth: "3",
    labelFont: "ArialMT",
    labelAlign: "left",
    labelOrientation: "vertical",
    labelColor: "#aabbcc",
    labelFontSize: "40",
    labelOffsetX: "12",
    labelOffsetY: "-60",
  };

  const result = core.deserializePreset(core.serializePreset(values));

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.values, values);
});

test("deserializePreset rejects non-JSON without throwing", () => {
  const result = core.deserializePreset("this is not json {");

  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /valid JSON/);
});

test("deserializePreset rejects JSON with an unknown preset type", () => {
  const result = core.deserializePreset(JSON.stringify({ type: "other", values: {} }));

  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /compatible measure preset/);
});

test("deserializePreset accepts a Dimension preset, keeping shared styling and defaulting ruler-only fields", () => {
  const result = core.deserializePreset(JSON.stringify({
    type: "dimension-animator-preset",
    version: 1,
    values: {
      // shared styling that should carry over
      lineColor: "#112233",
      labelColor: "#aabbcc",
      pointFill: "#445566",
      // dimension-only fields that must be dropped
      startValue: "64",
      unit: " cm",
      count: false,
    },
  }));

  assert.deepEqual(result.errors, []);
  // shared styling carries over
  assert.equal(result.values.lineColor, "#112233");
  assert.equal(result.values.labelColor, "#aabbcc");
  assert.equal(result.values.pointFill, "#445566");
  // ruler-only fields fall back to ruler defaults
  assert.equal(result.values.divisions, "6");
  assert.equal(result.values.showFinalLine, true);
  // dimension-only fields are dropped
  assert.equal(result.values.startValue, undefined);
  assert.equal(result.values.unit, undefined);
});

test("deserializePreset fills defaults for missing fields and drops unknown keys", () => {
  const json = JSON.stringify({
    type: "ruler-animator-preset",
    version: 1,
    values: { divisions: "3", mysteryField: "ignored" },
  });
  const result = core.deserializePreset(json);

  assert.deepEqual(result.errors, []);
  assert.equal(result.values.divisions, "3");
  assert.equal(result.values.labelColor, "#92400e");
  assert.equal(result.values.mysteryField, undefined);
});

test("deserializePreset warns when the preset version is newer", () => {
  const result = core.deserializePreset(
    JSON.stringify({ type: "ruler-animator-preset", version: 99, values: {} })
  );

  assert.deepEqual(result.errors, []);
  assert.equal(result.warnings.length, 1);
});

test("serializePreset never returns empty (guards against blank save files)", () => {
  assert.ok(core.serializePreset({}).length > 0);
  assert.ok(core.serializePreset(undefined).length > 0);
});

test("serializePreset output parses with both the native and built-in parser", () => {
  const json = core.serializePreset({ labels: 'x "y" z', labelOffsetY: "-52", showFinalLine: false });

  // Output is standard JSON the native engine accepts...
  const native = JSON.parse(json);
  assert.equal(native.type, "ae-measure-preset");
  assert.equal(native.values.labels, 'x "y" z');
  assert.equal(native.values.showFinalLine, false);

  // ...and the dependency-free parser that runs inside After Effects agrees.
  const ours = core.deserializePreset(json);
  assert.deepEqual(ours.errors, []);
  assert.equal(ours.values.labels, 'x "y" z');
  assert.equal(ours.values.labelOffsetY, "-52");
  assert.equal(ours.values.showFinalLine, false);
});

test("deserializePreset reads hand-edited JSON (reordered keys, whitespace, BOM)", () => {
  const json =
    "﻿{\n\t\"values\" : { \"divisions\":\"9\" ,\n  \"labelAlign\" : \"right\" } ,\n" +
    "  \"version\": 1, \"type\":\"ruler-animator-preset\"\n}\n";
  const result = core.deserializePreset(json);

  assert.deepEqual(result.errors, []);
  assert.equal(result.values.divisions, "9");
  assert.equal(result.values.labelAlign, "right");
  assert.equal(result.values.endFrame, "60");
});
