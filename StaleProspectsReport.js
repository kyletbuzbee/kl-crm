/**
 * Stale Prospects Report - K&L Recycling CRM
 * Identifies prospects not contacted in 60+ days
 * Follows Settings.csv GLOBAL_CONST Stale_Prospect_Days
 */

/**
 * Main entry point for menu - Find stale prospects
 * Shows UI alert with results
 */
function findStaleProspects() {
  var ui = SpreadsheetApp.getUi();
  
  try {
    // Check spreadsheet access
    var accessResult = SharedUtils.checkSpreadsheetAccess('findStaleProspects');
    if (!accessResult.success) {
      ui.alert('❌ Error', 'Failed to access spreadsheet: ' + accessResult.error, ui.ButtonSet.OK);
      return;
    }
    
    var ss = accessResult.spreadsheet;
    
    // Get stale threshold from Settings (default 60 days)
    var staleDays = getStaleProspectThreshold(ss);
    
    // Find stale prospects
    var staleProspects = getStaleProspectsData(ss, staleDays);
    
    // Show results
    if (staleProspects.length === 0) {
      ui.alert(
        '✅ No Stale Prospects',
        'All prospects have been contacted within ' + staleDays + ' days!',
        ui.ButtonSet.OK
      );
      return;
    }
    
    // Build message
    var message = 'Found ' + staleProspects.length + ' stale prospect(s) (' + staleDays + '+ days):\n\n';
    
    // Show first 15
    var displayCount = Math.min(staleProspects.length, 15);
    for (var i = 0; i < displayCount; i++) {
      var p = staleProspects[i];
      message += '• ' + p.company + ' - ' + p.daysSince + ' days';
      if (p.lastOutcome) {
        message += ' (' + p.lastOutcome + ')';
      }
      message += '\n';
    }
    
    if (staleProspects.length > 15) {
      message += '\n...and ' + (staleProspects.length - 15) + ' more';
    }
    
    message += '\n\n⚡ Action: Contact these prospects to re-engage!';
    
    ui.alert('⏰ Stale Prospects Report', message, ui.ButtonSet.OK);
    
  } catch (e) {
    ui.alert('❌ Error', 'Failed to find stale prospects: ' + e.message, ui.ButtonSet.OK);
    console.error('findStaleProspects error:', e);
  }
}

/**
 * Get stale prospect threshold from Settings
 * Looks for GLOBAL_CONST Stale_Prospect_Days
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @returns {number} Days threshold (default 60)
 */
function getStaleProspectThreshold(ss) {
  try {
    var settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
    if (!settingsSheet) return 60;
    
    var settingsData = settingsSheet.getDataRange().getValues();
    var headers = settingsData.shift();
    
    var categoryIdx = headers.indexOf('Category');
    var keyIdx = headers.indexOf('Key');
    var value1Idx = headers.indexOf('Value_1');
    
    if (categoryIdx === -1 || keyIdx === -1) return 60;
    
    for (var i = 0; i < settingsData.length; i++) {
      var row = settingsData[i];
      if (row[categoryIdx] === 'GLOBAL_CONST' && 
          row[keyIdx] === 'Stale_Prospect_Days' &&
          value1Idx !== -1) {
        var days = parseInt(row[value1Idx]);
        return isNaN(days) ? 60 : days;
      }
    }
  } catch (e) {
    console.warn('Could not read stale threshold from Settings:', e);
  }
  
  return 60; // Default per .clinerules
}

/**
 * Get stale prospects data from Prospects sheet
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @param {number} staleDays
 * @returns {Array} Array of stale prospect objects
 */
function getStaleProspectsData(ss, staleDays) {
  var prospectsSheet = ss.getSheetByName(CONFIG.SHEETS.PROSPECTS);
  if (!prospectsSheet) {
    throw new Error('Prospects sheet not found');
  }
  
  var data = prospectsSheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  var headers = data.shift().map(function(h) { return String(h).trim(); });
  
  // Find column indices using fuzzy matching
  var companyIdx = SharedUtils.findColumnIndex(headers, 'Company Name', 'PROSPECTS');
  var daysSinceIdx = SharedUtils.findColumnIndex(headers, 'Days Since Last Contact', 'PROSPECTS');
  var lastOutcomeIdx = SharedUtils.findColumnIndex(headers, 'Last Outcome', 'PROSPECTS');
  var statusIdx = SharedUtils.findColumnIndex(headers, 'Contact Status', 'PROSPECTS');
  
  if (companyIdx === -1 || daysSinceIdx === -1) {
    throw new Error('Required columns not found: Company Name, Days Since Last Contact');
  }
  
  var staleProspects = [];
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var daysSince = row[daysSinceIdx];
    var status = statusIdx !== -1 ? row[statusIdx] : '';
    
    // Skip if not a number
    if (typeof daysSince !== 'number') continue;
    
    // Check if stale
    if (daysSince > staleDays) {
      staleProspects.push({
        company: row[companyIdx] || 'Unknown',
        daysSince: daysSince,
        lastOutcome: lastOutcomeIdx !== -1 ? row[lastOutcomeIdx] : '',
        status: status,
        rowIndex: i + 2 // 1-based + header
      });
    }
  }
  
  // Sort by days since (descending - oldest first)
  staleProspects.sort(function(a, b) {
    return b.daysSince - a.daysSince;
  });
  
  return staleProspects;
}

/**
 * Create a sheet with stale prospects for easy follow-up
 * Optional: Call this to generate a working list
 */
function createStaleProspectsSheet() {
  var ui = SpreadsheetApp.getUi();
  
  try {
    // Check spreadsheet access
    var accessResult = SharedUtils.checkSpreadsheetAccess('createStaleProspectsSheet');
    if (!accessResult.success) {
      ui.alert('❌ Error', 'Failed to access spreadsheet: ' + accessResult.error, ui.ButtonSet.OK);
      return;
    }
    
    var ss = accessResult.spreadsheet;
    
    var staleDays = getStaleProspectThreshold(ss);
    var staleProspects = getStaleProspectsData(ss, staleDays);
    
    if (staleProspects.length === 0) {
      ui.alert('✅ No Stale Prospects', 'No prospects need follow-up!', ui.ButtonSet.OK);
      return;
    }
    
    // Delete existing stale prospects sheet if exists
    var existingSheet = ss.getSheetByName(CONFIG.SHEETS.STALE_PROSPECTS);
    if (existingSheet) {
      ss.deleteSheet(existingSheet);
    }
    
    // Create new sheet
    var newSheet = ss.insertSheet(CONFIG.SHEETS.STALE_PROSPECTS);
    
    // Add headers
    var headers = ['Company Name', 'Days Since Contact', 'Last Outcome', 'Status', 'Priority', 'Action Needed'];
    newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    newSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0F2537').setFontColor('white');
    
    // Add data
    var data = staleProspects.map(function(p) {
      var priority = p.daysSince > 90 ? 'HIGH' : (p.daysSince > 75 ? 'MEDIUM' : 'LOW');
      return [
        p.company,
        p.daysSince,
        p.lastOutcome || '',
        p.status || '',
        priority,
        'Re-engagement call needed'
      ];
    });
    
    newSheet.getRange(2, 1, data.length, headers.length).setValues(data);
    
    // Format priority column with colors - batch operation
    var priorityCol = 5;
    var priorityColors = [];
    for (var i = 0; i < data.length; i++) {
      var priority = data[i][4];
      var bg = '#2ecc71';
      var font = 'white';
      if (priority === 'HIGH') {
        bg = '#e74c3c';
      } else if (priority === 'MEDIUM') {
        bg = '#f39c12';
        font = 'black';
      }
      priorityColors.push([bg, font]);
    }
    
    // Apply colors in batch using getRange
    if (priorityColors.length > 0) {
      var priorityRange = newSheet.getRange(2, priorityCol, data.length, 1);
      priorityColors.forEach(function(colors, idx) {
        var cell = priorityRange.getCell(idx + 1, 1);
        cell.setBackground(colors[0]).setFontColor(colors[1]);
      });
    }
    
    // Auto-resize columns
    newSheet.autoResizeColumns(1, headers.length);
    
    // Activate the sheet
    ss.setActiveSheet(newSheet);
    
    ui.alert(
      '✅ Stale Prospects Sheet Created',
      'Created sheet with ' + staleProspects.length + ' prospects needing follow-up.',
      ui.ButtonSet.OK
    );
    
  } catch (e) {
    ui.alert('❌ Error', 'Failed to create sheet: ' + e.message, ui.ButtonSet.OK);
    console.error('createStaleProspectsSheet error:', e);
  }
}
