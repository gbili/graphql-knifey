import { LoadDictElement } from 'di-why/build/src/DiContainer';
import http from 'http';

export type HttpServer = ReturnType<typeof http.createServer>;

const loadDictElement: LoadDictElement<HttpServer> = {
  factory: ({ app }) => http.createServer(app),
  locateDeps: {
    app: 'app',
  }
  // listen() call can not be made here, because apolloPlugins have it as dep
  // and firing before attaching apollo to express is bad.
};

export default loadDictElement;


// create express
// add stuff to express
// e.g. graphqlMidleware adds apolloServer, other middlewares add other stuff
// call httpServer pass in configured express (app)
// tell httpServer to listen