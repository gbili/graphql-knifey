import { GqlResolversContextParams } from "../generalTypes";

export function authenticateRequestAndPlugUserInInput<T extends {}, Z>({ tokenAuthService, token }: Z extends GqlResolversContextParams<infer H> ? Z : never, input: T) {
  const { token: notNeeded, ...user } = tokenAuthService.authenticateTokenStrategy({ token });
  if (typeof user !== 'object' || user.UUID === undefined) {
    throw new Error('Unable to authenticate from token.');
  }
  return { ...input, user };
}