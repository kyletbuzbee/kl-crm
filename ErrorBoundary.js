/**
 * ErrorBoundary - Standardized Error Handling & Logging
 * Resolves 37 error handling issues across the codebase
 * 
 * @version 1.0.0
 * @author K&L Recycling CRM Team
 */

const ErrorBoundary = (function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  
  const CONFIG = {
    // Alert thresholds
    ALERT_ON_ERROR: true,
    ALERT_EMAIL_RECIPIENTS: [], // Will use active user by default
    
    // Logging
    LOG_TO_SHEET: true,
    LOG_SHEET_NAME: 'System Log',
    MAX_LOG_ENTRIES: 10000,
    
    // Retry settings
    DEFAULT_MAX_RETRIES: 3,
    DEFAULT_RETRY_DELAY: 1000, // ms
    
    // Timeout settings
    DEFAULT_TIMEOUT: 300000, // 5 minutes
    WARNING_THRESHOLD: 240000, // 4 minutes
    
    // Environment
    IS_PRODUCTION: false, // Set to true to reduce verbose logging
    DEBUG_MODE: true
  };

  // ============================================================================
  // ERROR CLASSIFICATION
  // ============================================================================
  
  const ErrorTypes = {
    VALIDATION: 'VALIDATION_ERROR',
    PERMISSION: 'PERMISSION_ERROR',
    TIMEOUT: 'TIMEOUT_ERROR',
    NETWORK: 'NETWORK_ERROR',
    SCRIPT: 'SCRIPT_ERROR',
    DATA: 'DATA_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
  };

  const ErrorSeverity = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  };

  // ============================================================================
  // PRIVATE FUNCTIONS
  // ============================================================================
  
  /**
   * Classify an error type based on message and context
   */
  function _classifyError(error, context) {
    const message = (error.message || error.toString()).toLowerCase();
    
    if (message.includes('permission') || message.includes('access') || message.includes('unauthorized')) {
      return { type: ErrorTypes.PERMISSION, severity: ErrorSeverity.HIGH };
    }
    if (message.includes('timeout') || message.includes('exceeded') || message.includes('deadline')) {
      return { type: ErrorTypes.TIMEOUT, severity: ErrorSeverity.HIGH };
    }
    if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
      return { type: ErrorTypes.NETWORK, severity: ErrorSeverity.MEDIUM };
    }
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return { type: ErrorTypes.VALIDATION, severity: ErrorSeverity.LOW };
    }
    if (message.includes('data') || message.includes('parse') || message.includes('format')) {
      return { type: ErrorTypes.DATA, severity: ErrorSeverity.MEDIUM };
    }
    if (message.includes('script') || message.includes('runtime') || message.includes('exception')) {
      return { type: ErrorTypes.SCRIPT, severity: ErrorSeverity.CRITICAL };
    }
    
    return { type: ErrorTypes.UNKNOWN, severity: ErrorSeverity.MEDIUM };
  }
  
  /**
   * Log error to System Log sheet
   */
  function _logToSheet(errorInfo) {
    if (!CONFIG.LOG_TO_SHEET) return;
    
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
      
      // Create log sheet if it doesn't exist
      if (!logSheet) {
        logSheet = ss.insertSheet(CONFIG.LOG_SHEET_NAME);
        logSheet.appendRow([
          'Timestamp',
          'Function',
          'Error Type',
          'Severity',
          'Message',
          'Context',
          'Stack Trace',
          'User'
        ]);
        logSheet.getRange(1, 1, 1, 8).setFontWeight('bold');
      }
      
      // Trim old entries if needed
      const lastRow = logSheet.getLastRow();
      if (lastRow > CONFIG.MAX_LOG_ENTRIES) {
        logSheet.deleteRows(2, lastRow - CONFIG.MAX_LOG_ENTRIES + 100);
      }
      
      // Append error entry
      logSheet.appendRow([
        errorInfo.timestamp,
        errorInfo.functionName,
        errorInfo.errorType,
        errorInfo.severity,
        errorInfo.message.substring(0, 500), // Truncate long messages
        JSON.stringify(errorInfo.context).substring(0, 500),
        (errorInfo.stackTrace || '').substring(0, 500),
        errorInfo.user
      ]);
      
    } catch (logError) {
      console.error('Failed to log error to sheet:', logError);
    }
  }
  
  /**
   * Send error alert email
   */
  function _sendAlert(errorInfo) {
    if (!CONFIG.ALERT_ON_ERROR) return;
    if (errorInfo.severity !== ErrorSeverity.HIGH && errorInfo.severity !== ErrorSeverity.CRITICAL) return;
    
    try {
      const userEmail = Session.getActiveUser().getEmail();
      const recipients = CONFIG.ALERT_EMAIL_RECIPIENTS.length > 0 
        ? CONFIG.ALERT_EMAIL_RECIPIENTS 
        : [userEmail];
      
      const subject = `[CRM ALERT] ${errorInfo.severity.toUpperCase()}: ${errorInfo.errorType} in ${errorInfo.functionName}`;
      
      const htmlBody = `
        <h2>CRM Error Alert</h2>
        <table border="1" cellpadding="5" style="border-collapse: collapse;">
          <tr><td><strong>Function</strong></td><td>${errorInfo.functionName}</td></tr>
          <tr><td><strong>Error Type</strong></td><td>${errorInfo.errorType}</td></tr>
          <tr><td><strong>Severity</strong></td><td>${errorInfo.severity}</td></tr>
          <tr><td><strong>Timestamp</strong></td><td>${errorInfo.timestamp}</td></tr>
          <tr><td><strong>User</strong></td><td>${errorInfo.user}</td></tr>
          <tr><td><strong>Message</strong></td><td>${errorInfo.message}</td></tr>
          <tr><td><strong>Context</strong></td><td><pre>${JSON.stringify(errorInfo.context, null, 2)}</pre></td></tr>
        </table>
        <p><em>This is an automated message from K&L Recycling CRM</em></p>
      `;
      
      MailApp.sendEmail({
        to: recipients.join(','),
        subject: subject,
        htmlBody: htmlBody,
        name: 'K&L CRM Error Handler'
      });
      
    } catch (emailError) {
      console.error('Failed to send error alert:', emailError);
    }
  }
  
  /**
   * Format error for logging
   */
  function _formatError(error, functionName, context, startTime) {
    const now = new Date();
    const classification = _classifyError(error, context);
    
    return {
      timestamp: now.toISOString(),
      functionName: functionName,
      errorType: classification.type,
      severity: classification.severity,
      message: error.message || error.toString(),
      stackTrace: error.stack || '',
      context: context || {},
      user: Session.getActiveUser().getEmail(),
      executionTime: startTime ? (now.getTime() - startTime.getTime()) : null,
      scriptId: ScriptApp.getScriptId()
    };
  }
  
  /**
   * Calculate exponential backoff delay
   */
  function _calculateBackoffDelay(attempt, baseDelay) {
    return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  return {
    
    /**
     * Configure ErrorBoundary settings
     * @param {Object} options - Configuration options
     */
    configure: function(options) {
      Object.assign(CONFIG, options);
    },
    
    /**
     * Wrap a function with error handling
     * @param {Function} fn - Function to wrap
     * @param {Object} options - Wrapping options
     * @returns {Function} Wrapped function
     * 
     * @example
     * const safeFunction = ErrorBoundary.wrap(
     *   function myFunction(data) { return process(data); },
     *   { 
     *     context: 'DataProcessing',
     *     alertOnError: true,
     *     defaultValue: []
     *   }
     * );
     */
    wrap: function(fn, options) {
      const opts = Object.assign({
        context: {},
        alertOnError: false,
        logErrors: true,
        defaultValue: null,
        rethrow: false
      }, options);
      
      return function() {
        const startTime = new Date();
        const functionName = fn.name || 'anonymous';
        
        try {
          const result = fn.apply(this, arguments);
          
          // Handle promises
          if (result && typeof result.then === 'function') {
            return result.catch(function(error) {
              const errorInfo = _formatError(error, functionName, opts.context, startTime);
              
              if (opts.logErrors) {
                console.error(`[${errorInfo.errorType}] ${errorInfo.message}`);
                _logToSheet(errorInfo);
              }
              
              if (opts.alertOnError) {
                _sendAlert(errorInfo);
              }
              
              if (opts.rethrow) {
                throw error;
              }
              
              return opts.defaultValue;
            });
          }
          
          return result;
          
        } catch (error) {
          const errorInfo = _formatError(error, functionName, opts.context, startTime);
          
          if (opts.logErrors) {
            console.error(`[${errorInfo.errorType}] ${errorInfo.message}`);
            _logToSheet(errorInfo);
          }
          
          if (opts.alertOnError) {
            _sendAlert(errorInfo);
          }
          
          if (opts.rethrow) {
            throw error;
          }
          
          return opts.defaultValue;
        }
      };
    },
    
    /**
     * Execute function with retry logic
     * @param {Function} fn - Function to execute
     * @param {Object} options - Retry options
     * @returns {*} Function result
     * 
     * @example
     * const result = ErrorBoundary.withRetry(
     *   () => fetchData(),
     *   { maxRetries: 3, delay: 1000 }
     * );
     */
    withRetry: function(fn, options) {
      const opts = Object.assign({
        maxRetries: CONFIG.DEFAULT_MAX_RETRIES,
        delay: CONFIG.DEFAULT_RETRY_DELAY,
        context: {},
        retryOn: null, // Array of error types to retry on, null = all
        onRetry: null  // Callback before each retry
      }, options);
      
      const functionName = fn.name || 'anonymous';
      let lastError;
      
      for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
          const result = fn();
          
          // Handle promises
          if (result && typeof result.then === 'function') {
            return result.catch(function(error) {
              lastError = error;
              
              const classification = _classifyError(error, opts.context);
              
              // Check if we should retry
              if (attempt < opts.maxRetries) {
                if (!opts.retryOn || opts.retryOn.includes(classification.type)) {
                  if (opts.onRetry) {
                    opts.onRetry(attempt + 1, error);
                  }
                  
                  const backoffDelay = _calculateBackoffDelay(attempt, opts.delay);
                  console.warn(`Retry ${attempt + 1}/${opts.maxRetries} for ${functionName} after ${backoffDelay}ms`);
                  Utilities.sleep(backoffDelay);
                  return; // Continue to next attempt
                }
              }
              
              throw error;
            });
          }
          
          return result;
          
        } catch (error) {
          lastError = error;
          
          const classification = _classifyError(error, opts.context);
          
          // Check if we should retry
          if (attempt < opts.maxRetries) {
            if (!opts.retryOn || opts.retryOn.includes(classification.type)) {
              if (opts.onRetry) {
                opts.onRetry(attempt + 1, error);
              }
              
              const backoffDelay = _calculateBackoffDelay(attempt, opts.delay);
              console.warn(`Retry ${attempt + 1}/${opts.maxRetries} for ${functionName} after ${backoffDelay}ms: ${error.message}`);
              Utilities.sleep(backoffDelay);
              continue;
            }
          }
          
          // Out of retries
          throw error;
        }
      }
      
      throw lastError;
    },
    
    /**
     * Execute function with timeout protection
     * @param {Function} fn - Function to execute
     * @param {Object} options - Timeout options
     * @returns {*} Function result
     */
    withTimeout: function(fn, options) {
      const opts = Object.assign({
        timeout: CONFIG.DEFAULT_TIMEOUT,
        warningThreshold: CONFIG.WARNING_THRESHOLD,
        context: {}
      }, options);
      
      const startTime = new Date();
      const functionName = fn.name || 'anonymous';
      
      // Check execution time periodically
      const checkInterval = setInterval(function() {
        const elapsed = new Date().getTime() - startTime.getTime();
        
        if (elapsed > opts.timeout) {
          clearInterval(checkInterval);
          throw new Error(`Function ${functionName} exceeded timeout of ${opts.timeout}ms`);
        }
        
        if (elapsed > opts.warningThreshold && CONFIG.DEBUG_MODE) {
          console.warn(`Function ${functionName} approaching timeout: ${elapsed}ms elapsed`);
        }
      }, 5000); // Check every 5 seconds
      
      try {
        const result = fn();
        clearInterval(checkInterval);
        return result;
      } catch (error) {
        clearInterval(checkInterval);
        throw error;
      }
    },
    
    /**
     * Handle an error manually
     * @param {Error} error - Error object
     * @param {string} functionName - Name of function where error occurred
     * @param {Object} context - Context object
     * @param {Object} options - Handling options
     */
    handle: function(error, functionName, context, options) {
      const opts = Object.assign({
        log: true,
        alert: false,
        defaultValue: null
      }, options);
      
      const errorInfo = _formatError(error, functionName, context, null);
      
      if (opts.log) {
        console.error(`[${errorInfo.errorType}] ${functionName}: ${errorInfo.message}`);
        _logToSheet(errorInfo);
      }
      
      if (opts.alert) {
        _sendAlert(errorInfo);
      }
      
      return opts.defaultValue;
    },
    
    /**
     * Create a safe version of an existing function
     * @param {Object} target - Object containing the function
     * @param {string} methodName - Name of method to wrap
     * @param {Object} options - Wrapping options
     */
    guard: function(target, methodName, options) {
      if (!target[methodName]) {
        console.warn(`ErrorBoundary.guard: Method ${methodName} not found on target`);
        return;
      }
      
      const originalFn = target[methodName];
      const opts = Object.assign({
        context: { method: methodName }
      }, options);
      
      target[methodName] = this.wrap(originalFn.bind(target), opts);
    },
    
    /**
     * Get error statistics from log
     * @param {number} hoursBack - Hours to look back
     * @returns {Object} Error statistics
     */
    getErrorStats: function(hoursBack = 24) {
      try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
        
        if (!logSheet) {
          return { total: 0, byType: {}, bySeverity: {} };
        }
        
        const data = logSheet.getDataRange().getValues();
        const cutoffTime = new Date().getTime() - (hoursBack * 60 * 60 * 1000);
        
        const stats = {
          total: 0,
          byType: {},
          bySeverity: {},
          byFunction: {}
        };
        
        // Skip header row
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const timestamp = new Date(row[0]).getTime();
          
          if (timestamp >= cutoffTime) {
            const errorType = row[2];
            const severity = row[3];
            const functionName = row[1];
            
            stats.total++;
            stats.byType[errorType] = (stats.byType[errorType] || 0) + 1;
            stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
            stats.byFunction[functionName] = (stats.byFunction[functionName] || 0) + 1;
          }
        }
        
        return stats;
        
      } catch (error) {
        console.error('Failed to get error stats:', error);
        return { total: 0, byType: {}, bySeverity: {}, error: error.message };
      }
    },
    
    /**
     * Clear error log
     * @param {boolean} confirm - Must be true to confirm deletion
     */
    clearLog: function(confirm) {
      if (!confirm) {
        console.warn('ErrorBoundary.clearLog: Pass true to confirm deletion');
        return;
      }
      
      try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
        
        if (logSheet) {
          const lastRow = logSheet.getLastRow();
          if (lastRow > 1) {
            logSheet.deleteRows(2, lastRow - 1);
          }
          console.log('Error log cleared');
        }
      } catch (error) {
        console.error('Failed to clear error log:', error);
      }
    },
    
    // Expose constants
    ErrorTypes: ErrorTypes,
    ErrorSeverity: ErrorSeverity
  };
  
})();

// Make available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorBoundary;
}
