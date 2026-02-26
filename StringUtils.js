/**
 * String utilities for safe operations
 */
var StringUtils = {
  /**
   * Normalize string for comparison
   */
  normalize: function(str) {
    return (str || '').toString().toLowerCase().trim();
  },

  /**
   * Safe string comparison
   */
  equals: function(a, b) {
    return this.normalize(a) === this.normalize(b);
  },

  /**
   * Safe string contains check
   */
  contains: function(str, substring) {
    if (!str || !substring) return false;
    return this.normalize(str).includes(this.normalize(substring));
  },

  /**
   * Safe string split with filtering
   */
  splitAndFilter: function(str, delimiter) {
    if (!str || typeof str !== 'string') {
      return [];
    }
    return str.split(delimiter || ',')
      .map(function(part) { return part.trim(); })
      .filter(function(part) { return part.length > 0; });
  },

  /**
   * Safe string startsWith
   */
  startsWith: function(str, prefix) {
    if (!str || !prefix) return false;
    return this.normalize(str).startsWith(this.normalize(prefix));
  },

  /**
   * Safe string endsWith
   */
  endsWith: function(str, suffix) {
    if (!str || !suffix) return false;
    return this.normalize(str).endsWith(this.normalize(suffix));
  },

  /**
   * Safe string truncation
   */
  truncate: function(str, maxLength) {
    if (!str) return '';
    str = str.toString();
    return str.length <= maxLength ? str : str.substring(0, maxLength) + '...';
  },

  /**
   * Safe string formatting with placeholders
   */
  format: function(template) {
    if (!template) return '';

    var args = Array.prototype.slice.call(arguments, 1);
    return template.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] !== 'undefined' ? args[number] : match;
    });
  },

  /**
   * Convert to title case
   */
  toTitleCase: function(str) {
    if (!str) return '';
    return str.toString().toLowerCase().replace(/\b\w/g, function(char) {
      return char.toUpperCase();
    });
  },

  /**
   * Safe string concatenation
   */
  concat: function() {
    var parts = Array.prototype.slice.call(arguments);
    return parts
      .filter(function(part) { return part !== null && part !== undefined; })
      .map(function(part) { return part.toString().trim(); })
      .join(' ');
  },

  /**
   * Validate string is not empty or null
   */
  isNotEmpty: function(str) {
    return str !== null && str !== undefined && str.toString().trim().length > 0;
  },

  /**
   * Get string length safely
   */
  length: function(str) {
    if (!str) return 0;
    return str.toString().trim().length;
  },

  /**
   * Safe substring extraction
   */
  substring: function(str, start, end) {
    if (!str) return '';
    str = str.toString();
    if (start < 0) start = 0;
    if (end === undefined || end > str.length) end = str.length;
    return str.substring(start, end);
  },

  /**
   * Remove all whitespace from string
   */
  removeWhitespace: function(str) {
    if (!str) return '';
    return str.toString().replace(/\s+/g, '');
  },

  /**
   * Capitalize first letter
   */
  capitalizeFirst: function(str) {
    if (!str) return '';
    str = str.toString().trim();
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
};
