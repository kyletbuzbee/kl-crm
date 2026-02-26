/**
 * Comprehensive data validation utilities
 */
var ValidationUtils = {
  /**
   * Enhanced date validation with comprehensive checks
   */
  validateDate: function(dateValue, options) {
    options = options || {};
    
    if (!dateValue) {
      return { success: false, error: 'Date value is required' };
    }

    var dateObj;
    
    // Handle different date input types
    if (dateValue instanceof Date) {
      dateObj = dateValue;
    } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      dateObj = new Date(dateValue);
    } else {
      return { success: false, error: 'Invalid date type: ' + typeof dateValue };
    }

    // Validate the date object
    if (isNaN(dateObj.getTime())) {
      return { success: false, error: 'Invalid date value: ' + dateValue };
    }

    // Additional validation for dates that are too far in the past or future
    var year = dateObj.getFullYear();
    var minYear = options.minYear || 1900;
    var maxYear = options.maxYear || 2100;
    
    if (year < minYear || year > maxYear) {
      return { success: false, error: 'Date year ' + year + ' out of reasonable range (' + minYear + '-' + maxYear + ')' };
    }

    // Optional: Check if date is in the future
    if (options.futureOnly && dateObj < new Date()) {
      return { success: false, error: 'Date must be in the future' };
    }

    // Optional: Check if date is in the past
    if (options.pastOnly && dateObj > new Date()) {
      return { success: false, error: 'Date must be in the past' };
    }

    return { success: true, date: dateObj };
  },

  /**
   * Safe date creation with validation
   */
  createDateSafely: function(dateValue, options) {
    var validation = this.validateDate(dateValue, options);
    if (!validation.success) {
      console.warn('Date creation failed:', validation.error);
      return null;
    }
    return validation.date;
  },

  /**
   * Validate numeric range
   */
  validateRange: function(value, min, max, fieldName) {
    var numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return { success: false, error: fieldName + ' must be a valid number' };
    }

    if (numValue < min || numValue > max) {
      return { success: false, error: fieldName + ' must be between ' + min + ' and ' + max };
    }

    return { success: true, value: numValue };
  },

  /**
   * Validate email format
   */
  validateEmail: function(email) {
    if (!email || typeof email !== 'string') {
      return { success: false, error: 'Email is required and must be a string' };
    }

    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Invalid email format' };
    }

    return { success: true, email: email.toLowerCase() };
  },

  /**
   * Validate string length
   */
  validateStringLength: function(str, minLength, maxLength, fieldName) {
    if (!str || typeof str !== 'string') {
      return { success: false, error: fieldName + ' must be a string' };
    }

    var length = str.trim().length;
    if (length < minLength || length > maxLength) {
      return { success: false, error: fieldName + ' must be between ' + minLength + ' and ' + maxLength + ' characters' };
    }

    return { success: true, value: str.trim() };
  },

  /**
   * Validate required fields in an object
   */
  validateRequiredFields: function(obj, requiredFields, context) {
    context = context || { functionName: 'unknown' };

    var missingFields = [];

    requiredFields.forEach(function(field) {
      if (!obj.hasOwnProperty(field)) {
        missingFields.push(field);
      } else if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return {
        success: false,
        error: 'Missing required fields: ' + missingFields.join(', '),
        missingFields: missingFields
      };
    }

    return { success: true };
  },

  /**
   * Validate business inventory operations
   */
  validateInventoryOperation: function(value, fieldName) {
    var numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return { success: false, error: fieldName + ' must be a valid number' };
    }

    if (numValue < 0) {
      return { success: false, error: fieldName + ' cannot be negative' };
    }

    return { success: true, value: numValue };
  },

  /**
   * Validate string normalization for comparison
   */
  normalizeString: function(str) {
    return (str || '').toString().toLowerCase().trim();
  },

  /**
   * Safe string comparison
   */
  equals: function(a, b) {
    return this.normalizeString(a) === this.normalizeString(b);
  },

  /**
   * Safe string split with filtering
   */
  splitAndFilter: function(str, delimiter) {
    if (!str || typeof str !== 'string') {
      return [];
    }
    return str.split(delimiter || ',')
      .map(function(part) { return part.trim(); })
      .filter(function(part) { return part.length > 0; });
  },

  /**
   * Check if a value is not empty (null, undefined, or empty string)
   */
  isNotEmpty: function(value) {
    return value !== null && value !== undefined && value.toString().trim().length > 0;
  },

  /**
   * Validate pipeline stage
   */
  isValidPipelineStage: function(stage) {
    var validStages = ['Outreach', 'Prospect', 'Nurture', 'Won', 'Lost', 'Disqualified'];
    if (!stage) {
      return { success: false, error: 'Stage is required' };
    }
    if (validStages.indexOf(stage) === -1) {
      return { success: false, error: 'Invalid stage: ' + stage + '. Valid stages: ' + validStages.join(', ') };
    }
    return { success: true, stage: stage };
  }
};
