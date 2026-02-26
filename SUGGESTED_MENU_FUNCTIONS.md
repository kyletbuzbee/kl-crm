# Suggested Menu Functions for K&L CRM

## Current Menu Status: ✅ Working
The `runFullCRM_Sync()` function is now in your menu and will:
- Sync Outreach → Prospects
- Auto-heal typos
- Process Account Won migrations

## Recommended Additional Menu Functions

### 1. 📊 Reporting & Analytics
```javascript
// Add to Reports submenu
.addItem('📈 Pipeline Overview', 'showPipelineModal')
.addItem('📊 Sales Performance', 'generateSalesReport')
.addItem('🗺️ Territory Map', 'generateTerritoryReport')
.addItem('⏰ Stale Prospects Report', 'findStaleProspects')  // >60 days
```

### 2. 🔍 Data Quality & Validation
```javascript
// Add to Data Cleaning submenu
.addItem('🔍 Find Duplicates', 'findDuplicateCompanies')
.addItem('⚠️ Validate Orphaned Records', 'validateOrphanedProspects')
.addItem('🧹 Clean Empty Rows', 'cleanEmptyRows')
.addItem('✅ Validate Company IDs', 'validateCompanyIDs')
```

### 3. 📤 Export & Backup
```javascript
// Add new Export submenu
.addSubMenu(ui.createMenu('📤 Export Data')
  .addItem('📄 Export Prospects to CSV', 'exportProspectsCSV')
  .addItem('📄 Export Accounts to CSV', 'exportAccountsCSV')
  .addItem('📄 Export Outreach to CSV', 'exportOutreachCSV')
  .addItem('💾 Create Full Backup', 'createBackup'))
```

### 4. 🗺️ Route Planning
```javascript
// Add to Route Planning submenu
.addItem('🗺️ Generate Today\'s Route', 'generateTodaysRoute')
.addItem('📍 Generate Route for Selected', 'generateRouteForSelection')
.addItem('📅 Weekly Route Plan', 'generateWeeklyRoute')
```

### 5. 🔔 Alerts & Notifications
```javascript
// Add new Alerts submenu
.addSubMenu(ui.createMenu('🔔 Alerts')
  .addItem('🔔 Check Overdue Follow-ups', 'checkOverdueFollowups')
  .addItem('📧 Send Daily Summary', 'sendDailySummaryEmail')
  .addItem('⚡ High Priority Prospects', 'showHighPriorityProspects'))
```

### 6. 🛠️ Advanced Maintenance
```javascript
// Add to System Maintenance submenu
.addItem('🔄 Recalculate All Formulas', 'recalculateAllFormulas')
.addItem('📊 Update Dashboard Stats', 'updateDashboardStats')
.addItem('🧪 Run System Health Check', 'runSystemHealthCheck')
.addItem('🗑️ Clear Old Logs', 'clearOldLogs')
```

## Priority Implementation Order

### HIGH PRIORITY (Immediate Value)
1. **Stale Prospects Report** - Find prospects not contacted in 60+ days
2. **Find Duplicates** - Identify potential duplicate companies
3. **Export to CSV** - Quick data export functionality
4. **Today's Route** - Generate route from today's outreach entries

### MEDIUM PRIORITY (Useful Additions)
5. **Pipeline Overview** - Visual pipeline status
6. **Validate Orphaned Records** - Check for data integrity issues
7. **High Priority Prospects** - Show hot/interested prospects
8. **Weekly Route Plan** - Plan ahead for the week

### LOW PRIORITY (Nice to Have)
9. **Full Backup** - Complete data backup
10. **System Health Check** - Comprehensive validation
11. **Daily Summary Email** - Automated email reports
12. **Clear Old Logs** - Maintenance cleanup

## Quick Implementation Example

Here's how to add the Stale Prospects function:

### Step 1: Add to MenuFunctions.js
```javascript
.addSubMenu(ui.createMenu('📊 Reports')
  .addItem('⏰ Stale Prospects (>60 days)', 'findStaleProspects')
  .addItem('🔍 Find Duplicates', 'findDuplicateCompanies'))
```

### Step 2: Create the function in a new file (e.g., `ReportFunctions.js`):
```javascript
function findStaleProspects() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var prospectsSheet = ss.getSheetByName('Prospects');
  var ui = SpreadsheetApp.getUi();
  
  // Get data
  var data = prospectsSheet.getDataRange().getValues();
  var headers = data.shift();
  var daysSinceIdx = headers.indexOf('Days Since Last Contact');
  var companyIdx = headers.indexOf('Company Name');
  
  var staleProspects = [];
  
  data.forEach(function(row) {
    var daysSince = row[daysSinceIdx];
    if (daysSince && daysSince > 60) {
      staleProspects.push({
        company: row[companyIdx],
        days: daysSince
      });
    }
  });
  
  // Show results
  if (staleProspects.length > 0) {
    var message = 'Found ' + staleProspects.length + ' stale prospects:\n\n';
    staleProspects.slice(0, 10).forEach(function(p) {
      message += '• ' + p.company + ' (' + p.days + ' days)\n';
    });
    if (staleProspects.length > 10) {
      message += '\n...and ' + (staleProspects.length - 10) + ' more';
    }
    ui.alert('⏰ Stale Prospects', message, ui.ButtonSet.OK);
  } else {
    ui.alert('✅ No Stale Prospects', 'All prospects have been contacted within 60 days!', ui.ButtonSet.OK);
  }
}
```

Would you like me to implement any of these functions?