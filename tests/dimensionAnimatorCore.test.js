const test = require("node:test");
const assert = require("node:assert/strict");

const core = require("../src/dimensionAnimatorCore");

function evaluateValueExpression(expression, options) {
  const effects = {
    "Start Value": options.startValue,
    "End Value": options.endValue,
    Decimals: options.decimals,
    "Jump At": options.jumpAt,
    Count: options.count ? 1 : 0,
    "Fit To Comp": options.fitToComp ? 1 : 0,
    "Start Frame": options.startFrame,
    "End Frame": options.endFrame,
  };

  const thisComp = {
    duration: options.duration,
    frameDuration: options.frameDuration,
    layer(name) {
      assert.equal(name, "Dim_01_Controller");
      return {
        effect(effectName) {
          return function property(propertyName) {
            assert.match(propertyName, /^(Slider|Checkbox)$/);
            return effects[effectName];
          };
        },
      };
    },
  };

  const linear = (time, t0, t1, v0, v1) => {
    if (time <= t0) {
      return v0;
    }
    if (time >= t1) {
      return v1;
    }
    return v0 + ((time - t0) / (t1 - t0)) * (v1 - v0);
  };

  return Function("time", "thisComp", "linear", `return eval(${JSON.stringify(expression)});`)(
    options.time,
    thisComp,
    linear,
  );
}

test("formatValue formats 0-3 decimals and negative values", () => {
  assert.equal(core.formatValue(12.49, 0), "12");
  assert.equal(core.formatValue(12.5, 1), "12.5");
  assert.equal(core.formatValue(12.345, 2), "12.35");
  assert.equal(core.formatValue(-2.3456, 3), "-2.346");
});

test("nextPrefix returns the next available dimension prefix", () => {
  assert.equal(core.nextPrefix(["Dim_01_Controller", "Dim_03_Line"], "Dim"), "Dim_04");
});

test("validateSettings rejects invalid frame and jump ranges", () => {
  const result = core.validateSettings({
    decimals: 4,
    jumpAt: 120,
    fitToComp: false,
    startFrame: 50,
    endFrame: 10,
  });

  assert.equal(result.errors.includes("Decimals must be 3 or less."), true);
  assert.equal(result.errors.includes("Jump At must be between 0 and 100."), true);
  assert.equal(result.errors.includes("End frame must be greater than start frame."), true);
});

test("serializePreset writes the dimension preset type and round-trips every field", () => {
  const values = {
    startValue: "64",
    endValue: "84",
    unit: ' cm "quoted"',
    decimals: "2",
    count: false,
    jumpAt: "75",
    fitToComp: false,
    startFrame: "12",
    endFrame: "48",
    lineColor: "#112233",
    lineWidth: "5",
    pointSize: "18",
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

  assert.equal(parsed.type, "dimension-animator-preset");
  assert.equal(parsed.version, 1);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.values, values);
});

test("deserializePreset rejects non-JSON and foreign preset types", () => {
  const badJson = core.deserializePreset("this is not json {");
  const wrongType = core.deserializePreset(JSON.stringify({ type: "ruler-animator-preset", values: {} }));

  assert.match(badJson.errors[0], /valid JSON/);
  assert.match(wrongType.errors[0], /Dimension Animator preset/);
});

test("deserializePreset fills defaults and drops unknown keys", () => {
  const result = core.deserializePreset(JSON.stringify({
    type: "dimension-animator-preset",
    version: 1,
    values: { startValue: "10", mysteryField: "ignored" },
  }));

  assert.deepEqual(result.errors, []);
  assert.equal(result.values.startValue, "10");
  assert.equal(result.values.unit, " cm");
  assert.equal(result.values.mysteryField, undefined);
});

test("buildValueExpression counts smoothly and clamps outside the timing window", () => {
  const expression = core.buildValueExpression({ prefix: "Dim_01", unit: " cm" });
  const base = {
    startValue: 64,
    endValue: 84,
    decimals: 1,
    count: true,
    jumpAt: 50,
    fitToComp: false,
    startFrame: 10,
    endFrame: 30,
    duration: 4,
    frameDuration: 0.1,
  };

  assert.equal(evaluateValueExpression(expression, { ...base, time: 0.5 }), "64.0 cm");
  assert.equal(evaluateValueExpression(expression, { ...base, time: 2 }), "74.0 cm");
  assert.equal(evaluateValueExpression(expression, { ...base, time: 4 }), "84.0 cm");
});

test("buildValueExpression jumps from start to end when Count is off", () => {
  const expression = core.buildValueExpression({ prefix: "Dim_01", unit: " m" });
  const base = {
    startValue: 80,
    endValue: 90,
    decimals: 0,
    count: false,
    jumpAt: 25,
    fitToComp: false,
    startFrame: 0,
    endFrame: 40,
    duration: 4,
    frameDuration: 0.1,
  };

  assert.equal(evaluateValueExpression(expression, { ...base, time: 0.9 }), "80 m");
  assert.equal(evaluateValueExpression(expression, { ...base, time: 1.1 }), "90 m");
});

test("buildStaticValueExpression reads the requested value effect", () => {
  const expression = core.buildStaticValueExpression({
    prefix: "Dim_01",
    effectName: "End Value",
    unit: " cm",
  });

  assert.match(expression, /effect\("End Value"\)\("Slider"\)/);
  assert.match(expression, /effect\("Decimals"\)\("Slider"\)/);
  assert.match(expression, /v\.toFixed\(dec\) \+ " cm"/);
});
