import { LoadDictElement } from 'di-why/build/src/DiContainer';
import express from 'express';
import type { Application } from '../app';
import { prefixValue, retunDepsInjectDecustomizedHandle } from '../../utils/prefixHandle';

const loadDictElement: LoadDictElement<string> = {
  before: retunDepsInjectDecustomizedHandle('appConfig'),
  factory({ app, appConfig }: { app: Application; appConfig: any }) {
    const { graphqlPath } = appConfig;

    app.use(
      graphqlPath,
      express.json({ limit: '50mb' })
    );

    return 'apolloBodyParserMiddleware';
  },
  locateDeps: {
    app: 'app',
    ...prefixValue('loaderHandles'),
  }
};

export default loadDictElement;