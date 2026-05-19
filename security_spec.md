# Security Specification - DrillSync5 Handover Center

## Data Invariants
1. A handover must have a valid `id`, `timestamp`, `projectName`, and `ownerEmail`.
2. `ownerEmail` must match the authenticated user's email.
3. `timestamp` must be the server time on creation.
4. `actionItems` must be a list of objects with specific required fields.
5. All IDs must follow the standard regex `^[a-zA-Z0-9_\\-]+$`.

## The "Dirty Dozen" Payloads (Anti-Patterns)
1. **Identity Spoofing**: Creating a handover with someone else's `ownerEmail`.
2. **Resource Poisoning**: Injecting a 1MB string into the `projectName` field.
3. **Ghost Field Injection**: Adding `isVerified: true` to a handover document.
4. **State Shortcutting**: Updating `id` or `ownerEmail` after creation (immutability breach).
5. **Timestamp Manipulation**: Providing a future or past `timestamp` instead of server time.
6. **Orphaned Writes**: Creating a handover with an invalid status (not in enum).
7. **Action Item Sabotage**: Adding an action item missing the `task` field.
8. **Malicious ID Injection**: Using a 1KB string as a document ID.
9. **PII Leakage**: Reading all handovers when not authenticated.
10. **Unauthorized Update**: Attempting to edit a handover created by another user.
11. **Mass Deletion**: Attempting to delete all records without ownership.
12. **Type Mismatch**: Sending a number for a field that should be a string (e.g., `projectName: 123`).

## The Test Runner
See `firestore.rules.test.ts` for the implementation of these tests.
