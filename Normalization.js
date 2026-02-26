/**
 * K&L Recycling CRM - Master Autofill Utility
 * Runs through the Prospects and Outreach sheets and applies the latest 
 * architectural logic based on the Settings sheet.
 */

// ============================================================================
// COMPANY NAME NORMALIZATION
// ============================================================================

/**
 * Normalizes company names in the Prospects sheet.
 * - Trims whitespace and collapses internal spaces
 * - Applies Title Case while respecting common business words
 * - Standardizes legal suffixes (LLC, Inc, Corp, etc.)
 * 
 * Architecture: Batch read → transform in memory → single batch write.
 * Uses LockService to prevent data collisions during write-back.
 * 
 * @returns {{ success: boolean, data: { updated: number, skipped: number }, error: string }}
 */
function normalizeCompanyNames() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();

  var confirm = ui.alert(
    '🔤 Normalize Company Names',
    'This will clean and standardize all company names in the "' + sheetName + '" sheet ' +
    '(trim spaces, apply Title Case, fix legal suffixes like LLC/Inc/Corp).\n\nContinue?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) {
    return { success: false, data: { updated: 0, skipped: 0 }, error: 'Cancelled by user' };
  }

  try {
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      ui.alert('ℹ️ Nothing to do', 'The "' + sheetName + '" sheet has no data rows.', ui.ButtonSet.OK);
      return { success: true, data: { updated: 0, skipped: 0 }, error: '' };
    }

    // --- BATCH READ: all data in one call ---
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var companyNameHeader = CONFIG.HEADERS.PROSPECTS[4]; // "Company Name" (0-indexed col 4)
    var companyColIdx = headers.indexOf(companyNameHeader);

    if (companyColIdx === -1) {
      var errMsg = 'Column "' + companyNameHeader + '" not found in the "' + sheetName + '" sheet. ' +
                   'This tool requires a "Company Name" column. Check your sheet headers.';
      ui.alert('❌ Column Not Found', errMsg, ui.ButtonSet.OK);
      return { success: false, data: { updated: 0, skipped: 0 }, error: errMsg };
    }

    var dataRange = sheet.getRange(2, companyColIdx + 1, lastRow - 1, 1);
    var rawValues = dataRange.getValues(); // 2D array [[name], [name], ...]

    // --- TRANSFORM in memory ---
    var normalizedValues = [];
    var updatedCount = 0;
    var skippedCount = 0;

    for (var i = 0; i < rawValues.length; i++) {
      var original = String(rawValues[i][0] || '').trim();

      if (!original) {
        normalizedValues.push(['']);
        skippedCount++;
        continue;
      }

      var normalized = _normalizeCompanyName(original);

      if (normalized !== original) {
        updatedCount++;
      } else {
        skippedCount++;
      }

      normalizedValues.push([normalized]);
    }

    // --- BATCH WRITE with LockService ---
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(15000); // Wait up to 15s
      dataRange.setValues(normalizedValues);
    } finally {
      lock.releaseLock();
    }

    var summary = 'Company name normalization complete.\n\n' +
                  '✅ Updated: ' + updatedCount + '\n' +
                  '⏭️ Unchanged: ' + skippedCount;
    ui.alert('✅ Done', summary, ui.ButtonSet.OK);

    return {
      success: true,
      data: { updated: updatedCount, skipped: skippedCount },
      error: ''
    };

  } catch (e) {
    var errStr = 'Error normalizing company names: ' + e.message;
    console.error(errStr, e);
    ui.alert('❌ Error', errStr, ui.ButtonSet.OK);
    return { success: false, data: { updated: 0, skipped: 0 }, error: errStr };
  }
}

/**
 * Internal helper: applies all normalization rules to a single company name string.
 * @param {string} name - Raw company name
 * @returns {string} Normalized company name
 */
function _normalizeCompanyName(name) {
  if (!name || typeof name !== 'string') return '';

  // Step 1: Trim and collapse internal whitespace
  var cleaned = name.trim().replace(/\s+/g, ' ');

  // Step 2: Apply Title Case (respects small connector words)
  var smallWords = { 'and': true, 'of': true, 'the': true, 'a': true, 'an': true,
                     'in': true, 'on': true, 'at': true, 'to': true, 'for': true,
                     'or': true, 'nor': true, 'by': true, 'd': true, 'de': true };

  var words = cleaned.split(' ');
  var titled = words.map(function(word, idx) {
    var lower = word.toLowerCase();
    // Always capitalize the first word, last word, or non-small words
    if (idx === 0 || idx === words.length - 1 || !smallWords[lower]) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    return lower;
  });

  var result = titled.join(' ');

  // Step 3: Standardize legal suffixes (case-insensitive match, normalize to canonical form)
  // Order matters: longer patterns before shorter to avoid partial matches
  var suffixMap = [
    [/\bL\.?L\.?C\.?\s*$/i, 'LLC'],
    [/\bInc\.?\s*$/i, 'Inc.'],
    [/\bCorp\.?\s*$/i, 'Corp.'],
    [/\bCo\.?\s*$/i, 'Co.'],
    [/\bLtd\.?\s*$/i, 'Ltd.'],
    [/\bL\.?P\.?\s*$/i, 'LP'],
    [/\bP\.?C\.?\s*$/i, 'PC'],
    [/\bPLLC\s*$/i, 'PLLC'],
    [/\bPLC\s*$/i, 'PLC']
  ];

  for (var s = 0; s < suffixMap.length; s++) {
    if (suffixMap[s][0].test(result)) {
      result = result.replace(suffixMap[s][0], suffixMap[s][1]);
      break; // Only one suffix per name
    }
  }

  // Step 4: Preserve known all-caps abbreviations that Title Case would mangle
  // (e.g., HVAC, AC, LLC already handled above)
  var knownCaps = ['HVAC', 'AC', 'USA', 'US', 'TX', 'ISD', 'MRI', 'CPA', 'DBA'];
  knownCaps.forEach(function(abbr) {
    // Replace word-boundary occurrences that were lowercased by Title Case
    var regex = new RegExp('\\b' + abbr.charAt(0) + abbr.slice(1).toLowerCase() + '\\b', 'g');
    result = result.replace(regex, abbr);
  });

  return result.trim();
}

function getBatchProcessor() {
  try {
    return typeof BatchProcessor !== 'undefined' ? BatchProcessor : null;
  } catch (e) {
    return null;
  }
}

function runMasterAutofill() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  const confirm = ui.alert('Run Master Autofill?', 'This will re-apply all logic formulas to the Prospects and Outreach sheets. Continue?', ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;

  autofillProspects(ss);
  autofillOutreach(ss);
  
  ui.alert('âœ… Autofill Complete', 'All formulas have been refreshed and aligned with your Settings.', ui.ButtonSet.OK);
}

function autofillProspects(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.PROSPECTS);
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // Last Outcome (H) & Last Outreach Date (I)
  sheet.getRange(2, 8).setFormula(`=XLOOKUP(A2, ${CONFIG.SHEETS.OUTREACH}!$B:$B, ${CONFIG.SHEETS.OUTREACH}!$F:$F, "", 0, -1)`);
  sheet.getRange(2, 9).setFormula(`=XLOOKUP(A2, ${CONFIG.SHEETS.OUTREACH}!$B:$B, ${CONFIG.SHEETS.OUTREACH}!$D:$D, "", 0, -1)`);
  
  // Days Since (J), Countdown (K), Next Step (L)
  sheet.getRange(2, 10).setFormula('=IF(I2="", "", TODAY() - I2)');
  sheet.getRange(2, 11).setFormula('=L2 - TODAY()');
  sheet.getRange(2, 12).setFormula(`=IF(I2="", TODAY()+14, I2 + IFERROR(XLOOKUP(H2, ${CONFIG.SHEETS.SETTINGS}!$B:$B, ${CONFIG.SHEETS.SETTINGS}!$E:$E), 14))`);
  
  // Contact Status (M)
  sheet.getRange(2, 13).setFormula(`=IFERROR(XLOOKUP(H2, ${CONFIG.SHEETS.SETTINGS}!$B:$B, ${CONFIG.SHEETS.SETTINGS}!$D:$D), "Prospect")`);
  
  // Priority Score (O) - The "Architect" Version with Keyword Matching
  const priorityFormula = `=LET(ind, E2, days, J2, stale, 60, base, IFERROR(XLOOKUP(ind, ${CONFIG.SHEETS.SETTINGS}!$B:$B, ${CONFIG.SHEETS.SETTINGS}!$C:$C), IFERROR(XLOOKUP("*"&ind&"*", ${CONFIG.SHEETS.SETTINGS}!$D:$D, ${CONFIG.SHEETS.SETTINGS}!$C:$C, 50, 2), 50)), mult, IF(days > stale, 0.3, 1), ROUND(base * mult))`;
  sheet.getRange(2, 15).setFormula(priorityFormula);
  
  // Urgency Band (P) & Urgency Score (Q)
  sheet.getRange(2, 16).setFormula('=IFS(K2 < 0, "Overdue", K2 <= 7, "High", K2 <= 30, "Medium", TRUE, "Low")');
  sheet.getRange(2, 17).setFormula('=IFS(K2 < 0, 150, K2 <= 7, 115, K2 <= 30, 75, TRUE, 25)');
  
  // Totals (R)
  sheet.getRange(2, 18).setFormula('=(O2 * 0.6) + (Q2 * 0.4)');

  // Drag formulas down
  const range = sheet.getRange(2, 8, 1, 11); // Col H to R
  range.copyTo(sheet.getRange(3, 8, lastRow - 2, 11));
}

function autofillOutreach(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.OUTREACH);
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // Stage (G) & Status (H)
  sheet.getRange(2, 7).setFormula(`=IF(F2="Initial Contact", "Outreach", IFERROR(XLOOKUP(F2, ${CONFIG.SHEETS.SETTINGS}!$B:$B, ${CONFIG.SHEETS.SETTINGS}!$C:$C), "Outreach"))`);
  sheet.getRange(2, 8).setFormula(`=IFERROR(XLOOKUP(F2, ${CONFIG.SHEETS.SETTINGS}!$B:$B, ${CONFIG.SHEETS.SETTINGS}!$D:$D), "Cold")`);
  
  // Next Visit Date (I), Days Since (J), Countdown (K)
  sheet.getRange(2, 9).setFormula(`=IF(D2="", "", D2 + IFERROR(XLOOKUP(F2, ${CONFIG.SHEETS.SETTINGS}!$B:$B, ${CONFIG.SHEETS.SETTINGS}!$E:$E), 14))`);
  sheet.getRange(2, 10).setFormula('=IF(D2="", "", TODAY() - D2)');
  sheet.getRange(2, 11).setFormula('=IF(I2="", "", I2 - TODAY())');
  
  // Outcome Category (L)
  sheet.getRange(2, 12).setFormula('=F2');
  
  // Follow Up Action (M)
  const actionFormula = `=IFS(F2="Account Won", "Onboard Account", ISNUMBER(SEARCH("Interested", F2)), "Send pricing", OR(F2="Initial Contact", F2="Follow-Up"), "General follow", F2="No Answer", "Try again", OR(F2="Not Interested", F2="Disqualified"), "Check periodic", TRUE, "See Notes")`;
  sheet.getRange(2, 13).setFormula(actionFormula);

  // Drag formulas down
  const range = sheet.getRange(2, 7, 1, 7); // Col G to M
  range.copyTo(sheet.getRange(3, 7, lastRow - 2, 7));
}
