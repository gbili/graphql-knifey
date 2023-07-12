import { AuthenticateRequestAndPlugUserInInputParam } from "../generalTypes";

export function authenticateRequestAndPlugUserInInput<T extends {}>({ tokenAuthService, token }: AuthenticateRequestAndPlugUserInInputParam, input?: T) {
  const { token: notNeeded, ...user } = tokenAuthService.authenticateTokenStrategy({ token, tokenConfig: {} });
  if (typeof user !== 'object' || user.UUID === undefined) {
    throw new Error('Unable to authenticate from token.');
  }
  return { ...(input ? input : {}), user };
}