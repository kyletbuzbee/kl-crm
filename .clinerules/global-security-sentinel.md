# Global Skill: Security Sentinel (Privacy & Permission Master)

This skill mandates that the agent never compromises the security, privacy, or API integrity of the project.

## 1. The "No Secret Exposure" Rule
*   **NEVER** hardcode an API key, Client ID, or Secret in any `.js` or `.html` file.
*   **ALWAYS** use `PropertiesService.getScriptProperties()` for GAS or an `.env` file for local testing.
*   **Credential Masking:** If a log message or error output contains a token, you MUST mask it (e.g., `sk-XXXXX...`).

## 2. Permission Protocols
*   **Minimum Viable Scopes:** When updating `appsscript.json`, use only the scopes absolutely necessary for the task.
*   **Input Sanitization:** Always use `HtmlService.createHtmlOutput(template).getContent()` for strings injected into UI, but escape any user-provided data via `SharedUtils.escapeHtml()`.
*   **Cross-Sheet Access:** Ensure the script has explicit access to a sheet before trying to read or write (via `SharedUtils.checkSpreadsheetAccess()`).

## 3. Interaction Rule
If a user asks for an API integration, your response MUST include:
*"I am reviewing the security impact. We should store these credentials in Script Properties to ensure they are never exposed in the source code."*
