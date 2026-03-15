import { test, expect, describe, beforeEach } from "bun:test";
import { debounce } from "../../src/webview/util/debounce";

describe("debounce", () => {
  test("calls the function after the delay", async () => {
    let call_count = 0;
    const debounced = debounce(() => {
      call_count++;
    }, 50);

    debounced();
    expect(call_count).toBe(0);

    await new Promise((r) => setTimeout(r, 80));
    expect(call_count).toBe(1);
  });

  test("rapid calls only invoke the function once", async () => {
    let call_count = 0;
    const debounced = debounce(() => {
      call_count++;
    }, 50);

    debounced();
    debounced();
    debounced();
    debounced();
    debounced();

    await new Promise((r) => setTimeout(r, 80));
    expect(call_count).toBe(1);
  });

  test("passes arguments correctly to the debounced function", async () => {
    let received_args: unknown[] = [];
    const debounced = debounce((...args: unknown[]) => {
      received_args = args;
    }, 50);

    debounced("hello", 42, true);

    await new Promise((r) => setTimeout(r, 80));
    expect(received_args).toEqual(["hello", 42, true]);
  });

  test("uses the arguments from the last call when rapidly invoked", async () => {
    let received_value: string | undefined;
    const debounced = debounce((value: string) => {
      received_value = value;
    }, 50);

    debounced("first");
    debounced("second");
    debounced("third");

    await new Promise((r) => setTimeout(r, 80));
    expect(received_value).toBe("third");
  });

  test("can be invoked again after the delay has elapsed", async () => {
    let call_count = 0;
    const debounced = debounce(() => {
      call_count++;
    }, 30);

    debounced();
    await new Promise((r) => setTimeout(r, 60));
    expect(call_count).toBe(1);

    debounced();
    await new Promise((r) => setTimeout(r, 60));
    expect(call_count).toBe(2);
  });

  test("does not call the function if delay has not elapsed", async () => {
    let call_count = 0;
    const debounced = debounce(() => {
      call_count++;
    }, 100);

    debounced();
    await new Promise((r) => setTimeout(r, 20));
    expect(call_count).toBe(0);
  });
});
