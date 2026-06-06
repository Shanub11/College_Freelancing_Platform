import type {
  FunctionReference,
  RegisteredAction,
  RegisteredMutation,
  RegisteredQuery,
} from "convex/server";

type ConvexReturn<T> = Awaited<T> extends void ? null : Awaited<T>;

export type InternalReference<T> =
  T extends RegisteredQuery<infer Visibility, infer Args, infer ReturnValue>
    ? FunctionReference<"query", Visibility, Args, ConvexReturn<ReturnValue>>
    : T extends RegisteredMutation<infer Visibility, infer Args, infer ReturnValue>
      ? FunctionReference<"mutation", Visibility, Args, ConvexReturn<ReturnValue>>
      : T extends RegisteredAction<infer Visibility, infer Args, infer ReturnValue>
        ? FunctionReference<"action", Visibility, Args, ConvexReturn<ReturnValue>>
        : never;
