/**
 * Business Validation Utilities - FunctionRefactorer Integration
 * Centralized business rule validation functions with FunctionRefactorer patterns.
 * Provides decomposed, testable pipeline components using withLogging and withErrorHandling wrappers.
 */

var BusinessValidation = (function() {
  'use strict';

  // ============================================================================
  // INFRASTRUCTURE INTEGRATION
  // ============================================================================
  
  /**
   * Get FunctionRefactorer instance with fallback
   * @returns {Object} FunctionRefactorer or null
   */
  function getFunctionRefactorer() {
    try {
      return typeof FunctionRefactorer !== 'undefined' ? FunctionRefactorer : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get ErrorBoundary instance with fallback
   * @returns {Object} ErrorBoundary or null
   */
  function getErrorBoundary() {
    try {
      return typeof ErrorBoundary !== 'undefined' ? ErrorBoundary : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get LoggerInjector instance with fallback
   * @returns {Object} LoggerInjector or null
   */
  function getLoggerInjector() {
    try {
      return typeof LoggerInjector !== 'undefined' ? LoggerInjector : null;
    } catch (e) {
      return null;
    }
  }

  // ============================================================================
  // FOCUSED FIELD VALIDATORS (FunctionRefactorer Pattern)
  // ============================================================================
  
  var FieldValidators = {
    // Required field validator
    required: function(value, fieldName, errors) {
      if (value === undefined || value === null || String(value).trim() === '') {
        errors.push(SharedUtils.capitalizeFirst(fieldName) + ' is required');
        return false;
      }
      return true;
    },
    
    // Company name validator
    validateCompanyName: function(value, errors, options) {
      options = options || {};
      if (!value) {
        if (!options.allowEmpty) {
          errors.push('Company name is required');
        }
        return false;
      }
      var companyName = String(value).trim();
      if (companyName.length < 2) {
        errors.push('Company name must be at least 2 characters long');
        return false;
      }
      if (companyName.length > 200) {
        errors.push('Company name exceeds maximum length of 200 characters');
      }
      return true;
    },
    
    // Contact name validator
    validateContactName: function(value, errors) {
      if (!value) return true;
      var contactName = String(value).trim();
      if (contactName.length < 2) {
        errors.push('Contact name seems unusually short');
      }
      return true;
    },
    
    // Address validator
    validateAddress: function(value, errors) {
      if (!value) return true;
      var address = String(value).trim();
      if (address.length < 5) {
        errors.push('Address seems unusually short');
      }
      return true;
    },
    
    // Priority score validator
    validatePriorityScore: function(value, errors) {
      if (value === undefined || value === null) return true;
      var priorityScore = Number(value);
      if (isNaN(priorityScore) || priorityScore < 0 || priorityScore > 100) {
        errors.push('Priority score must be between 0 and 100');
        return false;
      }
      return true;
    },
    
    // Urgency score validator
    validateUrgencyScore: function(value, errors) {
      if (value === undefined || value === null) return true;
      var urgencyScore = Number(value);
      if (isNaN(urgencyScore) || urgencyScore < 0 || urgencyScore > 150) {
        errors.push('Urgency score must be between 0 and 150');
        return false;
      }
      return true;
    },
    
    // Roll-off fee validator
    validateRollOffFee: function(value, errors, options) {
      options = options || {};
      var minFee = options.minFee || 0;
      var maxFee = options.maxFee || 10000;
      if (value === undefined || value === null) return true;
      var fee = Number(value);
      if (isNaN(fee)) {
        errors.push('Roll-off fee must be a valid number');
        return false;
      }
      if (fee < minFee || fee > maxFee) {
        errors.push('Roll-off fee must be between ' + minFee + ' and ' + maxFee);
        return false;
      }
      return true;
    },
    
    // Company ID format validator
    validateCompanyId: function(value, errors) {
      if (!value) return true;
      var companyId = String(value).trim();
      var companyIdPattern = /^CID-[A-Z0-9]{3}\d{2}$/;
      if (!companyIdPattern.test(companyId)) {
        errors.push('Company ID format may be invalid (expected: CID-XXX##)');
      }
      return true;
    },
    
    // Roll-off container size validator
    validateContainerSize: function(value, errors, validSizes) {
      if (!value) return true;
      var containerSize = String(value).trim();
      var validSizes = validSizes || ['10 yd', '20 yd', '30 yd', '40 yd', 'Lugger'];
      if (validSizes.indexOf(containerSize) === -1) {
        errors.push('Invalid container size: ' + containerSize + ' (valid: ' + validSizes.join(', ') + ')');
      }
      return true;
    },
    
    // Outcome validator
    validateOutcome: function(value, errors, validOutcomes) {
      if (!value) return true;
      var outcome = String(value).trim();
      var validOutcomes = validOutcomes || ['Account Won', 'Disqualified', 'Follow-Up', 'Initial Contact', 'Interested', 'Interested (Hot)', 'Interested (Warm)', 'No Answer', 'Not Interested'];
      if (validOutcomes.indexOf(outcome) === -1) {
        errors.push('Unrecognized outcome: ' + outcome + ' (valid: ' + validOutcomes.join(', ') + ')');
      }
      return true;
    },
    
    // Stage validator
    validateStage: function(value, errors, validStages) {
      if (!value) return true;
      var stage = String(value).trim();
      var validStages = validStages || ['Disqualified', 'Lost', 'Nurture', 'Outreach', 'Prospect', 'Won'];
      if (validStages.indexOf(stage) === -1) {
        errors.push('Unrecognized stage: ' + stage + ' (valid: ' + validStages.join(', ') + ')');
      }
      return true;
    },
    
    // Status validator
    validateStatus: function(value, errors, validStatuses) {
      if (!value) return true;
      var status = String(value).trim();
      var validStatuses = validStatuses || ['Active', 'Cold', 'Disqualified', 'Hot', 'Interested (Hot)', 'Interested (Warm)', 'Lost', 'Warm', 'Won'];
      if (validStatuses.indexOf(status) === -1) {
        errors.push('Unrecognized status: ' + status + ' (valid: ' + validStatuses.join(', ') + ')');
      }
      return true;
    },
    
    // Notes length validator
    validateNotesLength: function(value, errors, maxLength) {
      if (!value) return true;
      var notes = String(value);
      var maxLength = maxLength || 1000;
      if (notes.length > maxLength) {
        errors.push('Notes exceed maximum length of ' + maxLength + ' characters');
        return false;
      }
      return true;
    },
    
    // Date validator
    validateDate: function(value, errors, options) {
      if (!value) return true;
      options = options || {};
      var parsedDate = DateValidationUtils.parseDate(
        value,
        {
          minYear: options.minYear || 1900,
          maxYear: options.maxYear || 2100,
          allowFuture: options.allowFuture !== undefined ? options.allowFuture : true,
          allowPast: options.allowPast !== undefined ? options.allowPast : true
        },
        options.fieldName || 'date'
      );
      if (!parsedDate) {
        errors.push('Invalid ' + (options.fieldName || 'date') + ' format');
        return false;
      }
      return true;
    }
  };

  // ============================================================================
  // VALIDATION PIPELINES (FunctionRefactorer Pattern)
  // ============================================================================
  
  /**
   * Create prospect validation pipeline
   * @returns {Function} Pipeline function
   */
  function createProspectPipeline() {
    try {
      var validationSteps = [
      function prospectRequiredFields(data, options) {
        var errors = [];
        var warnings = [];
        // Use CONFIG.SCHEMA for consistent header references
        var requiredFields = [
          CONFIG.SCHEMA.PROSPECTS.companyName.header,
          CONFIG.SCHEMA.PROSPECTS.address.header
        ];
        requiredFields.forEach(function(field) {
          var normalizedField = SharedUtils ? SharedUtils.normalizeHeader(field) : field.toLowerCase();
          var value = data[normalizedField] || data[field];
          if (!value || String(value).trim() === '') {
            errors.push('Missing required field: ' + field);
          }
        });
        return { isValid: errors.length === 0, errors: errors, warnings: warnings };
      },
      function prospectCompanyName(data) {
        var errors = [];
        var warnings = [];
        // FIX: Use CONFIG.SCHEMA for header reference
        var companyNameField = CONFIG.SCHEMA.PROSPECTS.companyName.header;
        var value = data[companyNameField] || data[SharedUtils.normalizeHeader(companyNameField)];
        if (value) {
          var isValid = FieldValidators.validateCompanyName(value, errors);
          if (!isValid && errors.length === 0) {
            errors.push('Company name validation failed');
          }
        }
        return { isValid: errors.length === 0, errors: errors, warnings: warnings };
      },
      function prospectAddress(data) {
        var errors = [];
        var warnings = [];
        // FIX: Use CONFIG.SCHEMA for header reference
        var addressField = CONFIG.SCHEMA.PROSPECTS.address.header;
        var value = data[addressField] || data[SharedUtils.normalizeHeader(addressField)];
        if (value) {
          var isValid = FieldValidators.validateAddress(value, errors);
          if (!isValid && errors.length === 0) {
            errors.push('Address validation failed');
          }
        }
        return { isValid: errors.length === 0, errors: errors, warnings: warnings };
      },
      function prospectScores(data) {
        var errors = [];
        var warnings = [];
        // FIX: Use CONFIG.SCHEMA for header references
        var priorityValue = data[CONFIG.SCHEMA.PROSPECTS.priorityScore.header] || 
                           data[SharedUtils.normalizeHeader(CONFIG.SCHEMA.PROSPECTS.priorityScore.header)];
        var urgencyValue = data[CONFIG.SCHEMA.PROSPECTS.urgencyScore.header] || 
                          data[SharedUtils.normalizeHeader(CONFIG.SCHEMA.PROSPECTS.urgencyScore.header)];
        
        var priorityValid = FieldValidators.validatePriorityScore(priorityValue, errors);
        var urgencyValid = FieldValidators.validateUrgencyScore(urgencyValue, errors);
        
        if (!priorityValid && !errors.some(function(e) { return e.indexOf('Priority') > -1; })) {
          errors.push('Priority score validation failed');
        }
        if (!urgencyValid && !errors.some(function(e) { return e.indexOf('Urgency') > -1; })) {
          errors.push('Urgency score validation failed');
        }
        return { isValid: errors.length === 0, errors: errors, warnings: warnings };
      },
      function prospectDates(data) {
        var errors = [];
        var warnings = [];
        
        // FIX: Use CONFIG.SCHEMA for header references
        var lastOutreachHeader = CONFIG.SCHEMA.PROSPECTS.lastOutreachDate.header;
        var lastOutreachValue = data[lastOutreachHeader] || 
                               data[SharedUtils.normalizeHeader(lastOutreachHeader)];
        if (lastOutreachValue) {
          var isDateValid = FieldValidators.validateDate(lastOutreachValue, errors, {
            minYear: 1900,
            maxYear: new Date().getFullYear() + 1,
            allowFuture: false,
            allowPast: true,
            fieldName: lastOutreachHeader
          });
          if (!isDateValid && !errors.some(function(e) { return e.indexOf('Last Outreach Date') > -1; })) {
            errors.push('Invalid last outreach date format');
          }
        }
        
        var nextStepsHeader = CONFIG.SCHEMA.PROSPECTS.nextStepsDueDate.header;
        var nextStepsValue = data[nextStepsHeader] || 
                            data[SharedUtils.normalizeHeader(nextStepsHeader)];
        if (nextStepsValue) {
          var isNextStepsValid = FieldValidators.validateDate(nextStepsValue, errors, {
            minYear: 1900,
            maxYear: 2100,
            allowFuture: true,
            allowPast: true,
            fieldName: nextStepsHeader
          });
          if (!isNextStepsValid && !errors.some(function(e) { return e.indexOf('Next Steps Due Date') > -1; })) {
            errors.push('Invalid next steps due date format');
          }
        }
        return { isValid: errors.length === 0, errors: errors, warnings: warnings };
      }
    ];
    
    return function pipeline(data, options) {
      var fr = getFunctionRefactorer();
      if (fr && fr.createPipeline) {
        var pipeline = fr.createPipeline(validationSteps);
        return pipeline(data, options);
      }
      
      // Fallback if FunctionRefactorer not available
      var allErrors = [];
      var allWarnings = [];
      var isValid = true;
      
      validationSteps.forEach(function(step) {
        var result = step(data, options);
        if (result.errors && result.errors.length > 0) {
          allErrors = allErrors.concat(result.errors);
          if (result.isValid === false) isValid = false;
        }
        if (result.warnings) {
          allWarnings = allWarnings.concat(result.warnings);
        }
      });
      
      return { isValid: isValid, errors: allErrors, warnings: allWarnings };
    };
    } catch (e) {
      console.error('Error creating prospect pipeline: ' + e.message);
      return function() { return { isValid: false, errors: ['Pipeline setup failed: ' + e.message] }; };
    }
  }

  /**
   * Create outreach validation pipeline
   * @returns {Function} Pipeline function
   */
  function createOutreachPipeline() {
    try {
      var validationSteps = [
      function outreachRequiredFields(data) {
        var errors = [];
        // FIX: Use CONFIG.SCHEMA for header references
        var requiredFields = [
          CONFIG.SCHEMA.OUTREACH.company.header,
          CONFIG.SCHEMA.OUTREACH.visitDate.header,
          CONFIG.SCHEMA.OUTREACH.outcome.header
        ];
        requiredFields.forEach(function(field) {
          var value = data[field] || data[SharedUtils.normalizeHeader(field)];
          if (!value || String(value).trim() === '') {
            errors.push('Missing required field: ' + field);
          }
        });
        return { isValid: errors.length === 0, errors: errors };
      },
      function outreachVisitDate(data) {
        var errors = [];
        var visitDateHeader = CONFIG.SCHEMA.OUTREACH.visitDate.header;
        var value = data[visitDateHeader] || data[SharedUtils.normalizeHeader(visitDateHeader)];
        FieldValidators.validateDate(value, errors, {
          fieldName: visitDateHeader,
          allowFuture: true
        });
        return { isValid: errors.length === 0, errors: errors };
      },
      function outreachOutcome(data) {
        var errors = [];
        var outcomeHeader = CONFIG.SCHEMA.OUTREACH.outcome.header;
        var value = data[outcomeHeader] || data[SharedUtils.normalizeHeader(outcomeHeader)];
        FieldValidators.validateOutcome(value, errors);
        return { isValid: errors.length === 0, errors: errors, warnings: errors };
      },
      function outreachStage(data) {
        var errors = [];
        var stageHeader = CONFIG.SCHEMA.OUTREACH.stage.header;
        var value = data[stageHeader] || data[SharedUtils.normalizeHeader(stageHeader)];
        FieldValidators.validateStage(value, errors);
        return { isValid: errors.length === 0, errors: errors, warnings: errors };
      },
      function outreachStatus(data) {
        var errors = [];
        var statusHeader = CONFIG.SCHEMA.OUTREACH.status.header;
        var value = data[statusHeader] || data[SharedUtils.normalizeHeader(statusHeader)];
        FieldValidators.validateStatus(value, errors);
        return { isValid: errors.length === 0, errors: errors, warnings: errors };
      },
      function outreachCompanyId(data) {
        var errors = [];
        var companyIdHeader = CONFIG.SCHEMA.OUTREACH.companyId.header;
        var value = data[companyIdHeader] || data[SharedUtils.normalizeHeader(companyIdHeader)];
        FieldValidators.validateCompanyId(value, errors);
        return { isValid: errors.length === 0, errors: errors, warnings: errors };
      },
      function outreachNotes(data) {
        var errors = [];
        var notesHeader = CONFIG.SCHEMA.OUTREACH.notes.header;
        var value = data[notesHeader] || data[SharedUtils.normalizeHeader(notesHeader)];
        FieldValidators.validateNotesLength(value, errors);
        return { isValid: errors.length === 0, errors: errors };
      }
    ];
    
    return function pipeline(data, options) {
      var fr = getFunctionRefactorer();
      if (fr && fr.createPipeline) {
        var pipeline = fr.createPipeline(validationSteps);
        return pipeline(data, options);
      }
      
      // Fallback
      var allErrors = [];
      var allWarnings = [];
      var isValid = true;
      
      validationSteps.forEach(function(step) {
        var result = step(data, options);
        if (result.errors && result.errors.length > 0) {
          allErrors = allErrors.concat(result.errors);
          if (result.isValid === false) isValid = false;
        }
        if (result.warnings) {
          allWarnings = allWarnings.concat(result.warnings);
        }
      });
      
      return { isValid: isValid, errors: allErrors, warnings: allWarnings };
    };
    } catch (e) {
      console.error('Error creating outreach pipeline: ' + e.message);
      return function() { return { isValid: false, errors: ['Pipeline setup failed: ' + e.message] }; };
    }
  }

  /**
   * Create account validation pipeline
   * @returns {Function} Pipeline function
   */
  function createAccountPipeline() {
    try {
      var validationSteps = [
      function accountRequiredFields(data) {
        var errors = [];
        // FIX: Use CONFIG.SCHEMA for header references
        var requiredFields = [
          CONFIG.SCHEMA.ACCOUNTS.companyName.header,
          CONFIG.SCHEMA.ACCOUNTS.contactName.header,
          CONFIG.SCHEMA.ACCOUNTS.siteLocation.header
        ];
        requiredFields.forEach(function(field) {
          var value = data[field] || data[SharedUtils.normalizeHeader(field)];
          if (!value || String(value).trim() === '') {
            errors.push('Missing required field: ' + field);
          }
        });
        return { isValid: errors.length === 0, errors: errors };
      },
      function accountCompanyName(data) {
        var errors = [];
        var companyNameHeader = CONFIG.SCHEMA.ACCOUNTS.companyName.header;
        var value = data[companyNameHeader] || data[SharedUtils.normalizeHeader(companyNameHeader)];
        FieldValidators.validateCompanyName(value, errors);
        return { isValid: errors.length === 0, errors: errors };
      },
      function accountContactName(data) {
        var errors = [];
        var contactNameHeader = CONFIG.SCHEMA.ACCOUNTS.contactName.header;
        var value = data[contactNameHeader] || data[SharedUtils.normalizeHeader(contactNameHeader)];
        FieldValidators.validateContactName(value, errors);
        return { isValid: errors.length === 0, errors: errors, warnings: errors };
      },
      function accountSiteLocation(data) {
        var errors = [];
        var siteLocationHeader = CONFIG.SCHEMA.ACCOUNTS.siteLocation.header;
        var value = data[siteLocationHeader] || data[SharedUtils.normalizeHeader(siteLocationHeader)];
        if (value && String(value).trim().length < 5) {
          errors.push('Site location seems unusually short');
        }
        return { isValid: errors.length === 0, errors: errors, warnings: errors };
      },
      function accountContainerSize(data) {
        var errors = [];
        var containerSizeHeader = CONFIG.SCHEMA.ACCOUNTS.rollOffContainerSize.header;
        var value = data[containerSizeHeader] || data[SharedUtils.normalizeHeader(containerSizeHeader)];
        FieldValidators.validateContainerSize(value, errors);
        return { isValid: errors.length === 0, errors: errors, warnings: errors };
      },
      function accountFees(data) {
        var errors = [];
        var rollOffFeeHeader = CONFIG.SCHEMA.ACCOUNTS.rollOffFee.header;
        var payoutPriceHeader = CONFIG.SCHEMA.ACCOUNTS.payoutPrice.header;
        var rollOffFee = data[rollOffFeeHeader] || data[SharedUtils.normalizeHeader(rollOffFeeHeader)];
        var payoutPrice = data[payoutPriceHeader] || data[SharedUtils.normalizeHeader(payoutPriceHeader)];
        FieldValidators.validateRollOffFee(rollOffFee, errors);
        if (payoutPrice !== undefined) {
          var payout = Number(payoutPrice);
          if (payout < 0) {
            errors.push('Payout price cannot be negative');
          }
        }
        return { isValid: errors.length === 0, errors: errors };
      },
      function accountHandlingMethod(data) {
        var errors = [];
        var handlingHeader = CONFIG.SCHEMA.ACCOUNTS.handlingOfMetal.header;
        var value = data[handlingHeader] || data[SharedUtils.normalizeHeader(handlingHeader)];
        if (value) {
          var validMethods = ['All together', 'Separate', 'Employees take', 'Scrap guy picks up', 'Haul themselves', 'Roll-off vendor', 'Unknown'];
          if (validMethods.indexOf(String(value).trim()) === -1) {
            errors.push('Unrecognized handling method: ' + value + ' (valid: ' + validMethods.join(', ') + ')');
          }
        }
        return { isValid: errors.length === 0, errors: errors, warnings: errors };
      }
    ];
    
    return function pipeline(data, options) {
      var fr = getFunctionRefactorer();
      if (fr && fr.createPipeline) {
        var pipeline = fr.createPipeline(validationSteps);
        return pipeline(data, options);
      }
      
      // Fallback
      var allErrors = [];
      var allWarnings = [];
      var isValid = true;
      
      validationSteps.forEach(function(step) {
        var result = step(data, options);
        if (result.errors && result.errors.length > 0) {
          allErrors = allErrors.concat(result.errors);
          if (result.isValid === false) isValid = false;
        }
        if (result.warnings) {
          allWarnings = allWarnings.concat(result.warnings);
        }
      });
      
      return { isValid: isValid, errors: allErrors, warnings: allWarnings };
    };
    } catch (e) {
      console.error('Error creating account pipeline: ' + e.message);
      return function() { return { isValid: false, errors: ['Pipeline setup failed: ' + e.message] }; };
    }
  }

  // ============================================================================
  // WRAPPED VALIDATION FUNCTIONS (withErrorHandling + withLogging)
  // ============================================================================
  
  /**
   * Get wrapped validator with error handling and logging
   * @param {Function} validator - Original validator function
   * @param {string} validatorName - Name for logging
   * @returns {Function} Wrapped validator
   */
  function getWrappedValidator(validator, validatorName) {
    var fr = getFunctionRefactorer();
    var eb = getErrorBoundary();
    var li = getLoggerInjector();
    
    var wrappedFn = function(data, options) {
      // Create log entry
      var logEntry = {
        validator: validatorName,
        timestamp: new Date().toISOString(),
        dataKeys: data ? Object.keys(data).length : 0
      };
      
      try {
        var result = validator(data, options);
        logEntry.success = true;
        
        if (li && li.log) {
          li.log(validatorName + ' validation completed', logEntry);
        }
        
        return result;
      } catch (e) {
        logEntry.success = false;
        logEntry.error = e.message;
        
        if (li && li.log) {
          li.log(validatorName + ' validation failed', logEntry);
        }
        
        if (eb && eb.handleError) {
          return eb.handleError(e, { validator: validatorName, data: data });
        }
        
        // Fallback error handling
        return {
          success: false,
          errors: ['Validation error in ' + validatorName + ': ' + e.message],
          warnings: []
        };
      }
    };
    
    // Apply FunctionRefactorer wrappers if available
    if (fr) {
      if (fr.withErrorHandling) {
        wrappedFn = fr.withErrorHandling(wrappedFn, validatorName);
      }
      if (fr.withLogging) {
        wrappedFn = fr.withLogging(wrappedFn, 'info');
      }
    }
    
    return wrappedFn;
  }

  // ============================================================================
  // PIPELINE VALIDATORS (Pre-built wrapped versions)
  // ============================================================================
  
  var ProspectPipeline = null;
  var OutreachPipeline = null;
  var AccountPipeline = null;
  
  function getProspectPipeline() {
    if (!ProspectPipeline) {
      ProspectPipeline = createProspectPipeline();
    }
    return ProspectPipeline;
  }
  
  function getOutreachPipeline() {
    if (!OutreachPipeline) {
      OutreachPipeline = createOutreachPipeline();
    }
    return OutreachPipeline;
  }
  
  function getAccountPipeline() {
    if (!AccountPipeline) {
      AccountPipeline = createAccountPipeline();
    }
    return AccountPipeline;
  }

  // ============================================================================
  // COMPLEXITY ANALYSIS
  // ============================================================================
  
  /**
   * Analyze validation function complexity
   * @param {Function} fn - Function to analyze
   * @returns {Object} Analysis results
   */
  function analyzeValidationComplexity(fn) {
    var fr = getFunctionRefactorer();
    if (fr && fr.analyze) {
      return fr.analyze(fn);
    }
    
    // Fallback complexity calculation
    var source = fn.toString();
    var complexity = 1;
    var patterns = [/\bif\b/g, /\belse\s+if\b/g, /\bwhile\b/g, /\bfor\b/g, /\bswitch\b/g];
    
    patterns.forEach(function(pattern) {
      var matches = source.match(pattern);
      if (matches) complexity += matches.length;
    });
    
    return {
      name: fn.name || 'validation',
      complexity: complexity,
      needsRefactoring: complexity > 15
    };
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  return {
    // Version info
    VERSION: '2.0.0',
    
    /**
     * Get FunctionRefactorer integration helpers
     */
    getFunctionRefactorer: getFunctionRefactorer,
    
    /**
     * Get ErrorBoundary instance
     */
    getErrorBoundary: getErrorBoundary,
    
    /**
     * Get LoggerInjector instance
     */
    getLoggerInjector: getLoggerInjector,
    
    /**
     * Get field validators
     */
    FieldValidators: FieldValidators,
    
    /**
     * Get prospect validation pipeline
     */
    getProspectPipeline: getProspectPipeline,
    
    /**
     * Get outreach validation pipeline
     */
    getOutreachPipeline: getOutreachPipeline,
    
    /**
     * Get account validation pipeline
     */
    getAccountPipeline: getAccountPipeline,
    
    /**
     * Analyze validation complexity
     */
    analyzeComplexity: analyzeValidationComplexity,
    
    /**
     * Create wrapped validator with logging and error handling
     */
    wrapValidator: getWrappedValidator,
    
    /**
     * Validate prospect using pipeline
     */
    validateProspectPipeline: function(data, options) {
      var logEntry = { validator: 'validateProspectPipeline', timestamp: new Date().toISOString() };
      try {
        var result = getProspectPipeline()(data, options);
        result.pipeline = 'prospect';
        return result;
      } catch (e) {
        logEntry.error = e.message;
        return { isValid: false, errors: [e.message], warnings: [], pipeline: 'prospect' };
      }
    },
    
    /**
     * Validate outreach using pipeline
     */
    validateOutreachPipeline: function(data, options) {
      try {
        var result = getOutreachPipeline()(data, options);
        result.pipeline = 'outreach';
        return result;
      } catch (e) {
        return { isValid: false, errors: [e.message], warnings: [], pipeline: 'outreach' };
      }
    },
    
    /**
     * Validate account using pipeline
     */
    validateAccountPipeline: function(data, options) {
      try {
        var result = getAccountPipeline()(data, options);
        result.pipeline = 'account';
        return result;
      } catch (e) {
        return { isValid: false, errors: [e.message], warnings: [], pipeline: 'account' };
      }
    },
    
    // Original API (backward compatibility)
    validateProspectWithErrorHandling: function(prospectData, options) {
      try {
        return this.validateProspect(prospectData, options);
      } catch (e) {
        return ErrorHandling.handleError(e, {
          functionName: 'validateProspect',
          entityType: 'prospect',
          data: prospectData
        });
      }
    },
    
    validateOutreachWithErrorHandling: function(outreachData, options) {
      try {
        return this.validateOutreach(outreachData, options);
      } catch (e) {
        return ErrorHandling.handleError(e, {
          functionName: 'validateOutreach',
          entityType: 'outreach',
          data: outreachData
        });
      }
    },
    
    validateNewAccountWithErrorHandling: function(accountData, options) {
      try {
        return this.validateNewAccount(accountData, options);
      } catch (e) {
        return ErrorHandling.handleError(e, {
          functionName: 'validateNewAccount',
          entityType: 'account',
          data: accountData
        });
      }
    },
    
    validateBusinessLogicWithErrorHandling: function(data, options) {
      try {
        return this.validateBusinessLogic(data, options);
      } catch (e) {
        return ErrorHandling.handleError(e, {
          functionName: 'validateBusinessLogic',
          data: data
        });
      }
    },
    
    validateCompleteSubmissionWithErrorHandling: function(entityType, data, options) {
      try {
        return this.validateCompleteSubmission(entityType, data, options);
      } catch (e) {
        return ErrorHandling.handleError(e, {
          functionName: 'validateCompleteSubmission',
          entityType: entityType,
          data: data
        });
      }
    }
  };
})();

// Make BusinessValidation available globally
var BusinessValidation = BusinessValidation;

/**
 * Business rule validation constants and configurations
 */
var BUSINESS_RULES = {
  // Date validation rules
  DATE_RULES: {
    MIN_YEAR: 1900,
    MAX_YEAR: 2100,
    MAX_FUTURE_DAYS: 365, // Max 1 year in future for next steps
    MIN_PAST_DAYS: 1825, // Max 5 years in past for historical data
    ALLOW_FUTURE_NEXT_STEPS: true,
    ALLOW_PAST_NEXT_STEPS: true
  },
  
  // Prospect validation rules
  PROSPECT_RULES: {
    MIN_PRIORITY_SCORE: 0,
    MAX_PRIORITY_SCORE: 100,
    MIN_URGENCY_SCORE: 0,
    MAX_URGENCY_SCORE: 100,
    REQUIRED_FIELDS: ['Company Name', 'Address'],
    ALLOW_DUPLICATE_COMPANIES: false
  },
  
   // Outreach validation rules
  OUTREACH_RULES: {
    VALID_OUTCOMES: ['Account Won', 'Disqualified', 'Follow-Up', 'Initial Contact', 'Interested', 'Interested (Hot)', 'Interested (Warm)', 'No Answer', 'Not Interested'],
    VALID_STAGES: ['Disqualified', 'Lost', 'Nurture', 'Outreach', 'Prospect', 'Won'],
    VALID_STATUSES: ['Active', 'Cold', 'Disqualified', 'Hot', 'Interested (Hot)', 'Interested (Warm)', 'Lost', 'Warm', 'Won'],
    VALID_CONTACT_TYPES: ['Email', 'Phone', 'Visit'],
    REQUIRED_FIELDS: ['Company', 'Visit Date', 'Outcome'],
    MAX_NOTES_LENGTH: 1000
  },
  
  // New Accounts validation rules
  ACCOUNT_RULES: {
    REQUIRED_FIELDS: ['Company name', 'Contact name', 'Site Location'],
    VALID_ROLL_OFF_SIZES: ['10 yd', '20 yd', '30 yd', '40 yd', 'Lugger'],
    MIN_ROLL_OFF_FEE: 0,
    MAX_ROLL_OFF_FEE: 10000,
    VALID_HANDLING_METHODS: ['All together', 'Separate', 'Employees take', 'Scrap guy picks up', 'Haul themselves', 'Roll-off vendor', 'Unknown']
  }
};

/**
 * Validates prospect data against business rules
 * @param {Object} prospectData - Prospect data object
 * @param {Object} options - Validation options
 * @param {boolean} options.strictMode - Whether to enforce strict validation (default: false)
 * @return {Object} Validation result with success flag, errors, and warnings
 */
BusinessValidation.validateProspect = function(prospectData, options) {
  options = options || {};
  var strictMode = options.strictMode || false;
  
  var result = {
    success: true,
    errors: [],
    warnings: [],
    validatedData: {}
  };
  
  if (!prospectData || typeof prospectData !== 'object') {
    result.success = false;
    result.errors.push('Invalid prospect data: must be an object');
    return result;
  }
  
  // Validate required fields
  BUSINESS_RULES.PROSPECT_RULES.REQUIRED_FIELDS.forEach(function(field) {
    var normalizedField = SharedUtils.normalizeHeader(field);
    if (!prospectData.hasOwnProperty(normalizedField) || 
        prospectData[normalizedField] === null || 
        prospectData[normalizedField] === undefined ||
        prospectData[normalizedField].toString().trim() === '') {
      result.success = false;
      result.errors.push('Missing required field: ' + field);
    }
  });
  
  // Validate company name format
  var companyNameHeader = CONFIG.SCHEMA.PROSPECTS.companyName.header;
  if (prospectData[companyNameHeader] || prospectData[SharedUtils.normalizeHeader(companyNameHeader)]) {
    var companyName = (prospectData[companyNameHeader] || prospectData[SharedUtils.normalizeHeader(companyNameHeader)]).toString().trim();
    if (companyName.length < 2) {
      result.success = false;
      result.errors.push('Company name must be at least 2 characters long');
    } else if (companyName.length > 200) {
      result.warnings.push('Company name seems unusually long: ' + companyName.length + ' characters');
    }
    
    // Check for duplicate companies if strict mode
    if (strictMode && BUSINESS_RULES.PROSPECT_RULES.ALLOW_DUPLICATE_COMPANIES === false) {
      var existingCompanies = this._checkForDuplicateCompanies(companyName);
      if (existingCompanies.length > 0) {
        result.warnings.push('Potential duplicate company found: ' + companyName + 
                           ' (existing: ' + existingCompanies.join(', ') + ')');
      }
    }
  }
  
  // Validate address format
  if (prospectData['Address']) {
    var address = prospectData['Address'].toString().trim();
    if (address.length < 5) {
      result.warnings.push('Address seems unusually short: ' + address);
    }
  }
  
  // Validate priority score
  if (prospectData['Priority Score'] !== undefined) {
    var priorityScore = SharedUtils.validateNumber(
      prospectData['Priority Score'], 
      'Priority Score', 
      {
        min: BUSINESS_RULES.PROSPECT_RULES.MIN_PRIORITY_SCORE,
        max: BUSINESS_RULES.PROSPECT_RULES.MAX_PRIORITY_SCORE,
        allowNegative: false
      }
    );
    
    if (typeof priorityScore === 'number') {
      result.validatedData['Priority Score'] = priorityScore;
    } else {
      result.success = false;
      result.errors.push('Invalid priority score: must be between ' + 
                        BUSINESS_RULES.PROSPECT_RULES.MIN_PRIORITY_SCORE + ' and ' + 
                        BUSINESS_RULES.PROSPECT_RULES.MAX_PRIORITY_SCORE);
    }
  }
  
  // Validate urgency score
  if (prospectData['Urgency Score'] !== undefined) {
    var urgencyScore = SharedUtils.validateNumber(
      prospectData['Urgency Score'], 
      'Urgency Score', 
      {
        min: BUSINESS_RULES.PROSPECT_RULES.MIN_URGENCY_SCORE,
        max: BUSINESS_RULES.PROSPECT_RULES.MAX_URGENCY_SCORE,
        allowNegative: false
      }
    );
    
    if (typeof urgencyScore === 'number') {
      result.validatedData['Urgency Score'] = urgencyScore;
    } else {
      result.success = false;
      result.errors.push('Invalid urgency score: must be between ' + 
                        BUSINESS_RULES.PROSPECT_RULES.MIN_URGENCY_SCORE + ' and ' + 
                        BUSINESS_RULES.PROSPECT_RULES.MAX_URGENCY_SCORE);
    }
  }
  
  // Validate last outreach date
  if (prospectData['last outreach date']) {
    var lastOutreachDate = DateValidationUtils.parseDate(
      prospectData['last outreach date'], 
      {
        maxYear: new Date().getFullYear() + 1,
        allowFuture: false
      },
      'last outreach date'
    );
    
    if (!lastOutreachDate) {
      result.warnings.push('Invalid last outreach date format');
    } else {
      result.validatedData['last outreach date'] = lastOutreachDate;
    }
  }
  
  // Validate next steps due date
  if (prospectData['next steps due date']) {
    var nextStepsDate = DateValidationUtils.parseDate(
      prospectData['next steps due date'], 
      {
        minYear: BUSINESS_RULES.DATE_RULES.MIN_YEAR,
        maxYear: BUSINESS_RULES.DATE_RULES.MAX_YEAR,
        allowFuture: BUSINESS_RULES.DATE_RULES.ALLOW_FUTURE_NEXT_STEPS,
        allowPast: BUSINESS_RULES.DATE_RULES.ALLOW_PAST_NEXT_STEPS
      },
      'next steps due date'
    );
    
    if (!nextStepsDate) {
      result.warnings.push('Invalid next steps due date format');
    } else {
      result.validatedData['next steps due date'] = nextStepsDate;
    }
  }
  
  // Copy other fields that passed basic validation
  for (var key in prospectData) {
    if (!result.validatedData.hasOwnProperty(key) && 
        key !== 'Priority Score' && 
        key !== 'Urgency Score' && 
        key !== 'last outreach date' && 
        key !== 'next steps due date') {
      result.validatedData[key] = prospectData[key];
    }
  }
  
  return result;
};

/**
 * Validates outreach data against business rules
 * @param {Object} outreachData - Outreach data object
 * @param {Object} options - Validation options
 * @param {boolean} options.strictMode - Whether to enforce strict validation (default: false)
 * @return {Object} Validation result with success flag, errors, and warnings
 */
BusinessValidation.validateOutreach = function(outreachData, options) {
  options = options || {};
  var strictMode = options.strictMode || false;
  
  var result = {
    success: true,
    errors: [],
    warnings: [],
    validatedData: {}
  };
  
  if (!outreachData || typeof outreachData !== 'object') {
    result.success = false;
    result.errors.push('Invalid outreach data: must be an object');
    return result;
  }
  
  // Validate required fields
  BUSINESS_RULES.OUTREACH_RULES.REQUIRED_FIELDS.forEach(function(field) {
    var normalizedField = SharedUtils.normalizeHeader(field);
    if (!outreachData.hasOwnProperty(normalizedField) || 
        outreachData[normalizedField] === null || 
        outreachData[normalizedField] === undefined ||
        outreachData[normalizedField].toString().trim() === '') {
      result.success = false;
      result.errors.push('Missing required field: ' + field);
    }
  });
  
  // Validate visit date
  if (outreachData['visit date']) {
    var visitDate = DateValidationUtils.parseDate(
      outreachData['visit date'], 
      {
        minYear: BUSINESS_RULES.DATE_RULES.MIN_YEAR,
        maxYear: BUSINESS_RULES.DATE_RULES.MAX_YEAR,
        allowFuture: true, // Allow future dates for scheduled visits
        allowPast: true
      },
      'visit date'
    );
    
    if (!visitDate) {
      result.success = false;
      result.errors.push('Invalid visit date format');
    } else {
      result.validatedData['visit date'] = visitDate;
    }
  }
  
  // Validate outcome
  if (outreachData['Outcome']) {
    var outcome = outreachData['Outcome'].toString().trim();
    if (BUSINESS_RULES.OUTREACH_RULES.VALID_OUTCOMES.indexOf(outcome) === -1) {
      result.warnings.push('Unrecognized outcome: ' + outcome + 
                          ' (valid: ' + BUSINESS_RULES.OUTREACH_RULES.VALID_OUTCOMES.join(', ') + ')');
    }
    result.validatedData['Outcome'] = outcome;
  }
  
  // Validate stage
  if (outreachData['stage']) {
    var stage = outreachData['stage'].toString().trim();
    if (BUSINESS_RULES.OUTREACH_RULES.VALID_STAGES.indexOf(stage) === -1) {
      result.warnings.push('Unrecognized stage: ' + stage + 
                          ' (valid: ' + BUSINESS_RULES.OUTREACH_RULES.VALID_STAGES.join(', ') + ')');
    }
    result.validatedData['stage'] = stage;
  }
  
  // Validate status
  if (outreachData['status']) {
    var status = outreachData['status'].toString().trim();
    if (BUSINESS_RULES.OUTREACH_RULES.VALID_STATUSES.indexOf(status) === -1) {
      result.warnings.push('Unrecognized status: ' + status + 
                          ' (valid: ' + BUSINESS_RULES.OUTREACH_RULES.VALID_STATUSES.join(', ') + ')');
    }
    result.validatedData['status'] = status;
  }
  
  // Validate contact type
  if (outreachData['contact type']) {
    var contactType = outreachData['contact type'].toString().trim();
    if (BUSINESS_RULES.OUTREACH_RULES.VALID_CONTACT_TYPES.indexOf(contactType) === -1) {
      result.warnings.push('Unrecognized contact type: ' + contactType + 
                          ' (valid: ' + BUSINESS_RULES.OUTREACH_RULES.VALID_CONTACT_TYPES.join(', ') + ')');
    }
    result.validatedData['contact type'] = contactType;
  }
  
  // Validate notes length
  if (outreachData['notes']) {
    var notes = outreachData['notes'].toString();
    if (notes.length > BUSINESS_RULES.OUTREACH_RULES.MAX_NOTES_LENGTH) {
      result.warnings.push('Notes exceed maximum length of ' + 
                          BUSINESS_RULES.OUTREACH_RULES.MAX_NOTES_LENGTH + ' characters');
    }
    result.validatedData['notes'] = notes.substring(0, BUSINESS_RULES.OUTREACH_RULES.MAX_NOTES_LENGTH);
  }
  
  // Validate company ID format if present
  if (outreachData['company id']) {
    var companyId = outreachData['company id'].toString().trim();
    var companyIdPattern = /^CID-[A-Z0-9]{3}\d{2}$/;
    if (!companyIdPattern.test(companyId)) {
      result.warnings.push('Company ID format may be invalid: ' + companyId + 
                          ' (expected: CID-XXX##)');
    }
    result.validatedData['company id'] = companyId;
  }
  
  // Copy other fields
  for (var key in outreachData) {
    if (!result.validatedData.hasOwnProperty(key)) {
      result.validatedData[key] = outreachData[key];
    }
  }
  
  return result;
};

/**
 * Validates new account data against business rules
 * @param {Object} accountData - New account data object
 * @param {Object} options - Validation options
 * @param {boolean} options.strictMode - Whether to enforce strict validation (default: false)
 * @return {Object} Validation result with success flag, errors, and warnings
 */
BusinessValidation.validateNewAccount = function(accountData, options) {
  options = options || {};
  var strictMode = options.strictMode || false;
  
  var result = {
    success: true,
    errors: [],
    warnings: [],
    validatedData: {}
  };
  
  if (!accountData || typeof accountData !== 'object') {
    result.success = false;
    result.errors.push('Invalid account data: must be an object');
    return result;
  }
  
  // Validate required fields
  BUSINESS_RULES.ACCOUNT_RULES.REQUIRED_FIELDS.forEach(function(field) {
    var normalizedField = SharedUtils.normalizeHeader(field);
    if (!accountData.hasOwnProperty(normalizedField) || 
        accountData[normalizedField] === null || 
        accountData[normalizedField] === undefined ||
        accountData[normalizedField].toString().trim() === '') {
      result.success = false;
      result.errors.push('Missing required field: ' + field);
    }
  });
  
  // Validate company name
  if (accountData['Company Name']) {
    var companyName = accountData['Company Name'].toString().trim();
    if (companyName.length < 2) {
      result.success = false;
      result.errors.push('Company name must be at least 2 characters long');
    }
    result.validatedData['Company Name'] = companyName;
  }
  
  // Validate contact name
  if (accountData['contact name']) {
    var contactName = accountData['contact name'].toString().trim();
    if (contactName.length < 2) {
      result.warnings.push('Contact name seems unusually short: ' + contactName);
    }
    result.validatedData['contact name'] = contactName;
  }
  
  // Validate site location
  if (accountData['site location']) {
    var siteLocation = accountData['site location'].toString().trim();
    if (siteLocation.length < 5) {
      result.warnings.push('Site location seems unusually short: ' + siteLocation);
    }
    result.validatedData['site location'] = siteLocation;
  }
  
  // Validate roll-off container size
  if (accountData['roll off container size']) {
    var containerSize = accountData['roll off container size'].toString().trim();
    if (BUSINESS_RULES.ACCOUNT_RULES.VALID_ROLL_OFF_SIZES.indexOf(containerSize) === -1) {
      result.warnings.push('Unrecognized container size: ' + containerSize + 
                          ' (valid: ' + BUSINESS_RULES.ACCOUNT_RULES.VALID_ROLL_OFF_SIZES.join(', ') + ')');
    }
    result.validatedData['roll off container size'] = containerSize;
  }
  
  // Validate roll-off fee
  if (accountData['roll-off fee'] !== undefined) {
    var rollOffFee = SharedUtils.parseCurrency(accountData['roll-off fee']);
    if (rollOffFee < BUSINESS_RULES.ACCOUNT_RULES.MIN_ROLL_OFF_FEE || 
        rollOffFee > BUSINESS_RULES.ACCOUNT_RULES.MAX_ROLL_OFF_FEE) {
      result.warnings.push('Roll-off fee seems unusual: $' + rollOffFee + 
                          ' (range: $' + BUSINESS_RULES.ACCOUNT_RULES.MIN_ROLL_OFF_FEE + 
                          ' - $' + BUSINESS_RULES.ACCOUNT_RULES.MAX_ROLL_OFF_FEE + ')');
    }
    result.validatedData['roll-off fee'] = rollOffFee;
  }
  
  // Validate payout price
  if (accountData['payout price'] !== undefined) {
    var payoutPrice = SharedUtils.parseCurrency(accountData['payout price']);
    if (payoutPrice < 0) {
      result.success = false;
      result.errors.push('Payout price cannot be negative');
    }
    result.validatedData['payout price'] = payoutPrice;
  }
  
  // Validate handling of metal
  if (accountData['Handling of Metal']) {
    var handlingMethod = accountData['Handling of Metal'].toString().trim();
    if (BUSINESS_RULES.ACCOUNT_RULES.VALID_HANDLING_METHODS.indexOf(handlingMethod) === -1) {
      result.warnings.push('Unrecognized handling method: ' + handlingMethod + 
                          ' (valid: ' + BUSINESS_RULES.ACCOUNT_RULES.VALID_HANDLING_METHODS.join(', ') + ')');
    }
    result.validatedData['Handling of Metal'] = handlingMethod;
  }
  
  // Validate timestamp
  if (accountData['Timestamp']) {
    var timestamp = DateValidationUtils.parseDate(
      accountData['Timestamp'], 
      {
        minYear: BUSINESS_RULES.DATE_RULES.MIN_YEAR,
        maxYear: new Date().getFullYear() + 1,
        allowFuture: true
      },
      'Timestamp'
    );
    
    if (!timestamp) {
      result.warnings.push('Invalid timestamp format');
    } else {
      result.validatedData['Timestamp'] = timestamp;
    }
  }
  
  // Copy other fields
  for (var key in accountData) {
    if (!result.validatedData.hasOwnProperty(key)) {
      result.validatedData[key] = accountData[key];
    }
  }
  
  return result;
};

/**
 * Validates business logic relationships between entities
 * @param {Object} data - Data object containing related entities
 * @param {Object} options - Validation options
 * @return {Object} Validation result with success flag and relationship errors
 */
BusinessValidation.validateBusinessLogic = function(data, options) {
  options = options || {};
  
  var result = {
    success: true,
    errors: [],
    warnings: []
  };
  
  // Validate prospect-outreach relationships
  if (data.prospect && data.outreach) {
    // Check if outreach company matches prospect company
    var prospectCompany = data.prospect['Company Name'] || '';
    var outreachCompany = data.outreach['company'] || '';
    
    if (prospectCompany && outreachCompany && 
        !ValidationUtils.compareStrings(prospectCompany, outreachCompany, 'prospect-outreach company match')) {
      result.warnings.push('Outreach company (' + outreachCompany + ') does not match prospect company (' + prospectCompany + ')');
    }
    
    // Validate date relationships
    if (data.prospect['last outreach date'] && data.outreach['visit date']) {
      var lastOutreach = DateValidationUtils.parseDate(data.prospect['last outreach date'], {}, 'last outreach date');
      var visitDate = DateValidationUtils.parseDate(data.outreach['visit date'], {}, 'visit date');
      
      if (lastOutreach && visitDate && visitDate < lastOutreach) {
        result.warnings.push('Visit date (' + SharedUtils.formatDate(visitDate) + ') is before last outreach date (' + 
                           SharedUtils.formatDate(lastOutreach) + ')');
      }
    }
  }
  
  // Validate outreach-account conversion logic
  if (data.outreach && data.account) {
    // Check if account won outcome matches account creation
    var outcome = data.outreach['Outcome'] || '';
    if (outcome.toLowerCase() !== 'account won') {
      result.warnings.push('Creating account without "Account Won" outcome: ' + outcome);
    }
    
    // Validate company name consistency
    var outreachCompany = data.outreach['company'] || '';
    var accountCompany = data.account['Company Name'] || '';
    
    if (outreachCompany && accountCompany && 
        !ValidationUtils.compareStrings(outreachCompany, accountCompany, 'outreach-account company match')) {
      result.errors.push('Account company (' + accountCompany + ') does not match outreach company (' + outreachCompany + ')');
    }
  }
  
  return result;
};

/**
 * Internal method to check for duplicate companies
 * @private
 * @param {string} companyName - Company name to check
 * @return {Array} Array of existing company names that match
 */
BusinessValidation._checkForDuplicateCompanies = function(companyName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var prospectsSheet = ss.getSheetByName(CONFIG.SHEETS.PROSPECTS);
    
    if (!prospectsSheet) {
      return [];
    }
    
    var data = prospectsSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return [];
    }
    
    var headers = data[0];
    var companyCol = -1;
    
    // Find company name column using CONFIG.SCHEMA
    var companyNameHeader = CONFIG.SCHEMA.PROSPECTS.companyName.header;
    for (var i = 0; i < headers.length; i++) {
      if (SharedUtils.normalizeHeader(headers[i]) === SharedUtils.normalizeHeader(companyNameHeader)) {
        companyCol = i;
        break;
      }
    }
    
    if (companyCol === -1) {
      return [];
    }
    
    var matches = [];
    var normalizedCompanyName = companyName.toLowerCase().trim();
    
    // Check existing companies
    for (var j = 1; j < data.length; j++) {
      var existingCompany = data[j][companyCol];
      if (existingCompany && existingCompany.toString().toLowerCase().trim() === normalizedCompanyName) {
        matches.push(existingCompany.toString());
      }
    }
    
    return matches;
    
  } catch (e) {
    console.warn('Could not check for duplicate companies:', e.message);
    return [];
  }
};

/**
 * Gets business validation rules summary
 * @return {Object} Summary of all business rules
 */
BusinessValidation.getRulesSummary = function() {
  return {
    dateRules: BUSINESS_RULES.DATE_RULES,
    prospectRules: BUSINESS_RULES.PROSPECT_RULES,
    outreachRules: BUSINESS_RULES.OUTREACH_RULES,
    accountRules: BUSINESS_RULES.ACCOUNT_RULES
  };
};

/**
 * Validates a complete data submission with all business rules
 * @param {string} entityType - Type of entity ('prospect', 'outreach', 'account')
 * @param {Object} data - Data object to validate
 * @param {Object} options - Validation options
 * @return {Object} Complete validation result
 */
BusinessValidation.validateCompleteSubmission = function(entityType, data, options) {
  options = options || {};
  
  var result = {
    success: true,
    entityValidation: null,
    businessLogicValidation: null,
    overallErrors: [],
    overallWarnings: []
  };
  
  // Validate entity-specific rules
  switch (entityType.toLowerCase()) {
    case 'prospect':
      result.entityValidation = this.validateProspect(data, options);
      break;
    case 'outreach':
      result.entityValidation = this.validateOutreach(data, options);
      break;
    case 'account':
      result.entityValidation = this.validateNewAccount(data, options);
      break;
    default:
      result.success = false;
      result.overallErrors.push('Unknown entity type: ' + entityType);
      return result;
  }
  
  // Check overall entity validation success
  if (!result.entityValidation.success) {
    result.success = false;
    result.overallErrors = result.overallErrors.concat(result.entityValidation.errors);
  }
  
  result.overallWarnings = result.overallWarnings.concat(result.entityValidation.warnings);
  
  // Apply business logic validation if additional context provided
  if (options.relatedData) {
    result.businessLogicValidation = this.validateBusinessLogic(
      { [entityType]: data, ...options.relatedData }, 
      options
    );
    
    if (!result.businessLogicValidation.success) {
      result.success = false;
      result.overallErrors = result.overallErrors.concat(result.businessLogicValidation.errors);
    }
    
    result.overallWarnings = result.overallWarnings.concat(result.businessLogicValidation.warnings);
  }
  
  return result;
};
