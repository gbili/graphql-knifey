export type PrefixedHandles = 'loaderHandles' | 'resolvers' | 'typeDefs'

export const customizableLoaderHandles = {
  appConfig: 'appConfig',
  apolloContext: 'apolloContext',
  logger: 'logger',
}

export type CustomizableLoaderHandles = typeof customizableLoaderHandles;
export type CustomizableLoaderHandlesKeys = keyof CustomizableLoaderHandles;