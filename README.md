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
3. In `Range`, set `Divisions`, for example `6`.
4. Set `First label point` and `Last label point`, for example `4` and `6`.
5. Set `Values`, for example `80 cm, 100 cm, 120 cm`.
6. Adjust line, point, and label style in `Appearance`.
   Use `Pick` buttons for colors, choose label font from `Font`, set label anchoring with `Text align`,
   set label rotation with `Text direction`, and use `-` / `+` controls for widths, sizes, timing, and text offset.
7. Keep `Setup guide line` enabled while placing the ruler.
8. Click `Create Ruler`.
9. Move `Ruler_01_Start_NULL` and `Ruler_01_End_NULL` to set the final ruler geometry.

The generated line animates from start to end. Each selected point and label appears when the line reaches that point.

## Update A Rig

Select any generated layer from a ruler, change settings in the panel, then click `Update Selected Rig`.

The update recreates the selected rig while preserving the current start and end null positions.

## Test

```bash
npm test
```

The Node tests verify parsing, validation, naming, and static panel contracts. Full visual behavior still needs manual verification inside After Effects.
