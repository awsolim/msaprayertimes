import useNow from "../hooks/useNow"; // reuse the same time hook

export default function Clock() {
  const now = useNow(1000); // update every second

  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });

  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="text-right leading-tight">
      <div className="text-xl font-semibold">{time}</div>
      <div className="text-sm opacity-70">{date}</div>
    </div>
  );
}
