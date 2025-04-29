import { fetchLatest } from './api.js';
import { updateBryceGrid } from './current.js';

let highPowerCostNotified = false;

$(document).ready(function () {

  updateBryceGrid();
  setInterval(updateBryceGrid, 5000);

  $('#testNotificationBtn').on('click', function () {
    const message = `🔔 Test notification triggered at ${new Date().toLocaleTimeString()}`;
    toastr.info(message);
    addNotificationToTray(message, 'info');
  });

  toastr.options = {
    "positionClass": "toast-top-center",
    "timeOut": "10000",
    "progressBar": true
  };

  $('#tariffRate').val(localStorage.getItem('tariffRate') || '0.27');
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
      const watt = parseFloat(el.data('energy-value'));
      if (!isNaN(watt)) {
        const cost = (watt * costPerKwh + standingCharge).toFixed(2);
        el.data('financial-value', `£${cost}`);
        el.text(isEnergy ? `${watt} W` : `£${cost}`);
      }
    });

    Object.entries(subGrids).forEach(([key, [energy, finance]]) => {
      if (key === 'jint') {
        $(energy).show();
        $(finance).hide();
      } else {
        $(energy).toggle(isEnergy);
        $(finance).toggle(!isEnergy);
      }
    });

    localStorage.setItem('metricsMode', mode);
    renderChart(currentRange);
  }

  function renderChart(range = 'week') {
    const { costPerKwh, standingCharge } = getTariffSettings();
    const isEnergy = !$('#metricsToggle').is(':checked');
    const canvasId = isEnergy ? 'rasyidChartEnergy' : 'rasyidChartFinance';
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    const data = usageMockData[range];
    const labels = data?.labels || ['No data'];
    const values = isEnergy
      ? data?.kwh // Assuming your mock data is in W already
      : data?.kwh.map(val => +(val * costPerKwh + standingCharge).toFixed(2));

    if (rasyidChart) rasyidChart.destroy();

    rasyidChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: isEnergy ? 'Usage (W)' : 'Cost (£)',
          data: values,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: val => isEnergy ? `${val} W` : `£${val}`
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
          label: 'Live Power Usage (W)',
          data: [],
          borderColor: 'rgb(75, 192, 192)',
          fill: false,
          tension: 0.4
        },
        {
          label: 'Average Usage (W)',
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
        maintainAspectRatio: false,
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
            title: { display: true, text: 'Power (W)' }
          }
        }
      }
    });

    async function updateKiranChart() {
      try {
        const { costPerKwh } = getTariffSettings();
        const watts = await fetchLatest();
        const cost = +(watts * costPerKwh / 1000).toFixed(2); // Still per kWh
        const now = new Date();
        const isEnergy = !$('#metricsToggle').is(':checked');

        const value = isEnergy ? watts : cost;
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

        kiranChart.data.datasets[0].label = isEnergy ? 'Live Power Usage (W)' : 'Live Cost (£/hr)';
        kiranChart.data.datasets[1].label = isEnergy ? 'Average Usage (W)' : 'Avg Cost (£/hr)';
        kiranChart.options.scales.y.title.text = isEnergy ? 'Power (W)' : 'Cost (£/hr)';
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
      const costPerHour = (watts * costPerKwh / 1000).toFixed(2);

      $('#sol-energy .number').text(`${watts.toFixed(2)} W`);
      $('#sol-finance .number').text(`£${costPerHour}/hr`);

      const maxPower = 5000; // W
      const maxCost = 2;
      const powerRotation = Math.min(180, (watts / maxPower) * 180);
      const costRotation = Math.min(180, (costPerHour / maxCost) * 180);

      $('#sol-energy .needle').css('transform', `rotate(${powerRotation}deg)`);
      $('#sol-finance .needle').css('transform', `rotate(${costRotation}deg)`);

      const getRiskLevel = deg => deg < 60 ? 'LOW' : deg < 120 ? 'MEDIUM' : 'HIGH';
      $('#sol-energy .label').text(`Usage: ${getRiskLevel(powerRotation)}`);
      $('#sol-finance .label').text(`Cost: ${getRiskLevel(costRotation)}`);

      if (parseFloat(costPerHour) > 25) {
        if (!highPowerCostNotified) {
          const message = `⚠️ High power usage: £${costPerHour}/hr`;
          toastr.warning(message);
          addNotificationToTray(message, 'warning');
          highPowerCostNotified = true;
        }
      } else {
        highPowerCostNotified = false;
      }
    } catch (err) {
      console.error('Error updating meters:', err);
    }
  }

  async function updateJintGrid() {
    try {
      const { costPerKwh, standingCharge } = getTariffSettings();
      const watts = await fetchLatest(); // in W
      const costPerHour = +(watts * costPerKwh / 1000).toFixed(2);
      const costPerMonth = (costPerHour * 24 * 30).toFixed(2);
      const dailyAvg = +(watts * 0.9).toFixed(2);
      const monthlyAvg = +(watts * 25).toFixed(2);

      const values = {
        uptime: watts,
        totalToday: watts,
        dailyAvg: dailyAvg,
        totalMonth: watts * 30,
        monthlyAvg: monthlyAvg,
      };

      // Energy values (now in W)
      $('#jint-energy .metric-value').each(function () {
        const el = $(this);
        const label = el.prev('.metric-label').text().toLowerCase();

        let value = '0';
        if (label.includes('uptime')) value = values.uptime.toFixed(2);
        else if (label.includes('total today')) value = values.totalToday.toFixed(2);
        else if (label.includes('daily avg')) value = values.dailyAvg.toFixed(2);
        else if (label.includes('total this month')) value = values.totalMonth.toFixed(2);
        else if (label.includes('monthly avg')) value = values.monthlyAvg.toFixed(2);

        const cost = (value * costPerKwh / 1000 + standingCharge).toFixed(2);
        el.attr('data-energy-value', value);
        el.attr('data-financial-value', `£${cost}`);

        const isEnergy = !$('#metricsToggle').is(':checked');
        el.text(isEnergy ? `${value} W` : `£${cost}`);
      });

    } catch (err) {
      console.error("Error updating Jint grid:", err);
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

    const rateRaw = $('#tariffRate').val().replace(',', '.');
    const chargeRaw = $('#standingCharge').val().replace(',', '.');

    const rate = parseFloat(rateRaw);
    const charge = parseFloat(chargeRaw);

    if (isNaN(rate) || isNaN(charge)) {
      toastr.error('Please enter valid numeric values for both fields.');
      return;
    }

    localStorage.setItem('tariffRate', rate.toFixed(4));
    localStorage.setItem('standingCharge', charge.toFixed(2));
    localStorage.setItem('tariffSet', 'true');

    const modalEl = document.getElementById('tariffModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
  });

  updateMeters();
  setInterval(updateMeters, 5000);

  updateJintGrid();
  setInterval(updateJintGrid, 10000);

  const themeToggle = document.getElementById('theme-toggle');
  const bellIcon = document.getElementById('bell-icon');

  $('#themeToggle').on('click', function () {
    $('body').toggleClass('dark-mode');

    const icon = $('#themeIcon');
    const isDark = $('body').hasClass('dark-mode');

    icon.attr('src', isDark ? 'assets/icons/day-mode.png' : 'assets/icons/night-mode.png');
  });

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
    updateKiranChart();
    updateJintGrid();
    $('#rangeButtons button[data-range="week"]').trigger('click');
  });

  toggle.on('change', function () {
    const mode = $(this).is(':checked') ? 'financial' : 'energy';
    switchMode(mode);
    updateKiranChart();
    updateJintGrid();
  });

  let notificationHistory = [];

  function addNotificationToTray(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const entry = { message, level, timestamp };
    notificationHistory.unshift(entry);

    const $notifItem = $(`
      <div class="mb-2 p-2 border rounded bg-light">
        <div class="small text-muted">${timestamp}</div>
        <div>${message}</div>
      </div>
    `);
    $('#notification-list').prepend($notifItem);
    updateNotificationCounter();

    fetch('http://localhost:3000/api/send-whatsapp-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
  }

  function updateNotificationCounter() {
    const count = notificationHistory.length;
    const $counter = $('#notification-count');
    if (count > 0) {
      $counter.text(count).show();
    } else {
      $counter.hide();
    }
  }

  function updateThemeIcon() {
    const isDark = document.body.classList.contains('dark-mode');

    $('#themeIcon').attr('src', isDark
      ? 'assets/icons/day-mode.png'
      : 'assets/icons/night-mode.png');

    $('#bell-icon').attr('src', isDark
      ? 'assets/icons/bell-dark-mode.png'
      : 'assets/icons/bell.png');

    $('#power-icon').attr('src', isDark
      ? 'assets/icons/power-dark-mode.png'
      : 'assets/icons/power.png');

    $('#money-icon').attr('src', isDark
      ? 'assets/icons/money-dark-mode.png'
      : 'assets/icons/money.png');
  }

  $('#themeToggle').on('click', function () {
    $('body').toggleClass('dark-mode');
    updateThemeIcon();
  });

  updateThemeIcon();

  $('#notification-bell').on('click', function () {
    $('#notification-tray').toggle();
  });

  window.addEventListener('resize', () => {
    for (const id in Chart.instances) {
      const chart = Chart.instances[id];
      if (chart) chart.resize();
    }
  });

});