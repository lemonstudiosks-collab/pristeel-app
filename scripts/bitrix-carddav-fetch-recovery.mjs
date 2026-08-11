export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function recoverFailedVcards(raw, hrefs, fetchOne, options = {}) {
  const cooldownMs = Number(options.cooldownMs || 8000);
  const pauseMs = Number(options.pauseMs || 1200);
  const attempts = Number(options.attempts || 6);
  const out = raw.slice();
  const failed = [];
  for (let i = 0; i < out.length; i++) {
    if (out[i] && out[i].__error) failed.push(i);
  }
  if (!failed.length) return { rows: out, recovered: 0, remaining: 0 };

  await sleep(cooldownMs);
  let recovered = 0;
  for (const idx of failed) {
    let lastErr = null;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        if (attempt > 0) await sleep(Math.min(15000, 1500 * (2 ** (attempt - 1))));
        out[idx] = await fetchOne(hrefs[idx], idx);
        recovered++;
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (lastErr) out[idx] = { __error: String(lastErr.message || lastErr), __item: hrefs[idx] };
    await sleep(pauseMs);
  }

  const remaining = out.filter(x => x && x.__error).length;
  return { rows: out, recovered, remaining };
}
