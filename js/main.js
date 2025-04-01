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

    // Update meters based on power usage
    async function updateMeters() {
      try {
        const watts = await fetchLatest();
        const KW = watts / 1000;  // Convert watts to kilowatts
        const COST_PER_KWH = 0.2703; // UK average price per kWh in pounds

        
        // Calculate cost per hour
        const costPerHour = (KW * COST_PER_KWH).toFixed(2);
        
        // Update energy meter
        $('#sol-energy .number').text(KW.toFixed(2) + ' kW');
        // Update financial meter
        $('#sol-finance .number').text('£' + costPerHour + '/hr');

        // Calculate needle rotations (0-180 degrees)
        const maxPower = 5; // 5kW max
        const maxCost = 2; // £2/hr max
        
        const powerRotation = Math.min(180, (KW / maxPower) * 180);
        const costRotation = Math.min(180, (costPerHour / maxCost) * 180);
        
        // Update needle positions
        $('#sol-energy .needle').css('transform', `rotate(${powerRotation}deg)`);
        $('#sol-finance .needle').css('transform', `rotate(${costRotation}deg)`);

        // Update risk levels
        function getRiskLevel(rotation) {
          if (rotation < 60) return 'LOW';
          if (rotation < 120) return 'MEDIUM';
          return 'HIGH';
        }

        $('#sol-energy .label').text(`Usage: ${getRiskLevel(powerRotation)}`);
        $('#sol-finance .label').text(`Cost: ${getRiskLevel(costRotation)}`);

      } catch (error) {
        console.error('Error updating meters:', error);
      }
    }

    // Initial update
    updateMeters();

    // Update every 5 seconds
    setInterval(updateMeters, 5000);
  
    // Load saved mode on startup
    const saved = localStorage.getItem('metricsMode') || 'energy';
    toggle.prop('checked', saved === 'financial');
    switchMode(saved);
  
    // On toggle change, switch mode
    toggle.on('change', function () {
      const mode = $(this).is(':checked') ? 'financial' : 'energy';
      switchMode(mode);
    });
});
  