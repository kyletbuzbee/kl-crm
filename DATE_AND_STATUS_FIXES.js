/**
 * CRITICAL FIXES for Date Parsing and Status Mapping
 * 
 * These functions fix the bugs found in testing:
 * 1. Date parsing off by one day (timezone issue)
 * 2. Status mapping incorrect for "Hot" status
 * 
 * Copy these functions into your GAS project to fix the issues.
 */

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
 * FIXED: mapStatusToStage - Correct mapping for "Hot" status
 * @param {string} status - Contact status
 * @return {string} Pipeline stage
 */
function mapStatusToStage(status) {
  try {
    if (!status) return 'Prospect';
    
    var s = status.toString().toLowerCase().trim();
  
    // Map statuses to stages per system schema
    var statusToStageMap = {
      'hot': 'Active Pursuit',
      'very hot': 'Active Pursuit',
      'interested (hot)': 'Active Pursuit',
      'warm': 'Nurture',
      'interested (warm)': 'Nurture',
      'interested': 'Nurture',
      'cold': 'Outreach',
      'new': 'Outreach',
      'prospect': 'Prospect',
      'nurture': 'Nurture',
      'won': 'Won',
      'active': 'Won',
      'lost': 'Lost',
      'disqualified': 'Lost',
      'not interested': 'Lost',
      'follow-up': 'Nurture',
      'initial contact': 'Outreach'
    };
    
    // Check for exact match first
    if (statusToStageMap[s]) {
      return statusToStageMap[s];
    }
    
    // Check for partial matches
    if (s.includes('hot')) return 'Active Pursuit';
    if (s.includes('warm')) return 'Nurture';
    if (s.includes('cold')) return 'Outreach';
    if (s.includes('won') || s.includes('active')) return 'Won';
    if (s.includes('lost') || s.includes('disqualified')) return 'Lost';
    if (s.includes('nurture')) return 'Nurture';
    if (s.includes('outreach') || s.includes('initial')) return 'Outreach';
    
    // Default fallback
    return 'Prospect';
    
  } catch (e) {
    console.error('Error in mapStatusToStage:', e.message);
    return 'Prospect'; // Return default on error
  }
}

/**
 * Test the fixes
 */
function testDateFixes() {
  console.log('Testing date parsing fixes...\n');
  
  var tests = [
    { input: '2026-01-15', expected: 'Jan 15 2026', desc: 'ISO format' },
    { input: '01/15/2026', expected: 'Jan 15 2026', desc: 'US format' },
    { input: '2026-02-06', expected: 'Feb 06 2026', desc: 'Today ISO' }
  ];
  
  tests.forEach(function(test) {
    var result = parseDateSafely(test.input);
    var resultStr = result ? result.toDateString() : 'null';
    var passed = resultStr.includes(test.expected);
    console.log((passed ? 'âœ…' : 'âŒ') + ' ' + test.desc + ': ' + resultStr);
  });
  
  console.log('\nTesting status mapping fixes...\n');
  
  var statusTests = [
    { input: 'Hot', expected: 'Active Pursuit' },
    { input: 'Interested (Hot)', expected: 'Active Pursuit' },
    { input: 'Warm', expected: 'Nurture' },
    { input: 'Cold', expected: 'Outreach' },
    { input: 'Won', expected: 'Won' }
  ];
  
  statusTests.forEach(function(test) {
    var result = mapStatusToStage(test.input);
    var passed = result === test.expected;
    console.log((passed ? 'âœ…' : 'âŒ') + ' ' + test.input + ' â†’ ' + result);
  });
}
