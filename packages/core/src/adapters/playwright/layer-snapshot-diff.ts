export function diffRowIds(
  before: ReadonlySet<string>,
  after: readonly string[]
): string[] {
  return after.filter((id) => !before.has(id));
}
