/**
 * Performance and Timeout Prevention Utilities
 * Strategies to prevent Google Apps Script timeout errors and improve reliability
 */

// Create PerformanceUtils namespace object
var PerformanceUtils = {
  executeWithTimeoutProtection: executeWithTimeoutProtection,
  executeWithRetries: executeWithRetries,
  checkExecutionTime: checkExecutionTime,
  processInBatches: processInBatches,
  getSafeSheetDataOptimized: getSafeSheetDataOptimized,
  getCacheStats: getCacheStats,
  clearAllCache: clearAllCache,
  handleErrorWithContext: handleErrorWithContext,
  formatErrorEmail: formatErrorEmail,
  validateParameters: validateParameters,
  executeWithSheetLock: executeWithSheetLock,
  optimizeMemory: optimizeMemory
};

// ========================================
// TIMEOUT PREVENTION STRATEGIES
// ========================================

/**
 * Wraps a function call with timeout protection and automatic retry logic
 * @param {Function} fn - The function to execute
 * @param {Array} args - Arguments to pass to the function
 * @param {Object} options - Configuration options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 2)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 * @param {number} options.timeoutThreshold - Time threshold in ms before warning (default: 40000)
 * @param {string} options.functionName - Name for logging purposes
 * @return {*} The function result or error object
 */
function executeWithTimeoutProtection(fn, args, options) {
  options = options || {};
  var maxRetries = options.maxRetries || 2;
  var retryDelay = options.retryDelay || 1000;
  var timeoutThreshold = options.timeoutThreshold || 40000;
  var functionName = options.functionName || 'unnamed function';
  var startTime = new Date().getTime();

  // Check if we're approaching timeout limits
  checkExecutionTime(startTime, functionName);

  try {
    // Execute the function with retry logic
    return executeWithRetries(fn, args, maxRetries, retryDelay, functionName);
  } catch (e) {
    console.error('Function failed after retries: ' + functionName + ' - ' + e.message);
    return { success: false, error: 'Operation failed: ' + e.message };
  }
}

/**
 * Executes a function with automatic retry logic
 */
function executeWithRetries(fn, args, maxRetries, retryDelay, functionName) {
  var lastError;
  var attempt = 0;

  while (attempt <= maxRetries) {
    try {
      attempt++;
      var result = fn.apply(null, args);

      // If result has success: false, treat as failure for retry purposes
      if (result && typeof result === 'object' && result.success === false) {
        throw new Error(result.error || 'Operation returned failure');
      }

      return result;
    } catch (e) {
      lastError = e;
      console.warn('Attempt ' + attempt + ' failed for ' + functionName + ': ' + e.message);

      // Don't retry on the last attempt
      if (attempt > maxRetries) {
        break;
      }

      // Exponential backoff for retries
      var delay = retryDelay * Math.pow(2, attempt - 1);
      console.log('Retrying in ' + delay + 'ms...');

      // Use Utilities.sleep for short delays, or SpreadsheetApp.flush for longer ones
      if (delay <= 5000) {
        Utilities.sleep(delay);
      } else {
        SpreadsheetApp.flush(); // Force pending changes to complete
        Utilities.sleep(Math.min(delay, 10000)); // Max 10s sleep
      }
    }
  }

  throw lastError;
}

/**
 * Checks if execution is approaching timeout limits
 */
function checkExecutionTime(startTime, functionName) {
  var currentTime = new Date().getTime();
  var elapsed = currentTime - startTime;

  // Google Apps Script has a 6-minute timeout for most operations
  var timeoutLimit = 6 * 60 * 1000; // 6 minutes in ms
  var warningThreshold = timeoutLimit * 0.7; // Warn at 70% of limit

  if (elapsed > warningThreshold) {
    console.warn('âš ï¸ TIMEOUT WARNING: ' + functionName + ' has been running for ' +
                (elapsed/1000).toFixed(1) + ' seconds. Approaching 6-minute limit.');
  }
}

// ========================================
// BATCH PROCESSING FOR LARGE DATASETS
// ========================================

/**
 * Processes data in batches to prevent timeout and memory issues
 * @param {Array} data - Array of items to process
 * @param {Function} processFn - Function to process each item
 * @param {Object} options - Batch processing options
 * @param {number} options.batchSize - Number of items per batch (default: 50)
 * @param {number} options.batchDelay - Delay between batches in ms (default: 500)
 * @param {boolean} options.continueOnError - Continue processing if an item fails (default: true)
 * @return {Object} Processing results with success/failure counts
 */
function processInBatches(data, processFn, options) {
  options = options || {};
  var batchSize = options.batchSize || 50;
  var batchDelay = options.batchDelay || 500;
  var continueOnError = options.continueOnError || true;

  if (!data || !Array.isArray(data)) {
    console.warn('processInBatches: Invalid data array provided');
    return { success: false, error: 'Invalid data array' };
  }

  if (typeof processFn !== 'function') {
    console.warn('processInBatches: processFn must be a function');
    return { success: false, error: 'Invalid process function' };
  }

  var results = {
    total: data.length,
    processed: 0,
    successes: 0,
    failures: 0,
    errors: [],
    startTime: new Date().getTime()
  };

  console.log('Starting batch processing of ' + data.length + ' items...');

  try {
    // Process data in batches
    for (var i = 0; i < data.length; i += batchSize) {
      var batch = data.slice(i, i + batchSize);
      var batchResults = processBatch(batch, processFn, continueOnError);

      results.processed += batchResults.processed;
      results.successes += batchResults.successes;
      results.failures += batchResults.failures;
      results.errors = results.errors.concat(batchResults.errors);

      // Check for timeout warnings
      checkExecutionTime(results.startTime, 'batchProcessing');

      // Delay between batches to prevent throttling
      if (i + batchSize < data.length && batchDelay > 0) {
        console.log('Completed batch ' + (i + batchSize) + '/' + data.length +
                   '. Waiting ' + batchDelay + 'ms before next batch...');
        Utilities.sleep(batchDelay);
      }
    }

    var duration = (new Date().getTime() - results.startTime) / 1000;
    console.log('Batch processing completed in ' + duration.toFixed(1) +
                ' seconds. Success: ' + results.successes + '/' + results.total);

    return {
      success: true,
      data: results
    };

  } catch (e) {
    console.error('Batch processing failed: ' + e.message);
    return {
      success: false,
      error: 'Batch processing failed: ' + e.message,
      partialResults: results
    };
  }
}

/**
 * Processes a single batch of items
 */
function processBatch(batch, processFn, continueOnError) {
  var batchResults = {
    processed: 0,
    successes: 0,
    failures: 0,
    errors: []
  };

  for (var j = 0; j < batch.length; j++) {
    try {
      var item = batch[j];
      var result = processFn(item);

      // Check if the result indicates failure
      if (result && typeof result === 'object' && result.success === false) {
        throw new Error(result.error || 'Processing returned failure');
      }

      batchResults.processed++;
      batchResults.successes++;

    } catch (e) {
      batchResults.processed++;
      batchResults.failures++;
      batchResults.errors.push({
        item: batch[j],
        error: e.message,
        stack: e.stack
      });

      console.error('Failed to process item ' + j + ' in batch: ' + e.message);

      if (!continueOnError) {
        throw e; // Re-throw to stop batch processing
      }
    }
  }

  return batchResults;
}

// ========================================
// PERSISTENT CACHING WITH CACHE SERVICE
// ========================================

/**
 * Enhanced caching system using Google Apps Script CacheService for persistence
 * Provides both in-memory and persistent caching with automatic fallback
 */
var CacheManager = (function() {
  var _memoryCache = {};
  var _cacheService = null;
  var _initialized = false;

  function init() {
    if (!_initialized) {
      try {
        _cacheService = CacheService.getScriptCache();
        _initialized = true;
      } catch (e) {
        console.warn('CacheService not available, using memory cache only:', e.message);
        _cacheService = null;
        _initialized = true;
      }
    }
  }

  function generateCacheKey(sheetName, requiredColumns, options) {
    // Use a hash of columns to avoid key length issues
    var colHash = requiredColumns.map(function(c) { 
      return String(c).replace(/[^a-zA-Z0-9]/g, '').substring(0, 4); 
    }).join('');
    var key = sheetName + '_' + colHash;
    if (options && options.cacheKeySuffix) {
      key += '_' + options.cacheKeySuffix;
    }
    return key;
  }

  function isExpired(cacheEntry, maxAge) {
    if (!cacheEntry || !cacheEntry.timestamp) return true;
    return (new Date().getTime() - cacheEntry.timestamp) > maxAge;
  }

  return {
    /**
     * Get data from cache (memory first, then persistent)
     */
    get: function(key) {
      init();
      
      // Check memory cache first (fastest)
      if (_memoryCache[key] && !isExpired(_memoryCache[key], 60000)) { // 1 minute in memory
        return _memoryCache[key].data;
      }

      // Check persistent cache if available
      if (_cacheService) {
        try {
          var cachedData = _cacheService.get(key);
          if (cachedData) {
            var parsed = JSON.parse(cachedData);
            if (!isExpired(parsed, 300000)) { // 5 minutes in persistent cache
              // Refresh memory cache
              _memoryCache[key] = parsed;
              return parsed.data;
            } else {
              _cacheService.remove(key); // Remove expired cache
            }
          }
        } catch (e) {
          console.warn('Error reading from persistent cache:', e.message);
        }
      }

      return null;
    },

    /**
     * Set data in both memory and persistent cache
     */
    set: function(key, data, ttlSeconds) {
      init();
      var maxAge = (ttlSeconds || 300) * 1000; // Default 5 minutes
      var timestamp = new Date().getTime();
      var cacheEntry = {
        data: data,
        timestamp: timestamp
      };

      // Update memory cache
      _memoryCache[key] = cacheEntry;

      // Update persistent cache if available
      if (_cacheService) {
        try {
          var serialized = JSON.stringify(cacheEntry);
          // CacheService has 100KB limit per key, check size
          if (serialized.length < 90000) { // Leave some buffer
            _cacheService.put(key, serialized, ttlSeconds || 300);
          } else {
            console.warn('Cache entry too large for CacheService:', key, serialized.length);
          }
        } catch (e) {
          console.warn('Error writing to persistent cache:', e.message);
        }
      }
    },

    /**
     * Clear all cache
     */
    clear: function() {
      init();
      _memoryCache = {};
      if (_cacheService) {
        try {
          _cacheService.removeAll(Object.keys(_memoryCache));
        } catch (e) {
          console.warn('Error clearing persistent cache:', e.message);
        }
      }
    },

    /**
     * Get cache statistics for monitoring
     */
    getStats: function() {
      init();
      return {
        memoryCacheSize: Object.keys(_memoryCache).length,
        persistentCacheAvailable: !!_cacheService,
        initialized: _initialized
      };
    }
  };
})();

/**
 * Optimized version of getSafeSheetData with persistent caching and performance improvements
 */
function getSafeSheetDataOptimized(sheetName, requiredColumns, options) {
  options = options || {};
  var useCache = options.useCache !== false; // Default to true
  var cacheDuration = options.cacheDuration || 300000; // 5 minutes default (persistent)
  var cacheKeySuffix = options.cacheKeySuffix || '';

  // Generate cache key
  var cacheKey = sheetName + '_' + requiredColumns.join('_') + '_' + cacheKeySuffix;

  // Check cache first
  if (useCache) {
    var cachedData = CacheManager.get(cacheKey);
    if (cachedData) {
      console.log('Using cached data for ' + sheetName + ' (key: ' + cacheKey + ')');
      return cachedData;
    }
  }

  try {
    // Add null check for spreadsheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error('Spreadsheet not available for getSafeSheetDataOptimized');
    }
    
    var result = SharedUtils.getSafeSheetData(sheetName, requiredColumns);

    // Cache the result
    if (useCache) {
      CacheManager.set(cacheKey, result, Math.floor(cacheDuration / 1000));
      console.log('Cached data for ' + sheetName + ' (key: ' + cacheKey + ')');
    }

    return result;
  } catch (e) {
    console.error('Failed to get sheet data (even with cache): ' + e.message);
    return [];
  }
}

/**
 * Get cache statistics for monitoring performance
 */
function getCacheStats() {
  return CacheManager.getStats();
}

/**
 * Clear all cache (both memory and persistent)
 */
function clearAllCache() {
  CacheManager.clear();
  console.log('All cache cleared');
}

/**
 * Simple in-memory cache implementation (legacy compatibility)
 */
var _performanceCache = {};

function getCache() {
  return _performanceCache;
}

function setCache(cache) {
  _performanceCache = cache;
}

function clearCache() {
  // Direct cache clearing to avoid circular dependencies
  _performanceCache = {};
  // Note: Previously called CacheManager.clear() but removed to break circular dependency
}

// ========================================
// ERROR HANDLING ENHANCEMENTS
// ========================================

/**
 * Enhanced error handler that provides better debugging information
 */
function handleErrorWithContext(error, context) {
  context = context || {};

  var errorInfo = {
    message: error.message || String(error),
    stack: error.stack || 'No stack trace',
    timestamp: new Date().toISOString(),
    context: context
  };

  // Log to console
  console.error('=== ERROR REPORT ===');
  console.error('Message:', errorInfo.message);
  console.error('Context:', JSON.stringify(errorInfo.context));
  console.error('Stack:', errorInfo.stack);

  // Try to send error report via email if possible
  try {
    if (typeof MailApp !== 'undefined' && context.sendEmail !== false) {
      var userEmail = Session.getActiveUser().getEmail();
      var emailValidation = ValidationUtils.validateEmail(userEmail);
      
      if (emailValidation.success) {
        var emailBody = formatErrorEmail(errorInfo);
        MailApp.sendEmail(
          emailValidation.email,
          'ðŸš¨ CRM Error Report: ' + errorInfo.message,
          emailBody
        );
      } else {
        console.warn('Invalid user email address, skipping error email: ' + userEmail);
      }
    }
  } catch (emailError) {
    console.error('Failed to send error email:', emailError.message);
  }

  return {
    success: false,
    error: errorInfo.message,
    debugInfo: errorInfo
  };
}

/**
 * Formats error information for email reporting
 */
function formatErrorEmail(errorInfo) {
  var body = 'CRM Error Report\n';
  body += '================\n\n';
  body += 'Timestamp: ' + (errorInfo.timestamp || 'unknown') + '\n';
  body += 'Error: ' + (errorInfo.message || 'unknown') + '\n\n';
  body += 'Context:\n';

  if (errorInfo.context && typeof errorInfo.context === 'object') {
    for (var key in errorInfo.context) {
      body += ' ' + key + ': ' + JSON.stringify(errorInfo.context[key]) + '\n';
    }
  } else {
    body += ' No context available\n';
  }

  body += '\nStack Trace:\n' + (errorInfo.stack || 'No stack trace available') + '\n\n';
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var user = ss ? Session.getActiveUser().getEmail() : 'unknown';
    var scriptId = ScriptApp ? ScriptApp.getScriptId() : 'unknown';
    
    body += 'User: ' + user + '\n';
    body += 'Script: ' + scriptId;
  } catch (e) {
    body += 'User: unknown\n';
    body += 'Script: unknown';
  }

  return body;
}

// ========================================
// DATA VALIDATION UTILITIES
// ========================================

/**
 * Validates required parameters and provides helpful error messages
 */
function validateParameters(params, requiredFields, context) {
  try {
    // Standard null check pattern
    if (typeof SpreadsheetApp === 'undefined') {
      throw new Error('SpreadsheetApp service not available in validateParameters');
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error('Active spreadsheet not available in validateParameters');
    }

    context = context || { functionName: 'unknown' };

    // Validate input parameters
    if (!Array.isArray(requiredFields)) {
      throw new Error('requiredFields must be an array');
    }

    // Defensive: Handle null/undefined params gracefully instead of throwing
    if (params === null || params === undefined) {
      console.warn('validateParameters called with null/undefined params in: ' + (context.functionName || 'unknown'));
      return {
        success: false,
        error: 'Missing required data: ' + (context.functionName || 'operation') + ' requires parameters',
        missingFields: requiredFields
      };
    }

    var missingFields = [];
    var invalidFields = [];

    requiredFields.forEach(function(field) {
      if (!params.hasOwnProperty(field)) {
        missingFields.push(field);
      } else if (params[field] === undefined || params[field] === null || params[field] === '') {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      var error = new Error('Missing required parameters: ' + missingFields.join(', '));
      // Direct error handling to avoid circular dependency with handleErrorWithContext
      console.error('=== VALIDATION ERROR ===');
      console.error('Function:', context.functionName);
      console.error('Missing fields:', missingFields.join(', '));
      console.error('Parameters:', JSON.stringify(params));

      return {
        success: false,
        error: error.message,
        missingFields: missingFields
      };
    }

    return { success: true };
  } catch (e) {
    console.error('Error in validateParameters:', e.message);
    return {
      success: false,
      error: 'Validation failed: ' + e.message
    };
  }
}

// ========================================
// SHEET LOCKING FOR CONCURRENCY CONTROL
// ========================================

/**
 * Executes a function with sheet locking to prevent concurrent modification issues
 */
function executeWithSheetLock(sheetName, fn, args) {
  // Standard null check pattern
  if (typeof SpreadsheetApp === 'undefined') {
    throw new Error('SpreadsheetApp service not available in executeWithSheetLock');
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Active spreadsheet not available in executeWithSheetLock');
  }

  var lock = LockService.getScriptLock();

  try {
    // Try to get lock with 10 second timeout
    var success = lock.tryLock(10000);

    if (!success) {
      throw new Error('Could not acquire lock - another process may be running');
    }

    // Execute the function
    var result = fn.apply(null, args);

    return result;
  } catch (e) {
    console.error('Sheet lock operation failed: ' + e.message);
    // Direct error response to avoid circular dependency
    return {
      success: false,
      error: 'Concurrency error: ' + e.message
    };
  } finally {
    // Always release the lock
    try {
      if (lock && lock.hasLock()) {
        lock.releaseLock();
      }
    } catch (releaseError) {
      console.warn('Error releasing lock:', releaseError.message);
    }
  }
}

/**
 * Enhanced version of updateCellSafe with sheet locking
 */
function updateCellSafeWithLock(sheetName, rowIndex, columnName, value) {
  return executeWithSheetLock(sheetName, function() {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var colIndex = -1;
      
      var normTarget = SharedUtils.normalizeHeader(columnName);

      for (var i = 0; i < headers.length; i++) {
        if (SharedUtils.normalizeHeader(headers[i]) === normTarget) {
          colIndex = i + 1; // 1-based
          break;
        }
      }
      
      if (colIndex === -1) {
        throw new Error('Column not found for update: ' + columnName);
      }
      
      sheet.getRange(rowIndex, colIndex).setValue(value);
      
      return {
        success: true,
        message: 'Cell updated successfully'
      };
    } catch (e) {
      return handleErrorWithContext(e, {
        functionName: 'updateCellSafeWithLock',
        sheetName: sheetName,
        rowIndex: rowIndex,
        columnName: columnName,
        value: value
      });
    }
  }, [sheetName, rowIndex, columnName, value]);
}

/**
 * Enhanced version of appendRowSafe with sheet locking
 */
function appendRowSafeWithLock(sheetName, rowObj) {
  return executeWithSheetLock(sheetName, function() {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

      var rowArray = headers.map(function(header) {
        var key = SharedUtils.normalizeHeader(header);
        return rowObj.hasOwnProperty(key) ? rowObj[key] : '';
      });

      sheet.appendRow(rowArray);
      
      return {
        success: true,
        message: 'Row appended successfully'
      };
    } catch (e) {
      return handleErrorWithContext(e, {
        functionName: 'appendRowSafeWithLock',
        sheetName: sheetName,
        rowObj: rowObj
      });
    }
  }, [sheetName, rowObj]);
}

/**
 * Enhanced version of setValues with sheet locking
 */
function setValuesWithLock(sheetName, startRow, startCol, numRows, numCols, values) {
  return executeWithSheetLock(sheetName, function() {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      
      sheet.getRange(startRow, startCol, numRows, numCols).setValues(values);
      
      return {
        success: true,
        message: 'Values set successfully'
      };
    } catch (e) {
      return handleErrorWithContext(e, {
        functionName: 'setValuesWithLock',
        sheetName: sheetName,
        startRow: startRow,
        startCol: startCol,
        numRows: numRows,
        numCols: numCols,
        valuesCount: values ? values.length : 0
      });
    }
  }, [sheetName, startRow, startCol, numRows, numCols, values]);
}

// ========================================
// MEMORY MANAGEMENT
// ========================================

/**
 * Clears temporary data and forces garbage collection
 */
function optimizeMemory() {
  try {
    // Clear any cached data (direct implementation to avoid circular dependency)
    _performanceCache = {};

    // Force spreadsheet changes to sync
    if (typeof SpreadsheetApp !== 'undefined') {
      SpreadsheetApp.flush();
    }

    // Small delay to allow cleanup
    Utilities.sleep(100);

    console.log('Memory optimization completed');
  } catch (e) {
    console.warn('Memory optimization warning: ' + e.message);
  }
}
