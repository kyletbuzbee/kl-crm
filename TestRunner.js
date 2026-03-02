/**
 * Simple Test Runner for Google Apps Script
 * Provides basic assertion methods for testing
 * Version: 1.1
 */

var TestRunner = {
  assert: {
    equals: function(actual, expected, message) {
      if (actual !== expected) {
        throw new Error(
          (message || 'Assertion failed') + 
          ': Expected "' + expected + '" but got "' + actual + '"'
        );
      }
    },
    
    isTrue: function(value, message) {
      if (value !== true) {
        throw new Error(
          (message || 'Assertion failed') + 
          ': Expected true but got "' + value + '"'
        );
      }
    },
    
    isFalse: function(value, message) {
      if (value !== false) {
        throw new Error(
          (message || 'Assertion failed') + 
          ': Expected false but got "' + value + '"'
        );
      }
    },
    
    notNull: function(value, message) {
      if (value === null || value === undefined) {
        throw new Error(
          (message || 'Assertion failed') + 
          ': Expected non-null value but got "' + value + '"'
        );
      }
    },
    
    throws: function(fn, message) {
      var threw = false;
      try {
        fn();
      } catch (e) {
        threw = true;
      }
      if (!threw) {
        throw new Error(
          (message || 'Assertion failed') + 
          ': Expected function to throw but it did not'
        );
      }
    }
  }
};

/**
 * Run all available test suites
 * Usage: Run runAllTests() from the Apps Script editor
 */
function runAllTests() {
  console.log('====================================');
  console.log(' K&L CRM Full Test Suite');
  console.log('====================================');
  console.log('');
  
  var results = {
    passed: 0,
    failed: 0,
    suites: []
  };
  
  // Debug: Log what's available
  console.log('Checking for test suites...');
  console.log('OutreachProspectsLogicTests defined:', typeof OutreachProspectsLogicTests !== 'undefined');
  console.log('UnitTests_Core defined:', typeof UnitTests_Core !== 'undefined');
  console.log('');
  
  // Define test suites to run - check at runtime
  var suites = [];
  
  if (typeof OutreachProspectsLogicTests !== 'undefined') {
    suites.push({ name: 'OutreachProspectsLogicTests', obj: OutreachProspectsLogicTests });
  }
  if (typeof UnitTests_Core !== 'undefined') {
    suites.push({ name: 'UnitTests_Core', obj: UnitTests_Core });
  }
  if (typeof IntegrationTests_Prospects !== 'undefined') {
    suites.push({ name: 'IntegrationTests_Prospects', obj: IntegrationTests_Prospects });
  }
  if (typeof WorkflowTests !== 'undefined') {
    suites.push({ name: 'WorkflowTests', obj: WorkflowTests });
  }
  if (typeof ValidationTests !== 'undefined') {
    suites.push({ name: 'ValidationTests', obj: ValidationTests });
  }
  
  if (suites.length === 0) {
    console.log('⚠️ No test suites found. Make sure test files are loaded.');
    console.log('Available globals:', Object.keys(this).filter(function(k) { return k.indexOf('Test') !== -1 || k.indexOf('test') !== -1; }).join(', '));
  }
  
  suites.forEach(function(suite) {
    if (!suite.obj) {
      console.log('⚠️ Suite not found: ' + suite.name);
      return;
    }
    
    console.log('--- Running: ' + suite.name + ' ---');
    var suiteResults = { name: suite.name, passed: 0, failed: 0, tests: [] };
    
    // Find all test methods (starting with 'test')
    for (var key in suite.obj) {
      if (typeof suite.obj[key] === 'function' && key.indexOf('test') === 0) {
        try {
          suite.obj[key]();
          suiteResults.passed++;
          results.passed++;
          suiteResults.tests.push({ name: key, status: 'passed' });
          console.log('  ✅ ' + key);
        } catch (e) {
          suiteResults.failed++;
          results.failed++;
          suiteResults.tests.push({ name: key, status: 'failed', error: e.message });
          console.log('  ❌ ' + key + ': ' + e.message);
        }
      }
    }
    
    results.suites.push(suiteResults);
    console.log('');
  });
  
  // Print summary
  console.log('====================================');
  console.log(' Test Summary');
  console.log('====================================');
  console.log('Total Passed: ' + results.passed);
  console.log('Total Failed: ' + results.failed);
  console.log('====================================');
  
  // Show toast if in spreadsheet context
  if (typeof SpreadsheetApp !== 'undefined') {
    var msg = results.failed === 0 
      ? '✅ All ' + results.passed + ' tests passed!' 
      : '❌ ' + results.failed + ' tests failed';
    SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'Test Results', 5);
  }
  
  return results;
}

/**
 * Run a single test function
 * Usage: runTest('OutreachProspectsLogicTests', 'testCompanyIdLinking')
 * 
 * @param {string} suiteName - Name of the test suite (e.g., 'OutreachProspectsLogicTests')
 * @param {string} testName - Name of the test function (e.g., 'testCompanyIdLinking')
 */
function runTest(suiteName, testName) {
  console.log('Running single test: ' + suiteName + '.' + testName);
  
  try {
    var suite = eval(suiteName);
    if (!suite) {
      throw new Error('Test suite not found: ' + suiteName);
    }
    
    var testFn = suite[testName];
    if (typeof testFn !== 'function') {
      throw new Error('Test function not found: ' + testName);
    }
    
    testFn();
    console.log('✅ Test passed: ' + testName);
    
    if (typeof SpreadsheetApp !== 'undefined') {
      SpreadsheetApp.getActiveSpreadsheet().toast('Test passed!', testName, 3);
    }
    
    return { success: true, test: testName };
  } catch (e) {
    console.error('❌ Test failed: ' + testName);
    console.error('Error: ' + e.message);
    
    if (typeof SpreadsheetApp !== 'undefined') {
      SpreadsheetApp.getActiveSpreadsheet().toast('Test failed: ' + e.message, testName, 5);
    }
    
    return { success: false, test: testName, error: e.message };
  }
}

/**
 * Quick smoke tests - runs a subset of critical tests
 * Usage: Run runQuickTests() from the Apps Script editor
 */
function runQuickTests() {
  console.log('====================================');
  console.log(' K&L CRM Quick Smoke Tests');
  console.log('====================================');
  console.log('');
  
  // Check what's available
  console.log('Checking for available test suites...');
  
  var results = { passed: 0, failed: 0, notFound: 0 };
  
  // List of critical tests to run - check availability at runtime
  var criticalTests = [];
  
  if (typeof OutreachProspectsLogicTests !== 'undefined') {
    criticalTests.push(
      { suite: 'OutreachProspectsLogicTests', test: 'testCompanyIdLinking' },
      { suite: 'OutreachProspectsLogicTests', test: 'testLastOutreachDateSync' },
      { suite: 'OutreachProspectsLogicTests', test: 'testContactStatusUpdate' }
    );
  } else {
    console.log('⚠️ OutreachProspectsLogicTests not available');
  }
  
  if (criticalTests.length === 0) {
    console.log('');
    console.log('❌ No test suites available to run.');
    console.log('Make sure test_outreach_prospects_logic.js is loaded.');
    return results;
  }
  
  console.log('Running ' + criticalTests.length + ' critical tests...');
  console.log('');
  
  criticalTests.forEach(function(item) {
    var result = runTest(item.suite, item.test);
    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }
  });
  
  console.log('');
  console.log('====================================');
  console.log('Quick Test Results: ' + results.passed + ' passed, ' + results.failed + ' failed');
  console.log('====================================');
  
  // Show toast
  if (typeof SpreadsheetApp !== 'undefined') {
    var msg = results.failed === 0 
      ? '✅ All ' + results.passed + ' tests passed!' 
      : '❌ ' + results.failed + ' tests failed';
    SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'Quick Test Results', 5);
  }
  
  return results;
}
