/**
 * Schema Normalizer - Single Source of Truth for Field Names
 * Resolves 133 schema inconsistency issues across the codebase
 * 
 * @version 1.0.0
 * @author K&L Recycling CRM Team
 */

const SchemaNormalizer = (function() {
  'use strict';

  // ============================================================================
  // SINGLE SOURCE OF TRUTH - Canonical Schema Definition
  // ============================================================================
  
  const SCHEMA = {
    Prospects: {
      // Core Identification
      companyId: {
        canonical: 'Company ID',
        variations: ['companyId', 'companyID', 'Company ID', 'CompanyID'],
        type: 'string',
        required: true
      },
      companyName: {
        canonical: 'Company Name',
        variations: ['companyName', 'Company Name', 'company name', 'CompanyName'],
        type: 'string',
        required: true
      },
      
      // Contact & Status
      contactStatus: {
        canonical: 'Contact Status',
        variations: ['contactStatus', 'Contact Status', 'contact status', 'ContactStatus'],
        type: 'string',
        required: true
      },
      lastOutcome: {
        canonical: 'Last Outcome',
        variations: ['lastOutcome', 'Last Outcome', 'last outcome', 'LastOutcome'],
        type: 'string',
        required: false
      },
      
      // Scoring
      priorityScore: {
        canonical: 'Priority Score',
        variations: ['priorityScore', 'Priority Score', 'priority score', 'PriorityScore'],
        type: 'number',
        required: false
      },
      urgencyScore: {
        canonical: 'Urgency Score',
        variations: ['urgencyScore', 'Urgency Score', 'urgency score', 'UrgencyScore'],
        type: 'number',
        required: false
      },
      urgencyBand: {
        canonical: 'UrgencyBand',
        variations: ['urgencyBand', 'UrgencyBand', 'urgencyband', 'Urgency Band'],
        type: 'string',
        required: false
      },
      closeProbability: {
        canonical: 'Close Probability',
        variations: ['closeProbability', 'Close Probability', 'close probability', 'CloseProbability'],
        type: 'number',
        required: false
      },
      
      // Dates
      lastOutreachDate: {
        canonical: 'Last Outreach Date',
        variations: ['lastOutreachDate', 'Last Outreach Date', 'lastOutreach', 'LastOutreachDate'],
        type: 'date',
        required: false
      },
      nextStepsDueDate: {
        canonical: 'Next Steps Due Date',
        variations: ['nextStepsDueDate', 'Next Steps Due Date', 'nextStepDueDate', 'NextStepsDueDate'],
        type: 'date',
        required: false
      },
      daysSinceLastContact: {
        canonical: 'Days Since Last Contact',
        variations: ['daysSinceLastContact', 'Days Since Last Contact', 'daysSinceLastContact'],
        type: 'number',
        required: false
      },
      
      // Location
      address: {
        canonical: 'Address',
        variations: ['address', 'Address', 'Street Address'],
        type: 'string',
        required: false
      },
      city: {
        canonical: 'City',
        variations: ['city', 'City'],
        type: 'string',
        required: false
      },
      zipCode: {
        canonical: 'Zip Code',
        variations: ['zipCode', 'Zip Code', 'zip', 'ZipCode'],
        type: 'string',
        required: false
      },
      latitude: {
        canonical: 'Latitude',
        variations: ['latitude', 'Latitude', 'lat'],
        type: 'number',
        required: false
      },
      longitude: {
        canonical: 'Longitude',
        variations: ['longitude', 'Longitude', 'lng', 'long'],
        type: 'number',
        required: false
      },
      
      // Classification
      industry: {
        canonical: 'Industry',
        variations: ['industry', 'Industry', 'sector'],
        type: 'string',
        required: false
      },
      
      // Calculated Fields
      nextStepDueCountdown: {
        canonical: 'Next Step Due Countdown',
        variations: ['nextStepDueCountdown', 'Next Step Due Countdown', 'nextStepsDueCountdown'],
        type: 'number',
        required: false
      }
    },
    
    Outreach: {
      // Core IDs
      outreachId: {
        canonical: 'Outreach ID',
        variations: ['outreachId', 'Outreach ID', 'outreachID', 'OutreachId'],
        type: 'string',
        required: true
      },
      companyId: {
        canonical: 'Company ID',
        variations: ['companyId', 'Company ID', 'companyID', 'CompanyId'],
        type: 'string',
        required: true
      },
      company: {
        canonical: 'Company',
        variations: ['company', 'Company', 'companyName'],
        type: 'string',
        required: true
      },
      
      // Visit Details
      visitDate: {
        canonical: 'Visit Date',
        variations: ['visitDate', 'Visit Date', 'visit_date', 'VisitDate'],
        type: 'date',
        required: true
      },
      outcome: {
        canonical: 'Outcome',
        variations: ['outcome', 'Outcome', 'result'],
        type: 'string',
        required: true
      },
      stage: {
        canonical: 'Stage',
        variations: ['stage', 'Stage'],
        type: 'string',
        required: false
      },
      status: {
        canonical: 'Status',
        variations: ['status', 'Status'],
        type: 'string',
        required: false
      },
      
      // Categorization
      outcomeCategory: {
        canonical: 'Outcome Category',
        variations: ['outcomeCategory', 'Outcome Category', 'outcome category', 'OutcomeCategory'],
        type: 'string',
        required: false
      },
      contactType: {
        canonical: 'Contact Type',
        variations: ['contactType', 'Contact Type', 'contact_type', 'ContactType'],
        type: 'string',
        required: false
      },
      
      // Follow-up
      nextVisitDate: {
        canonical: 'Next Visit Date',
        variations: ['nextVisitDate', 'Next Visit Date', 'next_visit_date', 'NextVisitDate'],
        type: 'date',
        required: false
      },
      nextVisitCountdown: {
        canonical: 'Next Visit Countdown',
        variations: ['nextVisitCountdown', 'Next Visit Countdown', 'nextVisitCountDown'],
        type: 'number',
        required: false
      },
      followUpAction: {
        canonical: 'Follow Up Action',
        variations: ['followUpAction', 'Follow Up Action', 'follow_up_action', 'FollowUpAction'],
        type: 'string',
        required: false
      },
      daysSinceLastVisit: {
        canonical: 'Days Since Last Visit',
        variations: ['daysSinceLastVisit', 'Days Since Last Visit', 'days_since_last_visit'],
        type: 'number',
        required: false
      },
      
      // Additional Fields
      emailSent: {
        canonical: 'Email Sent',
        variations: ['emailSent', 'Email Sent', 'email_sent', 'EmailSent'],
        type: 'boolean',
        required: false
      },
      owner: {
        canonical: 'Owner',
        variations: ['owner', 'Owner', 'assigned_to'],
        type: 'string',
        required: false
      },
      competitor: {
        canonical: 'Competitor',
        variations: ['competitor', 'Competitor', 'competition'],
        type: 'string',
        required: false
      },
      notes: {
        canonical: 'Notes',
        variations: ['notes', 'Notes', 'Comments', 'comments'],
        type: 'string',
        required: false
      },
      prospectsMatch: {
        canonical: 'Prospects Match',
        variations: ['prospectsMatch', 'Prospects Match', 'prospects_match', 'ProspectsMatch'],
        type: 'string',
        required: false
      }
    },
    
    Accounts: {
      // Core
      timestamp: {
        canonical: 'Timestamp',
        variations: ['timestamp', 'Timestamp', 'Date', 'date'],
        type: 'date',
        required: true
      },
      companyName: {
        canonical: 'Company Name',
        variations: ['companyName', 'Company Name', 'company', 'CompanyName'],
        type: 'string',
        required: true
      }
    },
    
    // Settings Sheet Schema
    Settings: {
      category: {
        canonical: 'Category',
        variations: ['category', 'Category'],
        type: 'string',
        required: true
      },
      key: {
        canonical: 'Key',
        variations: ['key', 'Key'],
        type: 'string',
        required: true
      },
      value1: {
        canonical: 'Value_1',
        variations: ['Value_1', 'value1', 'value_1', 'Value1'],
        type: 'string',
        required: false
      },
      value2: {
        canonical: 'Value_2',
        variations: ['Value_2', 'value2', 'value_2', 'Value2'],
        type: 'string',
        required: false
      },
      value3: {
        canonical: 'Value_3',
        variations: ['Value_3', 'value3', 'value_3', 'Value3'],
        type: 'string',
        required: false
      },
      value4: {
        canonical: 'Value_4',
        variations: ['Value_4', 'value4', 'value_4', 'Value4'],
        type: 'string',
        required: false
      },
      description: {
        canonical: 'Description',
        variations: ['description', 'Description'],
        type: 'string',
        required: false
      }
    },
    
    // Sales Sheet Schema - aligned with Sales.csv
    Sales: {
      salesId: {
        canonical: 'Sales ID',
        variations: ['salesId', 'Sales ID', 'salesID', 'SalesID'],
        type: 'string',
        required: true
      },
      date: {
        canonical: 'Date',
        variations: ['date', 'Date'],
        type: 'date',
        required: true
      },
      companyName: {
        canonical: 'Company Name',
        variations: ['companyName', 'Company Name', 'company', 'CompanyName'],
        type: 'string',
        required: true
      },
      companyId: {
        canonical: 'Company ID',
        variations: ['companyId', 'Company ID', 'companyID', 'CompanyId'],
        type: 'string',
        required: false
      },
      material: {
        canonical: 'Material',
        variations: ['material', 'Material'],
        type: 'string',
        required: true
      },
      weight: {
        canonical: 'Weight',
        variations: ['weight', 'Weight'],
        type: 'number',
        required: true
      },
      price: {
        canonical: 'Price',
        variations: ['price', 'Price'],
        type: 'number',
        required: true
      },
      paymentAmount: {
        canonical: 'Payment Amount',
        variations: ['paymentAmount', 'Payment Amount', 'payment', 'Payment'],
        type: 'number',
        required: false
      }
    },
    
    // Transactions Sheet Schema - aligned with Transactions.csv
    Transactions: {
      transactionId: {
        canonical: 'Transaction ID',
        variations: ['transactionId', 'Transaction ID', 'transactionID', 'TransactionId'],
        type: 'string',
        required: false
      },
      date: {
        canonical: 'Date',
        variations: ['date', 'Date'],
        type: 'date',
        required: true
      },
      company: {
        canonical: 'Company',
        variations: ['company', 'Company', 'companyName'],
        type: 'string',
        required: true
      },
      material: {
        canonical: 'Material',
        variations: ['material', 'Material'],
        type: 'string',
        required: true
      },
      netWeight: {
        canonical: 'Net Weight',
        variations: ['netWeight', 'Net Weight', 'net_weight', 'NetWeight'],
        type: 'number',
        required: true
      },
      price: {
        canonical: 'Price',
        variations: ['price', 'Price'],
        type: 'number',
        required: true
      },
      totalPayment: {
        canonical: 'Total Payment',
        variations: ['totalPayment', 'Total Payment', 'total_payment', 'TotalPayment'],
        type: 'number',
        required: false
      }
    },
    
    // Active Containers Sheet Schema
    ActiveContainers: {
      companyId: {
        canonical: 'Company ID',
        variations: ['companyId', 'Company ID', 'companyID', 'CompanyId'],
        type: 'string',
        required: true
      },
      companyName: {
        canonical: 'Company Name',
        variations: ['companyName', 'Company Name', 'company', 'CompanyName'],
        type: 'string',
        required: true
      },
      locationName: {
        canonical: 'Location Name',
        variations: ['locationName', 'Location Name', 'location', 'LocationName'],
        type: 'string',
        required: false
      },
      locationAddress: {
        canonical: 'Location Address',
        variations: ['locationAddress', 'Location Address', 'address', 'Address', 'LocationAddress'],
        type: 'string',
        required: false
      },
      city: {
        canonical: 'City',
        variations: ['city', 'City'],
        type: 'string',
        required: false
      },
      zipCode: {
        canonical: 'Zip Code',
        variations: ['zipCode', 'Zip Code', 'zip', 'ZipCode'],
        type: 'string',
        required: false
      },
      deployedAssets: {
        canonical: 'Current Deployed Asset(s)',
        variations: ['Current Deployed Asset(s)', 'deployedAssets', 'Current Deployed Assets', 'deployedAssets'],
        type: 'string',
        required: false
      },
      containerSize: {
        canonical: 'Container Size',
        variations: ['containerSize', 'Container Size', 'container', 'ContainerSize'],
        type: 'string',
        required: false
      }
    },
    
    // Legacy Accounts - corrected reference
    LegacyAccounts: {
      
      // Contact Info
      contactName: {
        canonical: 'Contact Name',
        variations: ['contactName', 'Contact Name', 'contact_name', 'ContactName'],
        type: 'string',
        required: false
      },
      contactPhone: {
        canonical: 'Contact Phone',
        variations: ['contactPhone', 'Contact Phone', 'contact_phone', 'ContactPhone'],
        type: 'string',
        required: false
      },
      contactRole: {
        canonical: 'Contact Role',
        variations: ['contactRole', 'Contact Role', 'contact_role', 'ContactRole'],
        type: 'string',
        required: false
      },
      
      // Location
      siteLocation: {
        canonical: 'Site Location',
        variations: ['siteLocation', 'Site Location', 'site_location', 'SiteLocation'],
        type: 'string',
        required: false
      },
      mailingLocation: {
        canonical: 'Mailing Location',
        variations: ['mailingLocation', 'Mailing Location', 'mailing_location', 'MailingLocation'],
        type: 'string',
        required: false
      },
      
      // Service Details
      handlingOfMetal: {
        canonical: 'Handling of Metal',
        variations: ['handlingOfMetal', 'Handling of Metal', 'handling_of_metal', 'HandlingOfMetal'],
        type: 'string',
        required: false
      },
      rollOffFee: {
        canonical: 'Roll-Off Fee',
        variations: ['rollOffFee', 'Roll-Off Fee', 'roll_off_fee', 'RollOffFee'],
        type: 'number',
        required: false
      },
      payoutPrice: {
        canonical: 'Payout Price',
        variations: ['payoutPrice', 'Payout Price', 'payout_price', 'PayoutPrice'],
        type: 'number',
        required: false
      },
      roloffContainerSize: {
        canonical: 'Roll Off Container Size',
        variations: ['rolloffContainerSize', 'Roll Off Container Size', 'roll_off_container_size', 'RollOffContainerSize'],
        type: 'string',
        required: false
      },
      
      // Status
      deployed: {
        canonical: 'Deployed',
        variations: ['deployed', 'Deployed', 'active', 'Active'],
        type: 'boolean',
        required: false
      },
      
      // Notes
      notes: {
        canonical: 'Notes',
        variations: ['notes', 'Notes', 'Comments', 'comments'],
        type: 'string',
        required: false
      }
    }
  };

  // ============================================================================
  // CACHE FOR PERFORMANCE
  // ============================================================================
  
  const variationToCanonicalCache = new Map();
  const headerMapCache = new Map();

  // ============================================================================
  // PRIVATE FUNCTIONS
  // ============================================================================
  
  /**
   * Normalize a string for comparison
   * @param {string} str - String to normalize
   * @returns {string} Normalized string
   */
  function _normalizeString(str) {
    if (!str) return '';
    return String(str).toLowerCase().trim().replace(/\s+/g, ' ');
  }
  
  /**
   * Find schema key with case-insensitive matching
   * @param {string} sheetName - Sheet name to look up
   * @returns {string|null} Matching schema key or null
   */
  function _getSchemaKey(sheetName) {
    if (!sheetName) return null;
    
    // Direct match first
    if (SCHEMA[sheetName]) {
      return sheetName;
    }
    
    // Case-insensitive search
    const normalizedInput = _normalizeString(sheetName);
    const schemaKeys = Object.keys(SCHEMA);
    
    for (let i = 0; i < schemaKeys.length; i++) {
      if (_normalizeString(schemaKeys[i]) === normalizedInput) {
        return schemaKeys[i];
      }
    }
    
    return null;
  }
  
  /**
   * Build reverse lookup map (variation -> canonical field name)
   * @param {string} sheetName - Name of the sheet
   * @returns {Object} Map of variations to canonical names
   */
  function _buildVariationMap(sheetName) {
    const cacheKey = `variationMap_${sheetName}`;
    
    if (variationToCanonicalCache.has(cacheKey)) {
      return variationToCanonicalCache.get(cacheKey);
    }
    
    // Use case-insensitive lookup
    const schemaKey = _getSchemaKey(sheetName);
    const sheetSchema = schemaKey ? SCHEMA[schemaKey] : null;
    
    if (!sheetSchema) {
      console.warn(`SchemaNormalizer: No schema defined for sheet "${sheetName}"`);
      return {};
    }
    
    const map = {};
    Object.keys(sheetSchema).forEach(canonicalName => {
      const field = sheetSchema[canonicalName];
      // Map all variations to the canonical JS name
      field.variations.forEach(variation => {
        map[_normalizeString(variation)] = canonicalName;
      });
      // Also map the canonical name to itself
      map[_normalizeString(canonicalName)] = canonicalName;
    });
    
    variationToCanonicalCache.set(cacheKey, map);
    return map;
  }
  
  /**
   * Calculate similarity between two strings (0-1)
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  function _calculateSimilarity(str1, str2) {
    try {
      const s1 = _normalizeString(str1);
      const s2 = _normalizeString(str2);
      
      if (s1 === s2) return 1.0;
      
      const longer = s1.length > s2.length ? s1 : s2;
      const shorter = s1.length > s2.length ? s2 : s1;
      
      if (longer.length === 0) return 1.0;
      
      const costs = [];
      for (let i = 0; i <= shorter.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= longer.length; j++) {
          if (i === 0) {
            costs[j] = j;
          } else if (j > 0) {
            let newValue = costs[j - 1];
            if (shorter.charAt(i - 1) !== longer.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
        if (i > 0) costs[longer.length] = lastValue;
      }
      
      const distance = costs[longer.length];
      return (longer.length - distance) / longer.length;
    } catch (e) {
      console.warn('SchemaNormalizer: Similarity calculation failed', e.message);
      return 0;
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  return {
    
    /**
     * Get the canonical field name from any variation
     * @param {string} sheetName - Sheet name (Prospects, Outreach, Accounts)
     * @param {string} fieldName - Field name (any variation)
     * @returns {string|null} Canonical field name or null if not found
     * 
     * @example
     * SchemaNormalizer.getCanonicalName('Prospects', 'contact status');
     * // Returns: 'contactStatus'
     */
    getCanonicalName: function(sheetName, fieldName) {
      try {
        const variationMap = _buildVariationMap(sheetName);
        const normalized = _normalizeString(fieldName);
        
        // Exact match
        if (variationMap[normalized]) {
          return variationMap[normalized];
        }
        
        // Fuzzy match for typos (threshold: 0.85)
        let bestMatch = null;
        let bestScore = 0;
        
        Object.keys(variationMap).forEach(variation => {
          const score = _calculateSimilarity(normalized, variation);
          if (score > bestScore && score >= 0.85) {
            bestScore = score;
            bestMatch = variationMap[variation];
          }
        });
        
        if (bestMatch) {
          console.warn(`SchemaNormalizer: Fuzzy matched "${fieldName}" to "${bestMatch}" (score: ${bestScore.toFixed(2)})`);
        }
        
        return bestMatch;
      } catch (e) {
        console.error('SchemaNormalizer: getCanonicalName failed', e.message);
        return null;
      }
    },
    
    /**
     * Get the canonical sheet header name for display
     * @param {string} sheetName - Sheet name
     * @param {string} canonicalName - Canonical field name
     * @returns {string} Header name for display
     * 
     * @example
     * SchemaNormalizer.getHeaderName('Prospects', 'contactStatus');
     * // Returns: 'Contact Status'
     */
    getHeaderName: function(sheetName, canonicalName) {
      try {
        const schemaKey = _getSchemaKey(sheetName);
        const sheetSchema = schemaKey ? SCHEMA[schemaKey] : null;
        if (!sheetSchema || !sheetSchema[canonicalName]) {
          return canonicalName;
        }
        return sheetSchema[canonicalName].canonical;
      } catch (e) {
        return canonicalName;
      }
    },
    
    /**
     * Get all variations for a field
     * @param {string} sheetName - Sheet name
     * @param {string} canonicalName - Canonical field name
     * @returns {string[]} Array of all variations
     */
    getVariations: function(sheetName, canonicalName) {
      const schemaKey = _getSchemaKey(sheetName);
      const sheetSchema = schemaKey ? SCHEMA[schemaKey] : null;
      if (!sheetSchema || !sheetSchema[canonicalName]) {
        return [canonicalName];
      }
      return sheetSchema[canonicalName].variations;
    },
    
    /**
     * Build a header index map from raw headers
     * @param {string} sheetName - Sheet name
     * @param {string[]} headers - Array of header names from sheet
     * @returns {Object} Map of canonical names to column indices
     * 
     * @example
     * const headers = ['Company ID', 'Contact Status', 'Priority Score'];
     * const map = SchemaNormalizer.buildHeaderMap('Prospects', headers);
     * // Returns: { companyId: 0, contactStatus: 1, priorityScore: 2 }
     */
    buildHeaderMap: function(sheetName, headers) {
      try {
        // Validate headers parameter
        if (!headers) {
          console.warn('SchemaNormalizer: buildHeaderMap called with undefined headers');
          return {};
        }
        
        // Convert to array if single value passed
        if (!Array.isArray(headers)) {
          console.warn('SchemaNormalizer: buildHeaderMap headers is not an array, type: ' + typeof headers);
          // Try to convert single value to array
          if (typeof headers === 'string') {
            headers = [headers];
          } else {
            console.error('SchemaNormalizer: buildHeaderMap cannot process headers of type ' + typeof headers);
            return {};
          }
        }
        
        // Handle empty array
        if (headers.length === 0) {
          console.warn('SchemaNormalizer: buildHeaderMap called with empty headers array');
          return {};
        }
        
        const cacheKey = `headerMap_${sheetName}_${headers.join('|')}`;
        
        if (headerMapCache.has(cacheKey)) {
          return headerMapCache.get(cacheKey);
        }
        
        const map = {};
        headers.forEach((header, index) => {
          // Skip empty/null/undefined headers
          if (!header) return;
          const canonicalName = this.getCanonicalName(sheetName, header);
          if (canonicalName) {
            map[canonicalName] = index;
          } else {
            console.warn(`SchemaNormalizer: Unknown header "${header}" in ${sheetName}`);
          }
        });
        
        headerMapCache.set(cacheKey, map);
        return map;
      } catch (e) {
        console.error('SchemaNormalizer: buildHeaderMap failed', e.message);
        return {};
      }
    },
    
    /**
     * Get field value using canonical name
     * @param {Array} row - Row data array
     * @param {Object} headerMap - Header map from buildHeaderMap
     * @param {string} canonicalName - Canonical field name
     * @returns {*} Field value or undefined
     * 
     * @example
     * const status = SchemaNormalizer.get(row, headerMap, 'contactStatus');
     */
    get: function(row, headerMap, canonicalName) {
      const index = headerMap[canonicalName];
      if (index === undefined) {
        console.warn(`SchemaNormalizer: Field "${canonicalName}" not found in header map`);
        return undefined;
      }
      return row[index];
    },
    
    /**
     * Set field value using canonical name
     * @param {Array} row - Row data array
     * @param {Object} headerMap - Header map from buildHeaderMap
     * @param {string} canonicalName - Canonical field name
     * @param {*} value - Value to set
     * @returns {boolean} Success indicator
     */
    set: function(row, headerMap, canonicalName, value) {
      const index = headerMap[canonicalName];
      if (index === undefined) {
        console.warn(`SchemaNormalizer: Field "${canonicalName}" not found in header map`);
        return false;
      }
      row[index] = value;
      return true;
    },
    
    /**
     * Validate that a field exists in the schema
     * @param {string} sheetName - Sheet name
     * @param {string} fieldName - Field name (any variation)
     * @returns {boolean} True if field exists
     */
    isValidField: function(sheetName, fieldName) {
      return this.getCanonicalName(sheetName, fieldName) !== null;
    },
    
    /**
     * Get field type
     * @param {string} sheetName - Sheet name
     * @param {string} canonicalName - Canonical field name
     * @returns {string|null} Field type or null
     */
    getFieldType: function(sheetName, canonicalName) {
      const schemaKey = _getSchemaKey(sheetName);
      const sheetSchema = schemaKey ? SCHEMA[schemaKey] : null;
      if (!sheetSchema || !sheetSchema[canonicalName]) {
        return null;
      }
      return sheetSchema[canonicalName].type;
    },
    
    /**
     * Check if field is required
     * @param {string} sheetName - Sheet name
     * @param {string} canonicalName - Canonical field name
     * @returns {boolean} True if required
     */
    isRequired: function(sheetName, canonicalName) {
      const schemaKey = _getSchemaKey(sheetName);
      const sheetSchema = schemaKey ? SCHEMA[schemaKey] : null;
      if (!sheetSchema || !sheetSchema[canonicalName]) {
        return false;
      }
      return sheetSchema[canonicalName].required;
    },
    
    /**
     * Get all canonical field names for a sheet
     * @param {string} sheetName - Sheet name
     * @returns {string[]} Array of canonical field names
     */
    getAllFields: function(sheetName) {
      const schemaKey = _getSchemaKey(sheetName);
      const sheetSchema = schemaKey ? SCHEMA[schemaKey] : null;
      if (!sheetSchema) {
        return [];
      }
      return Object.keys(sheetSchema);
    },
    
    /**
     * Clear internal caches
     */
    clearCache: function() {
      variationToCanonicalCache.clear();
      headerMapCache.clear();
      console.log('SchemaNormalizer: Cache cleared');
    },
    
    /**
     * Get the raw schema (for debugging)
     * @returns {Object} Complete schema definition
     */
    getSchema: function() {
      return SCHEMA;
    },
    
    /**
     * Normalize headers to canonical format
     * @param {string} sheetName - Sheet name
     * @param {string[]} headers - Raw headers from sheet
     * @returns {string[]} Normalized canonical headers
     */
    normalizeHeaders: function(sheetName, headers) {
      return headers.map(header => {
        const canonical = this.getCanonicalName(sheetName, header);
        return canonical || header;
      });
    }
  };
  
  
})();

// Make available globally for Google Apps Script V8
// In GAS, we need to attach to the global namespace differently
(function() {
  if (typeof globalThis !== 'undefined') {
    globalThis.SchemaNormalizer = SchemaNormalizer;
  }
  if (typeof global !== 'undefined') {
    global.SchemaNormalizer = SchemaNormalizer;
  }
  // In GAS V8, 'this' at top level is the global object
  if (typeof this !== 'undefined') {
    this.SchemaNormalizer = SchemaNormalizer;
  }
})();

// Also try to assign directly for GAS
try {
  SchemaNormalizer = SchemaNormalizer;
} catch(e) {
  // Ignore if already defined
}

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SchemaNormalizer;
}
