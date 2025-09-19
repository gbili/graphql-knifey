import { LoadDictElement } from 'di-why/build/src/DiContainer';
import type { Application } from '../app';
import { MiddlewareAttacher } from '../../types/middleware';

const loadDictElement: LoadDictElement<MiddlewareAttacher> = {
  factory({ app }: { app: Application }) {
    // Return a function that attaches the middleware when called
    return (path: string) => {
      // Health check endpoint - path parameter is used as the route
      app.get(path, (_, res) => res.status(200).send('ok'));
    };
  },
  locateDeps: {
    app: 'app'
  }
};

export default loadDictElement;