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
    duration: 1.2,
  });

  assert.deepEqual(result.errors, []);
});

test("validateSettings requires labels only for visible non-start points", () => {
  const result = core.validateSettings({
    divisions: 6,
    visibleStart: 0,
    visibleEnd: 2,
    labels: ["80 cm"],
    duration: 1.2,
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
    duration: 1.2,
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
