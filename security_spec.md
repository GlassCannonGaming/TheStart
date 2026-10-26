# Security Specification: The House Simulator Data Persistence

## Data Invariants
1. A user save must belong to the authenticated owner (`userId == request.auth.uid`).
2. Document paths are partitioned under `/users/{userId}/saves/{saveId}`. Users cannot read, list, create, update, or delete saves belonging to other users.
3. String fields enforce strict maximum size boundaries to prevent denial-of-wallet resource attacks.
4. Auto-save payloads and manual snapshots adhere strictly to schema types and required keys.

## The Dirty Dozen Adversarial Payloads
1. Cross-User Read: User A attempting `get` on `/users/{userB}/saves/{save1}` -> PERMISSION_DENIED.
2. Cross-User List: User A listing `/users/{userB}/saves` -> PERMISSION_DENIED.
3. Cross-User Write: User A creating a save in `/users/{userB}/saves/{save1}` -> PERMISSION_DENIED.
4. Identity Spoofing: User A sending `{ userId: 'userB' }` in save body -> PERMISSION_DENIED.
5. Path Traversal / Junk ID: Document ID with invalid characters or > 128 chars -> PERMISSION_DENIED.
6. Oversized Payload: Save data string > 65,536 characters -> PERMISSION_DENIED.
7. Missing Required Field: Save missing `timestamp` or `slotName` -> PERMISSION_DENIED.
8. Unauthenticated Access: Unauthenticated client querying `/users/...` -> PERMISSION_DENIED.
9. Shadow Fields: Injecting arbitrary privileged attributes -> PERMISSION_DENIED.
10. Malformed Sim Hour: Negative or non-numeric hour -> PERMISSION_DENIED.
11. Profile Hijack: Attempting to update another user's profile config -> PERMISSION_DENIED.
12. Blanket List Bypass: List request without `userId == request.auth.uid` -> PERMISSION_DENIED.
