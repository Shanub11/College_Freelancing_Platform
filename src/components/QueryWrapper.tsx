import React, { ReactNode } from "react";
import LoadingState from "./LoadingState";

interface QueryWrapperProps<T> {
  data: T | undefined | null;
  error?: unknown;
  loadingFallback?: ReactNode;
  emptyFallback?: ReactNode;
  errorFallback?: ReactNode;
  children: (data: T) => ReactNode;
}

export default function QueryWrapper<T>({
  data,
  error,
  loadingFallback,
  emptyFallback,
  errorFallback,
  children,
}: QueryWrapperProps<T>) {
  if (error) {
    return <>{errorFallback || <div>Something went wrong</div>}</>;
  }
  if (data === undefined) {
    return <>{loadingFallback || <LoadingState />}</>;
  }
  if ((data === null || (Array.isArray(data) && data.length === 0)) && emptyFallback) {
    return <>{emptyFallback}</>;
  }

  return <>{children(data as T)}</>;
}