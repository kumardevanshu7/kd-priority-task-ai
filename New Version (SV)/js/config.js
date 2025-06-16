/* === CONFIGURATION === */

// API Keys and Configuration
const GEMINI_API_KEY = "AIzaSyDHeDWiDja4RamljqzKKAHdWVfIksKoABE";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDHeDWiDja4RamljqzKKAHdWVfIksKoABE",
  authDomain: "priorityhelp-ai.firebaseapp.com",
  projectId: "priorityhelp-ai",
  storageBucket: "priorityhelp-ai.firebasestorage.app",
  messagingSenderId: "1092492148832",
  appId: "1:1092492148832:web:8b8a4a4a4a4a4a4a4a4a4a",
  measurementId: "G-XXXXXXXXXX"
};

// Gemini AI Configuration
const generationConfig = {
  temperature: 0.7,
  topP: 0.8,
  topK: 40,
  maxOutputTokens: 2048,
  responseMimeType: "text/plain",
};

const safetySettings = [
  {
    category: "HARM_CATEGORY_HARASSMENT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE",
  },
  {
    category: "HARM_CATEGORY_HATE_SPEECH",
    threshold: "BLOCK_MEDIUM_AND_ABOVE",
  },
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE",
  },
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE",
  },
];

// Application Constants
const APP_CONFIG = {
  name: "PriorityHelp AI",
  version: "2.0.0",
  logoUrl: "https://shorturl.at/cQmMr",
  defaultUsername: "No Name",
  streakThreshold: 70, // Percentage for streak calculation
  carryForwardDays: 30, // Number of days to check for incomplete tasks
  maxTasksPerCategory: 50,
  autoSaveInterval: 30000, // 30 seconds
  animationDuration: 300,
  debounceDelay: 500,
};

// UI Category Mapping
const categoryUiMap = {
  "Very Important Tasks": {
    id: "very-important-column",
    icon: "fas fa-star",
    color: "#dc3545",
    priority: 1
  },
  "High Priority Tasks": {
    id: "high-priority-column", 
    icon: "fas fa-rocket",
    color: "#fd7e14",
    priority: 2
  },
  "Good-Good Priority": {
    id: "good-good-priority-column",
    icon: "fas fa-thumbs-up", 
    color: "#28a745",
    priority: 3
  },
  "Low Priority Tasks": {
    id: "low-priority-column",
    icon: "fas fa-mug-hot",
    color: "#6c757d",
    priority: 4
  }
};

// Mood Options Configuration
const MOOD_OPTIONS = [
  { mood: "excited", emoji: "🤩", label: "Excited" },
  { mood: "happy", emoji: "😊", label: "Happy" },
  { mood: "satisfied", emoji: "😌", label: "Satisfied" },
  { mood: "neutral", emoji: "😐", label: "Neutral" },
  { mood: "tired", emoji: "😴", label: "Tired" },
  { mood: "frustrated", emoji: "😤", label: "Frustrated" },
  { mood: "stressed", emoji: "😰", label: "Stressed" }
];

// Focus Mode Configuration
const FOCUS_CONFIG = {
  defaultDuration: 25, // minutes
  shortBreak: 5, // minutes
  longBreak: 15, // minutes
  sessionsUntilLongBreak: 4,
  tickSound: true,
  notifications: true
};

// Chart Configuration
const CHART_CONFIG = {
  colors: {
    primary: "#4a7c59",
    secondary: "#a8d5ba", 
    success: "#28a745",
    warning: "#ffc107",
    danger: "#dc3545",
    info: "#17a2b8"
  },
  animation: {
    duration: 700,
    easing: "easeOutQuart"
  }
};

// Error Messages
const ERROR_MESSAGES = {
  auth: {
    invalidEmail: "Please enter a valid email address",
    weakPassword: "Password should be at least 6 characters",
    userNotFound: "No account found with this email",
    wrongPassword: "Incorrect password",
    emailInUse: "An account with this email already exists",
    networkError: "Network error. Please check your connection"
  },
  tasks: {
    loadFailed: "Failed to load tasks. Please refresh the page",
    saveFailed: "Failed to save tasks. Please try again",
    analyzeFailed: "Failed to analyze tasks. Please try again",
    deleteFailed: "Failed to delete task. Please try again"
  },
  general: {
    unexpected: "An unexpected error occurred. Please try again",
    offline: "You appear to be offline. Please check your connection"
  }
};

// Success Messages
const SUCCESS_MESSAGES = {
  auth: {
    signIn: "Successfully signed in!",
    signUp: "Account created successfully!",
    signOut: "Successfully signed out",
    passwordReset: "Password reset email sent"
  },
  tasks: {
    saved: "Tasks saved successfully",
    completed: "Task completed!",
    aborted: "Task removed successfully",
    carryForward: "Previous tasks added successfully"
  },
  profile: {
    updated: "Profile updated successfully",
    nameSet: "Name set successfully"
  }
};

// Local Storage Keys
const STORAGE_KEYS = {
  theme: "ph_theme",
  lastVisit: "ph_last_visit",
  preferences: "ph_preferences",
  draftTasks: "ph_draft_tasks",
  focusStats: "ph_focus_stats"
};

// Date Format Options
const DATE_FORMATS = {
  display: { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  },
  short: { 
    month: 'short', 
    day: 'numeric' 
  },
  iso: 'YYYY-MM-DD'
};

// Export configuration for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GEMINI_API_KEY,
    firebaseConfig,
    generationConfig,
    safetySettings,
    APP_CONFIG,
    categoryUiMap,
    MOOD_OPTIONS,
    FOCUS_CONFIG,
    CHART_CONFIG,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    STORAGE_KEYS,
    DATE_FORMATS
  };
}
