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

export const locateAllDeps = async <S extends { get: (ref: string) => Promise<any>}, D extends object>(depsHandles: string[], serviceLocator: S, loaderHandles?: CustomizableLoaderHandles) => {
  const lookedUpHanldes = loaderHandles ? (depsHandles as CustomizableLoaderHandlesKeys[]).map(h => loaderHandles[h]) : depsHandles
  return {
    ...((await Promise.all(lookedUpHanldes.map(async h => [h, await serviceLocator.get(h)]))).reduce((p, [h, service]) => ({...p, [h]: service }), {})),
  }
}

export const retunDepsInjectDecustomizedHandle = <S extends { get: (ref: string) => Promise<any>}, D extends object>(
    loaderHandleToLookup: CustomizableLoaderHandlesKeys,
  ) => async (
    // loaderHandles are customizable, and if they are loaderHanldes contains the customized handle
    { serviceLocator, deps: { loaderHandles, ...rest }}: { serviceLocator: S; deps: { loaderHandles?: CustomizableLoaderHandles; } & D }
  ) => {
  return {
    ...rest,
    ...(await locateAllDeps([loaderHandleToLookup], serviceLocator, loaderHandles)),
  }
};