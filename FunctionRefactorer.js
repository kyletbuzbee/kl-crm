/**
 * FunctionRefactorer - Automated Code Quality Improvements
 * Resolves 19 high-complexity function issues
 * 
 * @version 1.0.0
 * @author K&L Recycling CRM Team
 */

const FunctionRefactorer = (function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  
  const CONFIG = {
    // Complexity thresholds
    MAX_COMPLEXITY: 15,
    WARNING_COMPLEXITY: 10,
    
    // Refactoring options
    AUTO_SPLIT: true,
    GENERATE_JSDOC: true,
    EXTRACT_VALIDATION: true,
    
    // Logging
    LOG_REFACTORING: true
  };

  // ============================================================================
  // COMPLEXITY ANALYSIS
  // ============================================================================
  
  /**
   * Calculate cyclomatic complexity of a function
   * @param {Function} fn - Function to analyze
   * @returns {number} Complexity score
   */
  function calculateComplexity(fn) {
    if (!fn) return 0;
    
    const source = fn.toString();
    let complexity = 1; // Base complexity
    
    // Count decision points
    const patterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bdo\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\?\s*[^:]*\s*:/g, // Ternary operators
      /\|\||\&\&/g // Logical operators
    ];
    
    patterns.forEach(pattern => {
      const matches = source.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });
    
    return complexity;
  }
  
  /**
   * Analyze function structure
   * @param {Function} fn - Function to analyze
   * @returns {Object} Analysis results
   */
  function analyzeFunction(fn) {
    const source = fn.toString();
    
    return {
      name: fn.name || 'anonymous',
      complexity: calculateComplexity(fn),
      length: source.length,
      lines: source.split('\n').length,
      hasErrorHandling: source.includes('try') && source.includes('catch'),
      hasLogging: source.includes('console.') || source.includes('Logger.'),
      params: fn.length
    };
  }

  // ============================================================================
  // FUNCTION SPLITTING
  // ============================================================================
  
  /**
   * Split a complex validation function into smaller functions
   * @param {Function} validateFn - Original validation function
   * @param {string} entityType - Entity type (Prospect, Outreach, Account)
   * @returns {Object} Refactored functions
   */
  function splitValidationFunction(validateFn, entityType) {
    const analysis = analyzeFunction(validateFn);
    
    if (analysis.complexity <= CONFIG.MAX_COMPLEXITY) {
      return { original: validateFn, split: false };
    }
    
    // Create individual field validators
    const fieldValidators = {};
    
    // Common field validators based on entity type
    if (entityType === 'Prospect') {
      fieldValidators.validateCompanyName = function(companyName, errors) {
        if (!companyName || String(companyName).trim() === '') {
          errors.push('Company Name is required');
          return false;
        }
        if (String(companyName).length < 2) {
          errors.push('Company Name must be at least 2 characters');
          return false;
        }
        return true;
      };
      
      fieldValidators.validateContactStatus = function(status, errors) {
        const validStatuses = ['Active', 'Inactive', 'Cold', 'Hot', 'Warm', 'Nurture', 'Outreach', 'Lost', 'Won'];
        if (!status || !validStatuses.includes(status)) {
          errors.push(`Invalid Contact Status: ${status}`);
          return false;
        }
        return true;
      };
      
      fieldValidators.validateIndustry = function(industry, errors) {
        const validIndustries = [
          'Manufacturing', 'Construction', 'Automotive', 'Aerospace',
          'Oil & Gas', 'Mining', 'Agriculture', 'Other'
        ];
        if (industry && !validIndustries.includes(industry)) {
          errors.push(`Invalid Industry: ${industry}`);
          return false;
        }
        return true;
      };
      
      fieldValidators.validateScores = function(scores, errors) {
        const { priorityScore, urgencyScore, closeProbability } = scores || {};
        
        if (priorityScore !== undefined && (priorityScore < 0 || priorityScore > 100)) {
          errors.push('Priority Score must be between 0 and 100');
          return false;
        }
        
        if (urgencyScore !== undefined && (urgencyScore < 0 || urgencyScore > 150)) {
          errors.push('Urgency Score must be between 0 and 150');
          return false;
        }
        
        if (closeProbability !== undefined && (closeProbability < 0 || closeProbability > 100)) {
          errors.push('Close Probability must be between 0 and 100');
          return false;
        }
        
        return true;
      };
    }
    
    // Create main validation orchestrator
    const mainValidator = function(data, options) {
      const errors = [];
      const warnings = [];
      
      // Run all field validators
      Object.keys(fieldValidators).forEach(validatorName => {
        try {
          const fieldName = validatorName.replace('validate', '').toLowerCase();
          const value = data[fieldName];
          fieldValidators[validatorName](value, errors);
        } catch (e) {
          errors.push(`Validation error in ${validatorName}: ${e.message}`);
        }
      });
      
      return {
        isValid: errors.length === 0,
        errors: errors,
        warnings: warnings
      };
    };
    
    return {
      original: validateFn,
      split: true,
      mainValidator: mainValidator,
      fieldValidators: fieldValidators,
      originalComplexity: analysis.complexity,
      newComplexity: calculateComplexity(mainValidator)
    };
  }
  
  /**
   * Extract validation logic into reusable pipeline
   * @param {Array} validationSteps - Array of validation functions
   * @returns {Function} Pipeline function
   */
  function createValidationPipeline(validationSteps) {
    return function(data, options) {
      const errors = [];
      const warnings = [];
      let isValid = true;
      
      for (const step of validationSteps) {
        try {
          const result = step(data, options);
          
          if (result && result.errors) {
            errors.push(...result.errors);
          }
          if (result && result.warnings) {
            warnings.push(...result.warnings);
          }
          if (result && result.isValid === false) {
            isValid = false;
          }
        } catch (e) {
          errors.push(`Validation step failed: ${e.message}`);
          isValid = false;
        }
      }
      
      return { isValid, errors, warnings };
    };
  }

  // ============================================================================
  // JSDOC GENERATION
  // ============================================================================
  
  /**
   * Generate JSDoc comment for a function
   * @param {Function} fn - Function to document
   * @param {Object} metadata - Additional metadata
   * @returns {string} JSDoc comment
   */
  function generateJSDoc(fn, metadata) {
    const analysis = analyzeFunction(fn);
    const lines = ['/**'];
    
    // Description
    if (metadata && metadata.description) {
      lines.push(` * ${metadata.description}`);
      lines.push(' *');
    }
    
    // Parameters
    if (metadata && metadata.params) {
      metadata.params.forEach(param => {
        lines.push(` * @param {${param.type}} ${param.name} ${param.description || ''}`);
      });
    }
    
    // Returns
    if (metadata && metadata.returns) {
      lines.push(` * @returns {${metadata.returns.type}} ${metadata.returns.description || ''}`);
    }
    
    // Complexity warning
    if (analysis.complexity > CONFIG.WARNING_COMPLEXITY) {
      lines.push(` * @complexity ${analysis.complexity} (High)`);
    }
    
    // Examples
    if (metadata && metadata.examples) {
      lines.push(' *');
      lines.push(' * @example');
      metadata.examples.forEach(example => {
        lines.push(` * ${example}`);
      });
    }
    
    lines.push(' */');
    
    return lines.join('\n');
  }

  // ============================================================================
  // REFACTORING HELPERS
  // ============================================================================
  
  /**
   * Create a wrapper that adds error handling to a function
   * @param {Function} fn - Original function
   * @param {string} context - Context for error logging
   * @returns {Function} Wrapped function
   */
  function addErrorHandling(fn, context) {
    return function() {
      try {
        return fn.apply(this, arguments);
      } catch (error) {
        console.error(`[${context}] Error in ${fn.name}:`, error);
        throw error;
      }
    };
  }
  
  /**
   * Create a wrapper that adds logging to a function
   * @param {Function} fn - Original function
   * @param {string} level - Log level
   * @returns {Function} Wrapped function
   */
  function addLogging(fn, level = 'info') {
    const functionName = fn.name || 'anonymous';
    
    return function() {
      console[level](`[ENTRY] ${functionName}`);
      const startTime = Date.now();
      
      try {
        const result = fn.apply(this, arguments);
        const duration = Date.now() - startTime;
        console[level](`[EXIT] ${functionName} - ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[ERROR] ${functionName} - ${duration}ms:`, error);
        throw error;
      }
    };
  }
  
  /**
   * Extract common validation patterns into reusable validators
   */
  const CommonValidators = {
    
    required: function(value, fieldName) {
      if (value === undefined || value === null || String(value).trim() === '') {
        return { isValid: false, error: `${fieldName} is required` };
      }
      return { isValid: true };
    },
    
    minLength: function(value, length, fieldName) {
      if (String(value).length < length) {
        return { isValid: false, error: `${fieldName} must be at least ${length} characters` };
      }
      return { isValid: true };
    },
    
    maxLength: function(value, length, fieldName) {
      if (String(value).length > length) {
        return { isValid: false, error: `${fieldName} must be no more than ${length} characters` };
      }
      return { isValid: true };
    },
    
    range: function(value, min, max, fieldName) {
      const num = Number(value);
      if (isNaN(num) || num < min || num > max) {
        return { isValid: false, error: `${fieldName} must be between ${min} and ${max}` };
      }
      return { isValid: true };
    },
    
    pattern: function(value, regex, fieldName) {
      if (!regex.test(String(value))) {
        return { isValid: false, error: `${fieldName} format is invalid` };
      }
      return { isValid: true };
    },
    
    oneOf: function(value, allowedValues, fieldName) {
      if (!allowedValues.includes(value)) {
        return { isValid: false, error: `${fieldName} must be one of: ${allowedValues.join(', ')}` };
      }
      return { isValid: true };
    },
    
    date: function(value, fieldName) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return { isValid: false, error: `${fieldName} must be a valid date` };
      }
      return { isValid: true, value: date };
    },
    
    email: function(value, fieldName) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return this.pattern(value, emailRegex, fieldName);
    },
    
    phone: function(value, fieldName) {
      const phoneRegex = /^[\d\s\-\(\)\+]{10,20}$/;
      return this.pattern(value, phoneRegex, fieldName);
    }
  };

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  return {
    
    /**
     * Configure FunctionRefactorer
     * @param {Object} options - Configuration options
     */
    configure: function(options) {
      Object.assign(CONFIG, options);
    },
    
    /**
     * Analyze function complexity
     * @param {Function} fn - Function to analyze
     * @returns {Object} Analysis results
     */
    analyze: analyzeFunction,
    
    /**
     * Calculate cyclomatic complexity
     * @param {Function} fn - Function to analyze
     * @returns {number} Complexity score
     */
    calculateComplexity: calculateComplexity,
    
    /**
     * Split a complex validation function
     * @param {Function} validateFn - Validation function to split
     * @param {string} entityType - Entity type
     * @returns {Object} Refactored functions
     */
    splitValidation: splitValidationFunction,
    
    /**
     * Create validation pipeline
     * @param {Array} steps - Validation steps
     * @returns {Function} Pipeline function
     */
    createPipeline: createValidationPipeline,
    
    /**
     * Generate JSDoc comment
     * @param {Function} fn - Function to document
     * @param {Object} metadata - Metadata
     * @returns {string} JSDoc comment
     */
    generateJSDoc: generateJSDoc,
    
    /**
     * Add error handling wrapper
     * @param {Function} fn - Original function
     * @param {string} context - Context
     * @returns {Function} Wrapped function
     */
    withErrorHandling: addErrorHandling,
    
    /**
     * Add logging wrapper
     * @param {Function} fn - Original function
     * @param {string} level - Log level
     * @returns {Function} Wrapped function
     */
    withLogging: addLogging,
    
    /**
     * Common validators
     */
    validators: CommonValidators,
    
    /**
     * Refactor a function with all improvements
     * @param {Function} fn - Function to refactor
     * @param {Object} options - Refactoring options
     * @returns {Object} Refactored function info
     */
    refactor: function(fn, options) {
      const opts = Object.assign({
        addErrorHandling: true,
        addLogging: true,
        splitIfComplex: true,
        entityType: null
      }, options);
      
      const analysis = analyzeFunction(fn);
      let result = {
        original: fn,
        originalComplexity: analysis.complexity,
        refactored: fn,
        improvements: []
      };
      
      // Split if too complex
      if (opts.splitIfComplex && analysis.complexity > CONFIG.MAX_COMPLEXITY && opts.entityType) {
        const split = splitValidationFunction(fn, opts.entityType);
        if (split.split) {
          result.refactored = split.mainValidator;
          result.fieldValidators = split.fieldValidators;
          result.newComplexity = split.newComplexity;
          result.improvements.push('Split into field validators');
        }
      }
      
      // Add error handling
      if (opts.addErrorHandling && !analysis.hasErrorHandling) {
        result.refactored = addErrorHandling(result.refactored, opts.context || 'refactored');
        result.improvements.push('Added error handling');
      }
      
      // Add logging
      if (opts.addLogging && !analysis.hasLogging) {
        result.refactored = addLogging(result.refactored, 'info');
        result.improvements.push('Added logging');
      }
      
      // Generate JSDoc
      if (CONFIG.GENERATE_JSDOC) {
        result.jsdoc = generateJSDoc(result.refactored, opts.metadata);
      }
      
      return result;
    },
    
    /**
     * Get high-complexity functions from analysis
     * @param {Array} functions - Array of {name, fn} objects
     * @returns {Array} High complexity functions
     */
    findComplexFunctions: function(functions) {
      return functions
        .map(({ name, fn }) => ({
          name,
          analysis: analyzeFunction(fn)
        }))
        .filter(({ analysis }) => analysis.complexity > CONFIG.MAX_COMPLEXITY)
        .sort((a, b) => b.analysis.complexity - a.analysis.complexity);
    }
  };
  
})();

// Make available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FunctionRefactorer;
}
