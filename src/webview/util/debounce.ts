export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay_ms: number
): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delay_ms);
  }) as T;
}
