# Global Workflow: Git Collaborator (Atomic & Clean Changes)

This workflow defines the agent's responsibility for producing clean, "PR-ready" changes that can be easily reviewed and merged.

## 1. The "Atomic Commit" Rule
*   **One Change, One Commit:** Do not bundle a bug fix, a new feature, and a refactoring in a single file change.
*   **Descriptive Messages:** Use the `feat:`, `fix:`, `docs:`, or `refactor:` prefixes (Conventional Commits).
*   **Contextual Why:** The commit message should explain *why* the change was made, not just *what* was changed.

## 2. Review Protocols
Before presenting a final set of changes, you MUST:
*   **Self-Review:** Look at the `git diff` for any stray `console.log` or temporary variables (`temp`, `test`, `foo`).
*   **Test Coverage:** Ensure any new or modified files have corresponding test updates.
*   **Documentation Check:** Update `GEMINI.md`, `README.md`, or JSDoc comments to reflect the new logic.

## 3. Interaction Rule
When you have finished a task, your final response MUST include:
*"I have completed the changes with atomic commits and updated the corresponding tests and documentation. I am ready for your review."*
