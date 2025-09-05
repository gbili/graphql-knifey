import { LoadDictElement } from 'di-why/build/src/DiContainer';
import cookieParser from 'cookie-parser';
import type { Application } from '../app';
import { prefixValue, retunDepsInjectDecustomizedHandle } from '../../utils/prefixHandle';

const loadDictElement: LoadDictElement<string> = {
  before: retunDepsInjectDecustomizedHandle('appConfig'),
  factory({ app, appConfig }: { app: Application; appConfig: any }) {
    const { graphqlPath, cookieSecret } = appConfig;

    // Parse cookies (signed if secret is provided)
    app.use(
      graphqlPath,
      cookieSecret ? cookieParser(cookieSecret) : cookieParser()
    );

    return 'apolloCookieParserMiddleware';
  },
  locateDeps: {
    app: 'app',
    ...prefixValue('loaderHandles'),
  }
};

export default loadDictElement;