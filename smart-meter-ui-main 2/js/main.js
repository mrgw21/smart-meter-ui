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
    
      // Toggle visibility of energy/financial views
      Object.values(subGrids).forEach(([energySelector, financeSelector]) => {
        $(energySelector).toggle(isEnergy);
        $(financeSelector).toggle(!isEnergy);
      });
    
      // Update section title (if you're using it)
      $('.metrics-label').text(isEnergy ? 'Energy Info' : 'Financial Info');
    
      // 🔄 Update individual metric labels
      $('.metric-label').each(function () {
        const label = $(this);
        const newText = isEnergy ? label.data('energy') : label.data('financial');
        label.text(newText);
      });
    
      // 🔄 Update individual metric values
      $('.metric-value').each(function () {
        const value = $(this);
        const newVal = isEnergy ? value.data('energy-value') : value.data('financial-value');
        value.text(newVal);
      });
    
      // Save current mode
      localStorage.setItem('metricsMode', mode);

            // Special: Plug state badge styling (color toggle)
      $('.plug-state').each(function () {
        const badge = $(this);
        const isEnergy = mode === 'energy';

        // Get new value
        const newVal = isEnergy ? badge.data('energy-value') : badge.data('financial-value');
        badge.text(newVal);

        // Class toggle for color
        const onClass = badge.data('on-class');
        const offClass = badge.data('off-class');

        if (isEnergy && onClass && offClass) {
          badge.removeClass(offClass).addClass(onClass);
        } else if (!isEnergy && onClass && offClass) {
          badge.removeClass(onClass).addClass(offClass);
        }
      });
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


  