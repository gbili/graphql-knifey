# Database Architecture: Phase 5 Changes

## Key Question
**When moving auth from cronide-user to cronide-gateway, what happens to databases?**

---

## Short Answer

**cronide-user's database will NOT change at all.**

**cronide-gateway will ONLY get Redis** (for sessions), no MySQL/MariaDB.

---

## Current Architecture (Before Phase 5)

```
┌─────────────────────────────────────┐
│        cronide-user                 │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │ MySQL/MariaDB│  │    Redis    │ │
│  │              │  │             │ │
│  │ - User       │  │ - Sessions  │ │
│  │ - User_to_   │  │             │ │
│  │   Metas      │  │             │ │
│  └──────────────┘  └─────────────┘ │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ Auth Routes + User Domain    │  │
│  │ - /login                     │  │
│  │ - /oidc/callback             │  │
│  │ - /auth/status               │  │
│  │ - /auth/logout               │  │
│  │ - getUserByExternalUUID()    │  │
│  │ - registerUser()             │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      cronide-gateway                │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ Proxy to cronide-user        │  │
│  │ - Forwards /login            │  │
│  │ - Forwards /oidc/*           │  │
│  │ - Forwards /auth/*           │  │
│  └──────────────────────────────┘  │
│                                     │
│  NO DATABASE                        │
└─────────────────────────────────────┘
```

---

## Target Architecture (After Phase 5)

```
┌─────────────────────────────────────┐
│      cronide-gateway                │
│                                     │
│  ┌─────────────┐                    │
│  │    Redis    │  ← NEW!            │
│  │             │                    │
│  │ - Sessions  │                    │
│  └─────────────┘                    │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ Auth Routes (from swissoid)  │  │
│  │ - /login                     │  │
│  │ - /oidc/callback             │  │
│  │ - /auth/status               │  │
│  │ - /auth/logout               │  │
│  │ - oidcUserRegistrar          │  │
│  └──────────────────────────────┘  │
│           ↓                         │
│      Calls cronide-user             │
│      via GraphQL                    │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│        cronide-user                 │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │ MySQL/MariaDB│  │    Redis    │ │
│  │              │  │             │ │
│  │ - User       │  │ (REMOVED)   │ │
│  │ - User_to_   │  │             │ │
│  │   Metas      │  │             │ │
│  └──────────────┘  └─────────────┘ │
│  (NO CHANGES!)                      │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ User Domain Only (GraphQL)   │  │
│  │ - getUserByExternalUUID()    │  │
│  │ - registerUser()             │  │
│  │ - getUser()                  │  │
│  │ - updateUser()               │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## What Changes in Each Service

### cronide-gateway (Phase 5 Changes)

#### 1. Add Redis Container

```yaml
# docker-compose.yml (ADD THIS)
services:
  cronide-gateway-redis:
    image: redis:latest
    container_name: cronide-gateway-redis
    expose:
      - 6379
    volumes:
      - redis:/data
    restart: always
    networks:
      - app_network

  cronide-gateway:
    # ... existing config ...
    depends_on:
      - cronide-gateway-redis
```

#### 2. Add Environment Variables

```env
# .env.prod (ADD THESE)

# SwissOID Configuration
SWISSOID_CLIENT_ID=clockize
SWISSOID_CLIENT_SECRET=<secret>
SWISSOID_ISSUER=https://api.swissoid.com
SWISSOID_JWKS_URI=https://api.swissoid.com/.well-known/jwks.json
SWISSOID_TOKEN_ENDPOINT=https://api.swissoid.com/token
SWISSOID_AUTHORIZE_ENDPOINT=https://api.swissoid.com/authorize

# Redis for sessions
REDIS_HOST=cronide-gateway-redis
REDIS_PORT=6379
REDIS_DB=0

# Session configuration
SESSION_COOKIE_NAME=cronide_session
SESSION_SECRET=<generate-new-secret>
STATE_SIGNING_SECRET=<generate-new-secret>
SESSION_TTL=7200
REFRESH_TTL=604800

# RP configuration
OIDC_REDIRECT_BASE_URL=https://gateway.clockize.com
RP_FRONTEND_URL=https://app.clockize.com
RP_COOKIE_DOMAIN=.clockize.com
REFRESH_COOKIE_NAME=cronide_refresh
```

#### 3. What Gateway Will Do

- **Store sessions in Redis** (user's SwissOID `sub`, email, etc.)
- **Handle OIDC flow** (redirect to SwissOID, exchange tokens)
- **Call cronide-user GraphQL** to register/check users
- **NO direct database access** for user records

---

### cronide-user (Phase 5 Changes)

#### 1. Remove Redis Container

```yaml
# docker-compose.yml (REMOVE THIS)
# cronide-user-redis:
#   ...
```

#### 2. Remove Environment Variables

```env
# .env.prod (REMOVE THESE)

# Remove all SwissOID config:
# SWISSOID_CLIENT_ID
# SWISSOID_CLIENT_SECRET
# SWISSOID_ISSUER
# SWISSOID_JWKS_URI
# SWISSOID_TOKEN_ENDPOINT

# Remove session/Redis config:
# REDIS_HOST
# REDIS_PORT
# REDIS_DB
# SESSION_COOKIE_NAME
# SESSION_SECRET
# STATE_SIGNING_SECRET
# SESSION_TTL
# REFRESH_TTL
# OIDC_REDIRECT_BASE_URL
# RP_FRONTEND_URL
# RP_COOKIE_DOMAIN
# COOKIE_DOMAIN
# REFRESH_COOKIE_NAME
```

#### 3. Keep MySQL/MariaDB

```yaml
# docker-compose.yml (KEEP THIS)
services:
  cronide-user-db:
    image: mariadb:10.9
    # ... all existing config stays ...
```

#### 4. What cronide-user Will Do

- **Keep all user data** in MySQL (User, User_to_Metas tables)
- **Expose GraphQL API** for user operations:
  - `getUserByExternalUUID(externalUUID: String!)`
  - `registerUser(input: RegisterUserInput!)`
  - `getUser(UUID: String!)`
  - `updateUser(UUID: String!, input: UpdateUserInput!)`
- **NO auth logic** - just user domain operations

---

## How oidcUserRegistrar Changes

### Before (Phase 1-4): Direct Database Access

```typescript
// cronide-user/src/loaders/oidcUserRegistrar.ts
const oidcUserRegistrar: LoadDictElement = {
  factory: ({ userModel, appConfig, logger }) => {
    return async ({ claims }) => {
      const externalUUID = claims.sub;

      // DIRECT database access
      const existing = await userModel.getUserByExternalUUID({ externalUUID });

      if (existing.status === 'fail') {
        // DIRECT database insert
        await userModel.registerUser({
          user: { UUID: externalUUID, email: claims.email, ... }
        });
      }
    };
  },
  locateDeps: {
    userModel: 'userModel',  // ← Direct DB access
    appConfig: 'appConfig',
    logger: 'logger'
  }
};
```

### After (Phase 5): GraphQL API Calls

```typescript
// cronide-gateway/src/loaders/oidcUserRegistrar.ts
const oidcUserRegistrar: LoadDictElement = {
  factory: ({ graphqlClient, logger }) => {
    return async ({ claims }) => {
      const externalUUID = claims.sub;

      // GraphQL query to cronide-user
      const checkQuery = gql`
        query GetUserByExternalUUID($uuid: String!) {
          getUserByExternalUUID(externalUUID: $uuid) {
            status
            code
            payload {
              user {
                UUID
                isAllowed
              }
            }
          }
        }
      `;

      const existing = await graphqlClient.query({
        query: checkQuery,
        variables: { uuid: externalUUID }
      });

      if (existing.data.getUserByExternalUUID.status === 'fail') {
        // GraphQL mutation to cronide-user
        const registerMutation = gql`
          mutation RegisterUser($input: RegisterUserInput!) {
            registerUser(input: $input) {
              status
              payload {
                user { UUID isAllowed }
              }
            }
          }
        `;

        await graphqlClient.mutate({
          mutation: registerMutation,
          variables: {
            input: {
              UUID: externalUUID,
              email: claims.email,
              username: claims.name || claims.email?.split('@')[0]
            }
          }
        });
      }
    };
  },
  locateDeps: {
    graphqlClient: 'graphqlClient',  // ← GraphQL client
    logger: 'logger'
  }
};
```

---

## Database Operations Summary

### cronide-user Database (MySQL)

**NO CHANGES to schema or data!**

```sql
-- User table: UNCHANGED
CREATE TABLE User (
  UUID varchar(255) NOT NULL,
  isAllowed int(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (UUID)
);

-- User_to_Metas table: UNCHANGED
CREATE TABLE User_to_Metas (
  ID INT NOT NULL AUTO_INCREMENT,
  userUUID varchar(255) NOT NULL,
  name varchar(255) NOT NULL,
  value varchar(255) NOT NULL,
  PRIMARY KEY (ID),
  UNIQUE (userUUID, name, value),
  FOREIGN KEY (userUUID) REFERENCES User(UUID) ON DELETE CASCADE
);

-- Example data: UNCHANGED
userUUID                              | name          | value
--------------------------------------|---------------|----------------------
550e8400-e29b-41d4-a716-446655440000  | externalUUID  | swissoid|123456789
550e8400-e29b-41d4-a716-446655440000  | email         | user@example.com
550e8400-e29b-41d4-a716-446655440000  | username      | johndoe
```

### cronide-gateway Redis (NEW)

```
# Session storage (key-value)
sess_abc123 → {
  sub: "swissoid|123456789",
  email: "user@example.com",
  name: "John Doe",
  iat: 1234567890,
  exp: 1234575090
}
```

---

## Migration Checklist

### Pre-Migration

- [ ] Backup cronide-user database (just in case)
- [ ] Verify all users have `externalUUID` in User_to_Metas
- [ ] Document current Redis keys (for migration if needed)

### During Migration

- [ ] Deploy cronide-gateway with Redis
- [ ] Update cronide-gateway code with swissoid-back
- [ ] Update cronide-user to remove auth routes
- [ ] Remove cronide-user Redis container (optional, can keep for now)

### Post-Migration

- [ ] Verify login works through gateway
- [ ] Check that new users are registered via GraphQL
- [ ] Confirm sessions are in gateway Redis
- [ ] Monitor cronide-user database - should have no session-related activity

---

## Common Questions

### Q: Why doesn't gateway have its own user database?

**A:** Separation of concerns:
- **Gateway** = Authentication (who are you?)
- **cronide-user** = User domain (what about you?)

The gateway only needs to know SwissOID identity (`sub`). The user service owns all user data.

### Q: What if gateway needs user info during auth?

**A:** It makes GraphQL queries to cronide-user:

```typescript
// Gateway needs to check if user is allowed
const result = await graphqlClient.query({
  query: gql`
    query GetUserByExternalUUID($uuid: String!) {
      getUserByExternalUUID(externalUUID: $uuid) {
        status
        payload {
          user {
            UUID
            isAllowed
          }
        }
      }
    }
  `,
  variables: { uuid: claims.sub }
});

if (!result.data.getUserByExternalUUID.payload.user.isAllowed) {
  throw new Error('User not allowed');
}
```

### Q: Can we delete cronide-user's Redis after Phase 5?

**A:** Yes! After Phase 5:
- Sessions are stored in gateway Redis
- cronide-user Redis is no longer needed
- Safe to remove from docker-compose.yml

### Q: What about existing sessions in cronide-user Redis?

**A:** They will expire naturally (TTL). Users will need to re-login through gateway. This is expected during the migration.

### Q: Does cronide-user need to expose more GraphQL endpoints?

**A:** It should already have these (check existing resolvers):
- `getUserByExternalUUID` ✓
- `registerUser` ✓ (might need to expose if currently private)
- `getUser` ✓

If not, add them before Phase 5.

---

## Summary Table

| Component | Before Phase 5 | After Phase 5 | Changes |
|-----------|----------------|---------------|---------|
| **cronide-gateway MySQL** | None | None | N/A |
| **cronide-gateway Redis** | None | **Sessions** | ✅ NEW |
| **cronide-user MySQL** | User tables | User tables | ❌ None |
| **cronide-user Redis** | Sessions | (Remove) | ✅ Delete |

**Key Insight:** User data stays exactly where it is. Only session storage moves from cronide-user Redis to cronide-gateway Redis.

---

## Docker Compose Changes Preview

### cronide-gateway/docker-compose.yml

```diff
version: "3.9"

services:
+ cronide-gateway-redis:
+   image: redis:latest
+   container_name: cronide-gateway-redis
+   expose:
+     - 6379
+   volumes:
+     - redis:/data
+   restart: always
+   networks:
+     - app_network

  cronide-gateway:
    image: "${DOCKER_IMAGE}"
    container_name: "${REVERSE_DOMAIN}"
+   depends_on:
+     - cronide-gateway-redis
    environment:
      # ... existing env vars ...
+     REDIS_HOST: cronide-gateway-redis
+     REDIS_PORT: 6379
+     SWISSOID_CLIENT_ID: "${SWISSOID_CLIENT_ID}"
      # ... more SwissOID config ...

+ volumes:
+   redis:

  networks:
    # ... existing networks ...
```

### cronide-user/docker-compose.yml

```diff
version: "3.9"

services:

- cronide-user-redis:
-   image: redis:latest
-   container_name: ${REDIS_HOST}
-   # ... remove entire service ...

  cronide-user-db:
    image: mariadb:10.9
    # ... keep as-is ...

  cronide-user:
    image: "${DOCKER_IMAGE}"
    depends_on:
-     - "${REDIS_HOST}"
      - "${DB_HOST}"
    environment:
      # ... keep DB config ...
-     # Remove all SwissOID config
-     # Remove all Redis config
```

**Database schema:** NO CHANGES