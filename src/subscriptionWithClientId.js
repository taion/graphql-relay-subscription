import {
  GraphQLInputObjectType, GraphQLNonNull, GraphQLObjectType, GraphQLString,
} from 'graphql';

export const SUBSCRIBE = {};

function resolveMaybeThunk(maybeThunk) {
  return typeof maybeThunk === 'function' ? maybeThunk() : maybeThunk;
}

function defaultGetPayload(obj) {
  return obj;
}

export default function subscriptionWithClientId({
  name,
  inputFields,
  outputFields,
  subscribe,
  getPayload = defaultGetPayload,
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

  return {
    type: outputType,
    args: {
      input: { type: new GraphQLNonNull(inputType) },
    },
    resolve: (obj, { input }, context, info) => {
      if (obj === SUBSCRIBE) {
        // We're in subscription mode. Run the subscribe hook for side effects,
        // then deliver the initial payload if present.
        return Promise.resolve(subscribe(input, context, info))
          .then(payload => (
            payload && {
              ...payload,
              clientSubscriptionId: input.clientSubscriptionId,
            }
          ));
      }

      return Promise.resolve(getPayload(obj, input, context, info))
        .then(payload => ({
          ...payload,
          clientSubscriptionId: input.clientSubscriptionId,
        }));
    },
  };
}
