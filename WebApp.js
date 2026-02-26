/**
 * Web App and Sidebar Functions
 * K&L Recycling CRM Dashboard
 */

/**
 * doGet - Required for Web App deployment
 * Serves the dashboard HTML when accessed as a web app
 * @param {Object} e - Event parameter (not used but required)
 * @returns {HtmlOutput} The dashboard HTML
 */
function doGet(e) {
  try {
    // Get the dashboard HTML content
    var htmlOutput = HtmlService.createHtmlOutputFromFile('dashboard')
      .setTitle('K&L CRM Dashboard')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
    
    // Set dimensions for the web app
    htmlOutput.setWidth(450);
    htmlOutput.setHeight(800);
    
    return htmlOutput;
  } catch (error) {
    console.error('Error in doGet:', error);
    return HtmlService.createHtmlOutput(
      '<h1>Error Loading Dashboard</h1><p>' + error.message + '</p>'
    );
  }
}

/**
 * Shows the dashboard as a sidebar in Google Sheets
 * Called from the K&L CRM menu
 */
function showSidebar() {
  try {
    var html = HtmlService.createHtmlOutputFromFile('dashboard')
      .setTitle('K&L CRM Dashboard')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
    
    SpreadsheetApp.getUi().showSidebar(html);
    console.log('Sidebar shown successfully');
  } catch (error) {
    console.error('Error showing sidebar:', error);
    SpreadsheetApp.getUi().alert(
      'Error',
      'Failed to open dashboard sidebar: ' + error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Alternative function to show dashboard as a modal dialog
 * Useful for testing or when sidebar is not appropriate
 */
function showDashboardDialog() {
  try {
    var html = HtmlService.createHtmlOutputFromFile('dashboard')
      .setWidth(500)
      .setHeight(800)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'K&L CRM Dashboard');
  } catch (error) {
    console.error('Error showing dashboard dialog:', error);
    SpreadsheetApp.getUi().alert(
      'Error',
      'Failed to open dashboard: ' + error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Opens the dashboard in a new browser tab
 * Uses the web app URL
 */
function openDashboardInNewTab() {
  try {
    // Get the script's web app URL
    var scriptId = ScriptApp.getScriptId();
    var webAppUrl = 'https://script.google.com/macros/s/' + scriptId + '/exec';
    
    // Show a message with the URL
    var html = HtmlService.createHtmlOutput(
      '<p>Dashboard URL (copy and open in new tab):</p>' +
      '<input type="text" value="' + webAppUrl + '" style="width:100%;padding:8px;" onclick="this.select();" readonly>' +
      '<p style="margin-top:10px;font-size:12px;color:#666;">Note: Make sure you have deployed this script as a web app first.</p>'
    )
    .setWidth(400)
    .setHeight(150);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Dashboard Web App URL');
  } catch (error) {
    console.error('Error getting web app URL:', error);
    SpreadsheetApp.getUi().alert(
      'Error',
      'Failed to get web app URL: ' + error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Shows the CRM Suite as a modal dialog
 * This opens the full CRM Suite interface
 */
function showCRMSuite() {
  try {
    var html = HtmlService.createHtmlOutputFromFile('CRM_Suite')
      .setWidth(1200)
      .setHeight(800)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'K&L Recycling CRM Suite');
    console.log('CRM Suite shown successfully');
  } catch (error) {
    console.error('Error showing CRM Suite:', error);
    SpreadsheetApp.getUi().alert(
      'Error',
      'Failed to open CRM Suite: ' + error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Shows the CRM Suite as a sidebar
 * Alternative way to access the CRM Suite
 */
function showCRMSuiteSidebar() {
  try {
    var html = HtmlService.createHtmlOutputFromFile('CRM_Suite')
      .setTitle('K&L Recycling CRM Suite')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
    
    SpreadsheetApp.getUi().showSidebar(html);
    console.log('CRM Suite sidebar shown successfully');
  } catch (error) {
    console.error('Error showing CRM Suite sidebar:', error);
    SpreadsheetApp.getUi().alert(
      'Error',
      'Failed to open CRM Suite sidebar: ' + error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}
