import { describe, it, expect } from "vitest";
import { findChildIds, type LayerPanelRow } from "./playwright-figma-gateway";

function row(testid: string, indents: number, y: number): LayerPanelRow {
  return { testid: `${testid}-layers-panel-row`, indents, y };
}

describe("findChildIds", () => {
  it("finds children nested one level deeper than the parent (regular container)", () => {
    const rows = [
      row("1:1", 2, 0), // List Item (parent)
      row("1:2", 3, 32), // Number
      row("1:3", 3, 64), // Name
      row("1:4", 3, 96), // Pikachu
      row("1:5", 2, 128), // next List Item (sibling)
    ];

    expect(findChildIds(rows, "1:1")).toEqual(["1:2", "1:3", "1:4"]);
  });

  it("finds children at the SAME indentation as the parent (Instance whose content doesn't nest deeper)", () => {
    // Reproduces the real case found against a live session: Pikachu
    // (an Instance) reveals its own child ("image") at the same
    // indentation level as itself, not one level deeper.
    const rows = [
      row("1:8", 6, 1568), // Name (sibling, before parent)
      row("1:9", 6, 1600), // Pokémon Name (sibling, before parent)
      row("1:10", 6, 1632), // Pikachu (parent)
      row("1:11", 6, 1664), // image (real child, same indentation)
      row("1:12", 5, 1696), // next List Item (sibling one level up)
    ];

    expect(findChildIds(rows, "1:10")).toEqual(["1:11"]);
  });

  it("returns no children when the next row is a level ABOVE the parent (rose back up to an ancestor's sibling)", () => {
    const rows = [
      row("1:1", 2, 0), // parent
      row("1:2", 1, 32), // rises above the parent — not a child
    ];

    expect(findChildIds(rows, "1:1")).toEqual([]);
  });

  // Known limitation (see findChildIds' comment): when a real child sits at
  // the SAME indentation as its parent, a sibling of the parent right after
  // the last real child is indistinguishable from one more child.
  // Indentation alone can't tell them apart — this documents the tradeoff,
  // not a case the fix is expected to resolve.
  it("cannot distinguish a same-level sibling from a same-level child (documented limitation)", () => {
    const rows = [
      row("1:1", 2, 0), // parent
      row("1:2", 2, 32), // sibling at the same level — read as a child
    ];

    expect(findChildIds(rows, "1:1")).toEqual(["1:2"]);
  });

  it("returns an empty array when the parent id isn't found in the rows", () => {
    const rows = [row("1:1", 2, 0), row("1:2", 3, 32)];

    expect(findChildIds(rows, "9:9")).toEqual([]);
  });

  it("returns an empty array when the parent is the last row", () => {
    const rows = [row("1:1", 2, 0), row("1:2", 3, 32)];

    expect(findChildIds(rows, "1:2")).toEqual([]);
  });

  it("stops at the first row whose indentation drops below the parent's, ignoring grandchildren", () => {
    const rows = [
      row("1:1", 2, 0), // parent
      row("1:2", 3, 32), // child
      row("1:3", 4, 64), // grandchild (nested under 1:2, not a direct child of 1:1)
      row("1:4", 3, 96), // another child
      row("1:5", 1, 128), // rises above the parent's own level
    ];

    expect(findChildIds(rows, "1:1")).toEqual(["1:2", "1:4"]);
  });

  it("sorts by y before walking, regardless of input order", () => {
    const rows = [
      row("1:3", 3, 64), // Name
      row("1:1", 2, 0), // List Item (parent)
      row("1:2", 3, 32), // Number
    ];

    expect(findChildIds(rows, "1:1")).toEqual(["1:2", "1:3"]);
  });
});
