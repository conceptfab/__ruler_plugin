(function (root) {
  function trim(value) {
    return String(value).replace(/^\s+|\s+$/g, "");
  }

  function parseInteger(value) {
    var parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  function parseNumber(value) {
    var parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  function parseBoolean(value) {
    return value === true || value === "true" || value === 1 || value === "1";
  }

  function parseHexColor(input) {
    var value = trim(input || "").replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(value)) {
      return [1, 1, 1];
    }

    var red = parseInt(value.substr(0, 2), 16) / 255;
    var green = parseInt(value.substr(2, 2), 16) / 255;
    var blue = parseInt(value.substr(4, 2), 16) / 255;

    return [
      Math.round(red * 10000) / 10000,
      Math.round(green * 10000) / 10000,
      Math.round(blue * 10000) / 10000,
    ];
  }

  function pad2(number) {
    var value = parseInteger(number);
    return value < 10 ? "0" + value : String(value);
  }

  function nextPrefix(existingLayerNames, baseName) {
    var base = baseName || "Dim";
    var max = 0;
    var pattern = new RegExp("^" + base + "_(\\d{2,})_");

    for (var i = 0; i < existingLayerNames.length; i += 1) {
      var match = pattern.exec(existingLayerNames[i]);
      if (match) {
        var value = parseInteger(match[1]);
        if (value > max) {
          max = value;
        }
      }
    }

    return base + "_" + pad2(max + 1);
  }

  function formatValue(value, decimals) {
    var places = Math.max(0, Math.min(3, parseInteger(decimals)));
    var numeric = parseNumber(value);
    return numeric.toFixed(places);
  }

  function jsonEscape(value) {
    var input = String(value);
    var out = "";
    for (var i = 0; i < input.length; i += 1) {
      var ch = input.charAt(i);
      var code = input.charCodeAt(i);
      if (ch === "\"") {
        out += "\\\"";
      } else if (ch === "\\") {
        out += "\\\\";
      } else if (ch === "\n") {
        out += "\\n";
      } else if (ch === "\r") {
        out += "\\r";
      } else if (ch === "\t") {
        out += "\\t";
      } else if (code < 32 || code === 8232 || code === 8233) {
        // Escape control chars plus U+2028/U+2029: harmless in JSON, but in
        // After Effects' ES3-era expression engine these are line terminators
        // that would break a string literal (potential expression injection).
        var hex = code.toString(16);
        out += "\\u" + "0000".substring(hex.length) + hex;
      } else {
        out += ch;
      }
    }
    return "\"" + out + "\"";
  }

  function buildValueExpression(options) {
    var prefix = options && options.prefix ? String(options.prefix) : "Dim_01";
    var unit = options && options.unit !== undefined ? String(options.unit) : "";

    return [
      'var ctrl = thisComp.layer("' + prefix + '_Controller");',
      'var sv = ctrl.effect("Start Value")("Slider");',
      'var ev = ctrl.effect("End Value")("Slider");',
      'var dec = Math.max(0, Math.min(3, Math.round(ctrl.effect("Decimals")("Slider"))));',
      'var count = ctrl.effect("Count")("Checkbox");',
      'var fit = ctrl.effect("Fit To Comp")("Checkbox");',
      'var t0 = fit > 0.5 ? 0 : ctrl.effect("Start Frame")("Slider") * thisComp.frameDuration;',
      'var t1 = fit > 0.5 ? thisComp.duration - thisComp.frameDuration * 2 : ctrl.effect("End Frame")("Slider") * thisComp.frameDuration;',
      'if (t1 < t0) { var tmp = t0; t0 = t1; t1 = tmp; }',
      'var jumpAt = Math.max(0, Math.min(100, ctrl.effect("Jump At")("Slider")));',
      'var v;',
      'if (count > 0.5) {',
      '  v = linear(time, t0, t1, sv, ev);',
      '} else {',
      '  var jump = t0 + (t1 - t0) * jumpAt / 100;',
      '  v = time < jump ? sv : ev;',
      '}',
      'Number(v).toFixed(dec) + ' + jsonEscape(unit) + ';',
    ].join("\n");
  }

  function buildStaticValueExpression(options) {
    var prefix = options && options.prefix ? String(options.prefix) : "Dim_01";
    var effectName = options && options.effectName ? String(options.effectName) : "Start Value";
    var unit = options && options.unit !== undefined ? String(options.unit) : "";

    return [
      'var ctrl = thisComp.layer("' + prefix + '_Controller");',
      'var v = ctrl.effect("' + effectName + '")("Slider");',
      'var dec = Math.max(0, Math.min(3, Math.round(ctrl.effect("Decimals")("Slider"))));',
      'Number(v).toFixed(dec) + ' + jsonEscape(unit) + ';',
    ].join("\n");
  }

  var PRESET_TYPE = "ae-measure-preset";
  var PRESET_VERSION = 1;
  // Presets are shared between Ruler and Dimension Animator: each plugin keeps
  // only the keys it knows and defaults the rest. Accept the shared type plus
  // both legacy per-plugin types for backward compatibility.
  var ACCEPTED_TYPES = {
    "ae-measure-preset": true,
    "ruler-animator-preset": true,
    "dimension-animator-preset": true,
  };
  var BOOLEAN_KEYS = { fitToComp: true, count: true, animateEndValue: true };

  var PRESET_KEYS = [
    "startValue",
    "endValue",
    "unit",
    "decimals",
    "count",
    "animateEndValue",
    "jumpAt",
    "fitToComp",
    "startFrame",
    "endFrame",
    "lineColor",
    "lineWidth",
    "pointSize",
    "pointFill",
    "pointStroke",
    "pointStrokeWidth",
    "labelFont",
    "labelAlign",
    "labelOrientation",
    "labelColor",
    "labelFontSize",
    "labelOffsetX",
    "labelOffsetY",
  ];

  var PRESET_DEFAULTS = {
    startValue: "64",
    endValue: "84",
    unit: " cm",
    decimals: "0",
    count: true,
    animateEndValue: true,
    jumpAt: "50",
    fitToComp: true,
    startFrame: "0",
    endFrame: "60",
    lineColor: "#000000",
    lineWidth: "3",
    pointSize: "16",
    pointFill: "#000000",
    pointStroke: "#ffffff",
    pointStrokeWidth: "6",
    labelFont: "",
    labelAlign: "right",
    labelOrientation: "alongLine",
    labelColor: "#000000",
    labelFontSize: "24",
    labelOffsetX: "0",
    labelOffsetY: "-16",
  };

  function clonePresetDefaults() {
    var copy = {};
    for (var i = 0; i < PRESET_KEYS.length; i += 1) {
      copy[PRESET_KEYS[i]] = PRESET_DEFAULTS[PRESET_KEYS[i]];
    }
    return copy;
  }

  function normalizePresetValues(rawValues) {
    var source = rawValues || {};
    var values = {};

    for (var i = 0; i < PRESET_KEYS.length; i += 1) {
      var key = PRESET_KEYS[i];
      var raw = source[key];
      if (raw === undefined || raw === null) {
        values[key] = PRESET_DEFAULTS[key];
      } else if (BOOLEAN_KEYS[key]) {
        values[key] = parseBoolean(raw);
      } else {
        values[key] = String(raw);
      }
    }

    return values;
  }

  function serializePreset(values) {
    var v = normalizePresetValues(values);
    var fields = [];

    for (var i = 0; i < PRESET_KEYS.length; i += 1) {
      var key = PRESET_KEYS[i];
      var encoded = BOOLEAN_KEYS[key] ? (v[key] ? "true" : "false") : jsonEscape(v[key]);
      fields.push("    " + jsonEscape(key) + ": " + encoded);
    }

    return "{\n" +
      "  " + jsonEscape("type") + ": " + jsonEscape(PRESET_TYPE) + ",\n" +
      "  " + jsonEscape("version") + ": " + PRESET_VERSION + ",\n" +
      "  " + jsonEscape("values") + ": {\n" +
      fields.join(",\n") + "\n" +
      "  }\n" +
      "}\n";
  }

  function parseJson(text) {
    var s = String(text);
    if (s.length > 0 && s.charCodeAt(0) === 65279) {
      s = s.substring(1);
    }
    var n = s.length;
    var i = 0;

    function fail(message) {
      throw new SyntaxError(message + " at position " + i);
    }
    function skipWhitespace() {
      while (i < n) {
        var c = s.charAt(i);
        if (c === " " || c === "\t" || c === "\n" || c === "\r") {
          i += 1;
        } else {
          break;
        }
      }
    }
    function readString() {
      var result = "";
      i += 1;
      while (i < n) {
        var c = s.charAt(i);
        i += 1;
        if (c === "\"") {
          return result;
        }
        if (c === "\\") {
          var e = s.charAt(i);
          i += 1;
          if (e === "\"") { result += "\""; }
          else if (e === "\\") { result += "\\"; }
          else if (e === "/") { result += "/"; }
          else if (e === "n") { result += "\n"; }
          else if (e === "t") { result += "\t"; }
          else if (e === "r") { result += "\r"; }
          else if (e === "b") { result += "\b"; }
          else if (e === "f") { result += "\f"; }
          else if (e === "u") {
            var hex = s.substr(i, 4);
            i += 4;
            result += String.fromCharCode(parseInt(hex, 16));
          } else {
            fail("Invalid escape");
          }
        } else {
          result += c;
        }
      }
      fail("Unterminated string");
    }
    function readNumber() {
      var start = i;
      if (s.charAt(i) === "-") { i += 1; }
      while (i < n && s.charAt(i) >= "0" && s.charAt(i) <= "9") { i += 1; }
      if (s.charAt(i) === ".") {
        i += 1;
        while (i < n && s.charAt(i) >= "0" && s.charAt(i) <= "9") { i += 1; }
      }
      if (s.charAt(i) === "e" || s.charAt(i) === "E") {
        i += 1;
        if (s.charAt(i) === "+" || s.charAt(i) === "-") { i += 1; }
        while (i < n && s.charAt(i) >= "0" && s.charAt(i) <= "9") { i += 1; }
      }
      return parseFloat(s.substring(start, i));
    }
    function readValue() {
      skipWhitespace();
      if (i >= n) { fail("Unexpected end of input"); }
      var c = s.charAt(i);
      if (c === "{") { return readObject(); }
      if (c === "[") { return readArray(); }
      if (c === "\"") { return readString(); }
      if (c === "-" || (c >= "0" && c <= "9")) { return readNumber(); }
      if (s.substr(i, 4) === "true") { i += 4; return true; }
      if (s.substr(i, 5) === "false") { i += 5; return false; }
      if (s.substr(i, 4) === "null") { i += 4; return null; }
      fail("Unexpected token");
    }
    function readObject() {
      var obj = {};
      i += 1;
      skipWhitespace();
      if (s.charAt(i) === "}") { i += 1; return obj; }
      for (;;) {
        skipWhitespace();
        if (s.charAt(i) !== "\"") { fail("Expected string key"); }
        var key = readString();
        skipWhitespace();
        if (s.charAt(i) !== ":") { fail("Expected ':'"); }
        i += 1;
        obj[key] = readValue();
        skipWhitespace();
        var ch = s.charAt(i);
        if (ch === ",") { i += 1; continue; }
        if (ch === "}") { i += 1; return obj; }
        fail("Expected ',' or '}'");
      }
    }
    function readArray() {
      var arr = [];
      i += 1;
      skipWhitespace();
      if (s.charAt(i) === "]") { i += 1; return arr; }
      for (;;) {
        arr.push(readValue());
        skipWhitespace();
        var ch = s.charAt(i);
        if (ch === ",") { i += 1; continue; }
        if (ch === "]") { i += 1; return arr; }
        fail("Expected ',' or ']'");
      }
    }

    skipWhitespace();
    if (i >= n) { fail("Empty input"); }
    var parsed = readValue();
    skipWhitespace();
    if (i < n) { fail("Unexpected trailing content"); }
    return parsed;
  }

  function deserializePreset(text) {
    var warnings = [];
    var parsed;

    try {
      parsed = parseJson(text);
    } catch (parseError) {
      return { values: clonePresetDefaults(), errors: ["File is not valid JSON."], warnings: warnings };
    }

    if (!parsed || typeof parsed !== "object" || !ACCEPTED_TYPES[parsed.type]) {
      return { values: clonePresetDefaults(), errors: ["File is not a compatible measure preset."], warnings: warnings };
    }

    if (parsed.version && parsed.version > PRESET_VERSION) {
      warnings.push("Preset was saved by a newer version; loading compatible fields only.");
    }

    return { values: normalizePresetValues(parsed.values), errors: [], warnings: warnings };
  }

  function validateSettings(settings) {
    var decimals = parseInteger(settings.decimals);
    var jumpAt = parseNumber(settings.jumpAt);
    var fitToComp = settings.fitToComp ? true : false;
    var startFrame = parseNumber(settings.startFrame);
    var endFrame = parseNumber(settings.endFrame);
    var errors = [];

    if (decimals < 0) {
      errors.push("Decimals must be 0 or greater.");
    }
    if (decimals > 3) {
      errors.push("Decimals must be 3 or less.");
    }
    if (jumpAt < 0 || jumpAt > 100) {
      errors.push("Jump At must be between 0 and 100.");
    }
    if (!fitToComp) {
      if (startFrame < 0) {
        errors.push("Start frame must be 0 or greater.");
      }
      if (endFrame <= startFrame) {
        errors.push("End frame must be greater than start frame.");
      }
    }

    return {
      errors: errors,
      settings: {
        startValue: parseNumber(settings.startValue),
        endValue: parseNumber(settings.endValue),
        unit: settings.unit === undefined || settings.unit === null ? "" : String(settings.unit),
        decimals: decimals,
        count: settings.count ? true : false,
        jumpAt: jumpAt,
        fitToComp: fitToComp,
        startFrame: startFrame,
        endFrame: endFrame,
      },
    };
  }

  var core = {
    PRESET_KEYS: PRESET_KEYS,
    PRESET_DEFAULTS: PRESET_DEFAULTS,
    parseHexColor: parseHexColor,
    pad2: pad2,
    nextPrefix: nextPrefix,
    formatValue: formatValue,
    buildValueExpression: buildValueExpression,
    buildStaticValueExpression: buildStaticValueExpression,
    serializePreset: serializePreset,
    deserializePreset: deserializePreset,
    validateSettings: validateSettings,
  };

  root.DimensionAnimatorCore = core;

  if (typeof $ !== "undefined" && $.global) {
    $.global.DimensionAnimatorCore = core;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = core;
  }
})(this);
