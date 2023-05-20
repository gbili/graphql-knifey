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