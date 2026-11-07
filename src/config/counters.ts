// THE LIVE COUNTERS on the home page: edit the numbers here.
//
// The counter bar is for the UAE only. It stays HIDDEN until all three main numbers are each ABOVE 500:
//   accounts (people on Spotted), saved places, and saved reels.
// Spotted Partners and Spotted Insiders tiles come later: each one appears only once it is above 100
// (and only while the bar itself is showing).
export const COUNTER_MINIMUMS = {
  people: 500, // accounts (People on Spotted)
  saved_places: 500, // places people have saved
  saved_reels: 500, // reels people have saved
  partners: 100, // Spotted Partners (restaurants and shops), shown later
  insiders: 100, // Spotted Insiders, shown later
};

export type CounterMetric = keyof typeof COUNTER_MINIMUMS;

// The country the bar counts. UAE only for now.
export const COUNTER_COUNTRY = "AE";
// All three must be above their number before the bar shows at all.
export const COUNTER_REQUIRED: CounterMetric[] = ["people", "saved_places", "saved_reels"];
// These come later, one by one, at their own number.
export const COUNTER_LATER: CounterMetric[] = ["partners", "insiders"];
