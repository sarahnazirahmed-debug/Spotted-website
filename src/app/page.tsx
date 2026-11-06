import { FEATURES } from "@/config/features";
import HomePage from "@/components/site/HomePage";
import Story from "@/components/Story";

// `hero` ON = the old animated home (cloth banner, stories). `hero` OFF = the clean business home page.
export default function Home() {
  return FEATURES.hero ? <Story /> : <HomePage />;
}
