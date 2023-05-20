import tokenConfigLDE from './tokenConfig';
import tokenAuthServiceLDE from './tokenAuthService';
import { LoadDict } from 'di-why/build/src/DiContainer';

export const tokenAuthServiceLDEs: LoadDict = {
  tokenConfig: tokenConfigLDE,
  tokenAuthService: tokenAuthServiceLDE,
};

export default tokenAuthServiceLDEs;