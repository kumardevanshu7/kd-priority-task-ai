// --- UI and Animation Controller Module ---
import { formatDateForDisplay } from "./utils.js";

// DOM references
export const taskInputModalEl = document.getElementById("task-input-modal");
export const taskModalContentEl = taskInputModalEl?.querySelector(".modal-content");
export const taskInputFieldModal = document.getElementById("task-input-field-modal");
export const greetingMessageModalEl = document.getElementById("greeting-message-modal");
export const modalTitleEl = document.getElementById("modal-title");

export const infoModalEl = document.getElementById("info-modal");
export const infoModalContentEl = infoModalEl?.querySelector(".modal-content");
export const infoModalCloseBtn = document.getElementById("info-modal-close-btn");
export const infoModalCloseXBtn = document.getElementById("info-modal-close-x-btn");

export const focusModeModal = document.getElementById("focus-mode-modal");
export const focusModeModalContent = document.getElementById("focus-mode-modal-content");
export const focusTimerDisplay = document.getElementById("focus-timer-display");
export const focusStartBtn = document.getElementById("focus-start-btn");
export const focusPauseBtn = document.getElementById("focus-pause-btn");

export const moodSelectionModal = document.getElementById("mood-selection-modal");

// Focus mode state (internal to UI)
let focusTimer = null;
let focusTimeRemaining = 25 * 60; // 25 minutes
let isFocusModeActive = false;
let isPaused = false;

// Task input modal logic
export function openTaskModal(yourname, selectedDate, renderSessionTasksCallback) {
  if (!taskInputModalEl || !taskModalContentEl) return;
  
  taskInputModalEl.classList.remove("hidden");
  taskInputModalEl.classList.add("visible");

  gsap.fromTo(
    taskModalContentEl,
    { y: 25, scale: 0.96, opacity: 0 },
    {
      duration: 0.35,
      y: 0,
      scale: 1,
      opacity: 1,
      delay: 0.05,
      ease: "back.out(1.6)",
    }
  );

  setTimeout(() => taskInputFieldModal?.focus(), 100);
  
  if (renderSessionTasksCallback) {
    renderSessionTasksCallback();
  }

  if (greetingMessageModalEl) {
    greetingMessageModalEl.textContent = `Adding tasks for ${formatDateForDisplay(selectedDate)}. What's next, ${yourname}?`;
  }
  if (modalTitleEl) {
    modalTitleEl.textContent = `Add Tasks: ${formatDateForDisplay(selectedDate)}`;
  }
}

export function closeTaskModal() {
  if (!taskInputModalEl || !taskModalContentEl) return;

  gsap.to(taskModalContentEl, {
    duration: 0.25,
    y: 25,
    scale: 0.96,
    opacity: 0,
    ease: "power2.in",
    onComplete: () => {
      taskInputModalEl.classList.remove("visible");
      taskInputModalEl.classList.add("hidden");
    },
  });
  if (taskInputFieldModal) {
    taskInputFieldModal.value = "";
  }
}

// Info Modal Logic
export function openInfoModal() {
  if (!infoModalEl || !infoModalContentEl) return;
  document.body.style.overflow = "hidden";
  infoModalEl.classList.remove("hidden");
  infoModalEl.classList.add("visible");
  infoModalContentEl.scrollTop = 0;

  gsap.fromTo(
    infoModalContentEl,
    { y: 25, scale: 0.96, opacity: 0 },
    {
      duration: 0.35,
      y: 0,
      scale: 1,
      opacity: 1,
      delay: 0.05,
      ease: "back.out(1.6)",
    }
  );
}

export function closeInfoModal() {
  if (!infoModalEl || !infoModalContentEl) return;
  document.body.style.overflow = "";

  gsap.to(infoModalContentEl, {
    duration: 0.25,
    y: 25,
    scale: 0.96,
    opacity: 0,
    ease: "power2.in",
    onComplete: () => {
      infoModalEl.classList.remove("visible");
      infoModalEl.classList.add("hidden");
    },
  });
}

export function handleInfoModalBackdropClick(event) {
  if (event.target === infoModalEl) {
    closeInfoModal();
  }
}

export function handleInfoModalEscapeKey(event) {
  if (event.key === "Escape" && infoModalEl && !infoModalEl.classList.contains("hidden")) {
    closeInfoModal();
  }
}

export function addTouchSupport() {
  if (infoModalCloseXBtn) {
    infoModalCloseXBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      closeInfoModal();
    });
  }

  if (infoModalCloseBtn) {
    infoModalCloseBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      closeInfoModal();
    });
  }

  if (infoModalContentEl) {
    infoModalContentEl.addEventListener("click", (e) => e.stopPropagation());
    infoModalContentEl.addEventListener("touchstart", (e) => e.stopPropagation());
  }
}

// Focus Mode Logic
export function openFocusModeModal() {
  if (!focusModeModal || !focusModeModalContent) return;
  focusModeModal.classList.remove("hidden");
  focusModeModal.classList.add("visible");

  gsap.fromTo(
    focusModeModalContent,
    { y: 25, scale: 0.96, opacity: 0 },
    {
      duration: 0.35,
      y: 0,
      scale: 1,
      opacity: 1,
      delay: 0.05,
      ease: "back.out(1.6)",
    }
  );
}

export function closeFocusModeModal() {
  if (!focusModeModal || !focusModeModalContent) return;
  gsap.to(focusModeModalContent, {
    duration: 0.25,
    y: 25,
    scale: 0.96,
    opacity: 0,
    ease: "power2.in",
    onComplete: () => {
      focusModeModal.classList.remove("visible");
      focusModeModal.classList.add("hidden");
    },
  });
}

export function startFocusMode() {
  if (!isFocusModeActive) {
    isFocusModeActive = true;
    isPaused = false;
    document.body.classList.add("focus-mode-active");

    if (focusStartBtn) focusStartBtn.style.display = "none";
    if (focusPauseBtn) focusPauseBtn.style.display = "inline-flex";

    focusTimer = setInterval(() => {
      if (!isPaused) {
        focusTimeRemaining--;
        updateFocusTimerDisplay();

        if (focusTimeRemaining <= 0) {
          endFocusSession();
        }
      }
    }, 1000);

    closeFocusModeModal();
  }
}

export function pauseFocusMode() {
  isPaused = !isPaused;
  if (focusPauseBtn) {
    focusPauseBtn.innerHTML = isPaused
      ? '<i class="fas fa-play"></i> Resume'
      : '<i class="fas fa-pause"></i> Pause';
  }
}

export function resetFocusMode() {
  clearInterval(focusTimer);
  focusTimeRemaining = 25 * 60;
  isFocusModeActive = false;
  isPaused = false;
  document.body.classList.remove("focus-mode-active");

  if (focusStartBtn) focusStartBtn.style.display = "inline-flex";
  if (focusPauseBtn) {
    focusPauseBtn.style.display = "none";
    focusPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
  }

  updateFocusTimerDisplay();
}

function endFocusSession() {
  resetFocusMode();
  // Feedback for session end
  const headerBtn = document.getElementById("focus-mode-btn");
  if (headerBtn) {
    headerBtn.innerHTML = `<i class="fas fa-check-circle"></i> Session Complete!`;
    setTimeout(() => {
      if (!isFocusModeActive) {
        headerBtn.innerHTML = `<i class="fas fa-eye"></i> Focus Mode`;
      }
    }, 4000);
  }
}

function updateFocusTimerDisplay() {
  const minutes = Math.floor(focusTimeRemaining / 60);
  const seconds = focusTimeRemaining % 60;
  const timeString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  
  if (focusTimerDisplay) {
    focusTimerDisplay.textContent = timeString;
  }
  
  // Also update the header button if focus mode is running
  const headerBtn = document.getElementById("focus-mode-btn");
  if (headerBtn) {
    if (isFocusModeActive) {
      headerBtn.innerHTML = `<i class="fas fa-eye"></i> ${timeString}`;
      headerBtn.style.color = "var(--ph-new-light-green)";
      headerBtn.style.borderColor = "var(--ph-new-light-green)";
    } else {
      headerBtn.innerHTML = `<i class="fas fa-eye"></i> Focus Mode`;
      headerBtn.style.color = "";
      headerBtn.style.borderColor = "";
    }
  }
}

// Mood Selection Modal Toggling
export function showMoodSelection(taskItem, categoryKey, onMoodSelectedCallback) {
  if (!moodSelectionModal) return;
  
  // Save callback to window or bind option actions dynamically
  window.__currentTaskForMood = { taskItem, categoryKey, callback: onMoodSelectedCallback };
  
  moodSelectionModal.classList.remove("hidden");
  moodSelectionModal.classList.add("visible");

  gsap.fromTo(
    moodSelectionModal.querySelector(".modal-content"),
    { y: 25, scale: 0.96, opacity: 0 },
    {
      duration: 0.35,
      y: 0,
      scale: 1,
      opacity: 1,
      delay: 0.05,
      ease: "back.out(1.6)",
    }
  );
}

export function closeMoodSelection() {
  if (!moodSelectionModal) return;
  gsap.to(moodSelectionModal.querySelector(".modal-content"), {
    duration: 0.25,
    y: 25,
    scale: 0.96,
    opacity: 0,
    ease: "power2.in",
    onComplete: () => {
      moodSelectionModal.classList.remove("visible");
      moodSelectionModal.classList.add("hidden");
      window.__currentTaskForMood = null;
    },
  });
}

// Custom Username Prompt UI
export function showUsernameSetupPrompt(onConfirmCallback) {
  const promptElement = document.getElementById("custom-username-prompt");
  const inputElement = document.getElementById("custom-username-input");
  const securityQuestionInput = document.getElementById("custom-security-question-input");
  const securityAnswerInput = document.getElementById("custom-security-answer-input");
  const buttonElement = document.getElementById("confirm-username-btn");

  if (promptElement && inputElement && buttonElement) {
    promptElement.style.display = "flex";
    setTimeout(() => inputElement.focus(), 500);

    buttonElement.onclick = () => {
      const username = inputElement.value.trim();
      const securityQuestion = securityQuestionInput ? securityQuestionInput.value.trim() : "";
      const securityAnswer = securityAnswerInput ? securityAnswerInput.value.trim() : "";
      const errorMsg = document.getElementById("username-error-msg");
      if (errorMsg) errorMsg.classList.add("hidden");
      
      if (!username) {
        if (errorMsg) {
          errorMsg.textContent = "Please enter a username.";
          errorMsg.classList.remove("hidden");
        }
        return;
      }
      
      if (!securityQuestion || !securityAnswer) {
        if (errorMsg) {
          errorMsg.textContent = "Please enter a security question and answer.";
          errorMsg.classList.remove("hidden");
        }
        return;
      }
      
      onConfirmCallback({ username, securityQuestion, securityAnswer });
    };

    const skipBtn = document.getElementById("skip-username-btn");
    if (skipBtn) {
      skipBtn.onclick = () => {
        hideUsernameSetupPrompt();
      };
    }

    const handleEnter = (e) => {
      if (e.key === "Enter") {
        buttonElement.click();
      }
    };
    
    inputElement.onkeypress = handleEnter;
    if (securityQuestionInput) securityQuestionInput.onkeypress = handleEnter;
    if (securityAnswerInput) securityAnswerInput.onkeypress = handleEnter;
  }
}

export function hideUsernameSetupPrompt() {
  const promptElement = document.getElementById("custom-username-prompt");
  if (promptElement) {
    promptElement.style.display = "none";
  }
}

// Date Picker helper
export function showDatePicker(selectedDate) {
  const currentDateDisplayEl = document.getElementById("current-date-display");
  const calendarIconBtn = document.getElementById("calendar-icon-btn");
  const currentDateInputEl = document.getElementById("current-date-input");

  if (currentDateDisplayEl && calendarIconBtn && currentDateInputEl) {
    currentDateDisplayEl.classList.add("hidden");
    calendarIconBtn.classList.add("hidden");
    currentDateInputEl.classList.remove("hidden");
    currentDateInputEl.value = selectedDate.toLocaleDateString("en-CA");
    try {
      currentDateInputEl.showPicker();
    } catch (e) {
      currentDateInputEl.focus();
    }
  }
}

export function hideDatePicker() {
  const currentDateDisplayEl = document.getElementById("current-date-display");
  const calendarIconBtn = document.getElementById("calendar-icon-btn");
  const currentDateInputEl = document.getElementById("current-date-input");

  if (currentDateDisplayEl && calendarIconBtn && currentDateInputEl) {
    currentDateInputEl.classList.add("hidden");
    currentDateDisplayEl.classList.remove("hidden");
    calendarIconBtn.classList.remove("hidden");
  }
}

// Core Animations (Typed, GSAP float, ParticlesJS)
export function initAnimations() {
  if (typeof Typed === "function" && document.getElementById("hero-animated-title")) {
    new Typed("#hero-animated-title", {
      strings: [
        "Precision Task Management",
        "AI-Driven Priority Analysis",
        "Objective Decision Support",
        "Strategic Workflow Optimization",
        "Enhanced Productivity Intelligence",
      ],
      typeSpeed: 50,
      backSpeed: 25,
      loop: true,
      smartBackspace: true,
      showCursor: true,
      cursorChar: '<span style="color: var(--ph-new-dark-green); font-weight: 300;">|</span>',
    });
  }

  const logoIcon = document.querySelector(".logo-placeholder");
  if (logoIcon) {
    gsap.to(logoIcon, {
      y: "-2px",
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }

  if (typeof $ !== "undefined" && typeof $.fn.lettering === "function") {
    const behaviouralTitleEl = document.getElementById("behavioural-title");
    if (behaviouralTitleEl) $(behaviouralTitleEl).lettering();
  }

  if (typeof particlesJS !== "undefined" && document.getElementById("particles-js")) {
    particlesJS("particles-js", {
      particles: {
        number: { value: 25, density: { enable: true, value_area: 900 } },
        color: { value: ["#D5D8D3", "#E0E3DD", "#C8CBC5"] },
        shape: { type: "circle" },
        opacity: { value: 0.25, random: true, anim: { enable: false } },
        size: { value: 2.5, random: true, anim: { enable: false } },
        line_linked: {
          enable: true,
          distance: 200,
          color: "#DDE0DB",
          opacity: 0.1,
          width: 1,
        },
        move: {
          enable: true,
          speed: 0.8,
          direction: "none",
          random: true,
          straight: false,
          out_mode: "out",
          bounce: false,
        },
      },
      interactivity: {
        detect_on: "canvas",
        events: {
          onhover: { enable: true, mode: "repulse" },
          onclick: { enable: false },
          resize: true,
        },
        modes: { repulse: { distance: 40, duration: 0.3 } },
      },
      retina_detect: true,
    });
  }
}

// --- Custom Premium Calendar Dropdown Logic ---
let calendarViewDate = new Date();

export function setupCustomCalendar(selectedDate, onDateChange) {
  const dropdown = document.getElementById("custom-calendar-dropdown");
  const prevBtn = document.getElementById("cal-prev-month-btn");
  const nextBtn = document.getElementById("cal-next-month-btn");
  const todayBtn = document.getElementById("cal-today-btn");
  const calendarIcon = document.getElementById("calendar-icon-btn");
  const dateDisplay = document.getElementById("current-date-display");

  calendarViewDate = new Date(selectedDate);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (dropdown) {
      const isHidden = dropdown.classList.contains("hidden");
      if (isHidden) {
        calendarViewDate = new Date(selectedDate);
        renderCustomCalendar(selectedDate, onDateChange);
        dropdown.classList.remove("hidden");
      } else {
        dropdown.classList.add("hidden");
      }
    }
  };

  if (calendarIcon) {
    calendarIcon.addEventListener("click", toggleDropdown);
  }
  if (dateDisplay) {
    dateDisplay.addEventListener("click", toggleDropdown);
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
      renderCustomCalendar(selectedDate, onDateChange);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
      renderCustomCalendar(selectedDate, onDateChange);
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const today = new Date();
      onDateChange(today);
      if (dropdown) dropdown.classList.add("hidden");
    });
  }

  // Close calendar dropdown when clicking outside
  document.addEventListener("click", (e) => {
    const wrapper = document.querySelector(".date-controls-wrapper");
    if (dropdown && !dropdown.classList.contains("hidden") && wrapper && !wrapper.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });
}

export function renderCustomCalendar(selectedDate, onDateChange) {
  const headerText = document.getElementById("cal-month-year-display");
  const daysGrid = document.getElementById("calendar-days-grid");
  if (!headerText || !daysGrid) return;

  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  const today = new Date();

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  headerText.textContent = `${monthsList[month]} ${year}`;

  daysGrid.innerHTML = "";

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotalDays = new Date(year, month, 0).getDate();

  // Render trailing days of previous month
  for (let i = firstDayIndex; i > 0; i--) {
    const dayVal = prevTotalDays - i + 1;
    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day prev-next-month";
    dayEl.textContent = dayVal;
    dayEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const targetDate = new Date(year, month - 1, dayVal);
      onDateChange(targetDate);
      const dropdown = document.getElementById("custom-calendar-dropdown");
      if (dropdown) dropdown.classList.add("hidden");
    });
    daysGrid.appendChild(dayEl);
  }

  // Render active month days
  for (let day = 1; day <= totalDays; day++) {
    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day";
    dayEl.textContent = day;

    const isSelected = 
      day === selectedDate.getDate() && 
      month === selectedDate.getMonth() && 
      year === selectedDate.getFullYear();
      
    if (isSelected) {
      dayEl.classList.add("selected");
    }

    const isToday = 
      day === today.getDate() && 
      month === today.getMonth() && 
      year === today.getFullYear();
      
    if (isToday) {
      dayEl.classList.add("today-highlight");
    }

    dayEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const targetDate = new Date(year, month, day);
      onDateChange(targetDate);
      const dropdown = document.getElementById("custom-calendar-dropdown");
      if (dropdown) dropdown.classList.add("hidden");
    });

    daysGrid.appendChild(dayEl);
  }

  // Render leading days of next month
  const cellsFilled = firstDayIndex + totalDays;
  const remainingCells = 42 - cellsFilled;
  for (let i = 1; i <= remainingCells; i++) {
    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day prev-next-month";
    dayEl.textContent = i;
    dayEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const targetDate = new Date(year, month + 1, i);
      onDateChange(targetDate);
      const dropdown = document.getElementById("custom-calendar-dropdown");
      if (dropdown) dropdown.classList.add("hidden");
    });
    daysGrid.appendChild(dayEl);
  }
}
