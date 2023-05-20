import { LoadDictElement } from "di-why/build/src/DiContainer";
import createStarEvents, { StarEvents } from "../utils/starEvents";

const loadDictElement: LoadDictElement<StarEvents> = {
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