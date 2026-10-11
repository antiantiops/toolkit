export function weekStart(time = Date.now()) {
  const d = new Date(time + 7 * 3600000);
  d.setUTCHours(0,0,0,0);
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d.toISOString().slice(0,10);
}
