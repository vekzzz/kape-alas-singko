/** Splits a product name into one or two lines of roughly equal length. */
export function splitName(name: string): string[] {
  const words = name.split(' ');
  if (words.length === 1) return [name];

  let bestBreak = 1;
  let shortestLongLine = Infinity;
  for (let i = 1; i < words.length; i++) {
    const longLine = Math.max(words.slice(0, i).join(' ').length, words.slice(i).join(' ').length);
    if (longLine < shortestLongLine) {
      shortestLongLine = longLine;
      bestBreak = i;
    }
  }
  return [words.slice(0, bestBreak).join(' '), words.slice(bestBreak).join(' ')];
}
