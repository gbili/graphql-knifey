export type TypeWithoutUndefined<T> = T extends undefined ? never : T;

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