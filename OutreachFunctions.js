/**
 * Outreach Functions
 * Handles Logging, Duplicate Checks, and History Retrieval.
 */

// Create OutreachFunctions namespace object
// NOTE: getLastTouchInfo, getCompanyAutocompleteList, checkProspectStatus,
//       getOutreachData, getCompanyDetailsForAutofill, getProspectDetails, and
//       getContactDetails are intentionally omitted — their canonical, complete
//       implementations live in DashboardBackend.js (loads before this file
//       alphabetically as 'D' < 'O').  Defining weaker versions here would
//       overwrite the better ones at GAS parse time.
var OutreachFunctions = {
  checkForDuplicateLID: checkForDuplicateLID,
  processOutreachSubmission: processOutreachSubmission,
  fetchOutreachHistory: fetchOutreachHistory,
  calculateDashboardMetrics: calculateDashboardMetrics,
  mapStatusToStage: mapStatusToStage,
  addOutreachComplete: addOutreachComplete
};

/**
 * Enhanced Check if an Outreach ID (LID) already exists with error handling and performance optimization.
 */
function checkForDuplicateLID(lid) {
  // Validate input parameter
  if (!lid) {
    return {
      success: true,
      isDuplicate: false,
      message: 'No LID provided - treating as unique'
    };
  }

  try {
    // Validate LID format
    if (typeof lid !== 'string' || lid.trim().length === 0) {
      return {
        success: false,
        error: 'Invalid LID format provided',
        isDuplicate: false
      };
    }

    // Use optimized data fetching with caching for better performance
    var outreach = getSafeSheetDataOptimized(CONFIG.SHEETS.OUTREACH, ['Outreach ID', 'Company'], {
      useCache: true,
      cacheDuration: 30000 // Cache for 30 seconds since LID checks happen frequently
    });

    if (!outreach || outreach.length === 0) {
      console.log('No outreach data found for duplicate check');
      return {
        success: true,
        isDuplicate: false,
        message: 'No existing outreach records found'
      };
    }

    // Search for duplicate with case-insensitive matching and error handling
    var normalizedLid = lid.toString().toLowerCase().trim();
    var match = null;

    try {
      match = outreach.find(function(row) {
        if (!row || !row['outreach id']) return false;
        var existingLid = row['outreach id'].toString().toLowerCase().trim();
        return existingLid === normalizedLid;
      });
    } catch (searchError) {
      console.warn('Error during LID search: ' + searchError.message);
      return {
        success: false,
        error: 'Error searching for duplicate LID: ' + searchError.message,
        isDuplicate: false
      };
    }

    if (match) {
      return {
        success: true,
        isDuplicate: true,
        existingCompany: match['company'] || 'Unknown',
        existingLid: match['outreach id'],
        message: 'Duplicate LID found for company: ' + (match['company'] || 'Unknown')
      };
    }

    return {
      success: true,
      isDuplicate: false,
      message: 'LID is unique'
    };

  } catch (e) {
    return handleErrorWithContext(e, {
      functionName: 'checkForDuplicateLID',
      lid: lid
    });
  }
}

/**
 * Enhanced Core Save Logic: Updates Outreach, Prospects, and New Accounts.
 * Includes batch processing, sheet locking, timeout protection, and comprehensive error handling.
 * Now aligned with Settings Engine for dynamic Stage/Status mapping.
 */
function processOutreachSubmission(data) {
  // Validate required parameters
  var validation = validateParameters(data, ['company', 'outcome'], {
    functionName: 'processOutreachSubmission'
  });

  if (!validation.success) {
    return validation;
  }

  // Use sheet locking for concurrency control
  return executeWithSheetLock(CONFIG.SHEETS.OUTREACH, function() {
    return executeWithTimeoutProtection(function() {
      try {
        // Generate IDs with error handling
        var companyId = data.companyId || SharedUtils.generateCompanyId(data.companyName || data.company);
        var outreachId = data.outreachId || SharedUtils.generateUniqueId('LID');

        // Check for duplicate outreach ID
        var duplicateCheck = checkForDuplicateLID(outreachId);
        if (!duplicateCheck.success) {
          return duplicateCheck;
        }

        // Check if company exists in Prospects sheet with optimized data fetching
        var prospects = getSafeSheetDataOptimized(CONFIG.SHEETS.PROSPECTS, ['Company Name', 'Company ID'], {
          useCache: true,
          cacheDuration: 30000
        });

        var isExistingProspect = prospects.some(function(p) {
          return (p['company name'] || '').toLowerCase() === (data.companyName || data.company || '').toLowerCase() ||
                 (p['company id'] === companyId && companyId);
        });

        // Calculate Next Visit Countdown with date validation
        var nextVisitCountdown = '';
        if (data.nextVisitDate) {
          try {
            var nextDate = new Date(data.nextVisitDate);
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            nextDate.setHours(0, 0, 0, 0);

            if (isNaN(nextDate.getTime())) {
              console.warn('Invalid next visit date provided: ' + data.nextVisitDate);
            } else {
              var diffTime = nextDate.getTime() - today.getTime();
              nextVisitCountdown = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
          } catch (dateError) {
            console.warn('Error calculating next visit countdown: ' + dateError.message);
          }
        }

        // Get dynamic Stage and Status from Settings Engine
        var settings = getSettings();
        var rule = settings.workflowRules[data.outcome] || {};

        // Prepare outreach data with comprehensive field mapping
        var outreachRow = {
          'outreach id': outreachId,
          'company id': companyId,
          'company': data.companyName || data.company,
          'visit date': SharedUtils.formatDate(new Date()),
          'notes': data.notes || '',
          'outcome': data.outcome,
          'stage': rule.stage || data.stage || 'Outreach', // Pulls from Value_1 in Settings, fallback to data.stage
          'status': rule.status || data.status || 'Cold',   // Pulls from Value_2 in Settings, fallback to data.status
          'next visit date': data.nextVisitDate ? SharedUtils.formatDate(data.nextVisitDate) : '',
          'days since last visit': 0,
          'next visit countdown': nextVisitCountdown,
          'outcome category': data.outcome,
          'follow up action': 'See Notes',
          'owner': CONFIG.DEFAULT_OWNER,
          'prospects match': isExistingProspect,
          'contact type': data.activityType || 'Visit',
          'email sent': false,
          'competitor': data.competitor || 'None' // Ensure this matches Column R
        };

        // 1. Log to Outreach Sheet with error handling
        try {
          prependRowSafe(CONFIG.SHEETS.OUTREACH, outreachRow);
          console.log('Successfully logged outreach entry for company: ' + (data.companyName || data.company));
        } catch (outreachError) {
          return handleErrorWithContext(outreachError, {
            functionName: 'processOutreachSubmission',
            step: 'outreach_logging',
            data: outreachRow
          });
        }

        // 2. Update Prospect Sheet (Status, Last Contact) with timeout protection
        try {
          var prospectUpdateResult = updateProspectAfterVisit(companyId, data.companyName, data.outcome, outreachRow['status'], data.activityType, data.newCompanyData);
          if (prospectUpdateResult && prospectUpdateResult.success === false) {
            console.warn('Prospect update warning: ' + prospectUpdateResult.error);
            // Continue processing despite prospect update issues
          }
        } catch (prospectError) {
          console.warn('Prospect update failed, continuing with submission: ' + prospectError.message);
          // Continue processing despite prospect update issues
        }

        // 3. If Account Won, Add to Accounts Sheet with validation and full schema alignment
        if (data.outcome === 'Account Won') {
          try {
            var accountRow = {
              'deployed': 'No', // Default from Schema
              'timestamp': SharedUtils.formatDate(new Date()),
              'company name': data.companyName || data.company,
              'contact name': data.contact || '',
              'contact phone': data.phone || '',
              'contact role': data.contactRole || '',
              'site location': data.site || data.address || '',
              'mailing location': data.mailingAddress || data.site || data.address || '',
              'roll-off fee': 'Yes', // Default from Schema
              'handling of metal': data.handlingOfMetal || 'All together',
              'roll off container size': data.containerSize || '30 yd',
              'notes': data.notes || '',
              'payout price': data.payoutPrice || ''
            };

            // Validate required fields for new account
            if (!accountRow['company name']) {
              console.warn('Cannot create new account: missing company name');
            } else {
              appendRowSafe(CONFIG.SHEETS.ACCOUNTS, accountRow);
              console.log('Successfully created new account for: ' + accountRow['company name']);
            }
          } catch (accountError) {
            console.warn('New account creation failed, continuing: ' + accountError.message);
            // Continue processing despite new account creation issues
          }
        }

        // Memory optimization after processing
        optimizeMemory();

        return {
          success: true,
          outreachId: outreachId,
          companyId: companyId,
          message: 'Outreach submission processed successfully'
        };

      } catch (e) {
        return handleErrorWithContext(e, {
          functionName: 'processOutreachSubmission',
          data: data
        });
      }
    }, [], {
      functionName: 'processOutreachSubmission',
      maxRetries: 2,
      retryDelay: 1000,
      timeoutThreshold: 30000
    });
  });
}

/**
 * Enhanced Fetch Outreach History for Stats/Calendar with batch processing and timeout protection.
 * Handles large datasets efficiently by processing data in batches.
 */
function fetchOutreachHistory(startDateStr, endDateStr, options) {
  options = options || {};
  var maxRecords = options.maxRecords || 1000;
  var includeAllColumns = options.includeAllColumns || false;
  
  // Default to last 90 days if no dates provided
  if (!startDateStr || !endDateStr) {
    var today = new Date();
    var ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(today.getDate() - 90);
    startDateStr = startDateStr || ninetyDaysAgo.toISOString().split('T')[0];
    endDateStr = endDateStr || today.toISOString().split('T')[0];
    console.log('fetchOutreachHistory: Using default dates', startDateStr, 'to', endDateStr);
  }

  // Validate date parameters
  var validation = validateParameters({ startDateStr: startDateStr, endDateStr: endDateStr }, ['startDateStr', 'endDateStr'], {
    functionName: 'fetchOutreachHistory'
  });

  if (!validation.success) {
    return validation;
  }

  return executeWithTimeoutProtection(function() {
    try {
      // Parse and validate dates
      var start = new Date(startDateStr);
      var end = new Date(endDateStr);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return handleErrorWithContext(new Error('Invalid date format provided'), {
          functionName: 'fetchOutreachHistory',
          startDateStr: startDateStr,
          endDateStr: endDateStr
        });
      }

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      // Determine which columns to fetch
      var requiredColumns = includeAllColumns ?
        ['Outreach ID', 'Company ID', 'Company', 'Visit Date', 'Notes', 'Outcome', 'Stage', 'Status', 'Next Visit Date', 'Contact Type', 'Owner', 'Competitor'] :
        ['Visit Date', 'Company', 'Outcome', 'Status', 'Notes'];

      // Use optimized data fetching with caching
      var outreach = getSafeSheetDataOptimized(CONFIG.SHEETS.OUTREACH, requiredColumns, {
        useCache: true,
        cacheDuration: 60000 // Cache for 1 minute since outreach data changes frequently
      });

      if (!outreach || outreach.length === 0) {
        console.log('No outreach data found');
        return { success: true, data: [], count: 0 };
      }

      console.log('Processing ' + outreach.length + ' outreach records for date range');

      // Use batch processing for filtering large datasets
      var filterBatchSize = 500; // Process 500 records at a time
      var filtered = [];

      for (var i = 0; i < outreach.length; i += filterBatchSize) {
        var batch = outreach.slice(i, i + filterBatchSize);
        var batchFiltered = batch.filter(function(row) {
          try {
            var rowDate = new Date(row['visit date']);
            return !isNaN(rowDate.getTime()) && rowDate >= start && rowDate <= end;
          } catch (dateError) {
            console.warn('Invalid date in outreach record: ' + row['visit date']);
            return false;
          }
        });

        filtered = filtered.concat(batchFiltered);

        // Check for timeout warnings during processing
        checkExecutionTime(Date.now() - 30000, 'fetchOutreachHistory'); // Started 30 seconds ago

        // Prevent memory issues by limiting results
        if (filtered.length >= maxRecords) {
          console.log('Reached maximum record limit: ' + maxRecords);
          break;
        }

        // Small delay between batches to prevent throttling
        if (i + filterBatchSize < outreach.length) {
          Utilities.sleep(10);
        }
      }

      // Sort by date descending (most recent first)
      filtered.sort(function(a, b) {
        var dateA = new Date(a['visit date']);
        var dateB = new Date(b['visit date']);
        return dateB - dateA;
      });

      // Apply final limit
      if (filtered.length > maxRecords) {
        filtered = filtered.slice(0, maxRecords);
      }

      // Clean and format data for frontend
      var cleanData = filtered.map(function(row) {
        return {
          company: row['company'] || '',
          outcome: row['outcome'] || '',
          status: row['status'] || '',
          notes: row['notes'] || '',
          visitDate: SharedUtils.formatDate(row['visit date']) || '',
          contactType: row['contact type'] || 'Visit',
          outreachId: row['outreach id'] || '',
          owner: row['owner'] || CONFIG.DEFAULT_OWNER,
          competitor: row['competitor'] || 'None'
        };
      });

      console.log('Fetched ' + cleanData.length + ' outreach records for date range');

      return {
        success: true,
        data: cleanData,
        count: cleanData.length,
        dateRange: {
          start: SharedUtils.formatDate(start),
          end: SharedUtils.formatDate(end)
        }
      };

    } catch (e) {
      return handleErrorWithContext(e, {
        functionName: 'fetchOutreachHistory',
        startDateStr: startDateStr,
        endDateStr: endDateStr,
        options: options
      });
    }
  }, [startDateStr, endDateStr, options], {
    functionName: 'fetchOutreachHistory',
    maxRetries: 2,
    retryDelay: 500,
    timeoutThreshold: 45000 // Longer timeout for data processing
  });
}

// getLastTouchInfo — removed duplicate; canonical version (with nextSteps + companyId fields)
// lives in DashboardBackend.js and wins at GAS parse time ('D' loads before 'O').

/**
 * Enhanced Calculate Metrics for Pipeline Modal with timeout protection and batch processing.
 * Handles large datasets efficiently and provides comprehensive error handling.
 */
function calculateDashboardMetrics(options) {
  options = options || {};
  var includeDetailedStats = options.includeDetailedStats || false;
  var maxActivityRecords = options.maxActivityRecords || 10;

  return executeWithTimeoutProtection(function() {
    try {
      console.log('Starting dashboard metrics calculation');

      // Use optimized data fetching with caching for better performance
      var prospects = getSafeSheetDataOptimized(CONFIG.SHEETS.PROSPECTS,
        ['Contact Status', 'Company Name', 'Last Outcome', 'Last Outreach Date', 'Priority Score'], {
        useCache: true,
        cacheDuration: 120000 // Cache for 2 minutes since prospect data changes less frequently
      });

      var outreach = getSafeSheetDataOptimized(CONFIG.SHEETS.OUTREACH,
        ['Visit Date', 'Company', 'Outcome', 'Contact Type', 'Owner'], {
        useCache: true,
        cacheDuration: 60000 // Cache for 1 minute for outreach data
      });

      if (!prospects || prospects.length === 0) {
        console.warn('No prospect data found for metrics calculation');
        prospects = [];
      }

      if (!outreach || outreach.length === 0) {
        console.warn('No outreach data found for metrics calculation');
        outreach = [];
      }

      console.log('Processing ' + prospects.length + ' prospects and ' + outreach.length + ' outreach records');

      // Initialize pipeline counts with enhanced categorization
      var pipelineCounts = {
        'Prospect': 0,
        'Outreach': 0,
        'Nurture': 0,
        'Won': 0,
        'Lost': 0
      };

      var statusBreakdown = {}; // For detailed stats
      var activeTotal = 0;
      var totalProspects = prospects.length;

      // Process prospects in batches to prevent timeout
      var prospectBatchSize = 200;
      for (var i = 0; i < prospects.length; i += prospectBatchSize) {
        var prospectBatch = prospects.slice(i, i + prospectBatchSize);

        prospectBatch.forEach(function(p) {
          try {
            var status = p['contact status'] || 'Prospect';
            var stage = mapStatusToStage(status);

            // Count by stage
            if (pipelineCounts.hasOwnProperty(stage)) {
              pipelineCounts[stage]++;
            }

            // Track detailed status breakdown if requested
            if (includeDetailedStats) {
              statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
            }

            // Count active prospects
            if (stage !== 'Lost' && stage !== 'Disqualified') {
              activeTotal++;
            }

          } catch (prospectError) {
            console.warn('Error processing prospect record: ' + prospectError.message);
            // Continue processing other prospects
          }
        });

        // Check for timeout warnings during processing
        checkExecutionTime(Date.now() - 20000, 'calculateDashboardMetrics');

        // Small delay between batches
        if (i + prospectBatchSize < prospects.length) {
          Utilities.sleep(5);
        }
      }

      // Get recent activity with enhanced information
      var recentActivity = [];
      if (outreach.length > 0) {
        try {
          // Sort outreach by date descending and take the most recent records
          var sortedOutreach = outreach.sort(function(a, b) {
            var dateA = new Date(a['visit date']);
            var dateB = new Date(b['visit date']);
            return dateB - dateA;
          });

          recentActivity = sortedOutreach.slice(0, maxActivityRecords).map(function(o) {
            return {
              company: o['company'] || 'Unknown',
              outcome: o['outcome'] || 'Unknown',
              date: SharedUtils.formatDate(o['visit date']) || '',
              contactType: o['contact type'] || 'Visit',
              owner: o['owner'] || CONFIG.DEFAULT_OWNER
            };
          });
        } catch (activityError) {
          console.warn('Error processing recent activity: ' + activityError.message);
          recentActivity = [];
        }
      }

      // Calculate additional metrics if detailed stats requested
      var detailedMetrics = {};
      if (includeDetailedStats) {
        detailedMetrics = {
          totalProspects: totalProspects,
          conversionRate: totalProspects > 0 ? (pipelineCounts.Customer / totalProspects * 100).toFixed(1) + '%' : '0%',
          statusBreakdown: statusBreakdown,
          averageActivityPerProspect: outreach.length > 0 ? (outreach.length / totalProspects).toFixed(1) : 0,
          lastUpdated: SharedUtils.formatDate(new Date())
        };
      }

      console.log('Dashboard metrics calculated successfully. Active prospects: ' + activeTotal);

      var result = {
        success: true,
        data: {
          pipeline: {
            totalActive: activeTotal,
            byStage: pipelineCounts
          },
          activity: recentActivity
        }
      };

      // Add detailed metrics if requested
      if (includeDetailedStats) {
        result.data.detailedMetrics = detailedMetrics;
      }

      // Memory optimization after processing
      optimizeMemory();

      return result;

    } catch (e) {
      return handleErrorWithContext(e, {
        functionName: 'calculateDashboardMetrics',
        options: options,
        prospectCount: prospects ? prospects.length : 0,
        outreachCount: outreach ? outreach.length : 0
      });
    }
  }, [], {
    functionName: 'calculateDashboardMetrics',
    maxRetries: 2,
    retryDelay: 1000,
    timeoutThreshold: 50000 // Longer timeout for complex calculations
  });
}

/**
 * Helper function to map contact status to pipeline stage
 * Note: This is now used as a fallback. Primary mapping comes from Settings Engine.
 */
function mapStatusToStage(status) {
  if (!status) return 'Prospect';

  var statusMapping = {
    'Interested (Hot)': 'Active Pursuit',
    'Interested (Warm)': 'Nurture',
    'Hot': 'Active Pursuit',
    'Warm': 'Nurture',
    'Cold': 'Outreach',
    'Account Won': 'Won',
    'Won': 'Won',
    'Disqualified': 'Lost',
    'Lost': 'Lost',
    'No Answer': 'Outreach',
    'Not Interested': 'Lost',
    'Follow-Up': 'Nurture',
    'Initial Contact': 'Outreach',
    'Active': 'Won',
    'Outreach': 'Outreach',
    'Prospect': 'Prospect'
  };

  return statusMapping[status] || 'Prospect';
}

// getCompanyAutocompleteList — removed duplicate; canonical version (with PipelineService
// fallback and direct sheet read) lives in DashboardBackend.js.

// getProspectDetails — removed duplicate; canonical version (with full outreach history,
// timeline, and stats) lives in DashboardBackend.js.

// getContactDetails — removed (only served the duplicate getProspectDetails /
// getCompanyDetailsForAutofill functions above).

/**
 * Simplified outreach entry function for dashboard save button.
 * Validates input and calls processOutreachSubmission.
 * Returns {success: true/false, error?: string}
 */
function addOutreachComplete(formData) {
  try {
    // Validate required fields
    if (!formData || !formData.company) {
      return { success: false, error: 'Company name is required' };
    }
    
    if (!formData.outcome) {
      return { success: false, error: 'Outcome is required' };
    }
    
    // Build data object for processOutreachSubmission
    var outreachData = {
      company: formData.company,
      companyName: formData.company,
      outcome: formData.outcome,
      stage: formData.stage || '',
      status: formData.status || '',
      notes: formData.notes || '',
      nextVisitDate: formData.nextVisitDate || '',
      activityType: formData.activityType || 'Visit',
      outreachId: formData.outreachId || '',
      competitor: formData.competitor || 'None',
      newCompanyData: formData.newCompanyData || null
    };
    
    // Process the outreach submission
    var result = processOutreachSubmission(outreachData);
    
    if (result && result.success) {
      return { 
        success: true, 
        outreachId: result.outreachId,
        companyId: result.companyId,
        message: result.message 
      };
    } else {
      return { success: false, error: result.error || 'Failed to save outreach entry' };
    }
    
  } catch (e) {
    console.error('Error in addOutreachComplete: ' + e.message);
    return { success: false, error: e.message };
  }
}

// getCompanyDetailsForAutofill — removed duplicate; canonical version (delegates to
// getProspectDetails() and reads Contacts by Company ID) lives in DashboardBackend.js.

// checkProspectStatus — removed duplicate; canonical version (includes daysSinceLastContact
// field) lives in DashboardBackend.js.

// getOutreachData — removed duplicate; canonical version (full date-filtered sheet read)
// lives in DashboardBackend.js.
