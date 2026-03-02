/**
 * K&L Recycling CRM - Configuration
 * Centralized constants for Sheet names and Column Headers.
 */

var CONFIG = {
  // Sheet Names
  SHEETS: {
    OUTREACH: 'Outreach',
    PROSPECTS: 'Prospects',
    ACCOUNTS: 'Accounts',
    CONTACTS: 'Contacts',
    DASHBOARD: 'Dashboard',
    METRICS: 'MetricsHistory',
    SYSTEM_LOG: 'System_OpsLog',
    GEO_CACHE: 'System_GeoCache',
    SETTINGS: 'Settings',
    STALE_PROSPECTS: 'Stale Prospects',
    // New sheets for integration
    SALES: 'Sales',
    ACTIVE_CONTAINERS: 'Active Containers',
    TRANSACTIONS: 'Transactions'
  },

  // Legacy compatibility - keep old names but mark as deprecated
  SHEET_OUTREACH: 'Outreach',
  SHEET_PROSPECTS: 'Prospects',
  SHEET_ACCOUNTS: 'Accounts',
  SHEET_CONTACTS: 'Contacts',
  SHEET_NEW_ACCOUNTS: 'Accounts', // Deprecated - use SHEET_ACCOUNTS instead
  SHEET_SETTINGS: 'Settings',

  // Application Settings
  APP_TITLE: 'K&L Recycling CRM',
  
  // Header Definitions (Must match Sheet Headers EXACTLY)
  // Aligned with user's exact requirements
  HEADERS: {
    OUTREACH: [
      'Outreach ID', 'Company ID', 'Company', 'Visit Date', 'Notes', 
      'Outcome', 'Stage', 'Status', 'Next Visit Date', 'Days Since Last Visit', 
      'Next Visit Countdown', 'Outcome Category', 'Follow Up Action', 'Owner', 
      'Prospects Match', 'Contact Type', 'Email Sent', 'Competitor'
    ],
    PROSPECTS: [
      'Company ID', 'Address', 'City', 'Zip Code', 'Company Name', 'Industry', 
      'Latitude', 'Longitude', 'Last Outcome', 'Last Outreach Date', 
      'Days Since Last Contact', 'Next Step Due Countdown', 'Next Steps Due Date', 
      'Contact Status', 'Close Probability', 'Priority Score', 
      'UrgencyBand', 'Urgency Score', 'Totals'
    ],
    ACCOUNTS: [
      'Deployed', 'Timestamp', 'Company Name', 'Contact Name', 'Contact Phone', 
      'Contact Role', 'Site Location', 'Mailing Location', 'Roll-Off Fee', 
      'Handling of Metal', 'Roll Off Container Size', 'Notes', 'Payout Price'
    ],
    CONTACTS: [
      'Name', 'Company', 'Account', 'Role', 'Department', 'Phone Number', 
      'Email', 'Address'
    ],
    SETTINGS: [
      'Category', 'Key', 'Value_1', 'Value_2', 'Value_3', 'Value_4', 'Description'
    ],
    // Sales sheet headers - aligned with Sales.csv
    SALES: [
      'Sales ID', 'Date', 'Company Name', 'Company ID', 'Material', 'Weight', ' Price ', 'Payment Amount'
    ],
    // Active Containers sheet headers exactly as specified by user
    ACTIVE_CONTAINERS: [
      'Company ID', 'Company Name', 'Location Name', 'Location Address', 'City', 'Zip Code', 
      'Current Deployed Asset(s)', 'Container Size'
    ],
    // Transactions sheet headers (from Transaction.csv data)
    TRANSACTIONS: [
      'Transaction ID', 'Date', 'Company', 'Material', 'Net Weight', 'Price', 'Total Payment'
    ]
  },

  // Schema Normalizer Configuration
  SCHEMA: {
    PROSPECTS: {
      companyId: { header: 'Company ID', type: 'string', required: true },
      address: { header: 'Address', type: 'string', required: false },
      city: { header: 'City', type: 'string', required: false },
      zipCode: { header: 'Zip Code', type: 'string', required: false },
      companyName: { header: 'Company Name', type: 'string', required: true },
      industry: { header: 'Industry', type: 'string', required: false },
      latitude: { header: 'Latitude', type: 'number', required: false },
      longitude: { header: 'Longitude', type: 'number', required: false },
      lastOutcome: { header: 'Last Outcome', type: 'string', required: false },
      lastOutreachDate: { header: 'Last Outreach Date', type: 'date', required: false },
      daysSinceLastContact: { header: 'Days Since Last Contact', type: 'number', required: false },
      nextStepDueCountdown: { header: 'Next Step Due Countdown', type: 'number', required: false },
      nextStepsDueDate: { header: 'Next Steps Due Date', type: 'date', required: false },
      contactStatus: { header: 'Contact Status', type: 'string', required: true },
      closeProbability: { header: 'Close Probability', type: 'number', required: false },
      priorityScore: { header: 'Priority Score', type: 'number', required: false, default: 60 },
      urgencyBand: { header: 'UrgencyBand', type: 'string', required: false },
      urgencyScore: { header: 'Urgency Score', type: 'number', required: false },
      totals: { header: 'Totals', type: 'text', required: false }
    },
    OUTREACH: {
      outreachId: { header: 'Outreach ID', type: 'string', required: true },
      companyId: { header: 'Company ID', type: 'string', required: true },
      company: { header: 'Company', type: 'string', required: true },
      visitDate: { header: 'Visit Date', type: 'date', required: true },
      notes: { header: 'Notes', type: 'text', required: false },
      outcome: { header: 'Outcome', type: 'string', required: true },
      stage: { header: 'Stage', type: 'string', required: false },
      status: { header: 'Status', type: 'string', required: false },
      nextVisitDate: { header: 'Next Visit Date', type: 'date', required: false },
      daysSinceLastVisit: { header: 'Days Since Last Visit', type: 'string', required: false },
      nextVisitCountdown: { header: 'Next Visit Countdown', type: 'number', required: false },
      outcomeCategory: { header: 'Outcome Category', type: 'string', required: false },
      followUpAction: { header: 'Follow Up Action', type: 'string', required: false },
      owner: { header: 'Owner', type: 'string', required: false, default: 'Kyle Buzbee' },
      prospectsMatch: { header: 'Prospects Match', type: 'string', required: false },
      contactType: { header: 'Contact Type', type: 'string', required: false, default: 'Visit' },
      emailSent: { header: 'Email Sent', type: 'boolean', required: false, default: false },
      competitor: { header: 'Competitor', type: 'string', required: false, default: 'None' }
    },
    ACCOUNTS: {
      deployed: { header: 'Deployed', type: 'string', required: false },
      timestamp: { header: 'Timestamp', type: 'date', required: true },
      companyName: { header: 'Company Name', type: 'string', required: true },
      contactName: { header: 'Contact Name', type: 'string', required: false },
      contactPhone: { header: 'Contact Phone', type: 'string', required: false },
      contactRole: { header: 'Contact Role', type: 'string', required: false },
      siteLocation: { header: 'Site Location', type: 'string', required: false },
      mailingLocation: { header: 'Mailing Location', type: 'string', required: false },
      rollOffFee: { header: 'Roll-Off Fee', type: 'string', required: false, default: 'Yes' },
      handlingOfMetal: { header: 'Handling of Metal', type: 'string', required: false },
      rolloffContainerSize: { header: 'Roll Off Container Size', type: 'string', required: false, default: '30 yd' },
      notes: { header: 'Notes', type: 'text', required: false },
      payoutPrice: { header: 'Payout Price', type: 'text', required: false }
    },
    // Sales schema - aligned with Sales.csv
    SALES: {
      salesId: { header: 'Sales ID', type: 'string', required: false },
      date: { header: 'Date', type: 'date', required: false },
      companyName: { header: 'Company Name', type: 'string', required: false },
      companyId: { header: 'Company ID', type: 'string', required: false },
      material: { header: 'Material', type: 'string', required: false },
      weight: { header: 'Weight', type: 'number', required: false },
      price: { header: ' Price ', type: 'number', required: false },
      paymentAmount: { header: 'Payment Amount', type: 'number', required: false }
    },
    // Active containers schema - exactly as user specified
    ACTIVE_CONTAINERS: {
      companyId: { header: 'Company ID', type: 'string', required: false },
      companyName: { header: 'Company Name', type: 'string', required: false },
      locationName: { header: 'Location Name', type: 'string', required: false },
      locationAddress: { header: 'Location Address', type: 'string', required: false },
      city: { header: 'City', type: 'string', required: false },
      zipCode: { header: 'Zip Code', type: 'string', required: false },
      deployedAssets: { header: 'Current Deployed Asset(s)', type: 'string', required: false },
      containerSize: { header: 'Container Size', type: 'string', required: false }
    },
    // Transactions schema - from Transaction.csv data
    TRANSACTIONS: {
      transactionId: { header: 'Transaction ID', type: 'string', required: false },
      date: { header: 'Date', type: 'date', required: true },
      company: { header: 'Company', type: 'string', required: true },
      material: { header: 'Material', type: 'string', required: true },
      netWeight: { header: 'Net Weight', type: 'number', required: true },
      price: { header: 'Price', type: 'number', required: true },
      totalPayment: { header: 'Total Payment', type: 'number', required: false }
    }
  },

  // Standardized Variables (can be overridden by settings)
  DEFAULT_OWNER: 'Kyle Buzbee',
  _timezoneCache: null,
  get TIMEZONE() {
    if (this._timezoneCache) return this._timezoneCache;
    this._timezoneCache = getGlobalConstant('Timezone', 'America/Chicago');
    return this._timezoneCache;
  },
  DATE_FORMAT: 'MM/dd/yyyy'
};

/**
 * Fallback function for formatDate if SharedUtils is not available
 */
function formatDate(date) {
  if (typeof SharedUtils !== 'undefined' && typeof SharedUtils.checkSpreadsheetAccess === 'function') {
    var accessResult = SharedUtils.checkSpreadsheetAccess('formatDate');
    if (!accessResult.success) {
      throw new Error(accessResult.error);
    }
  }

  if (typeof SharedUtils !== 'undefined' && typeof SharedUtils.formatDate === 'function') {
    return SharedUtils.formatDate(date);
  }

  if (!date) return '';

  try {
    var dateValidation = (typeof ValidationUtils !== 'undefined' && ValidationUtils.validateDate)
      ? ValidationUtils.validateDate(date, { minYear: 1900, maxYear: 2100 })
      : { success: true, date: (date instanceof Date ? date : new Date(date)) };

    if (!dateValidation.success) {
      console.warn('Invalid date provided to formatDate:', date, dateValidation.error);
      return '';
    }

    var dateObj = dateValidation.date;
    return Utilities.formatDate(dateObj, CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);
  } catch (e) {
    console.error('Error formatting date:', e);
    return '';
  }
}

/**
 * Get global constant from settings, with fallback
 */
function getGlobalConstant(key, defaultValue) {
  var accessResult = SharedUtils.checkSpreadsheetAccess('getGlobalConstant');
  if (!accessResult.success) {
    throw new Error(accessResult.error);
  }

  var ss = accessResult.spreadsheet;

  try {
    var settings = getSettings();
    if (settings.globalConstants && settings.globalConstants[key]) {
      return settings.globalConstants[key].value;
    }
  } catch (e) {
    console.warn('Could not load global constant ' + key + ', using default:', defaultValue);
    try {
      var opsLogSheet = ss.getSheetByName(CONFIG.SHEETS.SYSTEM_LOG);
      if (opsLogSheet) {
        var currentDate = ValidationUtils.createDateSafely(new Date());
        if (currentDate) {
          opsLogSheet.appendRow([
            currentDate,
            'getGlobalConstant',
            'WARNING',
            'Could not load global constant ' + key + ', using default: ' + defaultValue,
            e.message
          ]);
        }
      }
    } catch (logError) {
      console.error('Failed to log to Ops Log:', logError);
    }
  }
  return defaultValue;
}
