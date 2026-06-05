# After Effects Ruler Panel Design

## Goal

Build a dockable After Effects ScriptUI panel for repeatedly creating animated ruler rigs between two null objects. The tool is meant for production use across many animations, so it should create predictable layer structures, expose reusable styling controls, and allow precise placement of the final ruler geometry.

## Platform

The first version will be a cross-platform ExtendScript/ScriptUI panel (`.jsx`) installed through After Effects `ScriptUI Panels`.

This is preferred over a native C++ plugin because the tool creates and controls composition layers rather than rendering pixels. It is preferred over a one-off script because the user needs repeated, adjustable use across many animations.

## Core Behavior

The panel creates a ruler rig in the active composition:

- Two nulls: `Ruler_Start_NULL` and `Ruler_End_NULL`.
- A shape layer for the line between those nulls.
- A styled start point at the start null.
- Optional styled points at selected division positions.
- Optional text labels for those selected points.

The line is drawn from the start null toward the end null during the animation. Division points are mathematical positions along the segment; they are not all rendered automatically. A point and its value label appear only when the animated line reaches that point.

Example:

- Divisions: `6`.
- Visible point range: `4` to `6`.
- Labels: `80 cm`, `100 cm`, `120 cm`.
- The start point is visible and stylable, but has no label.
- Point 4 and label `80 cm` appear when the line reaches division 4.
- Point 5 and label `100 cm` appear when the line reaches division 5.
- Point 6 and label `120 cm` appear when the line reaches the end.

## Panel Controls

The panel should include:

- `Create Ruler Rig` button.
- `Update Selected Rig` button, if a previously generated rig is selected.
- Division count input.
- Visible point start and visible point end inputs.
- Label values input, using a comma-separated list such as `80 cm, 100 cm, 120 cm`.
- Line color control.
- Line width control.
- Point size control.
- Point fill color control.
- Point stroke color/width controls.
- Text label styling controls for font size, color, and vertical offset.
- Animation duration or end-time control.
- `Show final line for positioning` option.

## Final Line Preview

The panel must include a `Show final line for positioning` option. When enabled, the rig shows the full final line as a positioning guide so the user can accurately place the start and end nulls at the final frame or final geometry state.

This preview must not change the animation contract:

- The render animation still draws the line from start to end.
- Points and labels still appear only when the animated line reaches their division position.
- The preview is a setup aid for precise geometry placement.

Implementation can use a separate guide layer, guide opacity, or an expression-controlled preview mode, as long as the final rendered behavior remains predictable.

## Layer And Naming Model

Each generated ruler should be grouped by a unique prefix, for example:

- `Ruler_01_Controller`
- `Ruler_01_Start_NULL`
- `Ruler_01_End_NULL`
- `Ruler_01_Line`
- `Ruler_01_Point_00`
- `Ruler_01_Point_04`
- `Ruler_01_Label_04`

The start point is point `00`. It uses the shared point style and has no default label.

The rig should be understandable in the timeline and safe to duplicate. If multiple rulers are created in one comp, each should receive a new numeric prefix.

## Data Flow

The panel reads user settings and creates the layer rig in the active comp. The generated layers use expressions where useful so moving `Start` and `End` updates the line and point positions without rebuilding the rig.

The panel should be able to rebuild or update a selected generated rig by rewriting settings and refreshing generated point/label layers.

## Error Handling

The panel should show a clear alert when:

- No active composition exists.
- Division count is less than `1`.
- Visible point range is outside `0...divisionCount`.
- Label count does not match the selected visible point count, excluding the unlabeled start point.
- The selected rig cannot be identified during update.

## Testing And Verification

Manual verification in After Effects should cover:

- Creating a rig in a new composition.
- Moving start and end nulls and confirming the line, points, and labels follow.
- Setting divisions to `6`, visible range to `4...6`, and labels to `80 cm, 100 cm, 120 cm`.
- Confirming the start point is visible, styled like other points, and unlabeled.
- Confirming each point and label appears only when the reveal reaches that point.
- Confirming `Show final line for positioning` displays the final line without breaking render animation.
- Creating multiple rulers in one composition and confirming unique names.
- Updating a selected generated rig.

## Out Of Scope For First Version

- Native C++ effects.
- UXP panel implementation.
- Automatic furniture geometry detection.
- Automatic label calculation from real-world units.
- Publishing to Adobe Exchange.
