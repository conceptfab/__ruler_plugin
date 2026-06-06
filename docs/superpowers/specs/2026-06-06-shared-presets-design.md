# Shared Presets Across Ruler & Dimension Animator — Design

Date: 2026-06-06

## Problem

Ruler Animator and Dimension Animator each save/load their own preset files. A
preset saved by one plugin cannot be loaded by the other, because
`deserializePreset` rejects any file whose `type` field does not match that
plugin's own type string (`"ruler-animator-preset"` vs
`"dimension-animator-preset"`).

The two plugins already share an identical set of base-element styling fields.
Users want one preset to carry that shared styling between both plugins:
fields that don't exist in the loading plugin are dropped, base-element styling
carries over, and plugin-specific fields fall back to that plugin's defaults.

## Shared vs plugin-specific fields

Shared (base-element styling, identical keys in both cores):
`fitToComp`, `startFrame`, `endFrame`, `lineColor`, `lineWidth`, `pointSize`,
`pointFill`, `pointStroke`, `pointStrokeWidth`, `labelFont`, `labelAlign`,
`labelOrientation`, `labelColor`, `labelFontSize`, `labelOffsetX`,
`labelOffsetY`.

Ruler-only: `divisions`, `visibleStart`, `visibleEnd`, `labels`,
`showFinalLine`.

Dimension-only: `startValue`, `endValue`, `unit`, `decimals`, `count`,
`animateEndValue`, `jumpAt`.

## Why this is mostly already done

`normalizePresetValues` in both cores already whitelists to that plugin's
`PRESET_KEYS`, drops unknown keys, and fills gaps from `PRESET_DEFAULTS`. So
the "drop foreign fields / carry shared styling / default the rest" behavior is
already in place. The only blocker is the strict `type` equality check in
`deserializePreset`.

## Design

Decision: a single shared preset type, with legacy types still accepted on load.

### 1. Shared preset type (both cores)

```js
var PRESET_TYPE = "ae-measure-preset";        // written on Save
var ACCEPTED_TYPES = {                          // accepted on Load
  "ae-measure-preset": true,
  "ruler-animator-preset": true,                // legacy
  "dimension-animator-preset": true             // legacy
};
```

Both cores carry the same constants. The cores are intentionally duplicated
(ExtendScript loads each panel's core independently), so no shared module is
introduced.

### 2. `serializePreset`

Writes `PRESET_TYPE` (`"ae-measure-preset"`). No other change — each plugin
already serializes all of its own keys, so a saved file already contains the
shared styling fields.

### 3. `deserializePreset`

Replace the strict `parsed.type !== PRESET_TYPE` check with
`!ACCEPTED_TYPES[parsed.type]`. Everything else stays:
`normalizePresetValues` drops foreign keys and fills defaults, so cross-loaded
styling carries over and the loading plugin's specific fields fall back to its
defaults.

### 4. Error message

Reword to be type-agnostic, e.g. `"File is not a compatible measure preset."`.
Unknown/foreign types (e.g. `"other"`) are still rejected with this message.

### 5. Out of scope

- No refactor to share core code (cores stay duplicated by design).
- No UI changes in the panels (they don't reference the type string).
- Preset `version` stays `1`.

## Testing

- Update type-equality assertions to `"ae-measure-preset"` in both core tests.
- Update the Dimension test that asserted a Ruler preset is rejected — it is now
  accepted.
- Keep the "unknown type (`other`) is rejected" coverage in both.
- Add cross-load tests, both directions:
  - A Ruler-saved preset loaded by Dimension keeps shared styling
    (e.g. `lineColor`, `labelColor`) and uses Dimension defaults for
    Dimension-only fields (e.g. `startValue`), with no Ruler-only keys present.
  - A Dimension-saved preset loaded by Ruler keeps shared styling and uses
    Ruler defaults for Ruler-only fields (e.g. `divisions`).
