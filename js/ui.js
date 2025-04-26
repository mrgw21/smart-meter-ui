import { fetchLatest, fetchAvg24h } from "./api2.js";

export function getTariffSettings() {
  return {
    costPerKwh: parseFloat(localStorage.getItem("tariffRate")) || 0.2703,
    standingCharge: parseFloat(localStorage.getItem("standingCharge")) || 0,
  };
}

let highPowerCostNotified = false;
export async function updateSolChart(watts) {
  try {
    const { costPerKwh } = getTariffSettings();
    const costPerHour = ((watts * costPerKwh) / 1000).toFixed(2);

    $("#sol-energy .number").text(`${watts.toFixed(2)} W`);
    $("#sol-finance .number").text(`£${costPerHour}/hr`);

    const maxPower = 5000;
    const maxCost = 2;
    const powerRotation = Math.min(180, (watts / maxPower) * 180);
    const costRotation = Math.min(180, (costPerHour / maxCost) * 180);

    $("#sol-energy .needle").css("transform", `rotate(${powerRotation}deg)`);
    $("#sol-finance .needle").css("transform", `rotate(${costRotation}deg)`);

    const getRiskLevel = (deg) =>
      deg < 60 ? "LOW" : deg < 120 ? "MEDIUM" : "HIGH";
    $("#sol-energy .label").text(`Usage: ${getRiskLevel(powerRotation)}`);
    $("#sol-finance .label").text(`Cost: ${getRiskLevel(costRotation)}`);

    if (parseFloat(costPerHour) > 25) {
      if (!highPowerCostNotified) {
        const message = `⚠️ High power usage: £${costPerHour}/hr`;
        toastr.warning(message);
        addNotificationToTray(message, "warning");
        highPowerCostNotified = true;
      }
    } else {
      highPowerCostNotified = false;
    }
  } catch (err) {
    console.error("Error updating meters:", err);
  }
}

export function renderChart(range = "week") {
  const { costPerKwh, standingCharge } = getTariffSettings();
  const isEnergy = !$("#metricsToggle").is(":checked");
  const canvasId = isEnergy ? "rasyidChartEnergy" : "rasyidChartFinance";
  const ctx = document.getElementById(canvasId)?.getContext("2d");
  if (!ctx) return;

  const data = usageMockData[range];
  const labels = data?.labels || ["No data"];
  const values = isEnergy
    ? data?.kwh // Assuming your mock data is in W already
    : data?.kwh.map((val) => +(val * costPerKwh + standingCharge).toFixed(2));

  if (rasyidChart) rasyidChart.destroy();

  rasyidChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: isEnergy ? "Usage (W)" : "Cost (£)",
          data: values,
          backgroundColor: "rgba(75, 192, 192, 0.5)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => (isEnergy ? `${val} W` : `£${val}`),
          },
        },
      },
    },
  });
}

export class solChartSmooth {
  constructor() {
    this.current = 0.0;
    this.target = 0.0;

    setInterval(() => {
      this.animate();
    }, 1000 / 15);
  }

  async animate() {
    this.current = this.current * 0.8 + this.target * 0.2;
    if (Math.abs(this.current - this.target) < 0.1) {
      this.current = this.target;
    }
    if (this.current !== this.target) {
      await updateSolChart(this.current);
    }
  }

  update(value) {
    this.target = value;
  }
}

export class lineChartAgainstTime {
  constructor(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    this.ctx = canvas.getContext("2d");
    this.data = {
      labels: [],
      datasets: [
        {
          label: "Live Power Usage (W)",
          data: [],
          borderColor: "rgb(75, 192, 192)",
          fill: false,
          tension: 0.4,
        },
        {
          label: "Average Usage (W)",
          data: [],
          backgroundColor: "rgba(75, 192, 192, 0)",
          borderColor: "rgba(75, 192, 192, 0)",
          fill: true,
          tension: 0.4
        },
      ],
      _isEnergy: true,
      _rawData: [],
    };
    this.chart = new Chart(this.ctx, {
      type: "line",
      data: this.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            type: "time",
            time: { unit: "second" },
            // min: () => new Date(Date.now() - 2 * 60 * 1000),
            max: () => new Date(),
            title: { display: true, text: "Time" },
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: "Power (W)" },
          },
        },
      },
    });

    this.pendingRender = false;
  }

  push(time, wattage, sort=false, update=true) {
    const isEnergy = !$("#metricsToggle").is(":checked");
    const costPerKwh = getTariffSettings().costPerKwh;
    const cost = +((wattage * costPerKwh) / 1000).toFixed(2); // Still per kWh
    const value = isEnergy ? wattage : cost;

    this.data._rawData.push({
      time,
      wattage,
    });

    if (sort) {
        this.sortRawData();
    }

    if (isEnergy !== this.data._isEnergy || this.pendingRender) {
      this.data._isEnergy = isEnergy;
      this.pendingRender = false;
      this.data.labels = [];
      this.data.datasets[0].data = [];
      this.data.datasets[1].data = [];

      let movingAverage = [];
      let accumulator = 0;
      let count = 0;
      this.data._rawData.forEach((d) => {
        accumulator += d.wattage;
        count++;
        const avg = accumulator / count;
        movingAverage.push(avg.toFixed(2));
      });

      if (isEnergy) {
        this.data.labels = this.data._rawData.map((d) => new Date(d.time));
        this.data.datasets[0].data = this.data._rawData.map((d) => d.wattage);
        this.data.datasets[1].data = movingAverage;
      } else {
        this.data.labels = this.data._rawData.map((d) => new Date(d.time));
        this.data.datasets[0].data = this.data._rawData.map(
          (d) => (d.wattage * costPerKwh) / 1000
        );
        this.data.datasets[1].data = movingAverage.map(
          (d) => (d * costPerKwh) / 1000
        );
      }
    } else {
      this.data.labels.push(new Date(time));
      this.data.datasets[0].data.push(value);

      const avg =
        this.data.datasets[0].data.reduce((a, b) => a + b, 0) /
        this.data.datasets[0].data.length;
      this.data.datasets[1].data.push(+avg.toFixed(2));

      //   const cutoff = new Date(time - 2 * 60 * 1000);
      //   while (this.data.labels[0] < cutoff) {
      //     this.data.labels.shift();
      //     this.data.datasets[0].data.shift();
      //     this.data.datasets[1].data.shift();
      //     this.data._rawData.shift();
      //   }
    }

    console.log(this.data);

    this.data.datasets[0].label = isEnergy
      ? "Live Power Usage (W)"
      : "Live Cost (£/hr)";
    this.data.datasets[1].label = isEnergy
      ? "Average Usage (W)"
      : "Avg Cost (£/hr)";
    this.chart.options.scales.y.title.text = isEnergy
      ? "Power (W)"
      : "Cost (£/hr)";

    if(update){
        this.chart.update();
    }
  }

  // async function updateKiranChart() {
  //   try {
  //     const { costPerKwh } = getTariffSettings();
  //     const watts = await fetchLatest();
  //     const cost = +((watts * costPerKwh) / 1000).toFixed(2); // Still per kWh
  //     const now = new Date();
  //     const isEnergy = !$("#metricsToggle").is(":checked");

  //     const value = isEnergy ? watts : cost;
  //     data.labels.push(now);
  //     data.datasets[0].data.push(value);

  //     const avg =
  //       data.datasets[0].data.reduce((a, b) => a + b, 0) /
  //       data.datasets[0].data.length;
  //     data.datasets[1].data.push(+avg.toFixed(2));

  //     const cutoff = new Date(now.getTime() - 2 * 60 * 1000);
  //     while (data.labels[0] < cutoff) {
  //       data.labels.shift();
  //       data.datasets[0].data.shift();
  //       data.datasets[1].data.shift();
  //     }

  //     kiranChart.data.datasets[0].label = isEnergy
  //       ? "Live Power Usage (W)"
  //       : "Live Cost (£/hr)";
  //     kiranChart.data.datasets[1].label = isEnergy
  //       ? "Average Usage (W)"
  //       : "Avg Cost (£/hr)";
  //     kiranChart.options.scales.y.title.text = isEnergy
  //       ? "Power (W)"
  //       : "Cost (£/hr)";
  //     kiranChart.update();
  //   } catch (err) {
  //     console.error("Error updating Kiran chart:", err);
  //   }
  // }

  // updateKiranChart();
  // setInterval(updateKiranChart, 5000);

  sortRawData() {
    this.data._rawData.sort((a, b) => a.time - b.time);
    this.pendingRender = true;
  }
}

export class Meter {
  constructor(impPerKwh = 800) {
    this.wattage = 0.0;
    this.sampleTime = 0.0;
    this.impPerKwh = impPerKwh;
    this.onChangedCallbacks = [];
    this.scheduledFetch = [];
  }

  async fetch() {
    const data = await fetchLatest();
    if (data === undefined) return;
    const changed = this.wattage !== data.wattage;

    this.wattage = data.wattage || 0;
    this.sampleTime = data.sample_time || 0;

    if (changed) {
      this.onChangedCallbacks.forEach((callback) => callback(data));
      this.scheduleFetch();
    }
    return this.wattage;
  }

  scheduleFetch() {
    this.scheduledFetch.forEach((timer) => {
      clearTimeout(timer);
    });
    this.scheduledFetch = [];

    let msSinceLast = Date.now() - this.sampleTime;
    let expectedUpdateInterval = this.getExpectedUpdateInterval() * 1000;
    let now = Date.now();
    let nextChecks = [
      expectedUpdateInterval * 0.95 - msSinceLast,
      expectedUpdateInterval * 1.05 - msSinceLast,
    ];
    nextChecks.forEach((interval) => {
      if (interval > 0) {
        let timer = setTimeout(() => {
          console.log("Scheduled fetch triggered");
          this.fetch();
        }, interval);
        this.scheduledFetch.push(timer);
      }
    });
  }

  getExpectedUpdateInterval() {
    return (1 / (this.wattage / 3600) / this.impPerKwh) * 1000;
  }

  getCurrent() {
    return this.wattage;
  }

  getPrediction() {
    if (this.wattage === 0) return 0;
    let secSinceLast = (Date.now() - this.sampleTime) / 1000.0;
    let expectedUpdateInterval = this.getExpectedUpdateInterval();

    if (secSinceLast > expectedUpdateInterval + 5) {
      let simulated_interval = Math.max(secSinceLast - 10, 0.1);
      let simulated_wattage = Math.min(
        (3600 / (simulated_interval * this.impPerKwh)) * 1000,
        this.wattage
      );
      return simulated_wattage;
    } else {
      return this.wattage;
    }
  }

  startTracking() {
    this.fetch();
    setInterval(async () => {
      this.fetch();
    }, 5000);
  }

  addOnChangedCallback(callback) {
    this.onChangedCallbacks.push(callback);
  }
}


export async function updateJintGrid() {
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