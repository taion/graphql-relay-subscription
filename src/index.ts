import {
  GraphQLFieldConfig,
  GraphQLInputFieldConfigMap,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLString,
  Thunk,
} from 'graphql';

type SubscriptionFn = (
  object: any,
  context: any,
  info: GraphQLResolveInfo,
) => Promise<any> | any;

type SubscriptionConfig = {
  name: string;
  description?: string;
  deprecationReason?: string;
  subscribe?: SubscriptionFn;
  inputFields: Thunk<GraphQLInputFieldConfigMap>;
  outputFields: Thunk<GraphQLInputFieldConfigMap>;
  getPayload?: (
    obj: any,
    input: any,
    context: any,
    info: GraphQLResolveInfo,
  ) => Promise<any> | any;
};

function resolveMaybeThunk<T>(maybeThunk: Thunk<T>): T {
  return typeof maybeThunk === 'function'
    ? // @ts-ignore
      maybeThunk()
    : maybeThunk;
}

function defaultGetPayload(obj: any) {
  return obj;
}

export function subscriptionWithClientId({
  name,
  description,
  deprecationReason,
  subscribe,
  inputFields,
  outputFields,
  getPayload = defaultGetPayload,
}: SubscriptionConfig): GraphQLFieldConfig<any, any> {
  const inputType = new GraphQLInputObjectType({
    name: `${name}Input`,
    fields: () => ({
      ...resolveMaybeThunk(inputFields),
      clientSubscriptionId: { type: GraphQLString },
    }),
  });

  const outputType = new GraphQLObjectType({
    name: `${name}Payload`,
    fields: () => ({
      ...resolveMaybeThunk(outputFields),
      clientSubscriptionId: { type: GraphQLString },
    }),
  });

  let wrappedSubscribe;
  if (subscribe) {
    wrappedSubscribe = (
      obj: any,
      { input }: any,
      context: any,
      info: GraphQLResolveInfo,
    ) => subscribe(input, context, info);
  } else {
    wrappedSubscribe = undefined;
  }

  return {
    type: outputType,
    description,
    deprecationReason,
    args: {
      input: { type: new GraphQLNonNull(inputType) },
    },
    subscribe: wrappedSubscribe,
    resolve: (obj, { input }, context, info) =>
      Promise.resolve(getPayload(obj, input, context, info)).then(
        (payload) => ({
          ...payload,
          clientSubscriptionId: input.clientSubscriptionId,
        }),
      ),
  };
}
