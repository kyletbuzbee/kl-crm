/**
 * Comprehensive Data Validation System
 * Robust validation and normalization for prospects and outreach data
 * Handles case sensitivity, misspellings, and malformed data gracefully
 */

var DataValidation = {
  /**
   * Expected headers for prospects CSV (case-insensitive)
   */
  PROSPECTS_HEADERS: [
    'company id', 'address', 'city', 'zip code', 'company name', 'industry',
    'latitude', 'longitude', 'last outcome', 'last outreach date',
    'days since last contact', 'next step due countdown', 'next steps due date',
    'contact status', 'close probability', 'priority score', 'urgencyband',
    'urgency score', 'totals'
  ],

  /**
   * Expected headers for outreach CSV (case-insensitive)
   */
  OUTREACH_HEADERS: [
    'outreach id', 'company id', 'company', 'visit date', 'notes',
    'outcome', 'stage', 'status', 'next visit date', 'days since last visit',
    'next visit countdown', 'outcome category', 'follow up action', 'owner',
    'prospects match', 'contact type', 'email sent'
  ],

   /**
   * Valid industry types (case-insensitive)
   */
  VALID_INDUSTRIES: [
    'agriculture', 'appliance', 'automotive', 'business to business', 'construction',
    'electrical', 'fabrication', 'fence', 'gutter', 'hvac', 'junk removal', 'manufacturing',
    'metal fabrication', 'other', 'plumbing', 'retail', 'roofing', 'trailer dealer',
    'warehouses', 'welding'
  ],

  /**
   * Valid outcome categories (case-insensitive)
   */
  VALID_OUTCOME_CATEGORIES: [
    'account won', 'disqualified', 'follow-up', 'initial contact', 'interested',
    'interested (hot)', 'interested (warm)', 'no answer', 'not contacted',
    'not interested'
  ],

  /**
   * Valid status values (case-insensitive)
   */
  VALID_STATUSES: [
    'disqualified', 'lost', 'warm', 'hot', 'cold', 'won', 'nurture',
    'prospect', 'outreach', 'active', 'inactive', 'never contacted',
    'follow-up required', 'follow up in 90 days', 'follow up in 180 days',
    'follow up in 6 months', 'follow up in 1 year', 'follow up in 2 weeks',
    'follow up in 1 month', 'follow up in 2 months', 'follow up in 3 months',
    'follow up in 4 months', 'follow up in 5 months', 'follow up in 6 months',
    'follow up in 7 months', 'follow up in 8 months', 'follow up in 9 months',
    'follow up in 10 months', 'follow up in 11 months', 'follow up in 12 months'
  ],

  /**
   * Valid contact types (case-insensitive)
   */
  VALID_CONTACT_TYPES: [
    'email', 'phone', 'visit'
  ],

  /**
   * Main function to validate and import prospects CSV
   * @param {string} csvText - The CSV text to import
   * @return {Object} Result with success status and validation details
   */
  validateAndImportProspectsCSV: function(csvText) {
    try {
      if (!csvText || typeof csvText !== 'string') {
        throw new Error('CSV text is required and must be a string');
      }

      // Parse CSV with enhanced error handling
      var parseResult = this.parseProspectsCSV(csvText);
      if (!parseResult.success) {
        return {
          success: false,
          error: 'CSV parsing failed: ' + parseResult.error,
          details: parseResult.details
        };
      }

      // Validate structure and data
      var validationResult = this.validateProspectsData(parseResult.data);
      if (!validationResult.success) {
        return {
          success: false,
          error: 'Data validation failed',
          details: validationResult.details,
          warnings: validationResult.warnings
        };
      }

      // Normalize data
      var normalizedData = this.normalizeProspectsData(parseResult.data);

      // Import to sheet
      var importResult = this.importToProspectsSheet(normalizedData);
      if (!importResult.success) {
        return {
          success: false,
          error: 'Import to sheet failed: ' + importResult.error,
          details: importResult.details
        };
      }

      return {
        success: true,
        message: 'Prospects CSV imported and validated successfully',
        importedRows: normalizedData.length,
        warnings: validationResult.warnings || []
      };

    } catch (e) {
      return {
        success: false,
        error: 'Prospects import failed: ' + e.message,
        stack: e.stack
      };
    }
  },

  /**
   * Main function to validate and import outreach CSV
   * @param {string} csvText - The CSV text to import
   * @return {Object} Result with success status and validation details
   */
  validateAndImportOutreachCSV: function(csvText) {
    try {
      if (!csvText || typeof csvText !== 'string') {
        throw new Error('CSV text is required and must be a string');
      }

      // Parse CSV with enhanced error handling
      var parseResult = this.parseOutreachCSV(csvText);
      if (!parseResult.success) {
        return {
          success: false,
          error: 'CSV parsing failed: ' + parseResult.error,
          details: parseResult.details
        };
      }

      // Validate structure and data
      var validationResult = this.validateOutreachData(parseResult.data);
      if (!validationResult.success) {
        return {
          success: false,
          error: 'Data validation failed',
          details: validationResult.details,
          warnings: validationResult.warnings
        };
      }

      // Normalize data
      var normalizedData = this.normalizeOutreachData(parseResult.data);

      // Import to sheet
      var importResult = this.importToOutreachSheet(normalizedData);
      if (!importResult.success) {
        return {
          success: false,
          error: 'Import to sheet failed: ' + importResult.error,
          details: importResult.details
        };
      }

      return {
        success: true,
        message: 'Outreach CSV imported and validated successfully',
        importedRows: normalizedData.length,
        warnings: validationResult.warnings || []
      };

    } catch (e) {
      return {
        success: false,
        error: 'Outreach import failed: ' + e.message,
        stack: e.stack
      };
    }
  },

  /**
   * Parse prospects CSV text with robust error handling
   * @param {string} csvText - CSV text to parse
   * @return {Object} Parse result
   */
  parseProspectsCSV: function(csvText) {
    try {
      var lines = csvText.split('\n').filter(function(line) {
        return line.trim().length > 0;
      });

      if (lines.length === 0) {
        throw new Error('No valid CSV data found');
      }

      // Parse CSV rows with enhanced quote handling
      var data = [];
      var parseErrors = [];

      for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        var line = lines[lineIndex];
        var parseResult = this.parseCSVLine(line, lineIndex + 1);

        if (parseResult.success) {
          data.push(parseResult.row);
        } else {
          parseErrors.push({
            line: lineIndex + 1,
            error: parseResult.error,
            lineContent: line.substring(0, 50) + (line.length > 50 ? '...' : '')
          });
        }
      }

      if (data.length === 0) {
        throw new Error('No valid data rows could be parsed');
      }

      return {
        success: true,
        data: data,
        parseErrors: parseErrors
      };

    } catch (e) {
      return {
        success: false,
        error: e.message,
        details: {
          csvTextLength: csvText.length,
          lineCount: lines.length
        }
      };
    }
  },

  /**
   * Parse outreach CSV text with robust error handling
   * @param {string} csvText - CSV text to parse
   * @return {Object} Parse result
   */
  parseOutreachCSV: function(csvText) {
    try {
      var lines = csvText.split('\n').filter(function(line) {
        return line.trim().length > 0;
      });

      if (lines.length === 0) {
        throw new Error('No valid CSV data found');
      }

      // Parse CSV rows with enhanced quote handling
      var data = [];
      var parseErrors = [];

      for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        var line = lines[lineIndex];
        var parseResult = this.parseCSVLine(line, lineIndex + 1);

        if (parseResult.success) {
          data.push(parseResult.row);
        } else {
          parseErrors.push({
            line: lineIndex + 1,
            error: parseResult.error,
            lineContent: line.substring(0, 50) + (line.length > 50 ? '...' : '')
          });
        }
      }

      if (data.length === 0) {
        throw new Error('No valid data rows could be parsed');
      }

      return {
        success: true,
        data: data,
        parseErrors: parseErrors
      };

    } catch (e) {
      return {
        success: false,
        error: e.message,
        details: {
          csvTextLength: csvText.length,
          lineCount: lines.length
        }
      };
    }
  },

  /**
   * Parse a single CSV line with robust quote handling
   * @param {string} line - CSV line to parse
   * @param {number} lineNumber - Line number for error reporting
   * @return {Object} Parse result
   */
  parseCSVLine: function(line, lineNumber) {
    try {
      var row = [];
      var current = '';
      var inQuotes = false;
      var quoteChar = '"';

      for (var i = 0; i < line.length; i++) {
        var char = line[i];

        // Handle quote characters
        if (char === '"' || char === "'") {
          if (!inQuotes) {
            // Starting a quoted field
            inQuotes = true;
            quoteChar = char;
          } else if (char === quoteChar) {
            // Check if this is an escaped quote (like "")
            if (i + 1 < line.length && line[i + 1] === quoteChar) {
              // Escaped quote, add one quote to current field
              current += quoteChar;
              i++; // Skip the next quote
            } else {
              // Ending a quoted field
              inQuotes = false;
            }
          } else {
            // Different quote character, treat as regular character
            current += char;
          }
        }
        // Handle comma separator (only outside quotes)
        else if (char === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        }
        // Regular character
        else {
          current += char;
        }
      }

      // Add the last field
      row.push(current.trim());

      // Clean up fields by removing surrounding quotes if present
      row = row.map(function(field) {
        if (field.length >= 2 &&
            ((field.startsWith('"') && field.endsWith('"')) ||
             (field.startsWith("'") && field.endsWith("'")))) {
          return field.slice(1, -1);
        }
        return field;
      });

      return {
        success: true,
        row: row
      };

    } catch (e) {
      return {
        success: false,
        error: 'Failed to parse line ' + lineNumber + ': ' + e.message
      };
    }
  },

  /**
   * Validate prospects data structure and content
   * @param {Array} data - Parsed CSV data
   * @return {Object} Validation result
   */
  validateProspectsData: function(data) {
    try {
      var warnings = [];
      var errors = [];

      // Check if first row contains headers
      var firstRow = data[0];
      var headerValidation = this.validateHeaders(firstRow, this.PROSPECTS_HEADERS);
      if (!headerValidation.success) {
        errors.push('Header validation failed: ' + headerValidation.error);
        return {
          success: false,
          error: 'Invalid CSV structure',
          details: {
            headerErrors: headerValidation.errors,
            headerWarnings: headerValidation.warnings
          }
        };
      }

      // Add header validation warnings
      if (headerValidation.warnings && headerValidation.warnings.length > 0) {
        warnings = warnings.concat(headerValidation.warnings);
      }

      // Process data rows (skip header row)
      var dataRows = data.slice(1);
      var rowErrors = [];
      var rowWarnings = [];

      for (var rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        var row = dataRows[rowIndex];
        var rowNumber = rowIndex + 2; // +2 because we skip header row

        // Validate row structure
        if (row.length < this.PROSPECTS_HEADERS.length) {
          rowErrors.push({
            row: rowNumber,
            error: 'Row has fewer columns than expected (' + row.length + ' vs ' + this.PROSPECTS_HEADERS.length + ')',
            columnsFound: row.length,
            columnsExpected: this.PROSPECTS_HEADERS.length
          });
          continue;
        }

        // Extract values using header mapping
        var companyId = row[headerValidation.headerMap['company id']] || '';
        var companyName = row[headerValidation.headerMap['company name']] || '';
        var industry = row[headerValidation.headerMap['industry']] || '';
        var latitude = row[headerValidation.headerMap['latitude']] || '';
        var longitude = row[headerValidation.headerMap['longitude']] || '';
        var lastOutcome = row[headerValidation.headerMap['last outcome']] || '';
        var lastOutreachDate = row[headerValidation.headerMap['last outreach date']] || '';
        var daysSinceLastContact = row[headerValidation.headerMap['days since last contact']] || '';
        var nextStepsDueDate = row[headerValidation.headerMap['next steps due date']] || '';
        var contactStatus = row[headerValidation.headerMap['contact status']] || '';
        var closeProbability = row[headerValidation.headerMap['close probability']] || '';
        var priorityScore = row[headerValidation.headerMap['priority score']] || '';
        var urgencyBand = row[headerValidation.headerMap['urgencyband']] || '';
        var urgencyScore = row[headerValidation.headerMap['urgency score']] || '';

        // Validate required fields
        if (!companyId || typeof companyId !== 'string' || companyId.trim() === '') {
          rowErrors.push({
            row: rowNumber,
            error: 'Company ID is required',
            field: 'Company ID'
          });
        }

        if (!companyName || typeof companyName !== 'string' || companyName.trim() === '') {
          rowErrors.push({
            row: rowNumber,
            error: 'Company Name is required',
            field: 'Company Name'
          });
        }

        // Validate industry
        var industryValidation = this.validateIndustry(industry);
        if (!industryValidation.valid) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid industry: ' + industryValidation.error,
            industry: industry,
            suggestions: industryValidation.suggestions
          });
        } else if (industryValidation.warning) {
          rowWarnings.push({
            row: rowNumber,
            warning: 'Industry warning: ' + industryValidation.warning,
            industry: industry,
            normalized: industryValidation.normalized
          });
        }

        // Validate contact status
        var statusValidation = this.validateStatus(contactStatus);
        if (!statusValidation.valid) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid contact status: ' + statusValidation.error,
            status: contactStatus,
            suggestions: statusValidation.suggestions
          });
        } else if (statusValidation.warning) {
          rowWarnings.push({
            row: rowNumber,
            warning: 'Status warning: ' + statusValidation.warning,
            status: contactStatus,
            normalized: statusValidation.normalized
          });
        }

        // Validate numeric fields
        if (latitude && !this.isValidNumber(latitude)) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid latitude: ' + latitude,
            field: 'Latitude'
          });
        }

        if (longitude && !this.isValidNumber(longitude)) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid longitude: ' + longitude,
            field: 'Longitude'
          });
        }

        if (daysSinceLastContact && !this.isValidNumber(daysSinceLastContact)) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid days since last contact: ' + daysSinceLastContact,
            field: 'Days Since Last Contact'
          });
        }

        if (closeProbability && !this.isValidNumber(closeProbability)) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid close probability: ' + closeProbability,
            field: 'Close Probability'
          });
        }

        if (priorityScore && !this.isValidNumber(priorityScore)) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid priority score: ' + priorityScore,
            field: 'Priority Score'
          });
        }

        if (urgencyScore && !this.isValidNumber(urgencyScore)) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid urgency score: ' + urgencyScore,
            field: 'Urgency Score'
          });
        }

        // Validate date fields
        if (lastOutreachDate && !this.isValidDate(lastOutreachDate)) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid last outreach date: ' + lastOutreachDate,
            field: 'Last Outreach Date'
          });
        }

        if (nextStepsDueDate && !this.isValidDate(nextStepsDueDate)) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid next steps due date: ' + nextStepsDueDate,
            field: 'Next Steps Due Date'
          });
        }
      }

      if (rowErrors.length > 0) {
        return {
          success: false,
          error: 'Data validation failed',
          details: {
            rowErrors: rowErrors,
            rowWarnings: rowWarnings,
            totalErrors: rowErrors.length,
            totalWarnings: rowWarnings.length
          }
        };
      }

      return {
        success: true,
        warnings: warnings.concat(rowWarnings),
        details: {
          totalRows: dataRows.length,
          validRows: dataRows.length - rowErrors.length,
          warnings: rowWarnings.length
        }
      };

    } catch (e) {
      return {
        success: false,
        error: 'Validation error: ' + e.message,
        stack: e.stack
      };
    }
  },

  /**
   * Validate outreach data structure and content
   * @param {Array} data - Parsed CSV data
   * @return {Object} Validation result
   */
  validateOutreachData: function(data) {
    try {
      var warnings = [];
      var errors = [];

      // Check if first row contains headers
      var firstRow = data[0];
      var headerValidation = this.validateHeaders(firstRow, this.OUTREACH_HEADERS);
      if (!headerValidation.success) {
        errors.push('Header validation failed: ' + headerValidation.error);
        return {
          success: false,
          error: 'Invalid CSV structure',
          details: {
            headerErrors: headerValidation.errors,
            headerWarnings: headerValidation.warnings
          }
        };
      }

      // Add header validation warnings
      if (headerValidation.warnings && headerValidation.warnings.length > 0) {
        warnings = warnings.concat(headerValidation.warnings);
      }

      // Process data rows (skip header row)
      var dataRows = data.slice(1);
      var rowErrors = [];
      var rowWarnings = [];

      for (var rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        var row = dataRows[rowIndex];
        var rowNumber = rowIndex + 2; // +2 because we skip header row

        // Validate row structure
        if (row.length < this.OUTREACH_HEADERS.length) {
          rowErrors.push({
            row: rowNumber,
            error: 'Row has fewer columns than expected (' + row.length + ' vs ' + this.OUTREACH_HEADERS.length + ')',
            columnsFound: row.length,
            columnsExpected: this.OUTREACH_HEADERS.length
          });
          continue;
        }

        // Extract values using header mapping
        var outreachId = row[headerValidation.headerMap['outreach id']] || '';
        var companyId = row[headerValidation.headerMap['company id']] || '';
        var companyName = row[headerValidation.headerMap['company']] || '';
        var visitDate = row[headerValidation.headerMap['visit date']] || '';
        var outcome = row[headerValidation.headerMap['outcome']] || '';
        var stage = row[headerValidation.headerMap['stage']] || '';
        var status = row[headerValidation.headerMap['status']] || '';
        var nextVisitDate = row[headerValidation.headerMap['next visit date']] || '';
        var daysSinceLastVisit = row[headerValidation.headerMap['days since last visit']] || '';
        var nextVisitCountdown = row[headerValidation.headerMap['next visit countdown']] || '';
        var outcomeCategory = row[headerValidation.headerMap['outcome category']] || '';
        var followUpAction = row[headerValidation.headerMap['follow up action']] || '';
        var owner = row[headerValidation.headerMap['owner']] || '';
        var prospectsMatch = row[headerValidation.headerMap['prospects match']] || '';
        var contactType = row[headerValidation.headerMap['contact type']] || '';
        var emailSent = row[headerValidation.headerMap['email sent']] || '';

        // Validate required fields
        if (!outreachId || typeof outreachId !== 'string' || outreachId.trim() === '') {
          rowErrors.push({
            row: rowNumber,
            error: 'Outreach ID is required',
            field: 'Outreach ID'
          });
        }

        if (!companyName || typeof companyName !== 'string' || companyName.trim() === '') {
          rowErrors.push({
            row: rowNumber,
            error: 'Company Name is required',
            field: 'Company'
          });
        }

        // Validate outcome category
        var outcomeCategoryValidation = this.validateOutcomeCategory(outcomeCategory);
        if (!outcomeCategoryValidation.valid) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid outcome category: ' + outcomeCategoryValidation.error,
            outcomeCategory: outcomeCategory,
            suggestions: outcomeCategoryValidation.suggestions
          });
        } else if (outcomeCategoryValidation.warning) {
          rowWarnings.push({
            row: rowNumber,
            warning: 'Outcome category warning: ' + outcomeCategoryValidation.warning,
            outcomeCategory: outcomeCategory,
            normalized: outcomeCategoryValidation.normalized
          });
        }

        // Validate status
        var statusValidation = this.validateStatus(status);
        if (!statusValidation.valid) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid status: ' + statusValidation.error,
            status: status,
            suggestions: statusValidation.suggestions
          });
        } else if (statusValidation.warning) {
          rowWarnings.push({
            row: rowNumber,
            warning: 'Status warning: ' + statusValidation.warning,
            status: status,
            normalized: statusValidation.normalized
          });
        }

        // Validate contact type
        var contactTypeValidation = this.validateContactType(contactType);
        if (!contactTypeValidation.valid) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid contact type: ' + contactTypeValidation.error,
            contactType: contactType,
            suggestions: contactTypeValidation.suggestions
          });
        } else if (contactTypeValidation.warning) {
          rowWarnings.push({
            row: rowNumber,
            warning: 'Contact type warning: ' + contactTypeValidation.warning,
            contactType: contactType,
            normalized: contactTypeValidation.normalized
          });
        }

        // Validate numeric fields
        if (daysSinceLastVisit && !this.isValidNumber(daysSinceLastVisit)) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid days since last visit: ' + daysSinceLastVisit,
            field: 'Days Since Last Visit'
          });
        }

        if (nextVisitCountdown && !this.isValidNumber(nextVisitCountdown)) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid next visit countdown: ' + nextVisitCountdown,
            field: 'Next Visit Countdown'
          });
        }

        if (closeProbability && !this.isValidNumber(closeProbability)) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid close probability: ' + closeProbability,
            field: 'Close Probability'
          });
        }

        // Validate date fields
        if (visitDate && !this.isValidDate(visitDate)) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid visit date: ' + visitDate,
            field: 'Visit Date'
          });
        }

        if (nextVisitDate && !this.isValidDate(nextVisitDate)) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid next visit date: ' + nextVisitDate,
            field: 'Next Visit Date'
          });
        }

        // Validate boolean fields
        if (prospectsMatch && !this.isValidBoolean(prospectsMatch)) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid prospects match: ' + prospectsMatch,
            field: 'Prospects Match'
          });
        }

        if (emailSent && !this.isValidBoolean(emailSent)) {
          rowErrors.push({
            row: rowNumber,
            error: 'Invalid email sent: ' + emailSent,
            field: 'Email Sent'
          });
        }
      }

      if (rowErrors.length > 0) {
        return {
          success: false,
          error: 'Data validation failed',
          details: {
            rowErrors: rowErrors,
            rowWarnings: rowWarnings,
            totalErrors: rowErrors.length,
            totalWarnings: rowWarnings.length
          }
        };
      }

      return {
        success: true,
        warnings: warnings.concat(rowWarnings),
        details: {
          totalRows: dataRows.length,
          validRows: dataRows.length - rowErrors.length,
          warnings: rowWarnings.length
        }
      };

    } catch (e) {
      return {
        success: false,
        error: 'Validation error: ' + e.message,
        stack: e.stack
      };
    }
  },

  /**
   * Validate CSV headers
   * @param {Array} headers - Header row from CSV
   * @param {Array} expectedHeaders - Expected headers
   * @return {Object} Validation result
   */
  validateHeaders: function(headers, expectedHeaders) {
    try {
      var errors = [];
      var warnings = [];
      var headerMap = {};

      // Check if we have any headers
      if (!headers || !Array.isArray(headers) || headers.length === 0) {
        throw new Error('No headers found in CSV');
      }

      // Create mapping from normalized header names to their indices
      var foundHeaders = [];
      var missingHeaders = [];

      expectedHeaders.forEach(function(expectedHeader, index) {
        var normalizedExpected = expectedHeader.toLowerCase().trim();
        var found = false;

        for (var i = 0; i < headers.length; i++) {
          var actualHeader = headers[i];
          if (!actualHeader) continue;

          var normalizedActual = actualHeader.toString().toLowerCase().trim();

          if (normalizedActual === normalizedExpected) {
            headerMap[expectedHeader] = i;
            foundHeaders.push(expectedHeader);
            found = true;
            break;
          }
        }

        if (!found) {
          missingHeaders.push(expectedHeader);
        }
      });

      // Report missing headers
      if (missingHeaders.length > 0) {
        errors.push('Missing required headers: ' + missingHeaders.join(', '));
      }

      // Check for extra headers
      var extraHeaders = [];
      for (var i = 0; i < headers.length; i++) {
        var header = headers[i];
        if (!header) continue;

        var normalizedHeader = header.toString().toLowerCase().trim();
        var isExpected = expectedHeaders.some(function(expected) {
          return expected.toLowerCase().trim() === normalizedHeader;
        });

        if (!isExpected) {
          extraHeaders.push(header);
        }
      }

      if (extraHeaders.length > 0) {
        warnings.push('Extra headers found (will be ignored): ' + extraHeaders.join(', '));
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: 'Header validation failed',
          errors: errors,
          warnings: warnings,
          foundHeaders: foundHeaders,
          missingHeaders: missingHeaders
        };
      }

      return {
        success: true,
        headerMap: headerMap,
        warnings: warnings,
        foundHeaders: foundHeaders,
        extraHeaders: extraHeaders
      };

    } catch (e) {
      return {
        success: false,
        error: e.message,
        errors: [e.message]
      };
    }
  },

  /**
   * Validate industry
   * @param {string} industry - Industry value
   * @return {Object} Validation result
   */
  validateIndustry: function(industry) {
    try {
      if (!industry || typeof industry !== 'string') {
        return {
          valid: false,
          error: 'Industry is required',
          suggestions: this.VALID_INDUSTRIES.slice(0, 5).map(function(i) { return i.charAt(0).toUpperCase() + i.slice(1); })
        };
      }

      var originalIndustry = industry;
      var normalizedIndustry = industry.toString().trim().toLowerCase();

      // Check if normalized industry is valid
      var isValid = this.VALID_INDUSTRIES.some(function(validIndustry) {
        return validIndustry.toLowerCase() === normalizedIndustry;
      });

      if (!isValid) {
        // Find similar industries for suggestions
        var suggestions = [];
        this.VALID_INDUSTRIES.forEach(function(validIndustry) {
          if (this.areSimilarStrings(normalizedIndustry, validIndustry.toLowerCase())) {
            suggestions.push(validIndustry.charAt(0).toUpperCase() + validIndustry.slice(1));
          }
        }, this);

        return {
          valid: false,
          error: 'Invalid industry: ' + originalIndustry,
          normalized: normalizedIndustry,
          suggestions: suggestions.length > 0 ? suggestions : this.VALID_INDUSTRIES.slice(0, 5).map(function(i) { return i.charAt(0).toUpperCase() + i.slice(1); })
        };
      }

      // Check if original needed normalization
      var needsNormalization = originalIndustry.toLowerCase() !== normalizedIndustry;
      var warning = needsNormalization ?
        'Industry normalized from "' + originalIndustry + '" to "' + normalizedIndustry + '"' : null;

      return {
        valid: true,
        normalized: normalizedIndustry,
        original: originalIndustry,
        warning: warning
      };

    } catch (e) {
      return {
        valid: false,
        error: 'Industry validation error: ' + e.message
      };
    }
  },

  /**
   * Validate outcome category
   * @param {string} outcomeCategory - Outcome category value
   * @return {Object} Validation result
   */
  validateOutcomeCategory: function(outcomeCategory) {
    try {
      if (!outcomeCategory || typeof outcomeCategory !== 'string') {
        return {
          valid: false,
          error: 'Outcome category is required',
          suggestions: this.VALID_OUTCOME_CATEGORIES.slice(0, 5).map(function(c) { return c.charAt(0).toUpperCase() + c.slice(1); })
        };
      }

      var originalCategory = outcomeCategory;
      var normalizedCategory = outcomeCategory.toString().trim().toLowerCase();

      // Check if normalized category is valid
      var isValid = this.VALID_OUTCOME_CATEGORIES.some(function(validCat) {
        return validCat.toLowerCase() === normalizedCategory;
      });

      if (!isValid) {
        // Find similar categories for suggestions
        var suggestions = [];
        this.VALID_OUTCOME_CATEGORIES.forEach(function(validCat) {
          if (this.areSimilarStrings(normalizedCategory, validCat.toLowerCase())) {
            suggestions.push(validCat.charAt(0).toUpperCase() + validCat.slice(1));
          }
        }, this);

        return {
          valid: false,
          error: 'Invalid outcome category: ' + originalCategory,
          normalized: normalizedCategory,
          suggestions: suggestions.length > 0 ? suggestions : this.VALID_OUTCOME_CATEGORIES.slice(0, 5).map(function(c) { return c.charAt(0).toUpperCase() + c.slice(1); })
        };
      }

      // Check if original needed normalization
      var needsNormalization = originalCategory.toLowerCase() !== normalizedCategory;
      var warning = needsNormalization ?
        'Outcome category normalized from "' + originalCategory + '" to "' + normalizedCategory + '"' : null;

      return {
        valid: true,
        normalized: normalizedCategory,
        original: originalCategory,
        warning: warning
      };

    } catch (e) {
      return {
        valid: false,
        error: 'Outcome category validation error: ' + e.message
      };
    }
  },

  /**
   * Validate status
   * @param {string} status - Status value
   * @return {Object} Validation result
   */
  validateStatus: function(status) {
    try {
      if (!status || typeof status !== 'string') {
        return {
          valid: false,
          error: 'Status is required',
          suggestions: this.VALID_STATUSES.slice(0, 5).map(function(s) { return s.charAt(0).toUpperCase() + s.slice(1); })
        };
      }

      var originalStatus = status;
      var normalizedStatus = status.toString().trim().toLowerCase();

      // Check if normalized status is valid
      var isValid = this.VALID_STATUSES.some(function(validStatus) {
        return validStatus.toLowerCase() === normalizedStatus;
      });

      if (!isValid) {
        // Find similar statuses for suggestions
        var suggestions = [];
        this.VALID_STATUSES.forEach(function(validStatus) {
          if (this.areSimilarStrings(normalizedStatus, validStatus.toLowerCase())) {
            suggestions.push(validStatus.charAt(0).toUpperCase() + validStatus.slice(1));
          }
        }, this);

        return {
          valid: false,
          error: 'Invalid status: ' + originalStatus,
          normalized: normalizedStatus,
          suggestions: suggestions.length > 0 ? suggestions : this.VALID_STATUSES.slice(0, 5).map(function(s) { return s.charAt(0).toUpperCase() + s.slice(1); })
        };
      }

      // Check if original needed normalization
      var needsNormalization = originalStatus.toLowerCase() !== normalizedStatus;
      var warning = needsNormalization ?
        'Status normalized from "' + originalStatus + '" to "' + normalizedStatus + '"' : null;

      return {
        valid: true,
        normalized: normalizedStatus,
        original: originalStatus,
        warning: warning
      };

    } catch (e) {
      return {
        valid: false,
        error: 'Status validation error: ' + e.message
      };
    }
  },

  /**
   * Validate contact type
   * @param {string} contactType - Contact type value
   * @return {Object} Validation result
   */
  validateContactType: function(contactType) {
    try {
      if (!contactType || typeof contactType !== 'string') {
        return {
          valid: false,
          error: 'Contact type is required',
          suggestions: this.VALID_CONTACT_TYPES.slice(0, 5).map(function(c) { return c.charAt(0).toUpperCase() + c.slice(1); })
        };
      }

      var originalContactType = contactType;
      var normalizedContactType = contactType.toString().trim().toLowerCase();

      // Check if normalized contact type is valid
      var isValid = this.VALID_CONTACT_TYPES.some(function(validContactType) {
        return validContactType.toLowerCase() === normalizedContactType;
      });

      if (!isValid) {
        // Find similar contact types for suggestions
        var suggestions = [];
        this.VALID_CONTACT_TYPES.forEach(function(validContactType) {
          if (this.areSimilarStrings(normalizedContactType, validContactType.toLowerCase())) {
            suggestions.push(validContactType.charAt(0).toUpperCase() + validContactType.slice(1));
          }
        }, this);

        return {
          valid: false,
          error: 'Invalid contact type: ' + originalContactType,
          normalized: normalizedContactType,
          suggestions: suggestions.length > 0 ? suggestions : this.VALID_CONTACT_TYPES.slice(0, 5).map(function(c) { return c.charAt(0).toUpperCase() + c.slice(1); })
        };
      }

      // Check if original needed normalization
      var needsNormalization = originalContactType.toLowerCase() !== normalizedContactType;
      var warning = needsNormalization ?
        'Contact type normalized from "' + originalContactType + '" to "' + normalizedContactType + '"' : null;

      return {
        valid: true,
        normalized: normalizedContactType,
        original: originalContactType,
        warning: warning
      };

    } catch (e) {
      return {
        valid: false,
        error: 'Contact type validation error: ' + e.message
      };
    }
  },

  /**
   * Check if two strings are similar (for suggestion purposes)
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @return {boolean} True if strings are similar
   */
  areSimilarStrings: function(str1, str2) {
    if (!str1 || !str2) return false;

    str1 = str1.toLowerCase().trim();
    str2 = str2.toLowerCase().trim();

    // Exact match
    if (str1 === str2) return true;

    // Check if one string contains the other
    if (str1.includes(str2) || str2.includes(str1)) return true;

    // Check Levenshtein distance (simple version)
    var distance = this.simpleLevenshtein(str1, str2);
    var maxLength = Math.max(str1.length, str2.length);

    // Consider similar if distance is less than 3 or less than 25% of max length
    return distance <= 3 || distance <= maxLength * 0.25;
  },

  /**
   * Simple Levenshtein distance calculation
   * @param {string} a - First string
   * @param {string} b - Second string
   * @return {number} Distance
   */
  simpleLevenshtein: function(a, b) {
    try {
      a = a || '';
      b = b || '';
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;

      var matrix = [];

      // Initialize matrix
      for (var i = 0; i <= b.length; i++) {
        matrix[i] = [i];
      }

      for (var j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
      }

      // Fill matrix
      for (var i = 1; i <= b.length; i++) {
        for (var j = 1; j <= a.length; j++) {
          if (b.charAt(i-1) === a.charAt(j-1)) {
            matrix[i][j] = matrix[i-1][j-1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i-1][j-1] + 1, // substitution
              matrix[i][j-1] + 1,   // insertion
              matrix[i-1][j] + 1    // deletion
            );
          }
        }
      }

      return matrix[b.length][a.length];
    } catch (e) {
      console.error('simpleLevenshtein error:', e.message);
      return 0;
    }
  },

  /**
   * Check if value is a valid number
   * @param {any} value - Value to check
   * @return {boolean} True if valid number
   */
  isValidNumber: function(value) {
    if (!value || typeof value !== 'string') return false;

    var trimmed = value.toString().trim();
    if (trimmed === '') return false;

    // Allow negative numbers and decimals
    return !isNaN(trimmed) && isFinite(trimmed);
  },

  /**
   * Check if value is a valid date
   * @param {string} value - Date value to check
   * @return {boolean} True if valid date
   */
  isValidDate: function(value) {
    if (!value || typeof value !== 'string') return false;

    var trimmed = value.toString().trim();
    if (trimmed === '') return false;

    // Try to parse the date
    var date = new Date(trimmed);
    return !isNaN(date.getTime());
  },

  /**
   * Check if value is a valid boolean
   * @param {string} value - Boolean value to check
   * @return {boolean} True if valid boolean
   */
  isValidBoolean: function(value) {
    if (!value || typeof value !== 'string') return false;

    var trimmed = value.toString().trim().toLowerCase();
    return trimmed === 'true' || trimmed === 'false' || trimmed === 'yes' || trimmed === 'no';
  },

  /**
   * Normalize prospects data
   * @param {Array} data - Parsed CSV data
   * @return {Array} Normalized data
   */
  normalizeProspectsData: function(data) {
    try {
      // Skip header row
      var headerRow = data[0];
      var dataRows = data.slice(1);

      var normalizedData = [];

      // Get header mapping
      var headerValidation = this.validateHeaders(headerRow, this.PROSPECTS_HEADERS);
      if (!headerValidation.success) {
        throw new Error('Cannot normalize data - header validation failed');
      }

      var headerMap = headerValidation.headerMap;

      dataRows.forEach(function(row, rowIndex) {
        try {
          var normalizedRow = new Array(headerRow.length).fill('');

          // Normalize each field
          Object.keys(headerMap).forEach(function(headerKey) {
            var colIndex = headerMap[headerKey];
            var originalValue = row[colIndex] || '';

            var normalizedValue = this.normalizeFieldValue(headerKey, originalValue);
            normalizedRow[colIndex] = normalizedValue;
          }, this);

          normalizedData.push(normalizedRow);

        } catch (e) {
          console.warn('Error normalizing row ' + (rowIndex + 2) + ': ' + e.message);
          // Push original row if normalization fails
          normalizedData.push(row);
        }
      }, this);

      // Add header row back
      normalizedData.unshift(headerRow);

      return normalizedData;

    } catch (e) {
      console.error('Normalization error: ' + e.message);
      return data; // Return original data if normalization fails
    }
  },

  /**
   * Normalize outreach data
   * @param {Array} data - Parsed CSV data
   * @return {Array} Normalized data
   */
  normalizeOutreachData: function(data) {
    try {
      // Skip header row
      var headerRow = data[0];
      var dataRows = data.slice(1);

      var normalizedData = [];

      // Get header mapping
      var headerValidation = this.validateHeaders(headerRow, this.OUTREACH_HEADERS);
      if (!headerValidation.success) {
        throw new Error('Cannot normalize data - header validation failed');
      }

      var headerMap = headerValidation.headerMap;

      dataRows.forEach(function(row, rowIndex) {
        try {
          var normalizedRow = new Array(headerRow.length).fill('');

          // Normalize each field
          Object.keys(headerMap).forEach(function(headerKey) {
            var colIndex = headerMap[headerKey];
            var originalValue = row[colIndex] || '';

            var normalizedValue = this.normalizeFieldValue(headerKey, originalValue);
            normalizedRow[colIndex] = normalizedValue;
          }, this);

          normalizedData.push(normalizedRow);

        } catch (e) {
          console.warn('Error normalizing row ' + (rowIndex + 2) + ': ' + e.message);
          // Push original row if normalization fails
          normalizedData.push(row);
        }
      }, this);

      // Add header row back
      normalizedData.unshift(headerRow);

      return normalizedData;

    } catch (e) {
      console.error('Normalization error: ' + e.message);
      return data; // Return original data if normalization fails
    }
  },

  /**
   * Normalize field value based on field type
   * @param {string} fieldName - Field name
   * @param {string} value - Original value
   * @return {string} Normalized value
   */
  normalizeFieldValue: function(fieldName, value) {
    try {
      if (!value || typeof value !== 'string') {
        return '';
      }

      var trimmed = value.trim();

      // Normalize based on field type
      switch (fieldName.toLowerCase()) {
        case 'company id':
        case 'outreach id':
          // Preserve original case but trim
          return trimmed;

        case 'company name':
        case 'company':
          // Proper case for company names
          return this.toProperCase(trimmed);

        case 'industry':
        case 'outcome':
        case 'stage':
        case 'status':
        case 'outcome category':
        case 'follow up action':
        case 'owner':
        case 'contact type':
          // Normalize to lowercase
          return trimmed.toLowerCase();

        case 'address':
          // Proper case for addresses
          return this.toProperCase(trimmed);

        case 'zip code':
          // Trim and remove any non-digit characters
          return trimmed.replace(/[^0-9]/g, '');

        case 'latitude':
        case 'longitude':
        case 'days since last contact':
        case 'next visit countdown':
        case 'close probability':
        case 'priority score':
        case 'urgency score':
          // Trim but preserve content
          return trimmed;

        case 'last outcome':
        case 'last outreach date':
        case 'next steps due date':
        case 'visit date':
        case 'next visit date':
          // Normalize date format
          return this.normalizeDate(trimmed);

        case 'contact status':
          // Normalize contact status
          return this.normalizeContactStatus(trimmed);

        case 'prospects match':
        case 'email sent':
          // Normalize boolean values
          return this.normalizeBoolean(trimmed);

        case 'urgencyband':
          // Normalize urgency band
          return this.normalizeUrgencyBand(trimmed);

        case 'last activity type':
          // Normalize activity type
          return this.normalizeActivityType(trimmed);

        default:
          return trimmed;
      }

    } catch (e) {
      console.warn('Field normalization error for ' + fieldName + ': ' + e.message);
      return value; // Return original if normalization fails
    }
  },

  /**
   * Convert string to proper case
   * @param {string} str - String to convert
   * @return {string} Proper case string
   */
  toProperCase: function(str) {
    try {
      if (!str || typeof str !== 'string') return '';

      return str.toLowerCase().replace(/\b\w/g, function(char) {
        return char.toUpperCase();
      });

    } catch (e) {
      console.warn('Proper case conversion error: ' + e.message);
      return str;
    }
  },

  /**
   * Normalize date format
   * @param {string} dateStr - Date string to normalize
   * @return {string} Normalized date string
   */
  normalizeDate: function(dateStr) {
    try {
      if (!dateStr || typeof dateStr !== 'string') return '';

      var trimmed = dateStr.trim();
      if (trimmed === '') return '';

      // Try to parse the date
      var date = new Date(trimmed);
      if (isNaN(date.getTime())) {
        return trimmed; // Return original if not a valid date
      }

      // Format as MM/DD/YYYY
      var month = (date.getMonth() + 1).toString().padStart(2, '0');
      var day = date.getDate().toString().padStart(2, '0');
      var year = date.getFullYear();

      return month + '/' + day + '/' + year;

    } catch (e) {
      console.warn('Date normalization error: ' + e.message);
      return dateStr;
    }
  },

  /**
   * Normalize contact status
   * @param {string} status - Contact status to normalize
   * @return {string} Normalized contact status
   */
  normalizeContactStatus: function(status) {
    try {
      if (!status || typeof status !== 'string') return '';

      var trimmed = status.trim().toLowerCase();

      // Map common variations to standard values
      var statusMap = {
        'never contacted': 'Never Contacted',
        'not contacted': 'Never Contacted',
        'new': 'Never Contacted',
        'disqualified': 'Disqualified',
        'lost': 'Lost',
        'warm': 'Warm',
        'hot': 'Hot',
        'cold': 'Cold',
        'won': 'Won',
        'nurture': 'Nurture',
        'prospect': 'Prospect',
        'outreach': 'Outreach',
        'active': 'Active',
        'inactive': 'Inactive'
      };

      return statusMap[trimmed] || this.toProperCase(trimmed);

    } catch (e) {
      console.warn('Contact status normalization error: ' + e.message);
      return status;
    }
  },

  /**
   * Normalize boolean values
   * @param {string} value - Boolean value to normalize
   * @return {string} Normalized boolean value
   */
  normalizeBoolean: function(value) {
    try {
      if (!value || typeof value !== 'string') return '';

      var trimmed = value.trim().toLowerCase();

      if (trimmed === 'true' || trimmed === 'yes' || trimmed === 'y') {
        return 'TRUE';
      } else if (trimmed === 'false' || trimmed === 'no' || trimmed === 'n') {
        return 'FALSE';
      } else {
        return trimmed.toUpperCase();
      }

    } catch (e) {
      console.warn('Boolean normalization error: ' + e.message);
      return value;
    }
  },

  /**
   * Normalize urgency band
   * @param {string} band - Urgency band to normalize
   * @return {string} Normalized urgency band
   */
  normalizeUrgencyBand: function(band) {
    try {
      if (!band || typeof band !== 'string') return '';

      var trimmed = band.trim().toLowerCase();

      // Map common variations to standard values
      var bandMap = {
        'high': 'High',
        'medium': 'Medium',
        'low': 'Low',
        'none': 'None',
        'urgent': 'High',
        'critical': 'High'
      };

      return bandMap[trimmed] || this.toProperCase(trimmed);

    } catch (e) {
      console.warn('Urgency band normalization error: ' + e.message);
      return band;
    }
  },

  /**
   * Normalize activity type
   * @param {string} type - Activity type to normalize
   * @return {string} Normalized activity type
   */
  normalizeActivityType: function(type) {
    try {
      if (!type || typeof type !== 'string') return '';

      var trimmed = type.trim().toLowerCase();

      // Map common variations to standard values
      var typeMap = {
        'in person': 'In Person',
        'phone': 'Phone',
        'email': 'Email',
        'text': 'Text',
        'visit': 'Visit',
        'call': 'Phone',
        'other': 'Other'
      };

      return typeMap[trimmed] || this.toProperCase(trimmed);

    } catch (e) {
      console.warn('Activity type normalization error: ' + e.message);
      return type;
    }
  },

  /**
   * Import normalized data to prospects sheet
   * @param {Array} data - Normalized data to import
   * @return {Object} Import result
   */
  importToProspectsSheet: function(data) {
    try {
      // Check spreadsheet access
      var accessResult = SharedUtils.checkSpreadsheetAccess('importToProspectsSheet');
      if (!accessResult.success) {
        throw new Error(accessResult.error);
      }

      var ss = accessResult.spreadsheet;
      var sheet = ss.getSheetByName(CONFIG.SHEETS.PROSPECTS);

      if (!sheet) {
        throw new Error('Prospects sheet not found: ' + CONFIG.SHEETS.PROSPECTS);
      }

      // Clear existing data (except headers if they exist)
      var existingData = sheet.getDataRange().getValues();
      var hasExistingHeaders = existingData.length > 0 &&
                              existingData[0].length > 0 &&
                              existingData[0][0].toString().trim() !== '';

      if (hasExistingHeaders) {
        // Clear data rows but keep headers
        var lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
        }
      } else {
        // Clear entire sheet
        sheet.clearContents();
      }

      // Write new data
      if (data.length > 0) {
        sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
      }

      return {
        success: true,
        importedRows: data.length > 0 ? data.length - 1 : 0 // Subtract header row
      };

    } catch (e) {
      return {
        success: false,
        error: e.message,
        details: {
          sheetName: CONFIG.SHEETS.PROSPECTS,
          dataRows: data.length
        }
      };
    }
  },

  /**
   * Import normalized data to outreach sheet
   * @param {Array} data - Normalized data to import
   * @return {Object} Import result
   */
  importToOutreachSheet: function(data) {
    try {
      // Check spreadsheet access
      var accessResult = SharedUtils.checkSpreadsheetAccess('importToOutreachSheet');
      if (!accessResult.success) {
        throw new Error(accessResult.error);
      }

      var ss = accessResult.spreadsheet;
      var sheet = ss.getSheetByName(CONFIG.SHEETS.OUTREACH);

      if (!sheet) {
        throw new Error('Outreach sheet not found: ' + CONFIG.SHEETS.OUTREACH);
      }

      // Clear existing data (except headers if they exist)
      var existingData = sheet.getDataRange().getValues();
      var hasExistingHeaders = existingData.length > 0 &&
                              existingData[0].length > 0 &&
                              existingData[0][0].toString().trim() !== '';

      if (hasExistingHeaders) {
        // Clear data rows but keep headers
        var lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
        }
      } else {
        // Clear entire sheet
        sheet.clearContents();
      }

      // Write new data
      if (data.length > 0) {
        sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
      }

      return {
        success: true,
        importedRows: data.length > 0 ? data.length - 1 : 0 // Subtract header row
      };

    } catch (e) {
      return {
        success: false,
        error: e.message,
        details: {
          sheetName: CONFIG.SHEETS.OUTREACH,
          dataRows: data.length
        }
      };
    }
  },

  /**
   * Enhanced version of getSettings that uses validated CSV data
   * @return {Object} Settings object
   */
  getValidatedData: function() {
    try {
      // First try to get settings from sheet (existing method)
      var sheetSettings = getSettings();

      // If sheet settings are empty or invalid, try to load from CSV
      if (!sheetSettings || Object.keys(sheetSettings).length === 0) {
        console.log('No settings found in sheet, attempting to load from CSV...');

        // Try to read CSV file and import it
        try {
          var csvFile = this.readSettingsCSVFile();
          if (csvFile.success && csvFile.csvText) {
            var importResult = this.importAndValidateSettingsCSV(csvFile.csvText);
            if (importResult.success) {
              console.log('Successfully imported settings from CSV');
              // Recursively call to get the now-imported settings
              return this.getValidatedSettings();
            } else {
              console.error('Failed to import CSV settings: ' + importResult.error);
            }
          }
        } catch (csvError) {
          console.error('Error reading CSV file: ' + csvError.message);
        }
      }

      return sheetSettings;

    } catch (e) {
      console.error('Error getting validated settings: ' + e.message);
      return {
        industryScores: {},
        urgencyBands: [],
        workflowRules: {},
        validationLists: {},
        globalConstants: {},
        followupTemplates: {}
      };
    }
  },

  /**
   * Read settings CSV file from script files
   * @return {Object} File read result
   */
  readSettingsCSVFile: function() {
    try {
      // This would need to be implemented based on your file storage method
      // For now, return a placeholder

      return {
        success: false,
        error: 'CSV file reading not implemented - use importAndValidateSettingsCSV with file content'
      };

    } catch (e) {
      return {
        success: false,
        error: e.message
      };
    }
  }
};

// Export main functions for global access
function validateAndImportProspectsCSV(csvText) {
  return DataValidation.validateAndImportProspectsCSV(csvText);
}

function validateAndImportOutreachCSV(csvText) {
  return DataValidation.validateAndImportOutreachCSV(csvText);
}
