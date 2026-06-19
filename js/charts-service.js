// --- Chart.js Visualization Service ---
import { loadMoodDataFromFirestore } from "./db-service.js";

// Chart instances
export let completionByCategoryChartInstance = null;
export let moodAnalyticsChartInstance = null;

export const analyticsCharts = {
  completionTrends: null,
  priorityDistribution: null,
  burndown: null,
  moodAnalytics: null,
};

const categoryUiColors = {
  "Very Important Tasks": "var(--accent-blue)",
  "High Priority Tasks": "var(--accent-red)",
  "Good-Good Priority": "var(--accent-yellow)",
  "Low Priority Tasks": "var(--accent-purple)",
};

// Render completion by category bar chart (Behavioural Analysis)
export function renderCompletionByCategoryChart(data) {
  const ctx = document.getElementById("completionByCategoryChart")?.getContext("2d");
  if (!ctx) {
    console.error("completionByCategoryChart canvas not found");
    return;
  }
  if (completionByCategoryChartInstance) {
    completionByCategoryChartInstance.destroy();
  }

  const isMobile = window.innerWidth < 768;

  completionByCategoryChartInstance = new Chart(ctx, {
    type: "bar",
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "var(--ph-new-text-medium)",
            stepSize: 1,
            font: { family: "Poppins", size: isMobile ? 8 : 10 },
          },
          grid: { color: "var(--ph-new-border-color)" },
        },
        x: {
          ticks: {
            color: "var(--ph-new-text-medium)",
            font: { family: "Poppins", size: isMobile ? 8 : 10 },
            autoSkip: true,
            maxRotation: isMobile ? 70 : 45,
            minRotation: isMobile ? 45 : 30,
            padding: 5,
          },
          grid: { display: false },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "var(--ph-new-text-dark)",
            font: { size: isMobile ? 9 : 11, family: "Poppins" },
          },
        },
        tooltip: {
          backgroundColor: "var(--ph-new-white)",
          titleColor: "var(--ph-new-text-dark)",
          bodyColor: "var(--ph-new-text-medium)",
          borderColor: "var(--ph-new-border-color)",
          borderWidth: 1,
          titleFont: { family: "Poppins" },
          bodyFont: { family: "Poppins" },
        },
      },
      animation: { duration: 700, easing: "easeOutQuart" },
    },
  });
}

// Render mood analytics doughnut chart
export async function renderMoodAnalyticsChart(selectedDate, currentUser) {
  const ctx = document.getElementById("moodAnalyticsChart")?.getContext("2d");
  if (!ctx) {
    console.error("moodAnalyticsChart canvas not found");
    return;
  }

  // Destroy existing chart
  if (moodAnalyticsChartInstance) {
    moodAnalyticsChartInstance.destroy();
  }

  // Load mood data from Firestore
  const moodEntries = await loadMoodDataFromFirestore(selectedDate, currentUser);

  // Count mood frequencies
  const moodCounts = {
    accomplished: 0,
    happy: 0,
    relieved: 0,
    neutral: 0,
    stressed: 0,
    frustrated: 0,
  };

  moodEntries.forEach((entry) => {
    if (moodCounts.hasOwnProperty(entry.mood)) {
      moodCounts[entry.mood]++;
    }
  });

  const labels = [
    "🏆 Accomplished",
    "😊 Happy",
    "😌 Relieved",
    "😐 Neutral",
    "😰 Stressed",
    "😤 Frustrated",
  ];

  const data = Object.values(moodCounts);
  const colors = [
    "#F59E0B", // Accomplished - Gold
    "#10B981", // Happy - Green
    "#6366F1", // Relieved - Indigo
    "#6B7280", // Neutral - Gray
    "#F97316", // Stressed - Orange
    "#EF4444", // Frustrated - Red
  ];

  const isMobile = window.innerWidth < 768;

  moodAnalyticsChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: isMobile ? "bottom" : "right",
          labels: {
            color: "var(--ph-new-text-dark)",
            font: {
              size: isMobile ? 10 : 12,
              family: "Poppins",
            },
            padding: isMobile ? 10 : 15,
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        tooltip: {
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          titleColor: "#1f2937",
          bodyColor: "#374151",
          borderColor: "#d1d5db",
          borderWidth: 1,
          titleFont: { family: "Poppins", weight: "600" },
          bodyFont: { family: "Poppins" },
          callbacks: {
            label: function (context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            },
          },
        },
      },
      animation: {
        duration: 700,
        easing: "easeOutQuart",
      },
    },
  });
}

// Initialize all charts
export function initializeCharts(analyzedTaskData) {
  initCompletionTrendsChart();
  initPriorityDistributionChart(analyzedTaskData);
  initBurndownChart();
  initMoodAnalyticsChart(analyzedTaskData);
}

export function initCompletionTrendsChart() {
  const canvas = document.getElementById("completion-trends-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Simulate 7 days of data
  const labels = [];
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    labels.push(date.toLocaleDateString("en-US", { weekday: "short" }));
    data.push(Math.floor(Math.random() * 10) + 5);
  }

  analyticsCharts.completionTrends = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Tasks Completed",
          data: data,
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
    },
  });
}

export function initPriorityDistributionChart(analyzedTaskData) {
  const canvas = document.getElementById("priority-distribution-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let data = [0, 0, 0, 0];
  if (analyzedTaskData) {
    const categories = [
      "Very Important Tasks",
      "High Priority Tasks",
      "Good-Good Priority",
      "Low Priority Tasks",
    ];
    categories.forEach((category, index) => {
      const tasks = analyzedTaskData[category];
      data[index] = tasks ? tasks.length : 0;
    });
  }

  analyticsCharts.priorityDistribution = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Very Important", "High Priority", "Good Priority", "Low Priority"],
      datasets: [
        {
          data: data,
          backgroundColor: [
            "#3B82F6", // Blue
            "#EF4444", // Red
            "#F59E0B", // Yellow
            "#8B5CF6", // Purple
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}

export function initBurndownChart() {
  const canvas = document.getElementById("burndown-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Simulate burndown data
  const labels = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];
  const idealData = [20, 17, 14, 11, 8, 5, 2];
  const actualData = [20, 16, 15, 12, 9, 7, 3];

  analyticsCharts.burndown = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Ideal",
          data: idealData,
          borderColor: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderDash: [5, 5],
        },
        {
          label: "Actual",
          data: actualData,
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Remaining Tasks",
          },
        },
      },
    },
  });
}

export function initMoodAnalyticsChart(analyzedTaskData) {
  const canvas = document.getElementById("mood-analytics-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let moodData = {
    accomplished: 0,
    happy: 0,
    relieved: 0,
    neutral: 0,
    stressed: 0,
    frustrated: 0,
  };

  if (analyzedTaskData) {
    const categories = [
      "Very Important Tasks",
      "High Priority Tasks",
      "Good-Good Priority",
      "Low Priority Tasks",
    ];
    categories.forEach((categoryKey) => {
      const tasks = analyzedTaskData[categoryKey];
      if (tasks && Array.isArray(tasks)) {
        tasks.forEach((task) => {
          if (task.completed && task.mood) {
            moodData[task.mood] = (moodData[task.mood] || 0) + 1;
          }
        });
      }
    });
  }

  analyticsCharts.moodAnalytics = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [
        "🏆 Accomplished",
        "😊 Happy",
        "😌 Relieved",
        "😐 Neutral",
        "😰 Stressed",
        "😤 Frustrated",
      ],
      datasets: [
        {
          label: "Task Completion Mood",
          data: Object.values(moodData),
          backgroundColor: [
            "#F59E0B", // Accomplished
            "#10B981", // Happy
            "#6366F1", // Relieved
            "#6B7280", // Neutral
            "#F97316", // Stressed
            "#EF4444", // Frustrated
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          titleColor: "#1f2937",
          bodyColor: "#374151",
          borderColor: "#d1d5db",
          borderWidth: 1,
          titleFont: { family: "Poppins", weight: "600" },
          bodyFont: { family: "Poppins" },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
        },
      },
    },
  });
}

// Update charts when tasks are modified or loaded
export function updateCharts(analyzedTaskData) {
  if (analyticsCharts.priorityDistribution) {
    initPriorityDistributionChart(analyzedTaskData);
  }
  if (analyticsCharts.moodAnalytics) {
    initMoodAnalyticsChart(analyzedTaskData);
  }
}
