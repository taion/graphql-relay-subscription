import 'babel-polyfill';

import chai, { expect } from 'chai';
import dirtyChai from 'dirty-chai';
import { graphql, GraphQLObjectType, GraphQLSchema, GraphQLString }
  from 'graphql';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { graphqlSubscribe, subscription } from '../src';

chai.use(dirtyChai);
chai.use(sinonChai);

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
          foo: subscription({
            name: 'FooSubscription',
            inputFields: {
              dummy: { type: GraphQLString },
            },
            outputFields: {
              value: { type: GraphQLString },
            },
            subscribe: (input, context) => {
              context.subscribeSpy();
            },
          }),
        },
      }),
    });
  });

  it('should call subscribe', async () => {
    const subscribeSpy = sinon.spy();

    const result = await graphqlSubscribe({
      schema,
      query: `
        subscription {
          foo(input: {}) {
            value
          }
        }
      `,
      context: { subscribeSpy },
    });

    expect(subscribeSpy).to.have.been.called();
    expect(result.data).to.eql({ foo: null });
  });

  it('should get payload', async () => {
    const result = await graphql(
      schema,
      `
        subscription {
          foo(input: {}) {
            value
          }
        }
      `,
      { value: 'bar' }
    );

    expect(result.data).to.eql({
      foo: {
        value: 'bar',
      },
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
          foo: subscription({
            name: 'FooSubscription',
            inputFields: () => ({
              arg: { type: GraphQLString },
            }),
            outputFields: () => ({
              value: { type: GraphQLString },
              arg: { type: GraphQLString },
            }),
            subscribe: async ({ arg }) => ({ value: 'subscribed', arg }),
            getPayload: async ({ value }, { arg }) => ({ value, arg }),
          }),
        },
      }),
    });
  });

  it('should return value from subscribe', async () => {
    const result = await graphqlSubscribe({
      schema,
      query: `
        subscription ($input: FooSubscriptionInput!) {
          foo(input: $input) {
            value
            arg
          }
        }
      `,
      variables: {
        input: {
          arg: 'bar',
        },
      },
    });

    expect(result.data).to.eql({
      foo: {
        value: 'subscribed',
        arg: 'bar',
      },
    });
  });

  it('should get payload', async () => {
    const result = await graphql(
      schema,
      `
        subscription ($input: FooSubscriptionInput!) {
          foo(input: $input) {
            value
            arg
          }
        }
      `,
      { value: 'baz' },
      null,
      {
        input: {
          arg: 'qux',
        },
      },
    );

    expect(result.data).to.eql({
      foo: {
        value: 'baz',
        arg: 'qux',
      },
    });
  });
});
