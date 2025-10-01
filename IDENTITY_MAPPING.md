# Identity Mapping: SwissOID → Gateway → Database

This document explains how user identity flows through the authentication system, from SwissOID to the database and back.

## Overview

The system uses **external identity providers** (SwissOID) and maps them to **internal user records** in the database. The key linking field is `externalUUID`, which stores the SwissOID `sub` (subject) claim.

---

## SwissOID Claims Structure

### What SwissOID Returns

Based on SwissOID's OpenID Configuration and `swissoid-back` implementation:

```typescript
// id_token claims from SwissOID
interface SwissOIDClaims {
  // Standard OIDC claims
  iss: string;              // "https://api.swissoid.com"
  sub: string;              // ← PRIMARY IDENTITY (e.g., "swissoid|123456789")
  aud: string;              // client_id (e.g., "clockize")
  exp: number;              // Expiration timestamp
  iat: number;              // Issued at timestamp
  nbf?: number;             // Not before
  jti?: string;             // JWT ID
  nonce: string;            // Replay protection

  // Profile claims (if scope includes 'profile')
  name?: string;            // "John Doe"
  given_name?: string;      // "John"
  family_name?: string;     // "Doe"
  picture?: string;         // URL to profile picture

  // Email claims (if scope includes 'email')
  email?: string;           // "user@example.com"
  email_verified?: boolean; // true/false

  // Authentication context
  amr?: string[];           // Authentication Method Reference
  acr?: string;             // Authentication Context Class Reference
  auth_time?: number;       // When user authenticated
}
```

### Supported Scopes

```
openid              // Required, provides sub
email               // Adds email, email_verified
profile             // Adds name, given_name, family_name, picture
```

---

## cronide-user Database Structure

### Tables

```sql
-- Main user table
CREATE TABLE User (
  UUID varchar(255) NOT NULL,        -- Internal user ID (generated)
  isAllowed int(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (UUID)
);

-- Key-value metadata table
CREATE TABLE User_to_Metas (
  ID INT NOT NULL AUTO_INCREMENT,
  userUUID varchar(255) NOT NULL,    -- FK to User.UUID
  name varchar(255) NOT NULL,         -- Meta key
  value varchar(255) NOT NULL,        -- Meta value
  PRIMARY KEY (ID),
  UNIQUE (userUUID, name, value),
  FOREIGN KEY (userUUID) REFERENCES User(UUID) ON DELETE CASCADE
);
```

### User Metadata Fields

Configured via `USER_METAS=email,username` plus always-included `externalUUID`:

| Meta Name | Source | Example | Purpose |
|-----------|--------|---------|---------|
| **externalUUID** | SwissOID `sub` | `"swissoid\|123456789"` | **PRIMARY LINK** to external identity |
| email | SwissOID `email` | `"user@example.com"` | User's email |
| username | Derived | `"johndoe"` | Display name |

### Example Data

```sql
-- User table
UUID                                  | isAllowed
--------------------------------------|----------
550e8400-e29b-41d4-a716-446655440000  | 1

-- User_to_Metas table
userUUID                              | name          | value
--------------------------------------|---------------|----------------------
550e8400-e29b-41d4-a716-446655440000  | externalUUID  | swissoid|123456789
550e8400-e29b-41d4-a716-446655440000  | email         | user@example.com
550e8400-e29b-41d4-a716-446655440000  | username      | johndoe
```

---

## Field Mapping: SwissOID → cronide-user

### 1:1 Mappings

| SwissOID Claim | cronide-user Meta | Notes |
|----------------|-------------------|-------|
| `sub` | `externalUUID` | **THE PRIMARY KEY MAPPING** - Never changes |
| `email` | `email` | Optional, depends on scope |

### Derived Mappings

| cronide-user Meta | Derivation Logic | Example |
|-------------------|------------------|---------|
| `username` | `preferred_username` OR `username` OR `name` OR `email.split('@')[0]` | `"johndoe"` |

### Implementation in oidcUserRegistrar

```typescript
// cronide-user/src/loaders/oidcUserRegistrar.ts
const externalUUID = claims.sub;  // SwissOID subject

const username = claims.preferred_username
  || claims.username
  || claims.name
  || (claims.email ? String(claims.email).split('@')[0] : undefined);

await userModel.registerUser({
  user: {
    UUID: externalUUID,           // ← Maps sub to externalUUID
    username,                      // ← Derived username
    email: claims.email ? String(claims.email) : undefined
  },
  isAllowed: autoAllow
});
```

**Note:** SwissOID doesn't return `preferred_username` or `username` - only `name`. The fallback chain handles this.

---

## Identity Flow: Complete Journey

### Phase 1-4: Current State (Auth in cronide-user)

```
┌─────────┐
│ Browser │
└────┬────┘
     │ 1. GET /login
     ↓
┌─────────────┐
│ Gateway     │ (Proxy only)
└──────┬──────┘
       │ 2. Proxy to cronide-user
       ↓
┌──────────────┐
│ cronide-user │
└──────┬───────┘
       │ 3. Redirect to SwissOID
       ↓
┌──────────────┐
│   SwissOID   │
└──────┬───────┘
       │ 4. User authenticates
       │ 5. Callback with code
       ↓
┌──────────────┐
│ cronide-user │
└──────┬───────┘
       │ 6. Exchange code for tokens
       │ 7. Verify id_token
       │ 8. Extract claims:
       │    { sub: "swissoid|123", email: "...", name: "..." }
       │ 9. Check/Register user in DB
       │    - Lookup by externalUUID = sub
       │    - If not exists, INSERT new user
       │ 10. Create session with sub
       │ 11. Set cookie
       ↓
┌─────────┐
│ Browser │ (Has cookie with session)
└─────────┘
```

### Phase 5-7: Target State (Auth in Gateway, DATs to Subgraphs)

```
┌─────────┐
│ Browser │
└────┬────┘
     │ 1. GET /login
     ↓
┌─────────────┐
│ Gateway     │ (Auth Handler)
└──────┬──────┘
       │ 2. Redirect to SwissOID
       ↓
┌──────────────┐
│   SwissOID   │
└──────┬───────┘
       │ 3. Callback with code
       ↓
┌─────────────┐
│ Gateway     │
└──────┬──────┘
       │ 4. Exchange code for tokens
       │ 5. Verify id_token, extract claims
       │ 6. Call oidcUserRegistrar:
       │    - GraphQL mutation to cronide-user
       │    - registerUser({ UUID: sub, ... })
       │ 7. Create session in Redis:
       │    { sub: "swissoid|123", email: "..." }
       │ 8. Set cookie
       ↓
┌─────────┐
│ Browser │ (Makes GraphQL request with cookie)
└────┬────┘
     │ 9. POST /graphql + Cookie
     ↓
┌─────────────┐
│ Gateway     │
└──────┬──────┘
       │ 10. Validate cookie → Get session
       │     { sub: "swissoid|123", ... }
       │ 11. Mint DAT (3min TTL):
       │     {
       │       iss: "cronide-gateway",
       │       aud: "cronide-subgraphs",
       │       sub: "swissoid|123",  ← Preserved!
       │       email: "...",
       │       ...
       │     }
       │ 12. Forward: Authorization: Bearer <DAT>
       ↓
┌──────────────┐
│ cronide-user │ (Subgraph)
└──────┬───────┘
       │ 13. Validate DAT signature
       │ 14. Extract claims: { sub: "swissoid|123", ... }
       │ 15. Lookup user in DB:
       │     SELECT u.UUID, u.isAllowed
       │     FROM User u
       │     JOIN User_to_Metas um ON u.UUID = um.userUUID
       │     WHERE um.name = 'externalUUID'
       │       AND um.value = 'swissoid|123'
       │ 16. Get internalUUID: "550e8400-..."
       │ 17. Process request with internal user
       ↓
┌─────────┐
│ Browser │ (Receives response)
└─────────┘
```

---

## Key Identity Relationships

### SwissOID `sub` is the Source of Truth

```
SwissOID sub (external)
    ↓
Gateway Session (stores sub)
    ↓
DAT Token (contains sub)
    ↓
Database externalUUID (stores sub)
    ↓
Internal User UUID
```

### The Mapping

```typescript
// SwissOID provides
sub: "swissoid|123456789"

// Gateway stores in session
{ sub: "swissoid|123456789", email: "...", ... }

// Gateway mints DAT with same sub
{ iss: "cronide-gateway", sub: "swissoid|123456789", ... }

// Subgraph looks up in database
externalUUID = "swissoid|123456789"
  ↓
internalUUID = "550e8400-e29b-41d4-a716-446655440000"
```

### Why This Works

1. **SwissOID `sub` never changes** - Permanent identifier for the user
2. **Gateway passes through `sub`** - No transformation, just forwarding
3. **Database links external to internal** - Lookup table via `User_to_Metas`
4. **Subgraphs remain agnostic** - Don't care where the `sub` came from

---

## User Registration Flow

### First Time User Logs In

```typescript
// 1. SwissOID returns claims
const claims = {
  sub: "swissoid|987654321",
  email: "newuser@example.com",
  name: "Jane Smith"
};

// 2. Gateway calls oidcUserRegistrar
await oidcUserRegistrar({ claims });

// 3. Inside oidcUserRegistrar
const externalUUID = claims.sub;  // "swissoid|987654321"

// 4. Check if user exists
const existing = await userModel.getUserByExternalUUID({ externalUUID });

if (existing.status === 'fail' && existing.code === 'ERROR_UNKNOWN_UUID') {
  // 5. User doesn't exist, register them

  // Generate internal UUID
  const internalUUID = generateUUID();  // "6a8e9f0a-..."

  // 6. Insert into database
  INSERT INTO User (UUID, isAllowed)
  VALUES ('6a8e9f0a-...', 1);

  INSERT INTO User_to_Metas (userUUID, name, value) VALUES
    ('6a8e9f0a-...', 'externalUUID', 'swissoid|987654321'),
    ('6a8e9f0a-...', 'email', 'newuser@example.com'),
    ('6a8e9f0a-...', 'username', 'Jane Smith');
}

// 7. Continue with session creation
```

### Subsequent Logins

```typescript
// 1. SwissOID returns same sub
const claims = { sub: "swissoid|987654321", ... };

// 2. Check if user exists
const existing = await userModel.getUserByExternalUUID({
  externalUUID: "swissoid|987654321"
});

// 3. User found! Skip registration
if (existing.status === 'success') {
  // Use existing.payload.user.UUID for session
  const internalUUID = existing.payload.user.UUID;  // "6a8e9f0a-..."

  // Continue with session creation
}
```

---

## Security Considerations

### Why externalUUID is in User_to_Metas, Not User Table

1. **Flexibility**: Can store multiple external identities per user
2. **Future-proofing**: Easy to add other OAuth providers (Google, GitHub)
3. **Separation of concerns**: User table stays clean and provider-agnostic

### What Happens If SwissOID `sub` Changes?

**Short answer:** It won't. The `sub` claim is immutable per OIDC spec.

**If it somehow did:**
- User would appear as new user
- Old records would be orphaned
- Manual migration required to link old → new

### Multiple Identities (Future)

```sql
-- Same internal user, multiple external identities
userUUID                              | name          | value
--------------------------------------|---------------|----------------------
550e8400-e29b-41d4-a716-446655440000  | externalUUID  | swissoid|123456789
550e8400-e29b-41d4-a716-446655440000  | externalUUID  | google|abc123
550e8400-e29b-41d4-a716-446655440000  | externalUUID  | github|xyz789
```

Currently not implemented, but the schema supports it.

---

## Troubleshooting

### User Can't Login After Migration

**Symptom:** User exists in cronide-user but can't authenticate through gateway

**Check:**
1. Does `User_to_Metas` have `externalUUID` for this user?
   ```sql
   SELECT * FROM User_to_Metas
   WHERE name = 'externalUUID' AND value = '<swissoid-sub>';
   ```

2. Is the `sub` claim in the DAT matching what's in the database?
   - Decode DAT: `jwt.io`
   - Compare `sub` value

3. Is `isAllowed = 1` for the user?
   ```sql
   SELECT * FROM User WHERE UUID = '<internal-uuid>';
   ```

### Gateway Says User Registered But Subgraph Says Unknown

**Symptom:** Session created, DAT minted, but subgraph returns "Unknown user"

**Check:**
1. Is the DAT being validated correctly?
   - Check subgraph logs for DAT validation errors

2. Is the `sub` claim preserved through the chain?
   - Session → DAT → Database lookup

3. Database race condition?
   - Registration might not have committed before DAT validation

---

## Summary

| Component | Identity Format | Storage | Purpose |
|-----------|----------------|---------|---------|
| **SwissOID** | `sub: "swissoid\|123"` | N/A | Source of truth |
| **Gateway Session** | `{ sub: "swissoid\|123", ... }` | Redis | Temporary auth state |
| **DAT Token** | `{ sub: "swissoid\|123", ... }` | JWT (signed) | Short-lived auth proof |
| **Database** | `externalUUID: "swissoid\|123"` | MySQL | Permanent user record |
| **Internal ID** | `UUID: "550e8400-..."` | MySQL | Internal operations |

**The key insight:** SwissOID's `sub` flows unchanged through the entire system and serves as the permanent link between external identity and internal user records.