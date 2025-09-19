import { LoadDictElement } from 'di-why/build/src/DiContainer';
import cors from 'cors';
import type { Application } from '../app';
import { retunDepsInjectDecustomizedHandle, prefixValue } from '../../utils/prefixHandle';
import { MiddlewareAttacher } from '../../types/middleware';

const loadDictElement: LoadDictElement<MiddlewareAttacher> = {
  before: retunDepsInjectDecustomizedHandle('appConfig'),
  factory({ app, appConfig, isSubgraph }: { app: Application; appConfig: any; isSubgraph?: boolean }) {
    const { corsAllowedOrigin, corsCredentials = true } = appConfig;

    if (!isSubgraph && !corsAllowedOrigin) {
      console.warn('WARNING: when standalone server pass .env:CORS_ALLOWED_ORIGIN=...');
    }

    // Return a function that attaches the middleware when called
    return (path: string) => {
      // Subgraphs should not have CORS by default (server-to-server communication)
      if (!isSubgraph && corsAllowedOrigin) {
        app.use(
          path,
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
    };
  },
  locateDeps: {
    app: 'app',
    ...prefixValue('loaderHandles'),
    ...prefixValue('isSubgraph'),
  }
};

export default loadDictElement;