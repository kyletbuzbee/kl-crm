/**
 * Prospect Data Normalizer
 * Cleans and standardizes Company Name, Address, City, and Zip Code fields
 */

/****************************************
 * CONFIG - Uses Config.js for header definitions
 ****************************************/
var PROSPECTS_SHEET_NAME = CONFIG.SHEETS.PROSPECTS;
var HEADER_ROW = 1;

// Dynamic column indices - looked up from sheet headers
var _colIndexCache = null;

function getColumnIndices(sheet) {
  if (_colIndexCache) return _colIndexCache;
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var expectedHeaders = CONFIG.HEADERS.PROSPECTS;
  
  _colIndexCache = {};
  for (var i = 0; i < expectedHeaders.length; i++) {
    var headerName = expectedHeaders[i];
    var colIndex = headers.indexOf(headerName);
    if (colIndex !== -1) {
      _colIndexCache[headerName] = colIndex + 1; // 1-based index
    }
  }
  return _colIndexCache;
}

function getColIndex(sheet, headerName) {
  var indices = getColumnIndices(sheet);
  return indices[headerName] || -1;
}

/****************************************
 * MAIN ENTRY POINT
 ****************************************/

function normalizeProspectsData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(PROSPECTS_SHEET_NAME);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Prospects sheet not found!');
    return;
  }
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= HEADER_ROW) {
    SpreadsheetApp.getUi().alert('No data rows to process.');
    return;
  }
  
  // Get dynamic column indices from Config.js headers
  var colAddress = getColIndex(sheet, 'Address');
  var colCity = getColIndex(sheet, 'City');
  var colZip = getColIndex(sheet, 'Zip Code');
  var colCompany = getColIndex(sheet, 'Company Name');
  
  // Validate required columns exist
  if (colAddress === -1 || colCity === -1 || colZip === -1 || colCompany === -1) {
    SpreadsheetApp.getUi().alert(
      'Column Error',
      'Could not find required columns. Expected headers: Address, City, Zip Code, Company Name',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }
  
  // Get all data (skip header)
  var dataRange = sheet.getRange(HEADER_ROW + 1, 1, lastRow - HEADER_ROW, sheet.getLastColumn());
  var data = dataRange.getValues();
  
  var fixedCount = 0;
  var corruptCount = 0;
  
  // Process each row
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var wasFixed = false;
    
    // Skip if it looks like a duplicate header row embedded in data
    if (row[colAddress - 1] === 'Address' && row[colCity - 1] === 'City') {
      corruptCount++;
      continue;
    }
    
    // Extract address, city, zip from current values
    var address = String(row[colAddress - 1] || '').trim();
    var city = String(row[colCity - 1] || '').trim();
    var zip = String(row[colZip - 1] || '').trim();
    var companyName = String(row[colCompany - 1] || '').trim();
    
    // DETECT AND FIX CORRUPT ROWS
    // Pattern 1: Full address got jammed into City column
    if (city.match(/\d+.*,.*TX\s*\d{5}/) && (!address || address.length < 10)) {
      var parsed = parseFullAddress(city);
      address = parsed.address;
      city = parsed.city;
      zip = parsed.zip;
      wasFixed = true;
      corruptCount++;
    }
    
    // Pattern 2: Company name is in Address column
    if (address && !address.match(/\d/) && companyName === 'Company Name') {
      companyName = address;
      address = '';
      wasFixed = true;
      corruptCount++;
    }
    
    // Pattern 3: Zip contains lat/long like "31.69850349"
    if (zip.match(/^\d{2,3}\.\d+$/)) {
      // Try to extract zip from city or address
      var zipFromCity = extractZipFromText(city);
      if (zipFromCity) {
        zip = zipFromCity;
        city = city.replace(/\s*,?\s*TX\s*\d{5}.*$/, '').trim();
      } else {
        zip = extractZipFromText(address) || '';
      }
      wasFixed = true;
    }
    
    // NORMALIZE DATA
    address = normalizeAddress(address);
    city = normalizeCity(city);
    zip = normalizeZip(zip);
    companyName = normalizeCompanyName(companyName);
    
    // Write back if changed
    if (wasFixed || 
        row[colAddress - 1] !== address || 
        row[colCity - 1] !== city ||
        row[colZip - 1] !== zip ||
        row[colCompany - 1] !== companyName) {
      row[colAddress - 1] = address;
      row[colCity - 1] = city;
      row[colZip - 1] = zip;
      row[colCompany - 1] = companyName;
      fixedCount++;
    }
  }
  
  // Write all changes back
  dataRange.setValues(data);
  
  // Clear cache for next run
  _colIndexCache = null;
  
  SpreadsheetApp.getUi().alert(
    'Normalization complete!\n\n' +
    'Rows normalized: ' + fixedCount + '\n' +
    'Corrupt rows fixed: ' + corruptCount
  );
}

/****************************************
 * NORMALIZATION FUNCTIONS
 ****************************************/

function normalizeCompanyName(name) {
  if (!name) return '';
  
  // Skip if it's the literal header text
  if (name === 'Company Name') return name;
  
  name = name.trim();
  
  // Convert to title case
  name = toTitleCase(name);
  
  // Standardize business entity suffixes
  name = name.replace(/\s+llc\.?$/i, ' LLC');
  name = name.replace(/\s+inc\.?$/i, ' Inc');
  name = name.replace(/,\s*inc\.?$/i, ', Inc');
  name = name.replace(/\s+ltd\.?$/i, ' Ltd');
  name = name.replace(/\s+co\.$/i, ' Co.');
  
  // Clean up multiple spaces
  name = name.replace(/\s{2,}/g, ' ');
  
  return name;
}

function normalizeAddress(addr) {
  if (!addr) return '';
  
  // Skip if it's the literal header text
  if (addr === 'Address' || addr === 'No Address') return addr;
  
  addr = addr.trim();
  
  // Convert to title case
  addr = toTitleCase(addr);
  
  // Standardize common street suffixes
  addr = addr.replace(/\bSt\b\.?$/i, 'St');
  addr = addr.replace(/\bStreet\b/i, 'St');
  addr = addr.replace(/\bAve\b\.?$/i, 'Ave');
  addr = addr.replace(/\bAvenue\b/i, 'Ave');
  addr = addr.replace(/\bRd\b\.?$/i, 'Rd');
  addr = addr.replace(/\bRoad\b/i, 'Rd');
  addr = addr.replace(/\bBlvd\b\.?$/i, 'Blvd');
  addr = addr.replace(/\bBoulevard\b/i, 'Blvd');
  addr = addr.replace(/\bDr\b\.?$/i, 'Dr');
  addr = addr.replace(/\bDrive\b/i, 'Dr');
  addr = addr.replace(/\bLn\b\.?$/i, 'Ln');
  addr = addr.replace(/\bLane\b/i, 'Ln');
  addr = addr.replace(/\bPkwy\b\.?$/i, 'Pkwy');
  addr = addr.replace(/\bParkway\b/i, 'Pkwy');
  addr = addr.replace(/\bCir\b\.?$/i, 'Cir');
  addr = addr.replace(/\bCircle\b/i, 'Cir');
  
  // Standardize compass directions
  addr = addr.replace(/\bNorth\b/gi, 'N');
  addr = addr.replace(/\bSouth\b/gi, 'S');
  addr = addr.replace(/\bEast\b/gi, 'E');
  addr = addr.replace(/\bWest\b/gi, 'W');
  addr = addr.replace(/\bNortheast\b/gi, 'NE');
  addr = addr.replace(/\bNorthwest\b/gi, 'NW');
  addr = addr.replace(/\bSoutheast\b/gi, 'SE');
  addr = addr.replace(/\bSouthwest\b/gi, 'SW');
  
  // Remove trailing city/state/zip if accidentally included
  addr = addr.replace(/,\s*[A-Z][a-z]+,\s*TX\s*\d{5}.*$/, '');
  
  // Clean up spaces
  addr = addr.replace(/\s{2,}/g, ' ').trim();
  
  return addr;
}

function normalizeCity(city) {
  if (!city) return '';
  
  // Skip if it's the literal header text
  if (city === 'City') return city;
  
  city = city.trim();
  
  // Remove any zip codes that got stuck to city
  city = city.replace(/,?\s*TX\s*\d{5}.*$/, '');
  
  // Convert to title case
  city = toTitleCase(city);
  
  // Clean up spaces
  city = city.replace(/\s{2,}/g, ' ').trim();
  
  return city;
}

function normalizeZip(zip) {
  if (!zip) return '';
  
  // Skip if it's the literal header text
  if (zip === 'Zip Code') return zip;
  
  zip = String(zip).trim();
  
  // Extract 5-digit zip
  var match = zip.match(/(\d{5})/);
  if (match) {
    return match[1];
  }
  
  return zip;
}

/****************************************
 * HELPER FUNCTIONS
 ****************************************/

function toTitleCase(str) {
  if (!str) return '';
  
  // Preserve all-caps acronyms like LLC, TX, FM, etc.
  var exceptions = ['LLC', 'Inc', 'Co', 'TX', 'FM', 'US', 'ETX', 'CNC', 'I', 'II', 'III'];
  
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(function(word) {
      // Check if word (without punctuation) is an exception
      var cleanWord = word.replace(/[.,;:!?]/, '');
      if (exceptions.indexOf(cleanWord.toUpperCase()) !== -1) {
        return cleanWord.toUpperCase() + (word.length > cleanWord.length ? word.slice(cleanWord.length) : '');
      }
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function parseFullAddress(fullAddr) {
  // Parse "1234 Main St, Tyler, TX 75701" format
  var match = fullAddr.match(/^(.+),\s*([A-Za-z\s]+),\s*TX\s*(\d{5})/);
  if (match) {
    return {
      address: match[1].trim(),
      city: match[2].trim(),
      zip: match[3]
    };
  }
  
  return {
    address: fullAddr,
    city: '',
    zip: ''
  };
}

function extractZipFromText(text) {
  if (!text) return null;
  var match = String(text).match(/(\d{5})/);
  return match ? match[1] : null;
}

/****************************************
 * MENU INTEGRATION
 * Note: Menu is now handled by MenuFunctions.js onOpen()
 * This file's functions are available via the main K&L CRM menu
 ***************************************/
