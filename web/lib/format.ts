// Small pure helper for English count copy (e.g. "1 player" / "12 players").
// Only handles the regular "+s" plural; pass `plural` explicitly for the rest.
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

// Mirrors `pipeline/src/tracklab/publish/format.py::fmt` (task 34) case for
// case, so the title `tracklab publish platform` prints and this function's
// own output never diverge: base 10 (1000), one decimal past bytes,
// B/KB/MB/GB/TB. The unit is chosen on the rounded value, so 999950 is
// "1.0 MB", never "1000.0 KB".
const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(n: number): string {
  if (n < 1000) return `${n} B`;
  let value = n;
  let unit = 0;
  while (Number(value.toFixed(1)) >= 1000 && unit < BYTE_UNITS.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${value.toFixed(1)} ${BYTE_UNITS[unit]}`;
}

// A small count in words, capitalised to open a sentence ("Six"), for copy the lessons' prose checks
// read: they allow no digit outside a figure. Past twenty it falls back to the digits.
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven",
  "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

export function countWord(n: number, capital = false): string {
  const word = WORDS[n] ?? String(n);
  return capital ? word[0].toUpperCase() + word.slice(1) : word;
}
