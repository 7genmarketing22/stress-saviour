export type FilterPeriod = "today" | "week" | "month" | "3months" | "custom";

export const FILTER_LABELS: Record<FilterPeriod, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  "3months": "Last 3 Months",
  custom: "Custom Range",
};

export function getDateRange(
  period: FilterPeriod,
  customFrom: string,
  customTo: string
): { start: Date; end: Date } {
  const now = new Date();
  if (period === "today") {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (period === "week") {
    const start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (period === "month") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }
  if (period === "3months") {
    return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: now };
  }
  // custom
  return {
    start: customFrom ? new Date(customFrom + "T00:00:00") : new Date(0),
    end: customTo ? new Date(customTo + "T23:59:59") : now,
  };
}

export function inDateRange(dateStr: string, range: { start: Date; end: Date }) {
  const t = new Date(dateStr).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
}
