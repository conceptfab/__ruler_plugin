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
    var base = baseName || "DimLine";
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
      } else if (code < 32) {
        var hex = code.toString(16);
        out += "\\u" + "0000".substring(hex.length) + hex;
      } else {
        out += ch;
      }
    }
    return "\"" + out + "\"";
  }

  // The label shows a fixed, user-entered value. The Source Text expression
  // reads the live Value/Decimals sliders off the controller so editing them in
  // After Effects updates the label without rebuilding the rig. The unit is
  // compiled in as a literal (same approach as Dimension Animator).
  function buildLabelExpression(options) {
    var prefix = options && options.prefix ? String(options.prefix) : "DimLine_01";
    var unit = options && options.unit !== undefined ? String(options.unit) : "";

    return [
      'var ctrl = thisComp.layer("' + prefix + '_Controller");',
      'var v = ctrl.effect("Value")("Slider");',
      'var dec = Math.max(0, Math.min(3, Math.round(ctrl.effect("Decimals")("Slider"))));',
      'v.toFixed(dec) + ' + jsonEscape(unit) + ';',
    ].join("\n");
  }

  // Presets are shared with Ruler and Dimension Animator: each plugin keeps only
  // the keys it knows and defaults the rest, so base-element styling transfers.
  var PRESET_TYPE = "ae-measure-preset";
  var PRESET_VERSION = 1;
  var ACCEPTED_TYPES = {
    "ae-measure-preset": true,
    "ruler-animator-preset": true,
    "dimension-animator-preset": true,
  };

  var PRESET_KEYS = [
    "value",
    "unit",
    "decimals",
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
    value: "100",
    unit: " cm",
    decimals: "0",
    lineColor: "#2563eb",
    lineWidth: "4",
    pointSize: "18",
    pointFill: "#2563eb",
    pointStroke: "#ffffff",
    pointStrokeWidth: "4",
    labelFont: "",
    labelAlign: "center",
    labelOrientation: "horizontal",
    labelColor: "#111827",
    labelFontSize: "36",
    labelOffsetX: "0",
    labelOffsetY: "-52",
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
      fields.push("    " + jsonEscape(key) + ": " + jsonEscape(v[key]));
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
    var errors = [];

    if (decimals < 0) {
      errors.push("Decimals must be 0 or greater.");
    }
    if (decimals > 3) {
      errors.push("Decimals must be 3 or less.");
    }

    return {
      errors: errors,
      settings: {
        value: parseNumber(settings.value),
        unit: settings.unit === undefined || settings.unit === null ? "" : String(settings.unit),
        decimals: decimals,
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
    buildLabelExpression: buildLabelExpression,
    serializePreset: serializePreset,
    deserializePreset: deserializePreset,
    validateSettings: validateSettings,
  };

  root.DimensionLineCore = core;

  if (typeof $ !== "undefined" && $.global) {
    $.global.DimensionLineCore = core;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = core;
  }
})(this);
