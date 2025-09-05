import { LoadDictElement } from 'di-why/build/src/DiContainer';
import type { Application } from '../app';

const loadDictElement: LoadDictElement<string> = {
  factory({ app }: { app: Application }) {
    app.get('/healthz', (_, res) => res.status(200).send('ok'));
    return 'apolloHealthCheckMiddleware';
  },
  locateDeps: {
    app: 'app'
  }
};

export default loadDictElement;