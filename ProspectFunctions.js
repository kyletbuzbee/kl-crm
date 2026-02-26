/**
 * Prospect Functions
 * Handles Searching, Retrieval, and Updates for Prospects.
 */

// Create ProspectFunctions namespace object
var ProspectFunctions = {
  searchProspectsByName: searchProspectsByName,
  getCompanyDetailsForAutofill: getCompanyDetailsForAutofill,
  fetchLastTouchInfo: fetchLastTouchInfo,
  updateProspectAfterVisit: updateProspectAfterVisit,
  updateExistingProspectWithWriteBackRules: updateExistingProspectWithWriteBackRules,
  calculateNextBusinessDay: calculateNextBusinessDay,
  checkStaleProspects: checkStaleProspects,
  createStaleProspectTrigger: createStaleProspectTrigger,
  getCompanyNamesForAutocomplete: getCompanyNamesForAutocomplete
};

/**
 * Fetches all company names for sidebar autocomplete
 * @return {Array} Array of company names
 */
function getCompanyNamesForAutocomplete() {
  try {
    var prospectsResult = ErrorHandling.withErrorHandling(function() {
      return SharedUtils.getSafeSheetData(CONFIG.SHEETS.PROSPECTS, ['Company Name']);
    }, {
      functionName: 'getCompanyNamesForAutocomplete'
    });

    if (!prospectsResult.success) {
      console.error('Failed to fetch company names:', prospectsResult.error);
      return [];
    }

    var prospects = prospectsResult.data || [];
    return prospects.map(function(p) { 
      return p['company name']; 
    }).filter(Boolean);

  } catch (e) {
    console.error('Failed to fetch company names:', e);
    return [];
  }
}

/**
 * Searches Prospects sheet by Company Name.
 * Used by Dashboard Autocomplete.
 */
function searchProspectsByName(query) {
  try {
    // Validate input
    if (!query || query.length < 2) {
      return [];
    }

    // Use string utilities for safe operations
    var normalizedQuery = StringUtils.normalize(query);
    if (normalizedQuery.length < 2) {
      return [];
    }

    // Get prospect data with error handling
    var prospectsResult = ErrorHandling.withErrorHandling(function() {
      return SharedUtils.getSafeSheetData(CONFIG.SHEETS.PROSPECTS, ['Company Name', 'Company ID', 'Address', 'Zip Code', 'Industry', 'Last Outcome']);
    }, {
      functionName: 'searchProspectsByName',
      query: query
    });

    if (!prospectsResult.success) {
      console.warn('Search failed: ' + prospectsResult.error);
      return [];
    }

    var prospects = prospectsResult.data || [];

    // Filter matches using string utilities
    var matches = prospects.filter(function(p) {
      try {
        var name = StringUtils.normalize(p['company name'] || '');
        return name.includes(normalizedQuery);
      } catch (filterError) {
        console.warn('Error filtering prospect: ' + filterError.message);
        return false;
      }
    });

    // Format for Dashboard
    var results = matches.map(function(p) {
      return {
        companyName: p['company name'] || '',
        companyId: p['company id'] || '',
        address: p['address'] || '',
        city: p['city'] || '',
        state: p['state'] || '',
        zip: p['zip code'] || '',
        industry: p['industry'] || '',
        phone: '', // Phone is often in New Accounts or Notes, defaulting empty here to be safe
        contactName: '',
        email: '',
        lastActivity: p['last activity type'] || ''
      };
    }).slice(0, 10); // Limit to 10 results

    return results;

  } catch (e) {
    return ErrorHandling.handleError(e, {
      functionName: 'searchProspectsByName',
      query: query,
      severity: 'LOW'
    });
  }
}

/**
 * Enhanced search function that provides comprehensive company data for autofill
 * Used by the dashboard to get full company information when a company is selected
 */
function getCompanyDetailsForAutofill(companyId) {
  try {
    if (!companyId) {
      return { success: false, error: 'Company ID is required' };
    }

    // Get prospect data with comprehensive field mapping
    var prospectsResult = ErrorHandling.withErrorHandling(function() {
      return SharedUtils.getSafeSheetData(CONFIG.SHEETS.PROSPECTS, [
        'Company ID', 'Company Name', 'Address', 'City', 'State', 'Zip Code', 
        'Industry', 'Last Outcome', 'Contact Status'
      ]);
    }, {
      functionName: 'getCompanyDetailsForAutofill',
      companyId: companyId
    });

    if (!prospectsResult.success) {
      return { success: false, error: 'Failed to retrieve company data: ' + prospectsResult.error };
    }

    var prospects = prospectsResult.data || [];
    
    // Find the matching company
    var companyData = prospects.find(function(p) {
      return p['company id'] === companyId;
    });

    if (!companyData) {
      return { success: false, error: 'Company not found in prospects' };
    }

    // Format the data for autofill
    var result = {
      success: true,
      data: {
        companyName: companyData['Company Name'] || companyData['company name'] || '',
        companyId: companyData['Company ID'] || companyData['company id'] || '',
        address: companyData['Address'] || companyData['address'] || '',
        city: companyData['City'] || companyData['city'] || '',
        state: companyData['State'] || companyData['state'] || '',
        zip: companyData['Zip Code'] || companyData['zip code'] || '',
        industry: companyData['Industry'] || companyData['industry'] || '',
        lastOutcome: companyData['Last Outcome'] || companyData['last outcome'] || '',
        contactStatus: companyData['Contact Status'] || companyData['contact status'] || ''
      },
      rowIndex: companyData._rowIndex // Passed to the dashboard for updates
    };

    return result;

  } catch (e) {
    return ErrorHandling.handleError(e, {
      functionName: 'getCompanyDetailsForAutofill',
      companyId: companyId,
      severity: 'MEDIUM'
    });
  }
}

/**
 * Fetches "Last Touch" info for the dashboard card.
 */
function fetchLastTouchInfo(companyName) {
  try {
    // Validate input using string utilities
    if (!ValidationUtils.isNotEmpty(companyName)) {
      return { success: false, message: 'No name provided' };
    }

    // Get prospect data with error handling
    var prospectsResult = ErrorHandling.withErrorHandling(function() {
      return SharedUtils.getSafeSheetData(CONFIG.SHEETS.PROSPECTS, ['Company Name', 'Last Outreach Date', 'Last Outcome', 'Days Since Last Contact']);
    }, {
      functionName: 'fetchLastTouchInfo',
      companyName: companyName
    });

    if (!prospectsResult.success) {
      console.warn('Failed to fetch prospect data: ' + prospectsResult.error);
      return { success: false, message: 'Failed to fetch prospect data' };
    }

    var prospects = prospectsResult.data || [];
    var normalizedCompanyName = StringUtils.normalize(companyName);

    // Find matching prospect using string utilities
    var target = prospects.find(function(p) {
      try {
        var pName = p['Company Name'] || p['company name'];
        return StringUtils.equals(pName, companyName);
      } catch (findError) {
        console.warn('Error comparing company names: ' + findError.message);
        return false;
      }
    });

    if (target) {
      // Format date using ValidationUtils
      var lastContactValue = target['Last Outreach Date'] || target['last outreach date'];
      var lastContactDate = lastContactValue ? formatDate(lastContactValue) : 'Never';

      return {
        success: true,
        data: {
          lastContact: lastContactDate,
          daysSince: target['Days Since Last Contact'] || target['days since last contact'] || 0,
          lastOutcome: target['Last Outcome'] || target['last outcome'] || 'None',
          nextSteps: target['Contact Status'] || target['contact status'] || 'None'
        }
      };
    }

    return { success: true, data: { lastContact: 'New', daysSince: 0, lastOutcome: 'None' } };

  } catch (e) {
    return ErrorHandling.handleError(e, {
      functionName: 'fetchLastTouchInfo',
      companyName: companyName,
      severity: 'LOW'
    });
  }
}

/**
 * Updates Prospect Status and Timestamp with intelligent write-back rules.
 * Automatically sets Contact Status and Next Steps Due Date based on outcome.
 * Uses fuzzy matching to handle company name/ID differences between Outreach and Prospects sheets.
 */
function updateProspectAfterVisit(companyId, companyName, outcome, status, activityType) {
  try {
    // Validate input parameters - Log the received values for debugging
    console.log('updateProspectAfterVisit called with:', { companyId: companyId, companyName: companyName, outcome: outcome, status: status, activityType: activityType });
    
    // Check for null, undefined, or empty string values
    var hasCompanyId = companyId !== null && companyId !== undefined && companyId.toString().trim() !== '';
    var hasCompanyName = companyName !== null && companyName !== undefined && companyName.toString().trim() !== '';
    
    if (!hasCompanyId && !hasCompanyName) {
      console.error('updateProspectAfterVisit: Both companyId and companyName are missing or empty');
      throw new Error('Either companyId or companyName must be provided');
    }
    
    // Trim values if they exist
    if (hasCompanyId) companyId = companyId.toString().trim();
    if (hasCompanyName) companyName = companyName.toString().trim();

    // Get all prospects for fuzzy matching
    var prospectsResult = ErrorHandling.withErrorHandling(function() {
      return SharedUtils.getSafeSheetData(CONFIG.SHEETS.PROSPECTS, [
        'Company ID', 'Company Name', 'Contact Status', 'Last Outcome', 
        'Last Outreach Date', 'Days Since Last Contact', 'Next Steps Due Date'
      ]);
    }, {
      functionName: 'updateProspectAfterVisit',
      companyId: companyId,
      companyName: companyName
    });

    if (!prospectsResult.success) {
      throw new Error('Failed to retrieve prospect data: ' + prospectsResult.error);
    }

    var prospects = prospectsResult.data || [];
    
    // Use fuzzy matching to find prospect
    var outreachData = {
      companyId: companyId,
      companyName: companyName
    };
    
    var matchResult = fuzzyMatchCompany(outreachData, prospects);
    
    var target = null;
    if (matchResult.match) {
      target = matchResult.match;
      console.log('Found prospect match: ' + matchResult.matchType + ' (confidence: ' + matchResult.confidence + ')');
    } else {
      console.log('No prospect match found, will create new prospect');
    }

    if (target) {
      // Update existing prospect with write-back rules
      var updateResult = updateExistingProspectWithWriteBackRules(target._rowIndex, outcome, status, activityType);
      return {
        success: true,
        action: 'updated',
        matchType: matchResult.matchType,
        confidence: matchResult.confidence,
        rowIndex: target._rowIndex,
        companyName: target['Company Name'] || target['company name']
      };
    } else {
      // Create new prospect if it doesn't exist
      createNewProspect(companyId, companyName, outcome, status, activityType);
      return {
        success: true,
        action: 'created',
        companyId: companyId,
        companyName: companyName
      };
    }

  } catch (e) {
    return ErrorHandling.handleError(e, {
      functionName: 'updateProspectAfterVisit',
      companyId: companyId,
      companyName: companyName,
      outcome: outcome,
      status: status,
      activityType: activityType,
      severity: 'MEDIUM'
    });
  }
}

/**
 * Fuzzy matching for company names and IDs
 * Handles differences in spelling, spacing, case, and ID formats
 * @param {Object} outreachData - Outreach record with company info
 * @param {Array} prospectsData - Array of prospect records
 * @return {Object} Match result with match, matchType, and confidence
 */
function fuzzyMatchCompany(outreachData, prospectsData) {
  if (!outreachData) {
    console.warn('fuzzyMatchCompany: outreachData is undefined');
    return { match: null, matchType: 'NONE', confidence: 0 };
  }
  
  // Normalize outreach name and ID with Title Case primary, lowercase fallback
  var outreachName = (outreachData['Company Name'] || outreachData.company || outreachData.companyName || outreachData['company name'] || '').toString().toLowerCase().trim();
  var outreachId = (outreachData['Company ID'] || outreachData.companyId || outreachData['company id'] || '').toString().trim();
  
  // Try exact ID match first (most reliable)
  if (outreachId) {
    var idMatch = prospectsData.find(function(p) {
      if (!p) return false;
      var prospectId = (p['Company ID'] || p.companyid || p.companyId || p['company id'] || p['companyId'] || '').toString().trim();
      return prospectId === outreachId;
    });
    if (idMatch) {
      return { match: idMatch, matchType: 'EXACT_ID', confidence: 1.0 };
    }
  }
  
  // Try exact name match
  var nameMatch = prospectsData.find(function(p) {
    var pName = p['Company Name'] || p['company name'] || '';
    var prospectName = pName.toString().toLowerCase().trim();
    return prospectName === outreachName;
  });
  if (nameMatch) {
    return { match: nameMatch, matchType: 'EXACT_NAME', confidence: 1.0 };
  }
  
  // Try fuzzy name match (handles typos, spacing, punctuation)
  var bestMatch = null;
  var bestScore = 0;
  
  prospectsData.forEach(function(p) {
    var pName = p['Company Name'] || p['company name'] || '';
    var prospectName = pName.toString().toLowerCase().trim();
    var score = calculateStringSimilarity(outreachName, prospectName);
    
    if (score > bestScore && score >= 0.7) { // 70% similarity threshold
      bestScore = score;
      bestMatch = p;
    }
  });
  
  if (bestMatch) {
    return { match: bestMatch, matchType: 'FUZZY_NAME', confidence: bestScore };
  }
  
  // No match found
  return { match: null, matchType: 'NONE', confidence: 0 };
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns score between 0 (no match) and 1 (perfect match)
 * @param {string} str1 - First string to compare
 * @param {string} str2 - Second string to compare
 * @return {number} Similarity score between 0 and 1
 */
function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  var len1 = str1.length;
  var len2 = str2.length;
  var maxLen = Math.max(len1, len2);
  
  if (maxLen === 0) return 1;
  
  // Calculate Levenshtein distance
  var distance = levenshteinDistance(str1, str2);
  var similarity = 1 - (distance / maxLen);
  
  return similarity;
}

/**
 * Levenshtein distance algorithm for string comparison
 * Measures the minimum number of single-character edits needed to change one string into another
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @return {number} Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
  try {
    str1 = str1 || '';
    str2 = str2 || '';
    
    var matrix = [];
    
    for (var i = 0; i <= str1.length; i++) {
      matrix[i] = [i];
    }
    
    for (var j = 0; j <= str2.length; j++) {
      matrix[0][j] = j;
    }
    
    for (var i = 1; i <= str1.length; i++) {
      for (var j = 1; j <= str2.length; j++) {
        if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }
    
    return matrix[str1.length][str2.length];
  } catch (e) {
    console.error('levenshteinDistance error:', e.message);
    return 0;
  }
}

/**
 * Updates Prospect with dynamic logic from Settings.csv
 */
function updateExistingProspectWithWriteBackRules(rowIndex, outcome, status, activityType) {
  try {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) throw new Error('Could not acquire lock');

    try {
      var today = formatDate(new Date());
      
      // 1. LOAD SETTINGS DYNAMICALLY
      var settings = getSettings(); 
      var rules = settings.workflowRules; // Reads WORKFLOW_RULE from Settings.csv
      
      // Find the matching rule for this outcome
      // We look for a rule key that matches the outcome (e.g., "Interested (Hot)")
      var matchedRule = rules[outcome] || rules['Other']; 
      
      // Default values if no rule exists
      var nextStepDays = matchedRule ? matchedRule.days : 14; 
      var urgencyBand = 'Medium';
      var urgencyScore = 50;

      // 2. APPLY LOGIC BASED ON SETTINGS
      
      // Update Contact Status
      var newStatus = status;
      if (outcome === 'Account Won') newStatus = 'Won';
      else if (['Disqualified', 'Not Interested', 'Lost'].includes(outcome)) newStatus = 'Disqualified';
      else if (matchedRule && matchedRule.status) newStatus = matchedRule.status; // Use 'Value_2' from settings
      
      updateCellSafe(CONFIG.SHEETS.PROSPECTS, rowIndex, 'Contact Status', newStatus);

      // Update Next Steps Due Date
      if (['Won', 'Disqualified', 'Lost'].includes(newStatus)) {
        updateCellSafe(CONFIG.SHEETS.PROSPECTS, rowIndex, 'Next Steps Due Date', ''); // Clear it
        urgencyScore = 0;
      } else {
        // Calculate dynamic date based on Settings 'Value_3'
        var nextDate = calculateNextBusinessDay(nextStepDays);
        updateCellSafe(CONFIG.SHEETS.PROSPECTS, rowIndex, 'Next Steps Due Date', formatDate(nextDate));
        
        // Dynamic Urgency
        if (nextStepDays <= 3) urgencyScore = 115; // High urgency for short turnarounds
      }

      // 3. STANDARD UPDATES (Always happen)
      updateCellSafe(CONFIG.SHEETS.PROSPECTS, rowIndex, 'Last Outcome', outcome);
      updateCellSafe(CONFIG.SHEETS.PROSPECTS, rowIndex, 'Last Outreach Date', today);
      updateCellSafe(CONFIG.SHEETS.PROSPECTS, rowIndex, 'Days Since Last Contact', 0);
      updateCellSafe(CONFIG.SHEETS.PROSPECTS, rowIndex, 'Urgency Score', urgencyScore);

      recalculateNextStepCountdown(rowIndex);

    } finally {
      lock.releaseLock();
    }
  } catch (e) {
    console.error('Error updating prospect:', e);
    throw e;
  }
}

/**
 * Stale Prospect Monitor
 * Checks for prospects that haven't been contacted in more than Stale_Prospect_Days (from Settings.csv)
 */
function checkStaleProspects() {
  try {
    var settings = getSettings();
    var staleDays = settings.globalConstants['Stale_Prospect_Days'] ? settings.globalConstants['Stale_Prospect_Days'].value : 60;
    
    var prospectsResult = ErrorHandling.withErrorHandling(function() {
      return SharedUtils.getSafeSheetData(CONFIG.SHEETS.PROSPECTS, [
        'Company ID', 'Company Name', 'Last Outreach Date', 'Days Since Last Contact', 'Contact Status'
      ]);
    }, {
      functionName: 'checkStaleProspects'
    });

    if (!prospectsResult.success) {
      console.warn('Failed to retrieve prospects data: ' + prospectsResult.error);
      return;
    }

    var prospects = prospectsResult.data || [];
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    prospects.forEach(function(prospect) {
      var lastContactDate = prospect['last outreach date'];
      var daysSinceContact = prospect['days since last contact'];
      var contactStatus = prospect['contact status'];

      // Check if prospect is stale
      if (daysSinceContact >= staleDays && !['Won', 'Disqualified', 'Lost'].includes(contactStatus)) {
        // Log stale prospect
        console.log('Stale prospect detected: ' + prospect['company name'] + 
                  ' (Last contact: ' + daysSinceContact + ' days ago)');
        
        // Optional: Update urgency band to "Overdue" for stale prospects
        updateCellSafe(CONFIG.SHEETS.PROSPECTS, prospect._rowIndex, 'UrgencyBand', 'Overdue');
        updateCellSafe(CONFIG.SHEETS.PROSPECTS, prospect._rowIndex, 'Urgency Score', 120);
      }
    });

  } catch (e) {
    console.error('Error checking stale prospects:', e);
    
    // Log to system log if available
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      if (ss) {
        var opsLogSheet = ss.getSheetByName(CONFIG.SHEETS.SYSTEM_LOG);
        if (opsLogSheet) {
          opsLogSheet.appendRow([
            new Date(),
            'checkStaleProspects',
            'ERROR',
            'Error checking stale prospects: ' + e.message,
            e.stack
          ]);
        }
      }
    } catch (logError) {
      console.warn('Could not log error to system log:', logError.message);
    }
  }
}

/**
 * Creates a time-driven trigger to check for stale prospects daily
 */
function createStaleProspectTrigger() {
  try {
    // Delete existing triggers to avoid duplicates
    var existingTriggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < existingTriggers.length; i++) {
      if (existingTriggers[i].getHandlerFunction() === 'checkStaleProspects') {
        ScriptApp.deleteTrigger(existingTriggers[i]);
      }
    }

    // Create new daily trigger
    ScriptApp.newTrigger('checkStaleProspects')
      .timeBased()
      .everyDays(1)
      .atHour(8) // Run daily at 8 AM
      .create();

    console.log('Stale prospect monitor trigger created successfully');
    
  } catch (e) {
    console.error('Error creating stale prospect trigger:', e);
    
    // Log to system log if available
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      if (ss) {
        var opsLogSheet = ss.getSheetByName(CONFIG.SHEETS.SYSTEM_LOG);
        if (opsLogSheet) {
          opsLogSheet.appendRow([
            new Date(),
            'createStaleProspectTrigger',
            'ERROR',
            'Error creating stale prospect trigger: ' + e.message,
            e.stack
          ]);
        }
      }
    } catch (logError) {
      console.warn('Could not log error to system log:', logError.message);
    }
  }
}

/**
 * Calculates the next business day (skips weekends)
 * @param {number} daysAhead - Number of business days to add
 * @param {Date} [startDate] - Optional start date (defaults to current date)
 * @return {Date} The calculated business day
 */
function calculateNextBusinessDay(daysAhead, startDate) {
  var date = startDate ? new Date(startDate) : new Date();
  var businessDaysAdded = 0;

  while (businessDaysAdded < daysAhead) {
    date.setDate(date.getDate() + 1);
    var dayOfWeek = date.getDay();
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDaysAdded++;
    }
  }

  return date;
}

/**
 * Recalculates the Next Step Due Countdown based on the Next Steps Due Date
 * @param {number} rowIndex - Row index of the prospect
 */
function recalculateNextStepCountdown(rowIndex) {
  try {
    // Get the current Next Steps Due Date
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error('Spreadsheet not available for recalculateNextStepCountdown');
    }
    
    var sheet = ss.getSheetByName(CONFIG.SHEETS.PROSPECTS);
    if (!sheet) {
      throw new Error('Sheet not found: ' + CONFIG.SHEETS.PROSPECTS);
    }
    
    var dueDateValue = sheet.getRange(rowIndex + 1, ColumnMapper.getColumnIndex(CONFIG.SHEETS.PROSPECTS, 'Next Steps Due Date')).getValue();

    if (dueDateValue) {
      var dueDate = new Date(dueDateValue);
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);

      var diffTime = dueDate.getTime() - today.getTime();
      var daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      updateCellSafe(CONFIG.SHEETS.PROSPECTS, rowIndex, 'Next Step Due Countdown', daysUntilDue);
    } else {
      updateCellSafe(CONFIG.SHEETS.PROSPECTS, rowIndex, 'Next Step Due Countdown', '');
    }
  } catch (e) {
    console.error('Error recalculating countdown:', e.message);
  }
}

/**
 * Creates a new prospect entry when company doesn't exist in Prospects sheet.
 */
function createNewProspect(companyId, companyName, outcome, status, activityType) {
  var today = formatDate(new Date());

  var prospectRow = {
    'company id': companyId,
    'address': '', // Will be filled later from form data if available
    'zip code': '',
    'company name': companyName,
    'industry': '', // Will be filled later from form data if available
    'latitude': '',
    'longitude': '',
    'last outcome': outcome,
    'last outreach date': today,
    'days since last contact': 0,
    'next step due countdown': '',
    'next steps due date': '',
    'contact status': status,
    'close probability': 0,
    'priority score': 50, // Default priority score
    'urgency band': 'Low',
    'urgency score': 20, // Default urgency score
  };

  appendRowSafe(CONFIG.SHEETS.PROSPECTS, prospectRow);
}

/**
 * Runs precise industry mapping based on company name keywords.
 * Uses SMART_MAP to identify industries and only overwrites weak or generic values.
 * Uses batch processing (getValues/setValues) for performance.
 */
function runPreciseIndustryMapper() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const prospectSheet = ss.getActiveSheet();
  const sheetName = prospectSheet.getName();

  const confirm = ui.alert(
    '🛠️ Fix Data: Industries',
    'This will auto-classify industries based on company names in the "' + sheetName + '" sheet.\n\n' +
    'Only blank, weak (Other/Retail/Construction), or upgradeable entries will be updated.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  try {
    const SMART_MAP = [
      { industry: "Junk Removal", keywords: ["junk", "haul", "cleanout", "scrap removal", "demo guys"] },
      { industry: "Welding", keywords: ["welding", "welder", "braze", "arc n spark", "weld"] },
      { industry: "Metal Fabrication", keywords: ["metal", "steel", "fabrication", "fab", "iron", "machine shop", "cnc", "tooling", "ornamental", "wire", "alloy"] },
      { industry: "HVAC", keywords: ["hvac", "air conditioning", "heating", "cooling", "furnace", "air condition", "ac ", "a/c"] },
      { industry: "Automotive", keywords: ["auto", "collision", "body shop", "tire", "brake", "transmission", "radiator", "diesel", "motors", "car care", "alignment", "truck repair"] },
      { industry: "Roofing", keywords: ["roof"] },
      { industry: "Gutter", keywords: ["gutter", "seamless"] },
      { industry: "Plumbing", keywords: ["plumbing", "plumber", "septic", "rooter", "drain"] },
      { industry: "Electrical", keywords: ["electric", "lighting"] },
      { industry: "Appliance", keywords: ["appliance", "washer", "dryer", "refrigerator"] },
      { industry: "Fence", keywords: ["fence", "fencing"] },
      { industry: "Construction", keywords: ["construction", "builder", "contractor", "remodeling", "excavation", "dirt"] }
    ];

    const range = prospectSheet.getDataRange();
    const data = range.getValues();
    const headers = data[0].map(function(h) { return String(h).trim(); });
    const nameIdx = SharedUtils.findColumnIndex(headers, 'Company Name', 'PROSPECTS');
    const industryIdx = SharedUtils.findColumnIndex(headers, 'Industry', 'PROSPECTS');

    if (nameIdx === -1 || industryIdx === -1) {
      ui.alert('❌ Column Not Found',
        'This sheet needs both "Company Name" and "Industry" columns.\n\nNot found in "' + sheetName + '".\n\nPlease run this from a sheet that has those columns.',
        ui.ButtonSet.OK);
      return;
    }

    let updateCount = 0;

    for (let i = 1; i < data.length; i++) {
      const companyName = String(data[i][nameIdx]).toLowerCase();
      const currentIndustry = String(data[i][industryIdx]);
      let matchFound = null;

      for (const rule of SMART_MAP) {
        if (rule.keywords.some(kw => companyName.includes(kw))) {
          matchFound = rule.industry;
          break;
        }
      }

      if (matchFound) {
        const isWeak = ["Other", "Retail", "Construction", "", "0"].includes(currentIndustry);
        const isUpgrade = (currentIndustry === "Construction" && ["Roofing", "Gutter", "Metal Fabrication"].includes(matchFound));

        if ((isWeak || isUpgrade) && currentIndustry !== matchFound) {
          data[i][industryIdx] = matchFound;
          updateCount++;
        }
      }
    }

    if (updateCount > 0) {
      range.setValues(data);
      console.log('Updated ' + updateCount + ' industries in "' + sheetName + '".');
      ss.toast('Updated ' + updateCount + ' industry classifications in "' + sheetName + '".', 'Industry Mapper', 5);
    } else {
      console.log('No industries needed updating in "' + sheetName + '".');
      ss.toast('No industries needed updating in "' + sheetName + '".', 'Industry Mapper', 5);
    }
  } catch (e) {
    console.error('runPreciseIndustryMapper error:', e.message);
    ui.alert('❌ Error', 'Industry mapper failed: ' + e.message, ui.ButtonSet.OK);
  }
}

/**
 * Normalizes company names and generates unique Company IDs.
 * Normalization: Removes "LLC", "Inc", "Co", punctuation, and extra spaces.
 * ID Format: CID- + First 3 chars of Normalized Name + 3-digit sequence number.
 * Only processes rows where Company ID is missing or empty.
 */
function normalizeAndGenerateIDs() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const prospectSheet = ss.getActiveSheet();
  const sheetName = prospectSheet.getName();

  const confirm = ui.alert(
    '🆔 Generate Company IDs',
    'This will generate new CID-XXXNNN IDs for any rows missing a Company ID in the "' + sheetName + '" sheet.\n\n' +
    'Existing valid IDs will not be changed.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  try {
    const range = prospectSheet.getDataRange();
    const data = range.getValues();
    const headers = data[0].map(function(h) { return String(h).trim(); });
    const companyIdIdx = SharedUtils.findColumnIndex(headers, 'Company ID', 'PROSPECTS');
    const companyNameIdx = SharedUtils.findColumnIndex(headers, 'Company Name', 'PROSPECTS');

    if (companyIdIdx === -1 || companyNameIdx === -1) {
      ui.alert('❌ Column Not Found',
        'This sheet needs both "Company ID" and "Company Name" columns.\n\nNot found in "' + sheetName + '".\n\nPlease run this from a sheet that has those columns.',
        ui.ButtonSet.OK);
      return;
    }

    // Track used IDs to prevent duplicates
    const usedIds = new Set();
    
    // First pass: collect all existing IDs
    for (let i = 1; i < data.length; i++) {
      const existingId = String(data[i][companyIdIdx]).trim();
      if (existingId && existingId.startsWith('CID-')) {
        usedIds.add(existingId);
      }
    }

    let updateCount = 0;
    const idCounters = {}; // Track sequence numbers per prefix

    for (let i = 1; i < data.length; i++) {
      const currentId = String(data[i][companyIdIdx]).trim();
      const companyName = String(data[i][companyNameIdx]).trim();
      
      // Skip if ID already exists and is valid
      if (currentId && currentId.startsWith('CID-')) {
        continue;
      }

      // Skip if no company name
      if (!companyName) {
        continue;
      }

      // Normalize the company name
      let normalized = companyName
        .replace(/\b(LLC|Inc\.?|Ltd\.?|Co\.?|Corporation|Corp\.?)\b/gi, '')
        .replace(/[^\w\s]/g, ' ') // Remove punctuation
        .replace(/\s+/g, ' ')      // Collapse multiple spaces
        .trim()
        .toUpperCase();

      // Get first 3 characters, padded if needed
      let prefix = normalized.substring(0, 3).padEnd(3, 'X');
      
      // Initialize counter for this prefix if not exists
      if (!(prefix in idCounters)) {
        idCounters[prefix] = 1;
      }

      // Generate unique ID
      let newId;
      let attempts = 0;
      do {
        const sequence = String(idCounters[prefix]).padStart(3, '0');
        newId = 'CID-' + prefix + sequence;
        idCounters[prefix]++;
        attempts++;
      } while (usedIds.has(newId) && attempts < 999);

      if (attempts >= 999) {
        console.warn('Could not generate unique ID for: ' + companyName);
        continue;
      }

      usedIds.add(newId);
      data[i][companyIdIdx] = newId;
      updateCount++;
    }

    if (updateCount > 0) {
      range.setValues(data);
      console.log('Generated ' + updateCount + ' new Company IDs in "' + sheetName + '".');
      ss.toast('Generated ' + updateCount + ' new Company IDs in "' + sheetName + '".', 'ID Generator', 5);
    } else {
      console.log('No new IDs needed in "' + sheetName + '".');
      ss.toast('No new IDs needed — all rows in "' + sheetName + '" have valid Company IDs.', 'ID Generator', 5);
    }
  } catch (e) {
    console.error('normalizeAndGenerateIDs error:', e.message);
    ui.alert('❌ Error', 'ID generation failed: ' + e.message, ui.ButtonSet.OK);
  }
}

// Export the new functions to the namespace
ProspectFunctions.runPreciseIndustryMapper = runPreciseIndustryMapper;
ProspectFunctions.normalizeAndGenerateIDs = normalizeAndGenerateIDs;
