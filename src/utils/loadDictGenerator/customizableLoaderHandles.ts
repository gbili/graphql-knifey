export type PrefixedHandles = 'loaderHandles' | 'resolvers' | 'typeDefs' | 'isSubgraph' | 'apolloPlugins' | 'apolloPullTogetherAndListen';

export const customizableLoaderHandles = {
  appConfig: 'appConfig',
  apolloContext: 'apolloContext',
  logger: 'logger',
}

export type CustomizableLoaderHandles = typeof customizableLoaderHandles;
export type CustomizableLoaderHandlesKeys = keyof CustomizableLoaderHandles;