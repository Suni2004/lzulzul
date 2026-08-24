/**
 * Accent-insensitive matching, so searching for `arvizturo` still finds
 * `Árvíztűrő` — which is the difference between search that feels smart and
 * search you give up on.
 */
export function foldAccents(input: string): string {
  return input
    .toLocaleLowerCase('hu')
    .normalize('NFD')
    // Strip the combining diacritical marks left behind by NFD.
    .replace(/[̀-ͯ]/g, '');
}

export function matches(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  return foldAccents(haystack).includes(foldAccents(needle.trim()));
}
