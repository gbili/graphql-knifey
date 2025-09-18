import { UnknownEnv } from "swiss-army-knifey";
import { AppConfigMap } from "../loaders/appConfig";

export const mergeAppConfigMaps = <S extends AppConfigMap<any>>(appConfigMap: S) => <T extends AppConfigMap<any>>(localAppConfigMap: T): (env: UnknownEnv) => ReturnType<T> & ReturnType<S> => {
  return (env: UnknownEnv) => ({ ...appConfigMap(env), ...localAppConfigMap(env), });
};