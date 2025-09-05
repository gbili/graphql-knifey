import { LoadDictElement } from 'di-why/build/src/DiContainer';
import type { Application } from '../app';

const loadDictElement: LoadDictElement<string> = {
  factory({ app }: { app: Application }) {
    // Trust reverse proxies (so secure cookies & proto work correctly behind TLS terminators)
    app.set('trust proxy', 1);
    return 'apolloTrustProxyMiddleware';
  },
  locateDeps: {
    app: 'app'
  }
};

export default loadDictElement;