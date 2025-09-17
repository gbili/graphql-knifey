import DiContainer from 'di-why';
import { loadDict } from '../src/loaders';

try {
  (async function () {
    try {
      const di = new DiContainer({ load: loadDict });
      await di.load('apolloPullTogetherAndListen');
    } catch (err) {
      throw err;
    }
  })();
} catch (err) {
  throw err;
}
