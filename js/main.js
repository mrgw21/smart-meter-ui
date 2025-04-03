import { fetchLatest, fetchAvg24h } from './api.js';

$(document).ready(function () {
  $('#tariffRate').val(localStorage.getItem('tariffRate') || '0.2703');
  $('#standingCharge').val(localStorage.getItem('standingCharge') || '0.00');
  showTariffModalIfNeeded();
  const toggle = $('#metricsToggle');

  const subGrids = {
    sol: ['#sol-energy', '#sol-finance'],
    kiran: ['#kiran-energy', '#kiran-finance'],
    jint: ['#jint-energy', '#jint-finance'],
    rasyid: ['#rasyid-energy', '#rasyid-finance'],
  };

  let rasyidChart = null;
  let usageMockData = {};
  let currentRange = 'week';

  function getTariffSettings() {
    return {
      costPerKwh: parseFloat(localStorage.getItem('tariffRate')) || 0.2703,
      standingCharge: parseFloat(localStorage.getItem('standingCharge')) || 0
    };
  }

  function switchMode(mode) {
    const isEnergy = mode === 'energy';
    const { costPerKwh, standingCharge } = getTariffSettings();

    $('.metric-label').each(function () {
      const label = $(this);
      label.text(isEnergy ? label.data('energy') : label.data('financial'));
    });

    $('.metric-value').each(function () {
      const el = $(this);
      const kwh = parseFloat(el.data('energy-value'));
      if (!isNaN(kwh)) {
        const cost = (kwh * costPerKwh + standingCharge).toFixed(2);
        el.data('financial-value', `£${cost}`);
        el.text(isEnergy ? `${kwh} kWh` : `£${cost}`);
      }
    });

    Object.entries(subGrids).forEach(([key, [energy, finance]]) => {
      if (key === 'jint') {
        $(energy).show(); // Always visible
        $(finance).hide(); // Keep separate div hidden
      } else {
        $(energy).toggle(isEnergy);
        $(finance).toggle(!isEnergy);
      }
    });

    localStorage.setItem('metricsMode', mode);
    renderChart(currentRange);
  }

  async function updateBryceGrid() {
    try {
      // Get tariff settings
      const { costPerKwh, standingCharge } = getTariffSettings();
      
      // Fetch latest power and average data from the API
      const mW = await fetchLatest();  // Power in mW
      const avgData = await fetchAvg24h();  // Last 24-hour average data
  
      // Calculate the cost for the Bryce Grid sections
      const atThisPower = (mW / 1000).toFixed(2); // Convert mW to W
      const atThisPowerCost = ((atThisPower / 1000) * costPerKwh).toFixed(2); // Cost per hour
      const atThisPowerCostDay = (atThisPowerCost * 24).toFixed(2); // Cost per day
      const atThisPowerCostWeek = (atThisPowerCost * 24 * 7).toFixed(2); // Cost per week
      const atThisPowerCostMonth = (atThisPowerCost * 24 * 30).toFixed(2); // Cost per month
  
      // Last 24-hour Average Power and Costs
      const avgPower = avgData && avgData.length > 0 ? (avgData[0] / 1000).toFixed(2) : '0.00'; // Handle undefined case
      const avgCostDay = ((avgPower / 1000) * costPerKwh * 24).toFixed(2); // Cost per day
      const avgCostMonth = (avgCostDay * 30).toFixed(2); // Cost per month
  
      // Standing Charge and Total
      const standingChargeMonth = standingCharge.toFixed(2);
      const totalCostMonth = (parseFloat(avgCostMonth) + parseFloat(standingChargeMonth)).toFixed(2);
  
      // Session data (simplified for now)
      const sessionAvgPower = (mW / 1000).toFixed(2);
      const sessionTotalKwh = ((sessionAvgPower / 1000) * 1).toFixed(6); // Assuming 1 hour session
      const sessionCost = (sessionTotalKwh * costPerKwh).toFixed(2);
      const sessionDuration = '1h 5m 10s'; // Placeholder
  
      // Update the Bryce Grid UI
      $('#atThisPower').text(`${atThisPower} W`);
      $('#atThisPowerCost').text(`£${atThisPowerCost}/hr`);
      $('#atThisPowerCostDay').text(`£${atThisPowerCostDay}/day`);
      $('#atThisPowerCostWeek').text(`£${atThisPowerCostWeek}/week`);
      $('#atThisPowerCostMonth').text(`£${atThisPowerCostMonth}/month`);
  
      $('#avgPower').text(`${avgPower} W`);
      $('#avgCostDay').text(`£${avgCostDay}/day`);
      $('#avgCostMonth').text(`£${avgCostMonth}/month`);
  
      $('#standingChargeMonth').text(`£${standingChargeMonth}/month`);
      $('#totalCostMonth').text(`£${totalCostMonth}/month`);
  
      $('#sessionDuration').text(sessionDuration);
      $('#sessionAvgPower').text(`${sessionAvgPower} W`);
      $('#sessionTotalKwh').text(`${sessionTotalKwh} kWh`);
      $('#sessionCost').text(`£${sessionCost}`);
  
    } catch (err) {
      console.error('Error updating Bryce grid:', err);
      // Optionally set default/error values in the UI
      $('#avgPower').text('0.00 W');
      $('#avgCostDay').text('£0.00/day');
      $('#avgCostMonth').text('£0.00/month');
    }
  }

  // Update Bryce Grid every 5 seconds
  updateBryceGrid();
  setInterval(updateBryceGrid, 5000);

  function renderChart(range = 'week') {
    const { costPerKwh, standingCharge } = getTariffSettings();
    const isEnergy = !$('#metricsToggle').is(':checked');
    const canvasId = isEnergy ? 'rasyidChartEnergy' : 'rasyidChartFinance';
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    const data = usageMockData[range];
    const labels = data?.labels || ['No data'];
    const values = isEnergy
      ? data?.kwh
      : data?.kwh.map(val => +(val * costPerKwh + standingCharge).toFixed(2));

    if (rasyidChart) rasyidChart.destroy();

    rasyidChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: isEnergy ? 'Usage (kWh)' : 'Cost (£)',
          data: values,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: val => isEnergy ? `${val} kWh` : `£${val}`
            }
          }
        }
      }
    });
  }

  function setupDatePicker() {
    const calendar = $('#customDate');
    const today = new Date();
    const min = new Date(today);
    min.setDate(min.getDate() - 30);
    const format = d => d.toISOString().split('T')[0];
    calendar.attr('min', format(min));
    calendar.attr('max', format(today));
    calendar.val(format(today));
  }

  // Kiran's Chart (dynamic unit)
  const canvas = document.getElementById('kiranLiveChart');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const data = {
      labels: [],
      datasets: [
        {
          label: 'Live Power Usage (kW)',
          data: [],
          borderColor: 'rgb(75, 192, 192)',
          fill: false,
          tension: 0.4
        },
        {
          label: 'Average Usage (kW)',
          data: [],
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 0.6)',
          fill: true,
          tension: 0.4
        }
      ]
    };

    const kiranChart = new Chart(ctx, {
      type: 'line',
      data,
      options: {
        responsive: true,
        animation: false,
        scales: {
          x: {
            type: 'time',
            time: { unit: 'second' },
            min: () => new Date(Date.now() - 2 * 60 * 1000),
            max: () => new Date(),
            title: { display: true, text: 'Time' }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Power (kW)' }
          }
        }
      }
    });

    async function updateKiranChart() {
      try {
        const { costPerKwh } = getTariffSettings();
        const watts = await fetchLatest();
        const kW = watts / 1000;
        const cost = +(kW * costPerKwh).toFixed(2);
        const now = new Date();
        const isEnergy = !$('#metricsToggle').is(':checked');

        const value = isEnergy ? kW : cost;
        data.labels.push(now);
        data.datasets[0].data.push(value);

        const avg = data.datasets[0].data.reduce((a, b) => a + b, 0) / data.datasets[0].data.length;
        data.datasets[1].data.push(+avg.toFixed(2));

        const cutoff = new Date(now.getTime() - 2 * 60 * 1000);
        while (data.labels[0] < cutoff) {
          data.labels.shift();
          data.datasets[0].data.shift();
          data.datasets[1].data.shift();
        }

        kiranChart.data.datasets[0].label = isEnergy ? 'Live Power Usage (kW)' : 'Live Cost (£/hr)';
        kiranChart.data.datasets[1].label = isEnergy ? 'Average Usage (kW)' : 'Avg Cost (£/hr)';
        kiranChart.options.scales.y.title.text = isEnergy ? 'Power (kW)' : 'Cost (£/hr)';
        kiranChart.update();
      } catch (err) {
        console.error('Error updating Kiran chart:', err);
      }
    }

    updateKiranChart();
    setInterval(updateKiranChart, 5000);
  }

  async function updateMeters() {
    try {
      const { costPerKwh } = getTariffSettings();
      const watts = await fetchLatest();
      const kW = watts / 1000;
      const costPerHour = (kW * costPerKwh).toFixed(2);

      $('#sol-energy .number').text(`${kW.toFixed(2)} kW`);
      $('#sol-finance .number').text(`£${costPerHour}/hr`);

      const maxPower = 5;
      const maxCost = 2;
      const powerRotation = Math.min(180, (kW / maxPower) * 180);
      const costRotation = Math.min(180, (costPerHour / maxCost) * 180);

      $('#sol-energy .needle').css('transform', `rotate(${powerRotation}deg)`);
      $('#sol-finance .needle').css('transform', `rotate(${costRotation}deg)`);

      const getRiskLevel = deg => deg < 60 ? 'LOW' : deg < 120 ? 'MEDIUM' : 'HIGH';
      $('#sol-energy .label').text(`Usage: ${getRiskLevel(powerRotation)}`);
      $('#sol-finance .label').text(`Cost: ${getRiskLevel(costRotation)}`);
    } catch (err) {
      console.error('Error updating meters:', err);
    }
  }

  function showTariffModalIfNeeded() {
    const tariffSet = localStorage.getItem('tariffSet') === 'true';
    if (!tariffSet) {
      const modal = new bootstrap.Modal(document.getElementById('tariffModal'));
      modal.show();
    }
  }  

  $('#tariffForm').on('submit', function (e) {
    e.preventDefault();
  
    const rate = parseFloat($('#tariffRate').val());
    const charge = parseFloat($('#standingCharge').val());
  
    if (!isNaN(rate) && !isNaN(charge)) {
      localStorage.setItem('tariffRate', rate);
      localStorage.setItem('standingCharge', charge);
      localStorage.setItem('tariffSet', 'true'); // ✅ prevent future modal
  
      // Close modal cleanly
      const modalEl = document.getElementById('tariffModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
  
      // Apply without reload (optional)
      updateTariffValues(); // optional helper if you're using live updates
  
      // Or refresh the page if needed:
      // location.reload();
    }
  });
  

  updateMeters();
  setInterval(updateMeters, 5000);

  $('#rangeButtons button').on('click', function () {
    $('#rangeButtons button').removeClass('active');
    $(this).addClass('active');
    currentRange = $(this).data('range');
    renderChart(currentRange);
  });

  $.getJSON('data/usagebetween.json', function (data) {
    usageMockData = data;
    setupDatePicker();
    const saved = localStorage.getItem('metricsMode') || 'energy';
    toggle.prop('checked', saved === 'financial');
    switchMode(saved);
    $('#rangeButtons button[data-range="week"]').trigger('click');
  });

  toggle.on('change', function () {
    const mode = $(this).is(':checked') ? 'financial' : 'energy';
    switchMode(mode);
  });
});
