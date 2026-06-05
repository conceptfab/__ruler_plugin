# After Effects Ruler Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dockable After Effects ScriptUI panel that creates animated ruler rigs between two nulls.

**Architecture:** The project has a small testable JavaScript core for parsing and validation, plus one ExtendScript panel file that includes the core and creates After Effects layers. The generated rig uses expressions so the line, points, and labels follow the start/end nulls after creation.

**Tech Stack:** ExtendScript, ScriptUI, After Effects layer/expression APIs, Node.js built-in test runner for local contract tests.

---

## File Structure

- `src/rulerAnimatorCore.js`: Pure JavaScript helpers shared by tests and the ExtendScript panel.
- `src/RulerAnimator.jsx`: Dockable ScriptUI panel installed into After Effects `ScriptUI Panels`.
- `tests/rulerAnimatorCore.test.js`: Node tests for parsing, validation, color parsing, and prefix generation.
- `tests/rulerAnimatorPanel.static.test.js`: Static contract tests for required panel behavior that cannot run outside After Effects.
- `README.md`: Installation and usage instructions.
- `package.json`: Node test script.

### Task 1: Project Shell And RED Tests

**Files:**
- Create: `package.json`
- Create: `tests/rulerAnimatorCore.test.js`
- Create: `tests/rulerAnimatorPanel.static.test.js`

- [ ] **Step 1: Write failing tests**

Create tests that require `src/rulerAnimatorCore.js` and read `src/RulerAnimator.jsx`. The tests must fail because those files do not exist yet.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test`

Expected: FAIL with a missing module or missing file error.

### Task 2: Core Helper Implementation

**Files:**
- Create: `src/rulerAnimatorCore.js`

- [ ] **Step 1: Implement helpers**

Implement:

- `parseLabels(input)`.
- `visibleIndices(start, end)`.
- `labelSlotsForRange(start, end)`, excluding start point `0`.
- `validateSettings(settings)`.
- `parseHexColor(input)`.
- `pad2(number)`.
- `nextPrefix(existingLayerNames, baseName)`.

- [ ] **Step 2: Run tests to verify GREEN**

Run: `npm test`

Expected: core tests PASS; panel static test may still fail until `src/RulerAnimator.jsx` exists.

### Task 3: ScriptUI Panel Implementation

**Files:**
- Create: `src/RulerAnimator.jsx`

- [ ] **Step 1: Implement panel UI**

Implement fields for divisions, visible range, label list, line style, point style, label style, animation duration, and `Show final line for positioning`.

- [ ] **Step 2: Implement rig creation**

Create controller null, start/end nulls, animated line shape layer, guide line layer, start point, selected point layers, and selected label text layers.

- [ ] **Step 3: Implement expressions**

Add expressions so line path, point positions, label positions, line reveal, and point/label opacity follow `Start`, `End`, and animation timing.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS.

### Task 4: Documentation

**Files:**
- Create: `README.md`

- [ ] **Step 1: Document installation**

Explain that `src/RulerAnimator.jsx` goes into After Effects `Scripts/ScriptUI Panels`.

- [ ] **Step 2: Document usage**

Document creating a rig, setting divisions/range/labels, using final line positioning, and updating selected rigs.

- [ ] **Step 3: Run final verification**

Run: `npm test`

Expected: PASS.
