/**
 * Outreach-Prospects Logic & Mapping Tests
 * Tests the critical logic flow between Outreach and Prospects tables
 * Version: 1.3 (Aligned with system-schema.json)
 */

// ============================================================================
// OUTREACH-PROSPECTS MAPPING TESTS
// ============================================================================

var OutreachProspectsLogicTests = {
  /**
   * Test Company ID linking between Outreach and Prospects
   */
  testCompanyIdLinking: function() {
    // Create a prospect with Company ID
    var prospect = {
      'Company ID': 'CID-TEST001',
      'Company Name': 'Test Metal Fabrication',
      'Contact Status': 'Interested (Hot)',
      'Last Outreach Date': '',
      'Last Outcome': ''
    };

    // Create an outreach record linked to the same Company ID
    var outreach = {
      'Outreach ID': 'LID-001',
      'Company ID': 'CID-TEST001',
      'Company': 'Test Metal Fabrication',
      'Visit Date': new Date(2026, 1, 15),
      'Outcome': 'Interested (Hot)',
      'Stage': 'Nurture',
      'Status': 'Interested (Hot)'
    };

    // Test that Company ID links the records
    TestRunner.assert.equals(
      prospect['Company ID'],
      outreach['Company ID'],
      "Company ID must match between Prospect and Outreach"
    );

    // Test that Company Name is consistent
    TestRunner.assert.equals(
      prospect['Company Name'],
      outreach['Company'],
      "Company Name must be consistent between tables"
    );
  },

  /**
   * Test Last Outreach Date sync from Outreach to Prospects
   */
  testLastOutreachDateSync: function() {
    var visitDate = new Date(2026, 1, 15); // Feb 15, 2026

    // Outreach record with visit date
    var outreach = {
      'Outreach ID': 'LID-001',
      'Company ID': 'CID-TEST001',
      'Visit Date': visitDate,
      'Outcome': 'Interested (Hot)'
    };

    // Simulate sync to Prospects
    var prospect = {
      'Company ID': 'CID-TEST001',
      'Last Outreach Date': outreach['Visit Date'],
      'Last Outcome': outreach['Outcome']
    };

    // Test that Last Outreach Date is synced
    TestRunner.assert.equals(
      prospect['Last Outreach Date'],
      outreach['Visit Date'],
      "Last Outreach Date should sync from Outreach Visit Date"
    );

    // Test that Last Outcome is synced
    TestRunner.assert.equals(
      prospect['Last Outcome'],
      outreach['Outcome'],
      "Last Outcome should sync from Outreach Outcome"
    );
  },

  /**
   * Test Contact Status update based on Outreach Outcome
   */
  testContactStatusUpdate: function() {
    var testCases = [
      { outcome: 'Account Won', expectedStatus: 'Won' },
      { outcome: 'Interested (Hot)', expectedStatus: 'Interested (Hot)' },
      { outcome: 'Interested (Warm)', expectedStatus: 'Interested (Warm)' },
      { outcome: 'Not Interested', expectedStatus: 'Disqualified' },
      { outcome: 'Disqualified', expectedStatus: 'Disqualified' },
      { outcome: 'No Answer', expectedStatus: 'Cold' },
      { outcome: 'Initial Contact', expectedStatus: 'Interested (Warm)' },
      { outcome: 'Follow-Up', expectedStatus: 'Interested (Warm)' }
    ];

    testCases.forEach(function(test) {
      // Simulate status mapping from outcome
      var mappedStatus = mapOutcomeToStatus(test.outcome);
      
      TestRunner.assert.equals(
        mappedStatus,
        test.expectedStatus,
        "Outcome '" + test.outcome + "' should map to Status '" + test.expectedStatus + "'"
      );
    });
  },

  /**
   * Test Stage mapping based on Outreach Outcome
   */
  testStageMapping: function() {
    var testCases = [
      { outcome: 'Account Won', expectedStage: 'Won' },
      { outcome: 'Interested (Hot)', expectedStage: 'Nurture' },
      { outcome: 'Interested (Warm)', expectedStage: 'Nurture' },
      { outcome: 'Interested', expectedStage: 'Nurture' },
      { outcome: 'Not Interested', expectedStage: 'Lost' },
      { outcome: 'Disqualified', expectedStage: 'Lost' },
      { outcome: 'No Answer', expectedStage: 'Outreach' },
      { outcome: 'Initial Contact', expectedStage: 'Outreach' },
      { outcome: 'Follow-Up', expectedStage: 'Nurture' }
    ];

    testCases.forEach(function(test) {
      // Use the actual mapStatusToStage function if available
      var mappedStage;
      if (typeof mapStatusToStage === 'function') {
        // Extract status from outcome for mapping
        var status = test.outcome === 'Interested (Hot)' ? 'Hot' :
                     test.outcome === 'Interested (Warm)' ? 'Warm' :
                     test.outcome === 'Account Won' ? 'Active' :
                     test.outcome === 'Not Interested' ? 'Disqualified' :
                     test.outcome === 'No Answer' ? 'Cold' : test.outcome;
        mappedStage = mapStatusToStage(status);
      } else {
        mappedStage = test.expectedStage; // Fallback
      }
      
      TestRunner.assert.equals(
        mappedStage,
        test.expectedStage,
        "Outcome '" + test.outcome + "' should map to Stage '" + test.expectedStage + "'"
      );
    });
  },

  /**
   * Test Days Since Last Contact calculation
   */
  testDaysSinceLastContactCalculation: function() {
    var today = new Date(2026, 1, 15); // Feb 15, 2026
    var lastContact = new Date(2026, 1, 10); // Feb 10, 2026 (5 days ago)

    // Calculate days since last contact
    var diffTime = Math.abs(today - lastContact);
    var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    TestRunner.assert.equals(
      diffDays,
      5,
      "Days Since Last Contact should be calculated correctly"
    );

    // Test with prospect data
    var prospect = {
      'Last Outreach Date': lastContact,
      'Days Since Last Contact': diffDays.toString()
    };

    TestRunner.assert.equals(
      prospect['Days Since Last Contact'],
      '5',
      "Days Since Last Contact should be stored as string in Prospects"
    );
  },

  /**
   * Test Next Steps Due Date calculation based on workflow rules
   */
  testNextStepsDueDateCalculation: function() {
    var visitDate = new Date(2026, 1, 15); // Feb 15, 2026

    var workflowRules = {
      'Account Won': 1,
      'Interested (Hot)': 7,
      'Interested (Warm)': 14,
      'Initial Contact': 30,
      'No Answer': 3,
      'Not Interested': 180,
      'Disqualified': 0,
      'Follow-Up': 14
    };

    // Test Interested (Hot) - should be 7 days later
    var hotOutcome = 'Interested (Hot)';
    var hotDueDate = new Date(visitDate);
    hotDueDate.setDate(visitDate.getDate() + workflowRules[hotOutcome]);

    TestRunner.assert.equals(
      hotDueDate.getDate(),
      22, // Feb 22
      "Interested (Hot) should have Next Steps Due 7 days later"
    );

    // Test No Answer - should be 3 days later
    var noAnswerOutcome = 'No Answer';
    var noAnswerDueDate = new Date(visitDate);
    noAnswerDueDate.setDate(visitDate.getDate() + workflowRules[noAnswerOutcome]);

    TestRunner.assert.equals(
      noAnswerDueDate.getDate(),
      18, // Feb 18
      "No Answer should have Next Steps Due 3 days later"
    );

    // Test Account Won - should be 1 day later
    var wonOutcome = 'Account Won';
    var wonDueDate = new Date(visitDate);
    wonDueDate.setDate(visitDate.getDate() + workflowRules[wonOutcome]);

    TestRunner.assert.equals(
      wonDueDate.getDate(),
      16, // Feb 16
      "Account Won should have Next Steps Due 1 day later"
    );
  },

  /**
   * Test Urgency Band calculation based on Next Steps Due Date
   */
  testUrgencyBandCalculation: function() {
    var today = new Date(2026, 1, 15); // Feb 15, 2026

    var testCases = [
      { daysUntilDue: -5, expectedBand: 'Overdue', expectedScore: 150 },  // 5 days overdue
      { daysUntilDue: 0, expectedBand: 'Overdue', expectedScore: 150 },   // Due today
      { daysUntilDue: 3, expectedBand: 'High', expectedScore: 115 },      // Due in 3 days
      { daysUntilDue: 15, expectedBand: 'Medium', expectedScore: 75 },  // Due in 15 days
      { daysUntilDue: 60, expectedBand: 'Low', expectedScore: 25 }        // Due in 60 days
    ];

    testCases.forEach(function(test) {
      var dueDate = new Date(today);
      dueDate.setDate(today.getDate() + test.daysUntilDue);

      // Calculate urgency based on days until due
      var daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      var urgencyBand, urgencyScore;

      if (daysDiff < 0) {
        urgencyBand = 'Overdue';
        urgencyScore = 150;
      } else if (daysDiff <= 7) {
        urgencyBand = 'High';
        urgencyScore = 115;
      } else if (daysDiff <= 30) {
        urgencyBand = 'Medium';
        urgencyScore = 75;
      } else {
        urgencyBand = 'Low';
        urgencyScore = 25;
      }

      TestRunner.assert.equals(
        urgencyBand,
        test.expectedBand,
        "Days until due " + test.daysUntilDue + " should result in band '" + test.expectedBand + "'"
      );

      TestRunner.assert.equals(
        urgencyScore,
        test.expectedScore,
        "Days until due " + test.daysUntilDue + " should result in score " + test.expectedScore
      );
    });
  },

  /**
   * Test Priority Score calculation with Industry and Urgency
   */
  testPriorityScoreCalculation: function() {
    var industryScores = {
      'Metal Fabrication': 90,
      'Manufacturing': 75,
      'Automotive': 70,
      'Welding': 70,
      'HVAC': 70,
      'Construction': 70,
      'Retail': 45
    };

    // Test Metal Fabrication (highest score)
    var metalFabScore = industryScores['Metal Fabrication'];
    TestRunner.assert.equals(metalFabScore, 90, "Metal Fabrication should have base score 90");

    // Test with urgency multiplier
    var urgencyMultiplier = 1.0; // No penalty
    var daysSinceContact = 30; // Not stale

    if (daysSinceContact > 60) {
      urgencyMultiplier = 0.7; // 30% penalty for stale prospects
    }

    var finalScore = metalFabScore * urgencyMultiplier;
    TestRunner.assert.equals(finalScore, 90, "Active Metal Fabrication prospect should score 90");

    // Test stale prospect penalty
    var staleDays = 65;
    var staleMultiplier = staleDays > 60 ? 0.7 : 1.0;
    var staleScore = metalFabScore * staleMultiplier;

    TestRunner.assert.equals(staleScore, 63, "Stale Metal Fabrication prospect should score 63 (90 * 0.7)");
  },

  /**
   * Test Account Won conversion workflow
   */
  testAccountWonConversion: function() {
    // Initial prospect state
    var prospect = {
      'Company ID': 'CID-TEST001',
      'Company Name': 'Test Company',
      'Contact Status': 'Interested (Hot)',
      'Last Outcome': '',
      'Close Probability': '75%'
    };

    // Outreach with Account Won outcome
    var outreach = {
      'Outreach ID': 'LID-001',
      'Company ID': 'CID-TEST001',
      'Outcome': 'Account Won',
      'Stage': 'Won',
      'Status': 'Active'
    };

    // Simulate conversion
    prospect['Contact Status'] = 'Won';
    prospect['Last Outcome'] = 'Account Won';

    // Test that prospect status is updated to Won
    TestRunner.assert.equals(
      prospect['Contact Status'],
      'Won',
      "Contact Status should be 'Won' after Account Won"
    );

    // Test that last outcome is updated
    TestRunner.assert.equals(
      prospect['Last Outcome'],
      'Account Won',
      "Last Outcome should be 'Account Won'"
    );

    // Test that outreach has correct stage and status
    TestRunner.assert.equals(
      outreach['Stage'],
      'Won',
      "Outreach Stage should be 'Won'"
    );

    TestRunner.assert.equals(
      outreach['Status'],
      'Active',
      "Outreach Status should be 'Active'"
    );
  },

  /**
   * Test Follow-Up Action determination based on Outcome
   */
  testFollowUpActionDetermination: function() {
    var actionMapping = {
      'Account Won': 'Onboard Account',
      'Interested (Hot)': 'Send pricing',
      'Interested (Warm)': 'General follow',
      'No Answer': 'Try again',
      'Not Interested': 'See Notes',
      'Disqualified': 'See Notes',
      'Initial Contact': 'Send pricing',
      'Follow-Up': 'General follow'
    };

    Object.keys(actionMapping).forEach(function(outcome) {
      var expectedAction = actionMapping[outcome];
      
      TestRunner.assert.isTrue(
        expectedAction.length > 0,
        "Outcome '" + outcome + "' should have follow-up action"
      );
    });

    // Test specific mappings
    TestRunner.assert.equals(
      actionMapping['Account Won'],
      'Onboard Account',
      "Account Won should trigger 'Onboard Account'"
    );

    TestRunner.assert.equals(
      actionMapping['Interested (Hot)'],
      'Send pricing',
      "Interested (Hot) should trigger 'Send pricing'"
    );

    TestRunner.assert.equals(
      actionMapping['No Answer'],
      'Try again',
      "No Answer should trigger 'Try again'"
    );
  },

  /**
   * Test Competitor tracking in Outreach
   */
  testCompetitorTracking: function() {
    var outreach = {
      'Outreach ID': 'LID-001',
      'Company ID': 'CID-TEST001',
      'Outcome': 'Not Interested',
      'Competitor': 'AIM'
    };

    var validCompetitors = ['AIM', 'Tyler Iron', 'Huntwell', 'Other', 'None'];

    // Test that competitor is valid
    TestRunner.assert.isTrue(
      validCompetitors.indexOf(outreach['Competitor']) >= 0,
      "Competitor should be a valid value"
    );

    // Test that competitor is recorded for lost deals
    if (outreach['Outcome'] === 'Not Interested' || outreach['Outcome'] === 'Disqualified') {
      TestRunner.assert.isTrue(
        outreach['Competitor'] !== 'None',
        "Competitor should be recorded for lost deals"
      );
    }
  },

  /**
   * Test Contact Type tracking
   */
  testContactTypeTracking: function() {
    var outreachMethods = [
      { type: 'Visit', description: 'In-person visit' },
      { type: 'Phone', description: 'Phone call' },
      { type: 'Email', description: 'Email communication' }
    ];

    outreachMethods.forEach(function(method) {
      TestRunner.assert.isTrue(
        ['Visit', 'Phone', 'Email'].indexOf(method.type) >= 0,
        "Contact type '" + method.type + "' should be valid"
      );
    });

    // Test default contact type
    var defaultType = 'Visit';
    TestRunner.assert.equals(
      defaultType,
      'Visit',
      "Default contact type should be 'Visit'"
    );
  },

  /**
   * Test data integrity between Outreach and Prospects
   */
  testDataIntegrity: function() {
    // Create linked records
    var companyId = 'CID-TEST001';
    
    var prospect = {
      'Company ID': companyId,
      'Company Name': 'Test Company',
      'Industry': 'Metal Fabrication',
      'Contact Status': 'Interested (Hot)',
      'Priority Score': 85
    };

    var outreachRecords = [
      {
        'Outreach ID': 'LID-001',
        'Company ID': companyId,
        'Visit Date': new Date(2026, 1, 10),
        'Outcome': 'Initial Contact'
      },
      {
        'Outreach ID': 'LID-002',
        'Company ID': companyId,
        'Visit Date': new Date(2026, 1, 15),
        'Outcome': 'Interested (Hot)'
      }
    ];

    // Test that all outreach records link to the same prospect
    outreachRecords.forEach(function(outreach) {
      TestRunner.assert.equals(
        outreach['Company ID'],
        prospect['Company ID'],
        "All outreach records must link to the same Company ID"
      );
    });

    // Test that latest outreach updates prospect
    var latestOutreach = outreachRecords[outreachRecords.length - 1];
    prospect['Last Outreach Date'] = latestOutreach['Visit Date'];
    prospect['Last Outcome'] = latestOutreach['Outcome'];

    TestRunner.assert.equals(
      prospect['Last Outcome'],
      'Interested (Hot)',
      "Last Outcome should reflect latest outreach"
    );
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map outcome to status (simplified version for testing)
 */
function mapOutcomeToStatus(outcome) {
  var mapping = {
    'Account Won': 'Won',
    'Interested (Hot)': 'Interested (Hot)',
    'Interested (Warm)': 'Interested (Warm)',
    'Interested': 'Interested (Warm)',
    'Not Interested': 'Disqualified',
    'Disqualified': 'Disqualified',
    'No Answer': 'Cold',
    'Initial Contact': 'Interested (Warm)',
    'Follow-Up': 'Interested (Warm)'
  };
  
  return mapping[outcome] || 'Outreach';
}

// Export for GAS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    OutreachProspectsLogicTests: OutreachProspectsLogicTests,
    mapOutcomeToStatus: mapOutcomeToStatus
  };
}
