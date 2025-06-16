# Dev Guide - PriorityHelp AI

Technical documentation for developers.

## Project Structure

```
📄 Main Files
├── index.html          # Main app
├── landingpage.html    # Landing page  
└── login.html          # Authentication

📁 CSS Modules
├── variables.css       # Colors, fonts
├── base.css           # Basic styles
├── components.css     # UI components
├── layout.css         # App layout
└── responsive.css     # Mobile styles

📁 JS Modules  
├── config.js          # API keys, settings
├── utils.js           # Helper functions
├── firebase-service.js # Database operations
├── task-manager.js    # Task logic
└── main-app.js        # App initialization
```

## Database Schema

### Firestore Collections

**users/{userId}**
```javascript
{
  fullName: string,
  email: string, 
  displayName: string,
  usernameSetupComplete: boolean,
  createdAt: Timestamp
}
```

**dailyTasks/{userId}-{YYYY-MM-DD}**
```javascript
{
  "Very Important Tasks": [
    {
      task: string,
      emoji: string,
      reason: string,
      priorityScore: number,
      completed: boolean,
      mood: string,
      moodEmoji: string
    }
  ],
  "High Priority Tasks": [...],
  "Good-Good Priority": [...], 
  "Low Priority Tasks": [...]
}
```

**user-moods/{userId}-{YYYY-MM-DD}**
```javascript
{
  moods: [
    {
      mood: string,
      emoji: string,
      task: string,
      timestamp: string
    }
  ]
}
```

**userStreaks/{userId}**
```javascript
{
  currentStreak: number,
  longestStreak: number,
  lastUpdateDate: string,
  streakHistory: {...}
}
```

## Application Flow

1. **Landing** → **Auth** → **Main App**
2. **Add Tasks** → **AI Analysis** → **Display** → **Complete** → **Mood Track**
3. **Data Save** → **Streak Update** → **Analytics**

## Key Configuration

**js/config.js**
```javascript
const GEMINI_API_KEY = "your-api-key";
const firebaseConfig = {...};
const APP_CONFIG = {
  streakThreshold: 70,
  carryForwardDays: 30
};
```

## Security Rules

```javascript
// Users can only access their own data
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}
match /dailyTasks/{userId}-{date} {
  allow read, write: if request.auth.uid == userId;
}
```

## Setup

1. Add API keys in `js/config.js`
2. Configure Firebase project
3. Deploy Firestore security rules
4. Open `landingpage.html` to start
