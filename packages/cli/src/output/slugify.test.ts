import { describe, it, expect } from "vitest";
import { slugifyWithCollisions } from "./slugify";

describe("slugifyWithCollisions", () => {
  it("convierte un nombre simple a minúsculas con guiones", () => {
    const result = slugifyWithCollisions(["Home Screen"]);
    expect(result).toEqual(["home-screen"]);
  });

  it("no agrega sufijo cuando no hay colisión entre hermanos", () => {
    const result = slugifyWithCollisions(["Header", "Card List", "Footer"]);
    expect(result).toEqual(["header", "card-list", "footer"]);
  });

  it("agrega sufijo [2], [3]... a partir del segundo hermano con el mismo nombre", () => {
    const result = slugifyWithCollisions(["Card", "Card", "Card"]);
    expect(result).toEqual(["card", "card-[2]", "card-[3]"]);
  });

  it("el primer hermano con un nombre repetido no lleva sufijo", () => {
    const result = slugifyWithCollisions(["List Item", "List Item"]);
    expect(result[0]).toBe("list-item");
  });

  it("resuelve colisiones de forma independiente entre distintos nombres", () => {
    const result = slugifyWithCollisions(["Row", "List Item", "Row", "List Item", "List Item"]);
    expect(result).toEqual(["row", "list-item", "row-[2]", "list-item-[2]", "list-item-[3]"]);
  });

  it("preserva el orden de aparición de la lista original", () => {
    const result = slugifyWithCollisions(["Silhouette", "Silhouette", "Silhouette"]);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("silhouette");
    expect(result[1]).toBe("silhouette-[2]");
    expect(result[2]).toBe("silhouette-[3]");
  });

  it("devuelve un array vacío cuando no hay nombres", () => {
    expect(slugifyWithCollisions([])).toEqual([]);
  });

  it("distingue el sufijo de colisión propio del patrón de nombres que ya usa Figma", () => {
    // Figma nombra sus propios duplicados con espacio + número (ej. "Frame 29",
    // "Rectangle 2"). El sufijo de colisión usa corchetes para no confundirse
    // con un nombre real que ya viene de Figma.
    const result = slugifyWithCollisions(["Rectangle 2", "Rectangle 2"]);
    expect(result[0]).toBe("rectangle-2");
    expect(result[1]).toBe("rectangle-2-[2]");
  });
});
