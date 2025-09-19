export type PrefixedHandles = 'loaderHandles' | 'resolvers' | 'typeDefs' | 'isSubgraph' | 'apolloPlugins' | 'expressLauncher' | 'appConfigMap' | 'middlewareConfig';

export const customizableLoaderHandles = {
  appConfig: 'appConfig',
  appConfigMap: 'appConfigMap',
  apolloContext: 'apolloContext',
  logger: 'logger',
}

export type CustomizableLoaderHandles = typeof customizableLoaderHandles;
export type CustomizableLoaderHandlesKeys = keyof CustomizableLoaderHandles;