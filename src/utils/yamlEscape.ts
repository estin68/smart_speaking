/**
 * Escapes a value for safe inclusion in YAML double-quoted frontmatter strings.
 * Prevents broken YAML when titles/goals contain quotes or newlines.
 */
export function yamlEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, ' ')
    .trim();
}
