/**
 * Prospect Scoring Service
 * Calculates scores based on Industry and Recency.
 */

function calculateProspectScores(prospect, settings) {
  // Enhanced Industry Score with keyword matching - FIX: Use Title Case header
  var industry = prospect['Industry'] || prospect['industry'];
  var industryScore = calculateIndustryScore(industry, settings);

  // Advanced Urgency Score using URGENCY_BAND configuration - FIX: Use Title Case header
  var daysSince = prospect['Days Since Last Contact'] || prospect['days since last contact'];
  var urgencyResult = calculateUrgencyScore(daysSince, settings);

  // Get stale prospect threshold from global constants
  var staleDaysThreshold = settings.globalConstants['Stale_Prospect_Days'] ?
    settings.globalConstants['Stale_Prospect_Days'].value : 60;

  // Mark as stale if beyond threshold
  var isStale = urgencyResult.daysSince > staleDaysThreshold;

  // Adjust based on Priority (with stale penalty)
  var priorityMultiplier = isStale ? 0.3 : 1.0; // Reduce priority for stale prospects
  var totalScore = (industryScore.score * 0.6 * priorityMultiplier) + (urgencyResult.score * 0.4);

  return {
    priorityScore: Math.round(industryScore.score * priorityMultiplier),
    urgencyScore: urgencyResult.score,
    urgencyBand: urgencyResult.band,
    totalScore: Math.round(totalScore),
    industryMatch: industryScore.matchType,
    isStale: isStale,
    daysSince: urgencyResult.daysSince
  };
}

/**
 * Calculate industry score using keyword matching
 */
function calculateIndustryScore(industry, settings) {
  if (!industry || !settings.industryScores) {
    return { score: 50, matchType: 'default' };
  }

  var industryLower = String(industry).toLowerCase().trim();

  // First try exact match
  if (settings.industryScores[industryLower]) {
    return {
      score: settings.industryScores[industryLower].score,
      matchType: 'exact'
    };
  }

  // Then try keyword matching
  for (var industryName in settings.industryScores) {
    var industryConfig = settings.industryScores[industryName];
    if (industryConfig.keywords && industryConfig.keywords.length > 0) {
      for (var i = 0; i < industryConfig.keywords.length; i++) {
        var keyword = industryConfig.keywords[i];
        if (industryLower.indexOf(keyword) !== -1) {
          return {
            score: industryConfig.score,
            matchType: 'keyword',
            matchedKeyword: keyword,
            matchedIndustry: industryName
          };
        }
      }
    }
  }

  // Default fallback
  return { score: 50, matchType: 'default' };
}

/**
 * Calculate urgency score using URGENCY_BAND configuration
 */
function calculateUrgencyScore(daysSinceRaw, settings) {
  var daysSince = parseInt(daysSinceRaw) || 0;
  var defaultUrgency = { score: 20, band: 'Low', daysSince: daysSince };

  // Handle undefined settings
  if (!settings) {
    return defaultUrgency;
  }

  if (!settings.urgencyBands || settings.urgencyBands.length === 0) {
    return defaultUrgency;
  }

  // Find matching urgency band
  for (var i = 0; i < settings.urgencyBands.length; i++) {
    var band = settings.urgencyBands[i];
    if (daysSince >= band.min && daysSince <= band.max) {
      var score;
      // Calculate score based on band (higher urgency = higher score)
      if (band.name === 'Overdue') {
        score = 95;
      } else if (band.name === 'High') {
        score = 85;
      } else if (band.name === 'Medium') {
        score = 65;
      } else if (band.name === 'Low') {
        score = 25;
      } else {
        score = 50; // Default
      }

      return {
        score: score,
        band: band.name,
        color: band.color,
        daysSince: daysSince
      };
    }
  }

  // Fallback for out-of-range values
  return defaultUrgency;
}

/**
 * Settings cache to avoid repeated reads from the sheet
 */
var SettingsCache = {
  cache: null,
  lastUpdated: null,
  TTL: 5 * 60 * 1000, // 5 minutes cache TTL

  /**
   * Get cached settings or fetch from sheet if cache is stale
   */
  getSettings: function() {
    var now = new Date().getTime();
    
    // Check if cache exists and is still valid
    if (this.cache && this.lastUpdated && (now - this.lastUpdated) < this.TTL) {
      return this.cache;
    }

    // Cache is stale or doesn't exist, fetch from sheet
    try {
      var settings = getSettings();
      this.cache = settings;
      this.lastUpdated = now;
      return settings;
    } catch (e) {
      console.error('Failed to fetch settings for cache:', e.message);
      
      // Return default settings if fetch fails
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
   * Clear the settings cache
   */
  clearCache: function() {
    this.cache = null;
    this.lastUpdated = null;
  },

  /**
   * Invalidate cache (force refresh on next access)
   */
  invalidateCache: function() {
    this.lastUpdated = 0;
  }
};

function runBatchScoring() {
  // Use cached settings to avoid repeated reads
  var settings = SettingsCache.getSettings();
  var prospects = SharedUtils.getSafeSheetData(CONFIG.SHEETS.PROSPECTS, ['Company ID', 'Industry', 'Days Since Last Contact']);
  
  // Process in batches for better performance
  var batchSize = 50;
  var totalProcessed = 0;
  var errors = [];

  for (var i = 0; i < prospects.length; i += batchSize) {
    var batch = prospects.slice(i, i + batchSize);
    var batchUpdates = [];
    
    batch.forEach(function(p) {
      try {
        var scores = calculateProspectScores(p, settings);
        
        // Collect updates for batch processing
        batchUpdates.push({
          rowIndex: p._rowIndex,
          priorityScore: scores.priorityScore,
          urgencyScore: scores.urgencyScore,
          urgencyBand: scores.urgencyBand
        });
        
        totalProcessed++;
      } catch (e) {
        errors.push({
          rowIndex: p._rowIndex,
          error: e.message
        });
        console.error('Error calculating scores for prospect at row ' + p._rowIndex + ':', e.message);
      }
    });

    // Apply batch updates for better performance
    if (batchUpdates.length > 0) {
      applyBatchScoreUpdates(batchUpdates);
    }

    // Small delay between batches to avoid rate limits
    if (i + batchSize < prospects.length) {
      Utilities.sleep(100);
    }
  }

  // Log summary
  console.log('Batch scoring completed. Processed: ' + totalProcessed + ', Errors: ' + errors.length);
  
  if (errors.length > 0) {
    console.warn('Errors encountered during scoring:', errors);
  }

  return {
    success: true,
    processed: totalProcessed,
    errors: errors.length,
    errorDetails: errors
  };
}

/**
 * Apply batch updates to the sheet for better performance
 * @param {Array} updates - Array of update objects
 */
function applyBatchScoreUpdates(updates) {
  try {
    var accessResult = SharedUtils.checkSpreadsheetAccess('applyBatchScoreUpdates');
    if (!accessResult.success) {
      throw new Error(accessResult.error);
    }

    var ss = accessResult.spreadsheet;
    var sheet = ss.getSheetByName(CONFIG.SHEETS.PROSPECTS);

    if (!sheet) {
      throw new Error('Prospects sheet not found: ' + CONFIG.SHEETS.PROSPECTS);
    }

    // Get headers to find column indices
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var headerMap = {};
    
    headers.forEach(function(header, index) {
      if (header) {
        headerMap[SharedUtils.normalizeHeader(header)] = index;
      }
    });

    var priorityScoreIndex = headerMap['priority score'];
    var urgencyScoreIndex = headerMap['urgency score'];
    var urgencyBandIndex = headerMap['urgencyband'];

    if (priorityScoreIndex === undefined || urgencyScoreIndex === undefined || urgencyBandIndex === undefined) {
      throw new Error('Required columns not found in Prospects sheet');
    }

    // FIX: Read existing data for all rows to be updated
    var startRow = Math.min.apply(null, updates.map(function(u) { return u.rowIndex; }));
    var endRow = Math.max.apply(null, updates.map(function(u) { return u.rowIndex; }));
    var numRows = endRow - startRow + 1;
    
    // Read existing row data to preserve all columns
    var existingData = sheet.getRange(startRow, 1, numRows, headers.length).getValues();
    
    // Create a map of rowIndex -> existing row data
    var rowDataMap = {};
    existingData.forEach(function(row, index) {
      var actualRowIndex = startRow + index;
      rowDataMap[actualRowIndex] = row;
    });

    // Update only the specific columns in each row
    updates.forEach(function(update) {
      var row = rowDataMap[update.rowIndex];
      if (row) {
        row[priorityScoreIndex] = update.priorityScore;
        row[urgencyScoreIndex] = update.urgencyScore;
        row[urgencyBandIndex] = update.urgencyBand;
      }
    });

    // Convert map back to array for writing
    var updateData = [];
    for (var i = startRow; i <= endRow; i++) {
      if (rowDataMap[i]) {
        updateData.push(rowDataMap[i]);
      }
    }

    // Apply batch update with preserved data
    if (updateData.length > 0) {
      var targetRange = sheet.getRange(startRow, 1, updateData.length, headers.length);
      targetRange.setValues(updateData);
    }

    console.log('Successfully updated ' + updates.length + ' prospect scores');

  } catch (e) {
    console.error('Batch update failed:', e.message);
    throw e;
  }
}
