/**
 * Apply Fixes and Test Utilities
 * Comprehensive testing framework and automated fix application for K&L Recycling CRM.
 */

/**
 * Test utilities and mock data generation for comprehensive testing
 */
var TestUtils = {
  /**
   * Mock data generators for different entity types
   */
  mockData: {
    /**
     * Generates mock prospect data
     * @param {Object} overrides - Field overrides
     * @return {Object} Mock prospect data
     */
    generateProspect: function(overrides) {
      var baseData = {
        'company id': 'CID-ABC01',
        'address': '123 Main St, Anytown, TX 75001',
        'zip code': '75001',
        'company name': 'Test Company ' + Math.floor(Math.random() * 1000),
        'industry': 'Manufacturing',
        'latitude': 32.9 + Math.random() * 0.1,
        'longitude': -96.8 + Math.random() * 0.1,
        'last outcome': 'Contact Made',
        'last outreach date': new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
        'days since last contact': Math.floor(Math.random() * 30),
        'next step due countdown': Math.floor(Math.random() * 30),
        'next steps due date': new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in next 30 days
        'contact status': 'Active',
        'close probability': Math.floor(Math.random() * 100),
        'priority score': Math.floor(Math.random() * 100),
        'urgency band': 'High',
        'urgency score': Math.floor(Math.random() * 100),
        'last activity type': 'Phone'
      };
      
      return { ...baseData, ...overrides };
    },
    
    /**
     * Generates mock outreach data
     * @param {Object} overrides - Field overrides
     * @return {Object} Mock outreach data
     */
    generateOutreach: function(overrides) {
      var baseData = {
        'outreach id': 'LID-00' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
        'company id': 'CID-ABC01',
        'company': 'Test Company ' + Math.floor(Math.random() * 1000),
        'visit date': new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date in last week
        'notes': 'Test outreach notes for testing purposes',
        'outcome': 'Contact Made',
        'stage': 'Initial Contact',
        'status': 'Active',
        'next visit date': new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000), // Random date in next 2 weeks
        'days since last visit': Math.floor(Math.random() * 30),
        'next visit countdown': Math.floor(Math.random() * 30),
        'outcome category': 'Positive',
        'follow up action': 'Schedule follow-up call',
        'owner': 'Test User',
        'prospects match': 'Yes',
        'contact type': 'Phone',
        'email sent': 'No'
      };
      
      return { ...baseData, ...overrides };
    },
    
    /**
     * Generates mock new account data
     * @param {Object} overrides - Field overrides
     * @return {Object} Mock account data
     */
    generateAccount: function(overrides) {
      var baseData = {
        'deployed': 'No',
        'timestamp': new Date(),
        'company name': 'Test Account ' + Math.floor(Math.random() * 1000),
        'contact name': 'John Doe',
        'contact phone': '(555) 123-4567',
        'contact role': 'Manager',
        'site location': '123 Test Drive, Test City, TX 75001',
        'mailing location': 'PO Box 123, Test City, TX 75001',
        'roll-off fee': '$500.00',
        'handling of metal': 'On Site',
        'roll off container size': '20 Yard',
        'notes': 'Test account creation notes',
        'payout price': '$1000.00'
      };
      
      return { ...baseData, ...overrides };
    }
  },

  /**
   * Test case generators for edge cases and error conditions
   */
  edgeCases: {
    /**
     * Generates invalid prospect data for testing validation
     * @return {Array} Array of invalid prospect test cases
     */
    invalidProspects: function() {
      return [
        {
          name: 'Missing required fields',
          data: { 'company name': '', 'address': '' },
          expectedErrors: ['Missing required field: Company Name', 'Missing required field: Address']
        },
        {
          name: 'Invalid priority score',
          data: { 'company name': 'Test', 'address': '123 Test St', 'priority score': 150 },
          expectedErrors: ['Invalid priority score: must be between 0 and 100']
        },
        {
          name: 'Invalid urgency score',
          data: { 'company name': 'Test', 'address': '123 Test St', 'urgency score': -10 },
          expectedErrors: ['Invalid urgency score: must be between 0 and 100']
        },
        {
          name: 'Invalid last outreach date',
          data: { 'company name': 'Test', 'address': '123 Test St', 'last outreach date': 'invalid-date' },
          expectedWarnings: ['Invalid last outreach date format']
        },
        {
          name: 'Company name too short',
          data: { 'company name': 'A', 'address': '123 Test St' },
          expectedErrors: ['Company name must be at least 2 characters long']
        }
      ];
    },

    /**
     * Generates invalid outreach data for testing validation
     * @return {Array} Array of invalid outreach test cases
     */
    invalidOutreach: function() {
      return [
        {
          name: 'Missing required fields',
          data: { 'company': '', 'visit date': '', 'outcome': '' },
          expectedErrors: ['Missing required field: Company', 'Missing required field: Visit Date', 'Missing required field: Outcome']
        },
        {
          name: 'Invalid visit date',
          data: { 'company': 'Test', 'visit date': 'invalid-date', 'outcome': 'Contact Made' },
          expectedErrors: ['Invalid visit date format']
        },
        {
          name: 'Invalid outcome',
          data: { 'company': 'Test', 'visit date': new Date(), 'outcome': 'Invalid Outcome' },
          expectedWarnings: ['Unrecognized outcome: Invalid Outcome']
        },
        {
          name: 'Notes too long',
          data: { 
            'company': 'Test', 
            'visit date': new Date(), 
            'outcome': 'Contact Made',
            'notes': 'A'.repeat(1500) // Exceeds 1000 character limit
          },
          expectedWarnings: ['Notes exceed maximum length of 1000 characters']
        }
      ];
    },

    /**
     * Generates invalid account data for testing validation
     * @return {Array} Array of invalid account test cases
     */
    invalidAccounts: function() {
      return [
        {
          name: 'Missing required fields',
          data: { 'company name': '', 'contact name': '', 'site location': '' },
          expectedErrors: ['Missing required field: Company name', 'Missing required field: Contact name', 'Missing required field: Site Location']
        },
        {
          name: 'Invalid container size',
          data: { 'company name': 'Test', 'contact name': 'John', 'site location': '123 Test St', 'roll off container size': 'Invalid Size' },
          expectedWarnings: ['Unrecognized container size: Invalid Size']
        },
        {
          name: 'Negative payout price',
          data: { 'company name': 'Test', 'contact name': 'John', 'site location': '123 Test St', 'payout price': '-100' },
          expectedErrors: ['Payout price cannot be negative']
        },
        {
          name: 'Invalid handling method',
          data: { 'company name': 'Test', 'contact name': 'John', 'site location': '123 Test St', 'handling of metal': 'Invalid Method' },
          expectedWarnings: ['Unrecognized handling method: Invalid Method']
        }
      ];
    }
  },

  /**
   * Test runner for validation functions
   */
  runValidationTests: function() {
    var results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };

    console.log('=== Running Validation Tests ===');

    // Test prospect validation
    results.total += this.testProspectValidation(results);
    
    // Test outreach validation
    results.total += this.testOutreachValidation(results);
    
    // Test account validation
    results.total += this.testAccountValidation(results);

    console.log('=== Test Results ===');
    console.log('Total tests:', results.total);
    console.log('Passed:', results.passed);
    console.log('Failed:', results.failed);
    
    if (results.failed > 0) {
      console.log('Failed tests:');
      results.errors.forEach(function(error) {
        console.log('  -', error);
      });
    }

    return results;
  },

  /**
   * Test prospect validation
   * @param {Object} results - Test results object
   * @returns {number} Number of tests run
   */
  testProspectValidation: function(results) {
    var testCount = 0;
    var passedCount = 0;

    console.log('\n--- Testing Prospect Validation ---');

    // Test valid prospect
    testCount++;
    try {
      var validProspect = this.mockData.generateProspect();
      var validation = BusinessValidation.validateProspect(validProspect);
      if (validation.success) {
        console.log('âœ" Valid prospect validation passed');
        passedCount++;
      } else {
        console.log('âœ— Valid prospect validation failed:', validation.errors);
        results.errors.push('Valid prospect validation failed: ' + validation.errors.join(', '));
      }
    } catch (e) {
      console.log('âœ— Valid prospect validation threw error:', e.message);
      results.errors.push('Valid prospect validation error: ' + e.message);
    }

    // Test invalid prospects
    var invalidCases = this.edgeCases.invalidProspects();
    invalidCases.forEach(function(testCase) {
      testCount++;
      var validation = BusinessValidation.validateProspect(testCase.data);
      
      // Check if expected errors are present
      var hasExpectedErrors = true;
      if (testCase.expectedErrors) {
        testCase.expectedErrors.forEach(function(expectedError) {
          if (!validation.errors.includes(expectedError)) {
            hasExpectedErrors = false;
          }
        });
      }
      
      // Check if expected warnings are present
      var hasExpectedWarnings = true;
      if (testCase.expectedWarnings) {
        testCase.expectedWarnings.forEach(function(expectedWarning) {
          if (!validation.warnings.includes(expectedWarning)) {
            hasExpectedWarnings = false;
          }
        });
      }

      if (!validation.success && hasExpectedErrors && hasExpectedWarnings) {
        console.log('âœ“ Invalid prospect test passed:', testCase.name);
        passedCount++;
      } else {
        console.log('âœ— Invalid prospect test failed:', testCase.name);
        console.log('  Expected errors:', testCase.expectedErrors);
        console.log('  Actual errors:', validation.errors);
        console.log('  Expected warnings:', testCase.expectedWarnings);
        console.log('  Actual warnings:', validation.warnings);
        results.errors.push('Invalid prospect test failed: ' + testCase.name);
      }
    });

    results.passed += passedCount;
    results.failed += (testCount - passedCount);
    return testCount;
  },

  /**
   * Test outreach validation
   * @param {Object} results - Test results object
   * @returns {number} Number of tests run
   */
  testOutreachValidation: function(results) {
    var testCount = 0;
    var passedCount = 0;

    console.log('\n--- Testing Outreach Validation ---');

    // Test valid outreach
    testCount++;
    try {
      var validOutreach = this.mockData.generateOutreach();
      var validation = BusinessValidation.validateOutreach(validOutreach);
      if (validation.success) {
        console.log('âœ" Valid outreach validation passed');
        passedCount++;
      } else {
        console.log('âœ— Valid outreach validation failed:', validation.errors);
        results.errors.push('Valid outreach validation failed: ' + validation.errors.join(', '));
      }
    } catch (e) {
      console.log('âœ— Valid outreach validation threw error:', e.message);
      results.errors.push('Valid outreach validation error: ' + e.message);
    }

    // Test invalid outreaches
    var invalidCases = this.edgeCases.invalidOutreach();
    invalidCases.forEach(function(testCase) {
      testCount++;
      var validation = BusinessValidation.validateOutreach(testCase.data);
      
      // Check if expected errors are present
      var hasExpectedErrors = true;
      if (testCase.expectedErrors) {
        testCase.expectedErrors.forEach(function(expectedError) {
          if (!validation.errors.includes(expectedError)) {
            hasExpectedErrors = false;
          }
        });
      }
      
      // Check if expected warnings are present
      var hasExpectedWarnings = true;
      if (testCase.expectedWarnings) {
        testCase.expectedWarnings.forEach(function(expectedWarning) {
          if (!validation.warnings.includes(expectedWarning)) {
            hasExpectedWarnings = false;
          }
        });
      }

      if (!validation.success && hasExpectedErrors && hasExpectedWarnings) {
        console.log('âœ“ Invalid outreach test passed:', testCase.name);
        passedCount++;
      } else {
        console.log('âœ— Invalid outreach test failed:', testCase.name);
        console.log('  Expected errors:', testCase.expectedErrors);
        console.log('  Actual errors:', validation.errors);
        console.log('  Expected warnings:', testCase.expectedWarnings);
        console.log('  Actual warnings:', validation.warnings);
        results.errors.push('Invalid outreach test failed: ' + testCase.name);
      }
    });

    results.passed += passedCount;
    results.failed += (testCount - passedCount);
    return testCount;
  },

  /**
   * Test account validation
   * @param {Object} results - Test results object
   * @returns {number} Number of tests run
   */
  testAccountValidation: function(results) {
    var testCount = 0;
    var passedCount = 0;

    console.log('\n--- Testing Account Validation ---');

    // Test valid account
    testCount++;
    try {
      var validAccount = this.mockData.generateAccount();
      var validation = BusinessValidation.validateNewAccount(validAccount);
      if (validation.success) {
        console.log('âœ" Valid account validation passed');
        passedCount++;
      } else {
        console.log('âœ— Valid account validation failed:', validation.errors);
        results.errors.push('Valid account validation failed: ' + validation.errors.join(', '));
      }
    } catch (e) {
      console.log('âœ— Valid account validation threw error:', e.message);
      results.errors.push('Valid account validation error: ' + e.message);
    }

    // Test invalid accounts
    var invalidCases = this.edgeCases.invalidAccounts();
    invalidCases.forEach(function(testCase) {
      testCount++;
      var validation = BusinessValidation.validateNewAccount(testCase.data);
      
      // Check if expected errors are present
      var hasExpectedErrors = true;
      if (testCase.expectedErrors) {
        testCase.expectedErrors.forEach(function(expectedError) {
          if (!validation.errors.includes(expectedError)) {
            hasExpectedErrors = false;
          }
        });
      }
      
      // Check if expected warnings are present
      var hasExpectedWarnings = true;
      if (testCase.expectedWarnings) {
        testCase.expectedWarnings.forEach(function(expectedWarning) {
          if (!validation.warnings.includes(expectedWarning)) {
            hasExpectedWarnings = false;
          }
        });
      }

      if (!validation.success && hasExpectedErrors && hasExpectedWarnings) {
        console.log('âœ“ Invalid account test passed:', testCase.name);
        passedCount++;
      } else {
        console.log('âœ— Invalid account test failed:', testCase.name);
        console.log('  Expected errors:', testCase.expectedErrors);
        console.log('  Actual errors:', validation.errors);
        console.log('  Expected warnings:', testCase.expectedWarnings);
        console.log('  Actual warnings:', validation.warnings);
        results.errors.push('Invalid account test failed: ' + testCase.name);
      }
    });

    results.passed += passedCount;
    results.failed += (testCount - passedCount);
    return testCount;
  },

  /**
   * Test date validation utilities
   */
  testDateValidation: function() {
    console.log('\n--- Testing Date Validation ---');
    
    var testCases = [
      {
        name: 'Valid ISO date',
        input: '2024-01-15T10:30:00Z',
        options: { preferredFormat: 'ISO' },
        expected: true
      },
      {
        name: 'Valid US date',
        input: '01/15/2024',
        options: { preferredFormat: 'US' },
        expected: true
      },
      {
        name: 'Valid EU date',
        input: '15/01/2024',
        options: { preferredFormat: 'EU' },
        expected: true
      },
      {
        name: 'Invalid date string',
        input: 'not-a-date',
        options: {},
        expected: false
      },
      {
        name: 'Future date (allowed)',
        input: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        options: { allowFuture: true },
        expected: true
      },
      {
        name: 'Future date (not allowed)',
        input: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        options: { allowFuture: false },
        expected: false
      }
    ];

    var passed = 0;
    var total = testCases.length;

    testCases.forEach(function(testCase) {
      var result = DateValidationUtils.parseDate(testCase.input, testCase.options, testCase.name);
      var success = (result !== null) === testCase.expected;
      
      if (success) {
        console.log('âœ“', testCase.name);
        passed++;
      } else {
        console.log('âœ—', testCase.name, '- Expected:', testCase.expected, '- Got:', result !== null);
      }
    });

    console.log('Date validation tests:', passed + '/' + total, 'passed');
    return { passed: passed, total: total };
  }
};

/**
 * Automated fix application utilities
 */
var FixApplier = {
  /**
   * Applies null checks to critical functions
   * @param {string} functionName - Name of function to enhance
   * @param {string} functionCode - Original function code
   * @return {string} Enhanced function code with null checks
   */
  applyNullChecks: function(functionName, functionCode) {
    var enhancedCode = functionCode;
    
    // Add null check for SpreadsheetApp
    var nullCheck = `
  // Enhanced null check for SpreadsheetApp
  if (typeof SpreadsheetApp === 'undefined') {
    console.error('SpreadsheetApp service not available in ' + arguments.callee.name);
    return null;
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    console.error('Active spreadsheet not available in ' + arguments.callee.name);
    return null;
  }
`;
    
    // Insert after function declaration
    var functionDeclarationRegex = /function\s+\w+[\s\S]*?\{/;
    enhancedCode = enhancedCode.replace(functionDeclarationRegex, function(match) {
      return match + '\n' + nullCheck;
    });
    
    return enhancedCode;
  },

  /**
   * Applies error logging with stack traces to functions
   * @param {string} functionName - Name of function to enhance
   * @param {string} functionCode - Original function code
   * @return {string} Enhanced function code with error logging
   */
  applyErrorLogging: function(functionName, functionCode) {
    var enhancedCode = functionCode;
    
    // Wrap function body with try-catch
    var functionBodyRegex = /function\s+\w+[\s\S]*?\{([\s\S]*)\}$/;
    var match = enhancedCode.match(functionBodyRegex);
    
    if (match) {
      var functionBody = match[1];
      var enhancedBody = `
  try {
${functionBody}
  } catch (e) {
    var errorInfo = {
      message: e.message,
      stack: e.stack,
      functionName: '${functionName}',
      timestamp: new Date().toISOString()
    };
    
    console.error('=== ERROR IN ${functionName} ===');
    console.error('Message:', errorInfo.message);
    console.error('Stack:', errorInfo.stack);
    console.error('Timestamp:', errorInfo.timestamp);
    
    // Log to system log if available
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      if (ss) {
        var opsLogSheet = ss.getSheetByName(CONFIG.SHEET_SYSTEM_LOG || 'System_OpsLog');
        if (opsLogSheet) {
          opsLogSheet.appendRow([
            new Date(),
            '${functionName}',
            'ERROR',
            errorInfo.message,
            errorInfo.stack
          ]);
        }
      }
    } catch (logError) {
      console.warn('Could not log error to system log:', logError.message);
    }
    
    throw e; // Re-throw the error
  }
`;
      
      enhancedCode = enhancedCode.replace(functionBodyRegex, function(match, body) {
        return match.replace(body, enhancedBody);
      });
    }
    
    return enhancedCode;
  },

  /**
   * Replaces ad-hoc date handling with new validation utilities
   * @param {string} functionCode - Original function code
   * @return {string} Enhanced function code with standardized date handling
   */
  standardizeDateHandling: function(functionCode) {
    var enhancedCode = functionCode;
    
    // Replace common date parsing patterns
    var datePatterns = [
      // Replace new Date() with DateValidationUtils.parseDate
      {
        pattern: /new Date\(([^)]+)\)/g,
        replacement: 'DateValidationUtils.parseDate($1, {}, "function parameter")'
      },
      // Replace Utilities.formatDate with SharedUtils.formatDate
      {
        pattern: /Utilities\.formatDate\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g,
        replacement: 'SharedUtils.formatDate($1, {timezone: $2, dateFormat: $3}, "date formatting")'
      },
      // Replace date validation patterns
      {
        pattern: /if\s*\(\s*isNaN\([^)]+\.getTime\(\)\s*\)/g,
        replacement: '// Date validation now handled by DateValidationUtils'
      }
    ];
    
    datePatterns.forEach(function(pattern) {
      enhancedCode = enhancedCode.replace(pattern.pattern, pattern.replacement);
    });
    
    return enhancedCode;
  },

  /**
   * Integrates business logic validation into core workflows
   * @param {string} workflowName - Name of workflow to enhance
   * @param {string} workflowCode - Original workflow code
   * @return {string} Enhanced workflow code with business validation
   */
  integrateBusinessValidation: function(workflowName, workflowCode) {
    var enhancedCode = workflowCode;
    
    // Add business validation at key points
    var validationPoints = {
      'prospect_creation': `
  // Validate prospect data
  var prospectValidation = BusinessValidation.validateProspect(prospectData, { strictMode: true });
  if (!prospectValidation.success) {
    console.error('Prospect validation failed:', prospectValidation.errors);
    return { success: false, errors: prospectValidation.errors };
  }
  prospectData = prospectValidation.validatedData;
`,
      'outreach_submission': `
  // Validate outreach data
  var outreachValidation = BusinessValidation.validateOutreach(outreachData, { strictMode: true });
  if (!outreachValidation.success) {
    console.error('Outreach validation failed:', outreachValidation.errors);
    return { success: false, errors: outreachValidation.errors };
  }
  outreachData = outreachValidation.validatedData;
`,
      'account_creation': `
  // Validate account data
  var accountValidation = BusinessValidation.validateNewAccount(accountData, { strictMode: true });
  if (!accountValidation.success) {
    console.error('Account validation failed:', accountValidation.errors);
    return { success: false, errors: accountValidation.errors };
  }
  accountData = accountValidation.validatedData;
`
    };
    
    if (validationPoints[workflowName]) {
      // Insert validation at the beginning of the workflow
      var functionDeclarationRegex = /function\s+\w+[\s\S]*?\{/;
      enhancedCode = enhancedCode.replace(functionDeclarationRegex, function(match) {
        return match + '\n' + validationPoints[workflowName];
      });
    }
    
    return enhancedCode;
  }
};

/**
 * Comprehensive test suite runner
 */
function runComprehensiveTests() {
  console.log('=== K&L Recycling CRM Comprehensive Test Suite ===');
  console.log('Starting at:', new Date().toISOString());
  
  var testResults = {
    validationTests: null,
    dateValidationTests: null,
    integrationTests: null,
    totalPassed: 0,
    totalFailed: 0,
    errors: []
  };
  
  try {
    // Run validation tests
    console.log('\n1. Running validation tests...');
    testResults.validationTests = TestUtils.runValidationTests();
    testResults.totalPassed += testResults.validationTests.passed;
    testResults.totalFailed += testResults.validationTests.failed;
    
    // Run date validation tests
    console.log('\n2. Running date validation tests...');
    testResults.dateValidationTests = TestUtils.testDateValidation();
    testResults.totalPassed += testResults.dateValidationTests.passed;
    testResults.totalFailed += (testResults.dateValidationTests.total - testResults.dateValidationTests.passed);
    
    // Run integration tests (if any existing functions are available)
    console.log('\n3. Running integration tests...');
    testResults.integrationTests = runIntegrationTests();
    testResults.totalPassed += testResults.integrationTests.passed;
    testResults.totalFailed += testResults.integrationTests.failed;
    
  } catch (e) {
    console.error('Test suite failed with error:', e.message);
    testResults.errors.push('Test suite error: ' + e.message);
  }
  
  // Generate test report
  console.log('\n=== Test Suite Results ===');
  console.log('Total passed:', testResults.totalPassed);
  console.log('Total failed:', testResults.totalFailed);
  console.log('Success rate:', Math.round((testResults.totalPassed / (testResults.totalPassed + testResults.totalFailed)) * 100) + '%');
  
  if (testResults.errors.length > 0) {
    console.log('\nErrors encountered:');
    testResults.errors.forEach(function(error) {
      console.log('  -', error);
    });
  }
  
  return testResults;
}

/**
 * Integration tests for existing functions
 */
function runIntegrationTests() {
  var results = {
    passed: 0,
    failed: 0,
    errors: []
  };
  
  console.log('\n--- Integration Tests ---');
  
  // Test getSheetSafe function
  try {
    var testSheet = getSheetSafe('Prospects', { throwError: false });
    if (testSheet !== null) {
      console.log('âœ“ getSheetSafe integration test passed');
      results.passed++;
    } else {
      console.log('âœ— getSheetSafe integration test failed - returned null');
      results.failed++;
      results.errors.push('getSheetSafe returned null for existing sheet');
    }
  } catch (e) {
    console.log('âœ— getSheetSafe integration test failed with error:', e.message);
    results.failed++;
    results.errors.push('getSheetSafe error: ' + e.message);
  }
  
  // Test formatDate function
  try {
    var testDate = new Date();
    var formattedDate = SharedUtils.formatDate(testDate, {}, 'integration test');
    if (formattedDate && formattedDate.length > 0) {
      console.log('âœ“ formatDate integration test passed');
      results.passed++;
    } else {
      console.log('âœ— formatDate integration test failed - empty result');
      results.failed++;
      results.errors.push('formatDate returned empty string');
    }
  } catch (e) {
    console.log('âœ— formatDate integration test failed with error:', e.message);
    results.failed++;
    results.errors.push('formatDate error: ' + e.message);
  }
  
  // Test date range validation
  try {
    var startDate = new Date();
    var endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days later
    var rangeResult = SharedUtils.validateAndFormatDateRange(startDate, endDate, {});
    
    if (rangeResult.success && rangeResult.diffDays === 7) {
      console.log('âœ“ Date range validation integration test passed');
      results.passed++;
    } else {
      console.log('âœ— Date range validation integration test failed');
      console.log('  Result:', rangeResult);
      results.failed++;
      results.errors.push('Date range validation failed');
    }
  } catch (e) {
    console.log('âœ— Date range validation integration test failed with error:', e.message);
    results.failed++;
    results.errors.push('Date range validation error: ' + e.message);
  }
  
  return results;
}

/**
 * Generate comprehensive test report
 */
function generateTestReport() {
  var testResults = runComprehensiveTests();
  
  var report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPassed: testResults.totalPassed,
      totalFailed: testResults.totalFailed,
      successRate: Math.round((testResults.totalPassed / (testResults.totalPassed + testResults.totalFailed)) * 100) + '%'
    },
    details: {
      validationTests: testResults.validationTests,
      dateValidationTests: testResults.dateValidationTests,
      integrationTests: testResults.integrationTests
    },
    errors: testResults.errors,
    recommendations: []
  };
  
  // Generate recommendations based on test results
  if (testResults.totalFailed > 0) {
    report.recommendations.push('Address ' + testResults.totalFailed + ' failing tests before deployment');
  }
  
  if (testResults.dateValidationTests && testResults.dateValidationTests.passed < testResults.dateValidationTests.total) {
    report.recommendations.push('Review date validation logic for edge cases');
  }
  
  if (testResults.integrationTests && testResults.integrationTests.failed > 0) {
    report.recommendations.push('Fix integration issues with existing functions');
  }
  
  console.log('\n=== Test Report ===');
  console.log(JSON.stringify(report, null, 2));
  
  return report;
}
