/**
 * Counts the number of tests in each test file
 * This helps verify our test suite is complete and well-structured
 */

function countTests() {
  var testFiles = [
    { name: 'test_unit.js', suite: 'UnitTests_Core' },
    { name: 'test_integration.js', suite: 'IntegrationTests_Prospects' },
    { name: 'test_workflow_aligned.js', suite: 'WorkflowTests' },
    { name: 'test_outreach_prospects_logic.js', suite: 'OutreachProspectsLogicTests' },
    { name: 'test_schema_aligned.js', suite: 'SchemaValidationTests' },
    { name: 'test_validation.js', suite: 'ValidationTests' },
    { name: 'test_data_operations.js', suite: 'DataOperationsTests' }
  ];
  
  var summary = [];
  var totalTests = 0;
  
  testFiles.forEach(function(file) {
    try {
      var suite = this[file.suite];
      if (!suite) {
        console.error('Test suite not found: ' + file.suite);
        return;
      }
      var count = Object.keys(suite).filter(function(key) {
        return typeof suite[key] === 'function';
      }).length;
      
      summary.push({
        file: file.name,
        suite: file.suite,
        tests: count
      });
      
      totalTests += count;
    } catch (e) {
      console.error('Error counting tests in ' + file.name + ': ' + e.message);
    }
  });
  
  // Print summary
  console.log('=== K&L CRM Test Suite Summary ===');
  console.log('');
  
  summary.forEach(function(item) {
    var fileName = item.file.padEnd(25);
    var testCount = item.tests.toString().padStart(3);
    var suiteName = item.suite;
    
    console.log(fileName + ' | ' + testCount + ' tests (' + suiteName + ')');
  });
  
  console.log('');
  console.log('Total Tests: ' + totalTests);
  console.log('');
  
  // Show progress bars
  summary.forEach(function(item) {
    var percentage = Math.round((item.tests / totalTests) * 100);
    var bar = 'â–ˆ'.repeat(Math.round(percentage / 2));
    var fileName = item.file.padEnd(25);
    var testCount = item.tests.toString().padStart(3);
    
    console.log(fileName + ' | ' + testCount + ' tests ' + 
                bar.padEnd(50 - bar.length) + ' ' + percentage + '%');
  });
  
  console.log('');
  console.log('âœ… Test suite verification complete');
  
  return {
    summary: summary,
    totalTests: totalTests
  };
}

function runVerification() {
  var startTime = Date.now();
  var result = countTests();
  var endTime = Date.now();
  
  console.log('');
  console.log('Execution time: ' + (endTime - startTime) + 'ms');
  
  return result;
}
