/**
 * Menu Functions - K&L Recycling CRM
 * Version: 4.0.0 (Unified & Non-Blocking)
 */

function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();

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
  } catch (e) {
    console.error('Failed to create menu: ' + e.message);
  }
}

/**
 * Note: Legacy functions like addCRMMenu() have been decommissioned 
 * to prevent conflicting UI namespaces.
 */
