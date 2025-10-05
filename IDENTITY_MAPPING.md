# Identity Mapping: SwissOID → Gateway → Services

This document summarises how SwissOID identities flow through the relying-party stack and end up persisted in the `cronide-user` database. It reflects the current `(externalIssuer, externalSubject)` design that replaced the legacy `externalUUID` field.

## SwissOID Claims

The SwissOID OpenID provider yields standard OIDC claims:

```ts
interface SwissOIDClaims {
  iss: string;           // e.g. "https://api.swissoid.com"
  sub: string;           // subject identifier scoped to the issuer
  aud: string;           // client_id registered with SwissOID
  exp: number;
  iat: number;
  nonce: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
}
```

The `(iss, sub)` tuple uniquely identifies a SwissOID account.

## Database Representation (`cronide-user`)

The user service now stores the tuple directly on the main `User` table:

```sql
CREATE TABLE User (
  UUID            varchar(255) NOT NULL,
  isAllowed       tinyint(1)   NOT NULL DEFAULT 1,
  externalIssuer  varchar(255) DEFAULT NULL,
  externalSubject varchar(255) DEFAULT NULL,
  email           varchar(255) DEFAULT NULL,
  username        varchar(255) DEFAULT NULL,
  PRIMARY KEY (UUID),
  UNIQUE KEY unique_external_auth (externalIssuer, externalSubject)
);

CREATE TABLE User_to_Metas (
  ID        int AUTO_INCREMENT PRIMARY KEY,
  userUUID  varchar(255) NOT NULL,
  name      varchar(255) NOT NULL,
  value     varchar(255) NOT NULL,
  UNIQUE KEY uniq_triplet (userUUID, name, value),
  FOREIGN KEY (userUUID) REFERENCES User(UUID) ON DELETE CASCADE
);
```

Metadata such as `email` and `username` are stored via `User_to_Metas` (with the table populated through the `userMetas` configuration in code). The old `externalUUID` meta is no longer required because the issuer+subject combination is now enforced at the schema level.

## Runtime Flow

1. **SwissOID login** – `swissoid-back` handles the Authorization Code flow, validates the ID token, and surfaces the claims to the gateway.
2. **Gateway registration** – `cronide-gateway` calls the `upsertUser` mutation exposed by `cronide-user`, sending `externalIssuer`, `externalSubject`, plus optional email/username fields. See `cronide-gateway/src/services/OidcUserRegistrar.ts` for the exact payload builder.
3. **Persistence** – `cronide-user/src/models/UserModel.ts` performs an `INSERT ... ON DUPLICATE KEY UPDATE` against the `User` table using the `(externalIssuer, externalSubject)` unique key. Metadata rows are upserted in the same transaction.
4. **Downstream access** – `cronide-gateway` stores the resulting internal UUID in the HTTP session and mints DATs containing that UUID for subgraphs (e.g. cronide-tag, cronide-project) to consume.

When subgraphs validate the DAT (via `graphql-knifey`’s `DATAuthService`) they obtain the internal UUID and can call `cronide-user` to resolve the user record if needed.

## Example

```
SwissOID claims          Gateway payload               User table row
-----------------------  ----------------------------  ------------------------------------------
iss = https://api...     externalIssuer  = https://…   UUID            = 88c4... (generated)
sub = swissoid|123456    externalSubject = swissoid…   externalIssuer  = https://api.swissoid.com
email = user@example.ch  email            = …          externalSubject = swissoid|123456
name  = Ada Example      username         = ada        email           = NULL (meta table)
                                                        username        = NULL (meta table)
```

Metadata entries for the example would look like:

```
(UserUUID, name, value)
(88c4..., 'email',    'user@example.ch')
(88c4..., 'username', 'ada')
(88c4..., 'externalIssuer',  'https://api.swissoid.com')
(88c4..., 'externalSubject', 'swissoid|123456')
```

> **Note:** the meta rows keep `externalIssuer`/`externalSubject` alongside the dedicated columns so existing reporting that relies on `User_to_Metas` continues to work. New integrations should prefer the columns.

## Legacy Compatibility

Older services that still reference `externalUUID` in `User_to_Metas` can continue to read it, but new code should migrate to the issuer+subject tuple. The helper `getUserByExternalUUID` remains available for backwards compatibility; it resolves the historic meta entry if present.
