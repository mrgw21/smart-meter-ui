const BASE_URL = "https://zerzvoaj5w4euyxnmcipehvgfy0nyllg.lambda-url.eu-west-2.on.aws";

export async function fetchLatest() {
  const res = await fetch(`${BASE_URL}/latest`);
  const [[ts, , mW]] = await res.json();
  return mW / 1000;
}

export async function fetchAvg24h() {
  const now = Date.now();
  const dayAgo = now - 24 * 3600 * 1000;
  const res = await fetch(`${BASE_URL}/avgbetween/${Math.floor(dayAgo)}/${Math.floor(now)}`);
  return await res.json();
}
