/**
 * K&L Recycling CRM - Master Autofill Utility
 * Runs through the Prospects and Outreach sheets and applies the latest 
 * architectural logic based on the Settings sheet.
 */

function runMasterAutofill() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();
    
    const confirm = ui.alert('Run Master Autofill?', 'This will re-apply all logic formulas to the Prospects and Outreach sheets. Continue?', ui.ButtonSet.YES_NO);
    if (confirm !== ui.Button.YES) return;

    autofillProspects(ss);
    autofillOutreach(ss);
    
    ui.alert('✅ Autofill Complete', 'All formulas have been refreshed and aligned with your Settings.', ui.ButtonSet.OK);
  } catch (e) {
    console.error('Master Autofill failed: ' + e.message);
    if (typeof SpreadsheetApp !== 'undefined') {
      SpreadsheetApp.getUi().alert('❌ Autofill Error: ' + e.message);
    }
  }
}

function autofillProspects(ss) {
  try {
    const sheet = ss.getSheetByName(CONFIG.SHEETS.PROSPECTS);
    if (!sheet) throw new Error('Prospects sheet not found');
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
  } catch (e) {
    console.error('autofillProspects failed: ' + e.message);
    throw e;
  }
}

function autofillOutreach(ss) {
  try {
    const sheet = ss.getSheetByName(CONFIG.SHEETS.OUTREACH);
    if (!sheet) throw new Error('Outreach sheet not found');
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
  } catch (e) {
    console.error('autofillOutreach failed: ' + e.message);
    throw e;
  }
}
