import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  parse,
  subscribe,
} from 'graphql';

import { subscriptionWithClientId } from '../lib';

describe('default resolution', () => {
  let schema;

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
            inputFields: {},
            outputFields: {
              value: { type: GraphQLString },
            },
            async *subscribe() {
              yield { value: 'bar' };
            },
          }),
          bar: subscriptionWithClientId({
            name: 'BarSubscription',
            inputFields: {},
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

    // @ts-ignore
    expect(await subscription.next()).toEqual({
      value: {
        data: {
          foo: {
            value: 'bar',
          },
        },
      },
      done: false,
    });

    // @ts-ignore
    expect(await subscription.next()).toEqual({
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

    // @ts-ignore
    expect(await subscription.next()).toEqual({
      value: {
        data: {
          bar: {
            value: 'foo',
          },
        },
      },
      done: false,
    });

    // @ts-ignore
    expect(await subscription.next()).toEqual({
      done: true,
    });
  });
});

describe('custom resolution', () => {
  let schema;

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
            async *subscribe({ arg }) {
              yield { value: `subscribed:${arg}` };
              yield { value: 'bar' };
            },
            getPayload: ({ value }, { arg }) => ({ value, arg }),
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

    expect(await subscription.next()).toEqual({
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

    expect(await subscription.next()).toEqual({
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

    expect(await subscription.next()).toEqual({
      done: true,
    });
  });
});
