import type { LoadDictElement } from 'di-why';
import { DATAuthMinterService } from '../services/DATAuthMinterService';
import deDoubleEscape from '../utils/deDoubleEscape';

const datAuthMinterServiceLDE: LoadDictElement<DATAuthMinterService> = {
  factory: ({ appConfig }) => {
    if (!appConfig.jwtKeyPrivate) throw new Error('Missing appConfig.jwtKeyPrivate for DAT minting');
    if (!appConfig.jwtKeyPublic) throw new Error('Missing appConfig.jwtKeyPublic for DAT minting');
    if (!appConfig.jwtAlgorithm) throw new Error('Missing appConfig.jwtAlgorithm for DAT minting');
    if (!appConfig.jwtIssuer) throw new Error('Missing appConfig.jwtIssuer for DAT minting');
    if (!appConfig.jwtAudience) throw new Error('Missing appConfig.jwtAudience for DAT minting');
    if (!appConfig.datTtl) throw new Error('Missing appConfig.datTtl for DAT minting');

    return new DATAuthMinterService({
      privateKey: deDoubleEscape(appConfig, 'jwtKeyPrivate'),
      publicKey: deDoubleEscape(appConfig, 'jwtKeyPublic'),
      algorithm: appConfig.jwtAlgorithm,
      ttl: appConfig.datTtl,
      issuer: appConfig.jwtIssuer,
      audience: appConfig.jwtAudience,
    });
  },
  locateDeps: {
    appConfig: 'appConfig',
  },
};

export default datAuthMinterServiceLDE;
