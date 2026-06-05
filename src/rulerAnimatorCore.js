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
    var duration = parseNumber(settings.duration);
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

    if (duration <= 0) {
      errors.push("Animation duration must be greater than 0.");
    }

    return {
      errors: errors,
      settings: {
        divisions: divisions,
        visibleStart: visibleStart,
        visibleEnd: visibleEnd,
        labels: labels,
        duration: duration,
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
    var pattern = new RegExp("^" + base + "_(\\d{2})_");

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

  var core = {
    parseLabels: parseLabels,
    visibleIndices: visibleIndices,
    labelSlotsForRange: labelSlotsForRange,
    validateSettings: validateSettings,
    parseHexColor: parseHexColor,
    pad2: pad2,
    nextPrefix: nextPrefix,
  };

  root.RulerAnimatorCore = core;

  if (typeof $ !== "undefined" && $.global) {
    $.global.RulerAnimatorCore = core;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = core;
  }
})(this);
