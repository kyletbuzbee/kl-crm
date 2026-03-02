/**
 * Dashboard Backend Functions
 * Exposes PipelineService methods for the dashboard sidebar
 * Version: 2.1.0 - Enhanced error handling and API response standardization
 */

/**
 * Helper function to check if PipelineService is available
 * @returns {boolean} True if PipelineService is available
 */
function isPipelineServiceAvailable() {
  try {
    return typeof PipelineService !== 'undefined' && 
           PipelineService !== null && 
           typeof PipelineService.getAllProspects === 'function';
  } catch (e) {
    console.error('PipelineService availability check failed:', e);
    return false;
  }
}

/**
 * Helper function to check if required services are available
 * @returns {Object} Result with success flag and error message if failed
 */
function checkRequiredServices() {
  var missingServices = [];
  
  if (typeof PipelineService === 'undefined' || PipelineService === null) {
    missingServices.push('PipelineService');
  }
  
  if (typeof SharedUtils === 'undefined' || SharedUtils === null) {
    missingServices.push('SharedUtils');
  }
  
  if (typeof CONFIG === 'undefined' || CONFIG === null) {
    missingServices.push('CONFIG');
  }
  
  if (missingServices.length > 0) {
    return {
      success: false,
      error: 'Required services not loaded: ' + missingServices.join(', '),
      missingServices: missingServices
    };
  }
  
  return { success: true };
}

/**
 * Gets urgent prospects for the dashboard follow-up table
 * @returns {Object} Object with success flag and array of urgent prospects
 */
function getUrgentProspectsForDashboard() {
  try {
    // Check if PipelineService is available
    if (!isPipelineServiceAvailable()) {
      console.warn('getUrgentProspectsForDashboard: PipelineService not available');
      return {
        success: true,
        data: [],
        warning: 'PipelineService not available - returning empty array'
      };
    }
    
    var prospects = PipelineService.getUrgentProspects();
    return {
      success: true,
      data: prospects || []
    };
  } catch (e) {
    console.error('Error in getUrgentProspectsForDashboard:', e);
    return {
      success: false,
      error: e.message,
      data: []
    };
  }
}

/**
 * Gets pipeline funnel data for the dashboard summary tiles
 * @returns {Object} Object with success flag and funnel data
 */
function getPipelineFunnelForDashboard() {
  try {
    // Check if PipelineService is available
    if (!isPipelineServiceAvailable()) {
      console.warn('getPipelineFunnelForDashboard: PipelineService not available');
      return {
        success: true,
        data: {
          total: 0,
          hot: 0,
          warm: 0,
          won: 0,
          nurture: 0,
          outreach: 0,
          lost: 0
        },
        warning: 'PipelineService not available - returning default values'
      };
    }
    
    var funnelData = PipelineService.calculateFunnel();
    
    // DEFENSIVE: Ensure funnelData is always an object with expected properties
    if (!funnelData || typeof funnelData !== 'object') {
      funnelData = { total: 0, hot: 0, warm: 0, won: 0 };
    }
    
    // Get additional stage counts for more detailed tiles
    var allProspects = [];
    try {
      allProspects = PipelineService.getAllProspects();
    } catch (prospectError) {
      console.warn('Could not get all prospects for funnel:', prospectError);
    }
    
    if (!Array.isArray(allProspects)) { allProspects = []; }
    
    var nurtureCount = allProspects.filter(function(p) {
      var status = (p.contactStatus || p.contactstatus || '').toString().toLowerCase();
      return status.includes('warm') || status.includes('follow');
    }).length;
    
    var outreachCount = allProspects.filter(function(p) {
      var status = (p.contactStatus || p.contactstatus || '').toString().toLowerCase();
      return status.includes('cold') || status.includes('initial');
    }).length;
    
    var lostCount = allProspects.filter(function(p) {
      var status = (p.contactStatus || p.contactstatus || '').toString().toLowerCase();
      return status.includes('disqualified') || status.includes('not interested');
    }).length;
    
    return {
      success: true,
      data: {
        total: funnelData.total || 0,
        hot: funnelData.hot || 0,
        warm: funnelData.warm || 0,
        won: funnelData.won || 0,
        nurture: nurtureCount || 0,
        outreach: outreachCount || 0,
        lost: lostCount || 0
      }
    };
  } catch (e) {
    console.error('Error in getPipelineFunnelForDashboard:', e);
    return {
      success: false,
      error: e.message,
      data: {
        total: 0,
        hot: 0,
        warm: 0,
        won: 0,
        nurture: 0,
        outreach: 0,
        lost: 0
      }
    };
  }
}

/**
 * CRM Gateway - Unified entry point for all CRM API calls
 * Routes actions to appropriate handlers
 * @param {Object} payload - Contains action and payload data
 * @returns {Object} Result from the requested action
 */
function crmGateway(payload) {
  try {
    // Check required services first
    var serviceCheck = checkRequiredServices();
    if (!serviceCheck.success) {
      console.error('CRM Gateway: Service check failed:', serviceCheck.error);
      return { 
        success: false, 
        error: serviceCheck.error,
        data: null
      };
    }
    
    if (!payload || !payload.action) {
      return { success: false, error: 'Missing action parameter', data: null };
    }

    var action = payload.action;
    var data = payload.payload || {};
    var result;

    console.log('CRM Gateway called with action:', action);

    // Route the action and capture the raw result
    switch (action) {
      case 'GET_DASHBOARD_STATS':
        result = getDashboardStats(); break;
      case 'GET_PIPELINE':
        result = getPipelineData(); break;
      case 'GET_PROSPECTS':
        result = getProspectsData(); break;
      case 'GET_URGENT_PROSPECTS':
        result = getUrgentProspectsForDashboard(); break;
      case 'GET_RECENT_WINS':
        result = getRecentWins(); break;
      case 'GET_VALIDATION_LISTS':
        result = getValidationListsForDashboard(); break;
      case 'GET_PROSPECT_DETAILS':
        result = getProspectDetails(data.companyId); break;
      case 'GET_COMPANY_LIST':
        result = { success: true, data: getCompanyAutocompleteList() }; break;
      case 'GET_OUTREACH_DATA':
        result = getOutreachData(data.startDate, data.endDate); break;
      case 'LOG_OUTREACH':
        result = logOutreachFromDashboard(data); break;
      case 'DIAGNOSTIC':
        result = runDiagnostics(); break;
        
      // 🧠 CRM Brain Integration 
      case 'ASK_BRAIN':
        result = processBrainRequest(data); break;
      case 'GET_BRAIN_INSIGHTS':
        if (typeof CRMBrain !== 'undefined') {
          result = CRMBrain.getPipelineInsights();
        } else {
          result = { success: false, error: 'CRMBrain service not found', data: null };
        }
        break;
        
      // 📊 Sales Integration
      case 'GET_SALES_STATS':
        if (typeof SalesFunctions !== 'undefined') {
          result = SalesFunctions.getSalesSummary(data.companyName);
        } else {
          result = { success: false, error: 'SalesFunctions service not found', data: null };
        }
        break;
      case 'GET_SALES_BY_DATE':
        if (typeof SalesFunctions !== 'undefined') {
          result = SalesFunctions.getSalesByDateRange(data.startDate, data.endDate);
        } else {
          result = { success: false, error: 'SalesFunctions service not found', data: null };
        }
        break;
      case 'GET_TOP_MATERIALS':
        if (typeof SalesFunctions !== 'undefined') {
          result = SalesFunctions.getTopMaterials(data.limit);
        } else {
          result = { success: false, error: 'SalesFunctions service not found', data: null };
        }
        break;
      case 'GET_TOP_COMPANIES':
        if (typeof SalesFunctions !== 'undefined') {
          result = SalesFunctions.getTopCompanies(data.limit);
        } else {
          result = { success: false, error: 'SalesFunctions service not found', data: null };
        }
        break;
        
      // 📦 Active Container Integration
      case 'GET_ACTIVE_CONTAINERS':
        if (typeof ActiveContainerFunctions !== 'undefined') {
          result = ActiveContainerFunctions.getActiveContainers(data.filters);
        } else {
          result = { success: false, error: 'ActiveContainerFunctions service not found', data: null };
        }
        break;
      case 'GET_CONTAINER_STATS':
        if (typeof ActiveContainerFunctions !== 'undefined') {
          result = ActiveContainerFunctions.getContainerStats();
        } else {
          result = { success: false, error: 'ActiveContainerFunctions service not found', data: null };
        }
        break;
      case 'GET_CONTAINERS_BY_COMPANY':
        if (typeof ActiveContainerFunctions !== 'undefined') {
          result = ActiveContainerFunctions.getContainersByCompanyId(data.companyId);
        } else {
          result = { success: false, error: 'ActiveContainerFunctions service not found', data: null };
        }
        break;
        
      default:
        console.warn('Unknown CRM Gateway action:', action);
        result = { success: false, error: 'Unknown action: ' + action, data: null };
    }

    // ========================================================================
    // THE FIX: Scrub Date objects!
    // google.script.run returns NULL if the payload contains any native JS Dates.
    // This deep-clone instantly turns all Dates into standard ISO strings.
    // ========================================================================
    if (result) {
      return JSON.parse(JSON.stringify(result));
    }
    
    return result;

  } catch (e) {
    console.error('Error in crmGateway:', e);
    return { success: false, error: e.message, data: null };
  }
}

/**
 * GET_DASHBOARD_STATS - Returns complete dashboard data
 * Combines pipeline stats, urgent prospects, and recent wins
 * @returns {Object} Dashboard statistics object
 */
function getDashboardStats() {
  try {
    var funnel = getPipelineFunnelForDashboard();
    var prospects = getUrgentProspectsForDashboard();
    var wins = getRecentWins();

    return {
      success: true,
      data: {
        pipeline: funnel.data || {},
        prospects: prospects.data || [],
        accounts: wins.data || []
      },
      warnings: []
    };
  } catch (e) {
    console.error('Error in getDashboardStats:', e);
    return { 
      success: false, 
      error: e.message,
      data: {
        pipeline: {},
        prospects: [],
        accounts: []
      }
    };
  }
}

/**
 * GET_PIPELINE - Returns categorized pipeline data
 * Groups prospects by stage (hot, warm, cold, won)
 * @returns {Object} Pipeline data object
 */
function getPipelineData() {
  try {
    // Check if PipelineService is available
    if (!isPipelineServiceAvailable()) {
      console.warn('getPipelineData: PipelineService not available');
      return {
        success: true,
        data: {
          hot: [],
          warm: [],
          cold: [],
          won: [],
          counts: {
            total: 0,
            hot: 0,
            warm: 0,
            cold: 0,
            won: 0
          }
        },
        warning: 'PipelineService not available'
      };
    }
    
    var allProspects = PipelineService.getAllProspects();
    if (!Array.isArray(allProspects)) {
      allProspects = [];
    }
    
    var funnel = { total: 0, hot: 0, warm: 0, won: 0 };
    try {
      funnel = PipelineService.calculateFunnel();
    } catch (funnelError) {
      console.warn('Could not calculate funnel:', funnelError);
    }

    var hot = [];
    var warm = [];
    var cold = [];
    var won = [];

    // Categorize prospects using Settings-driven status values.
    // Canonical values sourced from VALIDATION_LIST → Statuses and
    // WORKFLOW_RULE outcome → status mappings in Settings.csv.
    allProspects.forEach(function(p) {
      // Normalize using the camelCase API_Name from System_Schema
      var status = (p.contactStatus || p.contactstatus || p['Contact Status'] || '').toString().trim();

      // Won: outcome was "Account Won" → Status becomes "Active", Stage becomes "Won"
      if (status === 'Won' || status === 'Active') {
        won.push(p);
      // Hot: explicit Interested (Hot) status from Settings WORKFLOW_RULE
      } else if (status === 'Interested (Hot)') {
        hot.push(p);
      // Warm: Interested (Warm) or general Nurture-stage statuses
      } else if (status === 'Interested (Warm)' || status === 'Nurture') {
        warm.push(p);
      // Cold bucket: Prospect, Outreach, Cold, Disqualified, Lost, Not Contacted, or unknown
      } else {
        cold.push(p);
      }
    });

    return {
      success: true,
      data: {
        hot: hot,
        warm: warm,
        cold: cold,
        won: won,
        counts: {
          total: allProspects.length,
          hot: hot.length,
          warm: warm.length,
          cold: cold.length,
          won: won.length
        }
      }
    };
  } catch (e) {
    console.error('Error in getPipelineData:', e);
    return { 
      success: false, 
      error: e.message,
      data: {
        hot: [],
        warm: [],
        cold: [],
        won: [],
        counts: {
          total: 0,
          hot: 0,
          warm: 0,
          cold: 0,
          won: 0
        }
      }
    };
  }
}

/**
 * getCalendarEvents - Fetches calendar events for a given date range
 * Returns follow-ups, visits, and overdue items grouped by date
 * @param {string} startDate - Start date in ISO format (YYYY-MM-DD)
 * @param {string} endDate - End date in ISO format (YYYY-MM-DD)
 * @returns {Object} Object with success flag and events data
 */
function getCalendarEvents(startDate, endDate) {
  try {
    var serviceCheck = checkRequiredServices();
    if (!serviceCheck.success) {
      return {
        success: false,
        error: serviceCheck.error,
        data: { events: [], overdue: [], stats: { total: 0, overdue: 0, today: 0, upcoming: 0 } }
      };
    }

    // Parse and validate dates using helper function
    var dateRange = _parseCalendarDateRange(startDate, endDate);
    var startObj = dateRange.start;
    var endObj = dateRange.end;
    var today = dateRange.today;

    // Fetch data using helper functions
    var prospects = _fetchCalendarProspects();
    var outreachData = _fetchCalendarOutreach();

    // Process events using helper functions
    var prospectEvents = _processProspectEvents(prospects, startObj, endObj, today);
    var outreachEvents = _processOutreachEvents(outreachData, startObj, endObj, today);

    // Combine and sort events
    var allEvents = prospectEvents.events.concat(outreachEvents.events);
    var overdueItems = prospectEvents.overdue;

    // Sort events by date
    allEvents.sort(function(a, b) {
      return new Date(a.date) - new Date(b.date);
    });

    // Sort overdue by urgency
    overdueItems.sort(function(a, b) {
      return (b.urgencyScore || 0) - (a.urgencyScore || 0);
    });

    // Calculate combined stats
    var stats = _calculateEventStats(prospectEvents.events, outreachEvents.events, overdueItems);

    return {
      success: true,
      data: {
        events: allEvents,
        overdue: overdueItems,
        stats: stats,
        dateRange: {
          start: startObj.toISOString().split('T')[0],
          end: endObj.toISOString().split('T')[0]
        }
      }
    };

  } catch (e) {
    console.error('Error in getCalendarEvents:', e);
    return {
      success: false,
      error: e.message,
      data: {
        events: [],
        overdue: [],
        stats: { total: 0, overdue: 0, today: 0, upcoming: 0 }
      }
    };
  }
}

/**
 * Helper: Parse and validate date range for calendar
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {Object} Object with start, end, and today dates
 */
function _parseCalendarDateRange(startDate, endDate) {
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var startObj = null;
  var endObj = null;

  if (typeof SharedUtils !== 'undefined' && typeof SharedUtils.parseDate === 'function') {
    startObj = startDate ? SharedUtils.parseDate(startDate) : new Date(today);
    endObj = endDate ? SharedUtils.parseDate(endDate) : new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  } else {
    startObj = startDate ? new Date(startDate) : new Date(today);
    endObj = endDate ? new Date(endDate) : new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  // Validate dates
  if (!startObj || isNaN(startObj.getTime())) {
    startObj = new Date(today);
  }
  if (!endObj || isNaN(endObj.getTime())) {
    endObj = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  return { start: startObj, end: endObj, today: today };
}

/**
 * Helper: Fetch prospects with follow-up dates for calendar
 * @returns {Array} Array of prospect records
 */
function _fetchCalendarProspects() {
  var prospects = [];
  if (typeof PipelineService !== 'undefined' && PipelineService !== null) {
    try {
      prospects = PipelineService.getAllProspects() || [];
    } catch (e) {
      console.warn('Could not fetch prospects for calendar:', e);
    }
  }
  return prospects;
}

/**
 * Helper: Fetch outreach history for calendar
 * @returns {Array} Array of outreach records
 */
function _fetchCalendarOutreach() {
  var outreachData = [];
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
      var outreachSheet = ss.getSheetByName(CONFIG.SHEETS.OUTREACH);
      if (outreachSheet) {
        var lastRow = outreachSheet.getLastRow();
        if (lastRow > 1) {
          var headers = outreachSheet.getRange(1, 1, 1, outreachSheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim(); });
          var dataRows = outreachSheet.getRange(2, 1, Math.min(lastRow - 1, 500), headers.length).getValues();
          
          var companyIdx = SharedUtils.findColumnIndex(headers, 'Company', 'OUTREACH');
          var dateIdx = SharedUtils.findColumnIndex(headers, 'Visit Date', 'OUTREACH');
          var outcomeIdx = SharedUtils.findColumnIndex(headers, 'Outcome', 'OUTREACH');
          var nextVisitIdx = SharedUtils.findColumnIndex(headers, 'Next Visit Date', 'OUTREACH');
          var typeIdx = SharedUtils.findColumnIndex(headers, 'Contact Type', 'OUTREACH');

          for (var i = 0; i < dataRows.length; i++) {
            var row = dataRows[i];
            outreachData.push({
              company: companyIdx >= 0 ? row[companyIdx] : '',
              visitDate: dateIdx >= 0 ? row[dateIdx] : '',
              outcome: outcomeIdx >= 0 ? row[outcomeIdx] : '',
              nextVisitDate: nextVisitIdx >= 0 ? row[nextVisitIdx] : '',
              contactType: typeIdx >= 0 ? row[typeIdx] : 'Visit'
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('Could not fetch outreach data for calendar:', e);
  }
  return outreachData;
}

/**
 * Helper: Process prospect records into calendar events
 * @param {Array} prospects - Array of prospect records
 * @param {Date} startObj - Start date
 * @param {Date} endObj - End date
 * @param {Date} today - Today's date
 * @returns {Object} Object with events array and overdue array
 */
function _processProspectEvents(prospects, startObj, endObj, today) {
  var events = [];
  var overdueItems = [];

  prospects.forEach(function(p) {
    var dueDateRaw = p.nextStepsDueDate || p.nextstepsduedate || p['Next Steps Due Date'] || '';
    var companyName = p.companyName || p.companyname || p['Company Name'] || 'Unknown';
    var companyId = p.companyId || p.companyid || p['Company ID'] || '';
    var status = p.contactStatus || p.contactstatus || p['Contact Status'] || '';
    var urgency = p.urgencyBand || p.urgencyband || p['UrgencyBand'] || '';
    var urgencyScore = p.urgencyScore || p.urgencyscore || p['Urgency Score'] || 0;
    var lastOutcome = p.lastOutcome || p.lastoutcome || p['Last Outcome'] || '';

    if (!dueDateRaw) return;

    var dueDate = null;
    if (typeof SharedUtils !== 'undefined' && typeof SharedUtils.parseDate === 'function') {
      dueDate = SharedUtils.parseDate(dueDateRaw);
    } else {
      dueDate = new Date(dueDateRaw);
    }

    if (!dueDate || isNaN(dueDate.getTime())) return;

    dueDate.setHours(0, 0, 0, 0);

    var event = {
      id: 'prospect-' + companyId,
      type: 'followup',
      title: companyName,
      date: dueDate.toISOString().split('T')[0],
      dateFormatted: typeof formatDate === 'function' ? formatDate(dueDate) : dueDate.toLocaleDateString(),
      status: status,
      urgency: urgency,
      urgencyScore: urgencyScore,
      lastOutcome: lastOutcome,
      companyId: companyId,
      isOverdue: dueDate < today
    };

    // Determine priority class
    if (event.isOverdue) {
      event.priorityClass = 'overdue';
      overdueItems.push(event);
    } else if (dueDate.getTime() === today.getTime()) {
      event.priorityClass = 'today';
    } else if (dueDate >= startObj && dueDate <= endObj) {
      event.priorityClass = urgencyScore >= 115 ? 'high' : (urgencyScore >= 75 ? 'medium' : 'low');
    }

    if (dueDate >= startObj && dueDate <= endObj) {
      events.push(event);
    }
  });

  return { events: events, overdue: overdueItems };
}

/**
 * Helper: Process outreach records into calendar events
 * @param {Array} outreachData - Array of outreach records
 * @param {Date} startObj - Start date
 * @param {Date} endObj - End date
 * @param {Date} today - Today's date
 * @returns {Object} Object with events array
 */
function _processOutreachEvents(outreachData, startObj, endObj, today) {
  var events = [];

  outreachData.forEach(function(o, idx) {
    var nextDateRaw = o.nextVisitDate || '';
    if (!nextDateRaw) return;

    var nextDate = null;
    if (typeof SharedUtils !== 'undefined' && typeof SharedUtils.parseDate === 'function') {
      nextDate = SharedUtils.parseDate(nextDateRaw);
    } else {
      nextDate = new Date(nextDateRaw);
    }

    if (!nextDate || isNaN(nextDate.getTime())) return;

    nextDate.setHours(0, 0, 0, 0);

    if (nextDate >= startObj && nextDate <= endObj) {
      var event = {
        id: 'outreach-' + idx,
        type: 'scheduled',
        title: o.company || 'Unknown',
        date: nextDate.toISOString().split('T')[0],
        dateFormatted: typeof formatDate === 'function' ? formatDate(nextDate) : nextDate.toLocaleDateString(),
        outcome: o.outcome || '',
        contactType: o.contactType || 'Visit',
        priorityClass: 'scheduled',
        isOverdue: nextDate < today
      };

      events.push(event);
    }
  });

  return { events: events };
}

/**
 * Helper: Calculate event statistics
 * @param {Array} prospectEvents - Array of prospect events
 * @param {Array} outreachEvents - Array of outreach events
 * @param {Array} overdueItems - Array of overdue items
 * @returns {Object} Stats object
 */
function _calculateEventStats(prospectEvents, outreachEvents, overdueItems) {
  var stats = { total: 0, overdue: 0, today: 0, upcoming: 0 };

  // Count prospect events
  prospectEvents.forEach(function(event) {
    stats.total++;
    if (event.priorityClass === 'overdue') {
      stats.overdue++;
    } else if (event.priorityClass === 'today') {
      stats.today++;
    } else if (event.priorityClass === 'high' || event.priorityClass === 'medium' || event.priorityClass === 'low') {
      stats.upcoming++;
    }
  });

  // Count outreach events
  stats.total += outreachEvents.length;

  return stats;
}

/**
 * GET_VALIDATION_LISTS - Returns validation lists for dashboard dropdowns
 * Reads directly from the Settings sheet to avoid circular reference.
 * @returns {Object} Validation lists with success flag
 */
function getValidationListsForDashboard() {
  try {
    // Read validation data directly from Settings sheet
    var result = {};
    try {
      var accessResult = SharedUtils.checkSpreadsheetAccess('getValidationListsForDashboard');
      if (accessResult.success) {
        var ss = accessResult.spreadsheet;
        var settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
        if (settingsSheet && settingsSheet.getLastRow() > 1) {
          var lastCol = settingsSheet.getLastColumn();
          var data = settingsSheet.getRange(1, 1, settingsSheet.getLastRow(), lastCol).getValues();
          var headers = data[0].map(function(h) { return String(h).trim(); });

          var typeIdx = headers.indexOf('Category');
          var keyIdx = headers.indexOf('Key');
          var val1Idx = headers.indexOf('Value_1');

          if (typeIdx >= 0 && keyIdx >= 0) {
            for (var i = 1; i < data.length; i++) {
              var row = data[i];
              var type = String(row[typeIdx] || '').trim();
              var key = String(row[keyIdx] || '').trim();
              var val1 = val1Idx >= 0 ? String(row[val1Idx] || '').trim() : '';

              if (type === 'VALIDATION_LIST' && key && val1) {
                if (!result[key]) {
                  result[key] = { name: key, values: [] };
                }
                result[key].values.push(val1);
              }
            }
          }
        }
      }
    } catch (settingsErr) {
      console.warn('Could not read Settings for validation lists:', settingsErr);
    }

    return {
      success: true,
      data: result
    };
  } catch (e) {
    console.error('Error in getValidationListsForDashboard:', e);
    return {
      success: false,
      error: e.message,
      data: {}
    };
  }
}

/**
 * showPipelineModal - Returns HTML for pipeline modal display
 * Called by dashboard.html to show pipeline view
 * @returns {Object} Object with success flag and HTML content
 */
function showPipelineModal() {
  try {
    var pipelineData = getPipelineData();
    
    if (!pipelineData.success) {
      return {
        success: false,
        error: pipelineData.error || 'Unknown error',
        html: '<div class="error">Error loading pipeline: ' + (pipelineData.error || 'Unknown error') + '</div>'
      };
    }
    
    var html = '<div class="pipeline-modal">';
    html += '<h2>Pipeline Overview</h2>';
    
    var stages = ['hot', 'warm', 'cold', 'won'];
    var stageLabels = { hot: 'Hot Prospects', warm: 'Warm Prospects', cold: 'Cold Prospects', won: 'Won Accounts' };
    
    stages.forEach(function(stage) {
      var prospects = pipelineData.data[stage] || [];
      html += '<div class="pipeline-stage">';
      html += '<h3>' + stageLabels[stage] + ' (' + prospects.length + ')</h3>';
      
      if (prospects.length === 0) {
        html += '<p class="empty">No prospects in this stage</p>';
      } else {
        html += '<ul class="prospect-list">';
        prospects.slice(0, 10).forEach(function(p) {
          html += '<li>' + (p.companyName || p.companyname || 'Unknown') + '</li>';
        });
        if (prospects.length > 10) {
          html += '<li class="more">... and ' + (prospects.length - 10) + ' more</li>';
        }
        html += '</ul>';
      }
      
      html += '</div>';
    });
    
    html += '</div>';
    return {
      success: true,
      html: html
    };
    
  } catch (e) {
    console.error('Error in showPipelineModal:', e);
    return {
      success: false,
      error: e.message,
      html: '<div class="error">Error loading pipeline modal: ' + e.message + '</div>'
    };
  }
}

/**
 * showAccountsModal - Returns HTML for accounts modal display
 * Called by dashboard.html to show accounts view
 * @returns {Object} Object with success flag and HTML content
 */
function showAccountsModal() {
  try {
    var accountsData = getRecentWins();
    
    if (!accountsData.success) {
      return {
        success: false,
        error: accountsData.error || 'Unknown error',
        html: '<div class="error">Error loading accounts: ' + (accountsData.error || 'Unknown error') + '</div>'
      };
    }
    
    var accounts = accountsData.data || [];
    
    var html = '<div class="accounts-modal">';
    html += '<h2>Active Accounts</h2>';
    
    if (accounts.length === 0) {
      html += '<p class="empty">No active accounts found</p>';
    } else {
      html += '<div class="accounts-list">';
      accounts.forEach(function(account) {
        var companyName = account.companyName || account.companyname || account['company name'] || 'Unknown';
        var status = account.contactStatus || account.contactstatus || account['contact status'] || 'Active';
        var lastContact = account.lastOutreachDate || account.lastoutreachdate || account['last outreach date'] || '';
        
        html += '<div class="account-card">';
        html += '<h4>' + companyName + '</h4>';
        html += '<p>Status: ' + status + '</p>';
        if (lastContact) {
          html += '<p>Last Contact: ' + lastContact + '</p>';
        }
        html += '</div>';
      });
      html += '</div>';
    }
    
    html += '</div>';
    return {
      success: true,
      html: html
    };
    
  } catch (e) {
    console.error('Error in showAccountsModal:', e);
    return {
      success: false,
      error: e.message,
      html: '<div class="error">Error loading accounts modal: ' + e.message + '</div>'
    };
  }
}

/**
 * showCalendarModal - Returns HTML for calendar modal display
 * Called by dashboard.html to show calendar view
 * @returns {Object} Object with success flag and HTML content
 */
function showCalendarModal() {
  try {
    var prospectsData = getUrgentProspectsForDashboard();
    
    if (!prospectsData.success) {
      return {
        success: false,
        error: prospectsData.error || 'Unknown error',
        html: '<div class="error">Error loading calendar data: ' + (prospectsData.error || 'Unknown error') + '</div>'
      };
    }
    
    var prospects = prospectsData.data || [];
    
    var html = '<div class="calendar-modal">';
    html += '<h2>Upcoming Follow-ups</h2>';
    
    if (prospects.length === 0) {
      html += '<p class="empty">No upcoming follow-ups scheduled</p>';
    } else {
      html += '<div class="calendar-list">';
      prospects.forEach(function(p) {
        var companyName = p.companyName || p.companyname || 'Unknown';
        var dueDate = p.nextStepsDueDate || p.nextstepsduedate || p['next steps due date'] || 'Not scheduled';
        var status = p.contactStatus || p.contactstatus || p['contact status'] || 'Unknown';
        var urgency = p.urgencyBand || p.urgencyband || 'Unknown';
        
        html += '<div class="calendar-item">';
        html += '<h4>' + companyName + '</h4>';
        html += '<p>Due: ' + dueDate + '</p>';
        html += '<p>Status: ' + status + '</p>';
        html += '<p>Urgency: ' + urgency + '</p>';
        html += '</div>';
      });
      html += '</div>';
    }
    
    html += '</div>';
    return {
      success: true,
      html: html
    };
    
  } catch (e) {
    console.error('Error in showCalendarModal:', e);
    return {
      success: false,
      error: e.message,
      html: '<div class="error">Error loading calendar modal: ' + e.message + '</div>'
    };
  }
}

/**
 * getValidationLists - Alias for getValidationListsForDashboard
 * Called by dashboard.html loadValidationLists()
 * @returns {Object} Validation lists with success flag
 */
function getValidationLists() {
  return getValidationListsForDashboard();
}

/**
 * getOutreachData - Returns outreach entries within a date range
 * Called by dashboard.html loadStats() and generateRoute()
 * @param {string} startDate - Start date in YYYY-MM-DD or MM/DD/YYYY format
 * @param {string} endDate - End date in YYYY-MM-DD or MM/DD/YYYY format
 * @returns {Object} Object with success flag and array of outreach entries
 */
function getOutreachData(startDate, endDate) {
  try {
    var serviceCheck = checkRequiredServices();
    if (!serviceCheck.success) {
      return { success: false, error: serviceCheck.error, data: [] };
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return { success: false, error: 'No active spreadsheet', data: [] };
    }

    var outreachSheet = ss.getSheetByName(CONFIG.SHEETS.OUTREACH);
    if (!outreachSheet) {
      return { success: false, error: 'Outreach sheet not found', data: [] };
    }

    var lastRow = outreachSheet.getLastRow();
    if (lastRow < 2) {
      return { success: true, data: [] };
    }

    var headers = outreachSheet.getRange(1, 1, 1, outreachSheet.getLastColumn())
      .getValues()[0].map(function(h) { return String(h).trim(); });
    var dataRows = outreachSheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

    // Parse filter dates
    var startObj = null;
    var endObj = null;
    if (startDate) {
      startObj = typeof SharedUtils !== 'undefined' && SharedUtils.parseDate
        ? SharedUtils.parseDate(startDate) : new Date(startDate);
    }
    if (endDate) {
      endObj = typeof SharedUtils !== 'undefined' && SharedUtils.parseDate
        ? SharedUtils.parseDate(endDate) : new Date(endDate);
    }
    if (endObj) { endObj.setHours(23, 59, 59, 999); }

    var results = [];
    var dateColIdx = headers.indexOf('Visit Date');
    if (dateColIdx < 0) { dateColIdx = 0; } // fallback to col A

    for (var i = 0; i < dataRows.length; i++) {
      var row = dataRows[i];
      if (!row || !row[dateColIdx]) continue;

      var rowDate = typeof SharedUtils !== 'undefined' && SharedUtils.parseDate
        ? SharedUtils.parseDate(row[dateColIdx]) : new Date(row[dateColIdx]);

      if (!rowDate || isNaN(rowDate.getTime())) continue;

      // Date range filter
      if (startObj && rowDate < startObj) continue;
      if (endObj && rowDate > endObj) continue;

      // Build generic object from headers
      var obj = {};
      for (var h = 0; h < headers.length; h++) {
        obj[headers[h]] = row[h];
      }
      // Normalise key fields for UI use
      obj.company = obj['Company'] || obj['Company Name'] || '';
      obj.Company = obj.company;
      obj.Status = obj['Contact Status'] || obj['Status'] || '';
      obj.Outcome = obj['Outcome'] || '';
      obj.visitDate = obj['Visit Date'] || '';

      results.push(obj);
    }

    return { success: true, data: results };
  } catch (e) {
    console.error('Error in getOutreachData:', e);
    return { success: false, error: e.message, data: [] };
  }
}

/**
 * getCompanyAutocompleteList - Returns list of companies for autocomplete
 * Called by dashboard.html loadCompanyAutocompleteList()
 * @returns {Array} Array of {name, id} objects
 */
function getCompanyAutocompleteList() {
  try {
    var serviceCheck = checkRequiredServices();
    if (!serviceCheck.success) {
      return [];
    }

    var prospects = [];
    if (typeof PipelineService !== 'undefined' && PipelineService !== null) {
      try {
        prospects = PipelineService.getAllProspects() || [];
      } catch (e) {
        console.warn('PipelineService.getAllProspects failed in autocomplete:', e);
      }
    }

    // Fallback: read Prospects sheet directly
    if (!prospects || prospects.length === 0) {
      try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var sheet = ss ? ss.getSheetByName(CONFIG.SHEETS.PROSPECTS) : null;
        if (sheet && sheet.getLastRow() > 1) {
          var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim(); });
          var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
          var nameIdx = headers.indexOf('Company Name');
          var idIdx = headers.indexOf('Company ID');
          if (nameIdx < 0) { nameIdx = 0; }

          for (var i = 0; i < rows.length; i++) {
            var name = rows[i][nameIdx];
            if (name) {
              prospects.push({
                companyName: String(name).trim(),
                companyId: idIdx >= 0 ? String(rows[i][idIdx] || '').trim() : ''
              });
            }
          }
        }
      } catch (sheetErr) {
        console.warn('Direct sheet read failed in autocomplete:', sheetErr);
      }
    }

    return (prospects || []).map(function(p) {
      return {
        name: p.companyName || p.companyname || p['Company Name'] || '',
        id: p.companyId || p.companyid || p['Company ID'] || ''
      };
    }).filter(function(p) { return p.name; });

  } catch (e) {
    console.error('Error in getCompanyAutocompleteList:', e);
    return [];
  }
}

/**
 * getLastTouchInfo - Returns last outreach info for a company by name
 * Called by dashboard.html loadLastTouchInfo()
 * @param {string} companyName - Company name to look up
 * @returns {Object} Object with success flag and last-touch data
 */
function getLastTouchInfo(companyName) {
  try {
    if (!companyName) {
      return { success: false, error: 'Missing companyName', data: null };
    }

    var normalizedSearch = companyName.toString().toLowerCase().trim();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return { success: false, error: 'No spreadsheet', data: null };
    }

    // Check Prospects for quick summary
    var prospectsSheet = ss.getSheetByName(CONFIG.SHEETS.PROSPECTS);
    var lastContact = null;
    var lastOutcome = null;
    var nextSteps = null;
    var daysSince = null;
    var companyId = null;

    if (prospectsSheet && prospectsSheet.getLastRow() > 1) {
      var pHeaders = prospectsSheet.getRange(1, 1, 1, prospectsSheet.getLastColumn())
        .getValues()[0].map(function(h) { return String(h).trim(); });
      var pRows = prospectsSheet.getRange(2, 1, prospectsSheet.getLastRow() - 1, pHeaders.length).getValues();

      var nameIdx = pHeaders.indexOf('Company Name');
      var idIdx = pHeaders.indexOf('Company ID');
      var lastDateIdx = pHeaders.indexOf('Last Outreach Date');
      var lastOutcomeIdx = pHeaders.indexOf('Last Outcome');
      var nextDueIdx = pHeaders.indexOf('Next Steps Due Date');
      var daysIdx = pHeaders.indexOf('Days Since Last Contact');

      for (var i = 0; i < pRows.length; i++) {
        var pName = String(pRows[i][nameIdx] || '').toLowerCase().trim();
        if (pName === normalizedSearch) {
          lastContact = lastDateIdx >= 0 ? pRows[i][lastDateIdx] : null;
          lastOutcome = lastOutcomeIdx >= 0 ? pRows[i][lastOutcomeIdx] : null;
          nextSteps = nextDueIdx >= 0 ? pRows[i][nextDueIdx] : null;
          daysSince = daysIdx >= 0 ? pRows[i][daysIdx] : null;
          companyId = idIdx >= 0 ? pRows[i][idIdx] : null;
          break;
        }
      }
    }

    // Format dates for display
    var formatForDisplay = function(d) {
      if (!d) return '--';
      if (d instanceof Date) {
        return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
      }
      return String(d);
    };

    return {
      success: true,
      data: {
        lastContact: formatForDisplay(lastContact),
        daysSince: daysSince !== null && daysSince !== '' ? Number(daysSince) || 0 : null,
        lastOutcome: lastOutcome ? String(lastOutcome) : '--',
        nextSteps: formatForDisplay(nextSteps),
        companyId: companyId ? String(companyId) : null
      }
    };

  } catch (e) {
    console.error('Error in getLastTouchInfo:', e);
    return { success: false, error: e.message, data: null };
  }
}

/**
 * checkProspectStatus - Checks if a company exists in the Prospects sheet
 * Called by dashboard.html checkProspectStatus()
 * @param {string} companyName - Company name to look up
 * @returns {Object} Object with success, exists, companyId, status, lastOutcome
 */
function checkProspectStatus(companyName) {
  try {
    if (!companyName) {
      return { success: false, error: 'Missing companyName', exists: false };
    }

    var normalizedSearch = companyName.toString().toLowerCase().trim();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return { success: false, error: 'No spreadsheet', exists: false };
    }

    var sheet = ss.getSheetByName(CONFIG.SHEETS.PROSPECTS);
    if (!sheet || sheet.getLastRow() < 2) {
      return { success: true, exists: false };
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0].map(function(h) { return String(h).trim(); });
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();

    var nameIdx = headers.indexOf('Company Name');
    var idIdx = headers.indexOf('Company ID');
    var statusIdx = headers.indexOf('Contact Status');
    var lastOutcomeIdx = headers.indexOf('Last Outcome');
    var daysIdx = headers.indexOf('Days Since Last Contact');

    for (var i = 0; i < rows.length; i++) {
      var pName = String(rows[i][nameIdx] || '').toLowerCase().trim();
      if (pName === normalizedSearch) {
        return {
          success: true,
          exists: true,
          companyId: idIdx >= 0 ? String(rows[i][idIdx] || '') : '',
          status: statusIdx >= 0 ? String(rows[i][statusIdx] || '') : '',
          lastOutcome: lastOutcomeIdx >= 0 ? String(rows[i][lastOutcomeIdx] || '') : '',
          daysSinceLastContact: daysIdx >= 0 ? Number(rows[i][daysIdx]) || 0 : 0
        };
      }
    }

    return { success: true, exists: false };

  } catch (e) {
    console.error('Error in checkProspectStatus:', e);
    return { success: false, error: e.message, exists: false };
  }
}

/**
 * getCompanyDetailsForAutofill - Returns full company details for form autofill
 * Called by dashboard.html selectCompany()
 * Delegates to getProspectDetails() and flattens the response.
 * @param {string} companyId - Company ID to look up
 * @returns {Object} Object with success flag and flattened company data
 */
function getCompanyDetailsForAutofill(companyId) {
  try {
    var detailsResult = getProspectDetails(companyId);
    if (!detailsResult.success || !detailsResult.data) {
      return { success: false, error: detailsResult.error || 'Not found', data: null };
    }

    var p = detailsResult.data.prospect || {};

    // Also try to pull Contact Name/Phone from Contacts sheet if available
    var contactName = '';
    var contactPhone = '';
    try {
      var accessResult = SharedUtils.checkSpreadsheetAccess('getCompanyDetailsForAutofill');
      if (accessResult.success) {
        var ss = accessResult.spreadsheet;
        var contactsSheet = ss ? ss.getSheetByName(CONFIG.SHEETS.CONTACTS) : null;
        if (contactsSheet && contactsSheet.getLastRow() > 1) {
          var cHeaders = contactsSheet.getRange(1, 1, 1, contactsSheet.getLastColumn())
            .getValues()[0].map(function(h) { return String(h).trim(); });
          var cRows = contactsSheet.getRange(2, 1, contactsSheet.getLastRow() - 1, cHeaders.length).getValues();

          var cIdIdx = cHeaders.indexOf('Company ID');
          var cNameIdx = cHeaders.indexOf('Contact Name');
          var cPhoneIdx = cHeaders.indexOf('Phone');
          var cEmailIdx = cHeaders.indexOf('Email');

          var normalizedId = String(companyId).toLowerCase().trim();
          for (var i = 0; i < cRows.length; i++) {
            var cId = String(cRows[i][cIdIdx] || '').toLowerCase().trim();
            if (cId === normalizedId) {
              contactName = cNameIdx >= 0 ? String(cRows[i][cNameIdx] || '') : '';
              contactPhone = cPhoneIdx >= 0 ? String(cRows[i][cPhoneIdx] || '') : '';
              break;
            }
          }
        }
      }
    } catch (contactErr) {
      console.warn('Could not fetch contacts for autofill:', contactErr);
    }

    return {
      success: true,
      data: {
        companyId: p.companyId || companyId,
        companyName: p.companyName || '',
        address: p.address || '',
        city: p.city || '',
        state: 'TX',
        zip: p.zipCode || '',
        industry: p.industry || '',
        contactName: contactName || '',
        phone: contactPhone || '',
        email: ''
      }
    };

  } catch (e) {
    console.error('Error in getCompanyDetailsForAutofill:', e);
    return { success: false, error: e.message, data: null };
  }
}

/**
 * generateRouteForCompanies - Opens Google Maps with a multi-stop route
 * Called by dashboard.html generateRoute()
 * @param {Array} companies - Array of company names/addresses
 */
function generateRouteForCompanies(companies) {
  try {
    if (!companies || companies.length === 0) return;

    // Build Maps URL — waypoints joined with '/'
    var base = 'https://www.google.com/maps/dir/';
    var stops = companies.slice(0, 10).map(function(c) {
      return encodeURIComponent(String(c) + ', Tyler, TX');
    });
    var url = base + stops.join('/');

    // Open via HtmlService modal (GAS can't do window.open server-side)
    var html = HtmlService.createHtmlOutput(
      '<script>window.open(' + JSON.stringify(url) + ', "_blank"); google.script.host.close();</script>'
    ).setWidth(10).setHeight(10);

    var ui = SpreadsheetApp.getUi();
    ui.showModalDialog(html, 'Opening Route...');
  } catch (e) {
    console.error('Error in generateRouteForCompanies:', e);
  }
}

/**
 * openSuiteCRM - Opens the CRM Suite sidebar from the dashboard
 * Called by dashboard.html quickAction('pipeline')
 */
function openSuiteCRM() {
  try {
    var html = HtmlService.createHtmlOutputFromFile('CRM_Suite')
      .setTitle('K&L CRM Suite')
      .setWidth(450);
    SpreadsheetApp.getUi().showSidebar(html);
  } catch (e) {
    console.error('Error in openSuiteCRM:', e);
  }
}

/**
 * showAccountsSheet - Activates the Accounts sheet in the spreadsheet
 * Called by dashboard.html quickAction('accounts')
 * @returns {Object} Result with spreadsheet URL
 */
function showAccountsSheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return { success: false, error: 'No active spreadsheet' };
    }

    // Try to activate the Accounts sheet
    var accountsSheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEETS && CONFIG.SHEETS.ACCOUNTS)
      ? CONFIG.SHEETS.ACCOUNTS : 'Accounts';
    var sheet = ss.getSheetByName(accountsSheetName);
    if (sheet) {
      ss.setActiveSheet(sheet);
    }

    return {
      success: true,
      data: {
        url: ss.getUrl() + '#gid=' + (sheet ? sheet.getSheetId() : 0)
      }
    };
  } catch (e) {
    console.error('Error in showAccountsSheet:', e);
    return { success: false, error: e.message };
  }
}

/**
 * getCalendarMonthData - Returns calendar grid data for a specific month
 * @param {number} year - Year (e.g., 2024)
 * @param {number} month - Month (1-12)
 * @returns {Object} Calendar grid data with events
 */
function getCalendarMonthData(year, month) {
  try {
    // Validate inputs
    if (!year || !month || month < 1 || month > 12) {
      var now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
    }

    // Calculate date range for the month
    var startDate = new Date(year, month - 1, 1);
    var endDate = new Date(year, month, 0); // Last day of month

    // Pad to include partial weeks
    var firstDayOfWeek = startDate.getDay(); // 0 = Sunday
    var padStart = new Date(startDate);
    padStart.setDate(padStart.getDate() - firstDayOfWeek);

    var lastDayOfWeek = endDate.getDay();
    var padEnd = new Date(endDate);
    padEnd.setDate(padEnd.getDate() + (6 - lastDayOfWeek));

    // Get events for the extended range
    var eventsResult = getCalendarEvents(
      padStart.toISOString().split('T')[0],
      padEnd.toISOString().split('T')[0]
    );

    if (!eventsResult.success) {
      return {
        success: false,
        error: eventsResult.error,
        data: null
      };
    }

    // Build calendar grid
    var grid = [];
    var currentDate = new Date(padStart);
    var events = eventsResult.data.events || [];
    var overdue = eventsResult.data.overdue || [];

    while (currentDate <= padEnd) {
      var dateStr = currentDate.toISOString().split('T')[0];
      var dayEvents = events.filter(function(e) {
        return e.date === dateStr;
      });

      var isToday = currentDate.toDateString() === new Date().toDateString();
      var isCurrentMonth = currentDate.getMonth() === month - 1;

      grid.push({
        date: dateStr,
        day: currentDate.getDate(),
        dayOfWeek: currentDate.getDay(),
        isToday: isToday,
        isCurrentMonth: isCurrentMonth,
        events: dayEvents,
        eventCount: dayEvents.length
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      success: true,
      data: {
        year: year,
        month: month,
        monthName: Utilities.formatDate(new Date(year, month - 1, 1), CONFIG.TIMEZONE, 'MMMM'),
        grid: grid,
        events: eventsResult.data.events || [], // Exposed for dashboard.html result.data.events reads
        stats: eventsResult.data.stats,
        overdue: overdue.slice(0, 10) // Top 10 overdue items
      }
    };

  } catch (e) {
    console.error('Error in getCalendarMonthData:', e);
    return {
      success: false,
      error: e.message,
      data: null
    };
  }
}

/**
 * logOutreachFromDashboard - Saves a new outreach interaction from the CRM Suite UI
 * Delegates to OutreachFunctions.addOutreachComplete which handles sheet writes,
 * Prospects sync, and Account Won migration.
 * @param {Object} data - Form data from the Log Outreach tab
 * @returns {Object} { success, outreachId, companyId, error }
 */
function logOutreachFromDashboard(data) {
  try {
    if (!data || !data.company) {
      return { success: false, error: 'Company name is required', data: null };
    }
    if (!data.outcome) {
      return { success: false, error: 'Outcome is required', data: null };
    }

    // Delegate to OutreachFunctions.addOutreachComplete (OutreachFunctions.js,
    // which loads after DashboardBackend.js alphabetically — safe to call at runtime).
    if (typeof OutreachFunctions === 'undefined' ||
        typeof OutreachFunctions.addOutreachComplete !== 'function') {
      return {
        success: false,
        error: 'OutreachFunctions service not loaded. Deploy and retry.',
        data: null
      };
    }

    var result = OutreachFunctions.addOutreachComplete({
      company:       data.company,
      companyName:   data.company,
      outcome:       data.outcome,
      activityType:  data.activityType || data.contactType || 'Visit',
      notes:         data.notes || '',
      nextVisitDate: data.nextVisitDate || '',
      competitor:    data.competitor || 'None',
      outreachId:    data.outreachId || ''
    });

    if (result && result.success) {
      console.log('logOutreachFromDashboard: Success for', data.company, '— LID:', result.outreachId);
      return {
        success: true,
        outreachId: result.outreachId || '',
        companyId:  result.companyId || '',
        message:    result.message || 'Interaction logged successfully'
      };
    }

    return { success: false, error: result.error || 'Unknown error from OutreachFunctions', data: null };

  } catch (e) {
    console.error('Error in logOutreachFromDashboard:', e);
    return { success: false, error: e.message, data: null };
  }
}

/**
 * runDiagnostics - Diagnostic endpoint to check service availability
 * Returns status of all required services
 * @returns {Object} Diagnostic results
 */
function runDiagnostics() {
  var diagnostics = {
    timestamp: new Date().toISOString(),
    services: {},
    issues: []
  };
  
  // Check CONFIG
  try {
    diagnostics.services.CONFIG = {
      available: typeof CONFIG !== 'undefined' && CONFIG !== null,
      hasSCHEMA: typeof CONFIG !== 'undefined' && CONFIG.SCHEMA !== undefined,
      hasSHEETS: typeof CONFIG !== 'undefined' && CONFIG.SHEETS !== undefined
    };
    if (!diagnostics.services.CONFIG.available) diagnostics.issues.push('CONFIG not available');
  } catch (e) {
    diagnostics.services.CONFIG = { available: false, error: e.message };
    diagnostics.issues.push('CONFIG check failed: ' + e.message);
  }
  
  // Check SharedUtils
  try {
    diagnostics.services.SharedUtils = {
      available: typeof SharedUtils !== 'undefined' && SharedUtils !== null,
      hasGetSafeSheetData: typeof SharedUtils !== 'undefined' && typeof SharedUtils.getSafeSheetData === 'function'
    };
    if (!diagnostics.services.SharedUtils.available) diagnostics.issues.push('SharedUtils not available');
  } catch (e) {
    diagnostics.services.SharedUtils = { available: false, error: e.message };
    diagnostics.issues.push('SharedUtils check failed: ' + e.message);
  }
  
  // Check PipelineService
  try {
    diagnostics.services.PipelineService = {
      available: typeof PipelineService !== 'undefined' && PipelineService !== null,
      hasGetUrgentProspects: typeof PipelineService !== 'undefined' && typeof PipelineService.getUrgentProspects === 'function',
      hasGetAllProspects: typeof PipelineService !== 'undefined' && typeof PipelineService.getAllProspects === 'function'
    };
    if (!diagnostics.services.PipelineService.available) diagnostics.issues.push('PipelineService not available');
  } catch (e) {
    diagnostics.services.PipelineService = { available: false, error: e.message };
    diagnostics.issues.push('PipelineService check failed: ' + e.message);
  }
  
  // Check OutreachFunctions
  try {
    diagnostics.services.OutreachFunctions = {
      available: typeof OutreachFunctions !== 'undefined' && OutreachFunctions !== null,
      hasAddOutreachComplete: typeof OutreachFunctions !== 'undefined' && typeof OutreachFunctions.addOutreachComplete === 'function'
    };
  } catch (e) {
    diagnostics.services.OutreachFunctions = { available: false, error: e.message };
  }
  
  // Test SharedUtils.getSafeSheetData if available
  if (diagnostics.services.SharedUtils.hasGetSafeSheetData) {
    try {
      var testData = SharedUtils.getSafeSheetData(CONFIG.SHEETS.PROSPECTS, ['Company ID']);
      diagnostics.services.SharedUtils.testCall = { success: true, rowCount: testData ? testData.length : 0 };
    } catch (e) {
      diagnostics.services.SharedUtils.testCall = { success: false, error: e.message };
      diagnostics.issues.push('SharedUtils.getSafeSheetData test failed: ' + e.message);
    }
  }
  
  diagnostics.success = diagnostics.issues.length === 0;
  
  return {
    success: diagnostics.success,
    data: diagnostics,
    error: diagnostics.issues.length > 0 ? diagnostics.issues.join('; ') : null
  };
}

/**
 * exportCRMData - Exports CRM data from specified sheet in CSV or JSON format
 * Called by dashboard.html exportData()
 * @param {string} sheetName - Name of sheet to export (Outreach, Prospects, Accounts, Containers)
 * @param {string} format - Export format ('csv' or 'json')
 * @param {string} dateRange - Date range filter ('all', '30days', '90days', 'thisYear')
 * @returns {Object} Object with success flag and export data (csv string or json object)
 */
function exportCRMData(sheetName, format, dateRange) {
  try {
    // Validate inputs
    if (!sheetName) {
      return { success: false, error: 'Sheet name is required', data: null };
    }
    
    var validSheets = ['Outreach', 'Prospects', 'Accounts', 'Containers'];
    var normalizedSheet = sheetName.charAt(0).toUpperCase() + sheetName.slice(1).toLowerCase();
    if (validSheets.indexOf(normalizedSheet) === -1) {
      return { success: false, error: 'Invalid sheet name. Valid options: ' + validSheets.join(', '), data: null };
    }
    
    format = (format || 'csv').toLowerCase();
    if (format !== 'csv' && format !== 'json') {
      return { success: false, error: 'Invalid format. Use "csv" or "json"', data: null };
    }
    
    // Map sheet names to CONFIG constants
    var configSheetName = null;
    switch (normalizedSheet) {
      case 'Outreach':
        configSheetName = CONFIG.SHEETS.OUTREACH;
        break;
      case 'Prospects':
        configSheetName = CONFIG.SHEETS.PROSPECTS;
        break;
      case 'Accounts':
        configSheetName = CONFIG.SHEETS.ACCOUNTS;
        break;
      case 'Containers':
        configSheetName = CONFIG.SHEETS.ACTIVE_CONTAINERS || 'Active_Containers';
        break;
    }
    
    // Get spreadsheet access
    var accessResult = SharedUtils.checkSpreadsheetAccess('exportCRMData');
    if (!accessResult.success) {
      return { success: false, error: accessResult.error, data: null };
    }
    
    var ss = accessResult.spreadsheet;
    var sheet = ss.getSheetByName(configSheetName);
    if (!sheet) {
      return { success: false, error: 'Sheet not found: ' + configSheetName, data: null };
    }
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { success: true, data: format === 'csv' ? '' : [], message: 'No data to export' };
    }
    
    // Get headers and data
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { 
      return String(h).trim(); 
    });
    var dataRows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    
    // Determine date column based on sheet type
    var dateColName = 'Visit Date';
    if (normalizedSheet === 'Prospects') {
      dateColName = 'Last Outreach Date';
    } else if (normalizedSheet === 'Accounts') {
      dateColName = 'Created Date';
    } else if (normalizedSheet === 'Containers') {
      dateColName = 'Last Updated';
    }
    
    var dateColIdx = headers.indexOf(dateColName);
    if (dateColIdx < 0) { dateColIdx = -1; } // No date filtering if column not found
    
    // Calculate date filter
    var startDate = null;
    var endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    if (dateRange && dateRange !== 'all') {
      switch (dateRange) {
        case '30days':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90days':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 90);
          break;
        case 'thisYear':
          startDate = new Date(new Date().getFullYear(), 0, 1);
          break;
      }
    }
    
    // Filter data by date if applicable
    var filteredData = [];
    if (startDate && dateColIdx >= 0) {
      for (var i = 0; i < dataRows.length; i++) {
        var row = dataRows[i];
        var rowDate = row[dateColIdx];
        
        if (rowDate) {
          var parsedDate = typeof SharedUtils !== 'undefined' && SharedUtils.parseDate
            ? SharedUtils.parseDate(rowDate)
            : new Date(rowDate);
          
          if (parsedDate && !isNaN(parsedDate.getTime()) && parsedDate >= startDate && parsedDate <= endDate) {
            filteredData.push(row);
          }
        }
      }
    } else {
      filteredData = dataRows;
    }
    
    // Build result data
    if (format === 'csv') {
      // Build CSV string
      var csvContent = headers.join(',') + '\n';
      for (var j = 0; j < filteredData.length; j++) {
        var rowData = filteredData[j].map(function(cell) {
          var cellStr = cell === null || cell === undefined ? '' : String(cell);
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (cellStr.indexOf(',') >= 0 || cellStr.indexOf('"') >= 0 || cellStr.indexOf('\n') >= 0) {
            cellStr = '"' + cellStr.replace(/"/g, '""') + '"';
          }
          return cellStr;
        });
        csvContent += rowData.join(',') + '\n';
      }
      
      return {
        success: true,
        data: csvContent,
        format: 'csv',
        rowCount: filteredData.length,
        message: 'Exported ' + filteredData.length + ' rows to CSV'
      };
    } else {
      // Build JSON array
      var jsonData = [];
      for (var k = 0; k < filteredData.length; k++) {
        var rowObj = {};
        for (var h = 0; h < headers.length; h++) {
          rowObj[headers[h]] = filteredData[k][h];
        }
        jsonData.push(rowObj);
      }
      
      return {
        success: true,
        data: jsonData,
        format: 'json',
        rowCount: filteredData.length,
        message: 'Exported ' + filteredData.length + ' rows to JSON'
      };
    }
    
  } catch (e) {
    console.error('Error in exportCRMData:', e);
    return { success: false, error: e.message, data: null };
  }
}
