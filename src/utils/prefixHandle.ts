// Avoid overwriting user di props

import { CustomizableLoaderHandles, CustomizableLoaderHandlesKeys, PrefixedHandles } from "./loadDictGenerator/customizableLoaderHandles";

export function prefixHandle(handle: PrefixedHandles) {
  return 'gqlknifey_' + handle;
}

export function prefixBoth(handle: PrefixedHandles) {
  return { [prefixHandle(handle)]: prefixHandle(handle) };
}

// The loaders dict has this dep prefixed, but we want to locate it and pass it unprefixed
export function prefixValue(handle: PrefixedHandles) {
  return { [handle]: prefixHandle(handle) };
}

export const retunDepsInjectDecustomizedHandle = <S extends { get: (ref: string) => Promise<any>}, D extends object>(loaderHandle: CustomizableLoaderHandlesKeys) => async (
  {
    serviceLocator,
    deps: { loaderHandles, ...rest }
  }: {
    serviceLocator: S;
    deps: { loaderHandles?: CustomizableLoaderHandles; } & D
  }
) => {
  return {
    ...rest,
    [loaderHandle]: await serviceLocator.get(loaderHandles![loaderHandle]),
  }
};