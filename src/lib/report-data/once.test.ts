import { describe, expect, it, vi } from "vitest";
import { once } from "./once";

describe("once", () => {
  it("loads once and hands every caller the same promise", async () => {
    const load = vi.fn(async () => ({ n: 1 }));
    const get = once(load);
    const a = get();
    expect(get()).toBe(a);
    expect(await get()).toBe(await a);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not load before the first call", () => {
    const load = vi.fn(async () => 1);
    once(load);
    expect(load).not.toHaveBeenCalled();
  });

  it("evicts a failed load: every waiting caller gets the error, the next call retries", async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("HTTP 500"))
      .mockResolvedValue("ok");
    const get = once(load);
    const a = get();
    const b = get();
    expect(b).toBe(a);
    await expect(a).rejects.toThrow("HTTP 500");
    expect(load).toHaveBeenCalledTimes(1);
    await expect(get()).resolves.toBe("ok");
    await expect(get()).resolves.toBe("ok");
    expect(load).toHaveBeenCalledTimes(2);
  });
});
