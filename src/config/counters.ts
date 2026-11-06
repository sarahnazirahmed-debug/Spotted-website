// THE LIVE COUNTERS on the home page: edit the numbers here.
// A counter is shown only once its number is AT LEAST the number below (for the visitor's country,
// and separately for the whole world). Before that, it stays hidden, so the page never looks empty.
// If none of them has passed its number, the whole "Spotted in numbers" section is hidden.
export const COUNTER_MINIMUMS = {
  people: 100, // People on Spotted (accounts)
  saves: 500, // Saves
  partners: 10, // Spotted Partners (restaurants and shops)
  insiders: 10, // Spotted Insiders
};

export type CounterMetric = keyof typeof COUNTER_MINIMUMS;
export const COUNTER_ORDER: CounterMetric[] = ["people", "saves", "partners", "insiders"];
