import { fetchLatest, fetchAvg24h } from './api.js';

// Helper for tariff settings
function getTariffSettings() {
  return {
    costPerKwh: parseFloat(localStorage.getItem('tariffRate')) || 0.27, // £ per kWh
    standingCharge: parseFloat(localStorage.getItem('standingCharge')) || 0
  };
}

// Track session (start time, energy accumulation, etc.)
let sessionStart = Date.now();
let sessionEnergy = 0; // Accumulated Wh

// Returns string of (Hh Mm Ss)
function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `(${h}h ${m}m ${sec}s)`;
}

export async function updateBryceGrid() {
  try {
    const { costPerKwh, standingCharge } = getTariffSettings();

    // --- Fetch live data ---
    // Latest wattage (instantaneous power)
    const latest = await fetchLatest();
    const watts = typeof latest === "object" && latest.wattage ? latest.wattage : parseFloat(latest) || 0;

    // Average over last 24h
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const avgData = await fetchAvg24h(oneDayAgo, now);
    const avgWatts = avgData && avgData.wattage ? avgData.wattage : 0;

    // --- At This Power Section ---
    // LED blink rate: Assuming 1 blink per Wh, time (in seconds) per Wh = 3600 / watts
    const ledBlinkSec = watts > 0 ? (3600 / watts) : 0;

    // Cost (all in £)
    const costPerHour = (watts / 1000) * costPerKwh;
    const costPerDay = costPerHour * 24;
    const costPerWeek = costPerDay * 7;
    const costPerMonth = costPerDay * 30;

    // --- Last 24hr Average Section ---
    const avgCostPerDay = (avgWatts / 1000) * costPerKwh * 24;
    const avgCostPerMonth = avgCostPerDay * 30;
    const totalCostMonth = avgCostPerMonth + standingCharge;

    // --- Session Section ---
    // Use sessionStart and time elapsed to estimate session energy
    const sessionNow = Date.now();
    const sessionMs = sessionNow - sessionStart;
    const sessionHrs = sessionMs / (1000 * 60 * 60);

    // Session average power is live for now (can integrate further for better accuracy)
    const sessionAvgWatts = watts;

    // Session energy = avg watts * hours (Wh)
    const sessionWh = sessionAvgWatts * sessionHrs;
    // Session cost = Wh -> kWh, then * tariff
    const sessionKwh = sessionWh / 1000;
    const sessionCost = sessionKwh * costPerKwh;

    // Cost breakdowns
    const sessionCostPerHour = costPerHour;
    const sessionCostPerDay = costPerDay;
    const sessionCostPerWeek = costPerWeek;
    const sessionCostPerMonth = costPerMonth;

    // --- Update DOM ---
    $('#atThisPower').text(`${watts.toFixed(1)} W`);
    $('#ledBlinkRate').text(ledBlinkSec > 0 ? `${ledBlinkSec.toFixed(1)}s` : "N/A");
    $('#atThisPowerCost').text(`£${costPerHour.toFixed(2)}/hour`);
    $('#atThisPowerCostDay').text(`£${costPerDay.toFixed(2)}/day`);
    $('#atThisPowerCostWeek').text(`£${costPerWeek.toFixed(2)}/week`);
    $('#atThisPowerCostMonth').text(`£${costPerMonth.toFixed(2)}/month`);

    $('#avgPower').text(`${avgWatts.toFixed(1)} W`);
    $('#avgCostDay').text(`£${avgCostPerDay.toFixed(2)}`);
    $('#avgCostMonth').text(`£${avgCostPerMonth.toFixed(2)}`);
    $('#standingChargeMonth').text(`£${standingCharge.toFixed(2)}`);
    $('#totalCostMonth').text(`£${totalCostMonth.toFixed(2)}`);

    $('#sessionDuration').text(formatDuration(sessionMs));
    $('#sessionAvgPower').text(`${sessionAvgWatts.toFixed(1)} W`);
    $('#sessionTotalKwh').text(`${sessionKwh.toFixed(4)} kWh`);
    $('#sessionCost').text(`£${sessionCost.toFixed(2)}`);
    $('#sessionCostPerHour').text(`£${sessionCostPerHour.toFixed(2)}/hour`);
    $('#sessionCostPerDay').text(`£${sessionCostPerDay.toFixed(2)}/day`);
    $('#sessionCostPerWeek').text(`£${sessionCostPerWeek.toFixed(2)}/week`);
    $('#sessionCostPerMonth').text(`£${sessionCostPerMonth.toFixed(2)}/month`);
  } catch (err) {
    console.error('Error updating Bryce grid:', err);
  }
}