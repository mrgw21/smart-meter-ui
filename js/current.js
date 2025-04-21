import { fetchLatest, fetchAvg24h } from './api.js';

export async function updateBryceGrid() {
  try {
    const { costPerKwh, standingCharge } = getTariffSettings();

    const mW = await fetchLatest();
    const watts = mW / 1000;

    const avgData = await fetchAvg24h();
    const avgWatts = avgData.length > 0 ? avgData[0] / 1000 : 0;

    const costPerHour = watts * costPerKwh / 1000;
    const costPerDay = costPerHour * 24;
    const costPerWeek = costPerDay * 7;
    const costPerMonth = costPerDay * 30;

    const avgCostPerDay = avgWatts * costPerKwh * 24 / 1000;
    const avgCostPerMonth = avgCostPerDay * 30;
    const totalCostMonth = avgCostPerMonth + standingCharge;

    $('#atThisPower').text(`${watts.toFixed(2)} W`);
    $('#ledBlinkRate').text(`${(3600000 / mW).toFixed(0)} ms`);
    $('#atThisPowerCost').text(`£${costPerHour.toFixed(2)}/hr`);
    $('#atThisPowerCostDay').text(`£${costPerDay.toFixed(2)}/day`);
    $('#atThisPowerCostWeek').text(`£${costPerWeek.toFixed(2)}/week`);
    $('#atThisPowerCostMonth').text(`£${costPerMonth.toFixed(2)}/month`);

    $('#avgPower').text(`${avgWatts.toFixed(2)} W`);
    $('#avgCostDay').text(`£${avgCostPerDay.toFixed(2)}`);
    $('#avgCostMonth').text(`£${avgCostPerMonth.toFixed(2)}`);
    $('#standingChargeMonth').text(`£${standingCharge.toFixed(2)}`);
    $('#totalCostMonth').text(`£${totalCostMonth.toFixed(2)}`);

    // Mock session summary
    const sessionKwh = watts / 1000;
    const sessionCost = sessionKwh * costPerKwh;
    $('#sessionDuration').text('(1h 0m 0s)');
    $('#sessionAvgPower').text(`${watts.toFixed(2)} W`);
    $('#sessionTotalKwh').text(`${sessionKwh.toFixed(4)} kWh`);
    $('#sessionCost').text(`£${sessionCost.toFixed(2)}`);
    $('#sessionCostPerHour').text(`£${sessionCost.toFixed(2)}/hr`);
    $('#sessionCostPerDay').text(`£${(sessionCost * 24).toFixed(2)}/day`);
    $('#sessionCostPerWeek').text(`£${(sessionCost * 24 * 7).toFixed(2)}/week`);
    $('#sessionCostPerMonth').text(`£${(sessionCost * 24 * 30).toFixed(2)}/month`);
  } catch (err) {
    console.error('Error updating Bryce grid:', err);
  }
}

// Helper can remain here or be global
function getTariffSettings() {
  return {
    costPerKwh: parseFloat(localStorage.getItem('tariffRate')) || 0.2703,
    standingCharge: parseFloat(localStorage.getItem('standingCharge')) || 0
  };
}
