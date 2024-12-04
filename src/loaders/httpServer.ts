import { LoadDictElement } from 'di-why/build/src/DiContainer';
import http from 'http';

export type HttpServer = ReturnType<typeof http.createServer>;

const loadDictElement: LoadDictElement<HttpServer> = {
  factory: ({ app }) => http.createServer(app),
  locateDeps: {
    app: 'app',
  }
};

export default loadDictElement;