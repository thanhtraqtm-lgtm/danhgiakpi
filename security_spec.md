# Security Specifications for KPI Evaluation Hub

## 1. Data Invariants
- **Employees**: Every employee record must have a unique, non-empty `id` and a non-empty `name`. Tasks must be formatted as an array if present.
- **Directives**: Directives are stored in a single master document `all_directives` with a list array of active notices.
- **Config**: Configuration holds the locking state `isQuarterLocked` which is a boolean, and optional departments/units lists.

## 2. The "Dirty Dozen" Payloads (Validation Target Scenarios)
1. Write Employee without `id`
2. Write Employee with empty `name`
3. Write Employee with non-string `id`
4. Write Employee with non-string `name`
5. Write Employee with exceeding name size (>256 characters)
6. Write Directives with non-list `list`
7. Write Config with non-boolean `isQuarterLocked`
8. Write malformed paths
9. Attempt unauthorized read on system logs
10. Attempt shadow updates with missing required fields
11. Attempt to inject large payload sizes
12. Write Employee with tasks field of incorrect type (not a list)

## 3. Security Rules
We will deploy robust Firestore rules to enforce structural schema validations while allowing public read/write access since the app is designed to run in a standalone, serverless environment without explicit Firebase Authentication.
