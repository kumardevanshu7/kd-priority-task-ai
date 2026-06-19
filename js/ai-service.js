// --- Groq AI Service for PriorityTask ---
import { GROQ_API_KEY, GROQ_MODEL_NAMES } from "./config.js";
import { formatDateForDisplay } from "./utils.js";

/**
 * Calls Groq API to categorize and prioritize a list of raw tasks.
 * Keep the function name compatible with index.html imports.
 * @param {string[]} tasksToAnalyze 
 * @param {Date} selectedDate 
 * @returns {Promise<object>} The categorized task object
 */
export async function callGeminiAPI(tasksToAnalyze, selectedDate) {
  const taskListString = tasksToAnalyze
    .map((task) => `- ${task}`)
    .join("\n");
  const currentDate = formatDateForDisplay(selectedDate);
  const prompt = `
      You are "PriorityTask AI", a world-class cognitive task prioritization engine and productivity analyst.
      Your goal is to parse, analyze, and categorize the user's raw tasks with absolute precision, objectivity, and strategic clarity.

      TASKS TO ANALYZE:
      ${taskListString}

      DATE CONTEXT: ${currentDate}

      COGNITIVE EVALUATION CRITERIA:
      For every task, compute a hidden multi-factor score:
      - Urgency (U): How time-critical is this task specifically on ${currentDate}? Tasks due today, tomorrow, or with clear time indicators must be scored highly on Urgency.
      - Importance (I): Long-term value, career progression, health, financial or legal consequences, or core commitments.
      - Impact (Im): The degree of positive momentum or blockage resolution this task generates.
      
      Calculate the final "priority_score" as: (Urgency * 0.45) + (Importance * 0.40) + (Impact * 0.15), rounded to the nearest integer (1 to 10 scale).

      ENHANCED PRIORITY CLASSIFICATION CATEGORIES:

      1. **Very Important Tasks** (Composite Score: 8-10)
         - Criteria: Critical and urgent. Non-negotiable tasks that must be done TODAY. Neglecting them causes immediate, severe, or irreversible setbacks (e.g., missed deadlines, legal/financial penalties, health emergencies, blocking key team members).
         - Example: "Finish client project deck due today by 5 PM", "Doctor checkup for chest pain", "Pay electricity bill today".

      2. **High Priority Tasks** (Composite Score: 6-7)
         - Criteria: Important but slightly flexible. High strategic value tasks that drive projects or goals forward. Doing them today creates massive leverage for tomorrow, but missing them won't trigger immediate disaster.
         - Example: "Prepare presentation for tomorrow's sync", "Submit application for scholarship (due in 2 days)", "Core system refactoring".

      3. **Good-Good Priority** (Composite Score: 4-5)
         - Criteria: Long-term investments in yourself. Wellness, personal growth, skill-building, preventative maintenance, health habits, and professional network nurturing.
         - Example: "Go to the gym for 45 mins", "Read 5 pages of atomic habits book", "Organize workspace desk", "Call old colleague to stay in touch".

      4. **Low Priority Tasks** (Composite Score: 1-3)
         - Criteria: Optional, routine administrative chores, low-impact tasks, or recreational activities. Can be deferred or delegated without any negative impact.
         - Example: "Watch next episode of TV show", "Reorganize old emails from 2024", "Look at new mouse pads online".

      DETAILED FIELD REQUIREMENTS FOR EACH TASK:
      1. "task": MUST exactly match the original user input text. No modifications, corrections, or truncations.
      2. "emoji": A single, contextually perfect, modern emoji representing the specific activity (e.g., 🩺 for medical, 💻 for programming, 🏋️ for exercise, 📑 for taxes). Avoid using the same emoji repeatedly unless tasks are identical.
      3. "reason": A highly analytical, custom 15-25 word explanation. It MUST explain the logic behind the categorization and priority score using the task's context and constraints. Avoid generic phrases like "This is important because it is urgent." Instead, write like an executive assistant: "Immediate deadline today; critical path item that prevents launch delay. Complete first." or "Vital for physical health and daily routine consistency; flexible timing but maintains active habits."
      4. "priority_score": The calculated composite score (1-10) based on Urgency, Importance, and Impact.
      5. "confidence": The certainty of your classification (1-10) based on the clarity of the task context.

      JSON STRUCTURE & DYNAMIC QUOTES:
      Output a valid JSON object matching this schema.
      The "quotes" object MUST contain a custom, highly relevant, and inspiring micro-quote for each category, tailored specifically to the list of tasks to analyze. Avoid generic placeholder quotes.

      {
        "Very Important Tasks": [
          {
            "task": "...",
            "emoji": "...",
            "reason": "...",
            "priority_score": 9,
            "confidence": 10,
            "completed": false
          }
        ],
        "High Priority Tasks": [ ... ],
        "Good-Good Priority": [ ... ],
        "Low Priority Tasks": [ ... ],
        "quotes": {
          "Very Important Tasks": "A personalized motivational message based on today's urgent tasks...",
          "High Priority Tasks": "A personalized motivational message based on today's strategic goals...",
          "Good-Good Priority": "A personalized motivational message based on today's self-care and habits...",
          "Low Priority Tasks": "A personalized motivational message based on today's routine tasks..."
        }
      }

      CRITICAL RULES:
      - Analyze the tasks relative to each other and the DATE CONTEXT.
      - Return empty arrays [] for categories with no matching tasks.
      - Do NOT wrap the JSON in markdown code blocks (\`\`\`json ... \`\`\`). Output ONLY raw, valid JSON.`;

  let lastError = null;

  for (const groqModelName of GROQ_MODEL_NAMES) {
    try {
      console.log(`Attempting task prioritization with Groq model: ${groqModelName}`);
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout (8s)")), 8000)
      );

      const fetchPromise = (async () => {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: groqModelName,
            messages: [
              { role: "user", content: prompt }
            ],
            temperature: 0.6,
            response_format: { type: "json_object" }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Groq HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("Groq returned empty content.");
        }
        return JSON.parse(content);
      })();

      const result = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]);

      return result;
    } catch (error) {
      console.warn(`Groq Model ${groqModelName} failed/overloaded:`, error.message || error);
      lastError = error;
      // Continue to next Groq model
    }
  }

  console.error("All Groq models in fallback chain failed:", lastError);
  throw lastError;
}
