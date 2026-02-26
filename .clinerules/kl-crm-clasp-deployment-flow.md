# K&L CRM Workflow: Clasp Deployment (Local-to-Cloud Sync)

This workflow mandates a safe and consistent process for deploying local changes to the Google Apps Script (GAS) environment using `clasp`.

## 1. The Pre-Flight Check
Before every `clasp push`, you MUST:
*   **Run Local Tests:** Execute `npm test` to ensure the logic is sound.
*   **Manifest Review:** Check `appsscript.json` for any new scopes or libraries.
*   **Version Check:** If it's a major feature, propose a new version number in `Config.js`.

## 2. The Deployment Sequence
1.  **Pull First:** Run `clasp pull` (if safe) or check for remote changes in the GAS editor to avoid overwriting user edits.
2.  **Lint & Format:** Ensure all files follow the `global-clean-coder-style.md`.
3.  **Push:** Execute `clasp push`.
4.  **Verify:** Open the script in the browser (`clasp open`) and check the "Executions" tab for any immediate errors.

## 3. Interaction Rule
After every successful modification, your response MUST include:
*"I have verified the local logic. I am ready to `clasp push` these changes to the K&L Recycling GAS project."*
