import {
  updateSolChart,
  lineChartAgainstTime,
  solChartSmooth,
  Meter,
  updateJintGrid,
} from "./ui.js";
import { fetchLatest, fetchAvg24h, avgBetween } from "./api2.js";

let lineChart = new lineChartAgainstTime("kiranLiveChart");
let meterChart = new solChartSmooth();
let meter = new Meter(800);

meter.startTracking();

setInterval(() => {
  let predictedWattage = meter.getPrediction();
  meterChart.update(predictedWattage);
}, 1000);

setInterval(() => {
  let predictedWattage = meter.getPrediction();
  let sampleTime = Date.now();
  lineChart.push(sampleTime, predictedWattage);
}, 5000);


async function fetchData() {
    let hoursBack = 24;
    let stepSize = 60 * 1000 * 30; // 10 minutes
    let endTime = Date.now();
    let startTime = endTime - hoursBack * 60 * 60 * 1000;
    let imp_per_kWh = 800; // Impulses per kWh
    let is = [];
    for (let i = endTime; i >= startTime; i -= stepSize) {
        is.push(i);
    }
    
    is.sort((a, b) => Math.random() - 0.5); // Shuffle the array
    
    for (let i = 0; i < is.length; i++) {
        let start = is[i] - stepSize;
        let end = is[i];
        let mid = (start + end) / 2;
        let data = await avgBetween(start, end, imp_per_kWh);
        lineChart.push(mid, data.wattage, true, false);
    }
    lineChart.sortRawData();
}


fetchData();

updateJintGrid();