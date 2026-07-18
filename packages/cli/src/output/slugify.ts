function slugify(name: string): string {
  return name
    .replace(/\s*\([^)]*\)/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugifyWithCollisions(names: string[]): string[] {
  const slugs = names.map(slugify);
  const count = new Map<string, number>();
  return slugs.map((slug) => {
    const n = (count.get(slug) ?? 0) + 1;
    count.set(slug, n);
    return n === 1 ? slug : `${slug}-[${n}]`;
  });
}
