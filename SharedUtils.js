/**
 * Shared Utilities for K&L Recycling CRM
 * Version: 2.8.0 (Merged Clean-Room + Enhanced Functionality + SchemaNormalizer Integration)
 * Logic: Safe-Fetch Pattern + Enhanced Date Validation + Schema Integration
 */

var SharedUtils = {};

// ============================================================================
// SCHEMA NORMALIZER INTEGRATION
// ============================================================================



/**
 * Safe access to SchemaNormalizer component with fallback
 * Tries multiple methods to find SchemaNormalizer
 */
SharedUtils.getSchemaNormalizer = function() {
  try {
    // Method 1: Direct global (works in V8 when const is used)
    if (typeof SchemaNormalizer !== 'undefined') {
      return SchemaNormalizer;
    }
    // Method 2: globalThis (modern V8)
    if (typeof globalThis !== 'undefined' && globalThis.SchemaNormalizer) {
      return globalThis.SchemaNormalizer;
    }
    // Method 3: Try to find via window/self (browser context)
    if (typeof window !== 'undefined' && window.SchemaNormalizer) {
      return window.SchemaNormalizer;
    }
    if (typeof self !== 'undefined' && self.SchemaNormalizer) {
      return self.SchemaNormalizer;
    }
    // Method 4: Try to find via this (function context)
    try {
      if (typeof this !== 'undefined' && this.SchemaNormalizer) {
        return this.SchemaNormalizer;
      }
    } catch(e) {}
    // Return null - fallback will be used
    console.warn('SchemaNormalizer not found - using fallback');
    return null;
  } catch (e) {
    console.warn('SchemaNormalizer lookup failed:', e.message);
    return null;
  }
};

/**
 * Initialize SchemaNormalizer - call this from any function that needs it
 * Provides a manual binding as fallback
 */
SharedUtils.initSchemaNormalizer = function(schemaNormalizerInstance) {
  if (schemaNormalizerInstance) {
    try {
      // Assign to all possible global scopes
      SchemaNormalizer = schemaNormalizerInstance;
      if (typeof globalThis !== 'undefined') globalThis.SchemaNormalizer = schemaNormalizerInstance;
      if (typeof global !== 'undefined') global.SchemaNormalizer = schemaNormalizerInstance;
      console.log('SchemaNormalizer manually initialized');
    } catch (e) {
      console.warn('Failed to initialize SchemaNormalizer:', e.message);
    }
  }
};

/**
 * Get canonical name for a field using SchemaNormalizer if available
 * Falls back to standard normalization if SchemaNormalizer not available
 * @param {string} fieldName - The field name to canonicalize
 * @param {string} sheetType - The sheet type (PROSPECTS, OUTREACH, ACCOUNTS)
 * @return {string} The canonical field name
 */
SharedUtils.getCanonicalFieldName = function(fieldName, sheetType) {
  try {
    var schemaNormalizer = SharedUtils.getSchemaNormalizer();
    if (schemaNormalizer && schemaNormalizer.getCanonicalName) {
      // SchemaNormalizer.getCanonicalName expects (fieldName, sheetName) - note the order
      return schemaNormalizer.getCanonicalName(fieldName, sheetType);
    }
  } catch (e) {
    console.warn('SchemaNormalizer not available, using fallback normalization');
  }
  // Fallback to standard normalization
  return SharedUtils.normalizeHeader(fieldName);
};

/**
 * Build a header map for a sheet using SchemaNormalizer if available
 * Falls back to standard mapping if SchemaNormalizer not available
 * @param {Array} headers - Array of header names from the sheet
 * @param {string} sheetType - The sheet type (PROSPECTS, OUTREACH, ACCOUNTS)
 * @return {Object} Header map with canonical names as keys
 */
SharedUtils.buildHeaderMap = function(headers, sheetType) {
  try {
    var schemaNormalizer = SharedUtils.getSchemaNormalizer();
    if (schemaNormalizer && schemaNormalizer.buildHeaderMap) {
      // SchemaNormalizer.buildHeaderMap expects (sheetName, headers) - note the reversed order!
      return schemaNormalizer.buildHeaderMap(sheetType, headers);
    }
  } catch (e) {
    console.warn('SchemaNormalizer not available, using fallback header mapping');
  }
  
  // Fallback implementation
  var headerMap = {};
  for (var i = 0; i < headers.length; i++) {
    var canonicalName = SharedUtils.normalizeHeader(headers[i]);
    headerMap[canonicalName] = i;
  }
  return headerMap;
};

/**
 * Check if a field is valid for a given sheet type
 * @param {string} fieldName - The field name to validate
 * @param {string} sheetType - The sheet type (PROSPECTS, OUTREACH, ACCOUNTS)
 * @return {boolean} True if the field is valid
 */
SharedUtils.isValidField = function(fieldName, sheetType) {
  try {
    var schemaNormalizer = SharedUtils.getSchemaNormalizer();
    if (schemaNormalizer && schemaNormalizer.SCHEMA && schemaNormalizer.SCHEMA[sheetType]) {
      var canonicalName = SharedUtils.getCanonicalFieldName(fieldName, sheetType);
      return schemaNormalizer.SCHEMA[sheetType].hasOwnProperty(canonicalName);
    }
  } catch (e) {
    console.warn('SchemaNormalizer not available, skipping field validation');
  }
  return true; // Fallback: assume field is valid
};

/**
 * Get schema definition for a sheet type
 * @param {string} sheetType - The sheet type (PROSPECTS, OUTREACH, ACCOUNTS)
 * @return {Object|null} Schema definition or null if not available
 */
SharedUtils.getSchemaDefinition = function(sheetType) {
  try {
    var schemaNormalizer = SharedUtils.getSchemaNormalizer();
    if (schemaNormalizer && schemaNormalizer.SCHEMA) {
      return schemaNormalizer.SCHEMA[sheetType] || null;
    }
  } catch (e) {
    console.warn('SchemaNormalizer not available');
  }
  return null;
};

/**
 * Get all canonical field names for a sheet type
 * @param {string} sheetType - The sheet type (PROSPECTS, OUTREACH, ACCOUNTS)
 * @return {Array} Array of canonical field names
 */
SharedUtils.getSchemaFields = function(sheetType) {
  var schema = SharedUtils.getSchemaDefinition(sheetType);
  if (schema) {
    return Object.keys(schema);
  }
  return [];
};

// ============================================================================
// ENHANCED DATE VALIDATION
// ============================================================================

/**
 * Enhanced date validation and formatting utilities with multiple format support
 */
var DateValidationUtils = {
  /**
   * Supported date formats for parsing
   */
  FORMATS: {
    ISO: 'ISO',
    US: 'MM/dd/yyyy',
    EU: 'dd/MM/yyyy',
    CUSTOM: 'custom'
  },

  /**
   * Date parsing patterns for different formats
   */
  PATTERNS: {
    ISO: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    US: /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(\d{4})$/,
    EU: /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(\d{4})$/,
    CUSTOM: null // Will be set by user
  },

  /**
   * Validates and parses a date string with configurable format support
   * @param {any} dateValue - The date value to validate and parse
   * @param {Object} options - Validation options
   * @param {string} options.preferredFormat - Preferred format to try first (ISO, US, EU, CUSTOM)
   * @param {boolean} options.strictMode - Whether to enforce strict format matching (default: false)
   * @param {string} options.customPattern - Custom regex pattern for CUSTOM format
   * @param {number} options.minYear - Minimum allowed year (default: 1900)
   * @param {number} options.maxYear - Maximum allowed year (default: 2100)
   * @param {boolean} options.allowFuture - Whether future dates are allowed (default: true)
   * @param {boolean} options.allowPast - Whether past dates are allowed (default: true)
   * @param {string} context - Context for error messages
   * @return {Date|null} Valid Date object or null if invalid
   */
  parseDate: function(dateValue, options, context) {
    options = options || {};
    context = context || 'date';
    
    // Handle null/undefined values
    if (dateValue === null || dateValue === undefined || dateValue === '') {
      return null;
    }

    var dateObj;
    var preferredFormat = options.preferredFormat || this.FORMATS.ISO;
    var strictMode = options.strictMode || false;
    var minYear = options.minYear || 1900;
    var maxYear = options.maxYear || 2100;
    var allowFuture = options.allowFuture !== false; // Default true
    var allowPast = options.allowPast !== false; // Default true

    try {
      // Handle Date objects directly
      if (dateValue instanceof Date) {
        dateObj = dateValue;
      }
      // Handle numeric timestamps
      else if (typeof dateValue === 'number') {
        dateObj = new Date(dateValue);
      }
      // Handle string dates
      else if (typeof dateValue === 'string') {
        dateObj = this.parseDateString(dateValue, preferredFormat, options.customPattern, strictMode);
      }
      else {
        throw new Error('Unsupported date type: ' + typeof dateValue);
      }

      // Validate the parsed date
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date value: ' + dateValue);
      }

      // Apply range validation
      var year = dateObj.getFullYear();
      if (year < minYear || year > maxYear) {
        throw new Error('Date year ' + year + ' is outside allowed range [' + minYear + '-' + maxYear + ']');
      }

      // Check future/past restrictions
      var now = new Date();
      var isFuture = dateObj > now;
      var isPast = dateObj < now;

      if (!allowFuture && isFuture) {
        throw new Error('Future dates not allowed for ' + context + ': ' + dateValue);
      }
      if (!allowPast && isPast) {
        throw new Error('Past dates not allowed for ' + context + ': ' + dateValue);
      }

      return dateObj;

    } catch (e) {
      var errorMsg = 'Date validation failed for ' + context + ': ' + e.message;
      console.warn(errorMsg);
      return null;
    }
  },

  /**
   * Parses a date string using the specified format
   * @param {string} dateString - The date string to parse
   * @param {string} format - Format to use for parsing
   * @param {string} customPattern - Custom regex pattern for CUSTOM format
   * @param {boolean} strictMode - Whether to enforce strict format matching
   * @return {Date} Parsed Date object
   * @throws {Error} If parsing fails
   */
  parseDateString: function(dateString, format, customPattern, strictMode) {
    var dateStr = dateString.trim();
    
    // Try ISO format first (most reliable)
    if (format === this.FORMATS.ISO || format === 'auto') {
      try {
        var isoDate = new Date(dateStr);
        if (!isNaN(isoDate.getTime())) {
          return isoDate;
        }
      } catch (e) {
        // ISO parsing failed, continue to other formats
      }
    }

    // Try US format (MM/dd/yyyy)
    if (format === this.FORMATS.US || format === 'auto') {
      var usMatch = dateStr.match(this.PATTERNS.US);
      if (usMatch) {
        var month = parseInt(usMatch[1], 10) - 1; // JS months are 0-based
        var day = parseInt(usMatch[2], 10);
        var year = parseInt(usMatch[3], 10);
        var usDate = new Date(year, month, day);
        if (usDate.getFullYear() === year && usDate.getMonth() === month && usDate.getDate() === day) {
          return usDate;
        }
      }
    }

    // Try EU format (dd/MM/yyyy)
    if (format === this.FORMATS.EU || format === 'auto') {
      var euMatch = dateStr.match(this.PATTERNS.EU);
      if (euMatch) {
        var day = parseInt(euMatch[1], 10);
        var month = parseInt(euMatch[2], 10) - 1; // JS months are 0-based
        var year = parseInt(euMatch[3], 10);
        var euDate = new Date(year, month, day);
        if (euDate.getFullYear() === year && euDate.getMonth() === month && euDate.getDate() === day) {
          return euDate;
        }
      }
    }

    // Try custom format
    if (format === this.FORMATS.CUSTOM && customPattern) {
      var customRegex = new RegExp(customPattern);
      var customMatch = dateStr.match(customRegex);
      if (customMatch) {
        var customDate = new Date(dateStr);
        if (!isNaN(customDate.getTime())) {
          return customDate;
        }
      }
    }

    // If strict mode is enabled and no format matched, throw error
    if (strictMode) {
      throw new Error('Date string does not match expected format: ' + dateStr);
    }

    // Try auto-detection if not in strict mode
    if (format !== 'auto') {
      return this.parseDateString(dateStr, 'auto', customPattern, strictMode);
    }

    // If all parsing attempts failed
    throw new Error('Unable to parse date string: ' + dateStr);
  },

  /**
   * Validates a date range (start date before end date)
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @param {Object} options - Validation options
   * @param {boolean} options.includeEqual - Whether to allow equal dates (default: false)
   * @param {string} context - Context for error messages
   * @return {Object} Validation result with success flag and error message if failed
   */
  validateDateRange: function(startDate, endDate, options, context) {
    options = options || {};
    context = context || 'date range';
    
    var start = this.parseDate(startDate, options, context + ' (start)');
    var end = this.parseDate(endDate, options, context + ' (end)');
    
    if (!start || !end) {
      return {
        success: false,
        error: 'Invalid date(s) in range: ' + context
      };
    }
    
    var includeEqual = options.includeEqual || false;
    var isValid = includeEqual ? start <= end : start < end;
    
    if (!isValid) {
      return {
        success: false,
        error: 'Start date (' + start.toDateString() + ') must be before end date (' + end.toDateString() + ') for ' + context
      };
    }
    
    return {
      success: true,
      startDate: start,
      endDate: end
    };
  },

  /**
   * Calculates the difference between two dates
   * @param {Date|string} date1 - First date
   * @param {Date|string} date2 - Second date
   * @param {string} unit - Unit of measurement ('days', 'hours', 'minutes', 'seconds')
   * @param {Object} options - Calculation options
   * @return {number|null} Difference in specified units, or null if invalid
   */
  dateDiff: function(date1, date2, unit, options) {
    options = options || {};
    
    var d1 = this.parseDate(date1, options, 'date difference (first)');
    var d2 = this.parseDate(date2, options, 'date difference (second)');
    
    if (!d1 || !d2) {
      return null;
    }
    
    var diffMs = Math.abs(d2.getTime() - d1.getTime());
    
    switch (unit) {
      case 'days':
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
      case 'hours':
        return Math.floor(diffMs / (1000 * 60 * 60));
      case 'minutes':
        return Math.floor(diffMs / (1000 * 60));
      case 'seconds':
        return Math.floor(diffMs / 1000);
      default:
        return diffMs; // Return milliseconds by default
    }
  }
};

/**
 * Standard Header Normalization
 * Enhanced to use SchemaNormalizer when available
 * NOTE: This function is used by MenuFunctions.js for header normalization
 * It trims whitespace, converts to lowercase, and collapses multiple spaces
 */
SharedUtils.normalizeHeader = function(header) {
  if (!header) return "";
  // Trim, lowercase, and collapse multiple whitespace to single space
  return header.toString().trim().toLowerCase().replace(/\s+/g, ' ');
};

/**
 * Find column index using fuzzy matching
 * Uses SchemaNormalizer if available, falls back to loose matching
 * @param {Array} headers - Array of header names from sheet
 * @param {string} targetColumn - The column name to find (can be canonical, variation, or loose match)
 * @param {string} sheetType - Sheet type for SchemaNormalizer
 * @returns {number} Column index or -1 if not found
 */
SharedUtils.findColumnIndex = function(headers, targetColumn, sheetType) {
  if (!headers || !targetColumn || headers.length === 0) return -1;
  
  var normalizedTarget = SharedUtils.normalizeHeader(targetColumn);
  
  // Try SchemaNormalizer first for fuzzy matching
  var schemaNormalizer = SharedUtils.getSchemaNormalizer();
  if (schemaNormalizer && schemaNormalizer.buildHeaderMap) {
    try {
      // Note: SchemaNormalizer.buildHeaderMap expects (sheetName, headers)
      var headerMap = schemaNormalizer.buildHeaderMap(sheetType, headers);
      // Try canonical name
      var canonicalTarget = schemaNormalizer.getCanonicalName ? 
        schemaNormalizer.getCanonicalName(targetColumn, sheetType) : normalizedTarget;
      
      if (headerMap[canonicalTarget] !== undefined) {
        return headerMap[canonicalTarget];
      }
    } catch (e) {
      console.warn('SchemaNormalizer findColumnIndex failed, falling back to loose matching');
    }
  }
  
  // Fallback: loose matching (contains, spaces, underscores ignored)
  var targetLoose = normalizedTarget.replace(/[\s_]/g, '');
  
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i];
    if (!header) continue;
    
    var normalizedHeader = SharedUtils.normalizeHeader(header);
    var headerLoose = normalizedHeader.replace(/[\s_]/g, '');
    
    // Exact match
    if (normalizedHeader === normalizedTarget || headerLoose === targetLoose) {
      return i;
    }
    // Contains match
    if (normalizedHeader.indexOf(normalizedTarget) > -1 || 
        normalizedTarget.indexOf(normalizedHeader) > -1) {
      return i;
    }
    // Loose match (remove spaces/underscores)
    if (headerLoose.indexOf(targetLoose) > -1 || targetLoose.indexOf(headerLoose) > -1) {
      return i;
    }
  }
  
  return -1;
};

/**
 * Get value from row by column name with fuzzy matching
 * @param {Array} row - Data row
 * @param {Array} headers - Header array from sheet
 * @param {string} targetColumn - Column name to find
 * @param {string} sheetType - Sheet type for SchemaNormalizer
 * @returns {*} Cell value or null
 */
SharedUtils.getRowValue = function(row, headers, targetColumn, sheetType) {
  var idx = SharedUtils.findColumnIndex(headers, targetColumn, sheetType);
  if (idx > -1 && idx < row.length) {
    return row[idx];
  }
  return null;
};

/**
 * Build a robust header map with fuzzy matching
 * @param {Array} headers - Array of header names from sheet
 * @param {string} sheetType - Sheet type (PROSPECTS, OUTREACH, etc)
 * @param {Array} requiredFields - Optional array of required field names
 * @returns {Object} Map of canonical names to column indices
 */
SharedUtils.buildFuzzyHeaderMap = function(headers, sheetType, requiredFields) {
  var map = {};
  var fields = requiredFields || [];
  
  // Get canonical field names from schema if available
  var schemaNormalizer = SharedUtils.getSchemaNormalizer();
  var schema = schemaNormalizer && schemaNormalizer.SCHEMA ? 
    schemaNormalizer.SCHEMA[sheetType] : null;
  
  // Add all required fields to the map
  fields.forEach(function(field) {
    var idx = SharedUtils.findColumnIndex(headers, field, sheetType);
    if (idx > -1) {
      var canonical = field;
      if (schema && schema[field]) {
        canonical = schema[field].header || field;
      }
      map[SharedUtils.normalizeHeader(canonical)] = idx;
      map[SharedUtils.normalizeHeader(field)] = idx;
      map[field] = idx;
    }
  });
  
  return map;
};

/**
 * Safe Spreadsheet Access Check
 */
SharedUtils.checkSpreadsheetAccess = function(functionName) {
  var name = functionName || 'unknown';
  try {
    if (typeof SpreadsheetApp === 'undefined') {
      throw new Error('SpreadsheetApp service not available');
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('Active spreadsheet not available');
    return { success: true, spreadsheet: ss };
  } catch (e) {
    console.error('Access error in ' + name + ': ' + e.message);
    return { success: false, error: e.message };
  }
};

/**
 * Safe Sheet Retrieval
 */
SharedUtils.getSheetSafe = function(sheetName, functionName) {
  var access = SharedUtils.checkSpreadsheetAccess(functionName);
  if (!access.success) return access;
  
  try {
    var sheet = access.spreadsheet.getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet not found: ' + sheetName);
    return { success: true, sheet: sheet };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

/**
 * CRITICAL: getSafeSheetData with _rowIndex Injection
 * This is the primary data engine for the SuiteCRM Dashboard.
 * Enhanced to use SchemaNormalizer for header mapping
 */
SharedUtils.getSafeSheetData = function(sheetName, requiredColumns) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];

    var rawHeaders = data[0];
    var normalizedHeaders = rawHeaders.map(function(h) { return SharedUtils.normalizeHeader(h); });
    
    var useSchemaNormalizer = SharedUtils.getSchemaNormalizer() !== null;
    var colMap = {};
    var sheetType = sheetName.toUpperCase();

    if (useSchemaNormalizer) {
      // colMap will have canonical keys like 'priorityScore'
      colMap = SharedUtils.buildHeaderMap(rawHeaders, sheetType);
    } else {
      requiredColumns.forEach(function(col) {
        var norm = SharedUtils.normalizeHeader(col);
        var idx = normalizedHeaders.indexOf(norm);
        if (idx > -1) colMap[norm] = idx;
      });
    }

    var results = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var obj = { '_rowIndex': i + 1 };
      
      requiredColumns.forEach(function(col) {
        var lowercaseKey = SharedUtils.normalizeHeader(col);
        var idx = undefined;
        
        if (useSchemaNormalizer) {
          var canonicalKey = SharedUtils.getCanonicalFieldName(col, sheetType);
          idx = colMap[canonicalKey];
          
          // Inject both keys for compatibility
          var val = (idx !== undefined) ? row[idx] : null;
          obj[lowercaseKey] = val;
          obj[canonicalKey] = val;
        } else {
          idx = colMap[lowercaseKey];
          obj[lowercaseKey] = (idx !== undefined) ? row[idx] : null;
        }
      });
      results.push(obj);
    }
    return results;
  } catch (e) {
    console.error('getSafeSheetData error: ' + e.message);
    return [];
  }
};

/**
 * ID Generation Utilities
 */
SharedUtils.generateUniqueId = function(prefix) {
  if (prefix === 'CID') {
    return prefix + '-' + Math.floor(Math.random() * 100000).toString();
  } else if (prefix === 'LID') {
    var nextNumber = getNextSequentialNumber('LID');
    return 'LID-00' + nextNumber.toString().padStart(3, '0');
  } else {
    var rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return (prefix || 'ID') + '-' + rand;
  }
};

SharedUtils.generateCompanyId = function(companyName) {
  if (!companyName) return SharedUtils.generateUniqueId('CID');
  var clean = companyName.toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
  var code = (clean.substring(0, 3) || 'XXX').padEnd(3, 'X');
  var nextNumber = getNextSequentialNumberForPrefix('CID-' + code);
  return 'CID-' + code + nextNumber.toString().padStart(2, '0');
};

/**
 * Currency and Key Validation
 */
SharedUtils.parseCurrency = function(val) {
  if (!val) return 0.0;
  if (typeof val === 'number') return val;
  var clean = val.toString().replace(/[$,]/g, '');
  return parseFloat(clean) || 0.0;
};

SharedUtils.validateKeys = function(obj, keys) {
  var missing = [];
  keys.forEach(function(k) {
    if (!obj.hasOwnProperty(k)) {
      missing.push(k);
    }
  });
  if (missing.length > 0) {
    throw new Error('Missing required data keys: ' + missing.join(', '));
  }
  return true;
};

/**
 * Enhanced formatDate function with improved error handling and validation
 * @param {any} date - The date value to format
 * @param {Object} options - Formatting options
 * @param {string} options.timezone - Timezone for formatting (defaults to CONFIG.TIMEZONE)
 * @param {string} options.dateFormat - Date format string (defaults to CONFIG.DATE_FORMAT)
 * @param {boolean} options.returnIso - Whether to return ISO string on error (default: true)
 * @param {string} context - Context for error messages
 * @return {string} Formatted date string or empty string on error
 */
SharedUtils.formatDate = function(date, options, context) {
  options = options || {};
  context = context || 'date formatting';
  
  try {
    // Use the enhanced date validation
    var dateObj = DateValidationUtils.parseDate(date, options, context);
    
    if (!dateObj) {
      console.warn('Invalid date provided to formatDate:', date, 'for context:', context);
      return '';
    }
    
    // Get timezone and format from options or config
    var timezone = options.timezone || (typeof CONFIG !== 'undefined' ? CONFIG.TIMEZONE : 'America/Chicago') || 'America/Chicago';
    var dateFormat = options.dateFormat || (typeof CONFIG !== 'undefined' ? CONFIG.DATE_FORMAT : 'MM/dd/yyyy') || 'MM/dd/yyyy';
    
    // Handle test environment where SpreadsheetApp may not be available
    if (typeof SpreadsheetApp === 'undefined') {
      // Test environment fallback: use simple date formatting
      var month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      var day = dateObj.getDate().toString().padStart(2, '0');
      var year = dateObj.getFullYear();
      
      if (dateFormat === 'MM/dd/yyyy') {
        return month + '/' + day + '/' + year;
      } else if (dateFormat === 'yyyy-MM-dd') {
        return year + '-' + month + '-' + day;
      } else if (dateFormat === 'ISO') {
        return dateObj.toISOString().split('T')[0];
      }
      // Default fallback
      return month + '/' + day + '/' + year;
    }
    
    // Add null check for spreadsheet before using Utilities.formatDate
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      console.warn('Spreadsheet not available for formatDate, returning ISO string for context:', context);
      return dateObj.toISOString();
    }
    
    return Utilities.formatDate(dateObj, timezone, dateFormat);
  } catch (e) {
    var errorMsg = 'Error formatting date for context "' + context + '": ' + e.message;
    console.error(errorMsg);
    
    // Return ISO string if requested and available
    if (options.returnIso !== false && date instanceof Date) {
      return date.toISOString();
    }
    
    return '';
  }
};

/**
 * Validates and formats a date range for reporting
 * @param {any} startDate - Start date value
 * @param {any} endDate - End date value
 * @param {Object} options - Validation and formatting options
 * @return {Object} Validation result with formatted dates or error
 */
SharedUtils.validateAndFormatDateRange = function(startDate, endDate, options) {
  options = options || {};
  
  var validation = DateValidationUtils.validateDateRange(startDate, endDate, options, 'report date range');
  
  if (!validation.success) {
    return {
      success: false,
      error: validation.error
    };
  }
  
  var formattedStart = SharedUtils.formatDate(validation.startDate, options, 'report start date');
  var formattedEnd = SharedUtils.formatDate(validation.endDate, options, 'report end date');
  
  return {
    success: true,
    startDate: validation.startDate,
    endDate: validation.endDate,
    formattedStart: formattedStart,
    formattedEnd: formattedEnd,
    diffDays: DateValidationUtils.dateDiff(validation.startDate, validation.endDate, 'days', options)
  };
};

/**
 * Gets the next sequential number for a given prefix.
 */
function getNextSequentialNumber(prefix) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet;

    if (prefix && prefix.startsWith('LID')) {
      sheet = ss.getSheetByName(typeof CONFIG !== 'undefined' ? CONFIG.SHEETS.OUTREACH : 'Outreach');
    } else {
      sheet = ss.getSheetByName(typeof CONFIG !== 'undefined' ? CONFIG.SHEETS.PROSPECTS : 'Prospects');
    }

    if (!sheet) return 1;

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return 1;

    var headers = data[0];
    var idCol = -1;

    if (prefix && prefix.startsWith('LID')) {
      idCol = headers.indexOf('Outreach ID');
    } else if (prefix && prefix.startsWith('CID')) {
      idCol = headers.indexOf('Company ID');
    }

    if (idCol === -1) return 1;

    var maxNumber = 0;

    for (var i = 1; i < data.length; i++) {
      var idValue = data[i][idCol];
      if (idValue && typeof idValue === 'string' && idValue.startsWith(prefix)) {
        var numberPart = idValue.replace(prefix, '').replace(/^\d+/, '');
        var number = parseInt(numberPart) || 0;
        if (number > maxNumber) maxNumber = number;
      }
    }

    return maxNumber + 1;
  } catch (e) {
    console.error('Error getting next sequential number:', e);
    return Math.floor(Math.random() * 1000) + 1;
  }
}

/**
 * Gets the next sequential number for a specific prefix pattern.
 */
function getNextSequentialNumberForPrefix(prefixPattern) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(typeof CONFIG !== 'undefined' ? CONFIG.SHEETS.PROSPECTS : 'Prospects');

    if (!sheet) return 1;

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return 1;

    var headers = data[0];
    var idCol = headers.indexOf('Company ID');

    if (idCol === -1) return 1;

    var maxNumber = 0;

    for (var i = 1; i < data.length; i++) {
      var idValue = data[i][idCol];
      if (idValue && typeof idValue === 'string' && idValue.startsWith(prefixPattern)) {
        var numberPart = idValue.replace(prefixPattern, '');
        var number = parseInt(numberPart) || 0;
        if (number > maxNumber) maxNumber = number;
      }
    }

    return maxNumber + 1;
  } catch (e) {
    console.error('Error getting next sequential number for prefix:', e);
    return Math.floor(Math.random() * 100) + 1;
  }
}
