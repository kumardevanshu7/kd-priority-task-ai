// --- Firestore & Database Operations Service ---
import { db } from "./config.js";
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  writeBatch,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { formatDate } from "./utils.js";

// Helper function to extract incomplete tasks from data
export function getIncompleteTasks(taskData, dateKey) {
  if (!taskData) return [];
  const incomplete = [];
  Object.keys(taskData).forEach((category) => {
    if (Array.isArray(taskData[category])) {
      taskData[category].forEach((task) => {
        if (!task.completed) {
          incomplete.push({
            ...task,
            originalCategory: category,
            originalDate: dateKey,
          });
        }
      });
    }
  });
  return incomplete;
}

// Helper to count incomplete tasks
export function getIncompleteTasksCount(taskData) {
  if (!taskData) return 0;
  let count = 0;
  Object.keys(taskData).forEach((category) => {
    if (Array.isArray(taskData[category])) {
      count += taskData[category].filter((task) => !task.completed).length;
    }
  });
  return count;
}

// Load daily tasks for a specific date
export async function loadTasksForDate(date, currentUser) {
  if (!currentUser) return null;
  const dateKey = formatDate(date);
  const docRef = doc(db, "dailyTasks", `${currentUser.uid}-${dateKey}`);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}

// Save tasks to Firestore
export async function saveTasksToFirestore(date, dataToSave, currentUser) {
  if (!currentUser) {
    throw new Error("Authentication Error: Please log in to save tasks");
  }
  const dateKey = formatDate(date);
  const docRef = doc(db, "dailyTasks", `${currentUser.uid}-${dateKey}`);
  const payload = { ...dataToSave, lastUpdated: Timestamp.now() };
  await setDoc(docRef, payload);
  return payload;
}

// Load user displayName
export async function loadUserDisplayName(currentUser) {
  if (!currentUser) return null;
  const userDocRef = doc(db, "users", currentUser.uid);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    const userData = userDoc.data();
    return userData.displayName || null;
  }
  return null;
}

// Check if username setup is needed
export async function checkIfUsernameNeeded(currentUser) {
  if (!currentUser) return false;
  const userDocRef = doc(db, "users", currentUser.uid);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    const userData = userDoc.data();
    return userData.usernameSetupComplete === false;
  }
  return true; // If document doesn't exist, setup is needed
}

// Save username directly to Firestore
export async function saveUsernameDirectly(username, securityQuestion, securityAnswer, currentUser) {
  if (!currentUser) throw new Error("No authenticated user");
  const userDocRef = doc(db, "users", currentUser.uid);
  const userPayload = {
    displayName: username,
    fullName: currentUser.displayName || "Anonymous",
    email: currentUser.email,
    securityQuestion: securityQuestion || null,
    securityAnswer: securityAnswer ? securityAnswer.toLowerCase() : null,
    usernameSetupComplete: true,
    createdAt: Timestamp.now(),
    lastUpdated: Timestamp.now(),
  };
  await setDoc(userDocRef, userPayload);
  return userPayload;
}

// Get User Security Data
export async function getUserSecurityData(currentUser) {
  if (!currentUser) return null;
  const userDocRef = doc(db, "users", currentUser.uid);
  const docSnap = await getDoc(userDocRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      securityQuestion: data.securityQuestion,
      securityAnswer: data.securityAnswer
    };
  }
  return null;
}

// Create initial user setup document on signup
export async function createInitialUserDocument(currentUser) {
  if (!currentUser) return;
  const userDocRef = doc(db, "users", currentUser.uid);
  const docSnap = await getDoc(userDocRef);
  
  if (!docSnap.exists()) {
    await setDoc(userDocRef, {
      fullName: currentUser.displayName || "Anonymous",
      email: currentUser.email,
      usernameSetupComplete: false,
      createdAt: Timestamp.now(),
      lastUpdated: Timestamp.now(),
    });
  }
}

// Load mood data for a date
export async function loadMoodDataFromFirestore(date, currentUser) {
  if (!currentUser) return [];
  const dateStr = formatDate(date);
  const moodDocRef = doc(db, "user-moods", `${currentUser.uid}-${dateStr}`);
  const moodDoc = await getDoc(moodDocRef);
  if (moodDoc.exists()) {
    return moodDoc.data().moods || [];
  }
  return [];
}

// Save mood to Firestore
export async function saveMoodToFirestore(date, mood, emoji, taskText, currentUser) {
  if (!currentUser) throw new Error("No authenticated user for mood saving");
  const dateStr = formatDate(date);
  const moodDocRef = doc(db, "user-moods", `${currentUser.uid}-${dateStr}`);
  
  const moodDoc = await getDoc(moodDocRef);
  let moodData = moodDoc.exists() ? moodDoc.data() : { moods: [] };
  
  moodData.moods.push({
    mood: mood,
    emoji: emoji,
    task: taskText,
    timestamp: new Date().toISOString(),
  });
  
  await setDoc(moodDocRef, moodData);
  return moodData.moods;
}

// Get all previous incomplete tasks from the last 30 days
export async function getAllPreviousIncompleteTasks(selectedDate, currentUser, countOnly = false) {
  if (!currentUser) return countOnly ? 0 : [];
  
  let totalCount = 0;
  const allIncompleteTasks = [];

  const fetchPromises = [];
  
  for (let i = 1; i <= 30; i++) {
    const checkDate = new Date(selectedDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = formatDate(checkDate);
    const docRef = doc(db, "dailyTasks", `${currentUser.uid}-${dateKey}`);
    
    // Push the promise into the array, resolving to an object with date metadata
    fetchPromises.push(
      getDoc(docRef)
        .then(docSnap => ({ docSnap, dateKey, daysSinceOriginal: i }))
        .catch(err => ({ docSnap: null, error: err }))
    );
  }

  const results = await Promise.all(fetchPromises);

  results.forEach(result => {
    if (result.docSnap && result.docSnap.exists()) {
      const data = result.docSnap.data();
      const incompleteTasks = getIncompleteTasks(data, result.dateKey);

      if (countOnly) {
        totalCount += incompleteTasks.length;
      } else {
        incompleteTasks.forEach((task) => {
          task.originalDate = result.dateKey;
          task.daysSinceOriginal = result.daysSinceOriginal;
          allIncompleteTasks.push(task);
        });
      }
    }
  });

  if (countOnly) return totalCount;

  // Filter unique tasks
  const uniqueTasks = [];
  const seenTasks = new Set();
  allIncompleteTasks.forEach((task) => {
    const taskKey = `${task.task}_${task.originalCategory}`.toLowerCase();
    if (!seenTasks.has(taskKey)) {
      seenTasks.add(taskKey);
      uniqueTasks.push(task);
    }
  });

  return uniqueTasks;
}

// Update a task in a specific date's document
export async function updateTaskInSpecificDate(dateKey, taskText, originalCategory, completedOnDate, isCompleted, currentUser) {
  if (!currentUser) return;
  const docRef = doc(db, "dailyTasks", `${currentUser.uid}-${dateKey}`);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    let hasChanges = false;

    if (data[originalCategory] && Array.isArray(data[originalCategory])) {
      data[originalCategory].forEach((task) => {
        if (task.task === taskText) {
          if (isCompleted) {
            task.completed = true;
            task.completedDate = completedOnDate;
          } else {
            task.completed = false;
            if (task.completedDate) delete task.completedDate;
          }
          hasChanges = true;
        }
      });
    }

    if (hasChanges) {
      await setDoc(docRef, { ...data, lastUpdated: Timestamp.now() });
    }
  }
}

// Update ALL instances of a task across all dates (from originalDate up to selectedDate)
export async function updateAllInstancesOfTask(
  uniqueTaskIdentifier,
  taskText,
  originalCategory,
  completedOnDate,
  isCompleted,
  selectedDate,
  currentUser,
  originalDateString // Passed from app.js
) {
  if (!currentUser) return;
  
  let searchDays = 60; // Fallback maximum
  if (originalDateString) {
    const origDate = new Date(originalDateString + "T00:00:00");
    if (!isNaN(origDate.getTime())) {
      const diffTime = Math.abs(selectedDate - origDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      searchDays = Math.min(60, diffDays + 2); // Buffer of 2 days, max 60
    }
  }

  // Batch the promises to prevent connection spikes
  const batchSize = 10;
  for (let i = 0; i < searchDays; i += batchSize) {
    const batchPromises = [];
    for (let j = 0; j < batchSize && (i + j) < searchDays; j++) {
      const checkDate = new Date(selectedDate.getTime() - (i + j) * 24 * 60 * 60 * 1000);
      const dateKey = formatDate(checkDate);
      const updatePromise = updateTaskInSpecificDate(
        dateKey,
        taskText,
        originalCategory,
        completedOnDate,
        isCompleted,
        currentUser
      );
      batchPromises.push(updatePromise);
    }
    await Promise.all(batchPromises);
  }
}

// Load current user streak
export async function loadCurrentStreak(currentUser) {
  if (!currentUser) return 0;
  const streakDocRef = doc(db, "userStreaks", currentUser.uid);
  const streakDoc = await getDoc(streakDocRef);
  if (streakDoc.exists()) {
    return streakDoc.data().currentStreak || 0;
  }
  return 0;
}

// Calculate and update user streak based on 70% task completion rule
export async function calculateAndUpdateStreak(selectedDate, analyzedTaskData, currentUser) {
  if (!currentUser || !analyzedTaskData) return 0;

  const today = formatDate(selectedDate);
  const yesterday = formatDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000));

  // Count helper functions
  const getTotalTasksCount = (taskData) => {
    if (!taskData) return 0;
    let count = 0;
    Object.keys(taskData).forEach((cat) => {
      if (Array.isArray(taskData[cat])) count += taskData[cat].length;
    });
    return count;
  };

  const getCompletedTasksCount = (taskData) => {
    if (!taskData) return 0;
    let count = 0;
    Object.keys(taskData).forEach((cat) => {
      if (Array.isArray(taskData[cat])) {
        count += taskData[cat].filter((t) => t.completed).length;
      }
    });
    return count;
  };

  const totalTasks = getTotalTasksCount(analyzedTaskData);
  const completedTasks = getCompletedTasksCount(analyzedTaskData);
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const meetsThreshold = completionRate >= 70;

  const streakDocRef = doc(db, "userStreaks", currentUser.uid);
  const streakDoc = await getDoc(streakDocRef);
  let streakData = streakDoc.exists()
    ? streakDoc.data()
    : {
        currentStreak: 0,
        lastUpdateDate: null,
        streakHistory: {},
      };

  if (meetsThreshold) {
    if (streakData.lastUpdateDate === today) {
      // Already updated today
    } else if (streakData.lastUpdateDate === yesterday) {
      streakData.currentStreak += 1;
    } else {
      streakData.currentStreak = 1;
    }
  } else {
    if (streakData.lastUpdateDate !== today) {
      streakData.currentStreak = 0;
    }
  }

  // Update history record
  streakData.lastUpdateDate = today;
  if (!streakData.streakHistory) streakData.streakHistory = {};
  streakData.streakHistory[today] = {
    totalTasks,
    completedTasks,
    completionRate,
    meetsThreshold,
  };

  await setDoc(streakDocRef, streakData);
  return streakData.currentStreak;
}

// Initial streak document setup
export async function createInitialStreakDocument(currentUser) {
  if (!currentUser) return;
  const streakDocRef = doc(db, "userStreaks", currentUser.uid);
  const streakDoc = await getDoc(streakDocRef);
  if (!streakDoc.exists()) {
    await setDoc(streakDocRef, {
      currentStreak: 0,
      lastUpdateDate: null,
      streakHistory: {},
    });
  }
}

// Delete all user data (tasks, streaks, moods) — start fresh
// Uses direct doc-ID access (no collection listing) to comply with Firestore rules.
// Rules only allow access per-document: {uid}-YYYY-MM-DD pattern.
export async function deleteAllUserData(currentUser) {
  if (!currentUser) return;
  const uid = currentUser.uid;

  // ── Generate date keys: past 730 days + next 60 days ──
  // Covers ~2 years of task history without needing collection listing
  const dateKeys = [];
  const today = new Date();
  for (let offset = -730; offset <= 60; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, "0");
    const dd   = String(d.getDate()).padStart(2, "0");
    dateKeys.push(`${yyyy}-${mm}-${dd}`);
  }

  // ── Collect all refs to delete ──
  const allRefs = [
    // Task docs: dailyTasks/{uid}-YYYY-MM-DD
    ...dateKeys.map(k => doc(db, "dailyTasks", `${uid}-${k}`)),
    // Mood docs: user-moods/{uid}-YYYY-MM-DD
    ...dateKeys.map(k => doc(db, "user-moods", `${uid}-${k}`)),
    // Streak & profile (single docs)
    doc(db, "userStreaks", uid),
    doc(db, "users", uid),
  ];

  // ── Batch delete in chunks of 490 (Firestore limit: 500/batch) ──
  // batch.delete() is a no-op if the doc doesn't exist — safe to call on all dates
  const CHUNK = 490;
  for (let i = 0; i < allRefs.length; i += CHUNK) {
    const batch = writeBatch(db);
    allRefs.slice(i, i + CHUNK).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}
