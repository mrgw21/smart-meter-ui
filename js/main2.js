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
}, 3000);


async function fetchData() {
    let hoursBack = 24;
    let stepSize = 60 * 1000 * 30; // 10 minutes
    let endTime = Date.now() - stepSize;
    let startTime = endTime - hoursBack * 60 * 60 * 1000;
    let imp_per_kWh = 800; // Impulses per kWh
    for (let i = endTime; i >= startTime; i -= stepSize) {
        let start = i - stepSize;
        let end = i;
        let mid = Math.floor((start + end) / 2);
        let data = await avgBetween(start, end, imp_per_kWh);
        lineChart.push(mid, data.wattage, true);
    }
}


fetchData();