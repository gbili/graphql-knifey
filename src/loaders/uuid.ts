import { randomUUID } from 'crypto';
import { LoadDictElement } from 'di-why/build/src/DiContainer';

// Use Node's built-in crypto.randomUUID() - no external dependency needed
const uuidLDE: LoadDictElement<() => string> = {
  instance: randomUUID,
};

export default uuidLDE;