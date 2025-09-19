import { LoadDictElement } from 'di-why/build/src/DiContainer';
import type { HttpServer } from './httpServer';
import type { Logger } from 'saylo';
import { prefixHandle } from '../utils/prefixHandle';
import { CustomizableLoaderHandles } from '../utils/loadDictGenerator/customizableLoaderHandles';

// Default middleware loading order
const DEFAULT_MIDDLEWARE_ORDER = [
  'apolloTrustProxyMiddleware',
  'apolloCorsMiddleware',
  'apolloCookieParserMiddleware',
  'apolloBodyParserMiddleware',
  'apolloHealthCheckMiddleware'
];

const loadDictElement: LoadDictElement<string> = {
  instance: 'here is where we pull everything together',
  // Every express plugin, is hooked in here
  async after({ serviceLocator }) {
    const logger = await serviceLocator.get<Logger>('logger');
    const loaderHandles = await serviceLocator.get<CustomizableLoaderHandles>(prefixHandle('loaderHandles'))
    const appConfig = await serviceLocator.get<any>(loaderHandles.appConfig);
    const middlewareList = (appConfig.apolloMiddlewaresList as string[]|undefined) || DEFAULT_MIDDLEWARE_ORDER;

    // Load all middleware in order
    for (const key of middlewareList) {
      // they hook themselves to express app
      await serviceLocator.get(key);
    }

    // IMPORTANT: responsible for creating apolloServer
    // through dependency loading.
    // Then hooks apollo into express app
    if (middlewareList.indexOf('apolloGraphqlMiddleware') === -1) {
      await serviceLocator.get('apolloGraphqlMiddleware');
    }

    // the http server is created, and wraps express app
    await serviceLocator.get<HttpServer>('httpServer');

    // Check if this is a subgraph server
    const isSubgraph = await serviceLocator.get<boolean>(prefixHandle('isSubgraph'));
    logger.log(`✅ Apollo server launched as ${isSubgraph ? 'Subgraph' : 'Public Graph'}`);
  }
};

export default loadDictElement;