/**
 * Comprehensive Error Handling Framework
 * Centralized error handling utilities for the K&L Recycling CRM
 */
var ErrorHandling = {
  /**
   * Enhanced error handler with context and logging
   */
  handleError: function(error, context) {
    context = context || {};
    context.functionName = context.functionName || 'unknown';

    var errorInfo = {
      message: error.message || String(error),
      stack: error.stack || 'No stack trace',
      timestamp: new Date().toISOString(),
      context: context
    };

    // Log to console
    console.error('=== ERROR REPORT ===');
    console.error('Function:', context.functionName);
    console.error('Message:', errorInfo.message);
    console.error('Context:', JSON.stringify(errorInfo.context));
    console.error('Stack:', errorInfo.stack);

    // Log to system operations log if available
    this._logToSystemLog(errorInfo);

    // Try to send error report via email if possible
    this._sendErrorEmail(errorInfo);

    return {
      success: false,
      error: errorInfo.message,
      debugInfo: errorInfo
    };
  },

  /**
   * Log error to system operations log
   */
  _logToSystemLog: function(errorInfo) {
    try {
      if (typeof CONFIG !== 'undefined' && typeof SpreadsheetApp !== 'undefined') {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        if (ss) {
          var opsLogSheet = ss.getSheetByName(CONFIG.SHEETS.SYSTEM_LOG);
          if (opsLogSheet) {
            opsLogSheet.appendRow([
              new Date(),
              errorInfo.context.functionName,
              'ERROR',
              errorInfo.message,
              errorInfo.stack.substring(0, 500) // Limit stack trace length
            ]);
          }
        }
      }
    } catch (logError) {
      console.warn('Could not log error to system log:', logError.message);
    }
  },

  /**
   * Send error email notification
   */
  _sendErrorEmail: function(errorInfo) {
    try {
      if (typeof MailApp !== 'undefined' && typeof Session !== 'undefined') {
        var emailBody = this._formatErrorEmail(errorInfo);
        MailApp.sendEmail(
          Session.getActiveUser().getEmail(),
          'ðŸš¨ CRM Error Report: ' + errorInfo.message,
          emailBody
        );
      }
    } catch (emailError) {
      console.error('Failed to send error email:', emailError.message);
    }
  },

  /**
   * Format error information for email reporting
   */
  _formatErrorEmail: function(errorInfo) {
    var body = 'CRM Error Report\n';
    body += '================\n\n';
    body += 'Timestamp: ' + (errorInfo.timestamp || 'unknown') + '\n';
    body += 'Function: ' + (errorInfo.context.functionName || 'unknown') + '\n';
    body += 'Error: ' + (errorInfo.message || 'unknown') + '\n\n';

    if (errorInfo.context && typeof errorInfo.context === 'object') {
      body += 'Context:\n';
      for (var key in errorInfo.context) {
        if (key !== 'functionName') {
          body += ' ' + key + ': ' + JSON.stringify(errorInfo.context[key]) + '\n';
        }
      }
      body += '\n';
    }

    body += 'Stack Trace:\n' + (errorInfo.stack || 'No stack trace available') + '\n\n';

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
  },

  /**
   * Wrap function with comprehensive error handling
   */
  withErrorHandling: function(fn, context) {
    return function() {
      try {
        // Add null checks for SpreadsheetApp
        if (typeof SpreadsheetApp !== 'undefined') {
          var ss = SpreadsheetApp.getActiveSpreadsheet();
          if (!ss) {
            throw new Error('Active spreadsheet not available');
          }
        }

        return fn.apply(this, arguments);
      } catch (e) {
        return ErrorHandling.handleError(e, context);
      }
    };
  },

  /**
   * Execute function with retry logic
   */
  withRetries: function(fn, maxRetries, context) {
    maxRetries = maxRetries || 2;
    context = context || { functionName: fn.name || 'unknown' };

    var lastError;
    var attempt = 0;

    while (attempt <= maxRetries) {
      try {
        attempt++;
        var result = fn.apply(this, Array.prototype.slice.call(arguments, 2));

        // If result indicates failure, treat as error for retry purposes
        if (result && typeof result === 'object' && result.success === false) {
          throw new Error(result.error || 'Operation returned failure');
        }

        return result;
      } catch (e) {
        lastError = e;
        console.warn('Attempt ' + attempt + ' failed for ' + context.functionName + ': ' + e.message);

        // Don't retry on the last attempt
        if (attempt > maxRetries) {
          break;
        }

        // Exponential backoff for retries
        var delay = 1000 * Math.pow(2, attempt - 1);
        console.log('Retrying in ' + delay + 'ms...');

        try {
          if (delay <= 5000) {
            Utilities.sleep(delay);
          } else {
            if (typeof SpreadsheetApp !== 'undefined') {
              SpreadsheetApp.flush();
            }
            Utilities.sleep(Math.min(delay, 10000));
          }
        } catch (sleepError) {
          console.warn('Sleep failed during retry:', sleepError.message);
        }
      }
    }

    return ErrorHandling.handleError(lastError, context);
  },

  /**
   * Execute function with timeout protection
   */
  withTimeoutProtection: function(fn, timeoutThreshold, context) {
    timeoutThreshold = timeoutThreshold || 40000; // 40 seconds default
    context = context || { functionName: fn.name || 'unknown' };

    var startTime = new Date().getTime();

    // Check if we're approaching timeout limits
    if (this._checkExecutionTime(startTime, context.functionName)) {
      console.warn('âš ï¸ TIMEOUT WARNING: Approaching execution limits');
    }

    try {
      return fn.apply(this, Array.prototype.slice.call(arguments, 3));
    } catch (e) {
      return ErrorHandling.handleError(e, context);
    }
  },

  /**
   * Check if execution is approaching timeout limits
   */
  _checkExecutionTime: function(startTime, functionName) {
    var currentTime = new Date().getTime();
    var elapsed = currentTime - startTime;

    // Google Apps Script has a 6-minute timeout for most operations
    var timeoutLimit = 6 * 60 * 1000; // 6 minutes in ms
    var warningThreshold = timeoutLimit * 0.7; // Warn at 70% of limit

    if (elapsed > warningThreshold) {
      console.warn('âš ï¸ TIMEOUT WARNING: ' + functionName + ' has been running for ' +
                  (elapsed/1000).toFixed(1) + ' seconds. Approaching 6-minute limit.');
      return true;
    }
    return false;
  },

  /**
   * Execute function with sheet locking for concurrency control
   */
  withSheetLock: function(sheetName, fn, context) {
    context = context || { functionName: fn.name || 'unknown', sheetName: sheetName };

    var lock = LockService.getScriptLock();
    var result;

    try {
      // Try to get lock with 10 second timeout
      var success = lock.tryLock(10000);

      if (!success) {
        throw new Error('Could not acquire lock - another process may be running');
      }

      // Execute the function
      result = fn.apply(this, Array.prototype.slice.call(arguments, 3));

      return result;
    } catch (e) {
      return ErrorHandling.handleError(e, context);
    } finally {
      // Always release the lock
      if (lock.hasLock()) {
        lock.releaseLock();
      }
    }
  },

  /**
   * Execute function with comprehensive protection (error handling + retries + timeout)
   */
  withFullProtection: function(fn, options) {
    options = options || {};
    var maxRetries = options.maxRetries || 2;
    var timeoutThreshold = options.timeoutThreshold || 40000;
    var context = options.context || { functionName: fn.name || 'unknown' };

    return this.withErrorHandling(function() {
      return ErrorHandling.withRetries(function() {
        return ErrorHandling.withTimeoutProtection(fn, timeoutThreshold, context);
      }, maxRetries, context);
    }, context);
  }
};
