import { HeaderAuthTokenExtractor } from "jwt-authorized";

export type GraphqlContext = { [k: string]: any; }

type ContextAugmentation = { IP?: string; }

export type AugmentedContext<C extends GraphqlContext> = C & ContextAugmentation;

export type GraphqlRequestContainer<C extends GraphqlContext = GraphqlContext, H = {}> = {
  context: C;
  req: {
    headers?: {
      'x-forwarded-for'?: string;
    } & H;
    socket?: {
      remoteAddress?: string;
    }
  };
};

async function plugIPAddressIntoContext<C extends GraphqlContext>({ req: { headers, socket }, context }: GraphqlRequestContainer<C>): Promise<AugmentedContext<C>> {
  const IP = headers && (headers['x-forwarded-for'] || (socket && socket.remoteAddress) || null);
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