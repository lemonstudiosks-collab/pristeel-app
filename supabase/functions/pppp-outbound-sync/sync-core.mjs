export async function listAllDraftRefs(gmail) {
  const refs = [];
  const seenPageTokens = new Set();
  let pageToken = "";
  let pages = 0;

  do {
    if (pageToken) {
      if (seenPageTokens.has(pageToken)) throw new Error("gmail_repeated_next_page_token");
      seenPageTokens.add(pageToken);
    }
    const params = new URLSearchParams({ maxResults: "500" });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await gmail(`/drafts?${params.toString()}`);
    pages += 1;
    for (const draft of data.drafts || []) {
      if (draft?.id) refs.push(draft);
    }
    pageToken = String(data.nextPageToken || "");
  } while (pageToken);

  return { refs, pages };
}

export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      out[index] = await fn(items[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, Math.max(1, items.length)) }, () => worker()),
  );
  return out;
}

export function localDate(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
