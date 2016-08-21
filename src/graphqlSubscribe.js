import { graphql } from 'graphql';

import { SUBSCRIBE } from './subscription';

export default function graphqlSubscribe({
  schema,
  query,
  context,
  variables,
  operationName,
}) {
  return graphql(
    schema,
    query,
    SUBSCRIBE,
    context,
    variables,
    operationName
  );
}
