import { LoadDictElement } from 'di-why/build/src/DiContainer';
import cors from 'cors';
import type { Application } from '../app';
import { retunDepsInjectDecustomizedHandle, prefixValue } from '../../utils/prefixHandle';

const loadDictElement: LoadDictElement<string> = {
  before: retunDepsInjectDecustomizedHandle('appConfig'),
  factory({ app, appConfig, isSubgraph }: { app: Application; appConfig: any; isSubgraph?: boolean }) {
    const { graphqlPath, corsAllowedOrigin, corsCredentials = true, nodeEnv, enableDevCors } = appConfig;

    // Subgraphs should not have CORS by default (server-to-server communication)
    // Only enable for local development if explicitly requested or if Public Graph
    if ((!isSubgraph || (nodeEnv !== 'production' && enableDevCors)) && corsAllowedOrigin) {
      app.use(
        graphqlPath,
        cors({
          origin: corsAllowedOrigin,
          credentials: Boolean(!isSubgraph && corsCredentials), // Subgraphs don't need credentials
          methods: ['GET', 'POST', 'OPTIONS'],
          allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Apollo-Require-Preflight',
            'X-Requested-With',
            'X-CSRF-Token',
          ],
          maxAge: 86400,
        })
      );
    }

    return 'apolloCorsMiddleware';
  },
  locateDeps: {
    app: 'app',
    ...prefixValue('loaderHandles'),
    ...prefixValue('isSubgraph'),
  }
};

export default loadDictElement;