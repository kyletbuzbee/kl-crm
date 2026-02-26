
const fs = require('fs');
const path = require('path');

// Read and parse combined_headers.txt
function parseCombinedHeaders() {
  try {
    const content = fs.readFileSync('combined_headers.txt', 'utf8');
    const headers = {};
    
    // Split by sections like "=== filename ==="
    const sectionRegex = /===.*?===/g;
    const sections = content.split(sectionRegex).filter(section => section.trim());
    
    // Get all the section headers
    const sectionHeaders = [];
    let match;
    const headerRegex = /===(.*?)===/g;
    while ((match = headerRegex.exec(content)) !== null) {
      sectionHeaders.push(match[1].trim());
    }
    
    // Parse each section
    sectionHeaders.forEach((csvFile, index) => {
      if (sections[index]) {
        const lines = sections[index].trim().split('\n');
        if (lines.length > 0) {
          const csvHeaders = lines[0]?.split(',').map(h => h.trim()).filter(h => h);
          if (csvHeaders && csvHeaders.length > 0) {
            headers[csvFile.toLowerCase()] = csvHeaders;
          }
        }
      }
    });
    
    return headers;
  } catch (error) {
    console.error('Error reading combined_headers.txt:', error);
    return {};
  }
}

// Read and parse Config.js
function parseConfig() {
  try {
    const content = fs.readFileSync('Config.js', 'utf8');
    
    // Extract HEADERS object from Config.js
    const headersMatch = content.match(/HEADERS:.*?\{([\s\S]*?)\}/);
    if (!headersMatch) {
      console.error('No HEADERS object found in Config.js');
      return {};
    }
    
    const headersContent = headersMatch[1];
    const sheetHeaders = {};
    
    // Match each sheet's headers
    const sheetMatches = headersContent.match(/[A-Z_]+:\s*\[([\s\S]*?)\]/g);
    
    if (sheetMatches) {
      sheetMatches.forEach(sheetMatch => {
        const [sheetName, headersStr] = sheetMatch.split(/:\s*\[/);
        const cleanSheetName = sheetName.trim().toUpperCase();
        const csvFileName = cleanSheetName.toLowerCase().replace('_', '') + '.csv';
        
        // Extract headers from array
        const headersArray = headersStr
          .replace(/\s*]/, '') // Remove closing bracket
          .split(/['"]/) // Split on quotes
          .filter((h, i) => i % 2 === 1) // Get quoted strings
          .map(h => h.trim())
          .filter(h => h);
        
        sheetHeaders[csvFileName] = headersArray;
      });
    }
    
    return sheetHeaders;
  } catch (error) {
    console.error('Error reading Config.js:', error);
    return {};
  }
}

// Compare headers
function compareHeaders(csvHeaders, configHeaders) {
  console.log('=== Header Consistency Analysis ===\n');
  
  // Check CSV files with corresponding config entries
  Object.keys(csvHeaders).forEach(csvFile => {
    const csvFileHeaders = csvHeaders[csvFile];
    // Find matching config entry by similar name
    const matchingConfig = Object.keys(configHeaders).find(configFile => 
      csvFile.includes(configFile.replace('.csv', '')) || 
      configFile.includes(csvFile.replace('.csv', ''))
    );
    
    if (matchingConfig) {
      const configFileHeaders = configHeaders[matchingConfig];
      console.log(`Checking ${csvFile} (matched to ${matchingConfig}):`);
      
      // Find missing headers
      const missingInConfig = csvFileHeaders.filter(h => !configFileHeaders.includes(h));
      const missingInCSV = configFileHeaders.filter(h => !csvFileHeaders.includes(h));
      
      if (missingInConfig.length > 0) {
        console.log(`  ❌ Missing in Config.js: ${JSON.stringify(missingInConfig)}`);
      }
      
      if (missingInCSV.length > 0) {
        console.log(`  ❌ Missing in CSV: ${JSON.stringify(missingInCSV)}`);
      }
      
      if (missingInConfig.length === 0 && missingInCSV.length === 0) {
        console.log(`  ✅ All headers match`);
      }
      
      console.log();
    } else {
      console.log(`❓ No config entry for ${csvFile}`);
      console.log(`   CSV headers: ${JSON.stringify(csvFileHeaders)}`);
      console.log();
    }
  });
  
  // Check config entries without corresponding CSV files
  Object.keys(configHeaders).forEach(configFile => {
    const hasMatchingCSV = Object.keys(csvHeaders).some(csvFile => 
      csvFile.includes(configFile.replace('.csv', '')) || 
      configFile.includes(csvFile.replace('.csv', ''))
    );
    
    if (!hasMatchingCSV) {
      console.log(`❓ No CSV file for config entry: ${configFile}`);
      console.log(`   Headers defined: ${JSON.stringify(configHeaders[configFile])}`);
      console.log();
    }
  });
}

// Main execution
const csvHeaders = parseCombinedHeaders();
const configHeaders = parseConfig();

console.log('=== Parsed CSV Headers ===');
console.log(JSON.stringify(csvHeaders, null, 2));
console.log('\n=== Parsed Config Headers ===');
console.log(JSON.stringify(configHeaders, null, 2));
console.log();

compareHeaders(csvHeaders, configHeaders);
