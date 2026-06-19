// --- Main Application Coordinator Module ---
import { auth } from "./config.js";
import {
  onAuthStateChanged,
  updateProfile,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { formatDate, formatDateForDisplay, showLoading } from "./utils.js";
import {
  loadTasksForDate,
  saveTasksToFirestore,
  loadUserDisplayName,
  checkIfUsernameNeeded,
  saveUsernameDirectly,
  getUserSecurityData,
  createInitialUserDocument,
  saveMoodToFirestore,
  getAllPreviousIncompleteTasks,
  updateAllInstancesOfTask,
  loadCurrentStreak,
  calculateAndUpdateStreak,
  createInitialStreakDocument,
  deleteAllUserData,
} from "./db-service.js";
import { callGeminiAPI } from "./ai-service.js";
import {
  renderCompletionByCategoryChart,
  renderMoodAnalyticsChart,
  initializeCharts,
  updateCharts,
} from "./charts-service.js";
import * as ui from "./ui-controller.js";

// --- App State ---
let currentUser = null;
let yourname = "No Name";
let tasksForCurrentSession = [];
let analyzedTaskDataForSelectedDate = null;
let selectedDate = new Date();
let completedTasksTracker = new Set();
let authCheckComplete = false;

// --- Category Icon Mapping (replaces AI emoji) ---
const categoryIconMap = {
  "Very Important Tasks": { icon: "fa-fire",        cls: "task-category-icon--fire"   },
  "High Priority Tasks":  { icon: "fa-rocket",      cls: "task-category-icon--rocket" },
  "Good-Good Priority":   { icon: "fa-leaf",        cls: "task-category-icon--leaf"   },
  "Low Priority Tasks":   { icon: "fa-moon",        cls: "task-category-icon--moon"   },
};

// --- UI Configuration ---
const categoryUiMap = {
  "Very Important Tasks": {
    listEl: document.querySelector("#very-important-column ul"),
    quoteEl: document.getElementById("quote-very-important"),
    columnEl: document.getElementById("very-important-column"),
    color: "var(--accent-blue)",
  },
  "High Priority Tasks": {
    listEl: document.querySelector("#high-priority-column ul"),
    quoteEl: document.getElementById("quote-high-priority"),
    columnEl: document.getElementById("high-priority-column"),
    color: "var(--accent-red)",
  },
  "Good-Good Priority": {
    listEl: document.querySelector("#good-good-priority-column ul"),
    quoteEl: document.getElementById("quote-good-good"),
    columnEl: document.getElementById("good-good-priority-column"),
    color: "var(--accent-yellow)",
  },
  "Low Priority Tasks": {
    listEl: document.querySelector("#low-priority-column ul"),
    quoteEl: document.getElementById("quote-low-priority"),
    columnEl: document.getElementById("low-priority-column"),
    color: "var(--accent-purple)",
  },
};

// --- DOM Elements for Event Binding ---
const prevDayBtn = document.getElementById("prev-day-btn");
const nextDayBtn = document.getElementById("next-day-btn");
const currentDateDisplayEl = document.getElementById("current-date-display");
const currentDateInputEl = document.getElementById("current-date-input");
const calendarIconBtn = document.getElementById("calendar-icon-btn");

const carryForwardContainer = document.getElementById("carry-forward-container");
const addPreviousTasksBtn = document.getElementById("add-previous-tasks-btn");
const fetchAgainBtn = document.getElementById("fetch-again-btn");
const previousTasksCountEl = document.getElementById("previous-tasks-count");
const carryForwardLoading = document.getElementById("carry-forward-loading");
const carryForwardResult = document.getElementById("carry-forward-result");
const carryForwardProgress = document.getElementById("carry-forward-progress");

const tasksCreatedEl = document.getElementById("tasks-created-today");
const tasksCompletedEl = document.getElementById("tasks-completed");
const tasksRemainingEl = document.getElementById("tasks-remaining");

const taskInputFieldModal = document.getElementById("task-input-field-modal");
const addCurrentTaskModalBtn = document.getElementById("add-current-task-modal-btn");
const currentTasksListModalEl = document.getElementById("current-tasks-list-modal");
const analyzeTasksModalBtn = document.getElementById("analyze-tasks-modal-btn");

const taskColumnsContainer = document.getElementById("task-columns-container");
const taskBehaviouralAnalysisSection = document.getElementById("task-behavioural-analysis");
const toggleBehaviourAnalysisBtn = document.getElementById("toggle-behaviour-analysis-btn");
const backToTasksFromBehaviourBtn = document.getElementById("back-to-tasks-from-behaviour-btn");

const behaviouralAnalysisDateDisplayEl = document.getElementById("behavioural-analysis-date-display");
const behaviourCompletionRateEl = document.getElementById("behaviour-completion-rate");
const behaviourCompletionProgressBarEl = document.getElementById("behaviour-completion-progress-bar");
const focusCategoryBehaviourEl = document.getElementById("focus-category-behaviour");

const nameSection = document.getElementById("username-section");
const nameDisplayElement = document.getElementById("username-display");
const nameDropdown = document.getElementById("username-dropdown");
const logoutBtn = document.getElementById("logout-btn");

// --- Completed Tasks Tracker Functions ---
function loadCompletedTasksTracker() {
  if (!currentUser) return;
  try {
    const saved = localStorage.getItem(`completedTasks_${currentUser.uid}`);
    if (saved) {
      completedTasksTracker = new Set(JSON.parse(saved));
    } else {
      completedTasksTracker = new Set();
    }
  } catch (error) {
    console.error("Error loading completed tasks tracker:", error);
    completedTasksTracker = new Set();
  }
}

function saveCompletedTasksTracker() {
  if (!currentUser) return;
  try {
    localStorage.setItem(
      `completedTasks_${currentUser.uid}`,
      JSON.stringify([...completedTasksTracker])
    );
  } catch (error) {
    console.error("Error saving completed tasks tracker:", error);
  }
}

function cleanupCompletedTasksTracker() {
  if (!currentUser) return;
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 60); // 60 days cutoff
    const cutoffDateStr = formatDate(cutoffDate);

    const originalSize = completedTasksTracker.size;
    const cleanedTracker = new Set();

    completedTasksTracker.forEach((taskId) => {
      const parts = taskId.split("_");
      const dateStr = parts[parts.length - 1];

      if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/) || dateStr >= cutoffDateStr) {
        cleanedTracker.add(taskId);
      }
    });

    completedTasksTracker = cleanedTracker;
    if (originalSize !== completedTasksTracker.size) {
      saveCompletedTasksTracker();
    }
  } catch (error) {
    console.error("Error cleaning up completed tasks tracker:", error);
  }
}

// Bind debug functions to console
window.clearCompletedTasksTracker = function () {
  if (!currentUser) {
    console.log("❌ No authenticated user");
    return;
  }
  const originalSize = completedTasksTracker.size;
  completedTasksTracker.clear();
  saveCompletedTasksTracker();
  console.log(`🧹 Cleared completed tasks tracker (had ${originalSize} entries)`);
};

window.showCompletedTasksTracker = function () {
  if (!currentUser) {
    console.log("❌ No authenticated user");
    return;
  }
  console.log(`📋 Completed tasks tracker (${completedTasksTracker.size} entries):`);
  [...completedTasksTracker].forEach((taskId) => {
    console.log(`  - ${taskId}`);
  });
};

// --- Date Toggles & loading ---
async function updateDateDisplayAndLoadTasks() {
  if (currentDateDisplayEl) currentDateDisplayEl.textContent = formatDateForDisplay(selectedDate);
  if (behaviouralAnalysisDateDisplayEl)
    behaviouralAnalysisDateDisplayEl.textContent = formatDateForDisplay(selectedDate);

  // Load from DB
  const data = await loadTasksForDate(selectedDate, currentUser);
  analyzedTaskDataForSelectedDate = data;
  renderAnalyzedTasksUI();
  ui.renderCustomCalendar(selectedDate, (newDate) => {
    selectedDate = newDate;
    updateDateDisplayAndLoadTasks();
  });

  // Load carry forward tasks
  await checkAndShowCarryForward();

  if (taskBehaviouralAnalysisSection && !taskBehaviouralAnalysisSection.classList.contains("hidden")) {
    loadAndDisplayBehaviouralAnalysis();
  }
}

// --- Carry Forward Controllers ---
async function checkAndShowCarryForward() {
  if (!currentUser) return;
  try {
    showCarryForwardLoading(true);

    const startTime = Date.now();
    const minLoadingTime = 800;

    // Fetch previous incomplete tasks
    const allIncompleteTasks = await getAllPreviousIncompleteTasks(selectedDate, currentUser, false);
    
    // Filter
    const tasksNotYetCarriedForward = await filterAlreadyCarriedForwardTasks(allIncompleteTasks);

    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

    setTimeout(() => {
      showCarryForwardLoading(false);
      if (tasksNotYetCarriedForward.length > 0) {
        if (previousTasksCountEl) previousTasksCountEl.textContent = tasksNotYetCarriedForward.length;
        if (carryForwardContainer) carryForwardContainer.style.display = "block";
      } else {
        if (carryForwardContainer) carryForwardContainer.style.display = "none";
      }
    }, remainingTime);
  } catch (error) {
    console.error("Error checking carry forward:", error);
    showCarryForwardLoading(false);
    if (carryForwardContainer) carryForwardContainer.style.display = "none";
  }
}

function showCarryForwardLoading(show) {
  if (!carryForwardLoading || !carryForwardResult || !carryForwardContainer) return;

  if (show) {
    carryForwardLoading.style.display = "flex";
    carryForwardResult.style.display = "none";
    carryForwardContainer.style.display = "block";

    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90;
      if (carryForwardProgress) carryForwardProgress.style.width = `${progress}%`;
    }, 200);

    carryForwardContainer.dataset.progressInterval = progressInterval;
  } else {
    if (carryForwardProgress) carryForwardProgress.style.width = "100%";
    const progressInterval = carryForwardContainer.dataset.progressInterval;
    if (progressInterval) {
      clearInterval(progressInterval);
      delete carryForwardContainer.dataset.progressInterval;
    }
    setTimeout(() => {
      carryForwardLoading.style.display = "none";
      carryForwardResult.style.display = "block";
      if (carryForwardProgress) carryForwardProgress.style.width = "0%";
    }, 300);
  }
}

async function filterAlreadyCarriedForwardTasks(incompleteTasks) {
  if (!analyzedTaskDataForSelectedDate || incompleteTasks.length === 0) {
    return incompleteTasks;
  }

  const currentTasks = [];
  Object.keys(analyzedTaskDataForSelectedDate).forEach((category) => {
    if (Array.isArray(analyzedTaskDataForSelectedDate[category])) {
      analyzedTaskDataForSelectedDate[category].forEach((task) => {
        currentTasks.push({
          task: task.task,
          originalDate: task.originalDate,
          originalCategory: task.originalCategory || category,
        });
      });
    }
  });

  return incompleteTasks.filter((incompleteTask) => {
    return !currentTasks.some(
      (currentTask) =>
        currentTask.task === incompleteTask.task &&
        currentTask.originalDate === incompleteTask.originalDate &&
        currentTask.originalCategory === incompleteTask.originalCategory
    );
  });
}

async function addPreviousIncompleteTasks() {
  if (!currentUser) return;
  try {
    showLoading(true);

    const allIncompleteTasks = await getAllPreviousIncompleteTasks(selectedDate, currentUser, false);
    const tasksToCarryForward = await filterAlreadyCarriedForwardTasks(allIncompleteTasks);

    if (tasksToCarryForward.length > 0) {
      tasksToCarryForward.forEach((task) => {
        task.carryForwardCount = (task.carryForwardCount || 0) + 1;
        task.isCarriedForward = true;
      });

      const mergedData = mergeCarryForwardTasks(
        analyzedTaskDataForSelectedDate,
        tasksToCarryForward
      );

      analyzedTaskDataForSelectedDate = mergedData;
      await saveTasksToFirestore(selectedDate, mergedData, currentUser);

      setTimeout(() => {
        Object.values(categoryUiMap).forEach((ui) => {
          ui.listEl.innerHTML = "";
          ui.quoteEl.textContent = "";
        });

        renderAnalyzedTasksUI();
        updateOverallProgressBar();
        updateDashboardUI();
        checkAndShowCarryForward();
      }, 50);
    } else {
      if (carryForwardContainer) carryForwardContainer.style.display = "none";
    }
  } catch (error) {
    console.error("Error adding carry forward tasks:", error);
  } finally {
    showLoading(false);
  }
}

function mergeCarryForwardTasks(currentData, carryForwardTasks) {
  const mergedData = currentData ? JSON.parse(JSON.stringify(currentData)) : {};

  if (!mergedData.quotes) {
    mergedData.quotes = {
      "Very Important Tasks": "Focus on what matters most! 🎯",
      "High Priority Tasks": "High energy for high priority! ⚡",
      "Good-Good Priority": "Steady progress on good tasks! 📈",
      "Low Priority Tasks": "Every small step counts! 🌱",
    };
  }

  carryForwardTasks.forEach((task) => {
    const category = task.originalCategory;
    if (!mergedData[category]) {
      mergedData[category] = [];
    }
    mergedData[category].push(task);
  });

  return mergedData;
}

// Ordinal suffix helper
function getOrdinal(num) {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = num % 100;
  return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

// --- Task Processing & Rendering ---
let taskSaveTimeout = null;
function debouncedSaveAndStreak() {
  if (taskSaveTimeout) clearTimeout(taskSaveTimeout);
  taskSaveTimeout = setTimeout(async () => {
    try {
      await saveTasksToFirestore(selectedDate, analyzedTaskDataForSelectedDate, currentUser);
      const streak = await calculateAndUpdateStreak(selectedDate, analyzedTaskDataForSelectedDate, currentUser);
      updateStreakDisplay(streak);
      
      if (taskBehaviouralAnalysisSection && !taskBehaviouralAnalysisSection.classList.contains("hidden")) {
        loadAndDisplayBehaviouralAnalysis();
      }
    } catch (err) {
      console.error("Error in debounced save:", err);
    }
  }, 800);
}
function renderAnalyzedTasksUI() {
  Object.values(categoryUiMap).forEach((ui) => {
    ui.listEl.innerHTML = "";
    ui.quoteEl.textContent = "";
  });

  if (!analyzedTaskDataForSelectedDate || !analyzedTaskDataForSelectedDate.quotes) {
    updateDashboardUI();
    const defaultQuote = "Ready for your tasks! Let's make today amazing! ✨";
    Object.values(categoryUiMap).forEach((ui) => (ui.quoteEl.textContent = defaultQuote));
    return;
  }

  Object.keys(categoryUiMap).forEach((categoryKeyFromMap) => {
    const colUi = categoryUiMap[categoryKeyFromMap];
    const tasksInCategory = analyzedTaskDataForSelectedDate[categoryKeyFromMap];
    const quote = analyzedTaskDataForSelectedDate.quotes[categoryKeyFromMap];

    if (tasksInCategory && Array.isArray(tasksInCategory) && tasksInCategory.length > 0) {
      tasksInCategory.forEach((taskItem) => {
        const li = document.createElement("li");
        if (taskItem.completed) li.classList.add("completed");
        if (taskItem.isCarriedForward) li.classList.add("carried-forward");

        const mainContentDiv = document.createElement("div");
        mainContentDiv.classList.add("task-main-content");
        const textAndEmojiDiv = document.createElement("div");
        textAndEmojiDiv.classList.add("task-text-and-emoji");
        const taskTextSpan = document.createElement("span");
        taskTextSpan.classList.add("task-text");
        taskTextSpan.textContent = taskItem.task;

        // Category icon (replaces AI emoji)
        const catIconMeta = categoryIconMap[categoryKeyFromMap] || { icon: "fa-circle-dot", cls: "task-category-icon--leaf" };
        const catIconDiv = document.createElement("div");
        catIconDiv.className = `task-category-icon ${catIconMeta.cls}`;
        const catIconEl = document.createElement("i");
        catIconEl.className = `fas ${catIconMeta.icon}`;
        catIconDiv.appendChild(catIconEl);
        textAndEmojiDiv.appendChild(catIconDiv);

        textAndEmojiDiv.insertBefore(taskTextSpan, textAndEmojiDiv.firstChild);
        mainContentDiv.appendChild(textAndEmojiDiv);


        const taskActions = document.createElement("div");
        taskActions.classList.add("task-actions");

        const tickIcon = document.createElement("i");
        tickIcon.className = `fas ${taskItem.completed ? "fa-check-circle" : "fa-circle"} task-complete-icon`;
        tickIcon.addEventListener("click", async (e) => {
          e.stopPropagation();

          taskItem.completed = !taskItem.completed;
          li.classList.toggle("completed", taskItem.completed);
          tickIcon.classList.toggle("fa-check-circle", taskItem.completed);
          tickIcon.classList.toggle("fa-circle", !taskItem.completed);

          updateOverallProgressBar();
          updateDashboardUI();

          if (taskItem.completed) {
            // Show mood selection modal
            ui.showMoodSelection(taskItem, categoryKeyFromMap, async (mood, emoji) => {
              showLoading(true);
              try {
                taskItem.mood = mood;
                taskItem.moodEmoji = emoji;
                taskItem.moodTimestamp = new Date().toISOString();

                // Add indicator in UI
                addMoodIndicatorToTask(taskItem, emoji);

                // Save mood instantly, task save is handled by debounce
                await saveMoodToFirestore(selectedDate, mood, emoji, taskItem.task, currentUser);
                debouncedSaveAndStreak();

                ui.closeMoodSelection();
              } catch (err) {
                console.error("Error setting task mood:", err);
              } finally {
                showLoading(false);
              }
            });

            if (taskItem.isCarriedForward && taskItem.originalDate) {
              await updateAllInstancesOfTask(
                `${taskItem.task}_${taskItem.originalCategory}`.replace(/\s+/g, "_").toLowerCase(),
                taskItem.task,
                taskItem.originalCategory,
                formatDate(selectedDate),
                true,
                selectedDate,
                currentUser,
                taskItem.originalDate
              );
            }
          } else {
            // Uncompleted task
            delete taskItem.mood;
            delete taskItem.moodEmoji;
            delete taskItem.completedOnDate;
            delete taskItem.completionNote;
            const moodIndicator = li.querySelector(".task-mood-indicator");
            if (moodIndicator) moodIndicator.remove();

            if (taskItem.isCarriedForward && taskItem.originalDate) {
              await updateAllInstancesOfTask(
                `${taskItem.task}_${taskItem.originalCategory}`.replace(/\s+/g, "_").toLowerCase(),
                taskItem.task,
                taskItem.originalCategory,
                null,
                false,
                selectedDate,
                currentUser
              );
            }
          }

          debouncedSaveAndStreak();
        });

        const abortIcon = document.createElement("i");
        abortIcon.className = "fas fa-times task-abort-icon";
        abortIcon.title = "Abort this task";
        abortIcon.addEventListener("click", async (e) => {
          e.stopPropagation();

          try {
            const categoryKey = categoryKeyFromMap;
            const tasksInCategory = analyzedTaskDataForSelectedDate[categoryKey];

            if (tasksInCategory && Array.isArray(tasksInCategory)) {
              const taskIndex = tasksInCategory.findIndex(
                (t) => t.task === taskItem.task && t.emoji === taskItem.emoji
              );
              if (taskIndex !== -1) {
                tasksInCategory.splice(taskIndex, 1);
              }
            }

            li.remove();
            updateOverallProgressBar();
            updateDashboardUI();

            await saveTasksToFirestore(selectedDate, analyzedTaskDataForSelectedDate, currentUser);

            if (taskItem.isCarriedForward && taskItem.originalDate) {
              await updateAllInstancesOfTask(
                `${taskItem.task}_${taskItem.originalCategory}`.replace(/\s+/g, "_").toLowerCase(),
                taskItem.task,
                taskItem.originalCategory,
                `${formatDate(selectedDate)} (aborted)`,
                true,
                selectedDate,
                currentUser
              );
            }
          } catch (error) {
            console.error("Error aborting task:", error);
          }
        });

        taskActions.appendChild(tickIcon);
        taskActions.appendChild(abortIcon);
        mainContentDiv.appendChild(taskActions);
        li.appendChild(mainContentDiv);

        if (taskItem.reason) {
          const reasonDiv = document.createElement("div");
          reasonDiv.className = "task-reason";
          reasonDiv.textContent = taskItem.reason;
          li.appendChild(reasonDiv);
        }

        if (taskItem.isCarriedForward && taskItem.carryForwardCount) {
          const carryCountDiv = document.createElement("div");
          carryCountDiv.className = "carry-forward-count";
          const totalTimes = taskItem.carryForwardCount + 1;
          const ordinal = getOrdinal(totalTimes);
          carryCountDiv.textContent = `↻ ${ordinal} time running this task`;
          li.appendChild(carryCountDiv);
        }

        if (taskItem.completed && taskItem.completionNote) {
          const completionDiv = document.createElement("div");
          completionDiv.className = "task-completion-note";
          completionDiv.textContent = `✅ ${taskItem.completionNote}`;
          li.appendChild(completionDiv);
        }

        const metaDiv = document.createElement("div");
        metaDiv.className = "task-meta";
        const creationDateSpan = document.createElement("span");
        creationDateSpan.className = "task-creation-date";
        creationDateSpan.textContent = formatDateForDisplay(selectedDate);

        const priorityIndicatorsDiv = document.createElement("div");
        priorityIndicatorsDiv.className = "task-priority-indicators";
        if (taskItem.priority_score) {
          const scoreSpan = document.createElement("span");
          scoreSpan.className = "priority-score";
          scoreSpan.textContent = `P${taskItem.priority_score}`;
          scoreSpan.title = `Priority Score: ${taskItem.priority_score}/10`;
          priorityIndicatorsDiv.appendChild(scoreSpan);
        }
        if (taskItem.confidence) {
          const confidenceSpan = document.createElement("span");
          confidenceSpan.className = "confidence-score";
          confidenceSpan.textContent = `C${taskItem.confidence}`;
          confidenceSpan.title = `AI Confidence: ${taskItem.confidence}/10`;
          priorityIndicatorsDiv.appendChild(confidenceSpan);
        }

        const assigneePlaceholder = document.createElement("div");
        assigneePlaceholder.className = "task-assignee-placeholder";
        assigneePlaceholder.textContent = yourname.substring(0, 1).toUpperCase();

        metaDiv.appendChild(creationDateSpan);
        if (priorityIndicatorsDiv.children.length > 0) metaDiv.appendChild(priorityIndicatorsDiv);
        metaDiv.appendChild(assigneePlaceholder);
        li.appendChild(metaDiv);
        colUi.listEl.appendChild(li);
      });
    }
    colUi.quoteEl.textContent = quote || "Keep crushing those goals! You're doing great!";
  });

  updateDashboardUI();
  updateOverallProgressBar();
  initializeTaskTiltEffects();
}

function addMoodIndicatorToTask(taskItem, emoji) {
  const taskElements = document.querySelectorAll(".task-text");
  taskElements.forEach((element) => {
    if (element.textContent.trim() === taskItem.task) {
      const existingMood = element.parentElement.querySelector(".task-mood-indicator");
      if (existingMood) existingMood.remove();

      const moodIndicator = document.createElement("span");
      moodIndicator.className = "task-mood-indicator";
      moodIndicator.textContent = emoji;
      element.parentElement.appendChild(moodIndicator);
    }
  });
}

function initializeTaskTiltEffects() {
  try {
    if (typeof $ === "undefined" || typeof $.fn.tilt !== "function") return;
    setTimeout(() => {
      const taskTiltElements = $(".task-column li[data-tilt]");
      if (taskTiltElements.length > 0) {
        taskTiltElements.each(function () {
          if ($(this).data("tilt")) $(this).tilt("destroy");
        });

        taskTiltElements.tilt({
          maxTilt: 2.5,
          perspective: 800,
          speed: 350,
          glare: true,
          maxGlare: 0.03,
          reset: true,
          "reset-to-start": false,
        });
      }
    }, 50);
  } catch (error) {
    console.error("Error initializing task tilt effects:", error);
  }
}

// --- Dashboard & Analytics Sync ---
function updateDashboardUI() {
  if (!analyzedTaskDataForSelectedDate) {
    if (tasksCreatedEl) tasksCreatedEl.textContent = "0";
    if (tasksCompletedEl) tasksCompletedEl.textContent = "0";
    if (tasksRemainingEl) tasksRemainingEl.textContent = "0";
    if (behaviourCompletionRateEl) behaviourCompletionRateEl.textContent = "0%";
    if (behaviourCompletionProgressBarEl) behaviourCompletionProgressBarEl.style.width = "0%";
    return;
  }

  let totalCreated = 0;
  let totalCompleted = 0;

  Object.keys(categoryUiMap).forEach((categoryKey) => {
    const tasksInCategory = analyzedTaskDataForSelectedDate[categoryKey];
    if (tasksInCategory && Array.isArray(tasksInCategory)) {
      tasksInCategory.forEach((task) => {
        if (task && typeof task === "object" && "task" in task) {
          totalCreated++;
          if (task.completed) totalCompleted++;
        }
      });
    }
  });

  if (tasksCreatedEl) tasksCreatedEl.textContent = totalCreated;
  if (tasksCompletedEl) tasksCompletedEl.textContent = totalCompleted;
  if (tasksRemainingEl) tasksRemainingEl.textContent = totalCreated - totalCompleted;

  const completionPercentage = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;
  if (behaviourCompletionRateEl) behaviourCompletionRateEl.textContent = `${completionPercentage}%`;
  if (behaviourCompletionProgressBarEl) behaviourCompletionProgressBarEl.style.width = `${completionPercentage}%`;

  if (currentUser && analyzedTaskDataForSelectedDate) {
    calculateAndUpdateStreak(selectedDate, analyzedTaskDataForSelectedDate, currentUser).then((streak) => {
      updateStreakDisplay(streak);
    });
  }
}

function updateOverallProgressBar() {
  const overallProgressFill = document.getElementById("overall-progress-fill");
  const overallProgressText = document.getElementById("overall-progress-text");

  if (!overallProgressFill || !overallProgressText) return;

  let totalTasks = 0;
  let completedTasks = 0;

  if (analyzedTaskDataForSelectedDate) {
    Object.keys(categoryUiMap).forEach((categoryKey) => {
      const tasksInCategory = analyzedTaskDataForSelectedDate[categoryKey];
      if (Array.isArray(tasksInCategory)) {
        totalTasks += tasksInCategory.length;
        completedTasks += tasksInCategory.filter((task) => task.completed).length;
      }
    });
  }

  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  overallProgressFill.style.width = `${percentage}%`;
  overallProgressText.textContent = `${completedTasks}/${totalTasks} tasks completed (${percentage}%)`;

  const progressContainer = document.getElementById("overall-progress-container");
  if (progressContainer) {
    progressContainer.classList.remove("milestone-25", "milestone-50", "milestone-75", "milestone-100");
    if (percentage >= 100) progressContainer.classList.add("milestone-100");
    else if (percentage >= 75) progressContainer.classList.add("milestone-75");
    else if (percentage >= 50) progressContainer.classList.add("milestone-50");
    else if (percentage >= 25) progressContainer.classList.add("milestone-25");
  }
}

// --- Task Behavioural Analysis Rendering ---
function loadAndDisplayBehaviouralAnalysis() {
  showLoading(true);
  if (!analyzedTaskDataForSelectedDate) {
    if (behaviourCompletionRateEl) behaviourCompletionRateEl.textContent = "0%";
    if (behaviourCompletionProgressBarEl) behaviourCompletionProgressBarEl.style.width = "0%";
    if (focusCategoryBehaviourEl) focusCategoryBehaviourEl.textContent = "-";

    const avgPriorityEl = document.getElementById("avg-priority-score-behaviour");
    const avgConfidenceEl = document.getElementById("avg-confidence-behaviour");
    if (avgPriorityEl) avgPriorityEl.textContent = "-";
    if (avgConfidenceEl) avgConfidenceEl.textContent = "-";

    renderCompletionByCategoryChart({});
    showLoading(false);
    return;
  }

  let totalCreated = 0;
  let totalCompleted = 0;
  let totalPriorityScore = 0;
  let totalConfidence = 0;
  let tasksWithScores = 0;
  const categoryCounts = {};
  const categoryCompletedCounts = {};

  Object.keys(categoryUiMap).forEach((categoryKey) => {
    categoryCounts[categoryKey] = 0;
    categoryCompletedCounts[categoryKey] = 0;
    const tasksInCategory = analyzedTaskDataForSelectedDate[categoryKey];

    if (tasksInCategory && Array.isArray(tasksInCategory)) {
      tasksInCategory.forEach((task) => {
        if (task && typeof task === "object" && "task" in task) {
          totalCreated++;
          categoryCounts[categoryKey]++;
          if (task.completed) {
            totalCompleted++;
            categoryCompletedCounts[categoryKey]++;
          }

          if (task.priority_score && typeof task.priority_score === "number") {
            totalPriorityScore += task.priority_score;
            tasksWithScores++;
          }
          if (task.confidence && typeof task.confidence === "number") {
            totalConfidence += task.confidence;
          }
        }
      });
    }
  });

  const completionPercentage = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;
  if (behaviourCompletionRateEl) behaviourCompletionRateEl.textContent = `${completionPercentage}%`;
  if (behaviourCompletionProgressBarEl) behaviourCompletionProgressBarEl.style.width = `${completionPercentage}%`;

  const avgPriorityEl = document.getElementById("avg-priority-score-behaviour");
  const avgConfidenceEl = document.getElementById("avg-confidence-behaviour");
  if (avgPriorityEl) {
    const avgPriority = tasksWithScores > 0 ? (totalPriorityScore / tasksWithScores).toFixed(1) : "-";
    avgPriorityEl.textContent = avgPriority !== "-" ? `${avgPriority}/10` : "-";
  }
  if (avgConfidenceEl) {
    const avgConfidence = totalCreated > 0 ? (totalConfidence / totalCreated).toFixed(1) : "-";
    avgConfidenceEl.textContent = avgConfidence !== "-" ? `${avgConfidence}/10` : "-";
  }

  let maxTasks = -1;
  let focusCat = "-";
  for (const cat in categoryCounts) {
    if (categoryCounts[cat] > maxTasks) {
      maxTasks = categoryCounts[cat];
      focusCat = cat.replace(" Tasks", "");
    }
  }
  if (focusCategoryBehaviourEl) focusCategoryBehaviourEl.textContent = focusCat;

  const chartData = {
    labels: Object.keys(categoryCounts),
    datasets: [
      {
        label: "Tasks Created",
        data: Object.values(categoryCounts),
        backgroundColor: [
          "rgba(123, 160, 201, 0.6)",
          "rgba(212, 132, 132, 0.6)",
          "rgba(230, 197, 127, 0.6)",
          "rgba(169, 138, 190, 0.6)",
        ],
        borderColor: ["#7BA0C9", "#D48484", "#E6C57F", "#A98ABE"],
        borderWidth: 1,
      },
      {
        label: "Tasks Completed",
        data: Object.values(categoryCompletedCounts),
        backgroundColor: [
          "rgba(91, 130, 171, 0.6)",
          "rgba(195, 102, 102, 0.6)",
          "rgba(215, 175, 97, 0.6)",
          "rgba(145, 110, 165, 0.6)",
        ],
        borderColor: ["#5B82AB", "#C36666", "#D7AF61", "#916EA5"],
        borderWidth: 1,
      },
    ],
  };

  renderCompletionByCategoryChart(chartData);
  renderMoodAnalyticsChart(selectedDate, currentUser);
  showLoading(false);
}

// --- Name setup / displays ---
function updateNameDisplay() {
  if (nameDisplayElement) {
    nameDisplayElement.textContent = yourname;
  }
}

function updateStreakDisplay(streakCount) {
  const streakCountElement = document.getElementById("streak-count");
  if (streakCountElement) {
    streakCountElement.textContent = streakCount || 0;
  }
}

// Modal functions wrapper callback
function renderTasksForCurrentSession() {
  if (!currentTasksListModalEl) return;
  currentTasksListModalEl.innerHTML = "";
  tasksForCurrentSession.forEach((taskText, index) => {
    const li = document.createElement("div");

    const numSpan = document.createElement("span");
    numSpan.className = "tim-task-num";
    numSpan.textContent = index + 1;

    const textSpan = document.createElement("span");
    textSpan.className = "tim-task-text";
    textSpan.textContent = taskText;

    const removeBtn = document.createElement("i");
    removeBtn.className = "fas fa-times";
    removeBtn.title = "Remove task";
    removeBtn.onclick = () => {
      tasksForCurrentSession.splice(index, 1);
      renderTasksForCurrentSession();
    };

    li.appendChild(numSpan);
    li.appendChild(textSpan);
    li.appendChild(removeBtn);
    currentTasksListModalEl.appendChild(li);
  });
  if (analyzeTasksModalBtn) analyzeTasksModalBtn.disabled = tasksForCurrentSession.length === 0;
}

// --- App Initialization & Event Bindings ---
function initializePriorityTaskApp() {
  console.log("Initializing PriorityTask AI (Plantitas UI Edition - Modular)...");

  // Basic styling setups
  if (ui.taskInputModalEl && ui.taskModalContentEl) {
    ui.taskInputModalEl.classList.add("hidden");
    ui.taskInputModalEl.classList.remove("visible");
    gsap.set(ui.taskModalContentEl, { y: 25, scale: 0.96, opacity: 0 });
  }

  if (ui.infoModalEl && ui.infoModalContentEl) {
    ui.infoModalEl.classList.add("hidden");
    ui.infoModalEl.classList.remove("visible");
    gsap.set(ui.infoModalContentEl, { y: 25, scale: 0.96, opacity: 0 });
  }

  // Init settings modal hidden
  const settingsModalEl = document.getElementById("settings-modal");
  if (settingsModalEl) {
    settingsModalEl.classList.add("hidden");
    settingsModalEl.classList.remove("visible");
    const settingsContent = settingsModalEl.querySelector(".modal-content");
    if (settingsContent) gsap.set(settingsContent, { y: 25, scale: 0.96, opacity: 0 });
  }

  ui.setupCustomCalendar(selectedDate, (newDate) => {
    selectedDate = newDate;
    updateDateDisplayAndLoadTasks();
  });
  updateDateDisplayAndLoadTasks();
  ui.initAnimations();
  ui.addTouchSupport();

  // Initialize Name Dropdown
  if (nameDisplayElement && nameDropdown && logoutBtn) {
    nameDisplayElement.addEventListener("click", (e) => {
      e.stopPropagation();
      nameDropdown.classList.toggle("show");
    });

    logoutBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await signOut(auth);
        console.log("User signed out successfully");
      } catch (err) {
        console.error("Error signing out:", err);
      }
    });

    document.addEventListener("click", (e) => {
      if (nameSection && !nameSection.contains(e.target)) {
        nameDropdown.classList.remove("show");
      }
    });
  }

  // ── Settings Modal ──
  const settingsBtn = document.getElementById("settings-btn");
  const settingsModal = document.getElementById("settings-modal");
  const settingsCloseBtn = document.getElementById("settings-close-btn");
  const settingsLogoutBtn = document.getElementById("settings-logout-btn");
  const deleteAllProgressBtn = document.getElementById("delete-all-progress-btn");
  const settingsUsernameDisplay = document.getElementById("settings-username-display");

  function openSettingsModal() {
    if (!settingsModal) return;
    if (settingsUsernameDisplay) settingsUsernameDisplay.textContent = yourname || currentUser?.email || "—";
    settingsModal.classList.remove("hidden");
    settingsModal.classList.add("visible");
    gsap.fromTo(settingsModal.querySelector(".modal-content"),
      { y: 25, scale: 0.96, opacity: 0 },
      { duration: 0.3, y: 0, scale: 1, opacity: 1, ease: "back.out(1.5)" }
    );
    if (nameDropdown) nameDropdown.classList.remove("show");
  }

  function closeSettingsModal() {
    if (!settingsModal) return;
    gsap.to(settingsModal.querySelector(".modal-content"), {
      duration: 0.22, y: 20, scale: 0.96, opacity: 0, ease: "power2.in",
      onComplete: () => {
        settingsModal.classList.remove("visible");
        settingsModal.classList.add("hidden");
      }
    });
  }

  if (settingsBtn) settingsBtn.addEventListener("click", (e) => { e.stopPropagation(); openSettingsModal(); });
  if (settingsCloseBtn) settingsCloseBtn.addEventListener("click", closeSettingsModal);
  settingsModal?.addEventListener("click", (e) => { if (e.target === settingsModal) closeSettingsModal(); });

  if (settingsLogoutBtn) {
    settingsLogoutBtn.addEventListener("click", async () => {
      try { await signOut(auth); } catch (err) { console.error("Logout error:", err); }
    });
  }

  // ── Custom Danger Confirm Popup ──
  const dangerOverlay    = document.getElementById("danger-confirm-overlay");
  const dangerPopupCard  = document.getElementById("danger-popup-card");
  const dangerInput      = document.getElementById("danger-confirm-input");
  const dangerError      = document.getElementById("danger-confirm-error");
  const dangerCancelBtn  = document.getElementById("danger-cancel-btn");
  const dangerConfirmBtn = document.getElementById("danger-confirm-btn");

  let currentSecurityAnswer = "delete";

  async function openDangerPopup() {
    if (!dangerOverlay) return;
    
    closeSettingsModal();
    
    // Fetch custom security question
    const dynQ = document.getElementById("dynamic-security-question");
    dangerConfirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    dangerOverlay.classList.remove("hidden");
    
    try {
      const securityData = await getUserSecurityData(currentUser);
      if (securityData && securityData.securityQuestion && securityData.securityAnswer) {
        if (dynQ) dynQ.innerHTML = securityData.securityQuestion;
        currentSecurityAnswer = securityData.securityAnswer.toLowerCase();
      } else {
        if (dynQ) dynQ.innerHTML = "Type <strong>DELETE</strong> to confirm";
        currentSecurityAnswer = "delete";
      }
    } catch (e) {
      if (dynQ) dynQ.innerHTML = "Type <strong>DELETE</strong> to confirm";
      currentSecurityAnswer = "delete";
    }
    
    dangerInput.value = "";
    dangerInput.classList.remove("input-error", "input-success");
    dangerError.classList.add("hidden");
    dangerConfirmBtn.disabled = true;
    dangerConfirmBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete Everything';
    setTimeout(() => dangerInput.focus(), 150);
  }

  function closeDangerPopup() {
    if (!dangerOverlay) return;
    dangerOverlay.classList.add("hidden");
  }

  // Live input validation — enable confirm only when answer is correct
  dangerInput?.addEventListener("input", () => {
    const val = dangerInput.value.trim().toLowerCase();
    if (val === currentSecurityAnswer) {
      dangerInput.classList.add("input-success");
      dangerInput.classList.remove("input-error");
      dangerError.classList.add("hidden");
      dangerConfirmBtn.disabled = false;
    } else {
      dangerInput.classList.remove("input-success");
      dangerConfirmBtn.disabled = true;
    }
  });

  dangerInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !dangerConfirmBtn.disabled) dangerConfirmBtn.click();
  });

  dangerCancelBtn?.addEventListener("click", closeDangerPopup);
  dangerOverlay?.addEventListener("click", (e) => {
    if (e.target === dangerOverlay) closeDangerPopup();
  });

  dangerConfirmBtn?.addEventListener("click", async () => {
    const val = dangerInput.value.trim().toLowerCase();
    if (val !== currentSecurityAnswer) {
      // Shake on wrong answer
      dangerInput.classList.add("input-error");
      dangerError.classList.remove("hidden");
      dangerPopupCard.classList.remove("shake");
      void dangerPopupCard.offsetWidth; // force reflow
      dangerPopupCard.classList.add("shake");
      dangerInput.focus();
      return;
    }

    // Correct — delete all data
    dangerConfirmBtn.disabled = true;
    dangerConfirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    try {
      await deleteAllUserData(currentUser);
      closeDangerPopup();
      // Brief success flash before reload
      dangerConfirmBtn.innerHTML = '<i class="fas fa-check"></i> Done!';
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      console.error("Delete error:", err);
      dangerConfirmBtn.disabled = false;
      dangerConfirmBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete Everything';
      dangerError.textContent = "❌ Failed to delete. Try again.";
      dangerError.classList.remove("hidden");
    }
  });

  if (deleteAllProgressBtn) {
    deleteAllProgressBtn.addEventListener("click", openDangerPopup);
  }

  // Mobile Menu Toggle
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const headerNav = document.querySelector(".header-nav");
  if (mobileMenuToggle && headerNav) {
    mobileMenuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      headerNav.classList.toggle("active");
    });
    document.addEventListener("click", (e) => {
      if (!headerNav.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
        headerNav.classList.remove("active");
      }
    });
  }

  // Carry Forward listeners
  if (addPreviousTasksBtn) {
    addPreviousTasksBtn.addEventListener("click", addPreviousIncompleteTasks);
  }
  if (fetchAgainBtn) {
    fetchAgainBtn.addEventListener("click", async () => {
      await checkAndShowCarryForward();
    });
  }

  console.log("PriorityTask AI Initialized successfully!");
}

function checkAuthState() {
  const authLoadingScreen = document.getElementById("auth-loading");
  console.log("Starting authentication check...");

  const authTimeout = setTimeout(() => {
    console.log("Authentication check timeout, redirecting to landing page");
    authCheckComplete = true;
    window.location.replace("landingpage.html");
  }, 8000);

  onAuthStateChanged(
    auth,
    async (user) => {
      clearTimeout(authTimeout);
      authCheckComplete = true;

      if (user) {
        currentUser = user;
        console.log("User authenticated successfully:", user.email);

        loadCompletedTasksTracker();
        cleanupCompletedTasksTracker();

        // Create initial DB records if missing
        await createInitialUserDocument(currentUser);
        await createInitialStreakDocument(currentUser);

        setTimeout(async () => {
          if (authLoadingScreen) authLoadingScreen.style.display = "none";

          const mainLayout = document.querySelector(".main-app-layout");
          if (mainLayout) {
            mainLayout.style.display = "flex";
            console.log("Main app layout displayed");
          }

          try {
            initializePriorityTaskApp();

            // Load username
            const dbDisplayName = await loadUserDisplayName(currentUser);
            if (dbDisplayName) {
              yourname = dbDisplayName;
              if (currentUser.displayName !== dbDisplayName) {
                await updateProfile(currentUser, { displayName: dbDisplayName });
              }
            } else {
              yourname = "User";
            }
            updateNameDisplay();

            // Load streak
            const streak = await loadCurrentStreak(currentUser);
            updateStreakDisplay(streak);

            // Setup username prompt if needed
            const usernameSetupNeeded = await checkIfUsernameNeeded(currentUser);
            if (usernameSetupNeeded) {
              setTimeout(() => {
                ui.showUsernameSetupPrompt(async ({ username, securityQuestion, securityAnswer }) => {
                  try {
                    const confirmBtn = document.getElementById("confirm-username-btn");
                    if (confirmBtn) {
                      confirmBtn.disabled = true;
                      confirmBtn.textContent = "Saving...";
                    }

                    // Validate
                    const errorMsg = document.getElementById("username-error-msg");
                    if (errorMsg) errorMsg.classList.add("hidden");

                    if (!username || username.length < 2 || username.length > 30) {
                      if (errorMsg) {
                        errorMsg.textContent = "Username must be 2-30 characters long.";
                        errorMsg.classList.remove("hidden");
                      }
                      if (confirmBtn) {
                        confirmBtn.disabled = false;
                        confirmBtn.textContent = "Complete Setup";
                      }
                      return;
                    }
                    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                      if (errorMsg) {
                        errorMsg.textContent = "Username can only contain letters, numbers, and underscores.";
                        errorMsg.classList.remove("hidden");
                      }
                      if (confirmBtn) {
                        confirmBtn.disabled = false;
                        confirmBtn.textContent = "Complete Setup";
                      }
                      return;
                    }

                    await saveUsernameDirectly(username, securityQuestion, securityAnswer, currentUser);
                    yourname = username;
                    updateNameDisplay();
                    ui.hideUsernameSetupPrompt();
                  } catch (err) {
                    console.error("Error setting username:", err);
                    const errorMsg = document.getElementById("username-error-msg");
                    if (errorMsg) {
                      errorMsg.textContent = "Failed to save username. Please try again.";
                      errorMsg.classList.remove("hidden");
                    }
                    const confirmBtn = document.getElementById("confirm-username-btn");
                    if (confirmBtn) {
                      confirmBtn.disabled = false;
                      confirmBtn.textContent = "Complete Setup";
                    }
                  }
                });
              }, 500);
            }
          } catch (error) {
            console.error("Error during app initialization:", error);
          }
        }, 100);
      } else {
        currentUser = null;
        console.log("User not authenticated, redirecting to landing page");
        window.location.replace("landingpage.html");
      }
    },
    (error) => {
      console.error("Authentication error:", error);
      clearTimeout(authTimeout);
      authCheckComplete = true;
      window.location.replace("landingpage.html");
    }
  );
}

function init() {
  console.log("Starting PriorityTask AI initialization...");
  const mainLayout = document.querySelector(".main-app-layout");
  if (mainLayout) {
    mainLayout.style.display = "none";
  }

  const authLoadingScreen = document.getElementById("auth-loading");
  if (authLoadingScreen) {
    authLoadingScreen.style.display = "flex";
  }

  checkAuthState();
}

// --- Register Event Listeners ---

// Date pickers
if (prevDayBtn) {
  prevDayBtn.addEventListener("click", () => {
    selectedDate = new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000);
    updateDateDisplayAndLoadTasks();
  });
}
if (nextDayBtn) {
  nextDayBtn.addEventListener("click", () => {
    selectedDate = new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000);
    updateDateDisplayAndLoadTasks();
  });
}
if (calendarIconBtn) {
  calendarIconBtn.addEventListener("click", () => ui.showDatePicker(selectedDate));
}
if (currentDateInputEl) {
  currentDateInputEl.addEventListener("change", (e) => {
    if (e.target.value) {
      selectedDate = new Date(e.target.value + "T00:00:00");
      updateDateDisplayAndLoadTasks();
    }
    ui.hideDatePicker();
  });
  currentDateInputEl.addEventListener("blur", () => ui.hideDatePicker());
}

// Modal handling
if (ui.taskInputModalEl) {
  ui.taskInputModalEl.addEventListener("click", (e) => {
    if (e.target === ui.taskInputModalEl) {
      ui.closeTaskModal();
    }
  });
}
if (ui.infoModalEl) {
  ui.infoModalEl.addEventListener("click", ui.handleInfoModalBackdropClick);
}
document.addEventListener("keydown", ui.handleInfoModalEscapeKey);

// Focus Mode Event Listeners
const focusModeBtn = document.getElementById("focus-mode-btn");
const focusModeCloseBtn = document.getElementById("focus-mode-close-btn");
const focusPauseBtn = document.getElementById("focus-pause-btn");
const focusResetBtn = document.getElementById("focus-reset-btn");

if (focusModeBtn) focusModeBtn.addEventListener("click", ui.openFocusModeModal);
if (focusModeCloseBtn) focusModeCloseBtn.addEventListener("click", ui.closeFocusModeModal);
if (ui.focusStartBtn) ui.focusStartBtn.addEventListener("click", ui.startFocusMode);
if (focusPauseBtn) focusPauseBtn.addEventListener("click", ui.pauseFocusMode);
if (focusResetBtn) focusResetBtn.addEventListener("click", ui.resetFocusMode);

if (ui.focusModeModal) {
  ui.focusModeModal.addEventListener("click", (e) => {
    if (e.target === ui.focusModeModal) ui.closeFocusModeModal();
  });
}

// Add task logic in modal
if (addCurrentTaskModalBtn) {
  addCurrentTaskModalBtn.addEventListener("click", () => {
    if (taskInputFieldModal) {
      const taskText = taskInputFieldModal.value.trim();
      if (taskText) {
        tasksForCurrentSession.push(taskText);
        taskInputFieldModal.value = "";
        renderTasksForCurrentSession();
      }
      taskInputFieldModal.focus();
    }
  });
}
if (taskInputFieldModal) {
  taskInputFieldModal.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (addCurrentTaskModalBtn) addCurrentTaskModalBtn.click();
    }
  });
}

// Analyze tasks modal button
if (analyzeTasksModalBtn) {
  analyzeTasksModalBtn.addEventListener("click", async () => {
    if (tasksForCurrentSession.length === 0) return;
    
    // Disable button to prevent double submission
    analyzeTasksModalBtn.disabled = true;
    const originalText = analyzeTasksModalBtn.innerHTML;
    analyzeTasksModalBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    
    showLoading(true);

    try {
      // Analyze new tasks
      const newTasksAnalysis = await callGeminiAPI(tasksForCurrentSession, selectedDate);

      // Merge data
      const mergedData = mergeTaskData(analyzedTaskDataForSelectedDate, newTasksAnalysis);
      await saveTasksToFirestore(selectedDate, mergedData, currentUser);

      // ✅ Update in-memory state BEFORE rendering (this was the missing line)
      analyzedTaskDataForSelectedDate = mergedData;

      // Animation — clear columns then re-render with new data
      setTimeout(() => {
        Object.values(categoryUiMap).forEach((uiCol) => {
          uiCol.listEl.innerHTML = "";
          uiCol.quoteEl.textContent = "";
        });
        renderAnalyzedTasksUI();
        animateNewTasksIntoCategories(newTasksAnalysis);
        updateDashboardUI();
        updateOverallProgressBar();
      }, 50);

      tasksForCurrentSession = [];
      ui.closeTaskModal();
    } catch (error) {
      console.error("Error in analyze/save process:", error);
    } finally {
      showLoading(false);
      analyzeTasksModalBtn.disabled = false;
      analyzeTasksModalBtn.innerHTML = originalText;
    }
  });
}

function mergeTaskData(existingData, newTasksData) {
  if (!existingData) return newTasksData;
  const mergedData = JSON.parse(JSON.stringify(existingData));

  // Validate and ensure all categories exist
  Object.keys(categoryUiMap).forEach((categoryKey) => {
    if (newTasksData[categoryKey] && Array.isArray(newTasksData[categoryKey])) {
      if (!mergedData[categoryKey]) {
        mergedData[categoryKey] = [];
      }
      mergedData[categoryKey].push(...newTasksData[categoryKey]);
    }
  });

  // Ensure quotes object exists to prevent early return in renderAnalyzedTasksUI
  if (!mergedData.quotes) {
    mergedData.quotes = {};
  }

  // Merge new quotes or supply defaults if missing
  const defaultQuotes = {
    "Very Important Tasks": "Crush these first! \uD83D\uDCA5",
    "Important Tasks": "Keep the momentum going! \u2B50",
    "Medium Tasks": "Steady progress wins! \uD83C\uDF31",
    "Low Priority Tasks": "Wrap these up easily! \uD83C\uDF43"
  };

  if (newTasksData.quotes) {
    mergedData.quotes = { ...mergedData.quotes, ...newTasksData.quotes };
  } else {
    // If AI forgot quotes entirely, use defaults for missing ones
    Object.keys(categoryUiMap).forEach(cat => {
      if (!mergedData.quotes[cat]) mergedData.quotes[cat] = defaultQuotes[cat];
    });
  }
  return mergedData;
}

function animateNewTasksIntoCategories(newTasksData) {
  Object.keys(categoryUiMap).forEach((categoryKey) => {
    if (newTasksData[categoryKey] && Array.isArray(newTasksData[categoryKey])) {
      const categoryUI = categoryUiMap[categoryKey];
      const newTaskElements = categoryUI.listEl.querySelectorAll("li:not([data-animated])");

      newTaskElements.forEach((taskElement, index) => {
        taskElement.setAttribute("data-animated", "true");
        gsap.set(taskElement, {
          opacity: 0,
          y: 20,
          scale: 0.95,
        });

        gsap.to(taskElement, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          delay: index * 0.1,
          ease: "back.out(1.7)",
        });
      });
    }
  });
}

// Mood Selection Modal buttons
const skipMoodBtn = document.getElementById("skip-mood-btn");
if (skipMoodBtn) {
  skipMoodBtn.addEventListener("click", ui.closeMoodSelection);
}
if (ui.moodSelectionModal) {
  ui.moodSelectionModal.addEventListener("click", (e) => {
    if (e.target === ui.moodSelectionModal) ui.closeMoodSelection();
  });
}

// Bind custom modal click callback for selectMood
document.querySelectorAll(".mood-option").forEach((option) => {
  option.addEventListener("click", () => {
    const mood = option.dataset.mood;
    const emoji = option.dataset.emoji;
    if (window.__currentTaskForMood && typeof window.__currentTaskForMood.callback === "function") {
      window.__currentTaskForMood.callback(mood, emoji);
    }
  });
});

// Behaviour analysis view toggle listeners
if (toggleBehaviourAnalysisBtn) {
  toggleBehaviourAnalysisBtn.addEventListener("click", () => {
    const isBehaviourHidden = taskBehaviouralAnalysisSection.classList.contains("hidden");
    const sectionToHide = isBehaviourHidden ? taskColumnsContainer : taskBehaviouralAnalysisSection;
    const sectionToShow = isBehaviourHidden ? taskBehaviouralAnalysisSection : taskColumnsContainer;

    gsap.to(sectionToHide, {
      opacity: 0,
      duration: 0.25,
      onComplete: () => {
        sectionToHide.classList.add("hidden");
        sectionToShow.classList.remove("hidden");
        gsap.fromTo(
          sectionToShow,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
        );
        if (isBehaviourHidden) loadAndDisplayBehaviouralAnalysis();
      },
    });
  });
}
if (backToTasksFromBehaviourBtn) {
  backToTasksFromBehaviourBtn.addEventListener("click", () => {
    gsap.to(taskBehaviouralAnalysisSection, {
      opacity: 0,
      y: 15,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => {
        taskBehaviouralAnalysisSection.classList.add("hidden");
        taskColumnsContainer.classList.remove("hidden");
        gsap.fromTo(
          taskColumnsContainer,
          { opacity: 0 },
          { opacity: 1, duration: 0.3, ease: "power2.out" }
        );
      },
    });
  });
}

// Global error handlers
window.addEventListener("error", function (e) {
  if (e.filename && e.filename.includes("tilt.jquery.min.js")) {
    console.warn("Tilt library error caught and suppressed:", e.message);
    e.preventDefault();
    return false;
  }
});
if (typeof $ !== "undefined") {
  $(document).on("error", function (e) {
    if (
      e.originalEvent &&
      e.originalEvent.filename &&
      e.originalEvent.filename.includes("tilt.jquery.min.js")
    ) {
      console.warn("jQuery tilt error caught:", e.originalEvent.message);
      e.preventDefault();
      return false;
    }
  });
}

// Open modal triggers
const heroAddTaskBtn = document.getElementById("header-add-task-btn-main");
if (heroAddTaskBtn) {
  heroAddTaskBtn.addEventListener("click", () => {
    ui.openTaskModal(yourname, selectedDate, renderTasksForCurrentSession);
  });
}
const cancelAddTaskBtn = document.getElementById("cancel-add-task-btn");
if (cancelAddTaskBtn) {
  cancelAddTaskBtn.addEventListener("click", ui.closeTaskModal);
}
const infoIconBtn = document.getElementById("header-info-icon-btn");
if (infoIconBtn) {
  infoIconBtn.addEventListener("click", ui.openInfoModal);
}
const infoCloseBtn = document.getElementById("info-modal-close-btn");
if (infoCloseBtn) {
  infoCloseBtn.addEventListener("click", ui.closeInfoModal);
}
const infoCloseXBtn = document.getElementById("info-modal-close-x-btn");
if (infoCloseXBtn) {
  infoCloseXBtn.addEventListener("click", ui.closeInfoModal);
}

// Start application
init();
