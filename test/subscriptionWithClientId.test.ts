import {
  ExecutionResult,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  parse,
  subscribe,
} from 'graphql';

import { subscriptionWithClientId } from '../src';

describe('default resolution', () => {
  let schema: GraphQLSchema;

  beforeEach(() => {
    schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          dummy: { type: GraphQLString },
        },
      }),
      subscription: new GraphQLObjectType({
        name: 'Subscription',
        fields: {
          foo: subscriptionWithClientId({
            name: 'FooSubscription',
            outputFields: {
              value: { type: GraphQLString },
            },
            async *subscribe() {
              yield { value: 'bar' };
            },
          }),
          bar: subscriptionWithClientId({
            name: 'BarSubscription',
            outputFields: {
              value: { type: GraphQLString },
            },
          }),
        },
      }),
    });
  });

  it('should subscribe', async () => {
    const subscription = await subscribe(
      schema,
      parse(`
        subscription {
          foo(input: {}) {
            value
          }
        }
      `),
    );

    expect(
      await (subscription as AsyncIterableIterator<ExecutionResult>).next(),
    ).toEqual({
      value: {
        data: {
          foo: {
            value: 'bar',
          },
        },
      },
      done: false,
    });

    expect(
      await (subscription as AsyncIterableIterator<ExecutionResult>).next(),
    ).toEqual({
      done: true,
    });
  });

  it('should default-subscribe', async () => {
    async function* generator() {
      yield { value: 'foo' };
    }

    const subscription = await subscribe(
      schema,
      parse(`
        subscription {
          bar(input: {}) {
            value
          }
        }
      `),
      {
        bar: generator(),
      },
    );

    expect(
      await (subscription as AsyncIterableIterator<ExecutionResult>).next(),
    ).toEqual({
      value: {
        data: {
          bar: {
            value: 'foo',
          },
        },
      },
      done: false,
    });

    expect(
      await (subscription as AsyncIterableIterator<ExecutionResult>).next(),
    ).toEqual({
      done: true,
    });
  });
});

describe('custom resolution', () => {
  let schema: GraphQLSchema;

  beforeEach(() => {
    schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          dummy: { type: GraphQLString },
        },
      }),
      subscription: new GraphQLObjectType({
        name: 'Subscription',
        fields: {
          foo: subscriptionWithClientId({
            name: 'FooSubscription',
            inputFields: () => ({
              arg: { type: GraphQLString },
            }),
            outputFields: () => ({
              value: { type: GraphQLString },
              arg: { type: GraphQLString },
            }),
            async *subscribe(_, { arg }) {
              yield { value: `subscribed:${arg}` };
              yield { value: 'bar' };
            },
            // eslint-disable-next-line require-await
            getPayload: async ({ value }, { arg }) => ({ value, arg }),
          }),
        },
      }),
    });
  });

  it('should subscribe and get payload', async () => {
    const subscription = await subscribe(
      schema,
      parse(`
        subscription ($input: FooSubscriptionInput!) {
          foo(input: $input) {
            value
            arg
            clientSubscriptionId
          }
        }
      `),
      null,
      null,
      {
        input: {
          arg: 'foo',
          clientSubscriptionId: '3',
        },
      },
    );

    expect(
      await (subscription as AsyncIterableIterator<ExecutionResult>).next(),
    ).toEqual({
      value: {
        data: {
          foo: {
            value: 'subscribed:foo',
            arg: 'foo',
            clientSubscriptionId: '3',
          },
        },
      },
      done: false,
    });

    expect(
      await (subscription as AsyncIterableIterator<ExecutionResult>).next(),
    ).toEqual({
      value: {
        data: {
          foo: {
            value: 'bar',
            arg: 'foo',
            clientSubscriptionId: '3',
          },
        },
      },
      done: false,
    });

    expect(
      await (subscription as AsyncIterableIterator<ExecutionResult>).next(),
    ).toEqual({
      done: true,
    });
  });
});
