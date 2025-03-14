// frontend/src/components/MarketChart.jsx
import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./MarketChart.css";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const MarketChart = ({ history }) => {
  // Ensure history is an array and has at least one item
  if (!history || !Array.isArray(history) || history.length === 0) {
    return (
      <div className="market-chart-container">
        <h2>Market Prices</h2>
        <div className="empty-chart">
          <p>No market data available yet.</p>
          <p>Play for a few days to see price trends.</p>
        </div>
      </div>
    );
  }

  // Prepare data for the chart
  const labels = history.map((_, index) => `Day ${index + 1}`);
  const currentDay = history.length;

  // Safely extract prices
  const eggPrices = history.map((day) => (day && day.eggs) || 0);
  const milkPrices = history.map((day) => (day && day.milk) || 0);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Egg Price",
        data: eggPrices,
        borderColor: "#ffeb3b",
        backgroundColor: "rgba(255, 235, 59, 0.5)",
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: "Milk Price",
        data: milkPrices,
        borderColor: "#2196f3",
        backgroundColor: "rgba(33, 150, 243, 0.5)",
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 500,
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        titleColor: "#333",
        titleFont: {
          size: 14,
          weight: "bold",
        },
        bodyColor: "#666",
        bodyFont: {
          size: 12,
        },
        borderColor: "#ddd",
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function (context) {
            return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          callback: function (value) {
            return "$" + value.toFixed(2);
          },
          font: {
            size: 11,
          },
        },
      },
    },
  };

  // Calculate current prices and changes
  const currentPrices = history[history.length - 1] || { eggs: 0, milk: 0 };
  const previousPrices =
    history.length > 1 ? history[history.length - 2] : currentPrices;

  const calculateChange = (current, previous) => {
    if (!current || !previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  const eggChange = calculateChange(currentPrices.eggs, previousPrices.eggs);
  const milkChange = calculateChange(currentPrices.milk, previousPrices.milk);

  return (
    <div className="market-chart-container">
      <h2>Market Prices</h2>
      <div className="current-day">Day {currentDay}</div>

      <div className="current-prices">
        <div
          className={`price-item ${eggChange >= 0 ? "price-up" : "price-down"}`}
        >
          <div className="price-icon">🥚</div>
          <div className="price-details">
            <div className="price-label">Eggs</div>
            <div className="price-value">
              ${(currentPrices.eggs || 0).toFixed(2)}
            </div>
            <div className="price-change">
              {eggChange >= 0 ? "▲" : "▼"} {Math.abs(eggChange).toFixed(1)}%
            </div>
          </div>
        </div>

        <div
          className={`price-item ${
            milkChange >= 0 ? "price-up" : "price-down"
          }`}
        >
          <div className="price-icon">🥛</div>
          <div className="price-details">
            <div className="price-label">Milk</div>
            <div className="price-value">
              ${(currentPrices.milk || 0).toFixed(2)}
            </div>
            <div className="price-change">
              {milkChange >= 0 ? "▲" : "▼"} {Math.abs(milkChange).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="market-tip">
        <p>💡 Tip: Watch for price trends to maximize your profits!</p>
      </div>
    </div>
  );
};

export default MarketChart;
