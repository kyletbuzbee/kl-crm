/**
 * BatchProcessor - Optimized Batch Operations for Google Sheets
 * Resolves 41 performance issues across the codebase
 * 
 * @version 1.0.0
 * @author K&L Recycling CRM Team
 */

const BatchProcessor = (function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  
  const CONFIG = {
    // Batch sizes
    DEFAULT_BATCH_SIZE: 100,
    MAX_BATCH_SIZE: 500,
    MIN_BATCH_SIZE: 10,
    
    // Memory management
    MEMORY_THRESHOLD: 50 * 1024 * 1024, // 50MB
    FORCE_GC_INTERVAL: 5, // Force memory cleanup every N batches
    
    // Timing
    BATCH_DELAY_MS: 100,
    MAX_EXECUTION_TIME: 280000, // 4min 40s (under 5min limit)
    
    // Retry logic
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    
    // Logging
    LOG_PROGRESS: true,
    LOG_PERFORMANCE: true
  };

  // ============================================================================
  // STATE
  // ============================================================================
  
  let executionStartTime = null;
  let batchCounter = 0;

  // ============================================================================
  // PRIVATE FUNCTIONS
  // ============================================================================
  
  /**
   * Check if we're approaching execution time limit
   */
  function _checkTimeLimit() {
    if (!executionStartTime) return { ok: true, remaining: CONFIG.MAX_EXECUTION_TIME };
    
    const elapsed = Date.now() - executionStartTime;
    const remaining = CONFIG.MAX_EXECUTION_TIME - elapsed;
    
    return {
      ok: remaining > 30000, // Need at least 30 seconds remaining
      remaining: remaining,
      elapsed: elapsed
    };
  }
  
  /**
   * Estimate memory usage of data
   */
  function _estimateMemoryUsage(data) {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate
    } catch (e) {
      return 0;
    }
  }
  
  /**
   * Check memory and trigger cleanup if needed
   */
  function _manageMemory(dataSize) {
    batchCounter++;
    
    // Periodic garbage collection simulation (release references)
    if (batchCounter % CONFIG.FORCE_GC_INTERVAL === 0) {
      Utilities.sleep(50); // Brief pause for GC
    }
    
    // Check if we need to reduce batch size
    if (dataSize > CONFIG.MEMORY_THRESHOLD * 0.8) {
      console.warn(`BatchProcessor: High memory usage detected (${Math.round(dataSize / 1024 / 1024)}MB)`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Calculate optimal batch size based on data
   */
  function _calculateOptimalBatchSize(data, preferredSize) {
    const dataSize = _estimateMemoryUsage(data);
    let batchSize = preferredSize || CONFIG.DEFAULT_BATCH_SIZE;
    
    // Adjust for memory
    if (dataSize > 0) {
      const avgRowSize = dataSize / data.length;
      const maxRowsByMemory = Math.floor(CONFIG.MEMORY_THRESHOLD / avgRowSize * 0.5);
      batchSize = Math.min(batchSize, maxRowsByMemory);
    }
    
    // Enforce limits
    batchSize = Math.max(CONFIG.MIN_BATCH_SIZE, Math.min(batchSize, CONFIG.MAX_BATCH_SIZE));
    
    return Math.floor(batchSize);
  }
  
  /**
   * Sleep with time limit check
   */
  function _safeSleep(duration) {
    const timeCheck = _checkTimeLimit();
    if (!timeCheck.ok) {
      throw new Error(`BatchProcessor: Approaching time limit (${timeCheck.remaining}ms remaining)`);
    }
    Utilities.sleep(duration);
  }

  // ============================================================================
  // BATCH APPEND OPERATIONS
  // ============================================================================
  
  /**
   * Batch append rows to a sheet (replaces appendRow in loops)
   * @param {Sheet} sheet - Google Sheet object
   * @param {Array[]} rows - Array of row arrays
   * @param {Object} options - Processing options
   * @returns {Object} Result with success count
   */
  function batchAppendRows(sheet, rows, options) {
    const opts = Object.assign({
      batchSize: CONFIG.DEFAULT_BATCH_SIZE,
      onProgress: null,
      continueOnError: true,
      lockSheet: false
    }, options);
    
    if (!sheet || !rows || rows.length === 0) {
      return { success: 0, failed: 0, errors: [] };
    }
    
    executionStartTime = executionStartTime || Date.now();
    
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      batchesProcessed: 0
    };
    
    // Calculate optimal batch size
    const batchSize = _calculateOptimalBatchSize(rows, opts.batchSize);
    const totalRows = rows.length;
    const totalBatches = Math.ceil(totalRows / batchSize);
    
    if (CONFIG.LOG_PROGRESS) {
      console.log(`BatchProcessor: Starting batch append of ${totalRows} rows in ${totalBatches} batches`);
    }
    
    // Process in batches
    for (let i = 0; i < totalRows; i += batchSize) {
      // Check time limit
      const timeCheck = _checkTimeLimit();
      if (!timeCheck.ok) {
        results.errors.push(`Time limit approaching after ${results.success} rows`);
        break;
      }
      
      const batch = rows.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      
      try {
        // Apply batch
        const startRow = sheet.getLastRow() + 1;
        const numRows = batch.length;
        const numCols = Math.max(...batch.map(row => row.length));
        
        if (opts.lockSheet) {
          // Use lock service if requested
          const lock = LockService.getScriptLock();
          try {
            lock.waitLock(30000);
            sheet.getRange(startRow, 1, numRows, numCols).setValues(batch);
            lock.releaseLock();
          } catch (lockError) {
            lock.releaseLock();
            throw lockError;
          }
        } else {
          sheet.getRange(startRow, 1, numRows, numCols).setValues(batch);
        }
        
        results.success += numRows;
        results.batchesProcessed++;
        
        // Progress callback
        if (opts.onProgress) {
          opts.onProgress({
            current: results.success,
            total: totalRows,
            batch: batchNum,
            totalBatches: totalBatches,
            percent: Math.round((results.success / totalRows) * 100)
          });
        }
        
        // Memory management
        _manageMemory(_estimateMemoryUsage(batch));
        
        // Brief pause between batches
        if (i + batchSize < totalRows) {
          _safeSleep(CONFIG.BATCH_DELAY_MS);
        }
        
      } catch (error) {
        results.failed += batch.length;
        results.errors.push(`Batch ${batchNum}: ${error.message}`);
        
        if (!opts.continueOnError) {
          throw error;
        }
        
        console.error(`BatchProcessor: Error in batch ${batchNum}:`, error);
      }
    }
    
    if (CONFIG.LOG_PROGRESS) {
      console.log(`BatchProcessor: Completed. Success: ${results.success}, Failed: ${results.failed}`);
    }
    
    return results;
  }

  // ============================================================================
  // BATCH READ OPERATIONS
  // ============================================================================
  
  /**
   * Read sheet data in batches with memory management
   * @param {Sheet} sheet - Google Sheet object
   * @param {Object} options - Reading options
   * @returns {Array[]} Sheet data
   */
  function batchReadData(sheet, options) {
    const opts = Object.assign({
      batchSize: 1000,
      maxRows: null, // null = all rows
      columns: null, // null = all columns
      onProgress: null,
      useCache: true
    }, options);
    
    if (!sheet) return [];
    
    executionStartTime = executionStartTime || Date.now();
    
    // Get sheet dimensions
    const lastRow = sheet.getLastRow();
    const lastCol = opts.columns || sheet.getLastColumn();
    
    const totalRows = opts.maxRows ? Math.min(lastRow, opts.maxRows) : lastRow;
    
    if (totalRows === 0) return [];
    
    // For small datasets, read all at once
    if (totalRows <= opts.batchSize) {
      return sheet.getRange(1, 1, totalRows, lastCol).getValues();
    }
    
    // Read in batches
    const allData = [];
    const totalBatches = Math.ceil(totalRows / opts.batchSize);
    
    if (CONFIG.LOG_PROGRESS) {
      console.log(`BatchProcessor: Reading ${totalRows} rows in ${totalBatches} batches`);
    }
    
    for (let startRow = 1; startRow <= totalRows; startRow += opts.batchSize) {
      // Check time limit
      const timeCheck = _checkTimeLimit();
      if (!timeCheck.ok) {
        console.warn(`BatchProcessor: Time limit approaching, returning partial data (${allData.length} rows)`);
        break;
      }
      
      const numRows = Math.min(opts.batchSize, totalRows - startRow + 1);
      const batchNum = Math.floor((startRow - 1) / opts.batchSize) + 1;
      
      try {
        const batch = sheet.getRange(startRow, 1, numRows, lastCol).getValues();
        allData.push(...batch);
        
        // Progress callback
        if (opts.onProgress) {
          opts.onProgress({
            current: allData.length,
            total: totalRows,
            batch: batchNum,
            totalBatches: totalBatches,
            percent: Math.round((allData.length / totalRows) * 100)
          });
        }
        
        // Memory management
        _manageMemory(_estimateMemoryUsage(allData));
        
        // Brief pause
        if (startRow + opts.batchSize <= totalRows) {
          _safeSleep(50);
        }
        
      } catch (error) {
        console.error(`BatchProcessor: Error reading batch ${batchNum}:`, error);
        throw error;
      }
    }
    
    return allData;
  }

  // ============================================================================
  // BATCH UPDATE OPERATIONS
  // ============================================================================
  
  /**
   * Batch update specific cells
   * @param {Sheet} sheet - Google Sheet object
   * @param {Array} updates - Array of {row, col, value} objects
   * @param {Object} options - Update options
   * @returns {Object} Update results
   */
  function batchUpdateCells(sheet, updates, options) {
    const opts = Object.assign({
      batchSize: 100,
      onProgress: null
    }, options);
    
    if (!sheet || !updates || updates.length === 0) {
      return { success: 0, failed: 0 };
    }
    
    executionStartTime = executionStartTime || Date.now();
    
    const results = { success: 0, failed: 0 };
    const totalUpdates = updates.length;
    
    // Group updates by contiguous ranges for efficiency
    const ranges = _groupUpdatesByRange(updates);
    
    if (CONFIG.LOG_PROGRESS) {
      console.log(`BatchProcessor: Processing ${totalUpdates} updates in ${ranges.length} ranges`);
    }
    
    // Process ranges
    for (let i = 0; i < ranges.length; i++) {
      const timeCheck = _checkTimeLimit();
      if (!timeCheck.ok) {
        console.warn('BatchProcessor: Time limit approaching during updates');
        break;
      }
      
      const range = ranges[i];
      
      try {
        if (range.isSingleCell) {
          sheet.getRange(range.row, range.col).setValue(range.value);
        } else {
          sheet.getRange(range.row, range.col, range.numRows, range.numCols).setValues(range.values);
        }
        
        results.success += range.cellCount;
        
        if (opts.onProgress) {
          opts.onProgress({
            current: results.success,
            total: totalUpdates,
            percent: Math.round((results.success / totalUpdates) * 100)
          });
        }
        
        // Brief pause
        if (i < ranges.length - 1) {
          _safeSleep(50);
        }
        
      } catch (error) {
        console.error(`BatchProcessor: Error updating range ${i}:`, error);
        results.failed += range.cellCount;
      }
    }
    
    return results;
  }
  
  /**
   * Group individual cell updates into efficient ranges
   */
  function _groupUpdatesByRange(updates) {
    // Sort by row then column
    const sorted = [...updates].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });
    
    const ranges = [];
    let currentRange = null;
    
    sorted.forEach(update => {
      if (!currentRange) {
        currentRange = {
          row: update.row,
          col: update.col,
          values: [[update.value]],
          cellCount: 1,
          isSingleCell: true
        };
      } else if (
        update.row === currentRange.row &&
        update.col === currentRange.col + currentRange.values[0].length
      ) {
        // Extend current row
        currentRange.values[0].push(update.value);
        currentRange.cellCount++;
        currentRange.isSingleCell = false;
      } else {
        // Start new range
        ranges.push(currentRange);
        currentRange = {
          row: update.row,
          col: update.col,
          values: [[update.value]],
          cellCount: 1,
          isSingleCell: true
        };
      }
    });
    
    if (currentRange) {
      ranges.push(currentRange);
    }
    
    return ranges;
  }

  // ============================================================================
  // OPTIMIZED SHEET OPERATIONS
  // ============================================================================
  
  /**
   * Optimized version of getDataRange().getValues()
   * @param {Sheet} sheet - Google Sheet object
   * @param {Object} options - Options
   * @returns {Array[]} Sheet data
   */
  function getDataOptimized(sheet, options) {
    const opts = Object.assign({
      maxRows: null,
      requiredColumns: null,
      useCache: true
    }, options);
    
    if (!sheet) return { data: [], headers: [] };
    
    // Get dimensions
    const lastRow = opts.maxRows ? Math.min(sheet.getLastRow(), opts.maxRows) : sheet.getLastRow();
    const lastCol = opts.requiredColumns ? opts.requiredColumns.length : sheet.getLastColumn();
    
    if (lastRow === 0) {
      return { data: [], headers: [] };
    }
    
    // For small sheets, read all at once
    if (lastRow <= 1000) {
      const allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      return {
        headers: allData[0] || [],
        data: allData.slice(1)
      };
    }
    
    // For large sheets, batch read
    const allData = batchReadData(sheet, {
      batchSize: 1000,
      maxRows: lastRow,
      columns: lastCol
    });
    
    return {
      headers: allData[0] || [],
      data: allData.slice(1)
    };
  }
  
  /**
   * Prepend rows to sheet (insert at top)
   * @param {Sheet} sheet - Google Sheet object
   * @param {Array[]} rows - Rows to prepend
   * @param {Object} options - Options
   * @returns {Object} Results
   */
  function batchPrependRows(sheet, rows, options) {
    const opts = Object.assign({
      batchSize: 100,
      onProgress: null
    }, options);
    
    if (!sheet || !rows || rows.length === 0) {
      return { success: 0, failed: 0 };
    }
    
    executionStartTime = executionStartTime || Date.now();
    
    const results = { success: 0, failed: 0 };
    
    // Insert rows in batches from bottom to top to maintain order
    const batchSize = Math.min(opts.batchSize, rows.length);
    const totalBatches = Math.ceil(rows.length / batchSize);
    
    for (let i = rows.length - batchSize; i >= 0; i -= batchSize) {
      const timeCheck = _checkTimeLimit();
      if (!timeCheck.ok) {
        console.warn('BatchProcessor: Time limit approaching during prepend');
        break;
      }
      
      const batch = rows.slice(i, i + batchSize);
      
      try {
        // Insert rows at position 2 (after header)
        sheet.insertRowsAfter(1, batch.length);
        sheet.getRange(2, 1, batch.length, batch[0].length).setValues(batch);
        
        results.success += batch.length;
        
        if (opts.onProgress) {
          opts.onProgress({
            current: results.success,
            total: rows.length,
            percent: Math.round((results.success / rows.length) * 100)
          });
        }
        
        _safeSleep(100);
        
      } catch (error) {
        console.error('BatchProcessor: Error prepending batch:', error);
        results.failed += batch.length;
      }
    }
    
    return results;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  return {
    
    /**
     * Configure BatchProcessor
     * @param {Object} options - Configuration options
     */
    configure: function(options) {
      Object.assign(CONFIG, options);
    },
    
    /**
     * Batch append rows (replaces appendRow in loops)
     * @param {Sheet} sheet - Sheet to append to
     * @param {Array[]} rows - Rows to append
     * @param {Object} options - Processing options
     * @returns {Object} Results
     */
    appendRows: batchAppendRows,
    
    /**
     * Batch read data with memory management
     * @param {Sheet} sheet - Sheet to read
     * @param {Object} options - Reading options
     * @returns {Array[]} Sheet data
     */
    readData: batchReadData,
    
    /**
     * Batch update cells
     * @param {Sheet} sheet - Sheet to update
     * @param {Array} updates - Update objects
     * @param {Object} options - Update options
     * @returns {Object} Results
     */
    updateCells: batchUpdateCells,
    
    /**
     * Optimized getDataRange replacement
     * @param {Sheet} sheet - Sheet to read
     * @param {Object} options - Options
     * @returns {Object} {headers, data}
     */
    getDataOptimized: getDataOptimized,
    
    /**
     * Batch prepend rows
     * @param {Sheet} sheet - Sheet to prepend to
     * @param {Array[]} rows - Rows to prepend
     * @param {Object} options - Options
     * @returns {Object} Results
     */
    prependRows: batchPrependRows,
    
    /**
     * Process items with batching and progress tracking
     * @param {Array} items - Items to process
     * @param {Function} processor - Processing function
     * @param {Object} options - Processing options
     * @returns {Array} Processed results
     */
    processBatch: function(items, processor, options) {
      const opts = Object.assign({
        batchSize: CONFIG.DEFAULT_BATCH_SIZE,
        onProgress: null,
        continueOnError: true,
        transform: null
      }, options);
      
      if (!items || items.length === 0) return [];
      
      executionStartTime = executionStartTime || Date.now();
      
      const results = [];
      const totalItems = items.length;
      const totalBatches = Math.ceil(totalItems / opts.batchSize);
      
      for (let i = 0; i < totalItems; i += opts.batchSize) {
        const timeCheck = _checkTimeLimit();
        if (!timeCheck.ok) {
          console.warn('BatchProcessor: Time limit approaching during processing');
          break;
        }
        
        const batch = items.slice(i, i + opts.batchSize);
        const batchNum = Math.floor(i / opts.batchSize) + 1;
        
        try {
          const batchResults = batch.map(processor);
          
          if (opts.transform) {
            results.push(...batchResults.map(opts.transform));
          } else {
            results.push(...batchResults);
          }
          
          if (opts.onProgress) {
            opts.onProgress({
              current: results.length,
              total: totalItems,
              batch: batchNum,
              totalBatches: totalBatches,
              percent: Math.round((results.length / totalItems) * 100)
            });
          }
          
          _manageMemory(_estimateMemoryUsage(results));
          
          if (i + opts.batchSize < totalItems) {
            _safeSleep(CONFIG.BATCH_DELAY_MS);
          }
          
        } catch (error) {
          console.error(`BatchProcessor: Error in batch ${batchNum}:`, error);
          if (!opts.continueOnError) {
            throw error;
          }
        }
      }
      
      return results;
    },
    
    /**
     * Reset execution timer
     */
    resetTimer: function() {
      executionStartTime = null;
      batchCounter = 0;
    },
    
    /**
     * Get current execution time
     * @returns {number} Elapsed time in ms
     */
    getExecutionTime: function() {
      return executionStartTime ? Date.now() - executionStartTime : 0;
    },
    
    /**
     * Estimate memory usage of data
     * @param {*} data - Data to estimate
     * @returns {number} Estimated bytes
     */
    estimateMemory: _estimateMemoryUsage
  };
  
})();

// Make available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BatchProcessor;
}
