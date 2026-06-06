(function dimensionAnimatorPanel(thisObj) {
  function loadCore() {
    var REQUIRED = ["serializePreset", "deserializePreset", "validateSettings", "nextPrefix"];

    if ($.fileName) {
      var panelFile = File($.fileName);
      var coreFile = File(panelFile.parent.fsName + "/dimensionAnimatorCore.js");
      if (coreFile.exists) {
        $.evalFile(coreFile);
      }
    }

    if (typeof DimensionAnimatorCore === "undefined") {
      throw new Error("Cannot load dimensionAnimatorCore.js. Reinstall both files into the same ScriptUI Panels folder.");
    }

    var missing = [];
    for (var i = 0; i < REQUIRED.length; i += 1) {
      if (typeof DimensionAnimatorCore[REQUIRED[i]] !== "function") {
        missing.push(REQUIRED[i]);
      }
    }
    if (missing.length > 0) {
      throw new Error(
        "dimensionAnimatorCore.js is outdated (missing: " + missing.join(", ") + ").\n" +
        "Reinstall both files, then fully restart After Effects."
      );
    }

    return DimensionAnimatorCore;
  }

  var core = loadCore();
  var PANEL_TITLE = "Dimension Animator";
  var LABEL_WIDTH = 100;

  function buildPanel(thisObj) {
    var panel = thisObj instanceof Panel
      ? thisObj
      : new Window("palette", PANEL_TITLE, undefined, { resizeable: true });

    panel.orientation = "column";
    panel.alignChildren = ["fill", "top"];
    panel.spacing = 8;
    panel.margins = 12;

    var title = panel.add("statictext", undefined, "Dimension Animator");
    title.graphics.font = ScriptUI.newFont(title.graphics.font.name, "BOLD", 16);

    var subtitle = panel.add("statictext", undefined, "Base point, value point, endpoint  ·  build 2");
    subtitle.enabled = false;

    var valuesGroup = addSection(panel, "Values");
    var startValueInput = addStepperEdit(valuesGroup, "Start value", "64", -100000, 100000, 1);
    var endValueInput = addStepperEdit(valuesGroup, "End value", "84", -100000, 100000, 1);
    var unitInput = addLabeledEdit(valuesGroup, "Unit", " cm", 76);
    var decimalsInput = addStepperEdit(valuesGroup, "Decimals", "0", 0, 3, 1);

    var countRow = valuesGroup.add("group");
    countRow.orientation = "row";
    countRow.alignChildren = ["left", "center"];
    countRow.spacing = 6;
    var countInput = countRow.add("checkbox", undefined, "Count up");
    countInput.value = true;

    var animateEndRow = valuesGroup.add("group");
    animateEndRow.orientation = "row";
    animateEndRow.alignChildren = ["left", "center"];
    animateEndRow.spacing = 6;
    var animateEndValueInput = animateEndRow.add("checkbox", undefined, "Animate end value");
    animateEndValueInput.value = true;

    var jumpAtInput = addStepperEdit(valuesGroup, "Jump at (%)", "50", 0, 100, 1);
    function syncJumpEnabled() {
      jumpAtInput.enabled = !countInput.value;
    }
    countInput.onClick = syncJumpEnabled;
    syncJumpEnabled();

    var timingGroup = addSection(panel, "Timing");
    var fitRow = timingGroup.add("group");
    fitRow.orientation = "row";
    fitRow.alignChildren = ["left", "center"];
    fitRow.spacing = 6;
    var fitToCompInput = fitRow.add("checkbox", undefined, "Fit animation to composition");
    fitToCompInput.value = true;

    var framesRow = makeRow(timingGroup, "Frame range");
    var startFrameInput = addSpinner(framesRow, "0", 0, 100000, 1, 44);
    framesRow.add("statictext", undefined, "to");
    var endFrameInput = addSpinner(framesRow, "60", 0, 100000, 1, 44);

    function syncFramesEnabled() {
      framesRow.enabled = !fitToCompInput.value;
    }
    fitToCompInput.onClick = syncFramesEnabled;
    syncFramesEnabled();

    var timingButtonRow = timingGroup.add("group");
    timingButtonRow.orientation = "row";
    timingButtonRow.alignChildren = ["left", "center"];
    var fitButton = timingButtonRow.add("button", undefined, "Apply timing to selected rig");
    fitButton.helpTip = "Select a dimension rig layer, then click to push this timing onto its controller.";
    fitButton.onClick = function () {
      runSafely(function () {
        var comp = activeComp();
        var prefix = resolveRigPrefix(comp);
        var controller = layerByName(comp, prefix + "_Controller");
        var effects = controller ? controller.property("ADBE Effect Parade") : null;
        if (!effects) {
          throw new Error("This rig is missing its controller effects. Recreate it with this panel.");
        }
        app.beginUndoGroup("Apply Dimension Timing");
        effects.property("Fit To Comp").property("ADBE Checkbox Control-0001").setValue(fitToCompInput.value ? 1 : 0);
        effects.property("Start Frame").property("ADBE Slider Control-0001").setValue(parseFloat(startFrameInput.text) || 0);
        effects.property("End Frame").property("ADBE Slider Control-0001").setValue(parseFloat(endFrameInput.text) || 0);
        app.endUndoGroup();
      });
    };

    var appearanceGroup = addSection(panel, "Appearance");
    var columns = appearanceGroup.add("group");
    columns.orientation = "row";
    columns.alignChildren = ["left", "top"];
    columns.spacing = 18;

    var lineColumn = columns.add("group");
    lineColumn.orientation = "column";
    lineColumn.alignChildren = ["left", "top"];
    lineColumn.spacing = 6;

    var textColumn = columns.add("group");
    textColumn.orientation = "column";
    textColumn.alignChildren = ["left", "top"];
    textColumn.spacing = 6;

    addSubHeader(lineColumn, "Line & point");
    var lineColorInput = addColorControl(lineColumn, "Line color", "#2563eb");
    var lineWidthInput = addStepperEdit(lineColumn, "Line width", "4", 1, 30, 1);
    var pointSizeInput = addStepperEdit(lineColumn, "Point size", "18", 4, 96, 1);
    var pointFillInput = addColorControl(lineColumn, "Point fill", "#2563eb");
    var pointStrokeInput = addColorControl(lineColumn, "Point stroke", "#ffffff");
    var pointStrokeWidthInput = addStepperEdit(lineColumn, "Stroke width", "4", 0, 20, 1);

    addSubHeader(textColumn, "Text");
    var labelFontInput = addFontControl(textColumn, "Font");
    var labelAlignInput = addAlignmentControl(textColumn, "Text align");
    var labelOrientationInput = addTextOrientationControl(textColumn, "Text direction");
    var labelColorInput = addColorControl(textColumn, "Text color", "#111827");
    var labelFontSizeInput = addStepperEdit(textColumn, "Text size", "36", 8, 160, 1);
    var labelOffsetXInput = addStepperEdit(textColumn, "Text X offset", "0", -300, 300, 2);
    var labelOffsetYInput = addStepperEdit(textColumn, "Text Y offset", "-52", -300, 300, 2);

    var actions = panel.add("group");
    actions.orientation = "row";
    actions.alignChildren = ["fill", "center"];
    actions.spacing = 10;

    var createButton = actions.add("button", undefined, "Create Dimension");
    var updateButton = actions.add("button", undefined, "Update Selected");

    createButton.onClick = function () {
      runSafely(function () {
        var comp = activeComp();
        var settings = readSettings();
        validateOrThrow(settings);
        app.beginUndoGroup("Create Dimension Rig");
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
        var positions = captureNullPositions(comp, prefix);
        app.beginUndoGroup("Update Dimension Rig");
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
        var file = File.saveDialog("Save dimension preset", "JSON:*.json");
        if (!file) {
          return;
        }
        if (!/\.json$/i.test(file.name)) {
          file = new File(file.fsName + ".json");
        }
        writeTextFile(file, core.serializePreset(readPresetValues()));
      });
    };

    loadPresetButton.onClick = function () {
      runSafely(function () {
        var file = File.openDialog("Load dimension preset", "JSON:*.json");
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
        startValue: parseFloat(startValueInput.text),
        endValue: parseFloat(endValueInput.text),
        unit: unitInput.text,
        decimals: parseInt(decimalsInput.text, 10),
        count: countInput.value,
        animateEndValue: animateEndValueInput.value,
        jumpAt: parseFloat(jumpAtInput.text),
        fitToComp: fitToCompInput.value,
        startFrame: parseFloat(startFrameInput.text),
        endFrame: parseFloat(endFrameInput.text),
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
        labelOffsetY: parseFloat(labelOffsetYInput.text),
      };
    }

    function readPresetValues() {
      return {
        startValue: startValueInput.text,
        endValue: endValueInput.text,
        unit: unitInput.text,
        decimals: decimalsInput.text,
        count: countInput.value,
        animateEndValue: animateEndValueInput.value,
        jumpAt: jumpAtInput.text,
        fitToComp: fitToCompInput.value,
        startFrame: startFrameInput.text,
        endFrame: endFrameInput.text,
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
        labelOffsetY: labelOffsetYInput.text,
      };
    }

    function applyPresetValues(values) {
      startValueInput.text = values.startValue;
      endValueInput.text = values.endValue;
      unitInput.text = values.unit;
      decimalsInput.text = values.decimals;
      countInput.value = values.count;
      animateEndValueInput.value = values.animateEndValue;
      jumpAtInput.text = values.jumpAt;
      fitToCompInput.value = values.fitToComp;
      startFrameInput.text = values.startFrame;
      endFrameInput.text = values.endFrame;
      lineColorInput.text = values.lineColor;
      lineWidthInput.text = values.lineWidth;
      pointSizeInput.text = values.pointSize;
      pointFillInput.text = values.pointFill;
      pointStrokeInput.text = values.pointStroke;
      pointStrokeWidthInput.text = values.pointStrokeWidth;
      labelColorInput.text = values.labelColor;
      labelFontSizeInput.text = values.labelFontSize;
      labelOffsetXInput.text = values.labelOffsetX;
      labelOffsetYInput.text = values.labelOffsetY;
      selectDropdownByProperty(labelFontInput, "postScriptName", values.labelFont);
      selectDropdownByProperty(labelAlignInput, "justificationName", values.labelAlign);
      selectDropdownByProperty(labelOrientationInput, "orientationName", values.labelOrientation);
      refreshColorSwatch(lineColorInput);
      refreshColorSwatch(pointFillInput);
      refreshColorSwatch(pointStrokeInput);
      refreshColorSwatch(labelColorInput);
      syncJumpEnabled();
      syncFramesEnabled();
    }

    panel.layout.layout(true);
    panel.layout.resize();
    panel.onResizing = panel.onResize = function () {
      this.layout.resize();
    };

    return panel;
  }

  function createRig(comp, settings, forcedPrefix, preservedPositions) {
    var prefix = forcedPrefix || nextPrefixForComp(comp);
    var center = [comp.width / 2, comp.height / 2];
    var basePosition = preservedPositions && preservedPositions.base ? preservedPositions.base : [center[0], center[1] + 220];
    var valuePosition = preservedPositions && preservedPositions.value ? preservedPositions.value : [center[0], center[1] - 80];
    var endPosition = preservedPositions && preservedPositions.end ? preservedPositions.end : [center[0], center[1] - 220];

    var controller = comp.layers.addNull();
    controller.name = prefix + "_Controller";
    renameNullSource(controller, prefix + "_Controller");
    controller.label = 8;
    controller.enabled = false;
    controller.shy = true;
    controller.property("Transform").property("Position").setValue([center[0] + 180, center[1]]);
    addControllerEffects(controller, settings);

    var baseNull = comp.layers.addNull();
    baseNull.name = prefix + "_Base";
    renameNullSource(baseNull, prefix + "_Base");
    baseNull.label = 8;
    baseNull.property("Transform").property("Position").setValue(basePosition);

    var valueNull = comp.layers.addNull();
    valueNull.name = prefix + "_Value";
    renameNullSource(valueNull, prefix + "_Value");
    valueNull.label = 8;
    valueNull.property("Transform").property("Position").setValue(valuePosition);

    var endNull = comp.layers.addNull();
    endNull.name = prefix + "_End";
    renameNullSource(endNull, prefix + "_End");
    endNull.label = 8;
    endNull.property("Transform").property("Position").setValue(endPosition);
    endNull.property("Transform").property("Position").expression = endPositionConstraintExpression(prefix);

    createLineLayer(comp, prefix, settings);
    createBasePointLayer(comp, prefix, settings);
    createValuePointLayer(comp, prefix, settings);
    createEndPointLayer(comp, prefix, settings);
    createValueLabelLayer(comp, prefix, settings);
    createEndLabelLayer(comp, prefix, settings);

    return prefix;
  }

  function addControllerEffects(controller, settings) {
    addSlider(controller, "Start Value", settings.startValue);
    addSlider(controller, "End Value", settings.endValue);
    addSlider(controller, "Decimals", settings.decimals);
    addSlider(controller, "Jump At", settings.jumpAt);
    addCheckbox(controller, "Count", settings.count);
    addCheckbox(controller, "Animate End Value", settings.animateEndValue);
    addCheckbox(controller, "Fit To Comp", settings.fitToComp);
    addSlider(controller, "Start Frame", settings.startFrame);
    addSlider(controller, "End Frame", settings.endFrame);
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
    var lineGroup = contents.addProperty("ADBE Vector Group");
    lineGroup.name = "Dimension Line";
    var lineVectors = lineGroup.property("ADBE Vectors Group");
    var path = lineVectors.addProperty("ADBE Vector Shape - Group");
    path.property("ADBE Vector Shape").expression = linePathExpression(prefix);
    var stroke = lineVectors.addProperty("ADBE Vector Graphic - Stroke");
    stroke.property("ADBE Vector Stroke Color").setValue(settings.lineColor);
    stroke.property("ADBE Vector Stroke Width").expression = lineWidthExpression(prefix);
    stroke.property("ADBE Vector Stroke Line Cap").setValue(2);

    return layer;
  }

  function createBasePointLayer(comp, prefix, settings) {
    var layer = comp.layers.addShape();
    layer.name = prefix + "_BasePoint";
    layer.label = 8;
    var contents = layer.property("ADBE Root Vectors Group");
    var group = contents.addProperty("ADBE Vector Group");
    group.name = "Base Point";
    var vectors = group.property("ADBE Vectors Group");
    var ellipse = vectors.addProperty("ADBE Vector Shape - Ellipse");
    ellipse.property("ADBE Vector Ellipse Size").expression = pointSizeExpression(prefix);
    var fill = vectors.addProperty("ADBE Vector Graphic - Fill");
    fill.property("ADBE Vector Fill Color").setValue(settings.pointFill);
    var stroke = vectors.addProperty("ADBE Vector Graphic - Stroke");
    stroke.property("ADBE Vector Stroke Color").setValue(settings.pointStroke);
    stroke.property("ADBE Vector Stroke Width").setValue(settings.pointStrokeWidth);
    layer.property("Transform").property("Position").expression = basePositionExpression(prefix);
    return layer;
  }

  function createValuePointLayer(comp, prefix, settings) {
    var layer = comp.layers.addShape();
    layer.name = prefix + "_ValuePoint";
    layer.label = 8;
    var contents = layer.property("ADBE Root Vectors Group");
    var group = contents.addProperty("ADBE Vector Group");
    group.name = "Value Point";
    var vectors = group.property("ADBE Vectors Group");
    var ellipse = vectors.addProperty("ADBE Vector Shape - Ellipse");
    ellipse.property("ADBE Vector Ellipse Size").expression = pointSizeExpression(prefix);
    var fill = vectors.addProperty("ADBE Vector Graphic - Fill");
    fill.property("ADBE Vector Fill Color").setValue(settings.pointFill);
    var stroke = vectors.addProperty("ADBE Vector Graphic - Stroke");
    stroke.property("ADBE Vector Stroke Color").setValue(settings.pointStroke);
    stroke.property("ADBE Vector Stroke Width").setValue(settings.pointStrokeWidth);
    layer.property("Transform").property("Position").expression = valuePositionExpression(prefix);
    return layer;
  }

  function createEndPointLayer(comp, prefix, settings) {
    var layer = comp.layers.addShape();
    layer.name = prefix + "_EndPoint";
    layer.label = 8;
    var contents = layer.property("ADBE Root Vectors Group");
    var group = contents.addProperty("ADBE Vector Group");
    group.name = "End Point";
    var vectors = group.property("ADBE Vectors Group");
    var ellipse = vectors.addProperty("ADBE Vector Shape - Ellipse");
    ellipse.property("ADBE Vector Ellipse Size").expression = pointSizeExpression(prefix);
    var fill = vectors.addProperty("ADBE Vector Graphic - Fill");
    fill.property("ADBE Vector Fill Color").setValue(settings.pointFill);
    var stroke = vectors.addProperty("ADBE Vector Graphic - Stroke");
    stroke.property("ADBE Vector Stroke Color").setValue(settings.pointStroke);
    stroke.property("ADBE Vector Stroke Width").setValue(settings.pointStrokeWidth);
    layer.property("Transform").property("Position").expression = liveEndPositionExpression(prefix);
    layer.property("Transform").property("Opacity").expression = movingEndOpacityExpression(prefix);
    return layer;
  }

  function createValueLabelLayer(comp, prefix, settings) {
    var layer = comp.layers.addText(formatStaticLabel(settings.startValue, settings));
    layer.name = prefix + "_ValueLabel";
    layer.label = 8;

    var source = layer.property("Source Text");
    applyTextDocumentStyle(source, settings);

    layer.property("Transform").property("Position").expression = valueLabelPositionExpression(prefix);
    applyLabelOrientation(layer, prefix, settings);
    return layer;
  }

  function createEndLabelLayer(comp, prefix, settings) {
    var layer = comp.layers.addText(formatStaticLabel(settings.endValue, settings));
    layer.name = prefix + "_EndLabel";
    layer.label = 8;

    var source = layer.property("Source Text");
    applyTextDocumentStyle(source, settings);

    layer.property("Transform").property("Position").expression = endValueLabelPositionExpression(prefix);
    layer.property("Transform").property("Opacity").expression = endValueLabelOpacityExpression(prefix);
    applyLabelOrientation(layer, prefix, settings);
    return layer;
  }

  function applyTextDocumentStyle(source, settings) {
    var doc = source.value;
    doc.fontSize = settings.labelFontSize;
    if (settings.labelFont) {
      doc.font = settings.labelFont;
    }
    doc.applyFill = true;
    doc.fillColor = settings.labelColor;
    doc.justification = settings.labelJustification || ParagraphJustification.CENTER_JUSTIFY;
    source.setValue(doc);
  }

  function formatStaticLabel(value, settings) {
    var decimals = Math.max(0, Math.min(3, parseInt(settings.decimals, 10) || 0));
    var numeric = parseFloat(value);
    if (isNaN(numeric)) {
      numeric = 0;
    }
    return numeric.toFixed(decimals) + (settings.unit || "");
  }

  function configureShapeLayerAtCompOrigin(layer) {
    var transform = layer.property("Transform");
    transform.property("Anchor Point").setValue([0, 0]);
    transform.property("Position").setValue([0, 0]);
    transform.property("Scale").setValue([100, 100]);
    transform.property("Rotation").setValue(0);
  }

  function linePathExpression(prefix) {
    return [
      'var b = thisComp.layer("' + prefix + '_Base").transform.position;',
      'var s = thisComp.layer("' + prefix + '_Value").transform.position;',
      'var e = thisComp.layer("' + prefix + '_End").transform.position;',
      endRevealProgressExpression(prefix),
      "var liveEnd = s + (e - s) * progress;",
      "createPath([[b[0], b[1]], [s[0], s[1]], [liveEnd[0], liveEnd[1]]], [], [], false);",
    ].join("\n");
  }

  function endRevealProgressExpression(prefix) {
    return [
      'var ctrl = thisComp.layer("' + prefix + '_Controller");',
      'var count = ctrl.effect("Count")("Checkbox");',
      'var fit = ctrl.effect("Fit To Comp")("Checkbox");',
      'var t0 = fit > 0.5 ? 0 : ctrl.effect("Start Frame")("Slider") * thisComp.frameDuration;',
      'var t1 = fit > 0.5 ? thisComp.duration - thisComp.frameDuration * 2 : ctrl.effect("End Frame")("Slider") * thisComp.frameDuration;',
      'if (t1 < t0) { var tmp = t0; t0 = t1; t1 = tmp; }',
      'var jumpAt = Math.max(0, Math.min(100, ctrl.effect("Jump At")("Slider")));',
      'var progress;',
      'if (count > 0.5) {',
      '  progress = linear(time, t0, t1, 0, 1);',
      '} else {',
      '  var jump = t0 + (t1 - t0) * jumpAt / 100;',
      '  progress = time < jump ? 0 : 1;',
      '}',
      'progress = Math.max(0, Math.min(1, progress));',
    ].join("\n");
  }

  function basePositionExpression(prefix) {
    return 'thisComp.layer("' + prefix + '_Base").transform.position;';
  }

  function valuePositionExpression(prefix) {
    return 'thisComp.layer("' + prefix + '_Value").transform.position;';
  }

  function endPositionExpression(prefix) {
    return 'thisComp.layer("' + prefix + '_End").transform.position;';
  }

  function liveEndPositionExpression(prefix) {
    return [
      'var s = thisComp.layer("' + prefix + '_Value").transform.position;',
      'var e = thisComp.layer("' + prefix + '_End").transform.position;',
      endRevealProgressExpression(prefix),
      's + (e - s) * progress;',
    ].join("\n");
  }

  function endPositionConstraintExpression(prefix) {
    return [
      'var b = thisComp.layer("' + prefix + '_Base").transform.position;',
      'var v = thisComp.layer("' + prefix + '_Value").transform.position;',
      'var raw = value;',
      'var axis = v - b;',
      'var len2 = axis[0] * axis[0] + axis[1] * axis[1];',
      'if (len2 < 0.0001) {',
      '  raw;',
      '} else {',
      '  var t = ((raw[0] - b[0]) * axis[0] + (raw[1] - b[1]) * axis[1]) / len2;',
      '  b + axis * t;',
      '}',
    ].join("\n");
  }

  function lineRotationExpression(prefix) {
    return [
      'var s = thisComp.layer("' + prefix + '_Value").transform.position;',
      'var e = thisComp.layer("' + prefix + '_End").transform.position;',
      "radiansToDegrees(Math.atan2(e[1] - s[1], e[0] - s[0]));",
    ].join("\n");
  }

  function valueLabelPositionExpression(prefix) {
    return [
      'var ctrl = thisComp.layer("' + prefix + '_Controller");',
      'var v = thisComp.layer("' + prefix + '_Value").transform.position;',
      'v + [ctrl.effect("Label Offset X")("Slider"), ctrl.effect("Label Offset Y")("Slider")];',
    ].join("\n");
  }

  function endValueLabelPositionExpression(prefix) {
    return [
      'var ctrl = thisComp.layer("' + prefix + '_Controller");',
      'var animateEndValue = ctrl.effect("Animate End Value")("Checkbox");',
      'var s = thisComp.layer("' + prefix + '_Value").transform.position;',
      'var e = thisComp.layer("' + prefix + '_End").transform.position;',
      endRevealProgressExpression(prefix),
      'var p = animateEndValue > 0.5 ? s + (e - s) * progress : e;',
      'p + [ctrl.effect("Label Offset X")("Slider"), ctrl.effect("Label Offset Y")("Slider")];',
    ].join("\n");
  }

  function movingEndOpacityExpression(prefix) {
    return [
      endRevealProgressExpression(prefix),
      'progress > 0 ? 100 : 0;',
    ].join("\n");
  }

  function endValueLabelOpacityExpression(prefix) {
    return [
      'var ctrl = thisComp.layer("' + prefix + '_Controller");',
      'var animateEndValue = ctrl.effect("Animate End Value")("Checkbox");',
      endRevealProgressExpression(prefix),
      'animateEndValue > 0.5 ? (progress > 0 ? 100 : 0) : (progress >= 1 ? 100 : 0);',
    ].join("\n");
  }

  function labelAlongLineRotationExpression(prefix) {
    return lineRotationExpression(prefix);
  }

  function lineWidthExpression(prefix) {
    return 'thisComp.layer("' + prefix + '_Controller").effect("Line Width")("Slider");';
  }

  function pointSizeExpression(prefix) {
    return [
      'var ps = thisComp.layer("' + prefix + '_Controller").effect("Point Size")("Slider");',
      "[ps, ps];",
    ].join("\n");
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

  function nextPrefixForComp(comp) {
    var names = [];
    for (var i = 1; i <= comp.numLayers; i += 1) {
      names.push(comp.layer(i).name);
    }
    return core.nextPrefix(names, "Dim");
  }

  function selectedDimensionPrefix(comp) {
    if (!comp.selectedLayers || comp.selectedLayers.length === 0) {
      return null;
    }
    var match = /^(Dim_\d{2,})_/.exec(comp.selectedLayers[0].name);
    return match ? match[1] : null;
  }

  function rigPrefixesInComp(comp) {
    var seen = {};
    var list = [];
    for (var i = 1; i <= comp.numLayers; i += 1) {
      var m = /^(Dim_\d{2,})_/.exec(comp.layer(i).name);
      if (m && !seen[m[1]]) {
        seen[m[1]] = true;
        list.push(m[1]);
      }
    }
    return list;
  }

  function resolveRigPrefix(comp) {
    var selected = selectedDimensionPrefix(comp);
    if (selected) {
      return selected;
    }
    var all = rigPrefixesInComp(comp);
    if (all.length === 1) {
      return all[0];
    }
    if (all.length > 1) {
      throw new Error("This comp has several dimension rigs - select a layer from the one you want.");
    }
    throw new Error("No dimension rig in this comp yet. Click Create Dimension first.");
  }

  function layerByName(comp, name) {
    for (var i = 1; i <= comp.numLayers; i += 1) {
      if (comp.layer(i).name === name) {
        return comp.layer(i);
      }
    }
    return null;
  }

  function renameNullSource(layer, name) {
    try {
      if (layer.source) {
        layer.source.name = name;
      }
    } catch (ignored) {}
  }

  function captureNullPositions(comp, prefix) {
    var positions = {};
    var base = layerByName(comp, prefix + "_Base");
    var value = layerByName(comp, prefix + "_Value");
    var end = layerByName(comp, prefix + "_End");
    if (base) {
      positions.base = base.property("Transform").property("Position").value;
    }
    if (value) {
      positions.value = value.property("Transform").property("Position").value;
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
    upButton.onClick = function () { nudge(1); };
    downButton.onClick = function () { nudge(-1); };
    input.onChange = function () {
      normalizeInput(input, value, minValue, maxValue);
    };
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
    try {
      swatch.addEventListener("mousedown", pickColor);
    } catch (ignored) {}
    input.onChange = function () { paintSwatch(); };
    input.repaintSwatch = paintSwatch;
    paintSwatch();
    return input;
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

  function selectedAlignName(dropdown) {
    if (!dropdown.selection || !dropdown.selection.justificationName) {
      return "center";
    }
    return dropdown.selection.justificationName;
  }

  function selectedTextOrientation(dropdown) {
    if (!dropdown.selection || !dropdown.selection.orientationName) {
      return "horizontal";
    }
    return dropdown.selection.orientationName;
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
    return "#" + hexByte((value >> 16) & 255) + hexByte((value >> 8) & 255) + hexByte(value & 255);
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

  var panel = buildPanel(thisObj);
  if (panel instanceof Window) {
    panel.center();
    panel.show();
  }
})(this);
