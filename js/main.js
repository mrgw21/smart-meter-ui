import { fetchLatest } from './api.js';

$(document).ready(function () {
  const toggle = $('#metricsToggle');
  
  // Each grid section has an energy and finance view
  const subGrids = {
    sol: ['#sol-energy', '#sol-finance'],
    kiran: ['#kiran-energy', '#kiran-finance'],
    jint: ['#jint-energy', '#jint-finance'],
    rasyid: ['#rasyid-energy', '#rasyid-finance'],
  };
  
  // Apply current mode to all affected grid sections
  function switchMode(mode) {
    const isEnergy = mode === 'energy';
  
    Object.values(subGrids).forEach(([energySelector, financeSelector]) => {
      $(energySelector).toggle(isEnergy);
      $(financeSelector).toggle(!isEnergy);
    });
  
    localStorage.setItem('metricsMode', mode);
  }
  
  // Initialize live chart for Kiran's grid
  // Make sure your HTML contains a canvas element with id="kiranLiveChart"
  const canvas = document.getElementById('kiranLiveChart');
  if (!canvas) return; // exit if no chart container found
  const ctx = canvas.getContext('2d');
  
  // Chart data and configuration
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
    data: data,
    options: {
      responsive: true,
      animation: false,
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'second',
          },
          ticks: {
            source: 'auto',
          },
          title: {
            display: true,
            text: 'Time',
          },
          // Set the visible window to the last 2 minutes
          min: () => new Date(Date.now() - 2 * 60 * 1000),
          max: () => new Date(),
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Power (kW)',
          },
        },
      },
      plugins: {
        legend: {
          display: true,
        },
      },
    },
  };
  
  const kiranChart = new Chart(ctx, config);
  
  // Function to update the chart data
  async function updateKiranChart() {
    try {
      // Fetch the latest wattage value and convert to kilowatts
      const watts = await fetchLatest();
      const kW = watts / 1000;
      const now = new Date();
  
      // Add new data point
      data.labels.push(now);
      data.datasets[0].data.push(kW);
  
      // Compute average of all collected kW values
      const sum = data.datasets[0].data.reduce((a, b) => a + b, 0);
      const avg = sum / data.datasets[0].data.length;
      data.datasets[1].data.push(avg);
  
      // Remove data older than 2 minutes (for display purposes)
      const cutoff = new Date(now.getTime() - 2 * 60 * 1000);
      while (data.labels.length && data.labels[0] < cutoff) {
        data.labels.shift();
        data.datasets[0].data.shift();
        data.datasets[1].data.shift();
      }
  
      // Update the chart with new data
      kiranChart.update();
    } catch (err) {
      console.error('Error updating live chart:', err);
    }
  }
  
  // Initial chart update and set interval every 5 seconds
  updateKiranChart();
  setInterval(updateKiranChart, 5000);
  
  // Load saved mode on startup and apply toggle switch
  const saved = localStorage.getItem('metricsMode') || 'energy';
  toggle.prop('checked', saved === 'financial');
  switchMode(saved);
  
  // On toggle change, switch mode
  toggle.on('change', function () {
    const mode = $(this).is(':checked') ? 'financial' : 'energy';
    switchMode(mode);
  });
});
