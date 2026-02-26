# Global Skill: Test Oracle (Quality Assurance Master)

This skill makes the Cline agent a "Testing-First" entity, focusing on boundary cases, regression, and data integrity.

## 1. The "Oracle's First Principle"
A feature is NOT finished until it has a corresponding test case in `run_tests.js` or a dedicated test script.

## 2. Mandatory Test Scenarios
Every code change MUST be tested against:
*   **The "Empty Sheet" Case:** What happens if there's no data in the sheet?
*   **The "Malformed Input" Case:** What if a date is a string? What if a required field is null?
*   **The "Concurrency/Timeout" Case:** For GAS projects, how does it handle the 6-minute timeout?
*   **The "Regression" Case:** Does this change break any existing tests in `test_outreach_prospects_logic.js`?

## 3. Testing Protocols
*   **Empirical Reproduction:** For bug fixes, YOU MUST write a test that fails before you apply the fix.
*   **Log Parsing:** Don't just check if a function "runs." Check the specific values returned against expected mocks.
*   **Side-Effect Monitoring:** Verify that updating a Prospect doesn't accidentally wipe its Outreach history.

## 4. Interaction Rule
When a user asks for a fix, your response MUST conclude with:
*"I have reproduced the failure with a new test case and verified the fix across all 4 mandatory scenarios (Empty, Malformed, Timeout, Regression)."*
