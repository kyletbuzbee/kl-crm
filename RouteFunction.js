/**
 * Route Functions
 * Geocoding and Routing URL Generation.
 */

function updateGeocodes(batchLimit) {
  try {
    var limit = batchLimit || 15; // Process max 15 addresses per run

    // Use Safe-Fetch pattern: get headers dynamically instead of hardcoded indices
    var sheetAccess = SharedUtils.getSheetSafe(CONFIG.SHEETS.PROSPECTS, 'updateGeocodes');
    if (!sheetAccess.success) {
      console.error('Failed to access Prospects sheet: ' + sheetAccess.error);
      return { success: false, error: 'Failed to access Prospects sheet: ' + sheetAccess.error };
    }

    var sheet = sheetAccess.sheet;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var headerMap = {};

    // Create header mapping for dynamic column access
    headers.forEach(function(header, index) {
      if (header) {
        headerMap[SharedUtils.normalizeHeader(header)] = index;
      }
    });

    // Get data using Safe-Fetch pattern
    var prospects = SharedUtils.getSafeSheetData(CONFIG.SHEETS.PROSPECTS, ['Address', 'Latitude', 'Longitude']);

    var processedCount = 0;

    prospects.forEach(function(p) {
      if (processedCount >= limit) return; // Stop if limit reached

      // Use header mapping to get column indices
      var addressIndex = headerMap['address'];
      var latitudeIndex = headerMap['latitude'];
      var longitudeIndex = headerMap['longitude'];

      if (addressIndex === undefined || latitudeIndex === undefined || longitudeIndex === undefined) {
        console.warn('Required columns not found in Prospects sheet. Skipping geocoding.');
        return;
      }

      // Get values using header mapping
      var address = addressIndex !== undefined ? p[addressIndex] : p['address'];
      var latitude = latitudeIndex !== undefined ? p[latitudeIndex] : p['latitude'];
      var longitude = longitudeIndex !== undefined ? p[longitudeIndex] : p['longitude'];

      if (address && (!latitude || latitude === '')) {
        Utilities.sleep(500); // Rate limiting
        try {
          var geo = Maps.newGeocoder().geocode(address);
          if (geo.status === 'OK' && geo.results.length > 0) {
            var loc = geo.results[0].geometry.location;
            updateCellSafe(CONFIG.SHEETS.PROSPECTS, p._rowIndex, 'Latitude', loc.lat);
            updateCellSafe(CONFIG.SHEETS.PROSPECTS, p._rowIndex, 'Longitude', loc.lng);
            processedCount++;
          }
        } catch (e) {
          console.error('Geocode error for address: ' + address + ' - Error: ' + e.message);
        }
      }
    });

    console.log('Processed ' + processedCount + ' geocodes.');
    return { success: true, data: { processedCount: processedCount } };
  } catch (e) {
    console.error('updateGeocodes error: ' + e.message);
    return { success: false, error: 'updateGeocodes failed: ' + e.message };
  }
}

/**
 * Builds a valid Google Maps Navigation URL.
 * Format: https://www.google.com/maps/dir/Current+Location/Address1/Address2/...
 */
function buildRouteUrl(companyNames) {
  try {
    if (!companyNames || companyNames.length === 0) {
      return { success: false, message: 'No companies selected.' };
    }

    // Get prospect data for address/coord lookup
    var prospects = SharedUtils.getSafeSheetData(CONFIG.SHEETS.PROSPECTS, ['Company Name', 'Address', 'Latitude', 'Longitude']);
    var prospectMap = {};
    prospects.forEach(function(p) {
      var key = (p['company name'] || '').toLowerCase().trim();
      prospectMap[key] = p;
    });

    var routeParts = ["Current+Location"];
    var failures = [];

    companyNames.forEach(function(name) {
      var key = (name || '').toLowerCase().trim();
      var p = prospectMap[key];

      if (p) {
        if (p['latitude'] && p['longitude'] && p['latitude'] !== '') {
          routeParts.push(p['latitude'] + ',' + p['longitude']);
        } else if (p['address']) {
          routeParts.push(encodeURIComponent(p['address']));
        } else {
          failures.push(name);
        }
      } else {
        failures.push(name);
      }
    });

    if (routeParts.length <= 1) {
      return { success: false, message: 'No valid addresses or coordinates found.', data: { failures: failures } };
    }

    // MODERN URL FORMAT: https://www.google.com/maps/dir/Start/Stop1/Stop2/...
    var finalUrl = "https://www.google.com/maps/dir/" + routeParts.join("/");

    return { success: true, data: { url: finalUrl, failures: failures } };
  } catch (e) {
    console.error('Error building route URL:', e.message);
    return { success: false, message: 'Route URL generation failed: ' + e.message };
  }
}

/**
 * Generates route for companies - called by dashboard
 */
function generateRouteForCompanies(companies) {
  try {
    var result = buildRouteUrl(companies);

    if (result.success) {
      var url = result.data.url;
      var failures = result.data.failures || [];

      if (url) {
        // Open the route in a new window/tab
        return {
          success: true,
          data: {
            url: url,
            failures: failures
          }
        };
      } else {
        return {
          success: false,
          error: 'Could not generate route URL. No valid addresses found.',
          data: { failures: failures }
        };
      }
    } else {
      return {
        success: false,
        error: result.message || 'Route generation failed'
      };
    }
  } catch (e) {
    console.error('Error generating route:', e.message);
    return {
      success: false,
      error: 'Route generation error: ' + e.message
    };
  }
}
