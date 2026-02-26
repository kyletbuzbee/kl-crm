/**
 * Fuzzy Matching Utilities for K&L Recycling CRM
 * Handles company name/ID differences between Outreach and Prospects sheets
 * Version: 1.0.0
 */

/**
 * Fuzzy matching for company names and IDs
 * Handles differences in spelling, spacing, case, and ID formats
 * @param {Object} outreachData - Outreach record with company info
 * @param {Array} prospectsData - Array of prospect records
 * @return {Object} Match result with match, matchType, and confidence
 */
function fuzzyMatchCompany(outreachData, prospectsData) {
  try {
    var outreachName = (outreachData.company || outreachData.companyName || '').toString().toLowerCase().trim();
    var outreachId = (outreachData.companyId || '').toString().trim();

    // Try exact ID match first (most reliable)
    if (outreachId) {
      var idMatch = prospectsData.find(function(p) {
        var prospectId = (p['company id'] || '').toString().trim();
        return prospectId === outreachId;
      });
      if (idMatch) {
        return { match: idMatch, matchType: 'EXACT_ID', confidence: 1.0 };
      }
    }

    // Try exact name match (after normalization)
    var normalizedOutreachName = normalizeCompanyName(outreachName);
    var nameMatch = prospectsData.find(function(p) {
      var prospectName = (p['company name'] || '').toString().toLowerCase().trim();
      var normalizedProspectName = normalizeCompanyName(prospectName);
      return normalizedProspectName === normalizedOutreachName && normalizedOutreachName.length > 0;
    });
    if (nameMatch) {
      return { match: nameMatch, matchType: 'EXACT_NAME', confidence: 1.0 };
    }

    // Try fuzzy name match (handles typos, spacing, punctuation)
    var bestMatch = null;
    var bestScore = 0;

    prospectsData.forEach(function(p) {
      var prospectName = (p['company name'] || '').toString().toLowerCase().trim();
      var score = calculateStringSimilarity(outreachName, prospectName);

      if (score > bestScore && score >= 0.75) { // Threshold at 75% for better matching
        bestScore = score;
        bestMatch = p;
      }
    });

    if (bestMatch) {
      return { match: bestMatch, matchType: 'FUZZY_NAME', confidence: bestScore };
    }

    // No match found
    return { match: null, matchType: 'NONE', confidence: 0 };
  } catch (error) {
    console.error('Error in fuzzyMatchCompany:', error);
    return { match: null, matchType: 'ERROR', confidence: 0 };
  }
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns score between 0 (no match) and 1 (perfect match)
 * @param {string} str1 - First string to compare
 * @param {string} str2 - Second string to compare
 * @return {number} Similarity score between 0 and 1
 */
function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  // Normalize strings for better comparison
  var norm1 = normalizeCompanyName(str1);
  var norm2 = normalizeCompanyName(str2);
  
  if (norm1 === norm2) return 1;
  
  var len1 = norm1.length;
  var len2 = norm2.length;
  var maxLen = Math.max(len1, len2);
  
  if (maxLen === 0) return 1;
  
  // Calculate Levenshtein distance on normalized strings
  var distance = levenshteinDistance(norm1, norm2);
  var similarity = 1 - (distance / maxLen);
  
  return similarity;
}

/**
 * Levenshtein distance algorithm for string comparison
 * Measures the minimum number of single-character edits needed to change one string into another
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @return {number} Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
  try {
    str1 = str1 || '';
    str2 = str2 || '';
    
    var matrix = [];
    
    for (var i = 0; i <= str1.length; i++) {
      matrix[i] = [i];
    }
    
    for (var j = 0; j <= str2.length; j++) {
      matrix[0][j] = j;
    }
    
    for (var i = 1; i <= str1.length; i++) {
      for (var j = 1; j <= str2.length; j++) {
        if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }
    
    return matrix[str1.length][str2.length];
  } catch (e) {
    console.error('levenshteinDistance error:', e.message);
    return 0;
  }
}

/**
 * Normalize company name for comparison
 * Removes common suffixes, punctuation, and standardizes format
 * @param {string} name - Company name to normalize
 * @return {string} Normalized company name
 */
function normalizeCompanyName(name) {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .toLowerCase()
    .trim()
    // Remove common company suffixes
    .replace(/\s+(llc|inc|ltd|corp|corporation|company|co\.?)$/gi, '')
    // Remove punctuation except spaces
    .replace(/[.,#&!@$%^*(){}[\]|\\:;"'<>,?/~`]/g, '')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// Export for use in other files
if (typeof exports !== 'undefined') {
  exports.fuzzyMatchCompany = fuzzyMatchCompany;
  exports.calculateStringSimilarity = calculateStringSimilarity;
  exports.levenshteinDistance = levenshteinDistance;
  exports.normalizeCompanyName = normalizeCompanyName;
}
