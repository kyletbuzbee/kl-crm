/**
 * Menu Functions - K&L Recycling CRM
 * Version: 4.0.0 (Unified & Non-Blocking)
 */

function onOpen() {
  try {
    // Diagnostic: Log that onOpen is executing
    console.log('K&L CRM: onOpen() triggered - building menu');
    var ui = SpreadsheetApp.getUi();
    
    // Verify UI is accessible
    if (!ui) {
      console.error('K&L CRM: Failed to get UI');
      return;
    }
    
    console.log('K&L CRM: UI accessed successfully');
    
    ui.createMenu('K&L CRM')
      // Primary CRM Views
      .addItem('📋 Show Dashboard (Sidepanel)', 'showSidebar')
      .addItem('🚀 Open CRM Suite (Full Screen)', 'showCRMSuite')
      .addItem('📱 Open CRM Suite (Sidebar)', 'showCRMSuiteSidebar')
      .addSeparator()
      
      // Data Cleaning & Normalization
      .addSubMenu(ui.createMenu('🛠️ Data Cleaning')
        .addItem('🛠️ Fix Data: Industries', 'runPreciseIndustryMapper')
        .addItem('🆔 Generate IDs', 'normalizeAndGenerateIDs')
        .addItem('🔤 Normalize Company Names', 'normalizeCompanyNames'))
      
      .addSeparator()
      
      // Data Sync & Processing
      .addSubMenu(ui.createMenu('🔄 Sync & Process')
        .addItem('🔄 Sync Outreach → Prospects', 'runFullCRM_Sync')
        .addItem('🏆 Process Account Wins', 'processAccountWon'))
      
      .addSeparator()
      
      // Reports & Analytics
      .addSubMenu(ui.createMenu('📊 Reports')
        .addItem('📊 Generate Professional Report', 'showProfessionalReport')
        .addItem('⏰ Stale Prospects (>60 days)', 'findStaleProspects'))
      
      .addSeparator()
      
      // Automation & Maintenance
      .addSubMenu(ui.createMenu('⚙️ System Maintenance')
        .addItem('Run Daily Automation', 'runDailyAutomation')
        .addItem('Update Geocodes', 'updateGeocodes')
        .addItem('Refresh Priority Scores', 'runBatchScoring'))
      
      .addToUi();
    
    console.log('K&L CRM: Menu created and added successfully');
  } catch (e) {
    console.error('K&L CRM: Failed to create menu: ' + e.message);
    console.error('K&L CRM: Stack trace: ' + e.stack);
  }
}

/**
 * Manual test function to verify onOpen works
 * Run this from the Apps Script editor to test
 */
function testOnOpen() {
  console.log('===== TEST: Running onOpen manually =====');
  onOpen();
  console.log('===== TEST: onOpen completed =====');
}

/**
 * Note: Legacy functions like addCRMMenu() have been decommissioned 
 * to prevent conflicting UI namespaces.
 */
