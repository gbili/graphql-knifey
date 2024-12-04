import express from 'express';
import { LoadDictElement } from 'di-why/build/src/DiContainer';
import { Logger } from 'swiss-army-knifey/build/src/utils/logger';

export type Application = ReturnType<typeof express>;

const loadDictElement: LoadDictElement<Application> = {
  instance: express(),
  async after({ me, serviceLocator }) {
    const logger = await serviceLocator.get<Logger>('logger');
    logger.log('=============== Loaded express app ===============', me);
  },
};

export default loadDictElement;