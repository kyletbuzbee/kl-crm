/**
 * Setup Functions
 * Installation scripts.
 */

function installTriggers() {
  try {
    // Clear existing to avoid duplicates
    var triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(t) { 
      try {
        ScriptApp.deleteTrigger(t); 
      } catch (e) {
        console.warn('Failed to delete trigger: ' + e.message);
      }
    });
    
    // Daily cleanup at 6am
    ScriptApp.newTrigger('runDailyAutomation')
      .timeBased()
      .everyDays(1)
      .atHour(6)
      .create();

    console.log('Triggers successfully installed.');
  } catch (e) {
    console.error('Failed to install triggers: ' + e.message);
    throw e;
  }
}

// REMOVED: Duplicate onOpen() function - using the one in MenuFunctions.js instead
// The onOpen() function in MenuFunctions.js creates the K&L CRM menu
