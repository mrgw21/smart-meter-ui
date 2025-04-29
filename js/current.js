import { fetchLatest, avgBetween } from './api.js';

function getTariffSettings() {
  return {
    costPerKwh: parseFloat(localStorage.getItem('tariffRate')) || 0.27,
    standingCharge: parseFloat(localStorage.getItem('standingCharge')) || 0,
    impPerKwh: parseInt(localStorage.getItem('impPerKwh')) || 800
  };
}

let sessionStart = Date.now();
let sessionEnergy = 0; // Accumulated Wh
let sessionAvgTotal = 0;
let sessionAvgCount = 0;

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `(${h}h ${m}m ${sec}s)`;
}

export async function updateBryceGrid() {
  try {
    const { costPerKwh, standingCharge, impPerKwh } = getTariffSettings();

    // --- Fetch current wattage ---
    const latest = await fetchLatest();
    const watts = typeof latest === "number" ? latest : parseFloat(latest) || 0;

    // --- Fetch 24hr average wattage using avgBetween ---
    const now = Date.now();
    const oneDayAgo = now - 24 * 3600 * 1000;
    const avgResult = await avgBetween(oneDayAgo, now, impPerKwh);
    const avgWatts = typeof avgResult?.wattage === 'number' ? avgResult.wattage : 0;

    // --- At This Power Section ---
    const ledBlinkSec = watts > 0 ? 3600 / watts : 0;
    const costPerHour = (watts / 1000) * costPerKwh;
    const costPerDay = costPerHour * 24;
    const costPerWeek = costPerDay * 7;
    const costPerMonth = costPerDay * 30;

    $('#atThisPower').text(`${watts.toFixed(1)} W`);
    $('#ledBlinkRate').text(ledBlinkSec > 0 ? `${ledBlinkSec.toFixed(1)}s` : "N/A");
    $('#atThisPowerCost').text(`£${costPerHour.toFixed(2)}/hour`);
    $('#atThisPowerCostDay').text(`£${costPerDay.toFixed(2)}/day`);
    $('#atThisPowerCostWeek').text(`£${costPerWeek.toFixed(2)}/week`);
    $('#atThisPowerCostMonth').text(`£${costPerMonth.toFixed(2)}/month`);

    // --- Last 24hr Average Section ---
    const avgCostPerHour = (avgWatts / 1000) * costPerKwh;
    const avgCostPerDay = avgCostPerHour * 24;
    const avgCostPerWeek = avgCostPerDay * 7;
    const avgCostPerMonth = avgCostPerDay * 30;
    const standingChargeMonth = standingCharge;
    const totalCostMonth = avgCostPerMonth + standingChargeMonth;

    $('#avgPower').text(`${avgWatts.toFixed(1)} W`);
    $('#avgCostDay').text(`£${avgCostPerDay.toFixed(2)}`);
    $('#avgCostWeek').text(`£${avgCostPerWeek.toFixed(2)}`);
    $('#avgCostMonth').text(`£${avgCostPerMonth.toFixed(2)}`);
    $('#standingChargeMonth').text(`£${standingChargeMonth.toFixed(2)}`);
    $('#totalCostMonth').text(`£${totalCostMonth.toFixed(2)}`);

    // --- Session Section ---
    const sessionNow = Date.now();
    const sessionMs = sessionNow - sessionStart;
    const sessionSecs = sessionMs / 1000;

    sessionEnergy += (watts * (1 / 3600)); // assume called every second
    sessionAvgTotal += watts;
    sessionAvgCount += 1;
    const sessionAvgWatts = sessionAvgTotal / sessionAvgCount;

    const sessionKwh = sessionEnergy / 1000;
    const sessionCost = sessionKwh * costPerKwh;

    const sessionCostPerHour = (sessionAvgWatts / 1000) * costPerKwh;
    const sessionCostPerDay = sessionCostPerHour * 24;
    const sessionCostPerWeek = sessionCostPerDay * 7;
    const sessionCostPerMonth = sessionCostPerDay * 30;

    $('#sessionDuration').text(formatDuration(sessionMs));
    $('#sessionAvgPower').text(`${sessionAvgWatts.toFixed(1)} W`);
    $('#sessionTotalKwh').text(`${sessionKwh.toFixed(4)} kWh`);
    $('#sessionCost').text(`£${sessionCost.toFixed(4)}`);
    $('#sessionCostPerHour').text(`£${sessionCostPerHour.toFixed(2)}/hour`);
    $('#sessionCostPerDay').text(`£${sessionCostPerDay.toFixed(2)}/day`);
    $('#sessionCostPerWeek').text(`£${sessionCostPerWeek.toFixed(2)}/week`);
    $('#sessionCostPerMonth').text(`£${sessionCostPerMonth.toFixed(2)}/month`);
  } catch (err) {
    console.error('Error updating Bryce grid:', err);
  }
}
