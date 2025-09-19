import { LoadDictElement } from 'di-why/build/src/DiContainer';
import type { Application } from '../app';
import { MiddlewareAttacher } from '../../types/middleware';

const loadDictElement: LoadDictElement<MiddlewareAttacher> = {
  factory({ app }: { app: Application }) {
    // Return a function that attaches the middleware when called
    return (_: string) => {
      // Trust reverse proxies (so secure cookies & proto work correctly behind TLS terminators)
      // Note: This is a global Express setting, not path-specific
      app.set('trust proxy', 1);
    };
  },
  locateDeps: {
    app: 'app'
  }
};

export default loadDictElement;