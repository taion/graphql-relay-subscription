import {
  GraphQLInputFieldConfig,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  resolveObjMapThunk,
} from 'graphql';
import type {
  GraphQLFieldConfig,
  GraphQLResolveInfo,
  ThunkObjMap,
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
  inputFields?: ThunkObjMap<GraphQLInputFieldConfig>;
  outputFields?: ThunkObjMap<GraphQLFieldConfig<TSource, TContext>>;
  subscribe?: (
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
      ...resolveObjMapThunk(inputFields || {}),
      clientSubscriptionId: { type: GraphQLString },
    }),
  });

  const outputType = new GraphQLObjectType({
    name: `${name}Payload`,
    fields: () => ({
      ...resolveObjMapThunk(outputFields || {}),
      clientSubscriptionId: { type: GraphQLString },
    }),
  });

  return {
    ...config,
    type: outputType,
    args: {
      input: { type: new GraphQLNonNull(inputType) },
    },
    subscribe:
      subscribe &&
      ((
        _obj: TSource,
        { input }: InputArgs<TInput>,
        context: TContext,
        info: GraphQLResolveInfo,
      ) => subscribe(input, context, info)),
    resolve: (obj, { input }, context, info) =>
      Promise.resolve(getPayload(obj, input, context, info)).then(
        (payload) => ({
          ...payload,
          clientSubscriptionId: input.clientSubscriptionId,
        }),
      ),
  };
}
