/**
 * LoggerInjector - Automated Logging & Performance Tracking
 * Resolves 130+ missing logging issues across the codebase
 * 
 * @version 1.0.0
 * @author K&L Recycling CRM Team
 */

const LoggerInjector = (function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  
  const CONFIG = {
    // Log levels
    LEVELS: {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    },
    
    // Current log level
    CURRENT_LEVEL: 1, // INFO
    
    // Log destinations
    LOG_TO_CONSOLE: true,
    LOG_TO_SHEET: true,
    LOG_SHEET_NAME: 'Operation Log',
    
    // Performance tracking
    TRACK_PERFORMANCE: true,
    SLOW_FUNCTION_THRESHOLD: 1000, // ms
    
    // Context enrichment
    INCLUDE_TIMESTAMP: true,
    INCLUDE_USER: true,
    INCLUDE_EXECUTION_TIME: true,
    
    // Max log entries
    MAX_LOG_ENTRIES: 5000
  };

  // ============================================================================
  // PERFORMANCE TRACKER
  // ============================================================================
  
  const performanceTracker = {
    calls: new Map(),
    
    start: function(functionName) {
      this.calls.set(functionName, {
        startTime: Date.now(),
        callCount: (this.calls.get(functionName)?.callCount || 0) + 1
      });
    },
    
    end: function(functionName) {
      const tracking = this.calls.get(functionName);
      if (!tracking) return null;
      
      const duration = Date.now() - tracking.startTime;
      tracking.totalTime = (tracking.totalTime || 0) + duration;
      tracking.avgTime = tracking.totalTime / tracking.callCount;
      
      return duration;
    },
    
    getStats: function(functionName) {
      return this.calls.get(functionName) || null;
    },
    
    getAllStats: function() {
      const stats = {};
      this.calls.forEach((value, key) => {
        stats[key] = {
          callCount: value.callCount,
          avgTime: Math.round(value.avgTime || 0),
          totalTime: value.totalTime || 0
        };
      });
      return stats;
    },
    
    clear: function() {
      this.calls.clear();
    }
  };

  // ============================================================================
  // PRIVATE FUNCTIONS
  // ============================================================================
  
  /**
   * Format timestamp
   */
  function _getTimestamp() {
    return new Date().toISOString();
  }
  
  /**
   * Get current user
   */
  function _getUser() {
    try {
      return Session.getActiveUser().getEmail();
    } catch (e) {
      return 'unknown';
    }
  }
  
  /**
   * Format log message
   */
  function _formatMessage(level, functionName, message, data) {
    const parts = [];
    
    if (CONFIG.INCLUDE_TIMESTAMP) {
      parts.push(`[${_getTimestamp()}]`);
    }
    
    parts.push(`[${level}]`);
    
    if (functionName) {
      parts.push(`[${functionName}]`);
    }
    
    parts.push(message);
    
    if (data) {
      try {
        const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
        parts.push('- Data:', dataStr.substring(0, 500));
      } catch (e) {
        parts.push('- Data: [Unable to serialize]');
      }
    }
    
    return parts.join(' ');
  }
  
  /**
   * Write to log sheet
   */
  function _writeToSheet(level, functionName, message, data, executionTime) {
    if (!CONFIG.LOG_TO_SHEET) return;
    
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
      
      // Create sheet if needed
      if (!logSheet) {
        logSheet = ss.insertSheet(CONFIG.LOG_SHEET_NAME);
        logSheet.appendRow([
          'Timestamp', 'Level', 'Function', 'Message', 'Data', 'User', 'Execution Time (ms)'
        ]);
        logSheet.getRange(1, 1, 1, 7).setFontWeight('bold');
      }
      
      // Trim old entries
      const lastRow = logSheet.getLastRow();
      if (lastRow > CONFIG.MAX_LOG_ENTRIES) {
        logSheet.deleteRows(2, lastRow - CONFIG.MAX_LOG_ENTRIES + 100);
      }
      
      // Append log entry
      logSheet.appendRow([
        _getTimestamp(),
        level,
        functionName || '',
        String(message).substring(0, 500),
        data ? JSON.stringify(data).substring(0, 500) : '',
        CONFIG.INCLUDE_USER ? _getUser() : '',
        executionTime || ''
      ]);
      
    } catch (e) {
      // Fail silently to avoid infinite loops
      console.error('Failed to write to log sheet:', e);
    }
  }
  
  /**
   * Check if we should log at this level
   */
  function _shouldLog(level) {
    return CONFIG.LEVELS[level] >= CONFIG.CURRENT_LEVEL;
  }
  
  /**
   * Log a message
   */
  function _log(level, functionName, message, data, executionTime) {
    if (!_shouldLog(level)) return;
    
    const formattedMessage = _formatMessage(level, functionName, message, data);
    
    if (CONFIG.LOG_TO_CONSOLE) {
      switch (level) {
        case 'DEBUG':
          console.log(formattedMessage);
          break;
        case 'INFO':
          console.info(formattedMessage);
          break;
        case 'WARN':
          console.warn(formattedMessage);
          break;
        case 'ERROR':
          console.error(formattedMessage);
          break;
      }
    }
    
    _writeToSheet(level, functionName, message, data, executionTime);
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  return {
    
    /**
     * Configure LoggerInjector
     * @param {Object} options - Configuration options
     */
    configure: function(options) {
      Object.assign(CONFIG, options);
    },
    
    /**
     * Set log level
     * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
     */
    setLevel: function(level) {
      if (CONFIG.LEVELS[level] !== undefined) {
        CONFIG.CURRENT_LEVEL = CONFIG.LEVELS[level];
      }
    },
    
    /**
     * Log debug message
     * @param {string} message - Log message
     * @param {*} data - Additional data
     * @param {string} functionName - Function name
     */
    debug: function(message, data, functionName) {
      _log('DEBUG', functionName, message, data);
    },
    
    /**
     * Log info message
     * @param {string} message - Log message
     * @param {*} data - Additional data
     * @param {string} functionName - Function name
     */
    info: function(message, data, functionName) {
      _log('INFO', functionName, message, data);
    },
    
    /**
     * Log warning message
     * @param {string} message - Log message
     * @param {*} data - Additional data
     * @param {string} functionName - Function name
     */
    warn: function(message, data, functionName) {
      _log('WARN', functionName, message, data);
    },
    
    /**
     * Log error message
     * @param {string} message - Log message
     * @param {*} data - Additional data
     * @param {string} functionName - Function name
     */
    error: function(message, data, functionName) {
      _log('ERROR', functionName, message, data);
    },
    
    /**
     * Create a scoped logger for a function
     * @param {string} functionName - Name of the function
     * @returns {Object} Scoped logger object
     * 
     * @example
     * const log = LoggerInjector.createScopedLogger('myFunction');
     * log.info('Starting process');
     * log.debug('Data:', data);
     */
    createScopedLogger: function(functionName) {
      return {
        debug: (msg, data) => this.debug(msg, data, functionName),
        info: (msg, data) => this.info(msg, data, functionName),
        warn: (msg, data) => this.warn(msg, data, functionName),
        error: (msg, data) => this.error(msg, data, functionName),
        
        entry: (params) => {
          _log('INFO', functionName, 'ENTRY', params);
          if (CONFIG.TRACK_PERFORMANCE) {
            performanceTracker.start(functionName);
          }
        },
        
        exit: (result) => {
          let executionTime = null;
          if (CONFIG.TRACK_PERFORMANCE) {
            executionTime = performanceTracker.end(functionName);
          }
          _log('INFO', functionName, 'EXIT', result, executionTime);
        },
        
        success: (msg, data) => _log('INFO', functionName, `SUCCESS: ${msg}`, data),
        failure: (msg, error) => _log('ERROR', functionName, `FAILURE: ${msg}`, error?.message || error)
      };
    },
    
    /**
     * Inject logging into a function
     * @param {Function} fn - Function to wrap
     * @param {Object} options - Injection options
     * @returns {Function} Wrapped function with logging
     * 
     * @example
     * const loggedFunction = LoggerInjector.inject(
     *   function processData(data) { return transform(data); },
     *   { logParams: true, logResult: true, logExecutionTime: true }
     * );
     */
    inject: function(fn, options) {
      const opts = Object.assign({
        logParams: true,
        logResult: false,
        logExecutionTime: true,
        logEntry: true,
        logExit: true,
        paramFilter: null // Function to filter sensitive params
      }, options);
      
      const functionName = fn.name || 'anonymous';
      
      return function() {
        const startTime = Date.now();
        
        // Log entry
        if (opts.logEntry) {
          const params = opts.logParams ? 
            (opts.paramFilter ? opts.paramFilter(arguments) : Array.from(arguments)) : 
            '[params hidden]';
          _log('INFO', functionName, 'ENTRY', params);
        }
        
        try {
          const result = fn.apply(this, arguments);
          
          // Handle promises
          if (result && typeof result.then === 'function') {
            return result
              .then(value => {
                const executionTime = Date.now() - startTime;
                
                if (opts.logExit) {
                  const logData = opts.logResult ? value : '[result hidden]';
                  _log('INFO', functionName, 'EXIT (Promise resolved)', logData, executionTime);
                }
                
                if (CONFIG.TRACK_PERFORMANCE && executionTime > CONFIG.SLOW_FUNCTION_THRESHOLD) {
                  _log('WARN', functionName, `SLOW FUNCTION: ${executionTime}ms`, null, executionTime);
                }
                
                return value;
              })
              .catch(error => {
                const executionTime = Date.now() - startTime;
                _log('ERROR', functionName, 'EXIT (Promise rejected)', error.message, executionTime);
                throw error;
              });
          }
          
          // Synchronous result
          const executionTime = Date.now() - startTime;
          
          if (opts.logExit) {
            const logData = opts.logResult ? result : '[result hidden]';
            _log('INFO', functionName, 'EXIT', logData, executionTime);
          }
          
          if (CONFIG.TRACK_PERFORMANCE && executionTime > CONFIG.SLOW_FUNCTION_THRESHOLD) {
            _log('WARN', functionName, `SLOW FUNCTION: ${executionTime}ms`, null, executionTime);
          }
          
          return result;
          
        } catch (error) {
          const executionTime = Date.now() - startTime;
          _log('ERROR', functionName, 'EXIT (Exception)', error.message, executionTime);
          throw error;
        }
      };
    },
    
    /**
     * Inject logging into all methods of an object
     * @param {Object} target - Object to inject logging into
     * @param {Object} options - Injection options
     */
    injectAll: function(target, options) {
      const opts = Object.assign({
        prefix: target.constructor?.name || 'Object',
        methodFilter: null // Function to filter which methods to inject
      }, options);
      
      Object.getOwnPropertyNames(target).forEach(prop => {
        if (typeof target[prop] === 'function') {
          // Skip if filter returns false
          if (opts.methodFilter && !opts.methodFilter(prop)) return;
          
          // Create wrapped function
          const originalFn = target[prop];
          target[prop] = this.inject(originalFn, Object.assign({}, opts, {
            context: `${opts.prefix}.${prop}`
          }));
        }
      });
    },
    
    /**
     * Create a timer for performance tracking
     * @param {string} label - Timer label
     * @returns {Object} Timer object
     */
    createTimer: function(label) {
      const startTime = Date.now();
      
      return {
        label: label,
        
        checkpoint: (checkpointLabel) => {
          const elapsed = Date.now() - startTime;
          _log('DEBUG', null, `TIMER [${label}] - ${checkpointLabel}: ${elapsed}ms`);
          return elapsed;
        },
        
        stop: () => {
          const total = Date.now() - startTime;
          _log('INFO', null, `TIMER [${label}] - Total: ${total}ms`, null, total);
          return total;
        }
      };
    },
    
    /**
     * Log batch operation progress
     * @param {string} operation - Operation name
     * @param {number} current - Current progress
     * @param {number} total - Total items
     * @param {*} data - Additional data
     */
    logProgress: function(operation, current, total, data) {
      const percent = Math.round((current / total) * 100);
      _log('INFO', null, `PROGRESS [${operation}]: ${current}/${total} (${percent}%)`, data);
    },
    
    /**
     * Get performance statistics
     * @returns {Object} Performance statistics
     */
    getPerformanceStats: function() {
      return performanceTracker.getAllStats();
    },
    
    /**
     * Clear performance tracking data
     */
    clearPerformanceData: function() {
      performanceTracker.clear();
      _log('INFO', null, 'Performance tracking data cleared');
    },
    
    /**
     * Generate performance report
     * @returns {string} Formatted report
     */
    generatePerformanceReport: function() {
      const stats = performanceTracker.getAllStats();
      const lines = ['=== Performance Report ===', ''];
      
      Object.keys(stats).sort((a, b) => stats[b].avgTime - stats[a].avgTime).forEach(func => {
        const s = stats[func];
        lines.push(`${func}:`);
        lines.push(`  Calls: ${s.callCount}`);
        lines.push(`  Avg Time: ${s.avgTime}ms`);
        lines.push(`  Total Time: ${s.totalTime}ms`);
        lines.push('');
      });
      
      return lines.join('\n');
    },
    
    /**
     * Clear log sheet
     * @param {boolean} confirm - Must be true to confirm
     */
    clearLog: function(confirm) {
      if (!confirm) {
        console.warn('LoggerInjector.clearLog: Pass true to confirm deletion');
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
          _log('INFO', null, 'Log cleared');
        }
      } catch (error) {
        console.error('Failed to clear log:', error);
      }
    },
    
    /**
     * Group related log messages
     * @param {string} label - Group label
     * @param {Function} fn - Function to execute within group
     * @returns {*} Function result
     */
    group: function(label, fn) {
      console.log(`[GROUP START] ${label}`);
      
      try {
        const result = fn();
        console.log(`[GROUP END] ${label}`);
        return result;
      } catch (error) {
        console.log(`[GROUP END - ERROR] ${label}`);
        throw error;
      }
    }
  };
  
})();

// Make available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoggerInjector;
}
