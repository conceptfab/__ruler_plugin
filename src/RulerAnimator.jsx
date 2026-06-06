(function rulerAnimatorPanel(thisObj) {
  function loadCore() {
    var REQUIRED = ["serializePreset", "deserializePreset", "validateSettings", "nextPrefix"];

    // Always reload the core that sits next to this panel. After Effects keeps
    // ExtendScript globals alive across panel reloads, so an older RulerAnimatorCore
    // cached from an earlier session must not be allowed to shadow an updated file.
    if ($.fileName) {
      var panelFile = File($.fileName);
      var coreFile = File(panelFile.parent.fsName + "/rulerAnimatorCore.js");
      if (coreFile.exists) {
        $.evalFile(coreFile);
      }
    }

    if (typeof RulerAnimatorCore === "undefined") {
      throw new Error("Cannot load rulerAnimatorCore.js. Reinstall both files into the same ScriptUI Panels folder.");
    }

    var missing = [];
    for (var i = 0; i < REQUIRED.length; i += 1) {
      if (typeof RulerAnimatorCore[REQUIRED[i]] !== "function") {
        missing.push(REQUIRED[i]);
      }
    }
    if (missing.length > 0) {
      throw new Error(
        "rulerAnimatorCore.js is outdated (missing: " + missing.join(", ") + ").\n" +
        "Reinstall both files, then fully restart After Effects."
      );
    }

    return RulerAnimatorCore;
  }

  var core = loadCore();
  var PANEL_TITLE = "Ruler Animator";

  function buildPanel(thisObj) {
    var panel = thisObj instanceof Panel
      ? thisObj
      : new Window("palette", PANEL_TITLE, undefined, { resizeable: true });

    panel.orientation = "column";
    panel.alignChildren = ["fill", "top"];
    panel.spacing = 8;
    panel.margins = 12;

    var title = panel.add("statictext", undefined, "Ruler Animator");
    title.graphics.font = ScriptUI.newFont(title.graphics.font.name, "BOLD", 16);

    var subtitle = panel.add("statictext", undefined, "Start line, labeled points, repeatable ruler animation  ·  build 18");
    subtitle.enabled = false;

    var rangeGroup = addSection(panel, "Range");

    var divisionsInput = addStepperEdit(rangeGroup, "Divisions", "6", 1, 99, 1);

    var pointsRow = makeRow(rangeGroup, "Label points");
    var visibleStartInput = addSpinner(pointsRow, "4", 0, 99, 1, 44);
    pointsRow.add("statictext", undefined, "to");
    var visibleEndInput = addSpinner(pointsRow, "6", 0, 99, 1, 44);
    var pointsHelp = pointsRow.add("statictext", undefined, "(point 0 = start, always shown)");
    pointsHelp.enabled = false;

    var fitRow = rangeGroup.add("group");
    fitRow.orientation = "row";
    fitRow.alignChildren = ["left", "center"];
    fitRow.spacing = 6;
    var fitToCompInput = fitRow.add("checkbox", undefined, "Fit animation to composition");
    fitToCompInput.value = true;

    var framesRow = makeRow(rangeGroup, "Frame range");
    var startFrameInput = addSpinner(framesRow, "0", 0, 100000, 1, 44);
    framesRow.add("statictext", undefined, "to");
    var endFrameInput = addSpinner(framesRow, "60", 0, 100000, 1, 44);
    var framesHelp = framesRow.add("statictext", undefined, "(start / end frame; used when not fitting)");
    framesHelp.enabled = false;

    // Grey out the whole frame-range row (fields + spinners) when fitting.
    function syncFramesEnabled() {
      framesRow.enabled = !fitToCompInput.value;
    }
    fitToCompInput.onClick = syncFramesEnabled;
    syncFramesEnabled();

    var fitButtonRow = rangeGroup.add("group");
    fitButtonRow.orientation = "row";
    fitButtonRow.alignChildren = ["left", "center"];
    var fitButton = fitButtonRow.add("button", undefined, "Apply timing to selected rig");
    fitButton.helpTip = "Select a rig layer, then click to push the fit / frame range above onto that rig.";

    // Push the panel's timing (fit-to-comp or the frame range) straight onto
    // the selected rig's controller, so it takes effect without rebuilding.
    fitButton.onClick = function () {
      runSafely(function () {
        var comp = activeComp();
        var prefix = resolveRigPrefix(comp);
        var controller = layerByName(comp, prefix + "_Controller");
        var effects = controller ? controller.property("ADBE Effect Parade") : null;
        var fitEffect = null;
        var startEffect = null;
        var endEffect = null;
        try {
          fitEffect = effects.property("Fit To Comp");
          startEffect = effects.property("Start Frame");
          endEffect = effects.property("End Frame");
        } catch (ignored) {}
        if (!fitEffect || !startEffect || !endEffect) {
          throw new Error("This rig was made with an older version. Recreate it with this panel to control timing.");
        }
        app.beginUndoGroup("Apply Ruler Timing");
        fitEffect.property("ADBE Checkbox Control-0001").setValue(fitToCompInput.value ? 1 : 0);
        startEffect.property("ADBE Slider Control-0001").setValue(parseFloat(startFrameInput.text) || 0);
        endEffect.property("ADBE Slider Control-0001").setValue(parseFloat(endFrameInput.text) || 0);
        app.endUndoGroup();
      });
    };

    var labelsInput = addLabeledEdit(rangeGroup, "Values", "80 cm, 100 cm, 120 cm", 240);

    var guideRow = rangeGroup.add("group");
    guideRow.orientation = "row";
    guideRow.alignChildren = ["left", "center"];
    guideRow.spacing = 6;
    var showFinalLineInput = guideRow.add("checkbox", undefined, "Setup guide line");
    showFinalLineInput.value = true;
    var guideHelp = guideRow.add("statictext", undefined, "shows the final line while you place the nulls");
    guideHelp.enabled = false;

    var motionGroup = addSection(panel, "Motion");
    var motionHelp = motionGroup.add("statictext", undefined, "At the start, Start -> first label point is already drawn; the rest reveals over the timing set in Range (fit to comp, or the frame range).");
    motionHelp.enabled = false;

    var appearanceGroup = addSection(panel, "Appearance");

    // Two columns side by side. "left" (not "fill") keeps each column at its
    // natural width so they sit next to each other and cannot overlap.
    var appearanceColumns = appearanceGroup.add("group");
    appearanceColumns.orientation = "row";
    appearanceColumns.alignChildren = ["left", "top"];
    appearanceColumns.spacing = 18;

    var lineColumn = appearanceColumns.add("group");
    lineColumn.orientation = "column";
    lineColumn.alignChildren = ["left", "top"];
    lineColumn.spacing = 6;

    var textColumn = appearanceColumns.add("group");
    textColumn.orientation = "column";
    textColumn.alignChildren = ["left", "top"];
    textColumn.spacing = 6;

    addSubHeader(lineColumn, "Line & point");
    var lineColorInput = addColorControl(lineColumn, "Line color", "#2563eb");
    var lineWidthInput = addStepperEdit(lineColumn, "Line width", "4", 1, 30, 1);
    var pointSizeInput = addStepperEdit(lineColumn, "Point size", "26", 4, 96, 1);
    var pointFillInput = addColorControl(lineColumn, "Point fill", "#f59e0b");
    var pointStrokeInput = addColorControl(lineColumn, "Point stroke", "#ffffff");
    var pointStrokeWidthInput = addStepperEdit(lineColumn, "Stroke width", "4", 0, 20, 1);

    addSubHeader(textColumn, "Text");
    var labelFontInput = addFontControl(textColumn, "Font");
    var labelAlignInput = addAlignmentControl(textColumn, "Text align");
    var labelOrientationInput = addTextOrientationControl(textColumn, "Text direction");
    var labelColorInput = addColorControl(textColumn, "Text color", "#92400e");
    var labelFontSizeInput = addStepperEdit(textColumn, "Text size", "36", 8, 120, 1);
    var labelOffsetXInput = addStepperEdit(textColumn, "Text X offset", "0", -160, 160, 2);
    var labelOffsetInput = addStepperEdit(textColumn, "Text Y offset", "-52", -160, 160, 2);

    var actions = panel.add("group");
    actions.orientation = "row";
    actions.alignChildren = ["fill", "center"];
    actions.spacing = 10;

    var createButton = actions.add("button", undefined, "Create Ruler");
    var updateButton = actions.add("button", undefined, "Update Selected");

    createButton.onClick = function () {
      runSafely(function () {
        var comp = activeComp();
        var settings = readSettings();
        validateOrThrow(settings);
        app.beginUndoGroup("Create Ruler Rig");
        createRig(comp, settings, null, null);
        app.endUndoGroup();
      });
    };

    updateButton.onClick = function () {
      runSafely(function () {
        var comp = activeComp();
        var settings = readSettings();
        validateOrThrow(settings);
        var prefix = resolveRigPrefix(comp);

        // Apply the panel's settings to the selected rig, preserving the
        // Start/End null positions.
        var positions = captureNullPositions(comp, prefix);
        app.beginUndoGroup("Update Selected Rig");
        removeRigLayers(comp, prefix);
        createRig(comp, settings, prefix, positions);
        app.endUndoGroup();
      });
    };

    var presetActions = panel.add("group");
    presetActions.orientation = "row";
    presetActions.alignChildren = ["fill", "center"];
    presetActions.spacing = 10;

    var savePresetButton = presetActions.add("button", undefined, "Save Preset");
    var loadPresetButton = presetActions.add("button", undefined, "Load Preset");

    savePresetButton.onClick = function () {
      runSafely(function () {
        var json = core.serializePreset(readPresetValues());
        var file = File.saveDialog("Save ruler preset", "JSON:*.json");
        if (!file) {
          return;
        }
        if (!/\.json$/i.test(file.name)) {
          file = new File(file.fsName + ".json");
        }
        writeTextFile(file, json);
      });
    };

    loadPresetButton.onClick = function () {
      runSafely(function () {
        var file = File.openDialog("Load ruler preset", "JSON:*.json");
        if (!file) {
          return;
        }
        var result = core.deserializePreset(readTextFile(file));
        if (result.errors.length > 0) {
          throw new Error(result.errors.join("\n"));
        }
        applyPresetValues(result.values);
        if (result.warnings.length > 0) {
          alert(result.warnings.join("\n"));
        }
      });
    };

    function readSettings() {
      return {
        divisions: parseInt(divisionsInput.text, 10),
        visibleStart: parseInt(visibleStartInput.text, 10),
        visibleEnd: parseInt(visibleEndInput.text, 10),
        labels: core.parseLabels(labelsInput.text),
        lineColor: core.parseHexColor(lineColorInput.text),
        lineWidth: parseFloat(lineWidthInput.text),
        pointSize: parseFloat(pointSizeInput.text),
        pointFill: core.parseHexColor(pointFillInput.text),
        pointStroke: core.parseHexColor(pointStrokeInput.text),
        pointStrokeWidth: parseFloat(pointStrokeWidthInput.text),
        labelFont: selectedFontName(labelFontInput),
        labelJustification: selectedJustification(labelAlignInput),
        labelOrientation: selectedTextOrientation(labelOrientationInput),
        labelColor: core.parseHexColor(labelColorInput.text),
        labelFontSize: parseFloat(labelFontSizeInput.text),
        labelOffsetX: parseFloat(labelOffsetXInput.text),
        labelOffsetY: parseFloat(labelOffsetInput.text),
        fitToComp: fitToCompInput.value,
        startFrame: parseFloat(startFrameInput.text),
        endFrame: parseFloat(endFrameInput.text),
        showFinalLine: showFinalLineInput.value,
      };
    }

    function readPresetValues() {
      return {
        divisions: divisionsInput.text,
        visibleStart: visibleStartInput.text,
        visibleEnd: visibleEndInput.text,
        labels: labelsInput.text,
        fitToComp: fitToCompInput.value,
        startFrame: startFrameInput.text,
        endFrame: endFrameInput.text,
        showFinalLine: showFinalLineInput.value,
        lineColor: lineColorInput.text,
        lineWidth: lineWidthInput.text,
        pointSize: pointSizeInput.text,
        pointFill: pointFillInput.text,
        pointStroke: pointStrokeInput.text,
        pointStrokeWidth: pointStrokeWidthInput.text,
        labelFont: selectedFontName(labelFontInput),
        labelAlign: selectedAlignName(labelAlignInput),
        labelOrientation: selectedTextOrientation(labelOrientationInput),
        labelColor: labelColorInput.text,
        labelFontSize: labelFontSizeInput.text,
        labelOffsetX: labelOffsetXInput.text,
        labelOffsetY: labelOffsetInput.text,
      };
    }

    function applyPresetValues(values) {
      divisionsInput.text = values.divisions;
      visibleStartInput.text = values.visibleStart;
      visibleEndInput.text = values.visibleEnd;
      labelsInput.text = values.labels;
      fitToCompInput.value = values.fitToComp;
      startFrameInput.text = values.startFrame;
      endFrameInput.text = values.endFrame;
      syncFramesEnabled();
      showFinalLineInput.value = values.showFinalLine;
      lineColorInput.text = values.lineColor;
      lineWidthInput.text = values.lineWidth;
      pointSizeInput.text = values.pointSize;
      pointFillInput.text = values.pointFill;
      pointStrokeInput.text = values.pointStroke;
      pointStrokeWidthInput.text = values.pointStrokeWidth;
      labelColorInput.text = values.labelColor;
      labelFontSizeInput.text = values.labelFontSize;
      labelOffsetXInput.text = values.labelOffsetX;
      labelOffsetInput.text = values.labelOffsetY;
      selectDropdownByProperty(labelFontInput, "postScriptName", values.labelFont);
      selectDropdownByProperty(labelAlignInput, "justificationName", values.labelAlign);
      selectDropdownByProperty(labelOrientationInput, "orientationName", values.labelOrientation);

      refreshColorSwatch(lineColorInput);
      refreshColorSwatch(pointFillInput);
      refreshColorSwatch(pointStrokeInput);
      refreshColorSwatch(labelColorInput);
    }

    panel.layout.layout(true);
    panel.layout.resize();
    panel.onResizing = panel.onResize = function () {
      this.layout.resize();
    };

    return panel;
  }

  function addSection(parent, title) {
    var section = parent.add("panel", undefined, title);
    section.orientation = "column";
    section.alignChildren = ["fill", "top"];
    section.margins = 10;
    section.spacing = 7;
    return section;
  }

  function addSubHeader(parent, text) {
    var header = parent.add("statictext", undefined, text);
    try {
      header.graphics.font = ScriptUI.newFont(header.graphics.font.name, "BOLD", 12);
    } catch (ignored) {}
    return header;
  }

  var LABEL_WIDTH = 96;

  // Every control row shares one label column width, so labels and fields line
  // up across the whole panel instead of drifting per-section.
  function makeRow(parent, label) {
    var row = parent.add("group");
    row.orientation = "row";
    row.alignChildren = ["left", "center"];
    row.spacing = 6;

    var text = row.add("statictext", undefined, label);
    text.preferredSize.width = LABEL_WIDTH;
    return row;
  }

  function addLabeledEdit(parent, label, value, width) {
    var row = makeRow(parent, label);
    var input = row.add("edittext", undefined, value);
    input.preferredSize.width = width || 60;
    return input;
  }

  // Edit field + stacked ▲▼ spinner (and arrow-key support). Label-less
  // building block shared by addStepperEdit and the two-field Range rows.
  function addSpinner(parent, value, minValue, maxValue, step, width) {
    var input = parent.add("edittext", undefined, value);
    input.preferredSize.width = width || 56;

    var spinner = parent.add("group");
    spinner.orientation = "column";
    spinner.spacing = 1;
    spinner.margins = 0;

    var upButton = spinner.add("button", undefined, "▲");
    upButton.preferredSize = [20, 11];
    var downButton = spinner.add("button", undefined, "▼");
    downButton.preferredSize = [20, 11];

    function nudge(direction) {
      bumpInput(input, direction * step, minValue, maxValue);
    }

    upButton.onClick = function () {
      nudge(1);
    };

    downButton.onClick = function () {
      nudge(-1);
    };

    input.onChange = function () {
      normalizeInput(input, value, minValue, maxValue);
    };

    // Arrow keys nudge the value while the field is focused.
    try {
      input.addEventListener("keydown", function (event) {
        if (event.keyName === "Up") {
          nudge(1);
          event.preventDefault();
        } else if (event.keyName === "Down") {
          nudge(-1);
          event.preventDefault();
        }
      });
    } catch (ignored) {}

    return input;
  }

  function addStepperEdit(parent, label, value, minValue, maxValue, step) {
    var row = makeRow(parent, label);
    return addSpinner(row, value, minValue, maxValue, step);
  }

  function addFontControl(parent, label) {
    var row = makeRow(parent, label);
    var dropdown = row.add("dropdownlist", undefined, []);
    dropdown.preferredSize.width = 160;

    var choices = collectFontChoices();
    for (var i = 0; i < choices.length; i += 1) {
      var item = dropdown.add("item", choices[i].label);
      item.postScriptName = choices[i].postScriptName;
    }

    dropdown.selection = 0;
    return dropdown;
  }

  function addAlignmentControl(parent, label) {
    var row = makeRow(parent, label);
    var dropdown = row.add("dropdownlist", undefined, []);
    dropdown.preferredSize.width = 110;

    var left = dropdown.add("item", "Left");
    left.justificationName = "left";
    var center = dropdown.add("item", "Center");
    center.justificationName = "center";
    var right = dropdown.add("item", "Right");
    right.justificationName = "right";

    dropdown.selection = center;
    return dropdown;
  }

  function addTextOrientationControl(parent, label) {
    var row = makeRow(parent, label);
    var dropdown = row.add("dropdownlist", undefined, []);
    dropdown.preferredSize.width = 110;

    var horizontal = dropdown.add("item", "Horizontal");
    horizontal.orientationName = "horizontal";
    var vertical = dropdown.add("item", "Vertical");
    vertical.orientationName = "vertical";
    var alongLine = dropdown.add("item", "Along line");
    alongLine.orientationName = "alongLine";

    dropdown.selection = horizontal;
    return dropdown;
  }

  function addColorControl(parent, label, value) {
    var row = makeRow(parent, label);

    var swatch = row.add("panel");
    swatch.preferredSize = [32, 20];
    swatch.helpTip = "Click to pick a color";

    var input = row.add("edittext", undefined, value);
    input.preferredSize.width = 76;
    input.helpTip = "Hex color, e.g. #2563eb";

    function paintSwatch() {
      try {
        var rgb = core.parseHexColor(input.text);
        var g = swatch.graphics;
        g.backgroundColor = g.newBrush(g.BrushType.SOLID_COLOR, [rgb[0], rgb[1], rgb[2], 1]);
      } catch (ignored) {}
    }

    function pickColor() {
      var selected = $.colorPicker();
      if (selected >= 0) {
        input.text = colorPickerValueToHex(selected);
        paintSwatch();
      }
    }

    // Click the swatch to open the color picker (no separate button needed).
    try {
      swatch.addEventListener("mousedown", pickColor);
    } catch (ignored) {}

    input.onChange = function () {
      paintSwatch();
    };

    // Programmatic .text changes (e.g. loading a preset) don't fire onChange,
    // so expose the repaint for applyPresetValues to call explicitly.
    input.repaintSwatch = paintSwatch;

    paintSwatch();
    return input;
  }

  function collectFontChoices() {
    var choices = [{ label: "Default", postScriptName: "" }];

    try {
      if (app.fonts && app.fonts.allFonts) {
        var allFonts = app.fonts.allFonts;
        for (var i = 0; i < allFonts.length; i += 1) {
          var entry = allFonts[i];
          if (entry && entry.length) {
            for (var j = 0; j < entry.length; j += 1) {
              addFontChoice(choices, entry[j]);
            }
          } else {
            addFontChoice(choices, entry);
          }
        }
      }
    } catch (ignored) {}

    if (choices.length === 1) {
      choices.push({ label: "Arial", postScriptName: "ArialMT" });
      choices.push({ label: "Helvetica", postScriptName: "Helvetica" });
      choices.push({ label: "Avenir Next", postScriptName: "AvenirNext-Regular" });
    }

    return choices;
  }

  function addFontChoice(choices, font) {
    if (!font) {
      return;
    }

    var postScriptName = font.postScriptName || font.fullName || font.name;
    if (!postScriptName) {
      return;
    }

    var label = font.fullName || font.familyName || postScriptName;
    if (font.styleName && label.indexOf(font.styleName) < 0) {
      label += " " + font.styleName;
    }

    for (var i = 0; i < choices.length; i += 1) {
      if (choices[i].postScriptName === postScriptName) {
        return;
      }
    }

    choices.push({ label: label, postScriptName: postScriptName });
  }

  function selectedFontName(dropdown) {
    if (!dropdown.selection || !dropdown.selection.postScriptName) {
      return "";
    }
    return dropdown.selection.postScriptName;
  }

  function selectedJustification(dropdown) {
    if (!dropdown.selection) {
      return ParagraphJustification.CENTER_JUSTIFY;
    }

    if (dropdown.selection.justificationName === "left") {
      return ParagraphJustification.LEFT_JUSTIFY;
    }

    if (dropdown.selection.justificationName === "right") {
      return ParagraphJustification.RIGHT_JUSTIFY;
    }

    return ParagraphJustification.CENTER_JUSTIFY;
  }

  function selectedTextOrientation(dropdown) {
    if (!dropdown.selection || !dropdown.selection.orientationName) {
      return "horizontal";
    }
    return dropdown.selection.orientationName;
  }

  function selectedAlignName(dropdown) {
    if (!dropdown.selection || !dropdown.selection.justificationName) {
      return "center";
    }
    return dropdown.selection.justificationName;
  }

  function selectDropdownByProperty(dropdown, propertyName, value) {
    for (var i = 0; i < dropdown.items.length; i += 1) {
      if (dropdown.items[i][propertyName] === value) {
        dropdown.selection = i;
        return;
      }
    }
    if (dropdown.items.length > 0) {
      dropdown.selection = 0;
    }
  }

  function refreshColorSwatch(input) {
    try {
      if (input && typeof input.repaintSwatch === "function") {
        input.repaintSwatch();
      }
    } catch (ignored) {}
  }

  function colorPickerValueToHex(value) {
    var red = (value >> 16) & 255;
    var green = (value >> 8) & 255;
    var blue = value & 255;
    return "#" + hexByte(red) + hexByte(green) + hexByte(blue);
  }

  function hexByte(value) {
    var hex = value.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }

  function clamp(value, minValue, maxValue) {
    return Math.min(Math.max(value, minValue), maxValue);
  }

  function normalizeInput(input, fallback, minValue, maxValue) {
    var parsed = parseFloat(input.text);
    if (isNaN(parsed)) {
      parsed = parseFloat(fallback);
    }
    input.text = formatNumber(clamp(parsed, minValue, maxValue));
  }

  function bumpInput(input, delta, minValue, maxValue) {
    var parsed = parseFloat(input.text);
    if (isNaN(parsed)) {
      parsed = 0;
    }
    input.text = formatNumber(clamp(parsed + delta, minValue, maxValue));
  }

  function formatNumber(value) {
    var rounded = Math.round(value * 10) / 10;
    if (Math.abs(rounded - Math.round(rounded)) < 0.001) {
      return String(Math.round(rounded));
    }
    return String(rounded);
  }

  function runSafely(callback) {
    try {
      callback();
    } catch (error) {
      alert(error.message || String(error));
      try {
        app.endUndoGroup();
      } catch (ignored) {}
    }
  }

  function writeTextFile(file, text) {
    var data = String(text);
    if (data.length === 0) {
      throw new Error("Refusing to write an empty preset.");
    }
    file.lineFeed = "Unix";
    file.encoding = "UTF-8";
    if (!file.open("w")) {
      throw new Error("Cannot open file for writing: " + file.fsName);
    }
    var ok = file.write(data);
    file.close();
    if (!ok || file.length === 0) {
      throw new Error("Could not write preset to " + file.fsName + " (0 bytes written).");
    }
  }

  function readTextFile(file) {
    file.encoding = "UTF-8";
    if (!file.open("r")) {
      throw new Error("Cannot open file for reading: " + file.fsName);
    }
    var text = file.read();
    file.close();
    return text;
  }

  function activeComp() {
    var item = app.project && app.project.activeItem;
    if (!item || !(item instanceof CompItem)) {
      throw new Error("Open or select an active composition first.");
    }
    return item;
  }

  function validateOrThrow(settings) {
    var result = core.validateSettings(settings);
    if (result.errors.length > 0) {
      throw new Error(result.errors.join("\n"));
    }
  }

  function createRig(comp, settings, forcedPrefix, preservedPositions) {
    var prefix = forcedPrefix || nextPrefixForComp(comp);
    var center = [comp.width / 2, comp.height / 2];
    var startPosition = preservedPositions && preservedPositions.start
      ? preservedPositions.start
      : [center[0] - 240, center[1]];
    var endPosition = preservedPositions && preservedPositions.end
      ? preservedPositions.end
      : [center[0] + 240, center[1]];

    var controller = comp.layers.addNull();
    controller.name = prefix + "_Controller";
    renameNullSource(controller, prefix + "_Controller");
    controller.label = 8;
    controller.enabled = false;
    controller.shy = true;
    controller.property("Transform").property("Position").setValue([center[0], center[1] - 120]);
    addControllerEffects(controller, settings);

    var startNull = comp.layers.addNull();
    startNull.name = prefix + "_Start";
    renameNullSource(startNull, prefix + "_Start");
    startNull.label = 8;
    startNull.property("Transform").property("Position").setValue(startPosition);

    var endNull = comp.layers.addNull();
    endNull.name = prefix + "_End";
    renameNullSource(endNull, prefix + "_End");
    endNull.label = 8;
    endNull.property("Transform").property("Position").setValue(endPosition);

    createGuideLineLayer(comp, prefix, settings);
    createLineLayer(comp, prefix, settings);
    createPointLayer(comp, prefix, settings, 0);

    var visible = core.visibleIndices(settings.visibleStart, settings.visibleEnd);
    var labelCursor = 0;

    for (var i = 0; i < visible.length; i += 1) {
      var index = visible[i];
      if (index === 0) {
        continue;
      }

      createPointLayer(comp, prefix, settings, index);
      createLabelLayer(comp, prefix, settings, index, settings.labels[labelCursor]);
      labelCursor += 1;
    }

    return prefix;
  }

  function addControllerEffects(controller, settings) {
    addSlider(controller, "Divisions", settings.divisions);
    addSlider(controller, "Visible Start", settings.visibleStart);
    addSlider(controller, "Visible End", settings.visibleEnd);
    addCheckbox(controller, "Fit To Comp", settings.fitToComp);
    addSlider(controller, "Start Frame", settings.startFrame);
    addSlider(controller, "End Frame", settings.endFrame);
    // Live controls: the generated layers read these from the controller via
    // expressions, so adjusting the slider updates the rig without rebuilding.
    addSlider(controller, "Line Width", settings.lineWidth);
    addSlider(controller, "Point Size", settings.pointSize);
    addSlider(controller, "Label Offset X", settings.labelOffsetX);
    addSlider(controller, "Label Offset Y", settings.labelOffsetY);
  }

  function addSlider(layer, name, value) {
    var effect = layer.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
    effect.name = name;
    effect.property("ADBE Slider Control-0001").setValue(value);
  }

  function addCheckbox(layer, name, value) {
    var effect = layer.property("ADBE Effect Parade").addProperty("ADBE Checkbox Control");
    effect.name = name;
    effect.property("ADBE Checkbox Control-0001").setValue(value ? 1 : 0);
  }

  function createLineLayer(comp, prefix, settings) {
    var layer = comp.layers.addShape();
    layer.name = prefix + "_Line";
    layer.label = 8;
    configureShapeLayerAtCompOrigin(layer);

    var contents = layer.property("ADBE Root Vectors Group");
    var group = contents.addProperty("ADBE Vector Group");
    group.name = "Ruler Line";
    var vectors = group.property("ADBE Vectors Group");

    var path = vectors.addProperty("ADBE Vector Shape - Group");
    path.property("ADBE Vector Shape").expression = linePathExpression(prefix);

    var stroke = vectors.addProperty("ADBE Vector Graphic - Stroke");
    stroke.property("ADBE Vector Stroke Color").setValue(settings.lineColor);
    stroke.property("ADBE Vector Stroke Width").expression = lineWidthExpression(prefix);
    stroke.property("ADBE Vector Stroke Line Cap").setValue(2);

    var trim = vectors.addProperty("ADBE Vector Filter - Trim");
    trim.property("ADBE Vector Trim End").expression = lineRevealExpression(prefix);
    return layer;
  }

  function createGuideLineLayer(comp, prefix, settings) {
    var layer = comp.layers.addShape();
    layer.name = prefix + "_FinalGuide_Line";
    layer.label = 8;
    layer.shy = true;
    layer.guideLayer = true;
    layer.enabled = settings.showFinalLine;
    configureShapeLayerAtCompOrigin(layer);

    var contents = layer.property("ADBE Root Vectors Group");
    var group = contents.addProperty("ADBE Vector Group");
    group.name = "Final Positioning Guide";
    var vectors = group.property("ADBE Vectors Group");

    var path = vectors.addProperty("ADBE Vector Shape - Group");
    path.property("ADBE Vector Shape").expression = linePathExpression(prefix);

    var stroke = vectors.addProperty("ADBE Vector Graphic - Stroke");
    stroke.property("ADBE Vector Stroke Color").setValue(settings.lineColor);
    stroke.property("ADBE Vector Stroke Width").setValue(Math.max(settings.lineWidth, 2));
    stroke.property("ADBE Vector Stroke Opacity").setValue(28);
    stroke.property("ADBE Vector Stroke Line Cap").setValue(2);

    return layer;
  }

  function configureShapeLayerAtCompOrigin(layer) {
    var transform = layer.property("Transform");
    transform.property("Anchor Point").setValue([0, 0]);
    transform.property("Position").setValue([0, 0]);
    transform.property("Scale").setValue([100, 100]);
    transform.property("Rotation").setValue(0);
  }

  function createPointLayer(comp, prefix, settings, index) {
    var layer = comp.layers.addShape();
    layer.name = prefix + "_Point_" + core.pad2(index);
    layer.label = 8;

    var contents = layer.property("ADBE Root Vectors Group");
    var group = contents.addProperty("ADBE Vector Group");
    group.name = "Point";
    var vectors = group.property("ADBE Vectors Group");

    var ellipse = vectors.addProperty("ADBE Vector Shape - Ellipse");
    ellipse.property("ADBE Vector Ellipse Size").expression = pointSizeExpression(prefix);

    var fill = vectors.addProperty("ADBE Vector Graphic - Fill");
    fill.property("ADBE Vector Fill Color").setValue(settings.pointFill);

    var stroke = vectors.addProperty("ADBE Vector Graphic - Stroke");
    stroke.property("ADBE Vector Stroke Color").setValue(settings.pointStroke);
    stroke.property("ADBE Vector Stroke Width").setValue(settings.pointStrokeWidth);

    layer.property("Transform").property("Position").expression = pointPositionExpression(prefix, index);
    layer.property("Transform").property("Opacity").expression = pointOpacityExpression(prefix, index);
    return layer;
  }

  function createLabelLayer(comp, prefix, settings, index, value) {
    if (index === 0) {
      return null;
    }

    var layer = comp.layers.addText(value);
    layer.name = prefix + "_Label_" + core.pad2(index);
    layer.label = 8;

    var source = layer.property("Source Text");
    var doc = source.value;
    doc.fontSize = settings.labelFontSize;
    if (settings.labelFont) {
      doc.font = settings.labelFont;
    }
    doc.applyFill = true;
    doc.fillColor = settings.labelColor;
    doc.justification = settings.labelJustification || ParagraphJustification.CENTER_JUSTIFY;
    source.setValue(doc);

    layer.property("Transform").property("Position").expression = labelPositionExpression(prefix, index);
    applyLabelOrientation(layer, prefix, settings);
    layer.property("Transform").property("Opacity").expression = pointOpacityExpression(prefix, index);
    return layer;
  }

  function applyLabelOrientation(layer, prefix, settings) {
    var rotation = layer.property("Transform").property("Rotation");

    if (settings.labelOrientation === "vertical") {
      rotation.setValue(90);
      return;
    }

    if (settings.labelOrientation === "alongLine") {
      rotation.expression = labelAlongLineRotationExpression(prefix);
      return;
    }

    rotation.setValue(0);
  }

  function labelAlongLineRotationExpression(prefix) {
    return [
      'var s = thisComp.layer("' + prefix + '_Start").transform.position;',
      'var e = thisComp.layer("' + prefix + '_End").transform.position;',
      "radiansToDegrees(Math.atan2(e[1] - s[1], e[0] - s[0]));",
    ].join("\n");
  }

  function linePathExpression(prefix) {
    return [
      'var ctrl = thisComp.layer("' + prefix + '_Controller");',
      'var s = thisComp.layer("' + prefix + '_Start").transform.position;',
      'var e = thisComp.layer("' + prefix + '_End").transform.position;',
      'var divisions = Math.max(1, ctrl.effect("Divisions")("Slider"));',
      'var endIndex = ctrl.effect("Visible End")("Slider");',
      "var endPoint = s + (e - s) * (endIndex / divisions);",
      "createPath([[s[0], s[1]], [endPoint[0], endPoint[1]]], [], [], false);",
    ].join("\n");
  }

  function lineRevealExpression(prefix) {
    return [
      'var ctrl = thisComp.layer("' + prefix + '_Controller");',
      'var startIndex = ctrl.effect("Visible Start")("Slider");',
      'var endIndex = ctrl.effect("Visible End")("Slider");',
      'var fit = ctrl.effect("Fit To Comp")("Checkbox");',
      'var t0 = fit > 0.5 ? 0 : ctrl.effect("Start Frame")("Slider") * thisComp.frameDuration;',
      'var t1 = fit > 0.5 ? thisComp.duration - thisComp.frameDuration * 2 : ctrl.effect("End Frame")("Slider") * thisComp.frameDuration;',
      "var startPercent = endIndex > 0 ? (startIndex / endIndex) * 100 : 0;",
      "linear(time, t0, t1, startPercent, 100);",
    ].join("\n");
  }

  function pointPositionExpression(prefix, index) {
    var lines = basePointPositionExpression(prefix, index);
    lines.push("base;");
    return lines.join("\n");
  }

  function basePointPositionExpression(prefix, index) {
    return [
      'var ctrl = thisComp.layer("' + prefix + '_Controller");',
      'var s = thisComp.layer("' + prefix + '_Start").transform.position;',
      'var e = thisComp.layer("' + prefix + '_End").transform.position;',
      'var divisions = Math.max(1, ctrl.effect("Divisions")("Slider"));',
      "var index = " + index + ";",
      "var base = s + (e - s) * (index / divisions);",
    ];
  }

  function labelPositionExpression(prefix, index) {
    var lines = basePointPositionExpression(prefix, index);
    lines.push('base + [ctrl.effect("Label Offset X")("Slider"), ctrl.effect("Label Offset Y")("Slider")];');
    return lines.join("\n");
  }

  function pointSizeExpression(prefix) {
    return [
      'var ps = thisComp.layer("' + prefix + '_Controller").effect("Point Size")("Slider");',
      "[ps, ps];",
    ].join("\n");
  }

  function lineWidthExpression(prefix) {
    return 'thisComp.layer("' + prefix + '_Controller").effect("Line Width")("Slider");';
  }

  function pointOpacityExpression(prefix, index) {
    if (index === 0) {
      return "100;";
    }

    return [
      'var ctrl = thisComp.layer("' + prefix + '_Controller");',
      'var startIndex = ctrl.effect("Visible Start")("Slider");',
      'var endIndex = ctrl.effect("Visible End")("Slider");',
      'var fit = ctrl.effect("Fit To Comp")("Checkbox");',
      'var t0 = fit > 0.5 ? 0 : ctrl.effect("Start Frame")("Slider") * thisComp.frameDuration;',
      'var t1 = fit > 0.5 ? thisComp.duration - thisComp.frameDuration * 2 : ctrl.effect("End Frame")("Slider") * thisComp.frameDuration;',
      "var index = " + index + ";",
      "if (index <= startIndex) {",
      "  100;",
      "} else {",
      "var progress = linear(time, t0, t1, startIndex, endIndex);",
      "linear(progress, index - 0.05, index, 0, 100);",
      "}",
    ].join("\n");
  }

  function nextPrefixForComp(comp) {
    var names = [];
    for (var i = 1; i <= comp.numLayers; i += 1) {
      names.push(comp.layer(i).name);
    }
    return core.nextPrefix(names, "Ruler");
  }

  function selectedRulerPrefix(comp) {
    if (!comp.selectedLayers || comp.selectedLayers.length === 0) {
      return null;
    }

    var name = comp.selectedLayers[0].name;
    var match = /^(Ruler_\d{2,})_/.exec(name);
    return match ? match[1] : null;
  }

  function rigPrefixesInComp(comp) {
    var seen = {};
    var list = [];
    for (var i = 1; i <= comp.numLayers; i += 1) {
      var m = /^(Ruler_\d{2,})_/.exec(comp.layer(i).name);
      if (m && !seen[m[1]]) {
        seen[m[1]] = true;
        list.push(m[1]);
      }
    }
    return list;
  }

  // Use the selected rig if a rig layer is selected; otherwise fall back to the
  // comp's only rig. Throws a clear message when there is none or several.
  function resolveRigPrefix(comp) {
    var selected = selectedRulerPrefix(comp);
    if (selected) {
      return selected;
    }
    var all = rigPrefixesInComp(comp);
    if (all.length === 1) {
      return all[0];
    }
    if (all.length > 1) {
      throw new Error("This comp has several ruler rigs - select a layer from the one you want.");
    }
    throw new Error("No ruler rig in this comp yet. Click Create Ruler first.");
  }

  function layerByName(comp, name) {
    for (var i = 1; i <= comp.numLayers; i += 1) {
      if (comp.layer(i).name === name) {
        return comp.layer(i);
      }
    }
    return null;
  }

  // Also rename a null layer's footage source, so the "Source Name" column
  // shows the rig name instead of the default "Null N".
  function renameNullSource(layer, name) {
    try {
      if (layer.source) {
        layer.source.name = name;
      }
    } catch (ignored) {}
  }

  function captureNullPositions(comp, prefix) {
    var positions = {};
    var start = layerByName(comp, prefix + "_Start");
    var end = layerByName(comp, prefix + "_End");

    if (start) {
      positions.start = start.property("Transform").property("Position").value;
    }

    if (end) {
      positions.end = end.property("Transform").property("Position").value;
    }

    return positions;
  }

  function removeRigLayers(comp, prefix) {
    for (var i = comp.numLayers; i >= 1; i -= 1) {
      var layer = comp.layer(i);
      if (layer.name.indexOf(prefix + "_") === 0) {
        layer.remove();
      }
    }
  }

  var panel = buildPanel(thisObj);
  if (panel instanceof Window) {
    panel.center();
    panel.show();
  }
})(this);
