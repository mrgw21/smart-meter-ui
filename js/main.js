// main.js

$(document).ready(function () {
    const toggle = $('#metricsToggle');
  
    // Each grid section has an energy and finance view
    const subGrids = {
      sol: ['#sol-energy', '#sol-finance'],
      kiran: ['#kiran-energy', '#kiran-finance'],
      jint: ['#jint-energy', '#jint-finance'],
      rasyid: ['#rasyid-energy', '#rasyid-finance'],
    };
  
    let rasyidChart = null;
    let usageMockData = {};
    let currentRange = 'week';
  
    // Apply current mode to all affected grid sections
    function switchMode(mode) {
      const isEnergy = mode === 'energy';
  
      Object.values(subGrids).forEach(([energySelector, financeSelector]) => {
        $(energySelector).toggle(isEnergy);
        $(financeSelector).toggle(!isEnergy);
      });
  
      localStorage.setItem('metricsMode', mode);
      renderChart(currentRange); // Re-render on mode change
    }
  
    // Load saved mode on startup
    const saved = localStorage.getItem('metricsMode') || 'energy';
    toggle.prop('checked', saved === 'financial');
  
    // On toggle change, switch mode
    toggle.on('change', function () {
      const mode = $(this).is(':checked') ? 'financial' : 'energy';
      switchMode(mode);
    });
  
    // Format date YYYY-MM-DD
    function formatDate(ts) {
      return new Date(ts).toISOString().split('T')[0];
    }
  
    // Setup calendar with max 30 days back
    function setupDatePicker() {
      const calendar = $('#customDate');
      const today = new Date();
      const minDate = new Date(today);
      minDate.setDate(today.getDate() - 30);
  
      calendar.attr('max', formatDate(today));
      calendar.attr('min', formatDate(minDate));
      calendar.val(formatDate(today));
    }
  
    // Render Chart.js chart
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
            backgroundColor: 'rgba(13, 110, 253, 0.5)',
            borderColor: 'rgba(13, 110, 253, 1)',
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
  
    // On range button click
    $('#rangeButtons button').on('click', function () {
      $('#rangeButtons button').removeClass('active');
      $(this).addClass('active');
  
      currentRange = $(this).data('range');
      renderChart(currentRange);
    });
  
    // Fetch JSON data and initialize everything
    $.getJSON('data/usagebetween.json', function (data) {
      usageMockData = data;
      setupDatePicker();
      switchMode(saved);
      $('#rangeButtons button[data-range="week"]').trigger('click');
    });
  });
  