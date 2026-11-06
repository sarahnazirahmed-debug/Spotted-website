// Dishes on a reel: up to 9, each with a name and a price in AED.
export type Dish = { name: string; price_aed: number };
export const MAX_DISHES = 9;

// Rows from the form (text boxes) -> clean dishes, plus a message if something is wrong.
export function cleanDishes(rows: { name: string; price: string }[]): { dishes: Dish[]; problem: string | null } {
  const used = rows.filter((r) => r.name.trim() || r.price.trim());
  if (used.length > MAX_DISHES) return { dishes: [], problem: `At most ${MAX_DISHES} dishes.` };
  const dishes: Dish[] = [];
  for (const r of used) {
    const name = r.name.trim();
    const price = Number(r.price.trim().replace(/,/g, "."));
    if (!name) return { dishes: [], problem: "Every dish needs a name." };
    if (r.price.trim() === "" || !Number.isFinite(price) || price < 0) return { dishes: [], problem: `"${name}" needs a price in AED (0 or more).` };
    dishes.push({ name, price_aed: Math.round(price * 100) / 100 });
  }
  return { dishes, problem: null };
}
