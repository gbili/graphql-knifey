import { LoadDictElement } from 'di-why/build/src/DiContainer';
import http from 'http';
import { prefixValue } from '../utils/prefixHandle';
import { CustomizableLoaderHandles } from '../utils/loadDictGenerator/customizableLoaderHandles';

export type HttpServer = ReturnType<typeof http.createServer>;

const loadDictElement: LoadDictElement<HttpServer> = {
  factory: ({ app }) => http.createServer(app),
  locateDeps: {
    app: 'app',
    logger: 'logger',
    ...prefixValue('loaderHandles'),
  },
  async after({ me: httpServer, serviceLocator, deps: { logger, loaderHandles } }) {
    const {
      serverPort,
      graphqlPath,
      applicationName
    } = await serviceLocator.get<any>((loaderHandles as CustomizableLoaderHandles).appConfig);

    logger.log(`🚀 Launching "${applicationName}" 🚀`);
    await new Promise<void>((resolve) =>
      httpServer.listen({ port: serverPort }, resolve)
    );
    logger.log(`✅ Http Server listening at http://localhost:${serverPort}${graphqlPath}`);
  }
};

export default loadDictElement;


// create express
// add stuff to express
// e.g. graphqlMidleware adds apolloServer, other middlewares add other stuff
// call httpServer pass in configured express (app)
// tell httpServer to listen