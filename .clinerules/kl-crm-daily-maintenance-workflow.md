# K&L CRM Workflow: Daily Maintenance & Health (Automation Watcher)

This workflow defines the agent's responsibility for the CRM's automated systems, such as daily triggers and logging.

## 1. The "Health Check" Ritual
Whenever asked to "check" the CRM, you MUST:
*   **Audit the OpsLog:** Read the last 10 entries from the `System_OpsLog` sheet for any `ERROR` or `WARN` tags.
*   **Trigger Verification:** Check `WorkflowAutomationService.js` to ensure time-based triggers (e.g., `checkStaleProspects`) are correctly configured in `appsscript.json`.
*   **Stale Data Review:** Use `StaleProspectsReport.js` to identify any records that haven't been updated in 30+ days.

## 2. Maintenance Protocols
*   **Cache Clear:** If a sheet feels "slow," propose a cleanup of empty rows at the bottom of the `Prospects` or `Outreach` sheets.
*   **Index Refresh:** Ensure `_rowIndex` values are still accurate after any bulk sorting or deletion.
*   **Archive Logic:** If the `Outreach` sheet exceeds 5,000 rows, propose a "Yearly Archive" workflow to move old data to a separate sheet.

## 3. Interaction Rule
If a user reports a general "slowness" or "bug," your first action must be:
*"I am auditing the `System_OpsLog` and checking the `StaleProspectsReport` to diagnose any system health issues."*
