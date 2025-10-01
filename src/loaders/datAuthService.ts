import type { LoadDictElement } from 'di-why';
import { DATAuthService } from '../services/DATAuthService';
import deDoubleEscape from '../utils/deDoubleEscape';

const datAuthServiceLDE: LoadDictElement<DATAuthService> = {
  factory: ({ appConfig }) => {
    if (!appConfig.jwtKeyPublic) throw new Error('Missing appConfig.jwtKeyPublic for DAT validation');
    if (!appConfig.jwtAlgorithm) throw new Error('Missing appConfig.jwtAlgorithm for DAT validation');
    if (!appConfig.jwtIssuer) throw new Error('Missing appConfig.jwtIssuer for DAT validation');
    if (!appConfig.jwtAudience) throw new Error('Missing appConfig.jwtAudience for DAT validation');

    return new DATAuthService({
      publicKey: deDoubleEscape({ jwtKeyPublic: appConfig.jwtKeyPublic }, 'jwtKeyPublic'),
      algorithm: appConfig.jwtAlgorithm,
      issuer: appConfig.jwtIssuer,
      audience: appConfig.jwtAudience,
    });
  },
  locateDeps: {
    appConfig: 'appConfig',
  },
};

export default datAuthServiceLDE;
