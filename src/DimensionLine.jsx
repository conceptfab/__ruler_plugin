(function dimensionLinePanel(thisObj) {
  function loadCore() {
    var REQUIRED = ["serializePreset", "deserializePreset", "validateSettings", "nextPrefix"];

    if ($.fileName) {
      var panelFile = File($.fileName);
      var coreFile = File(panelFile.parent.fsName + "/dimensionLineCore.js");
      if (coreFile.exists) {
        $.evalFile(coreFile);
      }
    }

    if (typeof DimensionLineCore === "undefined") {
      throw new Error("Cannot load dimensionLineCore.js. Reinstall both files into the same ScriptUI Panels folder.");
    }

    var missing = [];
    for (var i = 0; i < REQUIRED.length; i += 1) {
      if (typeof DimensionLineCore[REQUIRED[i]] !== "function") {
        missing.push(REQUIRED[i]);
      }
    }
    if (missing.length > 0) {
      throw new Error(
        "dimensionLineCore.js is outdated (missing: " + missing.join(", ") + ").\n" +
        "Reinstall both files, then fully restart After Effects."
      );
    }

    return DimensionLineCore;
  }

  var core = loadCore();
  var PANEL_TITLE = "Dimension Line";
  var LABEL_WIDTH = 100;

  function buildPanel(thisObj) {
    var panel = thisObj instanceof Panel
      ? thisObj
      : new Window("palette", PANEL_TITLE, undefined, { resizeable: true });

    panel.orientation = "column";
    panel.alignChildren = ["fill", "top"];
    panel.spacing = 8;
    panel.margins = 12;

    var title = panel.add("statictext", undefined, "Dimension Line");
    title.graphics.font = ScriptUI.newFont(title.graphics.font.name, "BOLD", 16);

    var subtitle = panel.add("statictext", undefined, "Two endpoints, dots, value centred on the line  ·  build 1");
    subtitle.enabled = false;

    var valuesGroup = addSection(panel, "Value");
    var valueInput = addStepperEdit(valuesGroup, "Value", "100", -100000, 100000, 1);
    var unitInput = addLabeledEdit(valuesGroup, "Unit", " cm", 76);
    var decimalsInput = addStepperEdit(valuesGroup, "Decimals", "0", 0, 3, 1);

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
    var lineColorInput = addColorControl(lineColumn, "Line color", "#000000");
    var lineWidthInput = addStepperEdit(lineColumn, "Line width", "3", 1, 30, 1);
    var pointSizeInput = addStepperEdit(lineColumn, "Point size", "16", 4, 96, 1);
    var pointFillInput = addColorControl(lineColumn, "Point fill", "#000000");
    var pointStrokeInput = addColorControl(lineColumn, "Point stroke", "#ffffff");
    var pointStrokeWidthInput = addStepperEdit(lineColumn, "Stroke width", "6", 0, 20, 1);

    addSubHeader(textColumn, "Text");
    var labelFontInput = addFontControl(textColumn, "Font");
    var labelAlignInput = addAlignmentControl(textColumn, "Text align");
    var labelOrientationInput = addTextOrientationControl(textColumn, "Text direction");
    var labelColorInput = addColorControl(textColumn, "Text color", "#000000");
    var labelFontSizeInput = addStepperEdit(textColumn, "Text size", "24", 8, 160, 1);
    var labelOffsetXInput = addStepperEdit(textColumn, "Text X offset", "0", -300, 300, 2);
    var labelOffsetYInput = addStepperEdit(textColumn, "Text Y offset", "-16", -300, 300, 2);

    var actions = panel.add("group");
    actions.orientation = "row";
    actions.alignChildren = ["fill", "center"];
    actions.spacing = 10;

    var createButton = actions.add("button", undefined, "Create Dimension Line");
    var updateButton = actions.add("button", undefined, "Update Selected");

    createButton.onClick = function () {
      runSafely(function () {
        var comp = activeComp();
        var settings = readSettings();
        validateOrThrow(settings);
        app.beginUndoGroup("Create Dimension Line");
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
        app.beginUndoGroup("Update Dimension Line");
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
        var file = File.saveDialog("Save dimension line preset", "JSON:*.json");
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
        var file = File.openDialog("Load dimension line preset", "JSON:*.json");
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
        value: parseFloat(valueInput.text),
        unit: unitInput.text,
        decimals: parseInt(decimalsInput.text, 10),
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
        value: valueInput.text,
        unit: unitInput.text,
        decimals: decimalsInput.text,
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
      valueInput.text = values.value;
      unitInput.text = values.unit;
      decimalsInput.text = values.decimals;
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
    var startPosition = preservedPositions && preservedPositions.start ? preservedPositions.start : [center[0] - 220, center[1]];
    var endPosition = preservedPositions && preservedPositions.end ? preservedPositions.end : [center[0] + 220, center[1]];

    var controller = comp.layers.addNull();
    controller.name = prefix + "_Controller";
    renameNullSource(controller, prefix + "_Controller");
    controller.label = 8;
    controller.enabled = false;
    controller.shy = true;
    controller.property("Transform").property("Position").setValue([center[0], center[1] + 180]);
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

    createLineLayer(comp, prefix, settings);
    createStartPointLayer(comp, prefix, settings);
    createEndPointLayer(comp, prefix, settings);
    createLabelLayer(comp, prefix, settings);

    return prefix;
  }

  function addControllerEffects(controller, settings) {
    addSlider(controller, "Value", settings.value);
    addSlider(controller, "Decimals", settings.decimals);
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

  function createStartPointLayer(comp, prefix, settings) {
    var layer = comp.layers.addShape();
    layer.name = prefix + "_StartPoint";
    layer.label = 8;
    var contents = layer.property("ADBE Root Vectors Group");
    var group = contents.addProperty("ADBE Vector Group");
    group.name = "Start Point";
    var vectors = group.property("ADBE Vectors Group");
    var ellipse = vectors.addProperty("ADBE Vector Shape - Ellipse");
    ellipse.property("ADBE Vector Ellipse Size").expression = pointSizeExpression(prefix);
    var fill = vectors.addProperty("ADBE Vector Graphic - Fill");
    fill.property("ADBE Vector Fill Color").setValue(settings.pointFill);
    var stroke = vectors.addProperty("ADBE Vector Graphic - Stroke");
    stroke.property("ADBE Vector Stroke Color").setValue(settings.pointStroke);
    stroke.property("ADBE Vector Stroke Width").setValue(settings.pointStrokeWidth);
    layer.property("Transform").property("Position").expression = startPositionExpression(prefix);
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
    layer.property("Transform").property("Position").expression = endPositionExpression(prefix);
    return layer;
  }

  function createLabelLayer(comp, prefix, settings) {
    var layer = comp.layers.addText(formatStaticLabel(settings.value, settings));
    layer.name = prefix + "_Label";
    layer.label = 8;

    var source = layer.property("Source Text");
    applyTextDocumentStyle(source, settings);
    source.expression = core.buildLabelExpression({ prefix: prefix, unit: settings.unit });

    layer.property("Transform").property("Position").expression = labelPositionExpression(prefix);
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
      'var s = thisComp.layer("' + prefix + '_Start").transform.position;',
      'var e = thisComp.layer("' + prefix + '_End").transform.position;',
      "createPath([[s[0], s[1]], [e[0], e[1]]], [], [], false);",
    ].join("\n");
  }

  function startPositionExpression(prefix) {
    return 'thisComp.layer("' + prefix + '_Start").transform.position;';
  }

  function endPositionExpression(prefix) {
    return 'thisComp.layer("' + prefix + '_End").transform.position;';
  }

  function lineRotationExpression(prefix) {
    return [
      'var s = thisComp.layer("' + prefix + '_Start").transform.position;',
      'var e = thisComp.layer("' + prefix + '_End").transform.position;',
      "radiansToDegrees(Math.atan2(e[1] - s[1], e[0] - s[0]));",
    ].join("\n");
  }

  function labelPositionExpression(prefix) {
    return [
      'var ctrl = thisComp.layer("' + prefix + '_Controller");',
      'var s = thisComp.layer("' + prefix + '_Start").transform.position;',
      'var e = thisComp.layer("' + prefix + '_End").transform.position;',
      "var mid = (s + e) / 2;",
      'mid + [ctrl.effect("Label Offset X")("Slider"), ctrl.effect("Label Offset Y")("Slider")];',
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
    return core.nextPrefix(names, "DimLine");
  }

  function selectedRigPrefix(comp) {
    if (!comp.selectedLayers || comp.selectedLayers.length === 0) {
      return null;
    }
    var match = /^(DimLine_\d{2,})_/.exec(comp.selectedLayers[0].name);
    return match ? match[1] : null;
  }

  function rigPrefixesInComp(comp) {
    var seen = {};
    var list = [];
    for (var i = 1; i <= comp.numLayers; i += 1) {
      var m = /^(DimLine_\d{2,})_/.exec(comp.layer(i).name);
      if (m && !seen[m[1]]) {
        seen[m[1]] = true;
        list.push(m[1]);
      }
    }
    return list;
  }

  function resolveRigPrefix(comp) {
    var selected = selectedRigPrefix(comp);
    if (selected) {
      return selected;
    }
    var all = rigPrefixesInComp(comp);
    if (all.length === 1) {
      return all[0];
    }
    if (all.length > 1) {
      throw new Error("This comp has several dimension lines - select a layer from the one you want.");
    }
    throw new Error("No dimension line in this comp yet. Click Create Dimension Line first.");
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
    dropdown.selection = right;
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
    dropdown.selection = alongLine;
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
    // Keep up to 3 decimal places so the Value field can match the Decimals
    // control (0-3). Integers still render without a trailing ".0".
    var rounded = Math.round(value * 1000) / 1000;
    if (Math.abs(rounded - Math.round(rounded)) < 0.0005) {
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
