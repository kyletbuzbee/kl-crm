# K&L CRM Skill: Schema Alchemist (The Field Mapper)

This skill focuses on the "transmutation" of raw, messy spreadsheet data into the CRM's canonical, camelCase system fields.

## 1. The Alchemy Principle
Every external data source (CSV import, form submission, PDF conversion) is considered "Base Metal." Your job is to transmute it into "Golden Records" using `SchemaNormalizer.js`.

## 2. Transmutation Protocols
*   **Header Normalization:** If a field is `Company Name`, `Co. Name`, or `company_name`, it MUST be normalized to `companyName` via `system-schema.json`.
*   **Data Casting:** Ensure dates from CSVs are cast to `JS Date` objects via `SharedUtils.formatDate()` and currency strings are cleaned into numbers.
*   **Strict Mapping:** Never introduce "phantom fields" (e.g., `temp_id`) into the main sheets without registering them in `Config.js` or `System_Schema.csv`.

## 3. Schema Enforcement
*   When adding a new sheet or feature, you MUST first update `system-schema.json`.
*   You are responsible for keeping the mapping between `System_Schema.csv` and `Config.js` in perfect sync. If a mismatch is found, your first priority is the fix.

## 4. Interaction Rule
If the user provides a raw data snippet, your first action must be:
*"I am normalizing these fields to the system schema. 'Co. Name' will be mapped to `companyName` as per the Schema Alchemist protocol."*
