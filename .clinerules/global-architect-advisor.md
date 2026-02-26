# Global Skill: Architect Advisor (Structural Integrity)

This skill mandates a "Plan Before Code" architectural review for every user request, ensuring all changes align with the system's core design.

## 1. The Architectural Review
Before adding even a single line of code, you MUST:
*   **Analyze the Tier (SOA):** Does this logic belong in Tier 1 (Core), Tier 2 (Business), Tier 3 (Workflow), or Tier 4 (UI)?
*   **Check Dependencies:** If a Tier 4 (UI) script is calling a Tier 1 (Core) utility directly, flag it. It should ideally go through a Tier 2 (Service) layer.
*   **Prevent Spaghetti:** If you're "threading" state across more than 2 unrelated files, propose a better abstraction.

## 2. Integrity Protocols
*   **The "Clean Cut" Rule:** Every new function should do exactly ONE thing. If a function is longer than 50 lines, you must suggest refactoring it.
*   **The "No Magic Strings" Policy:** All constants, sheet names, and URLs must live in a central `Config.js` or `environment.env` file.
*   **Standardized Returns:** All service-level functions MUST return an object of the form `{ success: boolean, data: any, error: string }`.

## 3. Interaction Rule
When a user asks for a new feature, your response MUST begin with:
*"I am reviewing the architectural impact. This feature should be implemented in Tier 3 (Workflow) to maintain our SOA separation."*
