import DiContainer, { mergeLDs } from 'di-why';
import { loadDict } from '../src/loaders';
import { prefixHandle } from '../src/utils/prefixHandle';

(async function () {
  try {
    // Add minimal middlewareConfig for the test
    const testLoadDict = mergeLDs(
      loadDict,
      {
        [prefixHandle('middlewareConfig')]: {
          instance: {
            '/graphql': []  // Empty middleware config for test
          }
        }
      }
    );

    const di = new DiContainer({ load: testLoadDict });

    // Test that we can build the TypeScript code and load the dependencies
    await di.load(prefixHandle('expressLauncher'));

    // Get the HTTP server to shut it down properly
    const httpServer = await di.get('httpServer');

    console.log('✅ Build and dependency loading test passed!');
    console.log('Shutting down server...');

    // Close the server gracefully
    httpServer.close(() => {
      console.log('Server closed successfully');
      process.exit(0);
    });

    // Force exit after 2 seconds if server doesn't close
    setTimeout(() => {
      console.log('Force exiting after timeout');
      process.exit(0);
    }, 2000);

  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
})();
