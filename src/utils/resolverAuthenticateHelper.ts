import { AuthenticateRequestAndPlugUserInInputParam } from "../generalTypes";
type UserAnyProps = {
  [k: string]: any;
  UUID: string;
};
export function authenticateRequestAndPlugUserInInput<T extends {}>({ tokenAuthService, token }: AuthenticateRequestAndPlugUserInInputParam, input?: T): { user: UserAnyProps } & T {
  const { token: notNeeded, ...user } = tokenAuthService.authenticateTokenStrategy({ token, tokenConfig: {} });

  if (typeof user !== 'object' || user.UUID === undefined) {
    throw new Error('Unable to authenticate from token.');
  }

  return {
    ...(input ? input : {}) as T,
    user
  };
}