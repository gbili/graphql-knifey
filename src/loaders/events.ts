import { LoadDictElement } from "di-why/build/src/DiContainer";
import { createStarEvents } from "swiss-army-knifey";
import { EventEmitter } from "swiss-army-knifey/build/src/utils/starEvents";

const loadDictElement: LoadDictElement<EventEmitter> = {
  instance: createStarEvents(),
  after({ me, deps: { logger } }) {
    // log all events by default
    me.on('*', logger.log);
  },
  locateDeps: {
    logger: 'logger',
  },
};

export default loadDictElement;