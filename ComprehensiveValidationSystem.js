/**
 * Comprehensive Validation System for K&L Recycling CRM
 * Enhanced validation with case-insensitive matching, robust error handling, and data normalization
 */

var ComprehensiveValidation = {
  /**
   * Enhanced validation for prospects data with comprehensive checks
   */
  validateProspectsData: function(data, options) {
    options = options || {
      requireAllFields: false,
      strictValidation: true,
      normalizeData: true
    };

    try {
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No data provided for validation');
      }

      // Validate headers first
      var headerValidation = this._validateHeaders(data[0], 'prospects');
      if (!headerValidation.success) {
        return {
          success: false,
          error: 'Header validation failed',
          details: headerValidation
        };
      }

      var results = {
        success: true,
        validRows: [],
        invalidRows: [],
        warnings: [],
        statistics: {
          totalRows: data.length - 1, // Exclude header
          validRows: 0,
          invalidRows: 0,
          warnings: 0
        }
      };

      var headerMap = headerValidation.headerMap;

      // Process each data row
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var rowNumber = i + 1; // +1 for 1-based indexing
        var rowValidation = this._validateProspectsRow(row, rowNumber, headerMap, options);

        if (rowValidation.success) {
          results.validRows.push({
            rowNumber: rowNumber,
            data: rowValidation.normalizedData || row,
            warnings: rowValidation.warnings || []
          });
          results.statistics.validRows++;
        } else {
          results.invalidRows.push({
            rowNumber: rowNumber,
            data: row,
            errors: rowValidation.errors,
            warnings: rowValidation.warnings || []
          });
          results.statistics.invalidRows++;
        }

        if (rowValidation.warnings && rowValidation.warnings.length > 0) {
          results.warnings = results.warnings.concat(rowValidation.warnings);
          results.statistics.warnings += rowValidation.warnings.length;
        }
      }

      results.success = results.statistics.invalidRows === 0;

      return results;

    } catch (e) {
      return {
        success: false,
        error: 'Validation error: ' + e.message,
        stack: e.stack
      };
    }
  },

  /**
   * Enhanced validation for outreach data with comprehensive checks
   */
  validateOutreachData: function(data, options) {
    options = options || {
      requireAllFields: false,
      strictValidation: true,
      normalizeData: true
    };

    try {
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No data provided for validation');
      }

      // Validate headers first
      var headerValidation = this._validateHeaders(data[0], 'outreach');
      if (!headerValidation.success) {
        return {
          success: false,
          error: 'Header validation failed',
          details: headerValidation
        };
      }

      var results = {
        success: true,
        validRows: [],
        invalidRows: [],
        warnings: [],
        statistics: {
          totalRows: data.length - 1, // Exclude header
          validRows: 0,
          invalidRows: 0,
          warnings: 0
        }
      };

      var headerMap = headerValidation.headerMap;

      // Process each data row
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var rowNumber = i + 1; // +1 for 1-based indexing
        var rowValidation = this._validateOutreachRow(row, rowNumber, headerMap, options);

        if (rowValidation.success) {
          results.validRows.push({
            rowNumber: rowNumber,
            data: rowValidation.normalizedData || row,
            warnings: rowValidation.warnings || []
          });
          results.statistics.validRows++;
        } else {
          results.invalidRows.push({
            rowNumber: rowNumber,
            data: row,
            errors: rowValidation.errors,
            warnings: rowValidation.warnings || []
          });
          results.statistics.invalidRows++;
        }

        if (rowValidation.warnings && rowValidation.warnings.length > 0) {
          results.warnings = results.warnings.concat(rowValidation.warnings);
          results.statistics.warnings += rowValidation.warnings.length;
        }
      }

      results.success = results.statistics.invalidRows === 0;

      return results;

    } catch (e) {
      return {
        success: false,
        error: 'Validation error: ' + e.message,
        stack: e.stack
      };
    }
  },

  /**
   * Validate headers for a specific data type
   */
  _validateHeaders: function(headers, dataType) {
    try {
      if (!headers || !Array.isArray(headers) || headers.length === 0) {
        throw new Error('No headers provided');
      }

      var expectedHeaders;
      if (dataType === 'prospects') {
        expectedHeaders = CONFIG.HEADERS.PROSPECTS;
      } else if (dataType === 'outreach') {
        expectedHeaders = CONFIG.HEADERS.OUTREACH;
      } else {
        throw new Error('Unknown data type: ' + dataType);
      }

      var headerMap = {};
      var missingHeaders = [];
      var extraHeaders = [];
      var warnings = [];

      // Create case-insensitive mapping
      expectedHeaders.forEach(function(expectedHeader, index) {
        var normalizedExpected = this._normalizeString(expectedHeader);
        var found = false;

        for (var i = 0; i < headers.length; i++) {
          var actualHeader = headers[i];
          if (!actualHeader) continue;

          var normalizedActual = this._normalizeString(actualHeader);

          if (normalizedActual === normalizedExpected) {
            headerMap[expectedHeader] = i;
            found = true;
            break;
          }
        }

        if (!found) {
          missingHeaders.push(expectedHeader);
        }
      }, this);

      // Check for extra headers
      headers.forEach(function(header, index) {
        if (!header) return;

        var normalizedHeader = this._normalizeString(header);
        var isExpected = expectedHeaders.some(function(expected) {
          return this._normalizeString(expected) === normalizedHeader;
        }, this);

        if (!isExpected) {
          extraHeaders.push({
            header: header,
            position: index
          });
        }
      }, this);

      if (extraHeaders.length > 0) {
        warnings.push('Extra headers found: ' + extraHeaders.map(function(eh) {
          return eh.header + ' (column ' + (eh.position + 1) + ')';
        }).join(', '));
      }

      if (missingHeaders.length > 0) {
        return {
          success: false,
          error: 'Missing required headers: ' + missingHeaders.join(', '),
          missingHeaders: missingHeaders,
          warnings: warnings
        };
      }

      return {
        success: true,
        headerMap: headerMap,
        warnings: warnings
      };

    } catch (e) {
      return {
        success: false,
        error: 'Header validation error: ' + e.message
      };
    }
  },

  /**
   * Validate a single prospects row
   */
  _validateProspectsRow: function(row, rowNumber, headerMap, options) {
    try {
      var errors = [];
      var warnings = [];
      var normalizedData = row.slice(); // Create a copy

      // Required fields validation
      var companyId = this._getFieldValue(row, headerMap, 'Company ID');
      var companyName = this._getFieldValue(row, headerMap, 'Company Name');

      if (!companyId || companyId.trim() === '') {
        errors.push({
          field: 'Company ID',
          error: 'Company ID is required',
          severity: 'critical'
        });
      }

      if (!companyName || companyName.trim() === '') {
        errors.push({
          field: 'Company Name',
          error: 'Company Name is required',
          severity: 'critical'
        });
      }

      // Validate industry
      var industry = this._getFieldValue(row, headerMap, 'Industry');
      var industryValidation = this._validateIndustry(industry);
      if (!industryValidation.valid) {
        errors.push({
          field: 'Industry',
          error: industryValidation.error,
          suggestions: industryValidation.suggestions,
          severity: 'high'
        });
      } else if (industryValidation.warning) {
        warnings.push({
          field: 'Industry',
          warning: industryValidation.warning,
          severity: 'low'
        });
        if (options.normalizeData) {
          normalizedData[headerMap['Industry']] = industryValidation.normalized;
        }
      }

      // Validate contact status
      var contactStatus = this._getFieldValue(row, headerMap, 'Contact Status');
      var statusValidation = this._validateStatus(contactStatus);
      if (!statusValidation.valid) {
        errors.push({
          field: 'Contact Status',
          error: statusValidation.error,
          suggestions: statusValidation.suggestions,
          severity: 'high'
        });
      } else if (statusValidation.warning) {
        warnings.push({
          field: 'Contact Status',
          warning: statusValidation.warning,
          severity: 'low'
        });
        if (options.normalizeData) {
          normalizedData[headerMap['Contact Status']] = statusValidation.normalized;
        }
      }

      // Validate numeric fields
      var numericFields = [
        { name: 'Latitude', min: -90, max: 90 },
        { name: 'Longitude', min: -180, max: 180 },
        { name: 'Days Since Last Contact', min: 0, max: 3650 },
        { name: 'Close Probability', min: 0, max: 100 },
        { name: 'Priority Score', min: 0, max: 1000 },
        { name: 'Urgency Score', min: 0, max: 100 }
      ];

      numericFields.forEach(function(field) {
        var value = this._getFieldValue(row, headerMap, field.name);
        if (value && value.trim() !== '') {
          var numericValidation = this._validateNumeric(value, field.min, field.max);
          if (!numericValidation.valid) {
            errors.push({
              field: field.name,
              error: numericValidation.error,
              severity: 'medium'
            });
          } else if (options.normalizeData) {
            normalizedData[headerMap[field.name]] = numericValidation.normalized;
          }
        }
      }, this);

      // Validate date fields
      var dateFields = ['Last Outreach Date', 'Next Steps Due Date'];
      dateFields.forEach(function(fieldName) {
        var value = this._getFieldValue(row, headerMap, fieldName);
        if (value && value.trim() !== '') {
          var dateValidation = this._validateDate(value);
          if (!dateValidation.valid) {
            errors.push({
              field: fieldName,
              error: dateValidation.error,
              severity: 'medium'
            });
          } else if (options.normalizeData) {
            normalizedData[headerMap[fieldName]] = dateValidation.normalized;
          }
        }
      }, this);

      // Validate urgency band
      var urgencyBand = this._getFieldValue(row, headerMap, 'UrgencyBand');
      var urgencyBandValidation = this._validateUrgencyBand(urgencyBand);
      if (!urgencyBandValidation.valid) {
        errors.push({
          field: 'UrgencyBand',
          error: urgencyBandValidation.error,
          suggestions: urgencyBandValidation.suggestions,
          severity: 'low'
        });
      } else if (urgencyBandValidation.warning) {
        warnings.push({
          field: 'UrgencyBand',
          warning: urgencyBandValidation.warning,
          severity: 'low'
        });
        if (options.normalizeData) {
          normalizedData[headerMap['UrgencyBand']] = urgencyBandValidation.normalized;
        }
      }

      // Validate last activity type
      var lastActivityType = this._getFieldValue(row, headerMap, 'Last Activity Type');
      var activityTypeValidation = this._validateActivityType(lastActivityType);
      if (!activityTypeValidation.valid) {
        errors.push({
          field: 'Last Activity Type',
          error: activityTypeValidation.error,
          suggestions: activityTypeValidation.suggestions,
          severity: 'low'
        });
      } else if (activityTypeValidation.warning) {
        warnings.push({
          field: 'Last Activity Type',
          warning: activityTypeValidation.warning,
          severity: 'low'
        });
        if (options.normalizeData) {
          normalizedData[headerMap['Last Activity Type']] = activityTypeValidation.normalized;
        }
      }

      // Validate address and zip code
      var address = this._getFieldValue(row, headerMap, 'Address');
      var zipCode = this._getFieldValue(row, headerMap, 'Zip Code');

      if (address && address.trim() !== '') {
        var addressValidation = this._validateAddress(address);
        if (!addressValidation.valid) {
          warnings.push({
            field: 'Address',
            warning: addressValidation.warning,
            severity: 'low'
          });
        }
      }

      if (zipCode && zipCode.trim() !== '') {
        var zipValidation = this._validateZipCode(zipCode);
        if (!zipValidation.valid) {
          warnings.push({
            field: 'Zip Code',
            warning: zipValidation.warning,
            severity: 'low'
          });
          if (options.normalizeData) {
            normalizedData[headerMap['Zip Code']] = zipValidation.normalized;
          }
        }
      }

      return {
        success: errors.length === 0,
        errors: errors,
        warnings: warnings,
        normalizedData: options.normalizeData ? normalizedData : null
      };

    } catch (e) {
      return {
        success: false,
        errors: [{
          field: 'System',
          error: 'Row validation error: ' + e.message,
          severity: 'critical'
        }]
      };
    }
  },

  /**
   * Validate a single outreach row
   */
  _validateOutreachRow: function(row, rowNumber, headerMap, options) {
    try {
      var errors = [];
      var warnings = [];
      var normalizedData = row.slice(); // Create a copy

      // Required fields validation
      var outreachId = this._getFieldValue(row, headerMap, 'Outreach ID');
      var companyName = this._getFieldValue(row, headerMap, 'Company');

      if (!outreachId || outreachId.trim() === '') {
        errors.push({
          field: 'Outreach ID',
          error: 'Outreach ID is required',
          severity: 'critical'
        });
      }

      if (!companyName || companyName.trim() === '') {
        errors.push({
          field: 'Company',
          error: 'Company Name is required',
          severity: 'critical'
        });
      }

      // Validate outcome category
      var outcomeCategory = this._getFieldValue(row, headerMap, 'Outcome Category');
      var outcomeCategoryValidation = this._validateOutcomeCategory(outcomeCategory);
      if (!outcomeCategoryValidation.valid) {
        errors.push({
          field: 'Outcome Category',
          error: outcomeCategoryValidation.error,
          suggestions: outcomeCategoryValidation.suggestions,
          severity: 'high'
        });
      } else if (outcomeCategoryValidation.warning) {
        warnings.push({
          field: 'Outcome Category',
          warning: outcomeCategoryValidation.warning,
          severity: 'low'
        });
        if (options.normalizeData) {
          normalizedData[headerMap['Outcome Category']] = outcomeCategoryValidation.normalized;
        }
      }

      // Validate status
      var status = this._getFieldValue(row, headerMap, 'Status');
      var statusValidation = this._validateStatus(status);
      if (!statusValidation.valid) {
        errors.push({
          field: 'Status',
          error: statusValidation.error,
          suggestions: statusValidation.suggestions,
          severity: 'high'
        });
      } else if (statusValidation.warning) {
        warnings.push({
          field: 'Status',
          warning: statusValidation.warning,
          severity: 'low'
        });
        if (options.normalizeData) {
          normalizedData[headerMap['Status']] = statusValidation.normalized;
        }
      }

      // Validate contact type
      var contactType = this._getFieldValue(row, headerMap, 'Contact Type');
      var contactTypeValidation = this._validateContactType(contactType);
      if (!contactTypeValidation.valid) {
        errors.push({
          field: 'Contact Type',
          error: contactTypeValidation.error,
          suggestions: contactTypeValidation.suggestions,
          severity: 'medium'
        });
      } else if (contactTypeValidation.warning) {
        warnings.push({
          field: 'Contact Type',
          warning: contactTypeValidation.warning,
          severity: 'low'
        });
        if (options.normalizeData) {
          normalizedData[headerMap['Contact Type']] = contactTypeValidation.normalized;
        }
      }

      // Validate numeric fields
      var numericFields = [
        { name: 'Days Since Last Visit', min: 0, max: 3650 },
        { name: 'Next Visit Countdown', min: 0, max: 3650 },
        { name: 'Close Probability', min: 0, max: 100 }
      ];

      numericFields.forEach(function(field) {
        var value = this._getFieldValue(row, headerMap, field.name);
        if (value && value.trim() !== '') {
          var numericValidation = this._validateNumeric(value, field.min, field.max);
          if (!numericValidation.valid) {
            errors.push({
              field: field.name,
              error: numericValidation.error,
              severity: 'medium'
            });
          } else if (options.normalizeData) {
            normalizedData[headerMap[field.name]] = numericValidation.normalized;
          }
        }
      }, this);

      // Validate date fields
      var dateFields = ['Visit Date', 'Next Visit Date'];
      dateFields.forEach(function(fieldName) {
        var value = this._getFieldValue(row, headerMap, fieldName);
        if (value && value.trim() !== '') {
          var dateValidation = this._validateDate(value);
          if (!dateValidation.valid) {
            errors.push({
              field: fieldName,
              error: dateValidation.error,
              severity: 'medium'
            });
          } else if (options.normalizeData) {
            normalizedData[headerMap[fieldName]] = dateValidation.normalized;
          }
        }
      }, this);

      // Validate boolean fields
      var booleanFields = ['Prospects Match', 'Email Sent'];
      booleanFields.forEach(function(fieldName) {
        var value = this._getFieldValue(row, headerMap, fieldName);
        if (value && value.trim() !== '') {
          var booleanValidation = this._validateBoolean(value);
          if (!booleanValidation.valid) {
            errors.push({
              field: fieldName,
              error: booleanValidation.error,
              severity: 'low'
            });
          } else if (options.normalizeData) {
            normalizedData[headerMap[fieldName]] = booleanValidation.normalized;
          }
        }
      }, this);

      // Validate owner field
      var owner = this._getFieldValue(row, headerMap, 'Owner');
      if (owner && owner.trim() !== '') {
        var ownerValidation = this._validateOwner(owner);
        if (!ownerValidation.valid) {
          warnings.push({
            field: 'Owner',
            warning: ownerValidation.warning,
            severity: 'low'
          });
        }
      }

      return {
        success: errors.length === 0,
        errors: errors,
        warnings: warnings,
        normalizedData: options.normalizeData ? normalizedData : null
      };

    } catch (e) {
      return {
        success: false,
        errors: [{
          field: 'System',
          error: 'Row validation error: ' + e.message,
          severity: 'critical'
        }]
      };
    }
  },

  /**
   * Get field value from row using header map
   */
  _getFieldValue: function(row, headerMap, fieldName) {
    if (!headerMap || !headerMap[fieldName]) {
      return '';
    }
    var index = headerMap[fieldName];
    return row[index] || '';
  },

  /**
   * Normalize string for case-insensitive comparison
   */
  _normalizeString: function(str) {
    if (!str || typeof str !== 'string') {
      return '';
    }
    return str.toString().toLowerCase().trim();
  },

  /**
   * Validate industry field
   */
  _validateIndustry: function(industry) {
    try {
      if (!industry || typeof industry !== 'string' || industry.trim() === '') {
        return {
          valid: false,
          error: 'Industry is required',
          suggestions: DataValidation.VALID_INDUSTRIES.slice(0, 5)
        };
      }

      var original = industry;
      var normalized = this._normalizeString(industry);

      // Check if valid industry
      var isValid = DataValidation.VALID_INDUSTRIES.some(function(validIndustry) {
        return this._normalizeString(validIndustry) === normalized;
      }, this);

      if (!isValid) {
        // Find similar industries
        var suggestions = [];
        DataValidation.VALID_INDUSTRIES.forEach(function(validIndustry) {
          if (this._areSimilarStrings(normalized, this._normalizeString(validIndustry))) {
            suggestions.push(validIndustry);
          }
        }, this);

        return {
          valid: false,
          error: 'Invalid industry: ' + original,
          suggestions: suggestions.length > 0 ? suggestions : DataValidation.VALID_INDUSTRIES.slice(0, 5),
          normalized: normalized
        };
      }

      // Check if normalization was needed
      var needsNormalization = this._normalizeString(original) !== normalized;
      var warning = needsNormalization ?
        'Industry normalized from "' + original + '" to "' + normalized + '"' : null;

      return {
        valid: true,
        normalized: normalized,
        warning: warning
      };

    } catch (e) {
      return {
        valid: false,
        error: 'Industry validation error: ' + e.message
      };
    }
  },

  /**
   * Validate outcome category
   */
  _validateOutcomeCategory: function(outcomeCategory) {
    try {
      if (!outcomeCategory || typeof outcomeCategory !== 'string' || outcomeCategory.trim() === '') {
        return {
          valid: false,
          error: 'Outcome category is required',
          suggestions: DataValidation.VALID_OUTCOME_CATEGORIES.slice(0, 5)
        };
      }

      var original = outcomeCategory;
      var normalized = this._normalizeString(outcomeCategory);

      // Check if valid outcome category
      var isValid = DataValidation.VALID_OUTCOME_CATEGORIES.some(function(validCat) {
        return this._normalizeString(validCat) === normalized;
      }, this);

      if (!isValid) {
        // Find similar categories
        var suggestions = [];
        DataValidation.VALID_OUTCOME_CATEGORIES.forEach(function(validCat) {
          if (this._areSimilarStrings(normalized, this._normalizeString(validCat))) {
            suggestions.push(validCat);
          }
        }, this);

        return {
          valid: false,
          error: 'Invalid outcome category: ' + original,
          suggestions: suggestions.length > 0 ? suggestions : DataValidation.VALID_OUTCOME_CATEGORIES.slice(0, 5),
          normalized: normalized
        };
      }

      // Check if normalization was needed
      var needsNormalization = this._normalizeString(original) !== normalized;
      var warning = needsNormalization ?
        'Outcome category normalized from "' + original + '" to "' + normalized + '"' : null;

      return {
        valid: true,
        normalized: normalized,
        warning: warning
      };

    } catch (e) {
      return {
        valid: false,
        error: 'Outcome category validation error: ' + e.message
      };
    }
  },

  /**
   * Validate status field
   */
  _validateStatus: function(status) {
    try {
      if (!status || typeof status !== 'string' || status.trim() === '') {
        return {
          valid: false,
          error: 'Status is required',
          suggestions: DataValidation.VALID_STATUSES.slice(0, 5)
        };
      }

      var original = status;
      var normalized = this._normalizeString(status);

      // Check if valid status
      var isValid = DataValidation.VALID_STATUSES.some(function(validStatus) {
        return this._normalizeString(validStatus) === normalized;
      }, this);

      if (!isValid) {
        // Find similar statuses
        var suggestions = [];
        DataValidation.VALID_STATUSES.forEach(function(validStatus) {
          if (this._areSimilarStrings(normalized, this._normalizeString(validStatus))) {
            suggestions.push(validStatus);
          }
        }, this);

        return {
          valid: false,
          error: 'Invalid status: ' + original,
          suggestions: suggestions.length > 0 ? suggestions : DataValidation.VALID_STATUSES.slice(0, 5),
          normalized: normalized
        };
      }

      // Check if normalization was needed
      var needsNormalization = this._normalizeString(original) !== normalized;
      var warning = needsNormalization ?
        'Status normalized from "' + original + '" to "' + normalized + '"' : null;

      return {
        valid: true,
        normalized: normalized,
        warning: warning
      };

    } catch (e) {
      return {
        valid: false,
        error: 'Status validation error: ' + e.message
      };
    }
  },

  /**
   * Validate contact type
   */
  _validateContactType: function(contactType) {
    try {
      if (!contactType || typeof contactType !== 'string' || contactType.trim() === '') {
        return {
          valid: false,
          error: 'Contact type is required',
          suggestions: DataValidation.VALID_CONTACT_TYPES.slice(0, 5)
        };
      }

      var original = contactType;
      var normalized = this._normalizeString(contactType);

      // Check if valid contact type
      var isValid = DataValidation.VALID_CONTACT_TYPES.some(function(validContactType) {
        return this._normalizeString(validContactType) === normalized;
      }, this);

      if (!isValid) {
        // Find similar contact types
        var suggestions = [];
        DataValidation.VALID_CONTACT_TYPES.forEach(function(validContactType) {
          if (this._areSimilarStrings(normalized, this._normalizeString(validContactType))) {
            suggestions.push(validContactType);
          }
        }, this);

        return {
          valid: false,
          error: 'Invalid contact type: ' + original,
          suggestions: suggestions.length > 0 ? suggestions : DataValidation.VALID_CONTACT_TYPES.slice(0, 5),
          normalized: normalized
        };
      }

      // Check if normalization was needed
      var needsNormalization = this._normalizeString(original) !== normalized;
      var warning = needsNormalization ?
        'Contact type normalized from "' + original + '" to "' + normalized + '"' : null;

      return {
        valid: true,
        normalized: normalized,
        warning: warning
      };

    } catch (e) {
      return {
        valid: false,
        error: 'Contact type validation error: ' + e.message
      };
    }
  },

  /**
   * Validate urgency band
   */
  _validateUrgencyBand: function(urgencyBand) {
    try {
      if (!urgencyBand || typeof urgencyBand !== 'string' || urgencyBand.trim() === '') {
        return {
          valid: false,
          error: 'Urgency band is required',
          suggestions: ['High', 'Medium', 'Low', 'None']
        };
      }

      var original = urgencyBand;
      var normalized = this._normalizeString(urgencyBand);

      // Valid urgency bands
      var validBands = ['high', 'medium', 'low', 'none', 'urgent', 'critical'];

      var isValid = validBands.some(function(validBand) {
        return this._normalizeString(validBand) === normalized;
      }, this);

      if (!isValid) {
        return {
          valid: false,
          error: 'Invalid urgency band: ' + original,
          suggestions: ['High', 'Medium', 'Low', 'None'],
          normalized: normalized
        };
      }

      // Normalize to standard values
      var normalizedValue;
      switch (normalized) {
        case 'high':
        case 'urgent':
        case 'critical':
          normalizedValue = 'High';
          break;
        case 'medium':
          normalizedValue = 'Medium';
          break;
        case 'low':
          normalizedValue = 'Low';
          break;
        case 'none':
          normalizedValue = 'None';
          break;
        default:
          normalizedValue = this._toProperCase(normalized);
      }

      // Check if normalization was needed
      var needsNormalization = this._normalizeString(original) !== normalized;
      var warning = needsNormalization ?
        'Urgency band normalized from "' + original + '" to "' + normalizedValue + '"' : null;

      return {
        valid: true,
        normalized: normalizedValue,
        warning: warning
      };

    } catch (e) {
      return {
        valid: false,
        error: 'Urgency band validation error: ' + e.message
      };
    }
  },

  /**
   * Validate activity type
   */
  _validateActivityType: function(activityType) {
    try {
      if (!activityType || typeof activityType !== 'string' || activityType.trim() === '') {
        return {
          valid: false,
          error: 'Activity type is required',
          suggestions: ['In Person', 'Phone', 'Email', 'Text', 'Visit', 'Other']
        };
      }

      var original = activityType;
      var normalized = this._normalizeString(activityType);

      // Valid activity types
      var validTypes = ['in person', 'phone', 'email', 'text', 'visit', 'call', 'other'];

      var isValid = validTypes.some(function(validType) {
        return this._normalizeString(validType) === normalized;
      }, this);

      if (!isValid) {
        return {
          valid: false,
          error: 'Invalid activity type: ' + original,
          suggestions: ['In Person', 'Phone', 'Email', 'Text', 'Visit', 'Other'],
          normalized: normalized
        };
      }

      // Normalize to standard values
      var normalizedValue;
      switch (normalized) {
        case 'in person':
          normalizedValue = 'In Person';
          break;
        case 'phone':
        case 'call':
          normalizedValue = 'Phone';
          break;
        case 'email':
          normalizedValue = 'Email';
          break;
        case 'text':
          normalizedValue = 'Text';
          break;
        case 'visit':
          normalizedValue = 'Visit';
          break;
        case 'other':
          normalizedValue = 'Other';
          break;
        default:
          normalizedValue = this._toProperCase(normalized);
      }

      // Check if normalization was needed
      var needsNormalization = this._normalizeString(original) !== normalized;
      var warning = needsNormalization ?
        'Activity type normalized from "' + original + '" to "' + normalizedValue + '"' : null;

      return {
        valid: true,
        normalized: normalizedValue,
        warning: warning
      };

    } catch (e) {
      return {
        valid: false,
        error: 'Activity type validation error: ' + e.message
      };
    }
  },

  /**
   * Validate numeric field
   */
  _validateNumeric: function(value, min, max) {
    try {
      if (!value || typeof value !== 'string' || value.trim() === '') {
        return {
          valid: false,
          error: 'Numeric value is required'
        };
      }

      var trimmed = value.trim();
      var numericValue = parseFloat(trimmed);

      if (isNaN(numericValue)) {
        return {
          valid: false,
          error: 'Value must be a valid number: ' + trimmed
        };
      }

      if (min !== undefined && numericValue < min) {
        return {
          valid: false,
          error: 'Value must be at least ' + min + ': ' + trimmed
        };
      }

      if (max !== undefined && numericValue > max) {
        return {
          valid: false,
          error: 'Value must be at most ' + max + ': ' + trimmed
        };
      }

      // Normalize numeric value
      var normalized = numericValue.toString();
      if (numericValue === Math.floor(numericValue)) {
        normalized = Math.floor(numericValue).toString();
      }

      return {
        valid: true,
        normalized: normalized
      };

    } catch (e) {
      return {
        valid: false,
        error: 'Numeric validation error: ' + e.message
      };
    }
  },

  /**
   * Validate date field
   */
  _validateDate: function(dateValue) {
    try {
      if (!dateValue || typeof dateValue !== 'string' || dateValue.trim() === '') {
        return {
          valid: false,
          error: 'Date value is required'
        };
      }

      var trimmed = dateValue.trim();
      var dateObj = new Date(trimmed);

      if (isNaN(dateObj.getTime())) {
        return {
          valid: false,
          error: 'Invalid date format: ' + trimmed
        };
      }

      // Validate date range
      var year = dateObj.getFullYear();
      if (year < 1900 || year > 2100) {
        return {
          valid: false,
          error: 'Date year out of reasonable range (1900-2100): ' + year
        };
      }

      // Normalize date format to MM/DD/YYYY
      var month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      var day = dateObj.getDate().toString().padStart(2, '0');
      var yearStr = dateObj.getFullYear().toString();

      var normalizedDate = month + '/' + day + '/' + yearStr;

      return {
        valid: true,
        normalized: normalizedDate
      };

    } catch (e) {
      return {
        valid: false,
        error: 'Date validation error: ' + e.message
      };
    }
  },

  /**
   * Validate boolean field
   */
  _validateBoolean: function(value) {
    try {
      if (!value || typeof value !== 'string' || value.trim() === '') {
        return {
          valid: false,
          error: 'Boolean value is required'
        };
      }

      var trimmed = value.trim().toLowerCase();

      // Valid boolean values
      var validValues = ['true', 'false', 'yes', 'no', 'y', 'n', '1', '0'];

      var isValid = validValues.some(function(validValue) {
        return validValue === trimmed;
      });

      if (!isValid) {
        return {
          valid: false,
          error: 'Invalid boolean value: ' + value + '. Must be true/false, yes/no, y/n, or 1/0'
        };
      }

      // Normalize to TRUE/FALSE
      var normalized;
      if (trimmed === 'true' || trimmed === 'yes' || trimmed === 'y' || trimmed === '1') {
        normalized = 'TRUE';
      } else {
        normalized = 'FALSE';
      }

      return {
        valid: true,
        normalized: normalized
      };

    } catch (e) {
      return {
        valid: false,
        error: 'Boolean validation error: ' + e.message
      };
    }
  },

  /**
   * Validate owner field
   */
  _validateOwner: function(owner) {
    try {
      if (!owner || typeof owner !== 'string' || owner.trim() === '') {
        return {
          valid: false,
          error: 'Owner is required'
        };
      }

      var trimmed = owner.trim();

      // Check if owner matches known owners
      var knownOwners = ['Kyle Buzbee', 'System', 'Admin', 'Automated'];
      var normalizedOwner = this._normalizeString(trimmed);

      var isKnownOwner = knownOwners.some(function(knownOwner) {
        return this._normalizeString(knownOwner) === normalizedOwner;
      }, this);

      if (!isKnownOwner) {
        return {
          valid: true, // Don't fail on unknown owner, just warn
          warning: 'Unknown owner: ' + trimmed + '. Known owners: ' + knownOwners.join(', ')
        };
      }

      return {
        valid: true
      };

    } catch (e) {
      return {
        valid: false,
        error: 'Owner validation error: ' + e.message
      };
    }
  },

  /**
   * Validate address field
   */
  _validateAddress: function(address) {
    try {
      if (!address || typeof address !== 'string' || address.trim() === '') {
        return {
          valid: false,
          error: 'Address is required'
        };
      }

      var trimmed = address.trim();

      // Basic address validation
      if (trimmed.length < 5) {
        return {
          valid: false,
          warning: 'Address seems too short: ' + trimmed
        };
      }

      // Check for common address patterns
      var hasNumber = /\d/.test(trimmed);
      var hasStreet = /(st|street|ave|avenue|rd|road|blvd|boulevard|ln|lane|dr|drive)/i.test(trimmed);

      if (!hasNumber || !hasStreet) {
        return {
          valid: true, // Don't fail, just warn
          warning: 'Address format may be unusual: ' + trimmed
        };
      }

      return {
        valid: true
      };

    } catch (e) {
      return {
        valid: false,
        error: 'Address validation error: ' + e.message
      };
    }
  },

  /**
   * Validate zip code field
   */
  _validateZipCode: function(zipCode) {
    try {
      if (!zipCode || typeof zipCode !== 'string' || zipCode.trim() === '') {
        return {
          valid: false,
          error: 'Zip code is required'
        };
      }

      var trimmed = zipCode.trim();

      // Remove any non-digit characters
      var digitsOnly = trimmed.replace(/[^0-9]/g, '');

      if (digitsOnly.length === 5) {
        return {
          valid: true,
          normalized: digitsOnly
        };
      } else if (digitsOnly.length === 0) {
        return {
          valid: false,
          error: 'Invalid zip code format: ' + trimmed
        };
      } else {
        return {
          valid: true,
          warning: 'Zip code normalized from ' + trimmed + ' to ' + digitsOnly,
          normalized: digitsOnly
        };
      }

    } catch (e) {
      return {
        valid: false,
        error: 'Zip code validation error: ' + e.message
      };
    }
  },

  /**
   * Check if two strings are similar (for suggestion purposes)
   */
  _areSimilarStrings: function(str1, str2) {
    if (!str1 || !str2) return false;

    str1 = str1.toLowerCase().trim();
    str2 = str2.toLowerCase().trim();

    // Exact match
    if (str1 === str2) return true;

    // Check if one string contains the other
    if (str1.includes(str2) || str2.includes(str1)) return true;

    // Check Levenshtein distance
    var distance = this._simpleLevenshtein(str1, str2);
    var maxLength = Math.max(str1.length, str2.length);

    // Consider similar if distance is less than 3 or less than 25% of max length
    return distance <= 3 || distance <= maxLength * 0.25;
  },

  /**
   * Simple Levenshtein distance calculation
   */
  _simpleLevenshtein: function(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    var matrix = [];

    // Initialize matrix
    for (var i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (var j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (var i = 1; i <= b.length; i++) {
      for (var j = 1; j <= a.length; j++) {
        if (b.charAt(i-1) === a.charAt(j-1)) {
          matrix[i][j] = matrix[i-1][j-1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i-1][j-1] + 1, // substitution
            matrix[i][j-1] + 1,   // insertion
            matrix[i-1][j] + 1    // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  },

  /**
   * Convert string to proper case
   */
  _toProperCase: function(str) {
    try {
      if (!str || typeof str !== 'string') return '';

      return str.toLowerCase().replace(/\b\w/g, function(char) {
        return char.toUpperCase();
      });

    } catch (e) {
      console.warn('Proper case conversion error: ' + e.message);
      return str;
    }
  },

  /**
   * Generate comprehensive validation report
   */
  generateValidationReport: function(validationResults) {
    try {
      if (!validationResults || !validationResults.statistics) {
        throw new Error('Invalid validation results provided');
      }

      var report = {
        summary: {
          totalRows: validationResults.statistics.totalRows,
          validRows: validationResults.statistics.validRows,
          invalidRows: validationResults.statistics.invalidRows,
          warnings: validationResults.statistics.warnings,
          successRate: validationResults.statistics.totalRows > 0 ?
            Math.round((validationResults.statistics.validRows / validationResults.statistics.totalRows) * 100) : 0
        },
        errorBreakdown: {},
        warningBreakdown: {},
        suggestions: []
      };

      // Analyze errors by field and severity
      validationResults.invalidRows.forEach(function(invalidRow) {
        invalidRow.errors.forEach(function(error) {
          if (!report.errorBreakdown[error.field]) {
            report.errorBreakdown[error.field] = {
              count: 0,
              severity: error.severity,
              examples: []
            };
          }

          report.errorBreakdown[error.field].count++;
          if (report.errorBreakdown[error.field].examples.length < 3) {
            report.errorBreakdown[error.field].examples.push({
              row: invalidRow.rowNumber,
              error: error.error,
              value: invalidRow.data[Object.keys(headerMap).find(key => headerMap[key] === invalidRow.data.indexOf(error.field))] || 'N/A'
            });
          }
        });
      });

      // Analyze warnings by field
      validationResults.warnings.forEach(function(warning) {
        if (!report.warningBreakdown[warning.field]) {
          report.warningBreakdown[warning.field] = {
            count: 0,
            examples: []
          };
        }

        report.warningBreakdown[warning.field].count++;
        if (report.warningBreakdown[warning.field].examples.length < 3) {
          report.warningBreakdown[warning.field].examples.push({
            row: warning.rowNumber || 'N/A',
            warning: warning.warning,
            value: warning.value || 'N/A'
          });
        }
      });

      // Generate suggestions
      if (report.errorBreakdown['Industry']) {
        report.suggestions.push('Review industry values - consider using standardized industry list');
      }

      if (report.errorBreakdown['Status'] || report.errorBreakdown['Contact Status']) {
        report.suggestions.push('Review status values - consider using standardized status list');
      }

      if (report.warningBreakdown['Zip Code']) {
        report.suggestions.push('Review zip code formats - consider normalizing to 5-digit format');
      }

      return report;

    } catch (e) {
      return {
        success: false,
        error: 'Report generation error: ' + e.message
      };
    }
  },

  /**
   * Enhanced CSV parsing with robust error handling
   */
  parseCSV: function(csvText) {
    try {
      if (!csvText || typeof csvText !== 'string') {
        throw new Error('CSV text is required and must be a string');
      }

      var lines = csvText.split('\n').filter(function(line) {
        return line.trim().length > 0;
      });

      if (lines.length === 0) {
        throw new Error('No valid CSV data found');
      }

      var data = [];
      var parseErrors = [];

      for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        var line = lines[lineIndex];
        var parseResult = this._parseCSVLine(line, lineIndex + 1);

        if (parseResult.success) {
          data.push(parseResult.row);
        } else {
          parseErrors.push({
            line: lineIndex + 1,
            error: parseResult.error,
            lineContent: line.substring(0, 50) + (line.length > 50 ? '...' : '')
          });
        }
      }

      if (data.length === 0) {
        throw new Error('No valid data rows could be parsed');
      }

      return {
        success: true,
        data: data,
        parseErrors: parseErrors,
        statistics: {
          totalLines: lines.length,
          parsedLines: data.length,
          errorLines: parseErrors.length
        }
      };

    } catch (e) {
      // FIX: Defensive coding - handle when csvText is undefined/null
      var csvTextLength = 0;
      try {
        csvTextLength = csvText ? csvText.length : 0;
      } catch (lengthError) {
        csvTextLength = 0;
      }
      
      var lineCount = 0;
      try {
        lineCount = lines ? lines.length : 0;
      } catch (lineError) {
        lineCount = 0;
      }
      
      return {
        success: false,
        error: e.message,
        details: {
          csvTextLength: csvTextLength,
          lineCount: lineCount
        }
      };
    }
  },

  /**
   * Parse a single CSV line with robust quote handling
   */
  _parseCSVLine: function(line, lineNumber) {
    try {
      var row = [];
      var current = '';
      var inQuotes = false;
      var quoteChar = '"';

      for (var i = 0; i < line.length; i++) {
        var char = line[i];

        // Handle quote characters
        if (char === '"' || char === "'") {
          if (!inQuotes) {
            // Starting a quoted field
            inQuotes = true;
            quoteChar = char;
          } else if (char === quoteChar) {
            // Check if this is an escaped quote (like "")
            if (i + 1 < line.length && line[i + 1] === quoteChar) {
              // Escaped quote, add one quote to current field
              current += quoteChar;
              i++; // Skip the next quote
            } else {
              // Ending a quoted field
              inQuotes = false;
            }
          } else {
            // Different quote character, treat as regular character
            current += char;
          }
        }
        // Handle comma separator (only outside quotes)
        else if (char === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        }
        // Regular character
        else {
          current += char;
        }
      }

      // Add the last field
      row.push(current.trim());

      // Clean up fields by removing surrounding quotes if present
      row = row.map(function(field) {
        if (field.length >= 2 &&
            ((field.startsWith('"') && field.endsWith('"')) ||
             (field.startsWith("'") && field.endsWith("'")))) {
          return field.slice(1, -1);
        }
        return field;
      });

      return {
        success: true,
        row: row
      };

    } catch (e) {
      return {
        success: false,
        error: 'Failed to parse line ' + lineNumber + ': ' + e.message
      };
    }
  }
};

// Export main functions for global access
function validateProspectsData(data, options) {
  return ComprehensiveValidation.validateProspectsData(data, options);
}

function validateOutreachData(data, options) {
  return ComprehensiveValidation.validateOutreachData(data, options);
}

function generateValidationReport(validationResults) {
  return ComprehensiveValidation.generateValidationReport(validationResults);
}

function parseCSV(csvText) {
  return ComprehensiveValidation.parseCSV(csvText);
}
