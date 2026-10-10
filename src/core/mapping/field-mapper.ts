export type FieldMapping = Record<string, string>;

export function mapFields(
  source: Record<string, unknown>,
  mapping: FieldMapping,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [targetField, sourceField] of Object.entries(mapping)) {
    result[targetField] = source[sourceField];
  }

  return result;
}
