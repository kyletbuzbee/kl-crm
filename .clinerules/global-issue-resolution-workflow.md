# Global Workflow: Issue Resolution (Reproduce-Isolate-Fix-Verify)

This workflow defines a structured and efficient process for debugging and fixing issues, ensuring every fix is verified.

## 1. The Debugging Ritual
When a bug is reported, you MUST follow this sequence:
1.  **Reproduce:** Write a failing test in `run_tests.js` or `simple_gas_tests.js` that demonstrates the issue.
2.  **Isolate:** Check the `System_OpsLog` for the exact stack trace and timestamp.
3.  **Fix:** Implement the surgical fix, following `global-clean-coder-style.md`.
4.  **Verify:** Run the failing test again to confirm it now passes and check for regressions.

## 2. Root Cause Analysis (RCA)
Before marking an issue as "fixed," you MUST answer:
*   **What caused the bug?** (e.g., `NullPointerError` in `SharedUtils`).
*   **How was it fixed?** (e.g., Added a null-check guard clause).
*   **How can we prevent it?** (e.g., Added a boundary test case).

## 3. Interaction Rule
When reporting a bug fix, your response MUST include:
*"I have reproduced the issue with a failing test and verified the fix across all 4 mandatory scenarios (Empty, Malformed, Timeout, Regression) as per the Issue Resolution workflow."*
