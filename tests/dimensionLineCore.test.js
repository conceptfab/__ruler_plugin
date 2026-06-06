const test = require("node:test");
const assert = require("node:assert/strict");

const core = require("../src/dimensionLineCore");
const rulerCore = require("../src/rulerAnimatorCore");
const dimensionCore = require("../src/dimensionAnimatorCore");

// Mimic an After Effects property object: arithmetic works through valueOf, but
// there is no toFixed method — so the label expression MUST coerce with
// Number(...) before calling toFixed. A regression that drops Number() throws.
function aeProperty(value) {
  return { valueOf: function () { return value; } };
}

function evaluateLabelExpression(expression, options) {
  const effects = {
    Value: aeProperty(options.value),
    Decimals: aeProperty(options.decimals),
  };
  const thisComp = {
    layer(name) {
      assert.equal(name, "DimLine_01_Controller");
      return {
        effect(effectName) {
          return function property(propertyName) {
            assert.equal(propertyName, "Slider");
            return effects[effectName];
          };
        },
      };
    },
  };

  return Function("thisComp", `return eval(${JSON.stringify(expression)});`)(thisComp);
}

test("nextPrefix increments the highest existing DimLine index", () => {
  assert.equal(core.nextPrefix([], "DimLine"), "DimLine_01");
  assert.equal(
    core.nextPrefix(["DimLine_01_Line", "DimLine_03_Label", "Other_02_x"], "DimLine"),
    "DimLine_04"
  );
});

test("parseHexColor returns normalized rgb and falls back to white", () => {
  assert.deepEqual(core.parseHexColor("#2563eb"), [0.1451, 0.3882, 0.9216]);
  assert.deepEqual(core.parseHexColor("nope"), [1, 1, 1]);
});

test("formatValue clamps decimals between 0 and 3", () => {
  assert.equal(core.formatValue("12.3456", "2"), "12.35");
  assert.equal(core.formatValue("12.3456", "9"), "12.346");
  assert.equal(core.formatValue("12.3456", "-1"), "12");
});

test("buildLabelExpression reads live sliders and bakes the unit literal", () => {
  const expression = core.buildLabelExpression({ prefix: "DimLine_01", unit: " cm" });

  assert.match(expression, /thisComp\.layer\("DimLine_01_Controller"\)/);
  assert.match(expression, /ctrl\.effect\("Value"\)\("Slider"\)/);
  assert.match(expression, /Math\.max\(0, Math\.min\(3, Math\.round\(ctrl\.effect\("Decimals"\)\("Slider"\)\)\)\)/);
  assert.match(expression, /Number\(v\)\.toFixed\(dec\) \+ " cm";/);
});

test("serializePreset writes the shared type and round-trips every field", () => {
  const values = {
    value: "100",
    unit: ' cm "quoted"',
    decimals: "2",
    lineColor: "#112233",
    lineWidth: "5",
    pointSize: "20",
    pointFill: "#445566",
    pointStroke: "#ffffff",
    pointStrokeWidth: "3",
    labelFont: "ArialMT",
    labelAlign: "right",
    labelOrientation: "alongLine",
    labelColor: "#aabbcc",
    labelFontSize: "40",
    labelOffsetX: "10",
    labelOffsetY: "-20",
  };

  const json = core.serializePreset(values);
  const parsed = JSON.parse(json);
  const result = core.deserializePreset(json);

  assert.equal(parsed.type, "ae-measure-preset");
  assert.equal(parsed.version, 1);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.values, values);
});

test("deserializePreset rejects non-JSON and unknown preset types", () => {
  const badJson = core.deserializePreset("this is not json {");
  const wrongType = core.deserializePreset(JSON.stringify({ type: "other", values: {} }));

  assert.match(badJson.errors[0], /valid JSON/);
  assert.match(wrongType.errors[0], /compatible measure preset/);
});

test("deserializePreset accepts the shared type and both legacy types", () => {
  for (const type of ["ae-measure-preset", "ruler-animator-preset", "dimension-animator-preset"]) {
    const result = core.deserializePreset(JSON.stringify({ type, version: 1, values: {} }));
    assert.deepEqual(result.errors, [], `type ${type} should be accepted`);
  }
});

test("deserializePreset fills defaults and drops unknown keys", () => {
  const result = core.deserializePreset(JSON.stringify({
    type: "ae-measure-preset",
    version: 1,
    values: { value: "42", mysteryField: "ignored" },
  }));

  assert.deepEqual(result.errors, []);
  assert.equal(result.values.value, "42");
  assert.equal(result.values.unit, " cm");
  assert.equal(result.values.mysteryField, undefined);
});

test("deserializePreset reads a Ruler preset, keeping shared styling and dropping ruler-only fields", () => {
  const result = core.deserializePreset(JSON.stringify({
    type: "ruler-animator-preset",
    version: 1,
    values: {
      lineColor: "#112233",
      labelColor: "#aabbcc",
      pointFill: "#445566",
      labelFontSize: "48",
      divisions: "6",
      labels: "80 cm, 100 cm",
      showFinalLine: false,
    },
  }));

  assert.deepEqual(result.errors, []);
  // shared styling carries over
  assert.equal(result.values.lineColor, "#112233");
  assert.equal(result.values.labelColor, "#aabbcc");
  assert.equal(result.values.pointFill, "#445566");
  assert.equal(result.values.labelFontSize, "48");
  // dimension-line-only / content fields fall back to defaults
  assert.equal(result.values.value, "100");
  assert.equal(result.values.unit, " cm");
  // ruler-only fields are dropped
  assert.equal(result.values.divisions, undefined);
  assert.equal(result.values.showFinalLine, undefined);
});

test("deserializePreset reads a Dimension preset, also carrying unit and decimals", () => {
  const result = core.deserializePreset(JSON.stringify({
    type: "dimension-animator-preset",
    version: 1,
    values: {
      lineColor: "#0a0b0c",
      unit: " mm",
      decimals: "2",
      startValue: "64",
      endValue: "84",
      jumpAt: "75",
    },
  }));

  assert.deepEqual(result.errors, []);
  assert.equal(result.values.lineColor, "#0a0b0c");
  // unit/decimals are shared content keys and transfer
  assert.equal(result.values.unit, " mm");
  assert.equal(result.values.decimals, "2");
  // dimension-only fields are dropped, value defaults
  assert.equal(result.values.value, "100");
  assert.equal(result.values.startValue, undefined);
  assert.equal(result.values.jumpAt, undefined);
});

test("deserializePreset warns when the preset version is newer", () => {
  const result = core.deserializePreset(
    JSON.stringify({ type: "ae-measure-preset", version: 99, values: {} })
  );

  assert.deepEqual(result.errors, []);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /newer version/);
});

test("validateSettings reports out-of-range decimals and normalizes settings", () => {
  const ok = core.validateSettings({ value: "100", unit: " cm", decimals: "2" });
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(ok.settings, { value: 100, unit: " cm", decimals: 2 });

  const bad = core.validateSettings({ value: "x", unit: " cm", decimals: "9" });
  assert.equal(bad.errors.length, 1);
  assert.match(bad.errors[0], /3 or less/);
  assert.equal(bad.settings.value, 0);
});

test("serializePreset never returns empty (guards against blank save files)", () => {
  assert.ok(core.serializePreset({}).length > 0);
  assert.ok(core.serializePreset(undefined).length > 0);
});

test("buildLabelExpression renders value with decimals and unit, coercing the slider", () => {
  const expression = core.buildLabelExpression({ prefix: "DimLine_01", unit: " cm" });

  assert.equal(evaluateLabelExpression(expression, { value: 123.456, decimals: 2 }), "123.46 cm");
  assert.equal(evaluateLabelExpression(expression, { value: 100, decimals: 0 }), "100 cm");
  // Decimals clamp to 3 even if the slider is dragged past it.
  assert.equal(evaluateLabelExpression(expression, { value: 1.23456, decimals: 9 }), "1.235 cm");
});

test("buildLabelExpression escapes line separators in the unit (no expression break)", () => {
  const expression = core.buildLabelExpression({ unit: "\u2028\nX" });

  assert.match(expression, /\\u2028/);
  assert.match(expression, /\\n/);
  assert.doesNotThrow(() => new Function(expression));
});

test("validateSettings accepts the 0 and 3 decimals boundaries and rejects negatives", () => {
  assert.deepEqual(core.validateSettings({ value: "1", decimals: "0" }).errors, []);
  assert.deepEqual(core.validateSettings({ value: "1", decimals: "3" }).errors, []);

  const low = core.validateSettings({ value: "1", decimals: "-1" });
  assert.equal(low.errors.length, 1);
  assert.match(low.errors[0], /0 or greater/);
});

test("a Dimension Line preset loads into Ruler and Dimension, carrying shared styling", () => {
  const json = core.serializePreset({
    value: "250",
    unit: " mm",
    decimals: "2",
    lineColor: "#123456",
    labelColor: "#654321",
    pointFill: "#abcdef",
    labelFontSize: "44",
  });

  const intoRuler = rulerCore.deserializePreset(json);
  assert.deepEqual(intoRuler.errors, []);
  assert.equal(intoRuler.values.lineColor, "#123456");
  assert.equal(intoRuler.values.labelColor, "#654321");
  assert.equal(intoRuler.values.pointFill, "#abcdef");
  assert.equal(intoRuler.values.labelFontSize, "44");
  assert.equal(intoRuler.values.value, undefined); // Dimension Line-only content key is dropped

  const intoDimension = dimensionCore.deserializePreset(json);
  assert.deepEqual(intoDimension.errors, []);
  assert.equal(intoDimension.values.lineColor, "#123456");
  assert.equal(intoDimension.values.unit, " mm"); // shared content keys transfer
  assert.equal(intoDimension.values.decimals, "2");
  assert.equal(intoDimension.values.value, undefined);
});
