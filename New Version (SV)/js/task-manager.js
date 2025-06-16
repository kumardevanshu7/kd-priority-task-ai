/* === TASK MANAGEMENT MODULE === */

class TaskManager {
  constructor() {
    this.currentTasks = [];
    this.analyzedTasks = null;
    this.selectedDate = new Date();
    this.isLoading = false;
  }

  // Initialize task manager
  initialize() {
    this.setupEventListeners();
    this.loadTasksForDate(this.selectedDate);
  }

  // Set up event listeners
  setupEventListeners() {
    // Date navigation
    const prevDayBtn = DOMUtils.getElement('#prev-day-btn');
    const nextDayBtn = DOMUtils.getElement('#next-day-btn');
    const dateDisplay = DOMUtils.getElement('#current-date-display');

    if (prevDayBtn) {
      prevDayBtn.addEventListener('click', () => this.navigateDate(-1));
    }
    if (nextDayBtn) {
      nextDayBtn.addEventListener('click', () => this.navigateDate(1));
    }
    if (dateDisplay) {
      dateDisplay.addEventListener('click', () => this.showDatePicker());
    }

    // Task input
    const taskInput = DOMUtils.getElement('#task-input-field-modal');
    if (taskInput) {
      taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addCurrentTask();
        }
      });
    }

    // Modal buttons
    const addTaskBtn = DOMUtils.getElement('#add-current-task-modal-btn');
    const analyzeBtn = DOMUtils.getElement('#analyze-tasks-modal-btn');
    
    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', () => this.addCurrentTask());
    }
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => this.analyzeTasks());
    }
  }

  // Navigate to different date
  navigateDate(days) {
    this.selectedDate = DateUtils.addDays(this.selectedDate, days);
    this.updateDateDisplay();
    this.loadTasksForDate(this.selectedDate);
  }

  // Update date display
  updateDateDisplay() {
    const dateDisplay = DOMUtils.getElement('#current-date-display');
    if (dateDisplay) {
      dateDisplay.textContent = DateUtils.formatDateForDisplay(this.selectedDate);
    }
  }

  // Show date picker
  showDatePicker() {
    const dateInput = DOMUtils.getElement('#current-date-input');
    const dateDisplay = DOMUtils.getElement('#current-date-display');
    
    if (dateInput && dateDisplay) {
      dateInput.value = DateUtils.formatDate(this.selectedDate);
      DOMUtils.hide(dateDisplay);
      DOMUtils.show(dateInput);
      dateInput.focus();

      const handleDateChange = () => {
        if (dateInput.value) {
          this.selectedDate = new Date(dateInput.value);
          this.updateDateDisplay();
          this.loadTasksForDate(this.selectedDate);
        }
        DOMUtils.show(dateDisplay);
        DOMUtils.hide(dateInput);
      };

      dateInput.addEventListener('change', handleDateChange, { once: true });
      dateInput.addEventListener('blur', handleDateChange, { once: true });
    }
  }

  // Add current task to list
  addCurrentTask() {
    const taskInput = DOMUtils.getElement('#task-input-field-modal');
    const tasksList = DOMUtils.getElement('#current-tasks-list-modal');
    
    if (!taskInput || !tasksList) return;

    const taskText = taskInput.value.trim();
    if (!taskText) {
      this.showAlert('Please enter a task', 'warning');
      return;
    }

    // Check for duplicates
    if (this.currentTasks.some(task => task.toLowerCase() === taskText.toLowerCase())) {
      this.showAlert('This task already exists', 'warning');
      return;
    }

    // Add task to array
    this.currentTasks.push(taskText);
    
    // Update UI
    this.renderCurrentTasks();
    taskInput.value = '';
    taskInput.focus();

    // Save to local storage as draft
    StorageUtils.set(STORAGE_KEYS.draftTasks, this.currentTasks);
  }

  // Remove task from current list
  removeCurrentTask(index) {
    if (index >= 0 && index < this.currentTasks.length) {
      this.currentTasks.splice(index, 1);
      this.renderCurrentTasks();
      StorageUtils.set(STORAGE_KEYS.draftTasks, this.currentTasks);
    }
  }

  // Render current tasks list
  renderCurrentTasks() {
    const tasksList = DOMUtils.getElement('#current-tasks-list-modal');
    if (!tasksList) return;

    tasksList.innerHTML = '';

    this.currentTasks.forEach((task, index) => {
      const taskDiv = DOMUtils.createElement('div', '', task);
      
      const removeIcon = DOMUtils.createElement('i', 'fas fa-times');
      removeIcon.addEventListener('click', () => this.removeCurrentTask(index));
      
      taskDiv.appendChild(removeIcon);
      tasksList.appendChild(taskDiv);
    });
  }

  // Analyze tasks using AI
  async analyzeTasks() {
    if (this.currentTasks.length === 0) {
      this.showAlert('Please add some tasks first', 'warning');
      return;
    }

    this.setLoading(true);

    try {
      const analysisResult = await this.callGeminiAPI(this.currentTasks);
      
      if (analysisResult && analysisResult.success) {
        this.analyzedTasks = analysisResult.data;
        await this.saveTasksToDatabase();
        this.renderAnalyzedTasks();
        this.closeTaskModal();
        this.showAlert('Tasks analyzed and saved successfully!', 'success');
      } else {
        throw new Error(analysisResult?.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Task analysis error:', error);
      this.showAlert('Failed to analyze tasks. Please try again.', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  // Call Gemini AI API
  async callGeminiAPI(tasks) {
    try {
      const prompt = this.buildAnalysisPrompt(tasks);
      
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings
      });

      const response = await result.response;
      const text = response.text();
      
      return {
        success: true,
        data: JSON.parse(text)
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Build analysis prompt for AI
  buildAnalysisPrompt(tasks) {
    return `
Analyze these tasks and categorize them by priority. Return a JSON object with the following structure:

{
  "Very Important Tasks": [
    {
      "task": "task description",
      "reason": "why this is very important",
      "emoji": "relevant emoji",
      "priorityScore": 95,
      "confidenceLevel": 90
    }
  ],
  "High Priority Tasks": [...],
  "Good-Good Priority": [...],
  "Low Priority Tasks": [...]
}

Tasks to analyze:
${tasks.map((task, index) => `${index + 1}. ${task}`).join('\n')}

Guidelines:
- Very Important: Urgent, critical, deadline-driven tasks
- High Priority: Important but not urgent, significant impact
- Good-Good Priority: Moderate importance, can be scheduled
- Low Priority: Nice to have, low impact, flexible timing

Provide priority scores (1-100) and confidence levels (1-100) for each task.
`;
  }

  // Save tasks to database
  async saveTasksToDatabase() {
    if (!this.analyzedTasks) return;

    try {
      const result = await firebaseService.saveDailyTasks(this.selectedDate, this.analyzedTasks);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Clear draft tasks
      StorageUtils.remove(STORAGE_KEYS.draftTasks);
      this.currentTasks = [];
      
      return true;
    } catch (error) {
      console.error('Save tasks error:', error);
      throw error;
    }
  }

  // Load tasks for specific date
  async loadTasksForDate(date) {
    this.setLoading(true);

    try {
      const result = await firebaseService.getDailyTasks(date);
      
      if (result.success) {
        this.analyzedTasks = result.data;
        this.renderAnalyzedTasks();
        await this.checkCarryForward();
      } else {
        console.error('Load tasks error:', result.error);
        this.analyzedTasks = null;
        this.renderAnalyzedTasks();
      }
    } catch (error) {
      console.error('Load tasks error:', error);
      this.showAlert('Failed to load tasks', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  // Render analyzed tasks in columns
  renderAnalyzedTasks() {
    Object.keys(categoryUiMap).forEach(category => {
      const columnInfo = categoryUiMap[category];
      const column = DOMUtils.getElement(`#${columnInfo.id} ul`);
      
      if (column) {
        column.innerHTML = '';
        
        if (this.analyzedTasks && this.analyzedTasks[category]) {
          this.analyzedTasks[category].forEach(task => {
            this.renderTaskItem(task, column, category);
          });
        }
      }
    });

    this.updateProgressBar();
  }

  // Render individual task item
  renderTaskItem(taskItem, container, category) {
    const li = DOMUtils.createElement('li');
    
    if (taskItem.completed) {
      DOMUtils.addClass(li, 'completed');
    }
    if (taskItem.isCarriedForward) {
      DOMUtils.addClass(li, 'carried-forward');
    }

    // Task content
    const mainContent = DOMUtils.createElement('div', 'task-main-content');
    
    const textContainer = DOMUtils.createElement('div', 'task-text-container');
    const taskText = DOMUtils.createElement('div', 'task-text', taskItem.task);
    textContainer.appendChild(taskText);

    if (taskItem.reason) {
      const reason = DOMUtils.createElement('div', 'task-reason', taskItem.reason);
      textContainer.appendChild(reason);
    }

    if (taskItem.isCarriedForward && taskItem.carryForwardCount) {
      const carryCount = DOMUtils.createElement('div', 'carry-forward-count');
      const ordinal = StringUtils.getOrdinal(taskItem.carryForwardCount + 1);
      carryCount.textContent = `↻ ${ordinal} time running this task`;
      textContainer.appendChild(carryCount);
    }

    // Task actions
    const actions = DOMUtils.createElement('div', 'task-actions');
    
    const completeIcon = DOMUtils.createElement('i', 
      `fas ${taskItem.completed ? 'fa-check-circle' : 'fa-circle'} task-complete-icon`
    );
    completeIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleTaskCompletion(taskItem, li, completeIcon);
    });

    const abortIcon = DOMUtils.createElement('i', 'fas fa-times task-abort-icon');
    abortIcon.title = 'Abort this task';
    abortIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.abortTask(taskItem, li, category);
    });

    actions.appendChild(completeIcon);
    actions.appendChild(abortIcon);

    mainContent.appendChild(textContainer);
    mainContent.appendChild(actions);
    li.appendChild(mainContent);

    // Add mood indicator if present
    if (taskItem.moodEmoji) {
      const moodIndicator = DOMUtils.createElement('span', 'task-mood-indicator', taskItem.moodEmoji);
      li.appendChild(moodIndicator);
    }

    container.appendChild(li);
  }

  // Toggle task completion
  async toggleTaskCompletion(taskItem, li, icon) {
    taskItem.completed = !taskItem.completed;

    // Update UI immediately
    DOMUtils.toggleClass(li, 'completed');
    icon.className = `fas ${taskItem.completed ? 'fa-check-circle' : 'fa-circle'} task-complete-icon`;

    if (taskItem.completed) {
      // Show mood selection
      this.showMoodSelection(taskItem);
    } else {
      // Remove mood data
      delete taskItem.mood;
      delete taskItem.moodEmoji;
      const moodIndicator = li.querySelector('.task-mood-indicator');
      if (moodIndicator) {
        moodIndicator.remove();
      }
      
      // Save immediately
      await this.saveTasksToDatabase();
    }

    this.updateProgressBar();
  }

  // Show mood selection modal
  showMoodSelection(taskItem) {
    // Implementation for mood selection modal
    // This would create and show a modal with mood options
    console.log('Show mood selection for task:', taskItem.task);
  }

  // Abort task
  async abortTask(taskItem, li, category) {
    const confirmed = await this.showConfirmDialog(
      'Abort Task?',
      'This task will be removed and marked as aborted.',
      'Yes, abort it!'
    );

    if (confirmed) {
      try {
        // Remove from data structure
        const categoryTasks = this.analyzedTasks[category];
        const taskIndex = categoryTasks.findIndex(task => 
          task.task === taskItem.task && task.emoji === taskItem.emoji
        );
        
        if (taskIndex !== -1) {
          categoryTasks.splice(taskIndex, 1);
        }

        // Remove from UI
        li.remove();

        // Update progress and save
        this.updateProgressBar();
        await this.saveTasksToDatabase();

        this.showAlert('Task Aborted', 'Task has been permanently removed from your list.');
      } catch (error) {
        console.error('Error aborting task:', error);
        this.showAlert('Error', 'Failed to abort task. Please try again.');
      }
    }
  }

  // Update progress bar
  updateProgressBar() {
    if (!this.analyzedTasks) return;

    let totalTasks = 0;
    let completedTasks = 0;

    Object.values(this.analyzedTasks).forEach(categoryTasks => {
      if (Array.isArray(categoryTasks)) {
        totalTasks += categoryTasks.length;
        completedTasks += categoryTasks.filter(task => task.completed).length;
      }
    });

    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const progressFill = DOMUtils.getElement('#overall-progress-fill');
    const progressText = DOMUtils.getElement('#overall-progress-text');
    
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }
    if (progressText) {
      progressText.textContent = `${completedTasks}/${totalTasks} tasks completed (${percentage}%)`;
    }
  }

  // Check for carry forward tasks
  async checkCarryForward() {
    // Implementation for checking carry forward tasks
    console.log('Checking for carry forward tasks...');
  }

  // Utility methods
  setLoading(loading) {
    this.isLoading = loading;
    const loadingElements = DOMUtils.getElements('.loading-spinner');
    loadingElements.forEach(el => {
      if (loading) {
        DOMUtils.show(el);
      } else {
        DOMUtils.hide(el);
      }
    });
  }

  showAlert(message, type = 'info') {
    // Implementation for showing alerts
    console.log(`${type.toUpperCase()}: ${message}`);
  }

  async showConfirmDialog(title, message, confirmText) {
    // Implementation for confirmation dialog
    return confirm(`${title}\n\n${message}`);
  }

  closeTaskModal() {
    const modal = DOMUtils.getElement('#task-input-modal');
    if (modal) {
      DOMUtils.removeClass(modal, 'visible');
    }
  }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TaskManager;
}
