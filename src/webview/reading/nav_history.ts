const MAX_STACK_SIZE = 50;

export class NavHistory {
  private editor_container: HTMLElement;
  private back_stack: number[] = [];
  private forward_stack: number[] = [];

  constructor(editor_container: HTMLElement) {
    this.editor_container = editor_container;
  }

  push(): void {
    const position = this.editor_container.scrollTop;
    this.back_stack.push(position);

    if (this.back_stack.length > MAX_STACK_SIZE) {
      this.back_stack.shift();
    }

    this.forward_stack = [];
  }

  back(): void {
    if (!this.can_go_back()) return;

    const current_position = this.editor_container.scrollTop;
    this.forward_stack.push(current_position);

    if (this.forward_stack.length > MAX_STACK_SIZE) {
      this.forward_stack.shift();
    }

    const target = this.back_stack.pop()!;
    this.editor_container.scrollTo({ top: target, behavior: "smooth" });
  }

  forward(): void {
    if (!this.can_go_forward()) return;

    const current_position = this.editor_container.scrollTop;
    this.back_stack.push(current_position);

    if (this.back_stack.length > MAX_STACK_SIZE) {
      this.back_stack.shift();
    }

    const target = this.forward_stack.pop()!;
    this.editor_container.scrollTo({ top: target, behavior: "smooth" });
  }

  can_go_back(): boolean {
    return this.back_stack.length > 0;
  }

  can_go_forward(): boolean {
    return this.forward_stack.length > 0;
  }

  destroy(): void {
    this.back_stack = [];
    this.forward_stack = [];
  }
}
