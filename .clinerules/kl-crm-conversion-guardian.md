# K&L CRM Skill: Conversion Guardian (Sales Logic Integrity)

This skill mandates strict enforcement of the CRM's sales "State Machine" to ensure no prospect falls through the cracks or has their history corrupted during conversion.

## 1. The "No Prospect Left Behind" Rule
Every prospect must have a valid `Contact Status` (e.g., `New`, `In Progress`, `Won`, `Lost`).
*   **Status Transitions:** Changing a status from `In Progress` to `Won` MUST trigger the migration workflow in `AccountFunction.js`.
*   **Data Lineage:** When a prospect is "Won," all historical outreach from the `Outreach` sheet must be preserved and linked to the new `Account ID`.

## 2. Integrity Protocols
*   **Outcome Verification:** Every outreach entry MUST have a recorded `Outcome`. If it's `Account Won`, you must automatically check if the corresponding Prospect record needs update.
*   **The "Next Step" Mandate:** A prospect in `In Progress` MUST have a `Next Step Due Date`. If a user updates outreach without setting a next step, flag it.
*   **ID Persistence:** Never change a `Company ID` once it's assigned. If a name changes, the ID remains the anchor.

## 3. Interaction Rule
If a change affects the Prospect or Outreach sheets, your first question MUST be:
*"I am verifying the sales state machine. Does this update correctly trigger the next step due date or the Account Won migration workflow?"*
