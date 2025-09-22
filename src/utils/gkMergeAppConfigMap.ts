import { createAppConfigMerger } from 'di-why';
import gkAppConfigMap from '../config/appConfigMap';

/**
 * Creates a merger that combines graphql-knifey's default appConfigMap with a custom one.
 * This allows consumers to extend the default configuration while maintaining type safety.
 *
 * Usage:
 * ```typescript
 * const mergedConfig = gkMergeAppConfigMap(myCustomAppConfigMap);
 * export type AppConfig = ReturnType<typeof mergedConfig>;
 * ```
 */
export const gkMergeAppConfigMap = createAppConfigMerger(gkAppConfigMap);

export default gkMergeAppConfigMap;