/**
 * Settings CSV Validation and Import
 * Robust validation and normalization for settings CSV data
 * Handles case sensitivity, misspellings, and malformed data gracefully
 */

var SettingsValidation = {
  /**
   * Expected headers for settings CSV (case-insensitive)
   */
  EXPECTED_HEADERS: ['category', 'key', 'value_1', 'value_2', 'value_3', 'value_4', 'description'],

  /**
   * Valid categories (case-insensitive)
   */
  VALID_CATEGORIES: [
    'industry_score', 'urgency_band', 'workflow_rule',
    'validation_list', 'global_const', 'followup_template'
  ],

  /**
   * Main function to import and validate settings CSV
   * @param {string} csvText - The CSV text to import
   * @return {Object} Result with success status and validation details
   */
  importAndValidateSettingsCSV: function(csvText) {
    try {
      if (!csvText || typeof csvText !== 'string') {
        throw new Error('CSV text is required and must be a string');
      }

      // Parse CSV with enhanced error handling
      var parseResult = this.parseSettingsCSV(csvText);
      if (!parseResult.success) {
        return {
          success: false,
          error: 'CSV parsing failed: ' + parseResult.error,
          details: parseResult.details
        };
      }

      // Validate structure and data
      var validationResult = this.validateSettingsData(parseResult.data);
      if (!validationResult.success) {
        return {
          success: false,
          error: 'Data validation failed',
          details: validationResult.details,
          warnings: validationResult.warnings
        };
      }

      // Normalize data
      var normalizedData = this.normalizeSettingsData(parseResult.data);

      // Import to sheet
      var importResult = this.importToSettingsSheet(normalizedData);
      if (!importResult.success) {
        return {
          success: false,
          error: 'Import to sheet failed: ' + importResult.error,
          details: importResult.details
        };
      }

      return {
        success: true,
        message: 'Settings CSV imported and validated successfully',
        importedRows: normalizedData.length,
        warnings: validationResult.warnings || []
      };

    } catch (e) {
      return {
        success: false,
        error: 'Settings import failed: ' + e.message,
        stack: e.stack
      };
    }
  },

  /**
   * Parse CSV text with robust error handling
   * @param {string} csvText - CSV text to parse
   * @return {Object} Parse result
   */
  parseSettingsCSV: function(csvText) {
    try {
      var lines = csvText.split('\n').filter(function(line) {
        return line.trim().length > 0;
      });

      if (lines.length === 0) {
        throw new Error('No valid CSV data found');
      }

      // Parse CSV rows with enhanced quote handling
      var data = [];
      var parseErrors = [];

      for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        var line = lines[lineIndex];
        var parseResult = this.parseCSVLine(line, lineIndex + 1);

        if (parseResult.success) {
          data.push(parseResult.row);
        } else {
          parseErrors.push({
            line: lineIndex + 1,
            error: parseResult.error,
            lineContent: line.substring(0, 50) + (line.length > 50 ? '...' : '')
          });
        }
      }

      if (data.length === 0) {
        throw new Error('No valid data rows could be parsed');
      }

      return {
        success: true,
        data: data,
        parseErrors: parseErrors
      };

    } catch (e) {
      return {
        success: false,
        error: e.message,
        details: {
          csvTextLength: csvText.length,
          lineCount: lines.length
        }
      };
    }
  },

  /**
   * Parse a single CSV line with robust quote handling
   * @param {string} line - CSV line to parse
   * @param {number} lineNumber - Line number for error reporting
   * @return {Object} Parse result
   */
  parseCSVLine: function(line, lineNumber) {
    try {
      var row = [];
      var current = '';
      var inQuotes = false;
      var quoteChar = '"';

      for (var i = 0; i < line.length; i++) {
        var char = line[i];

        // Handle quote characters
        if (char === '"' || char === "'") {
          if (!inQuotes) {
            // Starting a quoted field
            inQuotes = true;
            quoteChar = char;
          } else if (char === quoteChar) {
            // Check if this is an escaped quote (like "")
            if (i + 1 < line.length && line[i + 1] === quoteChar) {
              // Escaped quote, add one quote to current field
              current += quoteChar;
              i++; // Skip the next quote
            } else {
              // Ending a quoted field
              inQuotes = false;
            }
          } else {
            // Different quote character, treat as regular character
            current += char;
          }
        }
        // Handle comma separator (only outside quotes)
        else if (char === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        }
        // Regular character
        else {
          current += char;
        }
      }

      // Add the last field
      row.push(current.trim());

      // Clean up fields by removing surrounding quotes if present
      row = row.map(function(field) {
        if (field.length >= 2 &&
            ((field.startsWith('"') && field.endsWith('"')) ||
             (field.startsWith("'") && field.endsWith("'")))) {
          return field.slice(1, -1);
        }
        return field;
      });

      return {
        success: true,
        row: row
      };

    } catch (e) {
      return {
        success: false,
        error: 'Failed to parse line ' + lineNumber + ': ' + e.message
      };
    }
  },

  /**
   * Validate settings data structure and content
   * @param {Array} data - Parsed CSV data
   * @return {Object} Validation result
   */
  validateSettingsData: function(data) {
    try {
      var warnings = [];
      var errors = [];

      // Check if first row contains headers
      var firstRow = data[0];
      var headerValidation = this.validateHeaders(firstRow);
      if (!headerValidation.success) {
        errors.push('Header validation failed: ' + headerValidation.error);
        return {
          success: false,
          error: 'Invalid CSV structure',
          details: {
            headerErrors: headerValidation.errors,
            headerWarnings: headerValidation.warnings
          }
        };
      }

      // Add header validation warnings
      if (headerValidation.warnings && headerValidation.warnings.length > 0) {
        warnings = warnings.concat(headerValidation.warnings);
      }

      // Process data rows (skip header row)
      var dataRows = data.slice(1);
      var rowErrors = [];
      var rowWarnings = [];

      for (var rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        var row = dataRows[rowIndex];
        var rowNumber = rowIndex + 2; // +2 because we skip header row

        // Validate row structure
        if (row.length < this.EXPECTED_HEADERS.length) {
          rowErrors.push({
            row: rowNumber,
            error: 'Row has fewer columns than expected (' + row.length + ' vs ' + this.EXPECTED_HEADERS.length + ')',
            columnsFound: row.length,
            columnsExpected: this.EXPECTED_HEADERS.length
          });
          continue;
        }

        // Extract values using header mapping
        var category = row[headerValidation.headerMap.category] || '';
        var key = row[headerValidation.headerMap.key] || '';
        var value1 = row[headerValidation.headerMap.value_1] || '';
        var value2 = row[headerValidation.headerMap.value_2] || '';
        var value3 = row[headerValidation.headerMap.value_3] || '';
        var value4 = row[headerValidation.headerMap.value_4] || '';
        var description = row[headerValidation.headerMap.description] || '';

        // Validate category
        var categoryValidation = this.validateCategory(category);
        if (!categoryValidation.valid) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid category: ' + categoryValidation.error,
            category: category,
            suggestions: categoryValidation.suggestions
          });
        } else if (categoryValidation.warning) {
          rowWarnings.push({
            row: rowNumber,
            warning: 'Category warning: ' + categoryValidation.warning,
            category: category,
            normalized: categoryValidation.normalized
          });
        }

        // Validate required fields based on category
        if (categoryValidation.normalized) {
          var fieldValidation = this.validateFieldsForCategory(
            categoryValidation.normalized,
            key, value1, value2, value3, value4
          );

          if (fieldValidation.errors && fieldValidation.errors.length > 0) {
            fieldValidation.errors.forEach(function(error) {
              rowErrors.push({
                row: rowNumber,
                error: error,
                category: category
              });
            });
          }

          if (fieldValidation.warnings && fieldValidation.warnings.length > 0) {
            fieldValidation.warnings.forEach(function(warning) {
              rowWarnings.push({
                row: rowNumber,
                warning: warning,
                category: category
              });
            });
          }
        }
      }

      if (rowErrors.length > 0) {
        return {
          success: false,
          error: 'Data validation failed',
          details: {
            rowErrors: rowErrors,
            rowWarnings: rowWarnings,
            totalErrors: rowErrors.length,
            totalWarnings: rowWarnings.length
          }
        };
      }

      return {
        success: true,
        warnings: warnings.concat(rowWarnings),
        details: {
          totalRows: dataRows.length,
          validRows: dataRows.length - rowErrors.length,
          warnings: rowWarnings.length
        }
      };

    } catch (e) {
      return {
        success: false,
        error: 'Validation error: ' + e.message,
        stack: e.stack
      };
    }
  },

  /**
   * Validate CSV headers
   * @param {Array} headers - Header row from CSV
   * @return {Object} Validation result
   */
  validateHeaders: function(headers) {
    try {
      var errors = [];
      var warnings = [];
      var headerMap = {};

      // Check if we have any headers
      if (!headers || !Array.isArray(headers) || headers.length === 0) {
        throw new Error('No headers found in CSV');
      }

      // Create mapping from normalized header names to their indices
      var foundHeaders = [];
      var missingHeaders = [];

      this.EXPECTED_HEADERS.forEach(function(expectedHeader, index) {
        var normalizedExpected = expectedHeader.toLowerCase().trim();
        var found = false;

        for (var i = 0; i < headers.length; i++) {
          var actualHeader = headers[i];
          if (!actualHeader) continue;

          var normalizedActual = actualHeader.toString().toLowerCase().trim();

          if (normalizedActual === normalizedExpected) {
            headerMap[expectedHeader] = i;
            foundHeaders.push(expectedHeader);
            found = true;
            break;
          }
        }

        if (!found) {
          missingHeaders.push(expectedHeader);
        }
      });

      // Report missing headers
      if (missingHeaders.length > 0) {
        errors.push('Missing required headers: ' + missingHeaders.join(', '));
      }

      // Check for extra headers
      var extraHeaders = [];
      for (var i = 0; i < headers.length; i++) {
        var header = headers[i];
        if (!header) continue;

        var normalizedHeader = header.toString().toLowerCase().trim();
        var isExpected = this.EXPECTED_HEADERS.some(function(expected) {
          return expected.toLowerCase().trim() === normalizedHeader;
        });

        if (!isExpected) {
          extraHeaders.push(header);
        }
      }

      if (extraHeaders.length > 0) {
        warnings.push('Extra headers found (will be ignored): ' + extraHeaders.join(', '));
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: 'Header validation failed',
          errors: errors,
          warnings: warnings,
          foundHeaders: foundHeaders,
          missingHeaders: missingHeaders
        };
      }

      return {
        success: true,
        headerMap: headerMap,
        warnings: warnings,
        foundHeaders: foundHeaders,
        extraHeaders: extraHeaders
      };

    } catch (e) {
      return {
        success: false,
        error: e.message,
        errors: [e.message]
      };
    }
  },

  /**
   * Validate and normalize category
   * @param {string} category - Category value
   * @return {Object} Validation result
   */
  validateCategory: function(category) {
    try {
      if (!category || typeof category !== 'string') {
        return {
          valid: false,
          error: 'Category is required',
          suggestions: this.VALID_CATEGORIES.map(function(c) { return c.toUpperCase(); })
        };
      }

      var originalCategory = category;
      var normalizedCategory = category.toString().trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

      // Check if normalized category is valid
      var isValid = this.VALID_CATEGORIES.some(function(validCat) {
        return validCat.toLowerCase() === normalizedCategory;
      });

      if (!isValid) {
        // Find similar categories for suggestions
        var suggestions = [];
        this.VALID_CATEGORIES.forEach(function(validCat) {
          if (this.areSimilarStrings(normalizedCategory, validCat.toLowerCase())) {
            suggestions.push(validCat.toUpperCase());
          }
        }, this);

        return {
          valid: false,
          error: 'Invalid category: ' + originalCategory,
          normalized: normalizedCategory,
          suggestions: suggestions.length > 0 ? suggestions : this.VALID_CATEGORIES.map(function(c) { return c.toUpperCase(); })
        };
      }

      // Check if original needed normalization
      var needsNormalization = originalCategory.toLowerCase() !== normalizedCategory;
      var warning = needsNormalization ?
        'Category normalized from "' + originalCategory + '" to "' + normalizedCategory + '"' : null;

      return {
        valid: true,
        normalized: normalizedCategory,
        original: originalCategory,
        warning: warning
      };

    } catch (e) {
      return {
        valid: false,
        error: 'Category validation error: ' + e.message
      };
    }
  },

  /**
   * Check if two strings are similar (for suggestion purposes)
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @return {boolean} True if strings are similar
   */
  areSimilarStrings: function(str1, str2) {
    if (!str1 || !str2) return false;

    str1 = str1.toLowerCase().trim();
    str2 = str2.toLowerCase().trim();

    // Exact match
    if (str1 === str2) return true;

    // Check if one string contains the other
    if (str1.includes(str2) || str2.includes(str1)) return true;

    // Check Levenshtein distance (simple version)
    var distance = this.simpleLevenshtein(str1, str2);
    var maxLength = Math.max(str1.length, str2.length);

    // Consider similar if distance is less than 3 or less than 25% of max length
    return distance <= 3 || distance <= maxLength * 0.25;
  },

  /**
   * Simple Levenshtein distance calculation
   * @param {string} a - First string
   * @param {string} b - Second string
   * @return {number} Distance
   */
  simpleLevenshtein: function(a, b) {
    try {
      a = a || '';
      b = b || '';
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;

      var matrix = [];

      // Initialize matrix
      for (var i = 0; i <= b.length; i++) {
        matrix[i] = [i];
      }

      for (var j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
      }

      // Fill matrix
      for (var i = 1; i <= b.length; i++) {
        for (var j = 1; j <= a.length; j++) {
          if (b.charAt(i-1) === a.charAt(j-1)) {
            matrix[i][j] = matrix[i-1][j-1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i-1][j-1] + 1, // substitution
              matrix[i][j-1] + 1,   // insertion
              matrix[i-1][j] + 1    // deletion
            );
          }
        }
      }

      return matrix[b.length][a.length];
    } catch (e) {
      console.error('simpleLevenshtein error:', e.message);
      return 0;
    }
  },

  /**
   * Validate fields based on category
   * @param {string} category - Normalized category
   * @param {string} key - Key value
   * @param {string} value1 - Value 1
   * @param {string} value2 - Value 2
   * @param {string} value3 - Value 3
   * @param {string} value4 - Value 4
   * @return {Object} Validation result
   */
  validateFieldsForCategory: function(category, key, value1, value2, value3, value4) {
    try {
      var errors = [];
      var warnings = [];

      // Validate required fields
      if (!key || typeof key !== 'string' || key.trim() === '') {
        errors.push('Key is required');
      }

      // Category-specific validation
      switch (category) {
        case 'industry_score':
          // Value1 should be a number (score)
          if (value1 && !this.isValidNumber(value1)) {
            errors.push('Value_1 must be a valid number (industry score)');
          } else if (!value1) {
            errors.push('Value_1 (industry score) is required');
          }

          // Value2 can be comma-separated keywords
          if (value2 && typeof value2 === 'string') {
            // This is valid, no specific validation needed
          }
          break;

        case 'urgency_band':
          // Value1 and Value2 should be numbers (min, max)
          if (!this.isValidNumber(value1)) {
            errors.push('Value_1 (min days) must be a valid number');
          }

          if (!this.isValidNumber(value2)) {
            errors.push('Value_2 (max days) must be a valid number');
          }

          // Value3 can be color
          if (value3 && !this.isValidColor(value3)) {
            warnings.push('Value_3 should be a valid color: ' + value3);
          }
          break;

        case 'workflow_rule':
          // Value1, Value2 should be strings (stage, status)
          if (!value1 || typeof value1 !== 'string' || value1.trim() === '') {
            errors.push('Value_1 (stage) is required');
          }

          if (!value2 || typeof value2 !== 'string' || value2.trim() === '') {
            errors.push('Value_2 (status) is required');
          }

          // Value3 should be number (days)
          if (value3 && !this.isValidNumber(value3)) {
            errors.push('Value_3 (days) must be a valid number');
          }
          break;

        case 'validation_list':
          // Value1 should be comma-separated values
          if (!value1 || typeof value1 !== 'string' || value1.trim() === '') {
            errors.push('Value_1 (comma-separated values) is required');
          }
          break;

        case 'global_const':
          // Value1 can be various types, no strict validation
          break;

        case 'followup_template':
          // Value1 should be template name
          if (!value1 || typeof value1 !== 'string' || value1.trim() === '') {
            errors.push('Value_1 (template name) is required');
          }

          // Value2 should be number (days)
          if (value2 && !this.isValidNumber(value2)) {
            errors.push('Value_2 (days) must be a valid number');
          }
          break;

        default:
          errors.push('Unknown category for field validation: ' + category);
      }

      return {
        errors: errors.length > 0 ? errors : null,
        warnings: warnings.length > 0 ? warnings : null
      };

    } catch (e) {
      return {
        errors: ['Field validation error: ' + e.message],
        warnings: null
      };
    }
  },

  /**
   * Check if value is a valid number
   * @param {any} value - Value to check
   * @return {boolean} True if valid number
   */
  isValidNumber: function(value) {
    if (!value || typeof value !== 'string') return false;

    var trimmed = value.toString().trim();
    if (trimmed === '') return false;

    // Allow negative numbers and decimals
    return !isNaN(trimmed) && isFinite(trimmed);
  },

  /**
   * Check if value is a valid color
   * @param {string} value - Color value
   * @return {boolean} True if valid color
   */
  isValidColor: function(value) {
    if (!value || typeof value !== 'string') return false;

    var trimmed = value.toString().trim().toLowerCase();

    // Simple color validation - check against common color names
    var validColors = [
      'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'black', 'white',
      'gray', 'grey', 'pink', 'brown', 'cyan', 'magenta', 'lime', 'navy'
    ];

    return validColors.includes(trimmed);
  },

  /**
   * Normalize settings data
   * @param {Array} data - Parsed CSV data
   * @return {Array} Normalized data
   */
  normalizeSettingsData: function(data) {
    try {
      // Skip header row
      var headerRow = data[0];
      var dataRows = data.slice(1);

      var normalizedData = [];

      // Get header mapping
      var headerValidation = this.validateHeaders(headerRow);
      if (!headerValidation.success) {
        throw new Error('Cannot normalize data - header validation failed');
      }

      var headerMap = headerValidation.headerMap;

      dataRows.forEach(function(row, rowIndex) {
        try {
          var normalizedRow = new Array(headerRow.length).fill('');

          // Normalize each field
          Object.keys(headerMap).forEach(function(headerKey) {
            var colIndex = headerMap[headerKey];
            var originalValue = row[colIndex] || '';

            var normalizedValue = this.normalizeFieldValue(headerKey, originalValue);
            normalizedRow[colIndex] = normalizedValue;
          }, this);

          normalizedData.push(normalizedRow);

        } catch (e) {
          console.warn('Error normalizing row ' + (rowIndex + 2) + ': ' + e.message);
          // Push original row if normalization fails
          normalizedData.push(row);
        }
      }, this);

      // Add header row back
      normalizedData.unshift(headerRow);

      return normalizedData;

    } catch (e) {
      console.error('Normalization error: ' + e.message);
      return data; // Return original data if normalization fails
    }
  },

  /**
   * Normalize field value based on field type
   * @param {string} fieldName - Field name
   * @param {string} value - Original value
   * @return {string} Normalized value
   */
  normalizeFieldValue: function(fieldName, value) {
    try {
      if (!value || typeof value !== 'string') {
        return '';
      }

      var trimmed = value.trim();

      // Normalize based on field type
      switch (fieldName.toLowerCase()) {
        case 'category':
          // Normalize category to lowercase
          return trimmed.toLowerCase().replace(/[^a-z0-9_]/g, '_');

        case 'key':
          // Preserve original case but trim
          return trimmed;

        case 'value_1':
        case 'value_2':
        case 'value_3':
        case 'value_4':
          // Trim but preserve content
          return trimmed;

        case 'description':
          // Trim and normalize whitespace
          return trimmed.replace(/\s+/g, ' ');

        default:
          return trimmed;
      }

    } catch (e) {
      console.warn('Field normalization error for ' + fieldName + ': ' + e.message);
      return value; // Return original if normalization fails
    }
  },

  /**
   * Import normalized data to settings sheet
   * @param {Array} data - Normalized data to import
   * @return {Object} Import result
   */
  importToSettingsSheet: function(data) {
    try {
      // Check spreadsheet access
      var accessResult = SharedUtils.checkSpreadsheetAccess('importToSettingsSheet');
      if (!accessResult.success) {
        throw new Error(accessResult.error);
      }

      var ss = accessResult.spreadsheet;
      var sheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);

      if (!sheet) {
        throw new Error('Settings sheet not found: ' + CONFIG.SHEETS.SETTINGS);
      }

      // Clear existing data (except headers if they exist)
      var existingData = sheet.getDataRange().getValues();
      var hasExistingHeaders = existingData.length > 0 &&
                              existingData[0].length > 0 &&
                              existingData[0][0].toString().trim() !== '';

      if (hasExistingHeaders) {
        // Clear data rows but keep headers
        var lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
        }
      } else {
        // Clear entire sheet
        sheet.clearContents();
      }

      // Write new data
      if (data.length > 0) {
        sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
      }

      return {
        success: true,
        importedRows: data.length > 0 ? data.length - 1 : 0 // Subtract header row
      };

    } catch (e) {
      return {
        success: false,
        error: e.message,
        details: {
          sheetName: CONFIG.SHEETS.SETTINGS,
          dataRows: data.length
        }
      };
    }
  },

  /**
   * Enhanced version of getSettings that uses validated CSV data
   * @return {Object} Settings object
   */
  getValidatedSettings: function() {
    try {
      // First try to get settings from sheet (existing method)
      var sheetSettings = getSettings();

      // If sheet settings are empty or invalid, try to load from CSV
      if (!sheetSettings || Object.keys(sheetSettings).length === 0) {
        console.log('No settings found in sheet, attempting to load from CSV...');

        // Try to read CSV file and import it
        try {
          var csvFile = this.readSettingsCSVFile();
          if (csvFile.success && csvFile.csvText) {
            var importResult = this.importAndValidateSettingsCSV(csvFile.csvText);
            if (importResult.success) {
              console.log('Successfully imported settings from CSV');
              // Recursively call to get the now-imported settings
              return this.getValidatedSettings();
            } else {
              console.error('Failed to import CSV settings: ' + importResult.error);
            }
          }
        } catch (csvError) {
          console.error('Error reading CSV file: ' + csvError.message);
        }
      }

      return sheetSettings;

    } catch (e) {
      console.error('Error getting validated settings: ' + e.message);
      return {
        industryScores: {},
        urgencyBands: [],
        workflowRules: {},
        validationLists: {},
        globalConstants: {},
        followupTemplates: {}
      };
    }
  },

  /**
   * Read settings CSV file from script files
   * @return {Object} File read result
   */
  readSettingsCSVFile: function() {
    try {
      // This would need to be implemented based on your file storage method
      // For now, return a placeholder

      return {
        success: false,
        error: 'CSV file reading not implemented - use importAndValidateSettingsCSV with file content'
      };

    } catch (e) {
      return {
        success: false,
        error: e.message
      };
    }
  }
};

// Export main function for global access
function importAndValidateSettingsCSV(csvText) {
  return SettingsValidation.importAndValidateSettingsCSV(csvText);
}
