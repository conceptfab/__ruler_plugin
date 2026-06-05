# After Effects Ruler Animator

Dockable ScriptUI panel for Adobe After Effects. It creates an animated ruler between two null objects:

- line drawn from `Start` to `End`,
- stylable start point without a label,
- selected division points with labels such as `80 cm, 100 cm, 120 cm`,
- point and label reveal when the animated line reaches their division,
- optional final guide line for precise positioning.

## Install

Run the installer script to copy both files from `src/` into After Effects `Scripts/ScriptUI Panels`:

```bash
npm run install:ae
```

By default the script targets After Effects 2026.

Use another version:

```bash
AE_VERSION=2025 npm run install:ae
```

Use a custom ScriptUI Panels folder:

```bash
AE_SCRIPTUI_PANELS="/path/to/ScriptUI Panels" npm run install:ae
```

The script copies:

- `src/RulerAnimator.jsx`
- `src/rulerAnimatorCore.js`

Manual macOS copy:

```bash
cp src/RulerAnimator.jsx src/rulerAnimatorCore.js "/Applications/Adobe After Effects 2026/Scripts/ScriptUI Panels/"
```

Manual Windows copy:

```powershell
Copy-Item src\RulerAnimator.jsx, src\rulerAnimatorCore.js "C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\Scripts\ScriptUI Panels\"
```

Restart After Effects, then open:

`Window > Ruler Animator.jsx`

## Use

1. Open a composition.
2. Open the `Ruler Animator` panel.
3. In `Range`, set `Divisions` (e.g. `6`) and `Label points` (e.g. `4` to `6`). Point `0` is the start point — always visible, styled, never labeled.
4. Set `Values`, e.g. `80 cm, 100 cm, 120 cm` — one label per visible non-start point.
5. **Timing:** leave `Fit animation to composition` checked to span the whole comp, or uncheck it and set a `Frame range` (start / end frame).
6. Adjust style in `Appearance`. Click a color **swatch** to open the picker; choose the label `Font`, `Text align` and `Text direction`; use the `▲`/`▼` steppers (or arrow keys in the field) for widths, sizes and offsets.
7. Keep `Setup guide line` enabled while placing the ruler.
8. Click `Create Ruler`.
9. Move `Ruler_01_Start_NULL` and `Ruler_01_End_NULL` to set the final ruler geometry.

The generated line animates from start to end; each selected point and label appears when the line reaches it.

## Update a rig

- **Change settings:** select any layer of the rig, adjust the panel, then click `Update Selected` — it rebuilds the rig with the new settings while preserving the Start/End null positions.
- **Change only the timing:** set `Fit animation to composition` / `Frame range`, select a rig layer, then click `Apply timing to selected rig` — it writes the timing straight onto the rig without rebuilding.

## Presets

`Save Preset` writes all panel settings to a `.json` file; `Load Preset` reads one back into the panel. Saving requires After Effects' *Preferences → Scripting & Expressions → Allow Scripts to Write Files and Access Network* to be enabled.

## Test

```bash
npm test
```

The Node tests verify parsing, validation, naming, and static panel contracts. Full visual behavior still needs manual verification inside After Effects.
