export function calculate_reading_time(markdown: string): string {
  const words = markdown.split(/\s+/).filter((w) => w.length > 0);
  const word_count = words.length;
  const minutes = Math.ceil(word_count / 200);

  if (minutes < 1) {
    return "< 1 min read";
  }

  return `${minutes} min read`;
}
