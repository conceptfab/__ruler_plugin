(function rulerAnimatorPanel(thisObj) {
  function loadCore() {
    if (typeof RulerAnimatorCore !== "undefined") {
      return RulerAnimatorCore;
    }

    var panelFile = File($.fileName);
    var coreFile = File(panelFile.parent.fsName + "/rulerAnimatorCore.js");

    if (!coreFile.exists) {
      throw new Error("Missing dependency: " + coreFile.fsName);
    }

    $.evalFile(coreFile);

    if (typeof RulerAnimatorCore === "undefined") {
      throw new Error("Unable to load rulerAnimatorCore.js from " + coreFile.fsName);
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

    var subtitle = panel.add("statictext", undefined, "Start line, labeled points, repeatable ruler animation");
    subtitle.enabled = false;

    var rangeGroup = addSection(panel, "Range");
    var rangeGrid = rangeGroup.add("group");
    rangeGrid.orientation = "row";
    rangeGrid.alignChildren = ["fill", "top"];
    rangeGrid.spacing = 10;

    var rangeLeft = rangeGrid.add("group");
    rangeLeft.orientation = "column";
    rangeLeft.alignChildren = ["fill", "top"];
    var rangeRight = rangeGrid.add("group");
    rangeRight.orientation = "column";
    rangeRight.alignChildren = ["fill", "top"];

    var divisionsInput = addLabeledEdit(rangeLeft, "Divisions", "6", 7);
    var visibleStartInput = addLabeledEdit(rangeLeft, "First label point", "4", 7);
    var visibleEndInput = addLabeledEdit(rangeRight, "Last label point", "6", 7);
    var durationInput = addStepperEdit(rangeRight, "Duration", "1.2", 0.1, 5, 0.1, 7);
    var labelsInput = addLabeledEdit(rangeGroup, "Values", "80 cm, 100 cm, 120 cm", 28);

    var guideRow = rangeGroup.add("group");
    guideRow.orientation = "row";
    guideRow.alignChildren = ["left", "center"];
    var showFinalLineInput = guideRow.add("checkbox", undefined, "Setup guide line");
    showFinalLineInput.value = true;
    var guideHelp = guideRow.add("statictext", undefined, "shows final line while positioning nulls");
    guideHelp.enabled = false;

    var motionGroup = addSection(panel, "Motion");
    var motionHelp = motionGroup.add("statictext", undefined, "At frame 0: Start -> first label point is already drawn. Animation continues from there.");
    motionHelp.enabled = false;

    var appearanceGroup = addSection(panel, "Appearance");
    var appearanceGrid = appearanceGroup.add("group");
    appearanceGrid.orientation = "row";
    appearanceGrid.alignChildren = ["fill", "top"];
    appearanceGrid.spacing = 10;

    var appearanceLeft = appearanceGrid.add("group");
    appearanceLeft.orientation = "column";
    appearanceLeft.alignChildren = ["fill", "top"];
    var appearanceRight = appearanceGrid.add("group");
    appearanceRight.orientation = "column";
    appearanceRight.alignChildren = ["fill", "top"];

    var lineColorInput = addColorControl(appearanceLeft, "Line color", "#2563eb");
    var lineWidthInput = addStepperEdit(appearanceLeft, "Line width", "4", 1, 30, 1, 7);
    var pointSizeInput = addStepperEdit(appearanceLeft, "Point size", "26", 4, 96, 1, 7);
    var pointFillInput = addColorControl(appearanceLeft, "Point fill", "#f59e0b");
    var pointStrokeInput = addColorControl(appearanceRight, "Point stroke", "#ffffff");
    var pointStrokeWidthInput = addStepperEdit(appearanceRight, "Stroke width", "4", 0, 20, 1, 7);
    var labelFontInput = addFontControl(appearanceRight, "Font");
    var labelAlignInput = addAlignmentControl(appearanceRight, "Text align");
    var labelOrientationInput = addTextOrientationControl(appearanceRight, "Text direction");
    var labelColorInput = addColorControl(appearanceRight, "Text color", "#92400e");
    var labelFontSizeInput = addStepperEdit(appearanceRight, "Text size", "36", 8, 120, 1, 7);
    var labelOffsetInput = addStepperEdit(appearanceRight, "Text Y offset", "-52", -160, 160, 2, 7);

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
        var prefix = selectedRulerPrefix(comp);
        if (!prefix) {
          throw new Error("Select any layer from a generated ruler rig before updating.");
        }

        var positions = captureNullPositions(comp, prefix);
        app.beginUndoGroup("Update Selected Rig");
        removeRigLayers(comp, prefix);
        createRig(comp, settings, prefix, positions);
        app.endUndoGroup();
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
        labelOffsetY: parseFloat(labelOffsetInput.text),
        duration: parseFloat(durationInput.text),
        showFinalLine: showFinalLineInput.value,
      };
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

  function addLabeledEdit(parent, label, value, characters) {
    var row = parent.add("group");
    row.orientation = "row";
    row.alignChildren = ["fill", "center"];

    var text = row.add("statictext", undefined, label);
    text.preferredSize.width = 104;

    var input = row.add("edittext", undefined, value);
    input.characters = characters || 14;
    return input;
  }

  function addStepperEdit(parent, label, value, minValue, maxValue, step, characters) {
    var row = parent.add("group");
    row.orientation = "row";
    row.alignChildren = ["left", "center"];

    var text = row.add("statictext", undefined, label);
    text.preferredSize.width = 104;

    var decrementButton = row.add("button", undefined, "-");
    decrementButton.preferredSize.width = 28;

    var input = row.add("edittext", undefined, value);
    input.characters = characters || 7;
    input.preferredSize.width = 54;

    var incrementButton = row.add("button", undefined, "+");
    incrementButton.preferredSize.width = 28;

    decrementButton.onClick = function () {
      bumpInput(input, -step, minValue, maxValue);
    };

    incrementButton.onClick = function () {
      bumpInput(input, step, minValue, maxValue);
    };

    input.onChange = function () {
      normalizeInput(input, value, minValue, maxValue);
    };

    return input;
  }

  function addFontControl(parent, label) {
    var row = parent.add("group");
    row.orientation = "row";
    row.alignChildren = ["left", "center"];

    var text = row.add("statictext", undefined, label);
    text.preferredSize.width = 104;

    var dropdown = row.add("dropdownlist", undefined, []);
    dropdown.preferredSize.width = 190;

    var choices = collectFontChoices();
    for (var i = 0; i < choices.length; i += 1) {
      var item = dropdown.add("item", choices[i].label);
      item.postScriptName = choices[i].postScriptName;
    }

    dropdown.selection = 0;
    return dropdown;
  }

  function addAlignmentControl(parent, label) {
    var row = parent.add("group");
    row.orientation = "row";
    row.alignChildren = ["left", "center"];

    var text = row.add("statictext", undefined, label);
    text.preferredSize.width = 104;

    var dropdown = row.add("dropdownlist", undefined, []);
    dropdown.preferredSize.width = 120;

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
    var row = parent.add("group");
    row.orientation = "row";
    row.alignChildren = ["left", "center"];

    var text = row.add("statictext", undefined, label);
    text.preferredSize.width = 104;

    var dropdown = row.add("dropdownlist", undefined, []);
    dropdown.preferredSize.width = 120;

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
    var row = parent.add("group");
    row.orientation = "row";
    row.alignChildren = ["left", "center"];

    var text = row.add("statictext", undefined, label);
    text.preferredSize.width = 104;

    var input = row.add("edittext", undefined, value);
    input.characters = 9;
    input.preferredSize.width = 82;

    var button = row.add("button", undefined, "Pick");
    button.preferredSize.width = 54;
    button.onClick = function () {
      var selected = $.colorPicker();
      if (selected >= 0) {
        input.text = colorPickerValueToHex(selected);
      }
    };

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
    controller.label = 10;
    controller.enabled = false;
    controller.property("Transform").property("Position").setValue([center[0], center[1] - 120]);
    addControllerEffects(controller, settings);

    var startNull = comp.layers.addNull();
    startNull.name = prefix + "_Start_NULL";
    startNull.label = 9;
    startNull.property("Transform").property("Position").setValue(startPosition);

    var endNull = comp.layers.addNull();
    endNull.name = prefix + "_End_NULL";
    endNull.label = 9;
    endNull.property("Transform").property("Position").setValue(endPosition);

    createGuideLineLayer(comp, prefix, settings);
    createLineLayer(comp, prefix, settings);
    createPointLayer(comp, prefix, settings, 0);

    var visible = core.visibleIndices(settings.visibleStart, settings.visibleEnd);
    var labelSlots = core.labelSlotsForRange(settings.visibleStart, settings.visibleEnd);
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
    addSlider(controller, "Animation Duration", settings.duration);
    addSlider(controller, "Line Width", settings.lineWidth);
    addSlider(controller, "Point Size", settings.pointSize);
    addSlider(controller, "Label Offset Y", settings.labelOffsetY);
    addColor(controller, "Line Color", settings.lineColor);
    addColor(controller, "Point Fill", settings.pointFill);
    addColor(controller, "Point Stroke", settings.pointStroke);
    addColor(controller, "Label Color", settings.labelColor);
    addCheckbox(controller, "Show Final Line", settings.showFinalLine);
  }

  function addSlider(layer, name, value) {
    var effect = layer.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
    effect.name = name;
    effect.property("ADBE Slider Control-0001").setValue(value);
  }

  function addColor(layer, name, value) {
    var effect = layer.property("ADBE Effect Parade").addProperty("ADBE Color Control");
    effect.name = name;
    effect.property("ADBE Color Control-0001").setValue(value);
  }

  function addCheckbox(layer, name, value) {
    var effect = layer.property("ADBE Effect Parade").addProperty("ADBE Checkbox Control");
    effect.name = name;
    effect.property("ADBE Checkbox Control-0001").setValue(value ? 1 : 0);
  }

  function createLineLayer(comp, prefix, settings) {
    var layer = comp.layers.addShape();
    layer.name = prefix + "_Line";
    layer.label = 13;
    configureShapeLayerAtCompOrigin(layer);

    var contents = layer.property("ADBE Root Vectors Group");
    var group = contents.addProperty("ADBE Vector Group");
    group.name = "Ruler Line";
    var vectors = group.property("ADBE Vectors Group");

    var path = vectors.addProperty("ADBE Vector Shape - Group");
    path.property("ADBE Vector Shape").expression = linePathExpression(prefix);

    var stroke = vectors.addProperty("ADBE Vector Graphic - Stroke");
    stroke.property("ADBE Vector Stroke Color").setValue(settings.lineColor);
    stroke.property("ADBE Vector Stroke Width").setValue(settings.lineWidth);
    stroke.property("ADBE Vector Stroke Line Cap").setValue(2);

    var trim = vectors.addProperty("ADBE Vector Filter - Trim");
    trim.property("ADBE Vector Trim End").expression = lineRevealExpression(prefix);
    return layer;
  }

  function createGuideLineLayer(comp, prefix, settings) {
    var layer = comp.layers.addShape();
    layer.name = prefix + "_FinalGuide_Line";
    layer.label = 8;
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
    layer.label = 14;

    var contents = layer.property("ADBE Root Vectors Group");
    var group = contents.addProperty("ADBE Vector Group");
    group.name = "Point";
    var vectors = group.property("ADBE Vectors Group");

    var ellipse = vectors.addProperty("ADBE Vector Shape - Ellipse");
    ellipse.property("ADBE Vector Ellipse Size").setValue([settings.pointSize, settings.pointSize]);

    var fill = vectors.addProperty("ADBE Vector Graphic - Fill");
    fill.property("ADBE Vector Fill Color").setValue(settings.pointFill);

    var stroke = vectors.addProperty("ADBE Vector Graphic - Stroke");
    stroke.property("ADBE Vector Stroke Color").setValue(settings.pointStroke);
    stroke.property("ADBE Vector Stroke Width").setValue(settings.pointStrokeWidth);

    layer.property("Transform").property("Position").expression = pointPositionExpression(prefix, settings.divisions, index);
    layer.property("Transform").property("Opacity").expression = pointOpacityExpression(prefix, index);
    return layer;
  }

  function createLabelLayer(comp, prefix, settings, index, value) {
    if (index === 0) {
      return null;
    }

    var layer = comp.layers.addText(value);
    layer.name = prefix + "_Label_" + core.pad2(index);
    layer.label = 14;

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

    layer.property("Transform").property("Position").expression = labelPositionExpression(prefix, settings.divisions, index, settings.labelOffsetY);
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
      'var s = thisComp.layer("' + prefix + '_Start_NULL").transform.position;',
      'var e = thisComp.layer("' + prefix + '_End_NULL").transform.position;',
      "radiansToDegrees(Math.atan2(e[1] - s[1], e[0] - s[0]));",
    ].join("\n");
  }

  function linePathExpression(prefix) {
    return [
      'var ctrl = thisComp.layer("' + prefix + '_Controller");',
      'var s = thisComp.layer("' + prefix + '_Start_NULL").transform.position;',
      'var e = thisComp.layer("' + prefix + '_End_NULL").transform.position;',
      'var divisions = ctrl.effect("Divisions")("Slider");',
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
      'var duration = ctrl.effect("Animation Duration")("Slider");',
      "var startPercent = (startIndex / endIndex) * 100;",
      "linear(time, inPoint, inPoint + duration, startPercent, 100);",
    ].join("\n");
  }

  function pointPositionExpression(prefix, divisions, index) {
    var lines = basePointPositionExpression(prefix, divisions, index);
    lines.push("base;");
    return lines.join("\n");
  }

  function basePointPositionExpression(prefix, divisions, index) {
    return [
      'var s = thisComp.layer("' + prefix + '_Start_NULL").transform.position;',
      'var e = thisComp.layer("' + prefix + '_End_NULL").transform.position;',
      "var divisions = " + divisions + ";",
      "var index = " + index + ";",
      "var base = s + (e - s) * (index / divisions);",
    ];
  }

  function labelPositionExpression(prefix, divisions, index, offsetY) {
    var lines = basePointPositionExpression(prefix, divisions, index);
    lines.push("base + [0, " + offsetY + "];");
    return lines.join("\n");
  }

  function pointOpacityExpression(prefix, index) {
    if (index === 0) {
      return "100;";
    }

    return [
      'var ctrl = thisComp.layer("' + prefix + '_Controller");',
      'var startIndex = ctrl.effect("Visible Start")("Slider");',
      'var endIndex = ctrl.effect("Visible End")("Slider");',
      'var duration = ctrl.effect("Animation Duration")("Slider");',
      "var index = " + index + ";",
      "if (index <= startIndex) {",
      "  100;",
      "} else {",
      "var progress = linear(time, inPoint, inPoint + duration, startIndex, endIndex);",
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
    var match = /^(Ruler_\d{2})_/.exec(name);
    return match ? match[1] : null;
  }

  function captureNullPositions(comp, prefix) {
    var positions = {};
    var start = layerByName(comp, prefix + "_Start_NULL");
    var end = layerByName(comp, prefix + "_End_NULL");

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

  function layerByName(comp, name) {
    for (var i = 1; i <= comp.numLayers; i += 1) {
      if (comp.layer(i).name === name) {
        return comp.layer(i);
      }
    }
    return null;
  }

  var panel = buildPanel(thisObj);
  if (panel instanceof Window) {
    panel.center();
    panel.show();
  }
})(this);
