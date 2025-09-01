/**
 * Core authentication type definitions
 */

import { ActionStatus } from '../generalTypes';

// User types
export interface User {
  UUID: string;
  username?: string;
  email?: string;
}

export interface TokenUser extends User {
  token: string;
}

// Authentication input types
export interface LoginInput {
  email?: string;
  username?: string;
  plainPassword: string;
  targetServiceHandle?: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  plainPassword: string;
  targetServiceHandle?: string;
  lang?: string;
}

// Authentication result types
export interface AuthenticationResult {
  status: ActionStatus | string; // Can be enum or string for compatibility
  code?: string;
  message?: string;
  user?: User | TokenUser;
  token?: string;
  sessionId?: string;
  refreshId?: string;
}

// Token/Session validation types
export interface TokenPayload {
  UUID: string;
  aud?: string;
  exp?: number;
  iat?: number;
  username?: string;
  email?: string;
  [key: string]: unknown; // Allow additional claims but not any
}

export interface SessionMetadata {
  user?: User;
  createdAt?: number;
  lastAccessedAt?: number;
  [key: string]: unknown; // Allow additional metadata but not any
}

// Service configuration types
export interface TokenConfig {
  keys?: {
    publicKey: string;
    privateKey?: string;
  };
  algorithm?: string;
  expiresIn?: string | number;
  requiredAud?: string;
}

// Auth service method parameters
export interface AuthenticateParams {
  loginInput: LoginInput;
  IP?: string;
  targetServiceHandle?: string;
}

export interface AuthenticateTokenParams {
  token: string;
  IP?: string;
  tokenConfig?: TokenConfig;
}

export interface VerifyTokenParams {
  token: string;
  tokenConfig?: TokenConfig;
}

export interface GenerateTokenParams {
  UUID: string;
  username?: string;
  email?: string;
  aud?: string;
  [key: string]: unknown; // Additional claims
}

// Validation results
export interface ValidationResult {
  valid: boolean;
  userId?: string;
  user?: User;
  metadata?: SessionMetadata;
  sessionData?: SessionMetadata;
}

// Auth strategy results
export interface AuthResult {
  success: boolean;
  status?: ActionStatus | string;
  code?: string;
  message?: string;
  userId?: string;
  user?: User;
  token?: string;
  sessionId?: string;
  refreshId?: string;
  metadata?: SessionMetadata;
}

// Credentials for auth strategies
export interface AuthCredentials {
  username?: string;
  email?: string;
  password?: string;
  [key: string]: unknown; // Allow additional fields but not any
}

// User validator return type
export interface UserValidationResult {
  userId: string;
  user?: User;
}

// Type guard functions
export function isTokenUser(user: User | TokenUser | undefined): user is TokenUser {
  return user !== undefined && 'token' in user;
}

export function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'UUID' in value &&
    typeof (value as User).UUID === 'string'
  );
}