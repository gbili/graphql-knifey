import { ActionOutcomeFail, ActionStatus } from "../generalTypes";

export const getFailOutcomeFromError = function (e: Error): ActionOutcomeFail<'ERROR'> {
  return {
    status: ActionStatus.fail,
    code: "ERROR",
    message: e.message,
  };
}

export default getFailOutcomeFromError;