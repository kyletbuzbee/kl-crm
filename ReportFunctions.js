/**
 * Report Functions
 * Generates HTML reports for the dashboard modal with professional formatting and KPIs.
 */

// Create ReportFunctions namespace object
var ReportFunctions = {
  generateReportHtml: generateReportHtml,
  generateProfessionalReport: generateProfessionalReport,
  generatePlainTextReportForRange: generatePlainTextReportForRange,
  parseDateSafely: parseDateSafely,
  parseDateForReport: parseDateForReport
};

/**
 * Generates the HTML string for the Operational Report.
 * Includes error handling to ensure the modal opens even if data fetching fails.
 * @param {Date} startDate
 * @param {Date} endDate
 * @return {string} HTML content
 */
function generateReportHtml(startDate, endDate) {
  try {
    // Dependency check: Ensure CONFIG exists, otherwise throw clear error
    if (typeof CONFIG === 'undefined') {
      throw new Error('Configuration (CONFIG) is missing. Please ensure Config.gs is loaded.');
    }

    // Local fallback for formatDate if SharedUtils isn't loaded
    var format = (typeof formatDate === 'function') ? formatDate : function(d) { 
      return d ? new Date(d).toLocaleDateString() : ''; 
    };

    // 1. Safe Data Fetching
    var requiredCols = ['Visit Date', 'Company', 'Outcome', 'Notes', 'Next Visit Date', 'Owner'];
    var outreach = SharedUtils.getSafeSheetData(CONFIG.SHEETS.OUTREACH, requiredCols);
    
    // 2. Date Normalization - FIXED TIMEZONE BUG
    // Isolate Filter vs. Display Dates to prevent "off by one day" errors
    var start, end, displayStart, displayEnd;

    // Parse dates for FILTERING (strict 00:00 to 23:59 range)
    if (startDate) {
      start = parseDateSafely(startDate);
      if (isNaN(start.getTime())) start = new Date(); // Fallback to today if invalid
    } else {
      start = new Date();
    }
    start.setHours(0,0,0,0); // Start of day for filtering

    if (endDate) {
      end = parseDateSafely(endDate);
      if (isNaN(end.getTime())) end = new Date(); // Fallback to today if invalid
    } else {
      end = new Date();
    }
    end.setHours(23,59,59,999); // End of day for filtering

    // Parse dates for DISPLAY (set to noon to prevent timezone rollback)
    displayStart = parseDateSafely(startDate || new Date());
    displayStart.setHours(12,0,0,0); // Noon prevents rollback when formatting

    displayEnd = parseDateSafely(endDate || new Date());
    displayEnd.setHours(12,0,0,0); // Noon prevents rollback when formatting
    
    // 3. Filter Data
    var reportData = outreach.filter(function(row) {
      if (!row['visit date']) return false;
      var d = parseDateSafely(row['visit date']);
      if (isNaN(d.getTime())) return false; // Skip invalid dates in sheet
      return d >= start && d <= end;
    });
    
    // 4. Build Report HTML
    var html = '<div style="font-family: Arial, sans-serif; padding: 20px;">';
    html += '<h2 style="color: #0F2537; border-bottom: 2px solid #ddd; padding-bottom: 10px;">Operational Report</h2>';
    html += '<p><strong>Period:</strong> ' + format(start) + ' to ' + format(end) + '</p>';
    html += '<p><strong>Total Interactions:</strong> ' + reportData.length + '</p>';
    
    if (reportData.length === 0) {
      html += '<p style="color: #888; font-style: italic; margin-top: 20x;">No activity found for this period.</p>';
    } else {
      html += '<table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px;">';
      html += '<thead><tr style="background-color: #f2f2f2; text-align: left;">';
      html += '<th style="padding: 8px; border: 1px solid #ddd;">Date</th>';
      html += '<th style="padding: 8px; border: 1px solid #ddd;">Company</th>';
      html += '<th style="padding: 8px; border: 1px solid #ddd;">Outcome</th>';
      html += '<th style="padding: 8px; border: 1px solid #ddd;">Notes</th>';
      html += '<th style="padding: 8px; border: 1px solid #ddd;">Next Step</th>';
      html += '</tr></thead><tbody>';
      
      reportData.forEach(function(row) {
        // Highlight "Account Won" rows with light green
        var rowColor = row['outcome'] === 'Account Won' ? '#d4edda' : '#ffffff';
        
        html += '<tr style="background-color: ' + rowColor + ';">';
        html += '<td style="padding: 8px; border: 1px solid #ddd;">' + format(row['visit date']) + '</td>';
        html += '<td style="padding: 8px; border: 1px solid #ddd;"><strong>' + (row['company'] || '') + '</strong></td>';
        html += '<td style="padding: 8px; border: 1px solid #ddd;">' + (row['outcome'] || '') + '</td>';
        html += '<td style="padding: 8px; border: 1px solid #ddd;">' + (row['notes'] || '') + '</td>';
        html += '<td style="padding: 8px; border: 1px solid #ddd;">' + (row['next visit date'] ? format(row['next visit date']) : '') + '</td>';
        html += '</tr>';
      });
      
      html += '</tbody></table>';
    }
    
    html += '<div style="margin-top: 20px; text-align: center;">';
    html += '<button onclick="google.script.host.close()" style="padding: 10px 20px; background: #0F2537; color: white; border: none; border-radius: 4px; cursor: pointer;">Close Report</button>';
    html += '</div></div>';
    
    return html;

  } catch (e) {
    // 5. Error Handling: Return a valid HTML page displaying the error
    // This ensures the modal opens even if the script crashes, helping debug.
    var errorHtml = '<div style="font-family: Arial, sans-serif; padding: 20px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px;">';
    errorHtml += '<h3 style="margin-top:0;">âš ï¸ Report Generation Error</h3>';
    errorHtml += '<p>The report could not be generated due to the following error:</p>';
    errorHtml += '<pre style="background: #fff; padding: 10px; border: 1px solid #ddd; overflow-x: auto; font-size: 11px;">' + e.message + '</pre>';
    errorHtml += '<p><strong>Troubleshooting:</strong><br>1. Check if "Outreach" sheet exists.<br>2. Check if column headers match (Visit Date, Company, Outcome, etc.).</p>';
    errorHtml += '<div style="margin-top: 8px; text-align: center;">';
    errorHtml += '<button onclick="google.script.host.close()" style="padding: 10px 20px; background: #0F2537; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>';
    errorHtml += '</div></div>';
    
    console.error('Report Generation Failed: ' + e.message);
    return errorHtml;
  }
}

/**
 * Generates a professional enterprise-grade report with KPIs, emojis, and next day action plan.
 * @param {Date} startDate
 * @param {Date} endDate
 * @return {string} Professional HTML report content
 */
function generateProfessionalReport(startDate, endDate) {
  try {
    if (typeof CONFIG === 'undefined') {
      throw new Error('Configuration (CONFIG) is missing. Please ensure Config.gs is loaded.');
    }

    var format = (typeof formatDate === 'function') ? formatDate : function(d) {
      return d ? new Date(d).toLocaleDateString() : '';
    };

    // Get outreach data
    var outreachData = SharedUtils.getSafeSheetData(CONFIG.SHEETS.OUTREACH, ['Visit Date', 'Company', 'Outcome', 'Status', 'Notes']);

    // Get prospects data for action plan (use flexible column access)
    var prospectsColumns = ['Company Name', 'Contact Status'];
    var optionalColumns = ['Next Steps Due Date', 'Close Probability', 'Priority Score', 'UrgencyBand', 'Urgency Score', 'Last Outreach Date'];

    // Try to get data with available columns - prevent undefined values
    var prospectsData = []; // Default to empty array
    try {
      var rawData = SharedUtils.getSafeSheetData(CONFIG.SHEETS.PROSPECTS, prospectsColumns.concat(optionalColumns));
      if (rawData) prospectsData = rawData;
    } catch (e) {
      console.warn("Failed to get full columns, retrying with basics...");
      try {
        var rawDataFallback = SharedUtils.getSafeSheetData(CONFIG.SHEETS.PROSPECTS, prospectsColumns);
        if (rawDataFallback) prospectsData = rawDataFallback;
      } catch (e2) {
        console.error("Could not load prospects: " + e2.message);
        prospectsData = []; // Ensure it's always an array
      }
    }

    // Calculate KPIs
    var totalVisits = 0;
    var wins = 0;
    var hotLeads = 0;
    var recentActivity = [];

    // Filter by date range - Parse dates consistently to avoid timezone issues
    var start, end;

    if (startDate) {
      // If startDate is a string like "2026-01-14", parse it as local date
      if (typeof startDate === 'string' && startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        var parts = startDate.split('-');
        start = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        start = new Date(startDate);
      }
      if (isNaN(start.getTime())) start = new Date(); // Fallback to today if invalid
    } else {
      start = new Date();
    }
    start.setHours(0,0,0,0);

    if (endDate) {
      // If endDate is a string like "2026-01-14", parse it as local date
      if (typeof endDate === 'string' && endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        var parts = endDate.split('-');
        end = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        end = new Date(endDate);
      }
      if (isNaN(end.getTime())) end = new Date(); // Fallback to today if invalid
    } else {
      end = new Date();
    }
    end.setHours(23,59,59,999);

    var filteredOutreach = outreachData.filter(function(row) {
      if (!row['visit date']) return false;
      var d = parseDateSafely(row['visit date']);
      if (isNaN(d.getTime())) return false;
      return d >= start && d <= end;
    });

    totalVisits = filteredOutreach.length;

    // Calculate wins and hot leads
    filteredOutreach.forEach(function(row) {
      var outcome = (row['outcome'] || '').toString().toLowerCase();
      var status = (row['status'] || '').toString().toLowerCase();

      if (outcome.includes('won') || status.includes('won')) {
        wins++;
      }
      if (status.includes('hot') || status.includes('very hot') || outcome.includes('interested')) {
        hotLeads++;
      }

      // Collect recent activity (last 5)
      if (recentActivity.length < 5) {
        recentActivity.push({
          company: row['company'] || '',
          outcome: row['outcome'] || '',
          date: format(row['visit date'])
        });
      }
    });

    // Generate next day action plan from prospects
    var actionPlan = generateNextDayActionPlanFromProspects(prospectsData);

    // Build professional HTML report
    var html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>K&L Recycling - Professional Report</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        .report-container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #0F2537 0%, #1a365d 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 2.5em;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .header p {
          margin: 0;
          opacity: 0.9;
          font-size: 1.1em;
        }
        .kpi-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          padding: 30px;
          background: #f8fafc;
        }
        .kpi-card {
          background: white;
          padding: 25px;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 4px 6px rgba(0,0,0,0.07);
          border: 1px solid #e2e8f0;
          transition: transform 0.2s ease;
        }
        .kpi-card:hover {
          transform: translateY(-2px);
        }
        .kpi-card.total { border-left: 4px solid #0F2537; }
        .kpi-card.wins { border-left: 4px solid #10b981; }
        .kpi-card.hot { border-left: 4px solid #f59e0b; }
        .kpi-value {
          font-size: 3em;
          font-weight: 800;
          margin-bottom: 5px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .kpi-label {
          color: #64748b;
          font-size: 0.9em;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .content-section {
          padding: 30px;
        }
        .section-title {
          color: #0F2537;
          font-size: 1.8em;
          font-weight: 700;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .activity-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.07);
        }
        .activity-table th {
          background: #0F2537;
          color: white;
          padding: 15px;
          text-align: left;
          font-weight: 600;
          font-size: 0.9em;
        }
        .activity-table td {
          padding: 15px;
          border-bottom: 1px solid #e2e8f0;
          background: white;
        }
        .activity-table tr:last-child td {
          border-bottom: none;
        }
        .outcome-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8em;
          font-weight: 600;
          text-transform: uppercase;
        }
        .outcome-won { background: #d1fae5; color: #065f46; }
        .outcome-interest { background: #dbeafe; color: #1e40af; }
        .outcome-other { background: #f3f4f6; color: #374151; }
        .action-plan {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #0ea5e9;
          border-radius: 12px;
          padding: 25px;
          margin-top: 30px;
        }
        .action-plan h3 {
          margin: 0 0 15px 0;
          color: #0c4a6e;
          font-size: 1.4em;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .action-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .action-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #bae6fd;
        }
        .action-item:last-child {
          border-bottom: none;
        }
        .priority-icon {
          font-size: 1.2em;
          min-width: 24px;
        }
        .action-company {
          font-weight: 600;
          color: #0c4a6e;
        }
        .action-reason {
          color: #64748b;
          font-size: 0.9em;
        }
        .footer {
          background: #0F2537;
          color: white;
          padding: 20px 30px;
          text-align: center;
        }
        .footer p {
          margin: 0;
          opacity: 0.8;
          font-size: 0.9em;
        }
        @media (max-width: 768px) {
          .kpi-section {
            grid-template-columns: 1fr;
            padding: 20px;
          }
          .content-section {
            padding: 20px;
          }
          .header {
            padding: 20px;
          }
          .header h1 {
            font-size: 2em;
          }
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <div class="header">
          <h1>ðŸš€ K&L Recycling</h1>
          <p>Enterprise Operations Report | ${format(start)} - ${format(end)}</p>
        </div>

        <div class="kpi-section">
          <div class="kpi-card total">
            <div class="kpi-value">${totalVisits}</div>
            <div class="kpi-label">ðŸ“Š Total Visits</div>
          </div>
          <div class="kpi-card wins">
            <div class="kpi-value">${wins}</div>
            <div class="kpi-label">ðŸ† New Wins</div>
          </div>
          <div class="kpi-card hot">
            <div class="kpi-value">${hotLeads}</div>
            <div class="kpi-label">ðŸ”¥ Hot Leads</div>
          </div>
        </div>

        <div class="content-section">
          <h2 class="section-title">
            ðŸ“ˆ Activity Details
          </h2>`;

    if (filteredOutreach.length === 0) {
      html += '<p style="text-align: center; color: #64748b; font-style: italic; padding: 40px;">No activity found for this period.</p>';
    } else {
      html += `
          <table class="activity-table">
            <thead>
              <tr>
                <th>ðŸ¢ Company</th>
                <th>ðŸ“… Date</th>
                <th>ðŸŽ¯ Outcome</th>
                <th>ðŸ“ Notes</th>
              </tr>
            </thead>
            <tbody>`;

      filteredOutreach.forEach(function(row) {
        var outcomeClass = 'outcome-other';
        var outcome = row['outcome'] || '';
        if (outcome.toLowerCase().includes('won')) {
          outcomeClass = 'outcome-won';
        } else if (outcome.toLowerCase().includes('interest')) {
          outcomeClass = 'outcome-interest';
        }

        html += `
              <tr>
                <td><strong>${row['company'] || ''}</strong></td>
                <td>${format(row['visit date'])}</td>
                <td><span class="outcome-badge ${outcomeClass}">${outcome}</span></td>
                <td>${row['notes'] || ''}</td>
              </tr>`;
      });

      html += `
            </tbody>
          </table>`;
    }

    // Next Day Action Plan
    html += `
          <div class="action-plan">
            <h3>ðŸŽ¯ Next Day Action Plan</h3>`;

    if (actionPlan.length === 0) {
      html += '<p style="color: #64748b; font-style: italic;">No high-priority actions identified for tomorrow.</p>';
    } else {
      html += '<ul class="action-list">';
      actionPlan.forEach(function(action) {
        var priorityIcon = '⭐';
        if (action.priority >= 80) priorityIcon = 'ðŸ”¥';
        else if (action.priority >= 60) priorityIcon = 'âš¡';

        html += `
              <li class="action-item">
                <span class="priority-icon">${priorityIcon}</span>
                <div>
                  <div class="action-company">${action.company}</div>
                  <div class="action-reason">${action.reason} • Priority: ${action.priority}/100</div>
                </div>
              </li>`;
      });
      html += '</ul>';
    }

    html += `
          </div>
        </div>

        <div class="footer">
          <p>© ${new Date().getFullYear()} K&L Recycling CRM | Enterprise Operations Suite</p>
        </div>
      </div>
    </body>
    </html>`;

    return html;

  } catch (e) {
    var errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Report Error</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; text-align: center; }
        .error-box { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
        .error-icon { font-size: 3em; color: #e53e3e; }
        h2 { color: #2d3748; margin-top: 0; }
        pre { background: #f7fafc; padding: 15px; border-radius: 4px; text-align: left; font-size: 12px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <div class="error-box">
        <div class="error-icon">âš ï¸</div>
        <h2>Report Generation Error</h2>
        <p>The professional report could not be generated due to the following error:</p>
        <pre>${e.message}</pre>
        <p><strong>Troubleshooting:</strong><br>• Check if Prospects and Outreach sheets exist<br>• Verify column headers match expected names<br>• Ensure data is properly formatted</p>
        <button onclick="google.script.host.close()" style="padding: 10px 20px; background: #0F2537; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 20px;">Close</button>
      </div>
    </body>
    </html>`;

    console.error('Professional Report Generation Failed: ' + e.message);
    return errorHtml;
  }
}

/**
 * Generates a robust next day action plan.
 * SAFETY FIX: Checks if data exists before running loops.
 */
function generateNextDayActionPlanFromProspects(prospectsData) {
  try {
    // SAFETY CHECK 1: If no data passed, return empty list immediately
    if (!prospectsData || !Array.isArray(prospectsData) || prospectsData.length === 0) {
      console.warn("Action Plan: No prospect data found.");
      return [];
    }

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Get existing outreach for context
    var recentOutreach = [];
    try {
       recentOutreach = getRecentOutreachContext(30);
    } catch (e) {
       console.warn("Could not fetch recent outreach: " + e.message);
    }

    var actions = [];

    // Loop through data
    prospectsData.forEach(function(row) {
      if (!row) return; // Skip empty rows

      // Calculate score with safety wrapper
      var actionItem = calculateActionPriority(row, recentOutreach, today, tomorrow);

      if (actionItem && actionItem.priority >= 10) {
        actions.push(actionItem);
      }
    });

    // Sort: Overdue & High Priority first
    actions.sort(function(a, b) {
      if (a.daysOverdue > 0 && b.daysOverdue <= 0) return -1;
      if (b.daysOverdue > 0 && a.daysOverdue <= 0) return 1;
      return b.priority - a.priority;
    });

    return actions.slice(0, 20);

  } catch (e) {
    console.error('CRITICAL ERROR in Action Plan:', e.message);
    return []; // Return empty array so report still generates
  }
}

/**
 * Calculates priority with Safety Checks
 */
function calculateActionPriority(row, recentOutreach, today, tomorrow) {
  try {
    // SAFETY CHECK 2: Ensure 'row' exists
    if (!row) return null;

    var score = 0;
    var reasons = [];
    var daysOverdue = 0;

    // Safe Property Access (handles different casing/missing columns)
    var company = row['company name'] || row['company'] || 'Unknown Company';
    var statusRaw = row['contact status'] || row['status'] || '';
    var status = String(statusRaw).toLowerCase();

    // Skip if we shouldn't contact them
    if (status.includes('won') || status.includes('lost') || status.includes('dead') || status.includes('disqualified')) {
      return null;
    }

    // --- DUE DATE LOGIC ---
    var rawDueDate = row['next steps due date'] || row['next steps due'] || row['next step due'] || row['due date'];
    if (rawDueDate) {
      var dueDate = parseLooseDate(rawDueDate);
      if (dueDate) {
        dueDate.setHours(0,0,0,0);
        var diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          score += 50 + (Math.abs(diffDays) * 2);
          reasons.push("Overdue by " + Math.abs(diffDays) + " days");
          daysOverdue = Math.abs(diffDays);
        } else if (diffDays === 0) {
          score += 45;
          reasons.push("Due Today");
        } else if (diffDays === 1) {
          score += 40;
          reasons.push("Due Tomorrow");
        }
      }
    }

    // --- STATUS LOGIC ---
    if (status.includes('hot')) {
      score += 30;
      reasons.push("Hot Lead");
    } else if (status.includes('new')) {
      score += 15;
      reasons.push("New Lead");
    }

    // --- URGENCY BAND ---
    // SAFETY CHECK 3: specific check for urgency band
    var urgencyBandRaw = row['UrgencyBand'] || row['urgency band'] || row['urgency'] || '';
    if (String(urgencyBandRaw).toLowerCase().includes('high')) {
      score += 20;
      if (!status.includes('hot')) reasons.push("High Urgency");
    }

    // --- RECENCY CHECK ---
    if (recentOutreach && recentOutreach.length > 0) {
      var recentlyVisited = recentOutreach.some(function(visit) {
        if (!visit || !visit.company) return false;
        var sameCompany = visit.company.toLowerCase() === company.toLowerCase();
        var visitDate = new Date(visit.date);
        var recent = (today - visitDate) / (1000 * 60 * 60) < 48; // 48 hours
        return sameCompany && recent;
      });

      if (recentlyVisited) {
        score -= 50;
        reasons.push("(Recently Visited)");
      }
    }

    return {
      company: company,
      priority: Math.max(0, score),
      reason: reasons.join(' • ') || 'General Follow-up',
      daysOverdue: daysOverdue,
      actionType: score > 60 ? 'urgent' : 'follow-up'
    };
  } catch (e) {
    console.error('Error calculating action priority:', e.message);
    return null; // Safe fallback
  }
}

/**
 * Analyze contact status and determine appropriate action
 */
function calculateStatusPriority(contactStatus) {
  if (!contactStatus) {
    return { score: 30, reason: 'Active prospect', action: 'follow-up' };
  }
  
  var status = contactStatus.toString().toLowerCase();

  if (status.includes('hot') || status.includes('very hot') || status.includes('qualified')) {
    return { score: 85, reason: 'Hot qualified lead', action: 'close' };
  } else if (status.includes('warm') || status.includes('interested')) {
    return { score: 65, reason: 'Warm interested prospect', action: 'nurture' };
  } else if (status.includes('follow-up') || status.includes('pending')) {
    return { score: 55, reason: 'Follow-up required', action: 'follow-up' };
  } else if (status.includes('new') || status === '') {
    return { score: 35, reason: 'New prospect - initial contact', action: 'initial' };
  } else if (status.includes('cold')) {
    return { score: 25, reason: 'Cold lead - re-engagement needed', action: 're-engage' };
  } else if (status.includes('nurture')) {
    return { score: 45, reason: 'In nurturing phase', action: 'nurture' };
  } else {
    return { score: 30, reason: 'Active prospect', action: 'follow-up' };
  }
}

/**
 * Safe Analyzer for Urgency (Prevent crashes)
 */
function analyzeUrgency(prospect, tomorrow) {
  if (!prospect) return { score: 0, bonus: 0, reason: '', daysOverdue: 0 };

  // We don't really need this separate function anymore as logic is moved to
  // calculateActionPriority, but keeping it as a stub to prevent reference errors.
  return { score: 0, bonus: 0, reason: '', daysOverdue: 0 };
}

/**
 * Analyze recent activity patterns
 */
function analyzeRecentActivity(companyName, recentOutreach, tomorrow) {
  var companyActivity = recentOutreach.filter(function(activity) {
    return (activity.company || '').toLowerCase() === companyName.toLowerCase();
  });

  if (companyActivity.length === 0) {
    return { score: 60, penalty: 0, reason: 'No recent activity' };
  }

  var lastActivity = companyActivity[companyActivity.length - 1];
  var daysSinceLastActivity = Math.ceil((tomorrow - new Date(lastActivity.date)) / (1000 * 60 * 60 * 24));

  // Analyze activity pattern
  var recentActivity = companyActivity.filter(function(act) {
    var actDate = new Date(act.date);
    return (tomorrow - actDate) / (1000 * 60 * 60 * 24) <= 14; // Last 2 weeks
  });

  var score = 50;
  var penalty = 0;
  var reason = '';

  if (daysSinceLastActivity <= 1) {
    score = 20; // Recently contacted, lower priority
    penalty = 15;
    reason = 'Recently contacted (' + daysSinceLastActivity + ' days ago)';
  } else if (daysSinceLastActivity <= 7) {
    score = 35;
    penalty = 5;
    reason = 'Contacted ' + daysSinceLastActivity + ' days ago';
  } else if (daysSinceLastActivity <= 14) {
    score = 50;
    reason = 'Contacted ' + daysSinceLastActivity + ' days ago';
  } else if (daysSinceLastActivity <= 30) {
    score = 65;
    reason = 'Needs follow-up (' + daysSinceLastActivity + ' days since last contact)';
  } else {
    score = 80;
    reason = 'Long time no contact (' + daysSinceLastActivity + ' days)';
  }

  // Check for unsuccessful outcomes in recent activity
  var recentFailures = recentActivity.filter(function(act) {
    var outcome = (act.outcome || '').toLowerCase();
    return outcome.includes('not interested') || outcome.includes('disqualified') ||
           outcome.includes('no answer') || outcome.includes('unreachable');
  });

  if (recentFailures.length > 0) {
    penalty += 10;
    reason += ' • Recent unsuccessful attempts';
  }

  return { score: score, penalty: penalty, reason: reason, lastActivityDays: daysSinceLastActivity };
}

/**
 * Calculate opportunity value and potential
 */
function calculateOpportunityValue(prospect) {
  var closeProbability = parseFloat(prospect['close probability']) || 0;
  var priorityScore = parseFloat(prospect['priority score']) || 50;
  var industryScore = 0;

  // Industry-based value estimation
  var industry = (prospect['industry'] || '').toString().toLowerCase();
  if (industry.includes('manufacturing') || industry.includes('construction')) {
    industryScore = 25;
  } else if (industry.includes('metal') || industry.includes('fabrication')) {
    industryScore = 20;
  } else if (industry.includes('auto') || industry.includes('repair')) {
    industryScore = 15;
  }

  var valueScore = (closeProbability * 0.4) + (priorityScore * 0.4) + (industryScore * 0.2);
  var reason = '';

  if (closeProbability >= 80) {
    reason = 'High close probability (' + closeProbability + '%)';
  } else if (priorityScore >= 75) {
    reason = 'High priority prospect';
  } else if (industryScore >= 20) {
    reason = 'Target industry';
  }

  return {
    score: Math.min(valueScore, 100),
    reason: reason,
    estimatedValue: closeProbability >= 50 ? 'high' : closeProbability >= 25 ? 'medium' : 'low'
  };
}

/**
 * Calculate time-based urgency factors
 */
function calculateTimeUrgency(prospect, tomorrow, nextWeek) {
  var score = 0;
  var reason = '';

  // Business day considerations
  var dayOfWeek = tomorrow.getDay(); // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    score = -10; // Lower priority for weekends
    reason = 'Weekend scheduling';
  } else if (dayOfWeek === 1) {
    score = 10; // Monday bonus for starting week strong
    reason = 'Start of week priority';
  }

  return { score: score, reason: reason };
}

/**
 * Determine the most appropriate action type
 */
function determineActionType(baseAction, recencyResult, urgencyResult, valueScore) {
  try {
    // Input validation
    if (!baseAction || typeof baseAction !== 'string') {
      console.warn('determineActionType: Invalid baseAction provided, using default');
      baseAction = 'follow-up';
    }

    // If critically overdue, prioritize immediate action
    if (urgencyResult && typeof urgencyResult.daysOverdue === 'number' && urgencyResult.daysOverdue > 7) {
      return 'urgent-follow-up';
    }

    // If recently contacted, suggest waiting or different approach
    if (recencyResult && typeof recencyResult.lastActivityDays === 'number' && recencyResult.lastActivityDays <= 3) {
      return 'schedule-follow-up';
    }

    // If high value opportunity, suggest closing activities
    if (valueScore && valueScore.estimatedValue === 'high') {
      return baseAction === 'nurture' ? 'advance-nurture' : 'close-attempt';
    }

    // Default to base action type
    return baseAction;
  } catch (e) {
    console.error('Error in determineActionType:', e.message);
    return baseAction || 'follow-up'; // Safe fallback
  }
}

/**
 * Get recent outreach context for analysis
 */
function getRecentOutreachContext(daysBack) {
  try {
    var cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    var outreachData = SharedUtils.getSafeSheetData(CONFIG.SHEETS.OUTREACH,
      ['Company', 'Visit Date', 'Outcome', 'Notes']);

    return outreachData.filter(function(row) {
      var visitDate = new Date(row['visit date']);
      return visitDate >= cutoffDate;
    }).map(function(row) {
      return {
        company: row['company'] || '',
        date: row['visit date'],
        outcome: row['outcome'] || '',
        notes: row['notes'] || ''
      };
    });
  } catch (e) {
    console.error('Error getting outreach context:', e.message);
    return [];
  }
}

/**
 * Check if contact status indicates a closed/won account
 * @param {string} statusRaw - Raw contact status value
 * @return {boolean} True if status indicates closed/won
 */
function isClosedStatus(statusRaw) {
  const CLOSED = new Set(['won', 'lost', 'disqualified', 'dead']);
  const s = String(statusRaw || '').trim().toLowerCase();
  return CLOSED.has(s);
}

/**
 * Check if an account has already been won
 * @param {string} companyName - Company name to check
 * @param {Array} recentOutreach - Recent outreach data
 * @return {boolean} True if account has been won
 */
function hasAccountBeenWon(companyName, recentOutreach) {
  try {
    var normalizedCompany = (companyName || '').toLowerCase().trim();

    // Check if recentOutreach is defined and is an array
    if (!recentOutreach || !Array.isArray(recentOutreach)) {
      return false;
    }

    // Check recent outreach data for won outcomes
    for (var i = 0; i < recentOutreach.length; i++) {
      var activity = recentOutreach[i];
      var activityCompany = (activity.company || '').toLowerCase().trim();
      var outcome = (activity.outcome || '').toLowerCase();

      // If this company has been marked as "Account Won" or similar
      if (activityCompany === normalizedCompany &&
          (outcome.includes('account won') || outcome.includes('won') ||
           outcome.includes('closed') || outcome.includes('converted'))) {
        return true;
      }
    }

    // Also check if there's an Accounts sheet entry for this company
    // FIX: Use SHEET_ACCOUNTS since there's no separate "New Accounts" sheet
    try {
      var accountsSheetName = CONFIG.SHEETS.ACCOUNTS || CONFIG.SHEET_NEW_ACCOUNTS || 'Accounts';
      var newAccountsData = SharedUtils.getSafeSheetData(accountsSheetName, ['Company name']);
      for (var j = 0; j < newAccountsData.length; j++) {
        var accountCompany = (newAccountsData[j]['company name'] || '').toLowerCase().trim();
        if (accountCompany === normalizedCompany) {
          return true; // Company exists in Accounts sheet
        }
      }
    } catch (e) {
      // Accounts sheet might not exist or be accessible, continue
      console.log('Could not check Accounts sheet:', e.message);
    }

    return false;
  } catch (e) {
    console.error('Error checking if account won:', e.message);
    return false; // Default to not won if there's an error
  }
}

/**
 * Diversify action plan to include different types of activities
 */
function diversifyActionPlan(actions) {
  try {
    // Input validation
    if (!actions || !Array.isArray(actions)) {
      console.warn('diversifyActionPlan: Invalid actions array provided');
      return [];
    }

    var diversified = [];
    var actionTypes = {};

    // First pass: include high-priority items
    actions.forEach(function(action) {
      try {
        if (action && typeof action === 'object' && action.priority >= 70) {
          diversified.push(action);
          var actionType = action.actionType || 'general';
          actionTypes[actionType] = (actionTypes[actionType] || 0) + 1;
        }
      } catch (e) {
        console.warn('Error processing action in first pass:', e.message);
      }
    });

    // Second pass: fill remaining slots with diversity
    actions.forEach(function(action) {
      try {
        if (diversified.length >= 15) return;

        var actionType = action && action.actionType ? action.actionType : 'general';

        // Allow max 3 of each action type
        if ((actionTypes[actionType] || 0) < 3) {
          diversified.push(action);
          actionTypes[actionType] = (actionTypes[actionType] || 0) + 1;
        }
      } catch (e) {
        console.warn('Error processing action in second pass:', e.message);
      }
    });

    return diversified;
  } catch (e) {
    console.error('Error in diversifyActionPlan:', e.message);
    return actions || []; // Return original actions as fallback
  }
}

/**
 * FIXED: parseDateSafely - Handles timezone correctly
 * Prevents "off by one day" errors by using noon as the time
 * @param {string|Date} dateInput - Date to parse
 * @return {Date} Parsed date object
 */
function parseDateSafely(dateInput) {
  try {
    if (!dateInput) return null;

    // If already a Date object, return a copy set to noon
    if (dateInput instanceof Date) {
      var d = new Date(dateInput.getTime());
      d.setHours(12, 0, 0, 0); // Set to noon to prevent timezone rollback
      return d;
    }

    // Handle string inputs
    if (typeof dateInput === 'string') {
      var s = dateInput.trim();

      // US format: MM/DD/YYYY or M/D/YYYY
      var usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (usMatch) {
        var monthUS = parseInt(usMatch[1], 10) - 1;
        var dayUS = parseInt(usMatch[2], 10);
        var yearUS = parseInt(usMatch[3], 10);
        // Set to noon to prevent timezone issues
        var parsedDate = new Date(yearUS, monthUS, dayUS, 12, 0, 0, 0);
        if (!isNaN(parsedDate.getTime())) return parsedDate;
      }

      // ISO format: YYYY-MM-DD
      var isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (isoMatch) {
        var year = parseInt(isoMatch[1], 10);
        var month = parseInt(isoMatch[2], 10) - 1;
        var day = parseInt(isoMatch[3], 10);
        // Set to noon to prevent timezone issues
        var parsedDate = new Date(year, month, day, 12, 0, 0, 0);
        if (!isNaN(parsedDate.getTime())) return parsedDate;
      }

      // Try MMDDYYYY format (no separators)
      var compactMatch = s.match(/^(\d{8})$/);
      if (compactMatch) {
        var month = parseInt(s.substring(0, 2), 10);
        var day = parseInt(s.substring(2, 4), 10);
        var year = parseInt(s.substring(4, 8), 10);
        var parsedDate = new Date(year, month - 1, day, 12, 0, 0, 0);
        if (!isNaN(parsedDate.getTime())) return parsedDate;
      }
    }

    // Handle numbers (Excel serial dates)
    if (typeof dateInput === 'number') {
      var excelEpoch = new Date(1899, 11, 30);
      var parsedDate = new Date(excelEpoch.getTime() + dateInput * 86400000);
      parsedDate.setHours(12, 0, 0, 0); // Set to noon
      if (!isNaN(parsedDate.getTime())) return parsedDate;
    }

    // Final fallback - parse and set to noon
    var fallbackDate = new Date(dateInput);
    if (!isNaN(fallbackDate.getTime())) {
      fallbackDate.setHours(12, 0, 0, 0);
      return fallbackDate;
    }
    
    return null;

  } catch (e) {
    console.error('Error parsing date in parseDateSafely:', e.message);
    return null;
  }
}

/**
 * Generate a plain text report for a date range (used by dateRangeReport.html)
 * @param {string|Date} startDate - Start date for the report
 * @param {string|Date} endDate - End date for the report
 * @return {string} Plain text report content
 */
function generatePlainTextReportForRange(startDate, endDate) {
  try {
    // Dependency check: Ensure CONFIG exists
    if (typeof CONFIG === 'undefined') {
      throw new Error('Configuration (CONFIG) is missing. Please ensure Config.gs is loaded.');
    }

    // Local fallback for formatDate if SharedUtils isn't loaded
    var format = (typeof formatDate === 'function') ? formatDate : function(d) {
      return d ? new Date(d).toLocaleDateString() : '';
    };

    // 1. Safe Data Fetching
    var requiredCols = ['Visit Date', 'Company', 'Outcome', 'Notes', 'Next Visit Date', 'Owner'];
    var outreach = SharedUtils.getSafeSheetData(CONFIG.SHEETS.OUTREACH, requiredCols);

    // 2. Date Normalization - FIXED TIMEZONE BUG
    var start, end;

    // Parse dates for FILTERING (strict 00:00 to 23:59 range)
    if (startDate) {
      start = parseDateSafely(startDate);
      if (isNaN(start.getTime())) start = new Date(); // Fallback to today if invalid
    } else {
      start = new Date();
    }
    start.setHours(0,0,0,0); // Start of day for filtering

    if (endDate) {
      end = parseDateSafely(endDate);
      if (isNaN(end.getTime())) end = new Date(); // Fallback to today if invalid
    } else {
      end = new Date();
    }
    end.setHours(23,59,59,999); // End of day for filtering

    // 3. Filter Data
    var reportData = outreach.filter(function(row) {
      if (!row['visit date']) return false;
      var d = parseDateSafely(row['visit date']);
      if (isNaN(d.getTime())) return false; // Skip invalid dates in sheet
      return d >= start && d <= end;
    });

    // 4. Build Plain Text Report
    var report = 'K&L Recycling - Date Range Report\n';
    report += '=' .repeat(50) + '\n\n';
    report += 'Period: ' + format(start) + ' to ' + format(end) + '\n';
    report += 'Total Interactions: ' + reportData.length + '\n\n';

    if (reportData.length === 0) {
      report += 'No activity found for this period.\n';
    } else {
      report += 'ACTIVITY DETAILS:\n';
      report += '-' .repeat(30) + '\n\n';

      reportData.forEach(function(row, index) {
        report += (index + 1) + '. ' + (row['company'] || 'Unknown Company') + '\n';
        report += '   Date: ' + format(row['visit date']) + '\n';
        report += '   Outcome: ' + (row['outcome'] || 'Not specified') + '\n';
        report += '   Notes: ' + (row['notes'] || 'No notes') + '\n';
        if (row['next visit date']) {
          report += '   Next Step: ' + format(row['next visit date']) + '\n';
        }
        if (row['owner']) {
          report += '   Owner: ' + row['owner'] + '\n';
        }
        report += '\n';
      });

      // Summary statistics
      var outcomes = {};
      reportData.forEach(function(row) {
        var outcome = row['outcome'] || 'Not specified';
        outcomes[outcome] = (outcomes[outcome] || 0) + 1;
      });

      report += 'SUMMARY BY OUTCOME:\n';
      report += '-' .repeat(20) + '\n';
      for (var outcome in outcomes) {
        report += outcome + ': ' + outcomes[outcome] + '\n';
      }
    }

    report += '\nReport generated on: ' + format(new Date()) + '\n';
    report += 'K&L Recycling CRM System\n';

    return report;

  } catch (e) {
    // Error Handling: Return a plain text error message
    var errorReport = 'ERROR: Report Generation Failed\n';
    errorReport += '=' .repeat(35) + '\n\n';
    errorReport += 'The report could not be generated due to the following error:\n\n';
    errorReport += e.message + '\n\n';
    errorReport += 'Troubleshooting:\n';
    errorReport += '1. Check if "Outreach" sheet exists.\n';
    errorReport += '2. Check if column headers match (Visit Date, Company, Outcome, etc.).\n';
    errorReport += '3. Ensure data is properly formatted.\n\n';
    errorReport += 'Report generated on: ' + new Date().toLocaleString() + '\n';

    console.error('Plain Text Report Generation Failed: ' + e.message);
    return errorReport;
  }
}

/**
 * FIXED: parseDateForReport - Handles timezone correctly
 * @param {string|Date|number} dateInput - Date to parse
 * @return {Date} Parsed date object
 */
function parseDateForReport(dateInput) {
  try {
    if (!dateInput) {
      var today = new Date();
      today.setHours(12, 0, 0, 0);
      return today;
    }

    // If already a Date object, set to noon
    if (dateInput instanceof Date) {
      var d = new Date(dateInput.getTime());
      d.setHours(12, 0, 0, 0);
      if (!isNaN(d.getTime())) return d;
      var today = new Date();
      today.setHours(12, 0, 0, 0);
      return today;
    }

    // Handle string inputs
    if (typeof dateInput === 'string') {
      var s = dateInput.trim();

      // US format: MM/DD/YYYY
      var usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (usMatch) {
        var monthUS = parseInt(usMatch[1], 10) - 1;
        var dayUS = parseInt(usMatch[2], 10);
        var yearUS = parseInt(usMatch[3], 10);
        var parsedDate = new Date(yearUS, monthUS, dayUS, 12, 0, 0, 0);
        if (!isNaN(parsedDate.getTime())) return parsedDate;
      }

      // ISO format: YYYY-MM-DD
      var isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (isoMatch) {
        var year = parseInt(isoMatch[1], 10);
        var month = parseInt(isoMatch[2], 10) - 1;
        var day = parseInt(isoMatch[3], 10);
        var parsedDate = new Date(year, month, day, 12, 0, 0, 0);
        if (!isNaN(parsedDate.getTime())) return parsedDate;
      }

      // Try MMDDYYYY format
      var compactMatch = s.match(/^(\d{8})$/);
      if (compactMatch) {
        var month = parseInt(s.substring(0, 2), 10);
        var day = parseInt(s.substring(2, 4), 10);
        var year = parseInt(s.substring(4, 8), 10);
        var parsedDate = new Date(year, month - 1, day, 12, 0, 0, 0);
        if (!isNaN(parsedDate.getTime())) return parsedDate;
      }
    }

    // Handle numbers (Excel serial dates)
    if (typeof dateInput === 'number') {
      var excelEpoch = new Date(1899, 11, 30);
      var parsedDate = new Date(excelEpoch.getTime() + dateInput * 86400000);
      parsedDate.setHours(12, 0, 0, 0);
      if (!isNaN(parsedDate.getTime())) return parsedDate;
    }

    // Final fallback
    var fallbackDate = new Date(dateInput);
    if (!isNaN(fallbackDate.getTime())) {
      fallbackDate.setHours(12, 0, 0, 0);
      return fallbackDate;
    }
    
    var today = new Date();
    today.setHours(12, 0, 0, 0);
    return today;

  } catch (e) {
    console.error('Error parsing date in parseDateForReport:', e.message);
    var today = new Date();
    today.setHours(12, 0, 0, 0);
    return today;
  }
}

/**
 * Show the Professional Report in a modal dialog
 * Wrapper function called by menu and dashboard quick actions
 */
function showProfessionalReport() {
  try {
    // Get dates for the current month
    var today = new Date();
    var startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    var format = (typeof formatDate === 'function') ? formatDate : function(d) { 
      return d ? new Date(d).toLocaleDateString() : ''; 
    };
    
    var html = generateProfessionalReport(startOfMonth, today);
    
    var output = HtmlService
      .createHtmlOutput(html)
      .setTitle('K&L Recycling - Professional Report')
      .setWidth(900)
      .setHeight(800);
    
    SpreadsheetApp.getUi().showModalDialog(output, 'ðŸ“Š Professional Operations Report');
    
  } catch (e) {
    console.error('Error showing professional report:', e);
    SpreadsheetApp.getUi().alert('Error generating report: ' + e.message);
  }
}

/**
 * Show the Professional Report with custom date range
 * @param {string|Date} startDate - Start date for the report
 * @param {string|Date} endDate - End date for the report
 */
function showProfessionalReportWithDates(startDate, endDate) {
  try {
    var html = generateProfessionalReport(startDate, endDate);
    
    var output = HtmlService
      .createHtmlOutput(html)
      .setTitle('K&L Recycling - Professional Report')
      .setWidth(900)
      .setHeight(800);
    
    SpreadsheetApp.getUi().showModalDialog(output, 'ðŸ“Š Professional Operations Report');
    
  } catch (e) {
    console.error('Error showing professional report:', e);
    SpreadsheetApp.getUi().alert('Error generating report: ' + e.message);
  }
}

/**
 * Helper function to parse loose date formats
 */
function parseLooseDate(dateValue) {
  try {
    if (!dateValue) return null;

    // If it's already a valid Date object
    if (dateValue instanceof Date) {
      if (!isNaN(dateValue.getTime())) return dateValue;
      return null;
    }

    // If it's a number (Excel serial date)
    if (typeof dateValue === 'number') {
      var excelEpoch = new Date(1899, 11, 30);
      var result = new Date(excelEpoch.getTime() + dateValue * 86400000);
      if (!isNaN(result.getTime())) return result;
      return null;
    }

    // Try parsing as string
    if (typeof dateValue === 'string') {
      var s = dateValue.trim();

      // Try ISO format first
      var isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (isoMatch) {
        var d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
        if (!isNaN(d.getTime())) return d;
      }

      // Try M/D/YYYY format
      var usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (usMatch) {
        var d2 = new Date(parseInt(usMatch[3]), parseInt(usMatch[1]) - 1, parseInt(usMatch[2]));
        if (!isNaN(d2.getTime())) return d2;
      }

      // Try MMDDYYYY format (no separators)
      var compactMatch = s.match(/^(\d{8})$/);
      if (compactMatch) {
        var month = parseInt(s.substring(0, 2), 10);
        var day = parseInt(s.substring(2, 4), 10);
        var year = parseInt(s.substring(4, 8), 10);
        var parsedDate = new Date(year, month - 1, day);
        if (!isNaN(parsedDate.getTime())) return parsedDate;
      }
    }

    // Final fallback to Date.parse
    var finalDate = new Date(dateValue);
    if (!isNaN(finalDate.getTime())) return finalDate;

    return null;
  } catch (e) {
    console.error('Error parsing date in parseLooseDate:', e.message);
    return null; // Safe fallback
  }
}
