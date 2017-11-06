import {
  GraphQLInputObjectType, GraphQLNonNull, GraphQLObjectType, GraphQLString,
} from 'graphql';

function resolveMaybeThunk(maybeThunk) {
  return typeof maybeThunk === 'function' ? maybeThunk() : maybeThunk;
}

function defaultGetPayload(obj) {
  return obj;
}

export function subscriptionWithClientId({
  name,
  inputFields,
  outputFields,
  subscribe,
  getPayload = defaultGetPayload,
  ...config
}) {
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
    wrappedSubscribe = (obj, { input }, context, info) => (
      subscribe(input, context, info)
    );
  } else {
    wrappedSubscribe = undefined;
  }

  return {
    type: outputType,
    args: {
      input: { type: new GraphQLNonNull(inputType) },
    },
    subscribe: wrappedSubscribe,
    resolve: (obj, { input }, context, info) => (
      Promise.resolve(getPayload(obj, input, context, info))
        .then(payload => ({
          ...payload,
          clientSubscriptionId: input.clientSubscriptionId,
        }))
    ),
    ...config,
  };
}
