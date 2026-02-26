/**
 * Account Functions
 * Manages New Account submissions.
 */

/**
 * Creates a new account by appending to the bottom of the Accounts sheet
 * @param {Object} accountData - Account data object
 * @returns {Object} Result with success flag and message
 */
function createNewAccount(accountData) {
  try {
    // Validate required fields
    if (!accountData || !accountData.companyName) {
      return {
        success: false,
        error: 'Company name is required'
      };
    }

    // Build account row from data (schema-aligned)
    var accountRow = {
      'deployed': 'No',
      'timestamp': SharedUtils.formatDate(new Date()),
      'company name': accountData.companyName,
      'contact name': accountData.contactName || '',
      'contact phone': accountData.contactPhone || accountData.phone || '',
      'contact role': accountData.contactRole || accountData.role || '',
      'site location': accountData.siteLocation || accountData.address || '',
      'mailing location': accountData.mailingLocation || accountData.site || accountData.address || '',
      'roll-off fee': accountData.rollOffFee || 'Yes',
      'handling of metal': accountData.handlingOfMetal || 'All together',
      'roll off container size': accountData.rolloffContainerSize || accountData.containerSize || '30 yd',
      'notes': accountData.notes || '',
      'payout price': accountData.payoutPrice || ''
    };

    // Append to Accounts sheet
    appendRowSafe(CONFIG.SHEETS.ACCOUNTS, accountRow);

    console.log('Created new account: ' + accountData.companyName);

    return {
      success: true,
      message: 'Account created successfully',
      accountName: accountData.companyName
    };

  } catch (e) {
    return ErrorHandling.handleError(e, {
      functionName: 'createNewAccount',
      severity: 'HIGH'
    });
  }
}

function processNewAccount(rowIndex) {
  try {
    // Handle missing rowIndex - find first undeployed account
    // FIX: Use SHEET_ACCOUNTS since there's no separate "New Accounts" sheet
    var accountsSheetName = CONFIG.SHEETS.ACCOUNTS || CONFIG.SHEET_NEW_ACCOUNTS || 'Accounts';
    
    if (rowIndex === null || rowIndex === undefined) {
      console.log('No rowIndex provided - finding first undeployed account...');
      var accounts = SharedUtils.getSafeSheetData(accountsSheetName, ['Company name', 'Deployed']);
      if (!accounts || accounts.length === 0) {
        return {
          success: false,
          error: 'No accounts found in Accounts sheet'
        };
      }
      
      // Find first undeployed account
      var undeployed = accounts.find(function(a) { 
        return !a['deployed'] || a['deployed'] === 'No' || a['deployed'] === false;
      });
      
      if (!undeployed) {
        return {
          success: true,
          message: 'All accounts are already deployed'
        };
      }
      
      rowIndex = undeployed._rowIndex;
      console.log('Found undeployed account at row: ' + rowIndex);
    }
    
    // Validate input parameters
    var validationResult = ValidationUtils.validateRange(rowIndex, 1, 10000, 'rowIndex');
    if (!validationResult.success) {
      throw new Error(validationResult.error);
    }

    // FIX: Use ColumnMapper for consistent column access with fallback sheet name
    var companyNameIndex = ColumnMapper.getColumnIndex(accountsSheetName, 'Company name');
    var deployedIndex = ColumnMapper.getColumnIndex(accountsSheetName, 'Deployed');
    var rollOffFeeIndex = ColumnMapper.getColumnIndex(accountsSheetName, 'Roll-Off Fee');
    var payoutPriceIndex = ColumnMapper.getColumnIndex(accountsSheetName, 'Payout Price');

    if (companyNameIndex === null || deployedIndex === null) {
      throw new Error('Required columns not found in Accounts sheet');
    }

    // Get account data using Safe-Fetch pattern
    var accounts = SharedUtils.getSafeSheetData(accountsSheetName, ['Company name', 'Deployed', 'Roll-Off Fee', 'Payout Price']);
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts data available');
    }

    var account = accounts.find(function(a) { return a._rowIndex === rowIndex; });

    if (!account) {
      throw new Error('Account not found at row index: ' + rowIndex);
    }

    // Use ColumnMapper indices for consistent access
    var companyName = account['company name'];
    
    if (!ValidationUtils.isNotEmpty(companyName)) {
      throw new Error('Company name is required for account deployment');
    }

    var deployed = account['deployed'];
    
    if (deployed === true || ValidationUtils.normalizeString(deployed) === 'true') {
      console.log('Account already processed: ' + companyName);
      return { success: true, message: 'Account already processed' };
    }

    // Validate inventory operations using ColumnMapper indices
    if (rollOffFeeIndex !== null && account['roll-off fee'] !== undefined && account['roll-off fee'] !== null) {
      var rollOffFeeValidation = ValidationUtils.validateInventoryOperation(account['roll-off fee'], 'Roll-Off Fee');
      if (!rollOffFeeValidation.success) {
        throw new Error(rollOffFeeValidation.error);
      }
    }

    if (payoutPriceIndex !== null && account['payout price'] !== undefined && account['payout price'] !== null) {
      var payoutPriceValidation = ValidationUtils.validateInventoryOperation(account['payout price'], 'Payout Price');
      if (!payoutPriceValidation.success) {
        throw new Error(payoutPriceValidation.error);
      }
    }

    // Logic to deploy bin or set up service
    console.log('Deploying account: ' + companyName);

    // Use error handling wrapper for the update operation
    var updateResult = ErrorHandling.withErrorHandling(function() {
      return updateCellSafe(accountsSheetName, rowIndex, 'Deployed', true);
    }, {
      functionName: 'processNewAccount',
      accountName: companyName,
      rowIndex: rowIndex
    });

    if (!updateResult.success) {
      throw new Error('Failed to update account status: ' + updateResult.error);
    }

    return {
      success: true,
      message: 'Account deployed successfully',
      accountName: companyName
    };

  } catch (e) {
    return ErrorHandling.handleError(e, {
      functionName: 'processNewAccount',
      rowIndex: rowIndex,
      severity: 'HIGH'
    });
  }
}

function checkNewAccounts() {
  try {
    // Validate that we can access the spreadsheet
    var accessResult = SharedUtils.checkSpreadsheetAccess('checkNewAccounts');
    if (!accessResult.success) {
      throw new Error(accessResult.error);
    }

    var ss = accessResult.spreadsheet;

    // FIX: Use SHEET_ACCOUNTS since there's no separate "New Accounts" sheet
    var accountsSheetName = CONFIG.SHEETS.ACCOUNTS || CONFIG.SHEET_NEW_ACCOUNTS || 'Accounts';
    
    // FIX: getSafeSheetData returns [] on error, not an error object
    // So we call it directly without ErrorHandling wrapper
    var accounts = SharedUtils.getSafeSheetData(accountsSheetName, ['Deployed', 'Company name']);
    
    // Handle undefined/null return from getSafeSheetData
    if (accounts === null || accounts === undefined) {
      console.warn('getSafeSheetData returned null/undefined - treating as empty array');
      accounts = [];
    }
    
    // Check if we got a valid array
    if (!Array.isArray(accounts)) {
      throw new Error('getSafeSheetData did not return an array');
    }
    var processedCount = 0;
    var errorCount = 0;
    var errors = [];

    // Process each account with error handling
    accounts.forEach(function(acc) {
      try {
        if (!acc['deployed']) {
          var result = processNewAccount(acc._rowIndex);
          if (result.success) {
            processedCount++;
          } else {
            errorCount++;
            errors.push({
              rowIndex: acc._rowIndex,
              companyName: acc['company name'] || 'unknown',
              error: result.error
            });
          }
        }
      } catch (e) {
        errorCount++;
        errors.push({
          rowIndex: acc._rowIndex,
          companyName: acc['company name'] || 'unknown',
          error: e.message
        });
        console.error('Error processing account at row ' + acc._rowIndex + ': ' + e.message);
      }
    });

    // Log summary
    console.log('Account processing completed. Processed: ' + processedCount + ', Errors: ' + errorCount);

    // Log errors to system log if any
    if (errorCount > 0) {
      try {
        var opsLogSheet = ss.getSheetByName(CONFIG.SHEETS.SYSTEM_LOG);
        if (opsLogSheet) {
          errors.forEach(function(error) {
            // Use enhanced date validation
            var currentDate = ValidationUtils.createDateSafely(new Date());
            if (currentDate) {
              opsLogSheet.appendRow([
                currentDate,
                'checkNewAccounts',
                'ERROR',
                'Failed to process account: ' + error.companyName,
                'Row: ' + error.rowIndex + ', Error: ' + error.error
              ]);
            } else {
              console.error('Invalid date when trying to log to Ops Log');
            }
          });
        }
      } catch (logError) {
        console.warn('Could not log errors to system log: ' + logError.message);
      }
    }

    return {
      success: true,
      processed: processedCount,
      errors: errorCount,
      errorDetails: errors
    };

  } catch (e) {
    return ErrorHandling.handleError(e, {
      functionName: 'checkNewAccounts',
      severity: 'CRITICAL'
    });
  }
}
