/**
 * Workflow Automation Service
 * Main entry points for time-based triggers.
 */

/**
 * Continuation Pattern for Daily Automation
 * Prevents timeout by checking execution time and creating triggers to resume
 */

var AutomationState = {
  currentStep: 0,
  startTime: null,
  maxExecutionTime: 5 * 60 * 1000, // 5 minutes (leave 1 minute buffer)
  steps: [
    { name: 'runBatchScoring', function: runBatchScoring },
    { name: 'syncOutreachToProspects', function: syncOutreachToProspects },
    { name: 'processDailyOutreachUpdates', function: processDailyOutreachUpdates },
    { name: 'checkNewAccounts', function: checkNewAccounts },
    { name: 'updateGeocodes', function: updateGeocodes }
  ]
};

function runDailyAutomation() {
  try {
    console.time('DailyAutomation');
    
    // Initialize state if starting fresh
    if (!AutomationState.startTime) {
      AutomationState.startTime = new Date().getTime();
      AutomationState.currentStep = 0;
      console.log('Starting daily automation at step ' + AutomationState.currentStep);
    }

    var settings = getSettings();
    var elapsedTime = new Date().getTime() - AutomationState.startTime;
    
    console.log('Current step: ' + AutomationState.currentStep + ', Elapsed time: ' + (elapsedTime / 1000) + 's');

    // Check if we're approaching time limit
    if (elapsedTime > AutomationState.maxExecutionTime) {
      console.warn('Approaching execution time limit, scheduling continuation...');
      scheduleContinuation();
      return;
    }

    // Execute current step
    var currentStepObj = AutomationState.steps[AutomationState.currentStep];
    console.log('Executing step: ' + currentStepObj.name);
    
    try {
      if (currentStepObj.name === 'processDailyOutreachUpdates') {
        currentStepObj.function(settings);
      } else if (currentStepObj.name === 'updateGeocodes') {
        var maxBatchSize = settings.globalConstants['Max_Batch_Size'] ?
          settings.globalConstants['Max_Batch_Size'].value : 50;
        currentStepObj.function(maxBatchSize);
      } else {
        currentStepObj.function();
      }
      
      console.log('Step completed: ' + currentStepObj.name);
    } catch (e) {
      console.error('Error in step ' + currentStepObj.name + ':', e.message);
      // Continue to next step even if current step fails
    }

    // Move to next step
    AutomationState.currentStep++;

    // Check if all steps are complete
    if (AutomationState.currentStep >= AutomationState.steps.length) {
      console.log('All automation steps completed successfully');
      console.timeEnd('DailyAutomation');
      
      // Reset state for next run
      AutomationState.startTime = null;
      AutomationState.currentStep = 0;
      
      // Send completion notification
      sendAutomationCompletionNotification();
      return;
    }

    // Check if we have time for next step
    elapsedTime = new Date().getTime() - AutomationState.startTime;
    if (elapsedTime > AutomationState.maxExecutionTime) {
      console.warn('Approaching execution time limit after step ' + currentStepObj.name + ', scheduling continuation...');
      scheduleContinuation();
    } else {
      // Continue immediately with next step
      console.log('Continuing to next step...');
      runDailyAutomation();
    }

  } catch (e) {
    console.error('Automation Failed', e);
    MailApp.sendEmail(Session.getActiveUser().getEmail(), 'CRM Automation Error', e.message);
    
    // Reset state on error
    AutomationState.startTime = null;
    AutomationState.currentStep = 0;
  }
}

/**
 * Schedule continuation trigger to resume automation
 */
function scheduleContinuation() {
  try {
    // Delete any existing continuation triggers
    deleteContinuationTriggers();
    
    // Create new trigger to run in 1 minute
    ScriptApp.newTrigger('runDailyAutomation')
      .timeBased()
      .after(1 * 60 * 1000) // 1 minute
      .create();
    
    console.log('Continuation trigger scheduled for 1 minute from now');
  } catch (e) {
    console.error('Failed to schedule continuation:', e.message);
  }
}

/**
 * Delete existing continuation triggers
 */
function deleteContinuationTriggers() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(trigger) {
      if (trigger.getHandlerFunction() === 'runDailyAutomation') {
        ScriptApp.deleteTrigger(trigger);
        console.log('Deleted existing continuation trigger');
      }
    });
  } catch (e) {
    console.error('Failed to delete continuation triggers:', e.message);
  }
}

/**
 * Send notification when automation completes
 */
function sendAutomationCompletionNotification() {
  try {
    var recipient = Session.getActiveUser().getEmail();
    var subject = 'âœ… K&L CRM - Daily Automation Complete';
    var message = 'Daily automation completed successfully at ' + new Date().toLocaleString();
    
    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      body: message
    });
    
    console.log('Automation completion notification sent');
  } catch (e) {
    console.error('Failed to send completion notification:', e.message);
  }
}

function onFormSubmit(e) {
  // Triggered when form is submitted (New Accounts or other forms)
  if (e && e.range) {
    var sheet = e.range.getSheet();
    // FIX: Use SHEET_ACCOUNTS since there's no separate "New Accounts" sheet
    var accountsSheetName = CONFIG.SHEETS.ACCOUNTS || CONFIG.SHEET_NEW_ACCOUNTS || 'Accounts';
    if (sheet.getName() === accountsSheetName) {
      console.log('Form submitted - processing new accounts...');
      
      var result = checkNewAccounts();
      
      // FIX: Provide feedback to user
      if (result && result.success) {
        AlertingService.showAccountProcessingNotification(result);
        
        // Send email alert if there were errors
        if (result.errors > 0 && result.errorDetails && result.errorDetails.length > 0) {
          AlertingService.sendAccountProcessingAlert(result.errorDetails, result);
        }
      }
    }
  }
}

/**
 * Optimized Outreach Updates - Writes all data in one batch
 */
function processDailyOutreachUpdates(settings) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.OUTREACH);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Map headers to column indexes
    const colIdx = {};
    headers.forEach((h, i) => colIdx[h.toLowerCase()] = i);

    const today = new Date();
    let hasChanges = false;

    // Iterate rows (skip header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const outcome = row[colIdx['outcome']];
      const nextDate = row[colIdx['next visit date']];
      const currentCountdown = row[colIdx['next visit countdown']];
      const followUpAction = row[colIdx['follow up action']];

      // 1. Apply Templates (if needed)
      if (outcome && (!nextDate || !followUpAction || followUpAction === 'See Notes')) {
        const template = getFollowupTemplateForOutcome(outcome, settings);
        if (template) {
          const followUpDate = new Date(today);
          followUpDate.setDate(today.getDate() + template.days);

          row[colIdx['next visit date']] = followUpDate;
          row[colIdx['follow up action']] = template.template;
          row[colIdx['next visit countdown']] = template.days;
          hasChanges = true;
        }
      }

      // 2. Update Countdowns
      if (row[colIdx['next visit date']]) {
        const nextDateObj = new Date(row[colIdx['next visit date']]);
        const diffTime = nextDateObj.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays !== currentCountdown) {
          row[colIdx['next visit countdown']] = diffDays;
          hasChanges = true;
        }
      }

      data[i] = row; // Save updated row back to array
    }

    // Write everything back at once if changes were made
    if (hasChanges) {
      sheet.getDataRange().setValues(data);
      console.log('Batch updated outreach records.');
    }

  } catch (e) {
    console.error('Error processing daily outreach updates:', e);
  }
}

/**
 * Get follow-up template for a specific outcome
 */
function getFollowupTemplateForOutcome(outcome, settings) {
  if (!outcome || !settings.followupTemplates) {
    return null;
  }

  var outcomeLower = String(outcome).toLowerCase().trim();

  // Direct template match
  if (settings.followupTemplates[outcomeLower]) {
    return settings.followupTemplates[outcomeLower];
  }

  // Fuzzy matching for template keys
  for (var templateKey in settings.followupTemplates) {
    if (outcomeLower.indexOf(templateKey.toLowerCase()) !== -1 ||
        templateKey.toLowerCase().indexOf(outcomeLower) !== -1) {
      return settings.followupTemplates[templateKey];
    }
  }

  // FIX: Sanitize string comparison and use proper fallback
  // Try multiple variations of the fallback key
  var fallbackKeys = [
    'other - general follow',
    'other general follow',
    'other-general follow',
    'othergeneral follow'
  ];
  
  for (var i = 0; i < fallbackKeys.length; i++) {
    if (settings.followupTemplates[fallbackKeys[i]]) {
      console.log('Using fallback template: ' + fallbackKeys[i]);
      return settings.followupTemplates[fallbackKeys[i]];
    }
  }

  console.warn('No template found for outcome: ' + outcome);
  return null;
}
