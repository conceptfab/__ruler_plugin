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

  function parseLabels(input) {
    if (!input) {
      return [];
    }

    var parts = String(input).split(",");
    var labels = [];

    for (var i = 0; i < parts.length; i += 1) {
      var label = trim(parts[i]);
      if (label.length > 0) {
        labels.push(label);
      }
    }

    return labels;
  }

  function visibleIndices(start, end) {
    var indices = [];
    var from = parseInteger(start);
    var to = parseInteger(end);

    for (var index = from; index <= to; index += 1) {
      indices.push(index);
    }

    return indices;
  }

  function labelSlotsForRange(start, end) {
    var indices = visibleIndices(start, end);
    var slots = [];

    for (var i = 0; i < indices.length; i += 1) {
      if (indices[i] !== 0) {
        slots.push(indices[i]);
      }
    }

    return slots;
  }

  function validateSettings(settings) {
    var divisions = parseInteger(settings.divisions);
    var visibleStart = parseInteger(settings.visibleStart);
    var visibleEnd = parseInteger(settings.visibleEnd);
    var labels = settings.labels || [];
    var fitToComp = settings.fitToComp ? true : false;
    var startFrame = parseNumber(settings.startFrame);
    var endFrame = parseNumber(settings.endFrame);
    var errors = [];

    if (divisions < 1) {
      errors.push("Division count must be at least 1.");
    }

    if (visibleStart < 0 || visibleEnd < 0 || visibleStart > divisions || visibleEnd > divisions) {
      errors.push("Visible point range must be inside 0...division count.");
    }

    if (visibleStart > visibleEnd) {
      errors.push("Visible point start must be less than or equal to visible point end.");
    }

    var expectedLabels = labelSlotsForRange(visibleStart, visibleEnd).length;
    if (labels.length !== expectedLabels) {
      errors.push("Label count must match visible non-start points: expected " + expectedLabels + ", got " + labels.length + ".");
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
        divisions: divisions,
        visibleStart: visibleStart,
        visibleEnd: visibleEnd,
        labels: labels,
        fitToComp: fitToComp,
        startFrame: startFrame,
        endFrame: endFrame,
      },
    };
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
    var base = baseName || "Ruler";
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

  var PRESET_TYPE = "ruler-animator-preset";
  var PRESET_VERSION = 1;

  var PRESET_KEYS = [
    "divisions",
    "visibleStart",
    "visibleEnd",
    "labels",
    "fitToComp",
    "startFrame",
    "endFrame",
    "showFinalLine",
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
    divisions: "6",
    visibleStart: "4",
    visibleEnd: "6",
    labels: "80 cm, 100 cm, 120 cm",
    fitToComp: true,
    startFrame: "0",
    endFrame: "60",
    showFinalLine: true,
    lineColor: "#2563eb",
    lineWidth: "4",
    pointSize: "26",
    pointFill: "#f59e0b",
    pointStroke: "#ffffff",
    pointStrokeWidth: "4",
    labelFont: "",
    labelAlign: "center",
    labelOrientation: "horizontal",
    labelColor: "#92400e",
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

  // Whitelist to known keys, fill gaps from defaults, coerce to the field shape
  // the panel expects (strings for inputs, boolean for the guide checkbox).
  function normalizePresetValues(rawValues) {
    var source = rawValues || {};
    var values = {};

    for (var i = 0; i < PRESET_KEYS.length; i += 1) {
      var key = PRESET_KEYS[i];
      var raw = source[key];

      if (raw === undefined || raw === null) {
        values[key] = PRESET_DEFAULTS[key];
      } else if (key === "showFinalLine" || key === "fitToComp") {
        values[key] = (raw === true || raw === "true" || raw === 1 || raw === "1");
      } else {
        values[key] = String(raw);
      }
    }

    return values;
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

  // Build the preset JSON explicitly rather than via a JSON engine, so saving
  // behaves identically in Node and in After Effects' ExtendScript (whose JSON
  // support is unreliable). This is the path the tests exercise.
  function serializePreset(values) {
    var v = normalizePresetValues(values);
    var fields = [];

    for (var i = 0; i < PRESET_KEYS.length; i += 1) {
      var key = PRESET_KEYS[i];
      var encoded = (key === "showFinalLine")
        ? (v[key] ? "true" : "false")
        : jsonEscape(v[key]);
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

  // Minimal dependency-free JSON parser (objects, arrays, strings, numbers,
  // booleans, null). Same code in Node and ExtendScript, so loading is covered
  // by the tests and cannot diverge from the runtime.
  function parseJson(text) {
    var s = String(text);
    if (s.length > 0 && s.charCodeAt(0) === 65279) {
      s = s.substring(1); // strip UTF-8 BOM
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
      if (i >= n) {
        fail("Unexpected end of input");
      }
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

    if (!parsed || typeof parsed !== "object" || parsed.type !== PRESET_TYPE) {
      return { values: clonePresetDefaults(), errors: ["File is not a Ruler Animator preset."], warnings: warnings };
    }

    if (parsed.version && parsed.version > PRESET_VERSION) {
      warnings.push("Preset was saved by a newer version; loading compatible fields only.");
    }

    return { values: normalizePresetValues(parsed.values), errors: [], warnings: warnings };
  }

  var core = {
    parseLabels: parseLabels,
    visibleIndices: visibleIndices,
    labelSlotsForRange: labelSlotsForRange,
    validateSettings: validateSettings,
    parseHexColor: parseHexColor,
    pad2: pad2,
    nextPrefix: nextPrefix,
    serializePreset: serializePreset,
    deserializePreset: deserializePreset,
  };

  root.RulerAnimatorCore = core;

  if (typeof $ !== "undefined" && $.global) {
    $.global.RulerAnimatorCore = core;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = core;
  }
})(this);
