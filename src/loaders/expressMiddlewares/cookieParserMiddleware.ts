import { LoadDictElement } from 'di-why/build/src/DiContainer';
import cookieParser from 'cookie-parser';
import type { Application } from '../app';
import { prefixValue, retunDepsInjectDecustomizedHandle } from '../../utils/prefixHandle';
import { MiddlewareAttacher } from '../../types/middleware';

const loadDictElement: LoadDictElement<MiddlewareAttacher> = {
  before: retunDepsInjectDecustomizedHandle('appConfig'),
  factory({ app, appConfig }: { app: Application; appConfig: any }) {
    const { cookieSecret } = appConfig;

    // Return a function that attaches the middleware when called
    return (path: string) => {
      // Parse cookies (signed if secret is provided)
      app.use(
        path,
        cookieSecret ? cookieParser(cookieSecret) : cookieParser()
      );
    };
  },
  locateDeps: {
    app: 'app',
    ...prefixValue('loaderHandles'),
  }
};

export default loadDictElement;