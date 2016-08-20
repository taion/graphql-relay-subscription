# graphql-relay-subscription [![Travis][build-badge]][build] [![npm][npm-badge]][npm]

[Relay](http://facebook.github.io/relay/) subscription helpers for [GraphQL.js](https://github.com/graphql/graphql-js).

[![Codecov][codecov-badge]][codecov]
[![Discord][discord-badge]][discord]

## Usage

```js
import { graphqlSubscribe, subscriptionWithClientId }
  from 'graphql-relay-subscription';

/* ... */

const UpdateWidgetSubscription = subscriptionWithClientId({
  name: 'UpdateWidgetSubscription',
  inputFields: {
    widgetId: { type: GraphQLString },
  },
  outputFields: {
    widget: Widget,
  },
  subscribe: (input, context) => {
    context.subscribe(`widgets:${input.widgetId}:updated`);
  },
});

/* ... */

const query = `
  subscription ($input_0: UpdateWidgetSubscriptionInput!) {
    updateWidget(input: $input_0) {
      widget {
        name
      }
      clientSubscriptionId
    }
  }
`;

const variables = {
  input_0: {
    widgetId: 'foo',
    clientSubscriptionId: '0',
  },
};

const context = {
  subscribe: (channel) => {
    subscriptions.add(channel, query, variables);
  },
};

graphqlSubscribe({ schema, query, context, variables });
```


[build-badge]: https://img.shields.io/travis/taion/graphql-relay-subscription/master.svg
[build]: https://travis-ci.org/taion/graphql-relay-subscription

[npm-badge]: https://img.shields.io/npm/v/graphql-relay-subscription.svg
[npm]: https://www.npmjs.org/package/graphql-relay-subscription

[codecov-badge]: https://img.shields.io/codecov/c/github/taion/graphql-relay-subscription/master.svg
[codecov]: https://codecov.io/gh/taion/graphql-relay-subscription

[discord-badge]: https://img.shields.io/badge/Discord-join%20chat%20%E2%86%92-738bd7.svg
[discord]: https://discord.gg/0ZcbPKXt5bX40xsQ
