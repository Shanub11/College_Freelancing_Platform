import { useRef, useCallback } from "react";

export function useInfiniteScroll(
  loadMore: (numItems: number) => void,
  status: string,
  loadCount: number = 20
) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMoreRef = useCallback(
    (node: HTMLElement | null) => {
      if (status === "LoadingMore" || status === "LoadingFirstPage") return;

      if (observerRef.current) observerRef.current.disconnect();

      if (node) {
        observerRef.current = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && status === "CanLoadMore") {
            loadMore(loadCount);
          }
        });
        observerRef.current.observe(node);
      }
    },
    [status, loadMore, loadCount]
  );

  return loadMoreRef;
}