import { describe, it, expect } from "vitest";
import { slugifyWithCollisions } from "./slugify";

describe("slugifyWithCollisions", () => {
  it("converts a simple name to lowercase with hyphens", () => {
    const result = slugifyWithCollisions(["Home Screen"]);
    expect(result).toEqual(["home-screen"]);
  });

  it("doesn't add a suffix when there's no collision between siblings", () => {
    const result = slugifyWithCollisions(["Header", "Card List", "Footer"]);
    expect(result).toEqual(["header", "card-list", "footer"]);
  });

  it("adds a [2], [3]... suffix starting from the second sibling with the same name", () => {
    const result = slugifyWithCollisions(["Card", "Card", "Card"]);
    expect(result).toEqual(["card", "card-[2]", "card-[3]"]);
  });

  it("the first sibling with a repeated name doesn't get a suffix", () => {
    const result = slugifyWithCollisions(["List Item", "List Item"]);
    expect(result[0]).toBe("list-item");
  });

  it("resolves collisions independently across different names", () => {
    const result = slugifyWithCollisions(["Row", "List Item", "Row", "List Item", "List Item"]);
    expect(result).toEqual(["row", "list-item", "row-[2]", "list-item-[2]", "list-item-[3]"]);
  });

  it("preserves the appearance order of the original list", () => {
    const result = slugifyWithCollisions(["Silhouette", "Silhouette", "Silhouette"]);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("silhouette");
    expect(result[1]).toBe("silhouette-[2]");
    expect(result[2]).toBe("silhouette-[3]");
  });

  it("returns an empty array when there are no names", () => {
    expect(slugifyWithCollisions([])).toEqual([]);
  });

  it("distinguishes the collision suffix from Figma's own naming pattern", () => {
    // Figma names its own duplicates with a space + number (e.g. "Frame 29",
    // "Rectangle 2"). The collision suffix uses brackets so it isn't
    // confused with a real name that already comes from Figma.
    const result = slugifyWithCollisions(["Rectangle 2", "Rectangle 2"]);
    expect(result[0]).toBe("rectangle-2");
    expect(result[1]).toBe("rectangle-2-[2]");
  });
});
