/**
 * Data Helpers - The Safe-Fetch Engine
 * Handles reading/writing data with dynamic column mapping.
 * 
 * INTEGRATION: ErrorBoundary and LoggerInjector
 * - All data access functions wrapped with ErrorBoundary.wrap
 * - All functions instrumented with LoggerInjector.inject
 */

// ============================================================================
// INFRASTRUCTURE COMPONENT INTEGRATION
// ============================================================================

/**
 * Safe access to ErrorBoundary component with fallback
 */
function getErrorBoundary() {
  try {
    return typeof ErrorBoundary !== 'undefined' ? ErrorBoundary : null;
  } catch (e) {
    return null;
  }
}

/**
 * Safe access to LoggerInjector component with fallback
 */
function getLoggerInjector() {
  try {
    return typeof LoggerInjector !== 'undefined' ? LoggerInjector : null;
  } catch (e) {
    return null;
  }
}

/**
 * Wrap a function with ErrorBoundary if available, otherwise return original
 */
function wrapWithErrorBoundary(fn, functionName) {
  const errorBoundary = getErrorBoundary();
  if (errorBoundary && errorBoundary.wrap) {
    return errorBoundary.wrap(fn, {
      functionName: functionName,
      component: 'DataHelpers',
      retryCount: 3
    });
  }
  return fn;
}

/**
 * Inject logging into a function if LoggerInjector available
 */
function injectLogging(fn, functionName, options) {
  const loggerInjector = getLoggerInjector();
  if (loggerInjector && loggerInjector.inject) {
    return loggerInjector.inject(fn, {
      name: functionName,
      component: 'DataHelpers',
      logParams: options && options.logParams !== false,
      logExecutionTime: options && options.logExecutionTime !== false,
      logResult: options && options.logResult !== false
    });
  }
  return fn;
}

/**
 * Combined wrapper for ErrorBoundary + LoggerInjector
 */
function wrapDataFunction(fn, functionName, options) {
  options = options || {};
  let wrapped = fn;
  // Apply logging first, then error handling (innermost to outermost)
  wrapped = injectLogging(wrapped, functionName, options);
  wrapped = wrapWithErrorBoundary(wrapped, functionName);
  return wrapped;
}

// ============================================================================
// DEPRECATED: Legacy getSafeSheetData function moved to SharedUtils
// ============================================================================

/**
 * DEPRECATED: This function has been removed to eliminate ambiguity with SharedUtils.getSafeSheetData.
 * All callers should now use SharedUtils.getSafeSheetData directly.
 *
 * The SharedUtils version provides better error handling and is more widely used throughout the codebase.
 * This DataHelpers version was stricter but created naming conflicts.
 */

/**
 * Writes data back to a specific cell based on ID match or Row Index.
 * Enhanced with comprehensive error handling and LoggerInjector instrumentation.
 * @param {string} sheetName
 * @param {number} rowIndex - 1-based row index.
 * @param {string} columnName - Header name to write to.
 * @param {any} value
 * @return {Object} Result object with success status and error details
 */
function updateCellSafe(sheetName, rowIndex, columnName, value) {
  // Standard null check pattern
  var accessResult = SharedUtils.checkSpreadsheetAccess('updateCellSafe');
  if (!accessResult.success) {
    return { success: false, error: accessResult.error };
  }

  var ss = accessResult.spreadsheet;

  try {
    
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      var errorMsg = 'Sheet not found: ' + sheetName;
      console.error(errorMsg);
      
      // Log available sheets for debugging
      try {
        var allSheets = ss.getSheets();
        var sheetNames = allSheets.map(function(s) { return s.getName(); });
        console.warn('Available sheets: ' + sheetNames.join(', '));
      } catch (e) {
        console.warn('Could not list available sheets: ' + e.message);
      }
      
      return { success: false, error: errorMsg };
    }
    
    // Validate row index
    if (rowIndex < 1 || !Number.isInteger(rowIndex)) {
      var errorMsg = 'Invalid row index: ' + rowIndex + ' (must be positive integer)';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    // Validate column name
    if (!columnName || typeof columnName !== 'string') {
      var errorMsg = 'Invalid column name: ' + columnName;
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colIndex = -1;
    
    // Enhanced string normalization with fallback
    var normTarget = SharedUtils.normalizeHeader(columnName);
    var fallbackTarget = columnName.toLowerCase().trim();

    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      var normHeader = SharedUtils.normalizeHeader(header);
      var fallbackHeader = String(header).toLowerCase().trim();
      
      // Try exact normalized match first
      if (normHeader === normTarget) {
        colIndex = i + 1; // 1-based
        break;
      }
      // Try fallback normalization if exact match fails
      else if (fallbackHeader === fallbackTarget) {
        colIndex = i + 1; // 1-based
        console.warn('Using fallback normalization for column: ' + columnName + ' -> ' + header);
        break;
      }
    }
    
    if (colIndex === -1) {
      var errorMsg = 'Column not found for update: ' + columnName + '. Available columns: ' + headers.join(', ');
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    // Validate that the row exists
    var lastRow = sheet.getLastRow();
    if (rowIndex > lastRow) {
      var errorMsg = 'Row index ' + rowIndex + ' exceeds sheet data range (last row: ' + lastRow + ')';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    // Perform the update with error handling
    try {
      sheet.getRange(rowIndex, colIndex).setValue(value);
      console.log('Successfully updated cell at row ' + rowIndex + ', column ' + colIndex + ' (' + columnName + ') with value: ' + value);
      return { success: true, message: 'Cell updated successfully' };
    } catch (e) {
      var errorMsg = 'Failed to update cell at row ' + rowIndex + ', column ' + colIndex + ': ' + e.message;
      console.error(errorMsg);
      console.error('Stack trace:', e.stack);
      return { success: false, error: errorMsg };
    }
    
  } catch (e) {
    var errorMsg = 'Unexpected error in updateCellSafe: ' + e.message;
    console.error(errorMsg);
    console.error('Stack trace:', e.stack);
    
    // Log to system log if available
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      if (ss) {
        var opsLogSheet = ss.getSheetByName(CONFIG.SHEET_SYSTEM_LOG || 'System_OpsLog');
        if (opsLogSheet) {
          opsLogSheet.appendRow([
            new Date(),
            'updateCellSafe',
            'ERROR',
            errorMsg,
            e.stack
          ]);
        }
      }
    } catch (logError) {
      console.warn('Could not log error to system log:', logError.message);
    }
    
    return { success: false, error: errorMsg };
  }
}

/**
 * Prepends a new row object to the top of the sheet (below header row).
 * Enhanced with comprehensive error handling and logging.
 * Maps object keys to columns dynamically.
 * @param {string} sheetName - Name of the sheet to prepend to
 * @param {Object} rowObj - Object containing the row data
 * @return {Object} Result object with success status and error details
 */
function prependRowSafe(sheetName, rowObj) {
  // Standard null check pattern
  var accessResult = SharedUtils.checkSpreadsheetAccess('prependRowSafe');
  if (!accessResult.success) {
    return { success: false, error: accessResult.error };
  }

  var ss = accessResult.spreadsheet;

  try {
    
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      var errorMsg = 'Sheet not found: ' + sheetName;
      console.error(errorMsg);
      
      // Log available sheets for debugging
      try {
        var allSheets = ss.getSheets();
        var sheetNames = allSheets.map(function(s) { return s.getName(); });
        console.warn('Available sheets: ' + sheetNames.join(', '));
      } catch (e) {
        console.warn('Could not list available sheets: ' + e.message);
      }
      
      return { success: false, error: errorMsg };
    }
    
    // Validate rowObj
    if (!rowObj || typeof rowObj !== 'object') {
      var errorMsg = 'Invalid row object: must be an object';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    // Acquire lock to prevent race conditions during prepend
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) { // Wait up to 10 seconds
      var errorMsg = 'Could not acquire lock for prependRowSafe';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var rowArray = [];

      // Map object keys to columns with enhanced error handling
      for (var i = 0; i < headers.length; i++) {
        var header = headers[i];
        var key = SharedUtils.normalizeHeader(header);
        var fallbackKey = String(header).toLowerCase().trim();
        var cellValue = '';
        
        try {
          // Try exact normalized match first
          if (rowObj.hasOwnProperty(key)) {
            cellValue = rowObj[key];
          }
          // Try fallback normalization if exact match fails
          else if (rowObj.hasOwnProperty(fallbackKey)) {
            cellValue = rowObj[fallbackKey];
            console.warn('Using fallback normalization for header: ' + header);
          }
          // Check for any case-insensitive match
          else {
            var found = false;
            for (var objKey in rowObj) {
              if (SharedUtils.normalizeHeader(objKey) === key) {
                cellValue = rowObj[objKey];
                found = true;
                break;
              }
            }
            if (!found) {
              cellValue = '';
            }
          }
          
          rowArray.push(cellValue);
          
        } catch (e) {
          console.warn('Error processing header "' + header + '": ' + e.message);
          rowArray.push('');
        }
      }

      // Perform the prepend with error handling
      try {
        var lastRow = sheet.getLastRow();
        var lastCol = sheet.getLastColumn();
        
        // If sheet only has header row (row 1) or is empty, append the row
        // Otherwise, insert at row 2 (right below header)
        if (lastRow <= 1) {
          // Sheet only has header or is empty - append the row
          sheet.appendRow(rowArray);
          console.log('Successfully appended row to sheet "' + sheetName + '" (sheet was empty or had only header)');
        } else {
          // Sheet has data - insert at row 2 (top of data)
          sheet.insertRowBefore(2);
          var range = sheet.getRange(2, 1, 1, rowArray.length);
          range.setValues([rowArray]);
          console.log('Successfully prepended row to sheet "' + sheetName + '" with ' + rowArray.length + ' columns');
        }
        return { success: true, message: 'Row prepended successfully', columns: rowArray.length };
      } catch (e) {
        var errorMsg = 'Failed to prepend row to sheet "' + sheetName + '": ' + e.message;
        console.error(errorMsg);
        console.error('Stack trace:', e.stack);
        return { success: false, error: errorMsg };
      }
    } finally {
      // Always release the lock
      lock.releaseLock();
    }
    
  } catch (e) {
    var errorMsg = 'Unexpected error in prependRowSafe: ' + e.message;
    console.error(errorMsg);
    console.error('Stack trace:', e.stack);
    
    // Log to system log if available
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      if (ss) {
        var opsLogSheet = ss.getSheetByName(CONFIG.SHEET_SYSTEM_LOG || 'System_OpsLog');
        if (opsLogSheet) {
          opsLogSheet.appendRow([
            new Date(),
            'prependRowSafe',
            'ERROR',
            errorMsg,
            e.stack
          ]);
        }
      }
    } catch (logError) {
      console.warn('Could not log error to system log:', logError.message);
    }
    
    return { success: false, error: errorMsg };
  }
}

/**
 * Appends a new row object to the sheet.
 * Enhanced with comprehensive error handling and logging.
 * Maps object keys to columns dynamically.
 * @param {string} sheetName - Name of the sheet to append to
 * @param {Object} rowObj - Object containing the row data
 * @return {Object} Result object with success status and error details
 */
function appendRowSafe(sheetName, rowObj) {
  // Standard null check pattern
  var accessResult = SharedUtils.checkSpreadsheetAccess('appendRowSafe');
  if (!accessResult.success) {
    return { success: false, error: accessResult.error };
  }

  var ss = accessResult.spreadsheet;

  try {
    
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      var errorMsg = 'Sheet not found: ' + sheetName;
      console.error(errorMsg);
      
      // Log available sheets for debugging
      try {
        var allSheets = ss.getSheets();
        var sheetNames = allSheets.map(function(s) { return s.getName(); });
        console.warn('Available sheets: ' + sheetNames.join(', '));
      } catch (e) {
        console.warn('Could not list available sheets: ' + e.message);
      }
      
      return { success: false, error: errorMsg };
    }
    
    // Validate rowObj
    if (!rowObj || typeof rowObj !== 'object') {
      var errorMsg = 'Invalid row object: must be an object';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    // Acquire lock to prevent race conditions during append
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) { // Wait up to 10 seconds
      var errorMsg = 'Could not acquire lock for appendRowSafe';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var rowArray = [];

      // Map object keys to columns with enhanced error handling
      for (var i = 0; i < headers.length; i++) {
        var header = headers[i];
        var key = SharedUtils.normalizeHeader(header);
        var fallbackKey = String(header).toLowerCase().trim();
        var cellValue = '';
        
        try {
          // Try exact normalized match first
          if (rowObj.hasOwnProperty(key)) {
            cellValue = rowObj[key];
          }
          // Try fallback normalization if exact match fails
          else if (rowObj.hasOwnProperty(fallbackKey)) {
            cellValue = rowObj[fallbackKey];
            console.warn('Using fallback normalization for header: ' + header);
          }
          // Check for any case-insensitive match
          else {
            var found = false;
            for (var objKey in rowObj) {
              if (SharedUtils.normalizeHeader(objKey) === key) {
                cellValue = rowObj[objKey];
                found = true;
                break;
              }
            }
            if (!found) {
              cellValue = '';
            }
          }
          
          rowArray.push(cellValue);
          
        } catch (e) {
          console.warn('Error processing header "' + header + '": ' + e.message);
          rowArray.push('');
        }
      }

      // Perform the append with error handling
      try {
        sheet.appendRow(rowArray);
        console.log('Successfully appended row to sheet "' + sheetName + '" with ' + rowArray.length + ' columns');
        return { success: true, message: 'Row appended successfully', columns: rowArray.length };
      } catch (e) {
        var errorMsg = 'Failed to append row to sheet "' + sheetName + '": ' + e.message;
        console.error(errorMsg);
        console.error('Stack trace:', e.stack);
        return { success: false, error: errorMsg };
      }
    } finally {
      // Always release the lock
      lock.releaseLock();
    }
    
  } catch (e) {
    var errorMsg = 'Unexpected error in appendRowSafe: ' + e.message;
    console.error(errorMsg);
    console.error('Stack trace:', e.stack);
    
    // Log to system log if available
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      if (ss) {
        var opsLogSheet = ss.getSheetByName(CONFIG.SHEET_SYSTEM_LOG || 'System_OpsLog');
        if (opsLogSheet) {
          opsLogSheet.appendRow([
            new Date(),
            'appendRowSafe',
            'ERROR',
            errorMsg,
            e.stack
          ]);
        }
      }
    } catch (logError) {
      console.warn('Could not log error to system log:', logError.message);
    }
    
    return { success: false, error: errorMsg };
  }
}

/**
 * Gets the column index for a given column name in a sheet.
 * Returns the 1-based column index.
 * @param {string} sheetName - Name of the sheet
 * @param {string} columnName - Name of the column to find
 * @return {number} 1-based column index, or -1 if not found
 */
function getColumnIndex(sheetName, columnName) {
  // Standard null check pattern
  var accessResult = SharedUtils.checkSpreadsheetAccess('getColumnIndex');
  if (!accessResult.success) {
    console.error('Spreadsheet access error in getColumnIndex:', accessResult.error);
    return -1;
  }

  var ss = accessResult.spreadsheet;

  try {
    
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      console.error('Sheet not found: ' + sheetName);
      
      // Log available sheets for debugging
      try {
        var allSheets = ss.getSheets();
        var sheetNames = allSheets.map(function(s) { return s.getName(); });
        console.warn('Available sheets: ' + sheetNames.join(', '));
      } catch (e) {
        console.warn('Could not list available sheets: ' + e.message);
      }
      
      return -1;
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var normTarget = SharedUtils.normalizeHeader(columnName);
    var fallbackTarget = columnName.toLowerCase().trim();

    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      var normHeader = SharedUtils.normalizeHeader(header);
      var fallbackHeader = String(header).toLowerCase().trim();
      
      // Try exact normalized match first
      if (normHeader === normTarget) {
        return i + 1; // 1-based index
      }
      // Try fallback normalization if exact match fails
      else if (fallbackHeader === fallbackTarget) {
        console.warn('Using fallback normalization for getColumnIndex: ' + columnName + ' -> ' + header);
        return i + 1; // 1-based index
      }
    }

    console.error('Column not found: ' + columnName + ' in sheet: ' + sheetName + '. Available columns: ' + headers.join(', '));
    return -1;
  } catch (e) {
    console.error('Unexpected error in getColumnIndex: ' + e.message);
    return -1;
  }
}

/**
 * Gets a sheet safely with robust error handling, fallback mechanisms, and permission checks.
 * @param {string} sheetName - Name of the sheet to retrieve
 * @param {Object} options - Configuration options
 * @param {boolean} options.throwError - Whether to throw an error instead of returning null (default: false)
 * @param {Array<string>} options.fallbackSheets - Array of fallback sheet names to try if primary sheet not found
 * @param {boolean} options.checkPermissions - Whether to check if user has edit permissions (default: true)
 * @return {Sheet|null|Object} The sheet object, null if not found (when throwError=false), or error object
 * @throws {Error} If throwError=true and sheet cannot be accessed
 */
function getSheetSafe(sheetName, options) {
  options = options || {};
  var throwError = options.throwError || false;
  var fallbackSheets = options.fallbackSheets || [];
  var checkPermissions = options.checkPermissions !== false; // Default to true

  // Standard null check pattern
  var accessResult = SharedUtils.checkSpreadsheetAccess('getSheetSafe');
  if (!accessResult.success) {
    if (throwError) {
      throw new Error(accessResult.error);
    }
    return null;
  }

  var ss = accessResult.spreadsheet;

  try {
    
    // Try to get the primary sheet
    var sheet = ss.getSheetByName(sheetName);
    
    // If primary sheet not found, try fallback sheets
    if (!sheet && fallbackSheets.length > 0) {
      console.warn('Primary sheet "' + sheetName + '" not found, trying fallbacks...');
      for (var i = 0; i < fallbackSheets.length; i++) {
        var fallbackSheet = ss.getSheetByName(fallbackSheets[i]);
        if (fallbackSheet) {
          console.log('Using fallback sheet: ' + fallbackSheets[i]);
          sheet = fallbackSheet;
          break;
        }
      }
    }
    
    // If still no sheet found, handle the error
    if (!sheet) {
      var errorMsg = 'Sheet not found: ' + sheetName + (fallbackSheets.length > 0 ? ' (fallbacks: ' + fallbackSheets.join(', ') + ')' : '');
      console.error(errorMsg);
      
      // Log available sheets for debugging
      try {
        var allSheets = ss.getSheets();
        var sheetNames = allSheets.map(function(s) { return s.getName(); });
        console.warn('Available sheets: ' + sheetNames.join(', '));
      } catch (e) {
        console.warn('Could not list available sheets: ' + e.message);
      }
      
      if (throwError) {
        throw new Error(errorMsg);
      }
      return null;
    }
    
    // Check permissions if requested
    if (checkPermissions) {
      try {
        var permissions = ss.getPermissions();
        var user = Session.getActiveUser();
        var hasEditPermission = permissions === 'OWNER' || permissions === 'EDIT';
        
        if (!hasEditPermission) {
          var errorMsg = 'Insufficient permissions for sheet "' + sheetName + '": user ' + user.getEmail() + ' has ' + permissions + ' access';
          console.error(errorMsg);
          if (throwError) throw new Error(errorMsg);
          return null;
        }
      } catch (e) {
        console.warn('Could not check permissions for sheet "' + sheetName + '": ' + e.message);
        // Don't fail on permission check errors, just log and continue
      }
    }
    
    // Additional validation: check if sheet is protected or has issues
    try {
      var sheetId = sheet.getSheetId();
      var sheetName = sheet.getName();
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      
      console.log('Successfully accessed sheet: ' + sheetName + ' (ID: ' + sheetId + ', Last Row: ' + lastRow + ', Last Col: ' + lastCol + ')');
    } catch (e) {
      var errorMsg = 'Sheet "' + sheetName + '" appears to be corrupted or inaccessible: ' + e.message;
      console.error(errorMsg);
      if (throwError) throw new Error(errorMsg);
      return null;
    }
    
    return sheet;
    
  } catch (e) {
    var errorMsg = 'Unexpected error in getSheetSafe for sheet "' + sheetName + '": ' + e.message;
    console.error(errorMsg);
    console.error('Stack trace:', e.stack);
    
    if (throwError) {
      throw new Error(errorMsg);
    }
    return null;
  }
}

// ============================================================================
// WRAPPED VERSIONS FOR INFRASTRUCTURE INTEGRATION
// ============================================================================

/**
 * Wrapped version of updateCellSafe with ErrorBoundary + LoggerInjector
 * @param {string} sheetName
 * @param {number} rowIndex
 * @param {string} columnName
 * @param {any} value
 * @return {Object} Result object with success status and error details
 */
function updateCellSafeWithLogging(sheetName, rowIndex, columnName, value) {
  return wrapDataFunction(function(sn, ri, cn, val) {
    return updateCellSafe(sn, ri, cn, val);
  }, 'updateCellSafe')(sheetName, rowIndex, columnName, value);
}

/**
 * Wrapped version of prependRowSafe with ErrorBoundary + LoggerInjector
 * @param {string} sheetName
 * @param {Object} rowObj
 * @return {Object} Result object with success status and error details
 */
function prependRowSafeWithLogging(sheetName, rowObj) {
  return wrapDataFunction(function(sn, ro) {
    return prependRowSafe(sn, ro);
  }, 'prependRowSafe')(sheetName, rowObj);
}

/**
 * Wrapped version of appendRowSafe with ErrorBoundary + LoggerInjector
 * @param {string} sheetName
 * @param {Object} rowObj
 * @return {Object} Result object with success status and error details
 */
function appendRowSafeWithLogging(sheetName, rowObj) {
  return wrapDataFunction(function(sn, ro) {
    return appendRowSafe(sn, ro);
  }, 'appendRowSafe')(sheetName, rowObj);
}

/**
 * Wrapped version of getColumnIndex with ErrorBoundary + LoggerInjector
 * @param {string} sheetName
 * @param {string} columnName
 * @return {number} 1-based column index, or -1 if not found
 */
function getColumnIndexWithLogging(sheetName, columnName) {
  return wrapDataFunction(function(sn, cn) {
    return getColumnIndex(sn, cn);
  }, 'getColumnIndex')(sheetName, columnName);
}

/**
 * Wrapped version of getSheetSafe with ErrorBoundary + LoggerInjector
 * @param {string} sheetName
 * @param {Object} options
 * @return {Sheet|null}
 */
function getSheetSafeWithLogging(sheetName, options) {
  return wrapDataFunction(function(sn, opt) {
    return getSheetSafe(sn, opt);
  }, 'getSheetSafe')(sheetName, options);
}

/**
 * Batch prepend rows with ErrorBoundary + LoggerInjector support
 * @param {string} sheetName
 * @param {Array} rowObjects
 * @return {Object} Result object with success status and error details
 */
function prependRowsBatch(sheetName, rowObjects) {
  var fn = function(sn, rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: 'rowObjects must be a non-empty array' };
    }
    
    var accessResult = SharedUtils.checkSpreadsheetAccess('prependRowsBatch');
    if (!accessResult.success) {
      return { success: false, error: accessResult.error };
    }
    var ss = accessResult.spreadsheet;
    var sheet = ss.getSheetByName(sn);
    if (!sheet) {
        return { success: false, error: 'Sheet not found: ' + sn };
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var rowsToPrepend = [];

    for (var i = 0; i < rows.length; i++) {
        var rowObj = rows[i];
        var rowArray = [];
        for (var j = 0; j < headers.length; j++) {
            var header = headers[j];
            var key = SharedUtils.normalizeHeader(header);
            var fallbackKey = String(header).toLowerCase().trim();
            var cellValue = '';

            if (rowObj.hasOwnProperty(key)) {
                cellValue = rowObj[key];
            } else if (rowObj.hasOwnProperty(fallbackKey)) {
                cellValue = rowObj[fallbackKey];
            } else {
                var found = false;
                for (var objKey in rowObj) {
                    if (SharedUtils.normalizeHeader(objKey) === key) {
                        cellValue = rowObj[objKey];
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    cellValue = '';
                }
            }
            rowArray.push(cellValue);
        }
        rowsToPrepend.push(rowArray);
    }

    if (rowsToPrepend.length > 0) {
        sheet.insertRowsBefore(2, rowsToPrepend.length);
        sheet.getRange(2, 1, rowsToPrepend.length, headers.length).setValues(rowsToPrepend);
    }
    
    return {
      success: true,
      total: rows.length,
      successful: rows.length,
      failed: 0,
      results: []
    };
  };
  
  return wrapDataFunction(fn, 'prependRowsBatch')(sheetName, rowObjects);
}

/**
 * Batch append rows with ErrorBoundary + LoggerInjector support
 * @param {string} sheetName
 * @param {Array} rowObjects
 * @return {Object} Result object with success status and error details
 */
function appendRowsBatch(sheetName, rowObjects) {
  var fn = function(sn, rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: 'rowObjects must be a non-empty array' };
    }
    
    var accessResult = SharedUtils.checkSpreadsheetAccess('appendRowsBatch');
    if (!accessResult.success) {
      return { success: false, error: accessResult.error };
    }
    var ss = accessResult.spreadsheet;
    var sheet = ss.getSheetByName(sn);
    if (!sheet) {
        return { success: false, error: 'Sheet not found: ' + sn };
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var rowsToAppend = [];

    for (var i = 0; i < rows.length; i++) {
        var rowObj = rows[i];
        var rowArray = [];
        for (var j = 0; j < headers.length; j++) {
            var header = headers[j];
            var key = SharedUtils.normalizeHeader(header);
            var fallbackKey = String(header).toLowerCase().trim();
            var cellValue = '';

            if (rowObj.hasOwnProperty(key)) {
                cellValue = rowObj[key];
            } else if (rowObj.hasOwnProperty(fallbackKey)) {
                cellValue = rowObj[fallbackKey];
            } else {
                var found = false;
                for (var objKey in rowObj) {
                    if (SharedUtils.normalizeHeader(objKey) === key) {
                        cellValue = rowObj[objKey];
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    cellValue = '';
                }
            }
            rowArray.push(cellValue);
        }
        rowsToAppend.push(rowArray);
    }

    if (rowsToAppend.length > 0) {
        var lastRow = sheet.getLastRow();
        sheet.getRange(lastRow + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
    }
    
    return {
      success: true,
      total: rows.length,
      successful: rows.length,
      failed: 0,
      results: []
    };
  };
  
  return wrapDataFunction(fn, 'appendRowsBatch')(sheetName, rowObjects);
}
