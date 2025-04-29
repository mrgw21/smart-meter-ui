const BASE_URL = "https://j7pv6in5kmx37jsjuukn4k7ufy0wqeqr.lambda-url.eu-west-2.on.aws";

function getDeviceIdFromUrl() {
  const hash = window.location.hash; // e.g. "#/1"
  if (hash.startsWith("#/")) {
    const deviceId = hash.substring(2); // "1"
    if (deviceId === "0" || deviceId === "1") return deviceId;
  }
  return "0";
}
const deviceId = getDeviceIdFromUrl();

/**
 * Fetch the latest power usage in milliwatts (mW).
 * Returns: Number (e.g., 72623 for 72.623W)
 */
export async function fetchLatest() {
  try {
    const res = await fetch(`${BASE_URL}/latest/${deviceId}`);
    const data = await res.json();
    console.log(data);
    return data.wattage;
  } catch (err) {
    console.error("fetchLatest failed:", err);
    return 0;
  }
}

/**
 * Fetch average power usage (in mW) over the past 24 hours.
 * Returns: Array with one number (e.g., [165330] for 165.33W)
 */
export async function avgBetween(start, end, imp_per_kWh) {
  try {
    const now = Date.now();
    const res = await fetch(`${BASE_URL}/avgbetween/${deviceId}/${Math.floor(start)}/${Math.floor(end)}/${imp_per_kWh}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("fetch between failed:", err);
    return 0;
  }
}