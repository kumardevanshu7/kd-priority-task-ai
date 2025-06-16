/* === MAIN APPLICATION JAVASCRIPT === */

// Immediate authentication check - prevent any access without login
let authCheckComplete = false;

// Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Gemini SDK imports
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "https://esm.run/@google/generative-ai";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAdhOUKDc-whz2Gh353E1ItT6XIjyuw4Ag",
  authDomain: "aitasker-fd519.firebaseapp.com",
  projectId: "aitasker-fd519",
  storageBucket: "aitasker-fd519.appspot.com",
  messagingSenderId: "48786270155",
  appId: "1:48786270155:web:3547fea3ded48f5dc8b84e",
  measurementId: "G-NQD5X1XVYD",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// Immediate authentication check - redirect if no user session
auth.onAuthStateChanged((user) => {
  if (!user && !authCheckComplete) {
    console.log("No user session found, redirecting to landing page immediately");
    window.location.replace("landingpage.html");
  }
});

// --- Gemini Configuration ---
const GEMINI_API_KEY = "AIzaSyD77R_RwPvjtRkdeY87nS1bBtDdjp6CJZc";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

const generationConfig = {
  temperature: 0.6,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// --- App State ---
let currentUser = null;
let yourname = "No Name";
let tasksForCurrentSession = [];
let analyzedTaskDataForSelectedDate = null;
let selectedDate = new Date();
let completionByCategoryChartInstance = null;

// --- DOM Elements ---
const taskInputModalEl = document.getElementById("task-input-modal");
const taskModalContentEl = taskInputModalEl?.querySelector(".modal-content");
const modalTitleEl = document.getElementById("modal-title");
const greetingMessageModalEl = document.getElementById("greeting-message-modal");
const taskInputFieldModal = document.getElementById("task-input-field-modal");
const currentTasksListModalEl = document.getElementById("current-tasks-list-modal");
const cancelAddTaskBtn = document.getElementById("cancel-add-task-btn");
const addCurrentTaskModalBtn = document.getElementById("add-current-task-modal-btn");
const analyzeTasksModalBtn = document.getElementById("analyze-tasks-modal-btn");
const heroAddTaskBtn = document.getElementById("header-add-task-btn-main");

const currentDateDisplayEl = document.getElementById("current-date-display");
const currentDateInputEl = document.getElementById("current-date-input");
const prevDayBtn = document.getElementById("prev-day-btn");
const nextDayBtn = document.getElementById("next-day-btn");
const calendarIconBtn = document.getElementById("calendar-icon-btn");

const loadingSpinner = document.getElementById("loading-spinner");
const tasksCreatedEl = document.getElementById("tasks-created-today");
const tasksCompletedEl = document.getElementById("tasks-completed");
const tasksRemainingEl = document.getElementById("tasks-remaining");
const taskColumnsContainer = document.getElementById("task-columns-container");
const taskBehaviouralAnalysisSection = document.getElementById("task-behavioural-analysis");
const toggleBehaviourAnalysisBtn = document.getElementById("toggle-behaviour-analysis-btn");

// Carry Forward Elements
const carryForwardContainer = document.getElementById("carry-forward-container");
const addPreviousTasksBtn = document.getElementById("add-previous-tasks-btn");
const previousTasksCountEl = document.getElementById("previous-tasks-count");
const backToTasksFromBehaviourBtn = document.getElementById("back-to-tasks-from-behaviour-btn");
const behaviouralAnalysisDateDisplayEl = document.getElementById("behavioural-analysis-date-display");
const behaviourCompletionRateEl = document.getElementById("behaviour-completion-rate");
const behaviourCompletionProgressBarEl = document.getElementById("behaviour-completion-progress-bar");
const focusCategoryBehaviourEl = document.getElementById("focus-category-behaviour");
const infoModalEl = document.getElementById("info-modal");
const infoModalContentEl = infoModalEl?.querySelector(".modal-content");
const infoIconBtn = document.getElementById("header-info-icon-btn");
const infoModalCloseBtn = document.getElementById("info-modal-close-btn");
const infoModalCloseXBtn = document.getElementById("info-modal-close-x-btn");

// Focus Mode Elements
const focusModeBtn = document.getElementById("focus-mode-btn");
const focusModeModal = document.getElementById("focus-mode-modal");
const focusModeModalContent = document.getElementById("focus-mode-modal-content");
const focusModeCloseBtn = document.getElementById("focus-mode-close-btn");
const focusTimerDisplay = document.getElementById("focus-timer-display");
const focusStartBtn = document.getElementById("focus-start-btn");
const focusPauseBtn = document.getElementById("focus-pause-btn");
const focusResetBtn = document.getElementById("focus-reset-btn");

// Mood Selection Elements
const moodSelectionModal = document.getElementById("mood-selection-modal");
const skipMoodBtn = document.getElementById("skip-mood-btn");

// Name Elements
const nameSection = document.getElementById("username-section");
const nameDisplayElement = document.getElementById("username-display");
const nameDropdown = document.getElementById("username-dropdown");
const logoutBtn = document.getElementById("logout-btn");

// Mood Analytics Chart Instance
let moodAnalyticsChartInstance = null;

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

// --- Utility Functions ---
function formatDate(date) {
  return date.toLocaleDateString("en-CA");
}

function formatDateForDisplay(date) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

function showLoading(isLoading) {
  if (loadingSpinner) {
    loadingSpinner.classList.toggle("hidden", !isLoading);
  }
}

function showErrorAlert(title, message) {
  Swal.fire({
    icon: "error",
    title,
    text: message,
    confirmButtonColor: "var(--ph-new-medium-green)",
    background: "var(--ph-new-white)",
    color: "var(--ph-new-text-dark)",
  });
}

function showSuccessAlert(title, message) {
  Swal.fire({
    icon: "success",
    title,
    text: message,
    timer: 2000,
    showConfirmButton: false,
    background: "var(--ph-new-white)",
    color: "var(--ph-new-text-dark)",
  });
}

// Export for use in other modules
window.PriorityHelpApp = {
  // State
  currentUser,
  yourname,
  tasksForCurrentSession,
  analyzedTaskDataForSelectedDate,
  selectedDate,
  
  // Firebase
  db,
  auth,
  
  // Gemini
  genAI,
  geminiModel,
  generationConfig,
  safetySettings,
  
  // DOM Elements
  categoryUiMap,
  
  // Utility Functions
  formatDate,
  formatDateForDisplay,
  showLoading,
  showErrorAlert,
  showSuccessAlert
};
