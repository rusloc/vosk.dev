"use client";

import { useCallback, useEffect, useState } from "react";

export type ReportLoad<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

const same = <T>(raw: T) => raw;

/**
 * A JS report's first data load in the browser, with a retry (Mirelo, ACME Marketing, ACME Trucks, Nordmark). `fetch`
 * reads the report's files, `build` turns them into what the board takes; a response that lands after unmount is
 * dropped before it is built. Both must be stable (module scope): they are the effect's dependencies.
 */
export function useReportLoad<R, T = R>(
  fetch: () => Promise<R>,
  build: (raw: R) => T = same as (raw: R) => T,
): { load: ReportLoad<T>; retry: () => void } {
  const [load, setLoad] = useState<ReportLoad<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    fetch().then(
      (raw) => live && setLoad({ status: "ready", data: build(raw) }),
      (e: unknown) =>
        live &&
        setLoad({
          status: "error",
          message: e instanceof Error ? e.message : String(e),
        }),
    );
    return () => {
      live = false;
    };
  }, [fetch, build, attempt]);
  const retry = useCallback(() => {
    setLoad({ status: "loading" });
    setAttempt((a) => a + 1);
  }, []);
  return { load, retry };
}
