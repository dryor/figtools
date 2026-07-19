import { describe, it, expect } from "vitest";
import { diffRowIds } from "./layer-snapshot-diff";

describe("diffRowIds", () => {
  it("returns IDs that appear in after but not in before", () => {
    const before = new Set(["frame-1", "group-2"]);
    const after = ["frame-1", "group-2", "image-3"];
    expect(diffRowIds(before, after)).toEqual(["image-3"]);
  });

  it("returns empty when no new rows appear after expansion", () => {
    const before = new Set(["frame-1", "group-2"]);
    const after = ["frame-1", "group-2"];
    expect(diffRowIds(before, after)).toEqual([]);
  });

  it("returns empty when after is empty", () => {
    const before = new Set(["frame-1"]);
    expect(diffRowIds(before, [])).toEqual([]);
  });

  it("returns all IDs when before is empty", () => {
    const before = new Set<string>();
    const after = ["frame-1", "group-2"];
    expect(diffRowIds(before, after)).toEqual(["frame-1", "group-2"]);
  });

  // Pikachu (Instance at indents=2) reveals `image` at indents=2 — same
  // level as itself. pokeball (sibling of Pikachu, also at indents=2) was
  // already visible before expansion. The indentation-based rule
  // (parentIndents + 1) would have missed `image`; the diff correctly
  // excludes pokeball because its ID was already in `before`.
  it("excludes siblings of the parent that were visible before expansion", () => {
    const before = new Set(["list-item-1", "pikachu-2", "pokeball-3"]);
    const after = ["list-item-1", "pikachu-2", "pokeball-3", "image-4"];
    expect(diffRowIds(before, after)).toEqual(["image-4"]);
  });

  it("returns multiple children when several new rows appear", () => {
    const before = new Set(["frame-1"]);
    const after = ["frame-1", "child-a", "child-b", "child-c"];
    expect(diffRowIds(before, after)).toEqual(["child-a", "child-b", "child-c"]);
  });

  it("preserves the order of new IDs as they appear in after", () => {
    const before = new Set(["frame-1"]);
    const after = ["frame-1", "z-child", "a-child", "m-child"];
    expect(diffRowIds(before, after)).toEqual(["z-child", "a-child", "m-child"]);
  });
});
