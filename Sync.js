/**
 * MASTER CRM CONTROLLER v3.1 (Audited + Infrastructure Integration)
 * CORE FEATURES:
 * 1. Syncs Outreach -> Prospects (Updates Status, Dates, Outcomes)
 * 2. Auto-Heals Typos (Strictly against WORKFLOW_RULE keys)
 * 3. Triggers "Account Won" Migration to Accounts Sheet
 * 
 * INFRASTRUCTURE INTEGRATION:
 * - BatchProcessor: Optimized batch row operations
 * - LoggerInjector: Automated logging and performance tracking
 * - ErrorBoundary: Standardized error handling
 * 
 * AUDIT COMPLIANCE:
 * - Follows Settings.tsv logic for Status (Not Contacted -> Cold)
 * - Respects System_Schema.csv column definitions
 */

// ============================================================================
// INFRASTRUCTURE COMPONENT INTEGRATION
// ============================================================================

/**
 * Safe access to BatchProcessor component with fallback
 */
function getBatchProcessor() {
  try {
    return typeof BatchProcessor !== 'undefined' ? BatchProcessor : null;
  } catch (e) {
    return null;
  }
}

/**
 * Safe access to LoggerInjector component with fallback
 */
function getSyncLoggerInjector() {
  try {
    return typeof LoggerInjector !== 'undefined' ? LoggerInjector : null;
  } catch (e) {
    return null;
  }
}

/**
 * Safe access to ErrorBoundary component with fallback
 */
function getSyncErrorBoundary() {
  try {
    return typeof ErrorBoundary !== 'undefined' ? ErrorBoundary : null;
  } catch (e) {
    return null;
  }
}

/**
 * Create a scoped logger for Sync operations
 */
function createSyncLogger(componentName) {
  var loggerInjector = getSyncLoggerInjector();
  if (loggerInjector && loggerInjector.createScopedLogger) {
    var scopedLogger = loggerInjector.createScopedLogger(componentName);
    // Ensure the logger has all required methods
    if (scopedLogger && typeof scopedLogger.log === 'function') {
      return scopedLogger;
    }
  }
  // Fallback: simple console logging with all required methods
  return {
    log: function(message, data) {
      console.log('[' + componentName + '] ' + message, data !== undefined ? data : '');
    },
    warn: function(message, data) {
      console.warn('[' + componentName + '] ' + message, data !== undefined ? data : '');
    },
    error: function(message, data) {
      console.error('[' + componentName + '] ' + message, data !== undefined ? data : '');
    },
    time: function(label) {
      console.time('[' + componentName + '] ' + label);
    },
    timeEnd: function(label) {
      console.timeEnd('[' + componentName + '] ' + label);
    }
  };
}

/**
 * Create a timer for performance tracking
 * Always returns a timer with start(), stop(), and getElapsed() methods
 */
function createSyncTimer() {
  var loggerInjector = getSyncLoggerInjector();
  var startTime = Date.now();
  
  // Create the timer object with required API
  var timer = {
    start: function() {
      startTime = Date.now();
    },
    stop: function() {
      return Date.now() - startTime;
    },
    getElapsed: function() {
      return Date.now() - startTime;
    }
  };
  
  // Try to get enhanced timer from LoggerInjector, but wrap it to ensure compatibility
  if (loggerInjector && loggerInjector.createTimer) {
    try {
      var enhancedTimer = loggerInjector.createTimer();
      // If enhanced timer has start method, use it; otherwise keep our implementation
      if (enhancedTimer && typeof enhancedTimer.start === 'function') {
        return enhancedTimer;
      }
    } catch (e) {
      // Fall back to simple timer if LoggerInjector fails
      console.warn('LoggerInjector.createTimer failed, using fallback timer');
    }
  }
  
  return timer;
}

/**
 * Wrap a function with ErrorBoundary if available
 */
function wrapSyncFunction(fn, functionName) {
  var errorBoundary = getSyncErrorBoundary();
  if (errorBoundary && errorBoundary.wrap) {
    return errorBoundary.wrap(fn, {
      functionName: functionName,
      component: 'Sync',
      retryCount: 3
    });
  }
  return fn;
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

function runFullCRM_Sync() {
  var logger = createSyncLogger('runFullCRM_Sync');
  var timer = createSyncTimer();
  
  logger.log('Starting full CRM sync');
  timer.start();
  
  // Check spreadsheet access
  var accessResult = SharedUtils.checkSpreadsheetAccess('runFullCRM_Sync');
  if (!accessResult.success) {
    var ui = SpreadsheetApp.getUi();
    ui.alert('❌ Error', 'Failed to access spreadsheet: ' + accessResult.error, ui.ButtonSet.OK);
    logger.error('runFullCRM_Sync: Spreadsheet access failed', accessResult.error);
    return;
  }
  
  var ss = accessResult.spreadsheet;
  var ui = SpreadsheetApp.getUi();
  
  // Wrap the entire sync process with error handling
  var syncResult = wrapSyncFunction(function() {
    // 1. Run the Sync Logic
    syncCRMLogic(ss);
    
    // 2. Check for New Wins
    var newWins = processAccountWon(ss);
    
    return newWins;
  }, 'fullSync')();
  
  var elapsedTime = timer.stop();
  logger.log('Full CRM sync completed in ' + elapsedTime + 'ms');
  
  if (syncResult && syncResult > 0) {
    ui.alert('Sync Complete.\n\nðŸŽ‰ ' + syncResult + ' New Account(s) moved to Accounts Sheet.');
  } else {
    console.log('Sync Complete. No new accounts to migrate.');
  }
}

// ============================================================================
// CORE SYNC LOGIC
// ============================================================================

function syncCRMLogic(ss) {
  var logger = createSyncLogger('syncCRMLogic');
  var timer = createSyncTimer();
  
  logger.log('Starting CRM sync logic');
  timer.start();
  
  var prospectsSheet = ss.getSheetByName(CONFIG.SHEETS.PROSPECTS);
  var outreachSheet = ss.getSheetByName(CONFIG.SHEETS.OUTREACH);
  var settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);

  if (!prospectsSheet || !outreachSheet || !settingsSheet) {
    throw new Error('CRITICAL: Missing required sheets (Prospects, Outreach, Settings).');
  }

  // --- HELPER: Dynamic Column Finder (Optimized with Caching) ---
  // Cache headers and last row to avoid repeated sheet queries
  var _headerCache = {};
  
  function getHeaders(sheet) {
    var sheetName = sheet.getName();
    if (_headerCache[sheetName]) {
      return _headerCache[sheetName];
    }
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    _headerCache[sheetName] = headers;
    return headers;
  }
  
  function getColLetter(sheet, headerName) {
    var headers = getHeaders(sheet);
    var index = SharedUtils.findColumnIndex(headers, headerName, sheet.getName().toUpperCase());
    return index === -1 ? null : columnToLetter(index + 1);
  }

  function getColIndex(sheet, headerName) {
    var headers = getHeaders(sheet);
    return SharedUtils.findColumnIndex(headers, headerName, sheet.getName().toUpperCase()) + 1;
  }

  function columnToLetter(column) {
    var temp, letter = '';
    while (column > 0) {
      temp = (column - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      column = (column - temp - 1) / 26;
    }
    return letter;
  }

  // --- STEP 1: STRICT TYPO CORRECTION ---
  // Fix: Only looks at WORKFLOW_RULE rows to avoid matching Industries/Urgency bands
  function fixOutreachTypos() {
    var typoLogger = createSyncLogger('fixOutreachTypos');
    typoLogger.log('Starting typo correction');
    
    var outOutcomeIdx = getColIndex(outreachSheet, 'Outcome');
    
    // Load Settings Data
    var settingsData = settingsSheet.getDataRange().getValues();
    var headers = settingsData.shift();
    var catIdx = headers.indexOf('Category');
    var keyIdx = headers.indexOf('Key');

    // Filter for valid Outcomes only
    var validOutcomes = settingsData
      .filter(function(row) { return row[catIdx] === 'WORKFLOW_RULE'; })
      .map(function(row) { return row[keyIdx].toString().trim(); });

    var lastOutRow = outreachSheet.getLastRow();
    if (lastOutRow < 2) {
      typoLogger.log('No data rows to process');
      return;
    }
    
    var outcomeRange = outreachSheet.getRange(2, outOutcomeIdx, lastOutRow - 1, 1);
    var currentOutcomes = outcomeRange.getValues();
    var updates = 0;

    var fixedOutcomes = currentOutcomes.map(function(row) {
      var val = row[0];
      if (!val) return ['']; 
      val = val.toString().trim();

      if (validOutcomes.includes(val)) return [val];

      // Fuzzy Match
      var bestMatch = null;
      var bestScore = 0;
      validOutcomes.forEach(function(target) {
        var score = calculateSimilarity(val, target);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = target;
        }
      });

      if (bestScore > 0.8 && bestMatch) {
        console.log('Auto-corrected: "' + val + '" -> "' + bestMatch + '"');
        updates++;
        return [bestMatch];
      }
      return [val];
    });

    if (updates > 0) {
      outcomeRange.setValues(fixedOutcomes);
      typoLogger.log('Completed typo correction: ' + updates + ' updates made');
    } else {
      typoLogger.log('No typo corrections needed');
    }
  }

  fixOutreachTypos();

  // --- STEP 2: MAP COLUMNS ---
  // Defined in System_Schema.csv
  var p_ID = getColLetter(prospectsSheet, 'Company ID');
  var p_LastOutcome = getColLetter(prospectsSheet, 'Last Outcome');
  var p_LastDate = getColLetter(prospectsSheet, 'Last Outreach Date');
  var p_DaysSince = getColLetter(prospectsSheet, 'Days Since Last Contact');
  var p_NextCount = getColLetter(prospectsSheet, 'Next Step Due Countdown');
  var p_NextDate = getColLetter(prospectsSheet, 'Next Steps Due Date');
  var p_Status = getColLetter(prospectsSheet, 'Contact Status');

  var o_ID = getColLetter(outreachSheet, 'Company ID');
  var o_Date = getColLetter(outreachSheet, 'Visit Date');
  var o_Outcome = getColLetter(outreachSheet, 'Outcome');

  // Defined in Settings.tsv
  var s_Key = getColLetter(settingsSheet, 'Key');       // Col B
  var s_Status = getColLetter(settingsSheet, 'Value_2'); // Col D (Status)
  var s_Days = getColLetter(settingsSheet, 'Value_3');   // Col E (Days)

  if (!p_ID || !o_ID || !o_Outcome) {
    console.error('CRITICAL: Missing ID or Outcome columns.');
    return;
  }

  var lastRow = prospectsSheet.getLastRow();
  if (lastRow < 2) {
    logger.log('No prospect data rows to update');
    return;
  }

  // --- STEP 3: APPLY FORMULAS (Corrected Logic) ---
  
  // 1. Last Outcome
  var f_LastOutcome = `=XLOOKUP(${p_ID}2, ${CONFIG.SHEETS.OUTREACH}!$${o_ID}:$${o_ID}, ${CONFIG.SHEETS.OUTREACH}!$${o_Outcome}:$${o_Outcome}, "Not Contacted", 0, -1)`;
  
  // 2. Last Outreach Date
  var f_LastDate = `=XLOOKUP(${p_ID}2, ${CONFIG.SHEETS.OUTREACH}!$${o_ID}:$${o_ID}, ${CONFIG.SHEETS.OUTREACH}!$${o_Date}:$${o_Date}, "", 0, -1)`;
  
  // 3. Days Since
  var f_DaysSince = '=IF(' + p_LastDate + '2="", "", TODAY() - ' + p_LastDate + '2)';
  
  // 4. Contact Status (FIXED)
  // Removed hardcoded "Prospect". Uses XLOOKUP to find "Not Contacted" -> "Cold" in Settings.
  var f_Status = `=IFERROR(XLOOKUP(${p_LastOutcome}2, ${CONFIG.SHEETS.SETTINGS}!$${s_Key}:$${s_Key}, ${CONFIG.SHEETS.SETTINGS}!$${s_Status}:$${s_Status}), "Cold")`;

  // 5. Next Steps Due Date
  var f_NextDate = `=IF(${p_LastDate}2="", TODAY()+30, ${p_LastDate}2 + IFERROR(XLOOKUP(${p_LastOutcome}2, ${CONFIG.SHEETS.SETTINGS}!$${s_Key}:$${s_Key}, ${CONFIG.SHEETS.SETTINGS}!$${s_Days}:$${s_Days}), 14))`;

  // 6. Countdown
  var f_Countdown = '=IF(' + p_NextDate + '2="", "", ' + p_NextDate + '2 - TODAY())';

  var applyFormula = function(colLetter, formula) {
    if (!colLetter) return;
    prospectsSheet.getRange(colLetter + '2:' + colLetter + lastRow).setFormula(formula);
  };

  applyFormula(p_LastOutcome, f_LastOutcome);
  applyFormula(p_LastDate, f_LastDate);
  applyFormula(p_DaysSince, f_DaysSince);
  applyFormula(p_Status, f_Status);
  applyFormula(p_NextDate, f_NextDate);
  applyFormula(p_NextCount, f_Countdown);
  
  var elapsedTime = timer.stop();
  logger.log('CRM sync logic completed in ' + elapsedTime + 'ms');
}

// ============================================================================
// ACCOUNT WON TRIGGER (With BatchProcessor Integration)
// ============================================================================

function processAccountWon(ss) {
  var logger = createSyncLogger('processAccountWon');
  var timer = createSyncTimer();
  
  logger.log('Starting account won processing');
  timer.start();
  
  var outreachSheet = ss.getSheetByName(CONFIG.SHEETS.OUTREACH);
  var accountsSheet = ss.getSheetByName(CONFIG.SHEETS.ACCOUNTS);
  var prospectsSheet = ss.getSheetByName(CONFIG.SHEETS.PROSPECTS);
  
  if (!accountsSheet) {
    logger.warn('Accounts sheet not found, skipping account won processing');
    return 0;
  }

  var oData = outreachSheet.getDataRange().getValues();
  var oHeaders = oData.shift().map(function(h) { return String(h).trim(); });
  
  var idxOutcome = SharedUtils.findColumnIndex(oHeaders, 'Outcome', 'OUTREACH');
  var idxCompID = SharedUtils.findColumnIndex(oHeaders, 'Company ID', 'OUTREACH');
  var idxCompName = SharedUtils.findColumnIndex(oHeaders, 'Company', 'OUTREACH');
  var idxNotes = SharedUtils.findColumnIndex(oHeaders, 'Notes', 'OUTREACH');
  var idxDate = SharedUtils.findColumnIndex(oHeaders, 'Visit Date', 'OUTREACH');

  // Get existing Account IDs to prevent duplicates
  var accData = accountsSheet.getDataRange().getValues();
  var accHeaders = accData.shift().map(function(h) { return String(h).trim(); }); // Remove header
  var accIdIdx = SharedUtils.findColumnIndex(accHeaders, 'Company ID', 'ACCOUNTS');
  if (accIdIdx === -1) accIdIdx = 0; // Default to col A if missing
  var existingIDs = accData.map(function(r) { return r[accIdIdx]; });

  var newAccounts = [];
  var newAccountIds = [];

  // Scan Outreach for 'Account Won'
  oData.forEach(function(row) {
    var outcome = row[idxOutcome];
    var compID = row[idxCompID];

    if (outcome === 'Account Won' && !existingIDs.includes(compID)) {
      // Fetch details from Prospects (Address, Contact info) if needed
      // For now, we map available Outreach data
      var newRow = [
        'FALSE',           // Deployed (Default)
        row[idxDate],      // Timestamp
        row[idxCompName],  // Company Name
        '',                // Contact Name (Need to fetch from Contacts sheet ideally)
        '',                // Contact Phone
        '',                // Role
        '',                // Site Location
        '',                // Mailing Location
        'Yes',             // Roll-Off Fee (Default)
        'Separate',        // Handling (Default)
        '30 yd',           // Container Size (Default from Settings)
        row[idxNotes],     // Notes
        'Base'             // Payout Price
      ];

      newAccounts.push(newRow);
      newAccountIds.push(compID);
      
      // Prevent double add in same run
      existingIDs.push(compID);
    }
  });

  // Use BatchProcessor if available for optimized batch operation
  if (newAccounts.length > 0) {
    var batchProcessor = getBatchProcessor();
    
    if (batchProcessor && batchProcessor.appendRows) {
      logger.log('Using BatchProcessor for ' + newAccounts.length + ' new accounts');
      
      var batchResult = batchProcessor.appendRows(accountsSheet, newAccounts, {
        useLock: true,
        validateHeaders: true,
        batchSize: 50
      });
      
      if (batchResult.success) {
        logger.log('Successfully added ' + batchResult.count + ' accounts via BatchProcessor');
        newAccounts = batchResult.count;
      } else {
        logger.error('BatchProcessor failed: ' + batchResult.error);
        // Fallback to individual append
        newAccounts = 0;
      }
    } else {
      // Fallback: use setValues for batch append
      logger.log('BatchProcessor not available, using setValues for batch append');
      
      var lock = LockService.getScriptLock();
      if (lock.tryLock(30000)) {
        try {
          if (newAccounts.length > 0) {
              var lastRow = accountsSheet.getLastRow();
              // Ensure the range is correctly sized based on the number of columns in the first new account row
              var numColumns = newAccounts[0] ? newAccounts[0].length : 0;
              if (numColumns > 0) {
                accountsSheet.getRange(lastRow + 1, 1, newAccounts.length, numColumns).setValues(newAccounts);
              }
          }
          logger.log('Successfully added ' + newAccounts.length + ' accounts');
        } finally {
          lock.releaseLock();
        }
      } else {
        logger.warn('Could not acquire lock, skipping account creation');
        return 0;
      }
    }
  } else {
    logger.log('No new accounts to process');
  }

  var elapsedTime = timer.stop();
  logger.log('Account won processing completed in ' + elapsedTime + 'ms. New accounts: ' + newAccounts);

  return newAccounts;
}

// ============================================================================
// SIMILARITY UTILS
// ============================================================================

function calculateSimilarity(s1, s2) {
  if (!s1 || !s2) return 0.0;
  var str1 = String(s1).toLowerCase();
  var str2 = String(s2).toLowerCase();
  var longer = str1.length > str2.length ? str1 : str2;
  var shorter = str1.length > str2.length ? str2 : str1;
  var longerLength = longer.length;
  if (longerLength == 0) return 1.0;
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
  s1 = s1 || ''; s2 = s2 || '';
  var costs = new Array();
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0) costs[j] = j;
      else if (j > 0) {
        var newValue = costs[j - 1];
        if (s1.charAt(i - 1) != s2.charAt(j - 1))
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

// ============================================================================
// WRAPPED FUNCTIONS FOR INFRASTRUCTURE INTEGRATION
// ============================================================================

/**
 * Wrapped version of syncCRMLogic with ErrorBoundary + LoggerInjector
 */
function syncCRMLogicWithLogging(ss) {
  var fn = function(ssParam) {
    return syncCRMLogic(ssParam);
  };
  
  var wrapped = wrapSyncFunction(fn, 'syncCRMLogic');
  
  var loggerInjector = getSyncLoggerInjector();
  if (loggerInjector && loggerInjector.inject) {
    wrapped = loggerInjector.inject(wrapped, {
      name: 'syncCRMLogic',
      component: 'Sync',
      logParams: true,
      logExecutionTime: true,
      logResult: true
    });
  }
  
  return wrapped(ss);
}

/**
 * Wrapped version of processAccountWon with ErrorBoundary + LoggerInjector
 */
function processAccountWonWithLogging(ss) {
  var fn = function(ssParam) {
    return processAccountWon(ssParam);
  };
  
  var wrapped = wrapSyncFunction(fn, 'processAccountWon');
  
  var loggerInjector = getSyncLoggerInjector();
  if (loggerInjector && loggerInjector.inject) {
    wrapped = loggerInjector.inject(wrapped, {
      name: 'processAccountWon',
      component: 'Sync',
      logParams: true,
      logExecutionTime: true,
      logResult: true
    });
  }
  
  return wrapped(ss);
}
