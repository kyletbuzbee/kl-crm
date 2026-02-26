/**
 * Simple GAS Test Script
 * Tests the TestRunner functionality in Google Apps Script environment
 */

// Test that TestRunner is available
function testTestRunnerAvailability() {
  console.log('=== Testing TestRunner Availability ===');
  try {
    if (typeof TestRunner === 'undefined') {
      console.error('âŒ TestRunner is not defined');
      return false;
    }
    
    if (typeof TestRunner.assert === 'undefined') {
      console.error('âŒ TestRunner.assert is not defined');
      return false;
    }
    
    console.log('âœ… TestRunner is available');
    console.log('âœ… TestRunner.assert is available');
    
    // Test basic assertions
    try {
      TestRunner.assert.equals(1 + 1, 2, '1+1 should equal 2');
      console.log('âœ… assertEquals works');
    } catch (e) {
      console.error('âŒ assertEquals failed:', e.message);
      return false;
    }
    
    try {
      TestRunner.assert.isTrue(true, 'true should be true');
      console.log('âœ… isTrue works');
    } catch (e) {
      console.error('âŒ isTrue failed:', e.message);
      return false;
    }
    
    try {
      TestRunner.assert.notNull('value', 'value should not be null');
      console.log('âœ… notNull works');
    } catch (e) {
      console.error('âŒ notNull failed:', e.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('âŒ TestRunner error:', error);
    return false;
  }
}

// Test that other test suites are available
function testTestSuitesAvailability() {
  console.log('=== Testing Test Suites Availability ===');
  var available = true;
  
  if (typeof UnitTests_Core === 'undefined') {
    console.error('âŒ UnitTests_Core not defined');
    available = false;
  } else {
    console.log('âœ… UnitTests_Core is available');
  }
  
  if (typeof IntegrationTests_Prospects === 'undefined') {
    console.error('âŒ IntegrationTests_Prospects not defined');
    available = false;
  } else {
    console.log('âœ… IntegrationTests_Prospects is available');
  }
  
  if (typeof WorkflowTests === 'undefined') {
    console.error('âŒ WorkflowTests not defined');
    available = false;
  } else {
    console.log('âœ… WorkflowTests is available');
  }
  
  if (typeof ValidationTests === 'undefined') {
    console.error('âŒ ValidationTests not defined');
    available = false;
  } else {
    console.log('âœ… ValidationTests is available');
  }
  
  if (typeof OutreachProspectsLogicTests === 'undefined') {
    console.error('âŒ OutreachProspectsLogicTests not defined');
    available = false;
  } else {
    console.log('âœ… OutreachProspectsLogicTests is available');
  }
  
  return available;
}

// Run a single test from each suite to verify functionality
function runQuickTest() {
  console.log('=== Running Quick Test Suite ===');
  var results = { passed: 0, failed: 0 };
  
  // Run a simple test from each suite
  try {
    if (typeof UnitTests_Core !== 'undefined') {
      UnitTests_Core.testConfigSchemaIntegrity();
      console.log('âœ… UnitTests_Core.testConfigSchemaIntegrity passed');
      results.passed++;
    }
  } catch (e) {
    console.error('âŒ UnitTests_Core.testConfigSchemaIntegrity failed:', e.message);
    results.failed++;
  }
  
  try {
    if (typeof IntegrationTests_Prospects !== 'undefined') {
      IntegrationTests_Prospects.testCSVParseWithHeaders();
      console.log('âœ… IntegrationTests_Prospects.testCSVParseWithHeaders passed');
      results.passed++;
    }
  } catch (e) {
    console.error('âŒ IntegrationTests_Prospects.testCSVParseWithHeaders failed:', e.message);
    results.failed++;
  }
  
  try {
    if (typeof WorkflowTests !== 'undefined') {
      WorkflowTests.testProspectToCustomerWorkflow();
      console.log('âœ… WorkflowTests.testProspectToCustomerWorkflow passed');
      results.passed++;
    }
  } catch (e) {
    console.error('âŒ WorkflowTests.testProspectToCustomerWorkflow failed:', e.message);
    results.failed++;
  }
  
  console.log('\n=== Quick Test Results ===');
  console.log('Passed:', results.passed);
  console.log('Failed:', results.failed);
  
  return results;
}

// Main entry point for quick testing
function runQuickTests() {
  var allPassed = true;
  
  console.log('====================================');
  console.log(' K&L CRM Quick Test Suite');
  console.log('====================================');
  console.log('');
  
  // Test TestRunner availability
  if (!testTestRunnerAvailability()) {
    allPassed = false;
  }
  
  console.log('');
  
  // Test test suites availability
  if (!testTestSuitesAvailability()) {
    allPassed = false;
  }
  
  console.log('');
  
  // Run quick tests
  var quickResults = runQuickTest();
  
  console.log('');
  console.log('====================================');
  console.log(' Total Quick Tests: ' + (quickResults.passed + quickResults.failed));
  console.log(' Passed: ' + quickResults.passed);
  console.log(' Failed: ' + quickResults.failed);
  console.log('====================================');
  
  if (allPassed && quickResults.failed === 0) {
    console.log('âœ… All quick tests passed!');
    if (typeof SpreadsheetApp !== 'undefined') {
      SpreadsheetApp.getActiveSpreadsheet().toast('All tests passed!', 'K&L CRM Tests', 5);
    }
  } else {
    console.log('âŒ Some tests failed');
    if (typeof SpreadsheetApp !== 'undefined') {
      SpreadsheetApp.getActiveSpreadsheet().toast(quickResults.failed + ' tests failed', 'K&L CRM Tests', 5);
    }
  }
  
  return quickResults;
}
