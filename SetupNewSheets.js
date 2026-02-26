/**
 * Setup New Sheets
 * Run this function in Google Apps Script to create Sales and Active Containers sheets
 * with proper headers for the new CRM integration
 */

function setupNewSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var output = [];
  
  // Create Sales sheet if it doesn't exist
  var salesSheet = ss.getSheetByName('Sales');
  if (!salesSheet) {
    salesSheet = ss.insertSheet('Sales');
    salesSheet.appendRow([
      'Sales ID', 'Date', 'Company', 'Company ID', 'Material', 'Weight', 
      'Price', 'Date Range', 'Supplier Name', 'Material Type', 
      'Weight Adjusted', 'Payment Amount'
    ]);
    output.push('Created Sales sheet with headers');
  } else {
    output.push('Sales sheet already exists');
  }
  
  // Create Active Containers sheet if it doesn't exist
  var containersSheet = ss.getSheetByName('Active Containers');
  if (!containersSheet) {
    containersSheet = ss.insertSheet('Active Containers');
    containersSheet.appendRow([
      'Company ID', 'Company Name', 'Location Name', 'Location Address', 
      'City', 'Zip Code', 'Current Deployed Asset(s)', 'Container Size'
    ]);
    output.push('Created Active Containers sheet with headers');
  } else {
    output.push('Active Containers sheet already exists');
  }
  
  return output.join('\n');
}

/**
 * Import Sales from CSV file in Drive
 * Modify the fileId to point to your Sales.csv file
 */
function importSalesFromCSV() {
  var fileId = 'YOUR_SALES_CSV_FILE_ID'; // Replace with actual file ID
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var salesSheet = ss.getSheetByName('Sales');
  
  if (!salesSheet) {
    salesSheet = ss.insertSheet('Sales');
    salesSheet.appendRow([
      'Sales ID', 'Date', 'Company', 'Company ID', 'Material', 'Weight', 
      'Price', 'Date Range', 'Supplier Name', 'Material Type', 
      'Weight Adjusted', 'Payment Amount'
    ]);
  }
  
  try {
    var file = DriveApp.getFileById(fileId);
    var csvData = file.getBlob().getDataAsString();
    var rows = CSV.parse(csvData);
    
    // Skip header row if it exists
    var startRow = 2;
    if (rows.length > 0 && rows[0][0] === 'Sales ID') {
      startRow = 2;
    }
    
    for (var i = startRow; i < rows.length; i++) {
      salesSheet.appendRow(rows[i]);
    }
    
    return 'Imported ' + (rows.length - startRow + 1) + ' sales records';
  } catch (e) {
    return 'Error: ' + e.message + '. Make sure to replace fileId with your CSV file ID.';
  }
}

/**
 * Import Active Containers from CSV
 */
function importContainersFromCSV() {
  var fileId = 'YOUR_ACTIVE_CSV_FILE_ID'; // Replace with actual file ID
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var containersSheet = ss.getSheetByName('Active Containers');
  
  if (!containersSheet) {
    containersSheet = ss.insertSheet('Active Containers');
    containersSheet.appendRow([
      'Company ID', 'Company Name', 'Location Name', 'Location Address', 
      'City', 'Zip Code', 'Current Deployed Asset(s)', 'Container Size'
    ]);
  }
  
  try {
    var file = DriveApp.getFileById(fileId);
    var csvData = file.getBlob().getDataAsString();
    var rows = CSV.parse(csvData);
    
    var startRow = 2;
    if (rows.length > 0 && rows[0][0] === 'Company ID') {
      startRow = 2;
    }
    
    for (var i = startRow; i < rows.length; i++) {
      containersSheet.appendRow(rows[i]);
    }
    
    return 'Imported ' + (rows.length - startRow + 1) + ' container records';
  } catch (e) {
    return 'Error: ' + e.message + '. Make sure to replace fileId with your CSV file ID.';
  }
}
