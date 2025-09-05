import { LoadDictElement } from 'di-why/build/src/DiContainer';
import cors from 'cors';
import type { Application } from '../app';
import { retunDepsInjectDecustomizedHandle, prefixValue } from '../../utils/prefixHandle';

const loadDictElement: LoadDictElement<string> = {
  before: retunDepsInjectDecustomizedHandle('appConfig'),
  factory({ app, appConfig }: { app: Application; appConfig: any }) {
    const { graphqlPath, corsAllowedOrigin, corsCredentials = true } = appConfig;

    app.use(
      graphqlPath,
      cors({
        origin: corsAllowedOrigin,
        credentials: Boolean(corsCredentials),
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

    return 'apolloCorsMiddleware';
  },
  locateDeps: {
    app: 'app',
    ...prefixValue('loaderHandles'),
  }
};

export default loadDictElement;