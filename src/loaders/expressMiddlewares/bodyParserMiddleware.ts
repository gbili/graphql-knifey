import { LoadDictElement } from 'di-why/build/src/DiContainer';
import express from 'express';
import type { Application } from '../app';
import { prefixValue, retunDepsInjectDecustomizedHandle } from '../../utils/prefixHandle';
import { MiddlewareAttacher } from '../../types/middleware';

const loadDictElement: LoadDictElement<MiddlewareAttacher> = {
  before: retunDepsInjectDecustomizedHandle('appConfig'),
  factory({ app }: { app: Application; appConfig: any }) {
    // Return a function that attaches the middleware when called
    return (path: string | '*') => {
      const middleware = express.json({ limit: '50mb' });

      if (path === '*') {
        // Global middleware - no path
        app.use(middleware);
      } else {
        // Path-specific middleware
        app.use(path, middleware);
      }
    };
  },
  locateDeps: {
    app: 'app',
    ...prefixValue('loaderHandles'),
  }
};

export default loadDictElement;