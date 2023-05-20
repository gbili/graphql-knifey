import express from 'express';
import { LoadDictElement } from 'di-why/build/src/DiContainer';
import { LoggerInterface } from './logger';

export type Application = ReturnType<typeof express>;

const loadDictElement: LoadDictElement<Application> = {
  instance: express(),
  async after({ me, serviceLocator }) {
    const logger = await serviceLocator.get<LoggerInterface>('logger');
    logger.log('=============== Loaded express app ===============');
    logger.log(me);
  },
};

export default loadDictElement;