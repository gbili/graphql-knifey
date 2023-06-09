import { GraphQLResolverMap } from "@apollo/subgraph/dist/schema-helper/resolverMap";
import { IncomingMessage } from "http";
import { TokenAuthCustomizableService } from 'jwt-authorized';

export type GqlResolversContextParams<T> = {
  tokenAuthService: TokenAuthCustomizableService;
  token: string;
  req: IncomingMessage;
} & T;

export type AuthenticateRequestAndPlugUserInInputParam = {
  tokenAuthService: TokenAuthCustomizableService;
  token: string;
}

export type TypeWithoutUndefined<T> = T extends undefined ? never : T;

export type GQLResolverDict<U> = TypeWithoutUndefined<GraphQLResolverMap<GqlResolversContextParams<U>>>;

export type UUID = string;

export type UUIDProp = {
  UUID: UUID;
}

export enum ActionStatus {
  success='SUCCESS',
  fail='FAIL',
}

export type ActionOutcomeSuccess<C, P> = {
  status: ActionStatus.success
  code: C;
  payload: P;
}

export type ActionFailSimplePayload = {
  message: string;
}

export type ActionOutcomeFail<C, P = undefined> = {
  status: ActionStatus.fail
  code: C;
  message: string;
  payload?: P;
}

export type ActionOutcomeForbidden = ActionOutcomeFail<'FORBIDDEN'>

export type ActionOutcomeError = ActionOutcomeFail<'ERROR'>