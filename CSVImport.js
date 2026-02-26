/**
 * CSV Import Functions (Enhanced & Audited)
 * Handles importing CSV data into Google Sheets with strict schema alignment.
 */

/**
 * Imports CSV data into a specified sheet, appending to the bottom
 * Uses Safe-Fetch pattern with dynamic, case-insensitive header mapping.
 * @param {string} csvText - The CSV text to import
 * @param {string} sheetName - Name of the target sheet
 * @param {boolean} normalizeHeaders - Whether to normalize headers (trim, lowercase, whitespace)
 * @return {Object} Result object with success status and import details
 */
function importCSVData(csvText, sheetName, normalizeHeaders) {
  try {
    // Default to true for backward compatibility
    if (normalizeHeaders === undefined) {
      normalizeHeaders = true;
    }
    
    if (!csvText || !sheetName) {
      throw new Error('CSV text and sheet name are required');
    }
    
    // 1. Sanitize Input (Remove BOM and standardize newlines)
    csvText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    console.log('CSV Import Parameters:', { 
      csvTextLength: csvText.length, 
      sheetName: sheetName,
      normalizeHeaders: normalizeHeaders 
    });

    // Enhanced null check for SpreadsheetApp
    var accessResult = SharedUtils.checkSpreadsheetAccess('importCSVData');
    if (!accessResult.success) {
      throw new Error(accessResult.error);
    }

    var ss = accessResult.spreadsheet;
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error('Sheet "' + sheetName + '" not found');
    }

    // Parse CSV with enhanced error handling
    var parseResult = parseCSVWithHeaders(csvText);
    if (!parseResult.success) {
      throw new Error('CSV parsing failed: ' + parseResult.error);
    }

    var csvHeaders = parseResult.headers;
    var csvDataRows = parseResult.dataRows;
    var parseWarnings = parseResult.warnings || [];

    if (csvDataRows.length === 0) {
      throw new Error('No data rows found in CSV');
    }

    // --- DYNAMIC HEADER MAPPING ---
    // If normalizeHeaders is true, we use normalizeHeaderSafe for matching
    // If false, we use exact matching (case-sensitive, no whitespace normalization)
    var sheetHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var sheetHeaderMap = {};

    // Helper function for header key generation based on normalization setting
    function getHeaderKey(header) {
      if (!header) return '';
      var key = header.toString();
      if (normalizeHeaders) {
        return key.toLowerCase().trim().replace(/\s+/g, ' ');
      }
      return key.trim(); // Just trim, no case conversion
    }

    sheetHeaders.forEach(function(header, index) {
      if (header) {
        sheetHeaderMap[getHeaderKey(header)] = index;
      }
    });

    var columnMapping = {};
    var mappingWarnings = [];

    csvHeaders.forEach(function(csvHeader, csvIndex) {
      var normalizedCsvHeader = getHeaderKey(csvHeader);
      
      // Try exact match (normalized)
      if (sheetHeaderMap.hasOwnProperty(normalizedCsvHeader)) {
        columnMapping[csvIndex] = sheetHeaderMap[normalizedCsvHeader];
      } else {
        // Fuzzy matching fallback
        var foundMatch = false;
        for (var sheetHeaderKey in sheetHeaderMap) {
          if (areSimilarHeaders(normalizedCsvHeader, sheetHeaderKey)) {
            columnMapping[csvIndex] = sheetHeaderMap[sheetHeaderKey];
            mappingWarnings.push('CSV header "' + csvHeader + '" mapped to sheet header (fuzzy match)');
            foundMatch = true;
            break;
          }
        }
        
        if (!foundMatch) {
          mappingWarnings.push('CSV header "' + csvHeader + '" not found in sheet headers. Data will be skipped.');
        }
      }
    });

    // Prepare data for appending
    var rowsToAppend = [];
    var skippedCount = 0;
    var dataWarnings = [];

    csvDataRows.forEach(function(csvRow, rowIndex) {
      var sheetRow = new Array(sheetHeaders.length).fill('');

      csvRow.forEach(function(cellValue, csvIndex) {
        if (columnMapping.hasOwnProperty(csvIndex)) {
          var sheetColumnIndex = columnMapping[csvIndex];
          sheetRow[sheetColumnIndex] = cellValue.trim(); // Always trim values
        }
      });

      // Basic validation - ensure at least one non-empty cell
      var hasData = sheetRow.some(function(cell) {
        return cell && cell.toString().trim().length > 0;
      });

      if (hasData) {
        rowsToAppend.push(sheetRow);
      } else {
        skippedCount++;
      }
    });

    // 🔧 FIX: Apply default values from Config.SCHEMA
    var schemaDefaults = getSchemaDefaults(sheetName);
    
    rowsToAppend.forEach(function(sheetRow) {
      sheetHeaders.forEach(function(header, colIdx) {
        var normalizedHeader = normalizeHeaderSafe(header);
        // Apply default if cell is empty and schema has a default
        if (!sheetRow[colIdx] && schemaDefaults[normalizedHeader] !== undefined) {
          sheetRow[colIdx] = schemaDefaults[normalizedHeader];
        }
      });
    });

    if (rowsToAppend.length === 0) {
      throw new Error('No valid data rows to import after mapping');
    }

    // Batch append for performance
    var lastRow = sheet.getLastRow();
    var targetRange = sheet.getRange(lastRow + 1, 1, rowsToAppend.length, sheetHeaders.length);
    targetRange.setValues(rowsToAppend);

    var allWarnings = parseWarnings.concat(mappingWarnings).concat(dataWarnings);

    return {
      success: true,
      data: {
        sheetName: sheetName,
        importedCount: rowsToAppend.length,
        skippedCount: skippedCount,
        totalProcessed: csvDataRows.length,
        warnings: allWarnings.length > 0 ? allWarnings : null
      }
    };

  } catch (e) {
    console.error('CSV Import Error:', e);
    // Log to Ops Log... (Code omitted for brevity, identical to your existing error logging)
    return { success: false, error: e.message };
  }
}

/**
 * Enhanced CSV parsing with header detection and robust error handling
 */
function parseCSVWithHeaders(csvText) {
  try {
    var lines = csvText.split('\n').filter(function(line) {
      return line.trim().length > 0;
    });

    if (lines.length === 0) throw new Error('No valid CSV data found');

    var data = [];
    var parseWarnings = [];

    for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      var line = lines[lineIndex];
      var parseResult = parseCSVLine(line, lineIndex + 1);

      if (parseResult.success) {
        data.push(parseResult.row);
      } else {
        parseWarnings.push('Line ' + (lineIndex + 1) + ': ' + parseResult.error);
      }
    }

    if (data.length === 0) throw new Error('No valid data rows could be parsed');

    var headers = data[0];
    var dataRows = data.slice(1);

    return {
      success: true,
      headers: headers,
      dataRows: dataRows,
      warnings: parseWarnings
    };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Parse a single CSV line with robust quote handling
 */
function parseCSVLine(line, lineNumber) {
  try {
    var row = [];
    var current = '';
    var inQuotes = false;
    var quoteChar = '"';

    for (var i = 0; i < line.length; i++) {
      var char = line[i];

      if (char === '"' || char === "'") {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          if (i + 1 < line.length && line[i + 1] === quoteChar) {
            current += quoteChar;
            i++; 
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());

    // Cleanup quotes
    row = row.map(function(field) {
      if (field.length >= 2 &&
          ((field.startsWith('"') && field.endsWith('"')) ||
           (field.startsWith("'") && field.endsWith("'")))) {
        return field.slice(1, -1);
      }
      return field;
    });

    return { success: true, row: row };

  } catch (e) {
    return { success: false, error: 'Failed to parse line ' + lineNumber + ': ' + e.message };
  }
}

/**
 * STRICT HEADER NORMALIZER
 * Forces lowercase and trims to ensure "Visit Date" matches "visit date"
 */
function normalizeHeaderSafe(header) {
  if (!header) return '';
  return header.toString().toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if two headers are similar (for fuzzy matching)
 */
function areSimilarHeaders(header1, header2) {
  if (!header1 || !header2) return false;
  
  // Normalize both for comparison
  var h1 = normalizeHeaderSafe(header1);
  var h2 = normalizeHeaderSafe(header2);

  if (h1 === h2) return true;

  var variations = [
    ['company name', 'company'],
    ['contact phone', 'phone'],
    ['contact name', 'name'],
    ['address', 'location'],
    ['latitude', 'lat'],
    ['longitude', 'lng', 'long'],
    ['visit date', 'date'],
    ['company id', 'id']
  ];

  for (var i = 0; i < variations.length; i++) {
    var v = variations[i];
    if (v.indexOf(h1) !== -1 && v.indexOf(h2) !== -1) return true;
  }

  return h1.includes(h2) || h2.includes(h1);
}

/**
 * Enhanced raw data parser that can handle various delimiter formats
 * Automatically detects the delimiter (comma, tab, pipe, semicolon) and parses accordingly
 * @param {string} textData - Raw text data to parse
 * @return {Object} Result with success status and parsed data
 */
function parseRawData(textData) {
  try {
    if (!textData || typeof textData !== 'string') {
      return { success: false, error: 'No data provided to parse' };
    }

    // Detect delimiter by analyzing the first line
    var firstLine = textData.split('\n')[0];
    var delimiter = detectDelimiter(firstLine);

    console.log('Auto-detected delimiter:', delimiter === ',' ? 'comma' : delimiter === '\t' ? 'tab' : delimiter === '|' ? 'pipe' : delimiter === ';' ? 'semicolon' : 'unknown');

    // Parse using detected delimiter
    var lines = textData.split('\n').filter(function(line) {
      return line.trim().length > 0;
    });

    if (lines.length === 0) {
      return { success: false, error: 'No valid data found' };
    }

    var parsedData = [];
    var parseWarnings = [];

    for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      var line = lines[lineIndex];
      var row = parseDelimitedLine(line, delimiter, lineIndex + 1);

      if (row.success) {
        parsedData.push(row.row);
      } else {
        parseWarnings.push('Line ' + (lineIndex + 1) + ': ' + row.error);
      }
    }

    if (parsedData.length === 0) {
      return { success: false, error: 'No valid rows could be parsed' };
    }

    // Determine if first row is headers
    var headers = parsedData[0];
    var dataRows = parsedData.slice(1);

    // Check if first row looks like headers (all short text values, no numbers that look like IDs)
    var likelyHeaders = headers.every(function(h) {
      var val = String(h).trim();
      return val.length < 50 && !/^\d{5,}$/.test(val); // No long numeric strings (like IDs)
    });

    if (!likelyHeaders) {
      // Generate generic headers if first row doesn't look like headers
      headers = headers.map(function(_, idx) {
        return 'Column ' + (idx + 1);
      });
      dataRows = parsedData; // Use all data including first row
    }

    return {
      success: true,
      headers: headers,
      dataRows: dataRows,
      delimiter: delimiter,
      warnings: parseWarnings
    };

  } catch (e) {
    return { success: false, error: 'Parse error: ' + e.message };
  }
}

/**
 * Detect the delimiter used in a text line
 * @param {string} line - Sample line to analyze
 * @return {string} Detected delimiter
 */
function detectDelimiter(line) {
  var delimiters = [',', '\t', '|', ';'];
  var counts = {};

  delimiters.forEach(function(d) {
    counts[d] = (line.match(new RegExp('\\' + d, 'g')) || []).length;
  });

  // Return the delimiter with the highest count
  var maxCount = 0;
  var detected = ',';

  for (var d in counts) {
    if (counts[d] > maxCount) {
      maxCount = counts[d];
      detected = d;
    }
  }

  return detected;
}

/**
 * Parse a single delimited line
 * @param {string} line - Line to parse
 * @param {string} delimiter - Delimiter character
 * @param {number} lineNumber - Line number for error reporting
 * @return {Object} Result with parsed row
 */
function parseDelimitedLine(line, delimiter, lineNumber) {
  try {
    var row = [];
    var current = '';
    var inQuotes = false;
    var quoteChar = '"';

    for (var i = 0; i < line.length; i++) {
      var char = line[i];

      if (char === '"' || char === "'") {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          if (i + 1 < line.length && line[i + 1] === quoteChar) {
            current += quoteChar;
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());

    // Cleanup quotes
    row = row.map(function(field) {
      if (field.length >= 2 &&
          ((field.startsWith('"') && field.endsWith('"')) ||
           (field.startsWith("'") && field.endsWith("'")))) {
        return field.slice(1, -1);
      }
      return field;
    });

    return { success: true, row: row };

  } catch (e) {
    return { success: false, error: 'Failed to parse line ' + lineNumber + ': ' + e.message };
  }
}

/**
 * Import raw/unstructured data with automatic format detection
 * @param {string} rawData - Raw text data to import
 * @param {string} sheetName - Target sheet name
 * @param {boolean} normalizeHeaders - Whether to normalize headers
 * @return {Object} Import result
 */
function importRawData(rawData, sheetName, normalizeHeaders) {
  try {
    // First, try to parse as raw data
    var parseResult = parseRawData(rawData);
    
    if (!parseResult.success) {
      // Fall back to standard CSV parsing
      console.log('Raw data parse failed, trying CSV format:', parseResult.error);
      return importCSVData(rawData, sheetName, normalizeHeaders);
    }

    // Convert parsed data back to CSV format for the existing import function
    var csvHeaders = parseResult.headers.join(',');
    var csvDataRows = parseResult.dataRows.map(function(row) {
      return row.map(function(cell) {
        // Escape cells that contain commas or quotes
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
          return '"' + cell.replace(/"/g, '""') + '"';
        }
        return cell;
      }).join(',');
    });

    var csvText = [csvHeaders].concat(csvDataRows).join('\n');

    console.log('Successfully parsed raw data:', {
      headers: parseResult.headers.length,
      rows: parseResult.dataRows.length,
      delimiter: parseResult.delimiter
    });

    // Use the existing import function
    return importCSVData(csvText, sheetName, normalizeHeaders);

  } catch (e) {
    return { success: false, error: 'Raw data import failed: ' + e.message };
  }
}

/**
 * Preview CSV mapping - shows how data will be mapped to columns
 * @param {string} csvText - The CSV/raw text to preview
 * @param {string} sheetName - Target sheet name
 * @param {boolean} normalizeHeaders - Whether to normalize headers
 * @return {Object} Preview result with mapping details
 */
function previewCSVMapping(csvText, sheetName, normalizeHeaders) {
  try {
    if (!csvText || !sheetName) {
      throw new Error('CSV text and sheet name are required');
    }

    // Parse the data (try raw first, then CSV)
    var parseResult = parseRawData(csvText);
    
    if (!parseResult.success) {
      // Fall back to standard CSV parsing
      parseResult = parseCSVWithHeaders(csvText);
    }
    
    if (!parseResult.success) {
      throw new Error(parseResult.error || 'Failed to parse data');
    }

    var csvHeaders = parseResult.headers || [];
    var sampleRows = parseResult.dataRows ? parseResult.dataRows.slice(0, 5) : [];
    var totalRows = parseResult.dataRows ? parseResult.dataRows.length : 0;
    var delimiter = parseResult.delimiter || ',';

    // Get sheet headers
    var accessResult = SharedUtils.checkSpreadsheetAccess('previewCSVMapping');
    if (!accessResult.success) {
      throw new Error(accessResult.error);
    }

    var ss = accessResult.spreadsheet;
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error('Sheet "' + sheetName + '" not found');
    }

    var sheetHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Build header mapping
    var headerMappings = [];
    var warnings = [];
    var sheetHeaderMap = {};

    // Create normalized map of sheet headers
    sheetHeaders.forEach(function(header, index) {
      if (header) {
        var key = normalizeHeaders 
          ? header.toString().toLowerCase().trim().replace(/\s+/g, ' ')
          : header.toString().trim();
        sheetHeaderMap[key] = { index: index, header: header };
      }
    });

    // Map CSV headers to sheet headers
    csvHeaders.forEach(function(csvHeader, csvIndex) {
      var normalizedCsv = normalizeHeaders
        ? csvHeader.toString().toLowerCase().trim().replace(/\s+/g, ' ')
        : csvHeader.toString().trim();
      
      var mapped = false;
      var targetHeader = '';
      
      // Try exact match
      if (sheetHeaderMap.hasOwnProperty(normalizedCsv)) {
        targetHeader = sheetHeaderMap[normalizedCsv].header;
        mapped = true;
      } else {
        // Try fuzzy matching
        for (var sheetKey in sheetHeaderMap) {
          if (areSimilarHeaders(normalizedCsv, sheetKey)) {
            targetHeader = sheetHeaderMap[sheetKey].header;
            mapped = true;
            warnings.push('CSV column "' + csvHeader + '" mapped to "' + targetHeader + '" (fuzzy match)');
            break;
          }
        }
      }

      headerMappings.push({
        source: csvHeader,
        sourceIndex: csvIndex,
        target: targetHeader,
        mapped: mapped
      });
    });

    return {
      success: true,
      data: {
        totalRows: totalRows,
        delimiter: delimiter,
        headerMappings: headerMappings,
        sampleRows: sampleRows,
        warnings: warnings
      }
    };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Get schema defaults for a given sheet type
 * Extracts default values from CONFIG.SCHEMA
 * @param {string} sheetName - Name of the sheet (Prospects, Outreach, Accounts, etc.)
 * @return {Object} Map of normalized header names to default values
 */
function getSchemaDefaults(sheetName) {
  var defaults = {};
  
  try {
    // Map sheet name to schema key
    var schemaKey = null;
    if (sheetName === 'Prospects') schemaKey = 'PROSPECTS';
    else if (sheetName === 'Outreach') schemaKey = 'OUTREACH';
    else if (sheetName === 'Accounts') schemaKey = 'ACCOUNTS';
    else if (sheetName === 'Contacts') schemaKey = 'CONTACTS';
    
    if (!schemaKey) return defaults;
    
    // Check if CONFIG and CONFIG.SCHEMA exist
    if (typeof CONFIG === 'undefined' || !CONFIG.SCHEMA) {
      console.warn('CONFIG.SCHEMA not available, using hardcoded defaults');
      // Hardcoded defaults as fallback
      defaults = {
        'owner': 'Kyle Buzbee',
        'contact type': 'Visit',
        'email sent': false,
        'deployed': 'FALSE',
        'roll-off fee': 'Yes',
        'roll off container size': '30 yd',
        'priority score': 60
      };
      return defaults;
    }
    
    var schema = CONFIG.SCHEMA[schemaKey];
    if (!schema) return defaults;
    
    // Extract defaults from schema
    for (var key in schema) {
      if (schema.hasOwnProperty(key) && schema[key].default !== undefined) {
        var headerName = schema[key].header.toLowerCase().trim();
        defaults[headerName] = schema[key].default;
      }
    }
    
  } catch (e) {
    console.error('Error getting schema defaults:', e);
  }
  
  return defaults;
}
