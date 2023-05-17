import { LoadDictElement } from "di-why/build/src/DiContainer";
import { EventsInterface } from "jwt-authorized/build/src/loaders/events";
import { LoggerInterface } from "saylo/build/src/Logger";

const loadDictElement: LoadDictElement<EventsInterface> = {
  factory({ logger }: { logger: LoggerInterface }) {
    const events = {
      emit(...params: any[]) {
        logger.log(params);
      },
    };
    return events;
  },
  locateDeps: {
    logger: 'logger',
  },
};

export default loadDictElement;