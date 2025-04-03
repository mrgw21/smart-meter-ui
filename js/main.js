import { fetchLatest } from './api.js';

$(document).ready(function () {
  const toggle = $('#metricsToggle');
  const COST_PER_KWH = 0.2703;

  const subGrids = {
    sol: ['#sol-energy', '#sol-finance'],
    kiran: ['#kiran-energy', '#kiran-finance'],
    jint: ['#jint-energy', '#jint-finance'],
    rasyid: ['#rasyid-energy', '#rasyid-finance'],
  };

  let rasyidChart = null;
  let usageMockData = {};
  let currentRange = 'week';

  function switchMode(mode) {
    const isEnergy = mode === 'energy';

    $('.metric-label').each(function () {
      const label = $(this);
      label.text(isEnergy ? label.data('energy') : label.data('financial'));
    });

    $('.metric-value').each(function () {
      const el = $(this);
      const kwh = parseFloat(el.data('energy-value'));
      if (!isNaN(kwh)) {
        const cost = (kwh * COST_PER_KWH).toFixed(2);
        el.data('financial-value', `£${cost}`);
        el.text(isEnergy ? `${kwh} kWH` : `£${cost}`);
      }
    });

    Object.entries(subGrids).forEach(([key, [energy, finance]]) => {
      if (key === 'jint') {
        // Jint uses one shared container — keep always visible
        $(energy).show();
        $(finance).hide(); // Just in case it exists, ensure it's hidden
      } else {
        $(energy).toggle(isEnergy);
        $(finance).toggle(!isEnergy);
      }
    });

    localStorage.setItem('metricsMode', mode);
    renderChart(currentRange);
  }

  function updatePlugState(isConnected) {
    const badge = $('.plug-state');
    badge.text(isConnected ? 'ON' : 'OFF');
    badge.removeClass('bg-success bg-danger');
    badge.addClass(isConnected ? 'bg-success' : 'bg-danger');
  }  

  function renderChart(range = 'week') {
    const isEnergy = !$('#metricsToggle').is(':checked');
    const canvasId = isEnergy ? 'rasyidChartEnergy' : 'rasyidChartFinance';
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    const data = usageMockData[range];
    const labels = data?.labels || ['No data'];
    const values = isEnergy ? data?.kwh : data?.kwh.map(val => +(val * COST_PER_KWH).toFixed(2));

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

  // Kiran's Chart - Energy and Financial Toggle
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
        const watts = await fetchLatest();
        const kW = watts / 1000;
        const cost = +(kW * COST_PER_KWH).toFixed(2);
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
      const watts = await fetchLatest();
      const kW = watts / 1000;
      const costPerHour = (kW * 0.2703).toFixed(2);

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
