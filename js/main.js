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
  