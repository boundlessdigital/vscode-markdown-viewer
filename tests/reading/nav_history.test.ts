import { test, expect, describe, beforeEach } from "bun:test";
import { NavHistory } from "../../src/webview/reading/nav_history";

function create_mock_container(initial_scroll_top = 0): HTMLElement {
  const el = document.createElement("div");
  let scroll_top = initial_scroll_top;

  Object.defineProperty(el, "scrollTop", {
    get: () => scroll_top,
    set: (value: number) => {
      scroll_top = value;
    },
  });

  el.scrollTo = (options?: ScrollToOptions | number, _y?: number) => {
    if (typeof options === "object" && options !== null && "top" in options) {
      scroll_top = options.top ?? 0;
    } else if (typeof options === "number") {
      scroll_top = _y ?? options;
    }
  };

  return el;
}

describe("NavHistory", () => {
  let container: HTMLElement;
  let nav: NavHistory;

  beforeEach(() => {
    container = create_mock_container(0);
    nav = new NavHistory(container);
  });

  test("push adds to back stack", () => {
    container.scrollTop = 100;
    nav.push();

    expect(nav.can_go_back()).toBe(true);
  });

  test("can_go_back returns false when stack is empty", () => {
    expect(nav.can_go_back()).toBe(false);
  });

  test("can_go_forward returns false when stack is empty", () => {
    expect(nav.can_go_forward()).toBe(false);
  });

  test("back() pops from back stack and scrolls to the position", () => {
    container.scrollTop = 0;
    nav.push(); // Save position 0

    container.scrollTop = 500;
    nav.back();

    expect(container.scrollTop).toBe(0);
    expect(nav.can_go_back()).toBe(false);
  });

  test("back() pushes current position to forward stack", () => {
    container.scrollTop = 100;
    nav.push();

    container.scrollTop = 500;
    nav.back();

    expect(nav.can_go_forward()).toBe(true);
  });

  test("forward() after back() navigates forward", () => {
    container.scrollTop = 100;
    nav.push();

    container.scrollTop = 500;
    nav.back(); // go to 100, forward stack has 500

    expect(container.scrollTop).toBe(100);

    nav.forward(); // go to 500, back stack has 100

    expect(container.scrollTop).toBe(500);
    expect(nav.can_go_forward()).toBe(false);
    expect(nav.can_go_back()).toBe(true);
  });

  test("push clears the forward stack", () => {
    container.scrollTop = 100;
    nav.push();

    container.scrollTop = 200;
    nav.push();

    container.scrollTop = 300;
    nav.back(); // forward stack now has 300

    expect(nav.can_go_forward()).toBe(true);

    nav.push(); // should clear forward stack

    expect(nav.can_go_forward()).toBe(false);
  });

  test("back() does nothing when back stack is empty", () => {
    container.scrollTop = 500;
    nav.back();

    expect(container.scrollTop).toBe(500);
    expect(nav.can_go_forward()).toBe(false);
  });

  test("forward() does nothing when forward stack is empty", () => {
    container.scrollTop = 500;
    nav.forward();

    expect(container.scrollTop).toBe(500);
    expect(nav.can_go_back()).toBe(false);
  });

  test("multiple back and forward operations", () => {
    container.scrollTop = 0;
    nav.push(); // push 0

    container.scrollTop = 100;
    nav.push(); // push 100

    container.scrollTop = 200;
    nav.push(); // push 200

    container.scrollTop = 300;

    nav.back(); // pop 200, forward gets 300
    expect(container.scrollTop).toBe(200);

    nav.back(); // pop 100, forward gets 200
    expect(container.scrollTop).toBe(100);

    nav.forward(); // pop 200 from forward, back gets 100
    expect(container.scrollTop).toBe(200);

    nav.forward(); // pop 300 from forward, back gets 200
    expect(container.scrollTop).toBe(300);
  });

  test("max stack size of 50 for back stack", () => {
    for (let i = 0; i < 60; i++) {
      container.scrollTop = i * 10;
      nav.push();
    }

    // Back stack should be capped at 50
    let back_count = 0;
    while (nav.can_go_back()) {
      nav.back();
      back_count++;
    }

    expect(back_count).toBe(50);
  });

  test("max stack size of 50 for forward stack", () => {
    // Build up a large back stack first
    for (let i = 0; i < 60; i++) {
      container.scrollTop = i * 10;
      nav.push();
    }

    // Now go back 60 times to fill the forward stack
    container.scrollTop = 999;
    for (let i = 0; i < 55; i++) {
      if (!nav.can_go_back()) break;
      nav.back();
    }

    // Forward stack should be capped at 50
    let forward_count = 0;
    while (nav.can_go_forward()) {
      nav.forward();
      forward_count++;
    }

    expect(forward_count).toBe(50);
  });

  test("destroy clears both stacks", () => {
    container.scrollTop = 100;
    nav.push();

    container.scrollTop = 200;
    nav.push();

    container.scrollTop = 300;
    nav.back(); // creates forward entry

    expect(nav.can_go_back()).toBe(true);
    expect(nav.can_go_forward()).toBe(true);

    nav.destroy();

    expect(nav.can_go_back()).toBe(false);
    expect(nav.can_go_forward()).toBe(false);
  });
});
