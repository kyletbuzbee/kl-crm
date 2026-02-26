/**
 * Alerting Service
 * Provides notification capabilities for system events
 */

var AlertingService = {
  /**
   * Send email alert for account processing errors
   * @param {Array} errors - Array of error objects
   * @param {Object} summary - Processing summary
   */
  sendAccountProcessingAlert: function(errors, summary) {
    if (!errors || errors.length === 0) {
      return;
    }

    try {
      var recipient = Session.getActiveUser().getEmail();
      var subject = 'K&L CRM - Account Processing Errors';
      
      var htmlBody = this._generateAccountErrorHtml(errors, summary);
      var plainBody = this._generateAccountErrorPlain(errors, summary);

      MailApp.sendEmail({
        to: recipient,
        subject: subject,
        htmlBody: htmlBody,
        plainBody: plainBody
      });

      console.log('Account processing alert sent to: ' + recipient);
    } catch (e) {
      console.error('Failed to send account processing alert:', e.message);
    }
  },

  /**
   * Send UI notification for account processing results
   * @param {Object} summary - Processing summary
   */
  showAccountProcessingNotification: function(summary) {
    try {
      var message = '';
      var type = 'info';

      if (summary.errors > 0) {
        message = 'âš ï¸ Account processing completed with ' + summary.errors + ' error(s)';
        type = 'warning';
      } else if (summary.processed > 0) {
        message = 'âœ… Successfully processed ' + summary.processed + ' account(s)';
        type = 'success';
      } else {
        message = 'â„¹ï¸ No new accounts to process';
        type = 'info';
      }

      // Log to System_OpsLog
      this._logToOpsLog('Account Processing', type, message, summary);

      console.log(message);
    } catch (e) {
      console.error('Failed to show account processing notification:', e.message);
    }
  },

  /**
   * Generate HTML email body for account errors
   * @private
   */
  _generateAccountErrorHtml: function(errors, summary) {
    var html = '<html><body style="font-family: Arial, sans-serif; padding: 20px;">';
    html += '<h2 style="color: #c0392b;">ðŸš¨ Account Processing Errors</h2>';
    html += '<p>The following errors occurred during account processing:</p>';
    
    html += '<table style="border-collapse: collapse; width: 100%; margin: 20px 0;">';
    html += '<tr style="background-color: #f2f2f2;">';
    html += '<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Company</th>';
    html += '<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Row</th>';
    html += '<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Error</th>';
    html += '</tr>';

    errors.forEach(function(error) {
      html += '<tr>';
      html += '<td style="border: 1px solid #ddd; padding: 8px;">' + (error.companyName || 'Unknown') + '</td>';
      html += '<td style="border: 1px solid #ddd; padding: 8px;">' + error.rowIndex + '</td>';
      html += '<td style="border: 1px solid #ddd; padding: 8px; color: #c0392b;">' + error.error + '</td>';
      html += '</tr>';
    });

    html += '</table>';
    
    html += '<p><strong>Summary:</strong></p>';
    html += '<ul>';
    html += '<li>Processed: ' + summary.processed + '</li>';
    html += '<li>Errors: ' + summary.errors + '</li>';
    html += '</ul>';
    
    html += '<p style="color: #666; font-size: 12px;">Please review the errors and take corrective action.</p>';
    html += '</body></html>';

    return html;
  },

  /**
   * Generate plain text email body for account errors
   * @private
   */
  _generateAccountErrorPlain: function(errors, summary) {
    var text = 'ACCOUNT PROCESSING ERRORS\n\n';
    text += 'The following errors occurred during account processing:\n\n';

    errors.forEach(function(error, index) {
      text += (index + 1) + '. Company: ' + (error.companyName || 'Unknown') + '\n';
      text += '   Row: ' + error.rowIndex + '\n';
      text += '   Error: ' + error.error + '\n\n';
    });

    text += 'Summary:\n';
    text += '- Processed: ' + summary.processed + '\n';
    text += '- Errors: ' + summary.errors + '\n\n';
    text += 'Please review the errors and take corrective action.';

    return text;
  },

  /**
   * Log notification to System_OpsLog
   * @private
   */
  _logToOpsLog: function(category, type, message, details) {
    try {
      var accessResult = SharedUtils.checkSpreadsheetAccess('AlertingService._logToOpsLog');
      if (!accessResult.success) {
        console.error('Failed to access spreadsheet for logging:', accessResult.error);
        return;
      }

      var ss = accessResult.spreadsheet;
      var opsLogSheet = ss.getSheetByName(CONFIG.SHEETS.SYSTEM_LOG);
      
      if (!opsLogSheet) {
        console.warn('System_OpsLog sheet not found');
        return;
      }

      var currentDate = ValidationUtils.createDateSafely(new Date());
      if (!currentDate) {
        console.error('Invalid date when trying to log to Ops Log');
        return;
      }

      var detailsStr = details ? JSON.stringify(details) : '';
      opsLogSheet.appendRow([currentDate, category, type, message, detailsStr]);
    } catch (e) {
      console.error('Failed to log to System_OpsLog:', e.message);
    }
  }
};
