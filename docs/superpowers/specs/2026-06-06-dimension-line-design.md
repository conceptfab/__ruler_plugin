# Dimension Line plugin — Design

Date: 2026-06-06

## Goal

A third After Effects ScriptUI plugin, built on the existing Ruler/Dimension
Animator patterns: a classic dimension line. Two draggable endpoints, a dot at
each end, and a single manually-entered value centred on the line. Static (no
timing animation). Crucially, it shares the styling system with the other two
plugins so base-element styling transfers via presets.

## Decisions (from brainstorming)

- Value: manually entered (number + unit + decimals). Static, independent of
  line length.
- No animation. No timing fields.
- Name: "Dimension Line". Files `DimensionLine.jsx` / `dimensionLineCore.js`.
  Layer prefix `DimLine`.
- Label orientation: full set (horizontal / vertical / along line).

## Files

New, no changes to existing plugins:

- `src/DimensionLine.jsx` — ScriptUI panel
- `src/dimensionLineCore.js` — pure, testable core (Node + ExtendScript)
- `tests/dimensionLineCore.test.js`
- `tests/dimensionLinePanel.static.test.js`
- Installer entry in `scripts/install-after-effects.py`

## Rig (prefix `DimLine_NN_`)

- `_Controller` — null holding sliders: `Value`, `Decimals`, `Line Width`,
  `Point Size`, `Label Offset X`, `Label Offset Y`. `unit` is compiled into the
  label expression (same approach as Dimension Animator), not a slider.
- `_Start`, `_End` — position nulls, draggable.
- `_Line` — shape layer; path is an expression connecting `_Start` and `_End`;
  stroke colour/width from style; round line caps.
- `_StartPoint`, `_EndPoint` — shape layers (ellipses); position bound to the
  matching null; size/fill/stroke from style.
- `_Label` — text layer; positioned at the line midpoint plus a perpendicular
  offset (`Label Offset X/Y`); text expression renders
  `value.toFixed(decimals) + unit`; orientation horizontal / vertical / along
  line (rotation matches the line angle for "along line").

Panel buttons: Create Dimension Line, Update Selected (preserves endpoint
positions), Save Preset, Load Preset.

## Style compatibility (core requirement)

The core uses the shared `PRESET_TYPE = "ae-measure-preset"` and the same
`ACCEPTED_TYPES` map (`ae-measure-preset`, `ruler-animator-preset`,
`dimension-animator-preset`).

Styling keys are byte-identical in name to Ruler/Dimension so they transfer:
`lineColor`, `lineWidth`, `pointSize`, `pointFill`, `pointStroke`,
`pointStrokeWidth`, `labelFont`, `labelAlign`, `labelOrientation`,
`labelColor`, `labelFontSize`, `labelOffsetX`, `labelOffsetY`.

Reused content keys, semantically identical to Dimension Animator (so they also
transfer): `unit`, `decimals`.

Plugin-specific content key: `value` (the displayed number). Content, not style;
when importing a foreign preset it falls back to its default. `normalizePresetValues`
already drops unknown keys and fills defaults, so cross-loading works both
directions: load a Ruler/Dimension preset and the shared styling carries over
while unsupported fields are skipped.

### PRESET_KEYS

```
value, unit, decimals,
lineColor, lineWidth, pointSize, pointFill, pointStroke, pointStrokeWidth,
labelFont, labelAlign, labelOrientation, labelColor, labelFontSize,
labelOffsetX, labelOffsetY
```

### PRESET_DEFAULTS (styling matches the other plugins' shared defaults)

```
value: "100", unit: " cm", decimals: "0",
lineColor: "#2563eb", lineWidth: "4",
pointSize: "18", pointFill: "#2563eb", pointStroke: "#ffffff", pointStrokeWidth: "4",
labelFont: "", labelAlign: "center", labelOrientation: "horizontal",
labelColor: "#111827", labelFontSize: "36", labelOffsetX: "0", labelOffsetY: "-52"
```

## Out of scope (YAGNI)

- No timing/animation fields (`fitToComp`, `startFrame`, `endFrame`, `count`,
  `jumpAt`, `animateEndValue`).
- No auto-measured length (value is manual).
- No refactor to share core code; cores stay duplicated by design (ExtendScript
  loads each panel's core independently).

## Testing

Core (`dimensionLineCore.test.js`):
- `serializePreset` writes `ae-measure-preset`, round-trips every field.
- `deserializePreset` accepts all three types; rejects unknown type and non-JSON.
- Fills defaults for missing fields, drops unknown keys.
- Cross-load: a Ruler/Dimension preset keeps shared styling, Dimension
  Line-specific fields default.
- `validateSettings` clamps/validates `decimals` (0–3).
- Label value expression renders value with decimals and unit.

Panel static (`dimensionLinePanel.static.test.js`):
- Panel builds all controls; `readPresetValues`/`applyPresetValues` round-trip.
- Save/Load through mocked file dialogs.
- Guards against writing an empty preset.
