import { fetchLatest } from './api.js';

$(document).ready(function () {
  const toggle = $('#metricsToggle');

  // Grid sections: energy and financial views
  const subGrids = {
    sol: ['#sol-energy', '#sol-finance'],
    kiran: ['#kiran-energy', '#kiran-finance'],
    jint: ['#jint-energy', '#jint-finance'],
    rasyid: ['#rasyid-energy', '#rasyid-finance'],
  };

  let rasyidChart = null;
  let usageMockData = {};
  let currentRange = 'week';

  // Toggle energy/financial mode
  function switchMode(mode) {
    const isEnergy = mode === 'energy';

    Object.values(subGrids).forEach(([energySelector, financeSelector]) => {
      $(energySelector).toggle(isEnergy);
      $(financeSelector).toggle(!isEnergy);
    });

    // Update Jint’s metric labels and values
    $('.metric-label').each(function () {
      const label = $(this);
      label.text(isEnergy ? label.data('energy') : label.data('financial'));
    });

    $('.metric-value').each(function () {
      const value = $(this);
      value.text(isEnergy ? value.data('energy-value') : value.data('financial-value'));
    });

    // Plug state badge toggle
    $('.plug-state').each(function () {
      const badge = $(this);
      badge.text(isEnergy ? badge.data('energy-value') : badge.data('financial-value'));
      badge.toggleClass(badge.data('on-class'), isEnergy);
      badge.toggleClass(badge.data('off-class'), !isEnergy);
    });

    localStorage.setItem('metricsMode', mode);
    renderChart(currentRange);
  }

  // Chart for Rasyid's grid
  function renderChart(range = 'week') {
    const isEnergy = !$('#metricsToggle').is(':checked');
    const canvasId = isEnergy ? 'rasyidChartEnergy' : 'rasyidChartFinance';
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    const data = usageMockData[range];
    const labels = data?.labels || ['No data'];
    const values = data?.values || [0];

    if (rasyidChart) rasyidChart.destroy();

    rasyidChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Usage (kWh)',
          data: values,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',   // 💡 teal fill
          borderColor: 'rgba(75, 192, 192, 1)',         // 💡 teal border
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });    
  }

  // Setup calendar (past 30 days)
  function setupDatePicker() {
    const calendar = $('#customDate');
    const today = new Date();
    const min = new Date(today);
    min.setDate(min.getDate() - 30);

    function format(d) {
      return d.toISOString().split('T')[0];
    }

    calendar.attr('min', format(min));
    calendar.attr('max', format(today));
    calendar.val(format(today));
  }

  // Kiran's live chart
  const canvas = document.getElementById('kiranLiveChart');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const data = {
      labels: [],
      datasets: [
        {
          label: "Kiran's Live Power Usage (kW)",
          data: [],
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.4,
        },
        {
          label: 'Average Power Usage (kW)',
          data: [],
          fill: true,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 0.6)',
          tension: 0.4,
        },
      ],
    };

    const config = {
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
        },
        plugins: {
          legend: { display: true }
        }
      }
    };

    const kiranChart = new Chart(ctx, config);

    async function updateKiranChart() {
      try {
        const watts = await fetchLatest();
        const kW = watts / 1000;
        const now = new Date();

        data.labels.push(now);
        data.datasets[0].data.push(kW);

        const avg = data.datasets[0].data.reduce((a, b) => a + b, 0) / data.datasets[0].data.length;
        data.datasets[1].data.push(avg);

        const cutoff = new Date(now.getTime() - 2 * 60 * 1000);
        while (data.labels[0] < cutoff) {
          data.labels.shift();
          data.datasets[0].data.shift();
          data.datasets[1].data.shift();
        }

        kiranChart.update();
      } catch (err) {
        console.error('Error updating Kiran chart:', err);
      }
    }

    updateKiranChart();
    setInterval(updateKiranChart, 5000);
  }

  $('#rangeButtons button').on('click', function () {
    $('#rangeButtons button').removeClass('active');
    $(this).addClass('active');
  
    currentRange = $(this).data('range');
    renderChart(currentRange);
  }); 
  

  // Load mock data
  $.getJSON('data/usagebetween.json', function (data) {
    usageMockData = data;
    setupDatePicker();
    const saved = localStorage.getItem('metricsMode') || 'energy';
    toggle.prop('checked', saved === 'financial');
    switchMode(saved);
    $('#rangeButtons button[data-range="week"]').trigger('click');
  });

  // Toggle switch
  toggle.on('change', function () {
    const mode = $(this).is(':checked') ? 'financial' : 'energy';
    switchMode(mode);
  });
});
