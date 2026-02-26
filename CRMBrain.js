/**
 * CRMBrain.js - Local Rules-Based Intelligence Engine
 * Runs 100% locally in Google Apps Script. No API keys required.
 * 
 * Tier 2 Business Service - Entity-specific intelligence rules
 * 
 * Configuration:
 * - Keywords loaded from Settings via getGlobalConstants
 * - Falls back to hardcoded defaults if Settings unavailable
 */

// Default keyword sets (fallback if Settings not available)
var BRAIN_DEFAULTS = {
  // Competitors - East Texas recycling competitors
  competitors: [
    'aim', 'aim recycling', 'tyler iron', 'huntwell', 'east texas recycling',
    'longview recycling', 'metal depot', 'texarkana scrap', 'pitman', 'sims',
    'scrap metal', 'junk king', '1-800-got-junk'
  ],
  // High-Value Materials - recyclable metals and materials
  valuableMaterials: [
    'copper', 'copper wire', 'copper pipe', 'bare bright copper',
    'brass', 'brass fittings', 'brass valves', 'yellow brass',
    'radiator', 'radiators', 'ac radiator', 'car radiator',
    'wire', 'insulated wire', 'thhn wire', 'magnet wire', ' enamelled wire',
    'aluminum', 'aluminum cans', 'aluminum extrusion', 'aluminum siding',
    'steel', 'stainless steel', 'stainless', 'galvanized',
    'lead', 'battery', 'batteries', 'cat converter', 'catalytic converter',
    'electronics', 'e-waste', 'circuit board', 'pcb',
    'alloy', 'monel', 'inconel', 'hastelloy',
    'nickel', 'titanium', 'zinc', 'tin'
  ],
  // Logistics & Container Keywords
  logisticsKeywords: [
    'roll off', 'roll-off', 'rolloff', 'container', 'dumpster',
    'lugger', 'lugger truck', 'bin', 'drop bin', 'drop off',
    'pickup', 'pickup truck', 'need pickup', 'can pickup',
    'truck', 'trailer', 'semi', 'flatbed',
    'space issue', 'no space', 'tight space', 'limited access',
    'corner', 'hard to get to', 'difficult access', 'no parking',
    'crane', 'forklift', 'need crane', 'overhead lift',
    'hoist', 'loading dock', 'dock', 'no dock',
    'scheduling', 'need schedule', 'when can', 'call first',
    'pole', 'pole barn', 'building', 'roof', 'hvac', 'unit'
  ],
  // Pricing & Quote Keywords
  pricingKeywords: [
    'price', 'pricing', 'quote', 'quotes', 'rate', 'rates',
    'how much', 'per pound', 'per ton', 'lb', 'pound',
    'today price', 'current price', 'market', 'market price',
    'cheaper', 'better price', 'beat price', 'match price',
    'invoice', 'pay', 'payment', 'check', 'cash'
  ],
  // Service & Action Keywords
  serviceKeywords: [
    'service', 'pickup', 'delivery', 'remove', 'haul',
    'demo', 'demolition', 'teardown', 'cleanout',
    'estate', 'hoarder', 'clear', 'clean', 'junk',
    'construction', 'job site', 'jobsite', 'contractor'
  ],
  // Urgent/Hot Lead Keywords
  urgentKeywords: [
    'asap', 'urgent', 'immediately', 'today', 'right now',
    'hot', 'ready', 'decision maker', 'owner', 'president',
    'deadline', 'end of', 'by friday', 'this week'
  ],
  staleDaysThreshold: 14,
  hotScoreThreshold: 80,
  recentDaysWindow: 90,
  logisticsMatchThreshold: 1
};

var CRMBrain = {
  
  /**
   * Load brain configuration from Settings
   * Uses getGlobalConstants pattern from kl-crm.md
   */
  _loadConfig: function() {
    try {
      // Try to load from Settings via global constants pattern
      var settings = typeof getGlobalConstants === 'function' 
        ? getGlobalConstants() 
        : null;
      
      return {
        competitors: settings && settings.BRAIN_COMPETITORS 
          ? settings.BRAIN_COMPETITORS.split(',').map(function(s) { return s.trim().toLowerCase(); })
          : BRAIN_DEFAULTS.competitors,
        valuableMaterials: settings && settings.BRAIN_MATERIALS
          ? settings.BRAIN_MATERIALS.split(',').map(function(s) { return s.trim().toLowerCase(); })
          : BRAIN_DEFAULTS.valuableMaterials,
        logisticsKeywords: settings && settings.BRAIN_LOGISTICS
          ? settings.BRAIN_LOGISTICS.split(',').map(function(s) { return s.trim().toLowerCase(); })
          : BRAIN_DEFAULTS.logisticsKeywords,
        staleDaysThreshold: settings && settings.BRAIN_STALE_DAYS
          ? parseInt(settings.BRAIN_STALE_DAYS, 10)
          : BRAIN_DEFAULTS.staleDaysThreshold,
        hotScoreThreshold: settings && settings.BRAIN_HOT_SCORE
          ? parseInt(settings.BRAIN_HOT_SCORE, 10)
          : BRAIN_DEFAULTS.hotScoreThreshold,
        recentDaysWindow: settings && settings.BRAIN_RECENT_DAYS
          ? parseInt(settings.BRAIN_RECENT_DAYS, 10)
          : BRAIN_DEFAULTS.recentDaysWindow,
        logisticsMatchThreshold: settings && settings.BRAIN_LOGISTICS_THRESHOLD
          ? parseInt(settings.BRAIN_LOGISTICS_THRESHOLD, 10)
          : BRAIN_DEFAULTS.logisticsMatchThreshold
      };
    } catch (e) {
      // Fallback to defaults on any error
      return BRAIN_DEFAULTS;
    }
  },

  /**
   * Main entry point for the frontend to ask the brain for a pipeline summary
   * @returns {Object} Standardized return: {success: boolean, data: Object, error: string|null}
   */
  getPipelineInsights: function() {
    try {
      // Load configuration (from Settings or defaults)
      var config = CRMBrain._loadConfig();
      
      // Use CONFIG for sheet access per kl-crm.md standards
      var prospects = SharedUtils.getSafeSheetData(CONFIG.SHEETS.PROSPECTS) || [];
      var outreach = SharedUtils.getSafeSheetData(CONFIG.SHEETS.OUTREACH) || [];
      
      var insights = {
        competitorRisks: [],
        highValueOpportunities: [],
        logisticsActionNeeded: [],
        staleHotLeads: [],
        pricingInquiries: [],
        serviceRequests: [],
        urgentLeads: []
      };

      // Analyze Prospects - Find Stale Hot Leads
      prospects.forEach(function(p) {
        // Schema normalization: handle both camelCase and space-separated headers
        var status = (p['Contact Status'] || p.contactStatus || '').toLowerCase();
        var daysSince = parseInt(p['Days Since Last Contact'] || p.daysSinceLastContact || 0);
        var score = parseInt(p['Priority Score'] || p.priorityScore || 0);
        
        // Find Stale Hot Leads (High priority, but ignored too long)
        if ((status.includes('hot') || score > config.hotScoreThreshold) && daysSince > config.staleDaysThreshold) {
          insights.staleHotLeads.push({
            company: p['Company Name'] || p.companyName,
            daysSince: daysSince,
            score: score
          });
        }
      });

      // Analyze Recent Outreach Notes
      var thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - config.recentDaysWindow);

      outreach.forEach(function(o) {
        // Schema normalization for field names
        var note = (o['Notes'] || o.notes || '').toLowerCase();
        var company = o['Company'] || o.company || 'Unknown';
        var dateStr = o['Visit Date'] || o.visitDate;
        
        if (!note || !dateStr) return;
        
        var visitDate = new Date(dateStr);
        if (visitDate < thirtyDaysAgo) return; // Only look at recent notes

        var analysis = CRMBrain.analyzeNoteText(note, config);

        if (analysis.competitorMentioned) {
          insights.competitorRisks.push({
            company: company,
            competitors: analysis.competitorsFound,
            date: dateStr
          });
        }

        if (analysis.highValueMaterial) {
          insights.highValueOpportunities.push({
            company: company,
            materials: analysis.materialsFound,
            noteSnippet: note.substring(0, 50) + '...'
          });
        }

        if (analysis.logisticsMentioned) {
          insights.logisticsActionNeeded.push({
            company: company,
            issue: 'Logistics/Container coordination mentioned',
            date: dateStr
          });
        }

        if (analysis.pricingInquiry) {
          insights.pricingInquiries.push({
            company: company,
            noteSnippet: note.substring(0, 50) + '...',
            date: dateStr
          });
        }

        if (analysis.serviceRequest) {
          insights.serviceRequests.push({
            company: company,
            noteSnippet: note.substring(0, 50) + '...',
            date: dateStr
          });
        }

        if (analysis.urgentLead) {
          insights.urgentLeads.push({
            company: company,
            noteSnippet: note.substring(0, 50) + '...',
            date: dateStr
          });
        }
      });

      // Log to System_OpsLog per kl-crm.md workflow
      if (typeof getGlobalConstant === 'function') {
        try {
          getGlobalConstant('System_OpsLog');
        } catch (logError) {
          // Silently fail logging - don't break main functionality
        }
      }

      return { 
        success: true, 
        data: insights,
        error: null 
      };

    } catch (e) {
      console.error('CRMBrain Error:', e.message, e.stack);
      return { 
        success: false, 
        data: null, 
        error: e.message 
      };
    }
  },

  /**
   * The core logic that "reads" your notes
   * @param {string} noteText - The text to analyze
   * @param {Object} config - Configuration object (optional, loads defaults if not provided)
   * @returns {Object} Analysis result with flags and detected items
   */
  analyzeNoteText: function(noteText, config) {
    // Use provided config or load defaults
    config = config || CRMBrain._loadConfig();
    
    var result = {
      competitorMentioned: false,
      competitorsFound: [],
      highValueMaterial: false,
      materialsFound: [],
      logisticsMentioned: false,
      pricingInquiry: false,
      pricingKeywords: [],
      serviceRequest: false,
      serviceKeywords: [],
      urgentLead: false,
      urgentKeywords: []
    };

    if (!noteText || typeof noteText !== 'string') {
      return result;
    }

    // 1. Competitor Detection (configurable via Settings)
    config.competitors.forEach(function(comp) {
      if (noteText.indexOf(comp) !== -1) {
        result.competitorMentioned = true;
        result.competitorsFound.push(comp);
      }
    });

    // 2. High-Value Material Detection (configurable via Settings)
    config.valuableMaterials.forEach(function(mat) {
      if (noteText.indexOf(mat) !== -1) {
        result.highValueMaterial = true;
        result.materialsFound.push(mat);
      }
    });

    // 3. Logistics & Route Signals (configurable via Settings)
    var logisticsMatchCount = 0;
    config.logisticsKeywords.forEach(function(keyword) {
      if (noteText.indexOf(keyword) !== -1) {
        logisticsMatchCount++;
      }
    });
    
    // If they mention N or more logistics words, it usually requires dispatch coordination
    if (logisticsMatchCount >= config.logisticsMatchThreshold) {
      result.logisticsMentioned = true;
    }

    // 4. Pricing & Quote Detection
    var pricingMatchCount = 0;
    config.pricingKeywords.forEach(function(keyword) {
      if (noteText.indexOf(keyword) !== -1) {
        pricingMatchCount++;
        if (result.pricingKeywords.indexOf(keyword) === -1) {
          result.pricingKeywords.push(keyword);
        }
      }
    });
    result.pricingInquiry = pricingMatchCount >= 1;

    // 5. Service Request Detection
    var serviceMatchCount = 0;
    config.serviceKeywords.forEach(function(keyword) {
      if (noteText.indexOf(keyword) !== -1) {
        serviceMatchCount++;
        if (result.serviceKeywords.indexOf(keyword) === -1) {
          result.serviceKeywords.push(keyword);
        }
      }
    });
    result.serviceRequest = serviceMatchCount >= 1;

    // 6. Urgent Lead Detection
    var urgentMatchCount = 0;
    config.urgentKeywords.forEach(function(keyword) {
      if (noteText.indexOf(keyword) !== -1) {
        urgentMatchCount++;
        if (result.urgentKeywords.indexOf(keyword) === -1) {
          result.urgentKeywords.push(keyword);
        }
      }
    });
    result.urgentLead = urgentMatchCount >= 1;

    return result;
  }
};
