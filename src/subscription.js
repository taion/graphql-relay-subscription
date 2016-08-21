import { GraphQLInputObjectType, GraphQLNonNull, GraphQLObjectType }
  from 'graphql';

export const SUBSCRIBE = {};

function defaultGetPayload(obj) {
  return obj;
}

export default function subscription({
  name,
  inputFields,
  outputFields,
  subscribe,
  getPayload = defaultGetPayload,
}) {
  const inputType = new GraphQLInputObjectType({
    name: `${name}Input`,
    fields: inputFields,
  });

  const outputType = new GraphQLObjectType({
    name: `${name}Payload`,
    fields: outputFields,
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
