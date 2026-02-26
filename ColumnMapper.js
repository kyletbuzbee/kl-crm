/**
 * Column Mapper Service
 * Provides consistent column mapping across the entire application
 * Prevents mapping inconsistencies between Safe-Fetch and manual operations
 */

var ColumnMapper = {
  cache: {},
  lastUpdated: null,
  TTL: 10 * 60 * 1000, // 10 minutes cache TTL

  /**
   * Get column index for a specific column name in a sheet
   * @param {string} sheetName - Name of the sheet
   * @param {string} columnName - Name of the column to find
   * @returns {number|null} Column index (0-based) or null if not found
   */
  getColumnIndex: function(sheetName, columnName) {
    var cacheKey = sheetName + '_' + columnName;
    var now = new Date().getTime();
    
    // Check cache first
    if (this.cache[cacheKey] && this.lastUpdated && (now - this.lastUpdated) < this.TTL) {
      return this.cache[cacheKey];
    }

    // Fetch from sheet
    try {
      var accessResult = SharedUtils.checkSpreadsheetAccess('ColumnMapper.getColumnIndex');
      if (!accessResult.success) {
        console.error('Failed to access spreadsheet for column mapping:', accessResult.error);
        return null;
      }

      var ss = accessResult.spreadsheet;
      var sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        console.error('Sheet not found: ' + sheetName);
        return null;
      }

      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var normalizedColumnName = SharedUtils.normalizeHeader(columnName);
      
      for (var i = 0; i < headers.length; i++) {
        if (SharedUtils.normalizeHeader(headers[i]) === normalizedColumnName) {
          // Cache the result
          this.cache[cacheKey] = i;
          this.lastUpdated = now;
          return i;
        }
      }

      console.warn('Column not found: ' + columnName + ' in sheet: ' + sheetName);
      return null;
    } catch (e) {
      console.error('Error getting column index:', e.message);
      return null;
    }
  },

  /**
   * Get all column indices for a sheet
   * @param {string} sheetName - Name of the sheet
   * @returns {Object} Map of normalized column names to indices
   */
  getColumnMap: function(sheetName) {
    var cacheKey = sheetName + '_map';
    var now = new Date().getTime();
    
    // Check cache first
    if (this.cache[cacheKey] && this.lastUpdated && (now - this.lastUpdated) < this.TTL) {
      return this.cache[cacheKey];
    }

    // Fetch from sheet
    try {
      var accessResult = SharedUtils.checkSpreadsheetAccess('ColumnMapper.getColumnMap');
      if (!accessResult.success) {
        console.error('Failed to access spreadsheet for column mapping:', accessResult.error);
        return {};
      }

      var ss = accessResult.spreadsheet;
      var sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        console.error('Sheet not found: ' + sheetName);
        return {};
      }

      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var headerMap = {};
      
      headers.forEach(function(header, index) {
        if (header) {
          headerMap[SharedUtils.normalizeHeader(header)] = index;
        }
      });

      // Cache the result
      this.cache[cacheKey] = headerMap;
      this.lastUpdated = now;
      return headerMap;
    } catch (e) {
      console.error('Error getting column map:', e.message);
      return {};
    }
  },

  /**
   * Clear the column mapper cache
   */
  clearCache: function() {
    this.cache = {};
    this.lastUpdated = null;
  },

  /**
   * Invalidate cache (force refresh on next access)
   */
  invalidateCache: function() {
    this.lastUpdated = 0;
  }
};
