# Reporting Logic Analysis - dashboard.html

## Date: February 10, 2026

## Executive Summary

Found **3 critical issues** with reporting logic that don't align with Settings.csv and System_Schema.csv configurations.

---

## Issues Identified

### 1. Date Format Mismatch ⚠️ CRITICAL

**Current Code:**
```javascript
function formatDate(date) {
  return date.toISOString().split('T')[0];  // Returns "YYYY-MM-DD"
}
```

**Expected Format (from Config.js):**
```javascript
DATE_FORMAT: 'MM/dd/yyyy'  // Expected "02/10/2026"
```

**Impact:**
- Backend receives ISO format dates ("2026-02-10")
- Config.js specifies MM/dd/yyyy format ("02/10/2026")
- Date parsing in Google Apps Script may fail or produce incorrect results
- Mismatch between frontend and backend date formats

**Fix Required:**
```javascript
function formatDate(date) {
  // Match Config.js DATE_FORMAT: 'MM/dd/yyyy'
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;  // Returns MM/dd/yyyy
}
```

---

### 2. Missing Date Range Validation ⚠️ MEDIUM

**Current Code:**
```javascript
function generateDateRangeReport() {
  const startDate = document.getElementById('reportStart').value;
  const endDate = document.getElementById('reportEnd').value;

  if (!startDate || !endDate) {
    showToast('Please select both start and end dates', 'error');
    return;
  }
  // No validation that start < end!
  // ... proceeds to generate report
}
```

**Impact:**
- User can select end date before start date
- Backend may return empty results or errors
- Poor user experience with no clear error message

**Fix Required:**
```javascript
function generateDateRangeReport() {
  const startDate = document.getElementById('reportStart').value;
  const endDate = document.getElementById('reportEnd').value;

  if (!startDate || !endDate) {
    showToast('Please select both start and end dates', 'error');
    return;
  }
  
  // NEW: Validate start < end
  if (new Date(startDate) > new Date(endDate)) {
    showToast('Start date must be before end date', 'error');
    return;
  }
  
  // ... rest of function
}
```

---

### 3. Misaligned Quick Date Buttons ⚠️ MEDIUM

**Current Quick Date Options:**
```html
<button onclick="setReportDates('thisWeek')">This Week</button>
<button onclick="setReportDates('thisMonth')">This Month</button>
<button onclick="setReportDates('last7')">Last 7 Days</button>
<button onclick="setReportDates('last30')">Last 30 Days</button>
```

**Settings.csv FOLLOWUP_TEMPLATE Entries:**
```
FOLLOWUP_TEMPLATE,Interested→Send pricing,7,,,,Default pricing follow-up
FOLLOWUP_TEMPLATE,Has Vendor→Follow 90d,90,,,,Longer nurture cadence
FOLLOWUP_TEMPLATE,Other→General follow,14,,,,Default catch-all
FOLLOWUP_TEMPLATE,No scrap→Check periodic,180,,,,Disqualified - periodic check
```

**Impact:**
- Quick date buttons don't align with business workflow intervals
- Missing common follow-up periods (14 days, 90 days, 180 days)
- Doesn\'t support standard business reporting cadences

**Fix Required:**
```html
<div class="quick-date-options">
  <button onclick="setReportDates('last7')">Last 7 Days</button>    <!-- Send pricing -->
  <button onclick="setReportDates('last14')">Last 14 Days</button>  <!-- General follow -->
  <button onclick="setReportDates('last30')">Last 30 Days</button>  <!-- Monthly -->
  <button onclick="setReportDates('last90')">Last 90 Days</button>  <!-- Follow 90d -->
  <button onclick="setReportDates('last180')">Last 180 Days</button><!-- Check periodic -->
</div>
```

Update `setReportDates()` function:
```javascript
function setReportDates(range) {
  const today = new Date();
  let start = new Date(today);
  
  switch (range) {
    case 'last7': 
      start.setDate(today.getDate() - 7); 
      break;      // FOLLOWUP_TEMPLATE: Send pricing (7 days)
    case 'last14': 
      start.setDate(today.getDate() - 14); 
      break;    // FOLLOWUP_TEMPLATE: General follow (14 days)
    case 'last30': 
      start.setDate(today.getDate() - 30); 
      break;    // Monthly reporting
    case 'last90': 
      start.setDate(today.getDate() - 90); 
      break;    // FOLLOWUP_TEMPLATE: Follow 90d (90 days)
    case 'last180': 
      start.setDate(today.getDate() - 180); 
      break;  // FOLLOWUP_TEMPLATE: Check periodic (180 days)
    case 'thisWeek':
      start.setDate(today.getDate() - today.getDay());
      break;    // Calendar week (Sunday start)
    case 'thisMonth':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      break;    // Calendar month
  }
  
  document.getElementById('reportStart').value = formatDate(start);
  document.getElementById('reportEnd').value = formatDate(today);
}
```

---

## System_Schema.csv Alignment

### Date Field Types
From System_Schema.csv:
- `Outreach.visitDate` - Date type
- `Outreach.nextVisitDate` - Date type
- `Prospects.lastOutreachDate` - Date type
- `Prospects.nextStepsDueDate` - Date type

All date fields should receive dates in MM/dd/yyyy format to match Config.js DATE_FORMAT and ensure consistent parsing.

---

## Timezone Considerations

**Settings.csv specifies:**
```
GLOBAL_CONST,Timezone,America/Chicago,,,,Prevents date drift in AppScript
```

**Current Issue:**
- JavaScript `new Date()` uses browser timezone
- Google Apps Script uses America/Chicago (per Settings.csv)
- May cause 1-day offset issues for users in different timezones

**Recommendation:**
Document that reports are generated in America/Chicago timezone. For most accurate results, ensure users understand date ranges are based on Central Time.

---

## Summary of Required Changes

| File | Line(s) | Change |
|------|---------|--------|
| dashboard.html | ~1960 | Fix `formatDate()` to return MM/dd/yyyy |
| dashboard.html | ~1880 | Add date range validation in `generateDateRangeReport()` |
| dashboard.html | ~1835 | Update quick date buttons HTML |
| dashboard.html | ~1975 | Update `setReportDates()` with new cases |

---

## Testing Checklist

- [ ] `formatDate(new Date())` returns "MM/dd/yyyy" format
- [ ] Selecting end date before start shows error toast
- [ ] All 5 quick date buttons work correctly
- [ ] Report generation uses correct date format
- [ ] Backend receives dates in expected format
- [ ] Date ranges match FOLLOWUP_TEMPLATE intervals

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Date format mismatch breaks reporting | HIGH | Fix formatDate() before deploying |
| Users select invalid date ranges | LOW | Add validation to prevent errors |
| Missing workflow-aligned intervals | MEDIUM | Add 14/90/180 day buttons |
| Timezone drift between frontend/backend | LOW | Document Central Time basis |
