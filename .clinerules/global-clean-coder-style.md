# Global Skill: Clean Coder Style (Code Aesthetics & Readability)

This skill mandates that all code written by the agent is not only functional but also aesthetic, readable, and highly maintainable.

## 1. The "Uncle Bob" Rule
*   **Variable Names:** Use descriptive, camelCase names (e.g., `prospectRecordArray`, not `data`).
*   **Small Functions:** Functions should do ONE thing. If a function is longer than 30 lines, refactor it.
*   **No Comments for the Obvious:** Do not comment on what the code is doing (`// incrementing i`). Comment on WHY it is doing it.

## 2. Modern JS Protocols (V8 GAS Runtime)
*   **Template Literals:** Use backticks `` `...` `` for string interpolation, not concatenation.
*   **Destructuring:** Use `const { success, data } = response;` to extract object properties.
*   **Arrow Functions:** Use arrow functions for callbacks and simple mappings (`data.map(item => item.id)`).
*   **Early Returns:** Use guard clauses and early returns to avoid deeply nested `if` statements.

## 3. Style Enforcement
*   **Alphabetical Exports:** Keep exported functions or configuration keys in alphabetical order for easy lookup.
*   **Indentation:** Strict 2-space indentation (standard for JS/GAS).

## 4. Interaction Rule
If a user provides messy code to "fix," your response MUST include:
*"I am refactoring this into a more readable, modern JS style with early returns and descriptive naming conventions."*
