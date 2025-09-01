# GraphQL Project Knifey

Reuse code for generic graphql projects.

## Usage

```ts
import diContainer, { apolloContextLDEGen, apolloServerLDEGen, appConfigLDEGen } from 'graphql-knifey';

// create you injection dict
const myInjectionDict = {
  // map config from env
  apolloContext: apolloContextLDEGen({
    userService: 'userService',
    tokenAuthService: 'tokenAuthService',
  }),
  apolloServer: apolloServerLDEGen(resolvers, graphqlSchema),
  aService: aServiceLoadDictElement,
  // ... can override graphql-knifey entries
};

// pass it to graphql-knifey's default one
diContainer.addToLoadDict(myInjectionDict);
```

## Customize/Augment `appConfig`

```ts
import diContainer, { appConfigLDEGen, mergeToDefaultAppConfigMap } from 'graphql-knifey';
import localAppConfigMap from '../config/appConfig';

// create you injection dict
const myInjectionDict = {
  // override defaultAppConfig with a merge between defaultAppConfigMap and your localAppConfigMap
  appConfig: appConfigLDEGen(mergeToDefaultAppConfigMap(localAppConfigMap)),
  // ... rest of entres as in previous example
};

// pass it to graphql-knifey's default one
diContainer.addToLoadDict(myInjectionDict);
```

## Cookies vs Authorization Header

Cookies in a **GraphQL API** can get tricky because they involve both **server CORS setup** and **browser behavior**. Let's break it down in context of two setups (**public** vs. **subgraph**).

---

### 1. Why cookies are special

Unlike headers (`Authorization: Bearer ...`), cookies are automatically attached by browsers only if **three conditions** are satisfied:

1. **CORS allows credentials**
   On the server:

   ```ts
   cors({ origin: "https://app.example.com", credentials: true })
   ```

   On the client (fetch/Apollo Client):

   ```ts
   fetch("/graphql", {
     method: "POST",
     credentials: "include",   // <— critical
   });
   ```

2. **Cookie attributes** must be set properly:

   * `Secure`: required if served over HTTPS (mandatory in Chrome if `SameSite=None`).
   * `HttpOnly`: prevents JS from reading the cookie — highly recommended for session tokens.
   * `SameSite`:

     * `Lax` (default): cookie sent for top-level navigation (GET), but not for subrequests (like GraphQL fetch from a SPA).
     * `Strict`: cookie only sent if the site is the same origin — breaks cross-origin APIs.
     * `None`: cookie always sent, **but must also have `Secure`**.

3. **Domain and path** must cover your frontend.
   Example: if API is on `api.example.com` and frontend on `app.example.com`, you’d typically set:

   ```http
   Set-Cookie: session=abc123; Domain=.example.com; Path=/; SameSite=None; Secure; HttpOnly
   ```

---

### 2. Public Graph (browser-facing)

Here you **must configure cookies + CORS** correctly if you use them for auth:

* **Server CORS config**:

  ```ts
  app.use(
    "/graphql",
    cors({
      origin: "https://app.example.com",
      credentials: true,   // must be true for cookies
    }),
    express.json(),
    expressMiddleware(server, { context })
  );
  ```

* **Client fetch/Apollo Client config**:

  ```ts
  const client = new ApolloClient({
    uri: "https://api.example.com/graphql",
    cache: new InMemoryCache(),
    credentials: "include",   // tells browser to send cookies
  });
  ```

* **Cookie issue example**:
  If you forget `SameSite=None; Secure`, the cookie won’t be sent in cross-origin requests (browser silently drops it). This is the #1 cause of “why isn’t my cookie auth working?”

---

### 3. Subgraph (behind a gateway)

Cookies almost never matter here:

* Browsers don’t talk to the subgraph directly → no CORS, no cookies.
* The **gateway** might forward headers (e.g., `Authorization`) to the subgraphs.
* If you wanted to forward cookies, the gateway would parse them into headers first.

👉 So: you **don’t need cookie setup** on the subgraph at all.

---

### 4. Best practice recommendation

* **For public graph**:

  * Use cookies only if you want true browser-based sessions (good for web apps, SSR, refresh tokens).
  * Always set `SameSite=None; Secure; HttpOnly`.
  * Configure CORS with `credentials: true` on both sides.
* **For subgraph**: ignore cookies; forward an `Authorization` header from the gateway.

---

Do you want me to **add cookie session support directly in the public-graph DI code** (with `cookie-parser` + context extraction), so it’s clear how it would integrate?
