import { AutoRefresh } from "@/components/shell/auto-refresh";
import { TodayScreen } from "@/components/today/today-screen";
import { dateLine } from "@/lib/time";
import { currentPlace, getWeather } from "@/lib/weather";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  // Fetched here, on the server, so the temperature is in the first HTML.
  // `currentPlace` is shared with /weather, so both pages resolve the reader's
  // city the same way.
  const { place, units } = await currentPlace();
  const weather = await getWeather(place, units);

  return (
    <>
      {/* Both the forecast and the date line are fixed at render time; without
          this a tab left open never moves. */}
      <AutoRefresh />
      <TodayScreen weather={weather} today={dateLine()} />
    </>
  );
}
