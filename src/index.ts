import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import type {
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLInputFieldConfigMap,
  GraphQLResolveInfo,
  Thunk,
} from 'graphql';

export interface InputArgs<TInput> {
  input: TInput & { clientSubscriptionId?: string | null | undefined };
}

export interface SubscriptionConfig<TSource, TContext, TInput>
  extends Omit<
    GraphQLFieldConfig<TSource, TContext, InputArgs<TInput>>,
    'type' | 'args' | 'subscribe' | 'resolve'
  > {
  name: string;
  inputFields?: Thunk<GraphQLInputFieldConfigMap>;
  outputFields?: Thunk<GraphQLFieldConfigMap<TSource, TContext>>;
  subscribe?: (
    obj: TSource,
    input: TInput,
    context: TContext,
    info: GraphQLResolveInfo,
  ) => any;
  getPayload?: (
    obj: TSource,
    input: TInput,
    context: TContext,
    info: GraphQLResolveInfo,
  ) => Promise<any> | any;
}

function resolveThunk<T>(thunk: Thunk<T>): T {
  return thunk instanceof Function ? thunk() : thunk;
}

function defaultGetPayload<TSource>(obj: TSource) {
  return obj;
}

export function subscriptionWithClientId<
  TSource = any,
  TContext = any,
  TInput = { [inputName: string]: any }
>({
  name,
  inputFields,
  outputFields,
  subscribe,
  getPayload = defaultGetPayload,
  ...config
}: SubscriptionConfig<TSource, TContext, TInput>): GraphQLFieldConfig<
  TSource,
  TContext,
  InputArgs<TInput>
> {
  const inputType = new GraphQLInputObjectType({
    name: `${name}Input`,
    fields: () => ({
      ...resolveThunk(inputFields),
      clientSubscriptionId: { type: GraphQLString },
    }),
  });

  const outputType = new GraphQLObjectType({
    name: `${name}Payload`,
    fields: () => ({
      ...resolveThunk(outputFields),
      clientSubscriptionId: { type: GraphQLString },
    }),
  });

  return {
    ...config,
    type: outputType,
    args: {
      input: { type: GraphQLNonNull(inputType) },
    },
    subscribe:
      subscribe &&
      ((
        source: TSource,
        { input }: InputArgs<TInput>,
        context: TContext,
        info: GraphQLResolveInfo,
      ) => subscribe(source, input, context, info)),
    resolve: (obj, { input }, context, info) =>
      Promise.resolve(getPayload(obj, input, context, info)).then(
        (payload) => ({
          ...payload,
          clientSubscriptionId: input.clientSubscriptionId,
        }),
      ),
  };
}
