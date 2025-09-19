import { LoadDictElement } from 'di-why/build/src/DiContainer';
import type { HttpServer } from './httpServer';
import type { Logger } from 'saylo';
import { prefixHandle } from '../utils/prefixHandle';
import { CustomizableLoaderHandles } from '../utils/loadDictGenerator/customizableLoaderHandles';
import { MiddlewareAttacher, MiddlewarePathConfig } from '../types/middleware';

const loadDictElement: LoadDictElement<string> = {
  instance: 'here is where we pull everything together',
  // Every express plugin, is hooked in here
  async after({ serviceLocator }) {
    const logger = await serviceLocator.get<Logger>('logger');
    const loaderHandles = await serviceLocator.get<CustomizableLoaderHandles>(prefixHandle('loaderHandles'));
    const appConfig = await serviceLocator.get<any>(loaderHandles.appConfig);

    // Get middleware configuration (either from appConfig or use the injected one)
    const middlewareConfig: MiddlewarePathConfig = appConfig.middlewareConfig ||
      await serviceLocator.get<MiddlewarePathConfig>(prefixHandle('middlewareConfig'));

    // Process each path and its middlewares
    for (const [path, middlewares] of Object.entries(middlewareConfig)) {
      // Sort by priority descending (higher priority loads first)
      const sortedMiddlewares = [...middlewares].sort((a, b) =>
        (b.priority ?? 0) - (a.priority ?? 0)
      );

      for (const config of sortedMiddlewares) {
        if (config.enabled !== false) {  // Skip if explicitly disabled
          try {
            const attachMiddleware = await serviceLocator.get<MiddlewareAttacher>(config.name);
            attachMiddleware(path);
            logger.log(`Attached middleware ${config.name} to ${path}`);
          } catch (error) {
            if (config.required) {
              throw new Error(`Required middleware ${config.name} could not be loaded: ${error}`);
            } else {
              logger.log(`Optional middleware ${config.name} not available, skipping`);
            }
          }
        }
      }
    }

    // the http server is created, and wraps express app
    const httpServer = await serviceLocator.get<HttpServer>('httpServer');

    // Get server configuration
    const { serverPort, applicationName } = appConfig;

    // Start listening
    logger.log(`🚀 Launching "${applicationName}" 🚀`);
    await new Promise<void>((resolve) =>
      httpServer.listen({ port: serverPort }, resolve)
    );

    logger.log(`✅ Server listening at http://localhost:${serverPort}`);
  }
};

export default loadDictElement;