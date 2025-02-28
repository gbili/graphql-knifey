import { LoadDictElement } from "di-why/build/src/DiContainer";
import { createStarEvents } from "swiss-army-knifey";

const loadDictElement: LoadDictElement<ReturnType<typeof createStarEvents>> = {
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