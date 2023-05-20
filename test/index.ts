import di from '../src/loaders';

try {
  (async function () {
    try {
      await di.load('mysqlReq');
    } catch (err) {
      throw err;
    }
  })();
} catch (err) {
  throw err;
}
