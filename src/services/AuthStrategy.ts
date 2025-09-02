import { SessionServiceInterface } from './SessionService';
import { LoadDictElement, GetInstanceType } from 'di-why/build/src/DiContainer';
import { ActionStatus } from '../generalTypes';
import { TokenPayload, GenerateTokenParams, VerifyTokenParams } from '../types/auth.types';

export interface AuthResult {
  success: boolean;
  status?: string;
  code?: string;
  message?: string;
  userId?: string;
  user?: any;
  token?: string;
  sessionId?: string;
  refreshId?: string;
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  userId?: string;
  user?: any;
  metadata?: Record<string, any>;
  sessionData?: any;
}

export interface AuthCredentials {
  username?: string;
  email?: string;
  password?: string;
  [key: string]: any;
}

export interface AuthStrategy<T = AuthCredentials> {
  authenticate(credentials: T): Promise<AuthResult>;
  validate(tokenOrSessionId: string): Promise<ValidationResult>;
  revoke(tokenOrSessionId: string): Promise<void>;
  refresh?(refreshToken: string): Promise<AuthResult>;
}

// User validator function type
export type UserValidator<T = AuthCredentials> = (credentials: T) => Promise<{ userId: string; user?: any } | null>;

// Cookie-based session strategy
export class CookieSessionStrategy implements AuthStrategy {
  constructor(
    private sessionService: SessionServiceInterface,
    private userValidator: UserValidator
  ) {}

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const validationResult = await this.userValidator(credentials);

      if (!validationResult) {
        return {
          success: false,
          status: ActionStatus.fail,
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials provided',
        };
      }

      const { sessionId, refreshId } = await this.sessionService.create(
        validationResult.userId,
        { user: validationResult.user }
      );

      return {
        success: true,
        status: ActionStatus.success,
        code: 'LOGIN_SUCCESS',
        message: 'Authentication successful',
        userId: validationResult.userId,
        user: validationResult.user,
        sessionId,
        refreshId,
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        status: ActionStatus.fail,
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      };
    }
  }

  async validate(sessionId: string): Promise<ValidationResult> {
    const session = await this.sessionService.validate(sessionId);

    if (!session) {
      return { valid: false };
    }

    return {
      valid: true,
      userId: session.userId,
      user: session.metadata?.user,
      metadata: session.metadata,
      sessionData: session,
    };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.sessionService.revoke(sessionId);
  }

  async refresh(refreshId: string): Promise<AuthResult> {
    const result = await this.sessionService.refresh(refreshId);

    if (!result) {
      return {
        success: false,
        status: ActionStatus.fail,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      };
    }

    return {
      success: true,
      status: ActionStatus.success,
      code: 'REFRESH_SUCCESS',
      message: 'Session refreshed successfully',
      sessionId: result.sessionId,
      refreshId: result.refreshId,
    };
  }
}

// Interface for token auth service
interface TokenAuthService {
  generateToken(params: GenerateTokenParams): string | Promise<string>;
  verifyToken(params: VerifyTokenParams): TokenPayload | false | Promise<TokenPayload | false>;
  authenticateTokenStrategy(params: { token: string; tokenConfig?: any }): Promise<{ status: ActionStatus; user?: any; userInfo?: any }>;
  blacklistToken?(token: string): Promise<void>;
}

// JWT strategy for backward compatibility
export class JWTStrategy implements AuthStrategy {
  constructor(
    private tokenAuthService: TokenAuthService,
    private userValidator: UserValidator
  ) {}

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const validationResult = await this.userValidator(credentials);

      if (!validationResult) {
        return {
          success: false,
          status: ActionStatus.fail,
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials provided',
        };
      }

      // Generate JWT token
      const token = await this.tokenAuthService.generateToken({
        UUID: validationResult.userId,
        ...validationResult.user,
      });

      return {
        success: true,
        status: ActionStatus.success,
        code: 'LOGIN_SUCCESS',
        message: 'Authentication successful',
        userId: validationResult.userId,
        user: validationResult.user,
        token,
      };
    } catch (error) {
      console.error('JWT authentication error:', error);
      return {
        success: false,
        status: ActionStatus.fail,
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      };
    }
  }

  async validate(token: string): Promise<ValidationResult> {
    try {
      const result = await this.tokenAuthService.authenticateTokenStrategy({
        token,
        tokenConfig: {},
      });

      // Handle both user and userInfo properties
      const userInfo = result.userInfo || result.user;
      return {
        valid: true,
        userId: userInfo?.UUID,
        user: result.user || result.userInfo,
        metadata: userInfo,
      };
    } catch (error) {
      return { valid: false };
    }
  }

  async revoke(token: string): Promise<void> {
    // JWTs are stateless, but we can blacklist if the service supports it
    if (this.tokenAuthService.blacklistToken) {
      await this.tokenAuthService.blacklistToken(token);
    }
  }
}

// Removed HybridAuthStrategy - now only pure cookie or JWT modes are supported

// Loader generators for DI
export const cookieStrategyLDEGen = (): LoadDictElement<GetInstanceType<typeof CookieSessionStrategy>> => ({
  factory: (deps: any) => {
    return new CookieSessionStrategy(
      deps.sessionService,
      deps.userValidator
    );
  },
  locateDeps: {
    sessionService: 'sessionService',
    userValidator: 'authService', // Assumes authService has a validate method
  }
});

export const jwtStrategyLDEGen = (): LoadDictElement<GetInstanceType<typeof JWTStrategy>> => ({
  factory: (deps: any) => {
    return new JWTStrategy(
      deps.tokenAuthService,
      deps.userValidator
    );
  },
  locateDeps: {
    tokenAuthService: 'tokenAuthService',
    userValidator: 'authService',
  }
});

// Removed hybridStrategyLDEGen - no longer supporting hybrid mode