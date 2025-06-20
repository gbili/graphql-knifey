import { IncomingMessage } from "http";
import { HeaderAuthTokenExtractor } from "jwt-authorized";

export type GraphqlContext = { [k: string]: any; }

type ContextAugmentation = { IP?: string; }

export type AugmentedContext<C extends GraphqlContext> = C & ContextAugmentation;

export type GraphqlRequestContainer<C extends GraphqlContext = GraphqlContext, H = {}> = {
  context: C;
  req: IncomingMessage;
};

async function plugIPAddressIntoContext<C extends GraphqlContext>({ req: { headers, socket }, context }: GraphqlRequestContainer<C>): Promise<AugmentedContext<C>> {
  const raw = headers?.['x-forwarded-for'] ?? socket?.remoteAddress ?? undefined;
  const IP = Array.isArray(raw) ? raw[0] : raw;
  return (
    IP !== null
    ? {
      ...context,
      IP,
    }
    : context
  );
};

export const extractTokenAndIPAddressFromRequestIntoContext = (me: typeof HeaderAuthTokenExtractor) => (context: GraphqlContext) => async (requestContainer: GraphqlRequestContainer<GraphqlContext, { authorization?: string; }>) => {
  const nextContext: GraphqlContext & { token?: string; } = await (me.getAsyncContextReqMethod(context))(requestContainer);
  return await plugIPAddressIntoContext({ ...requestContainer, context: nextContext });
};

export default plugIPAddressIntoContext;