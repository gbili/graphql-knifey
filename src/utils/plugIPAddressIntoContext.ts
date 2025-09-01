import { IncomingMessage } from "http";
import { HeaderAuthTokenExtractor } from "jwt-authorized";

export type GraphqlContext = { [k: string]: any; }

type ContextAugmentation = { IP?: string; }

export type AugmentedContext<C extends GraphqlContext> = C & ContextAugmentation;

export type GraphqlRequestContainer<C extends GraphqlContext = GraphqlContext, H = {}> = {
  context: C;
  req: IncomingMessage;
};

export function extractIPOrUndefined({ req: { headers, socket }}: { req: IncomingMessage }) {
  const raw = headers?.['x-forwarded-for'] ?? socket?.remoteAddress ?? undefined;
  const IP = Array.isArray(raw) ? raw[0] : raw;
  return IP;
}

export async function plugIPAddressIntoContext<C extends GraphqlContext>({ req, context }: GraphqlRequestContainer<C>): Promise<AugmentedContext<C>> {
  const IP = extractIPOrUndefined({ req });
  return (
    IP !== undefined
    ? {
      ...context,
      IP,
    }
    : context
  );
};

export const extractTokenAndIPAddressFromRequestIntoContext = (
  me: typeof HeaderAuthTokenExtractor,
  sharedContext_DONT_MUTATE_WITH_PER_REQUEST_DATA: GraphqlContext
) => {
  return async (
    requestContainer: GraphqlRequestContainer<GraphqlContext,
    { authorization?: string; }>
  ) => {
    const nextContext: GraphqlContext & { token?: string; } = await (me.getAsyncContextReqMethod(sharedContext_DONT_MUTATE_WITH_PER_REQUEST_DATA))(requestContainer);
    return await plugIPAddressIntoContext({ ...requestContainer, context: nextContext });
  }
};

export default plugIPAddressIntoContext;