# PriorityTask AI

PriorityTask AI is a modern, AI-powered task management and productivity application that uses advanced multi-factor assessment to categorize and prioritize your daily tasks. Built with a stunning, premium interface and real-time cloud synchronization, it helps you focus on what truly matters.

## ✨ Key Features

- **🧠 AI-Driven Prioritization**: Powered by Groq, the app analyzes your tasks based on Urgency (45%), Importance (40%), and Impact (15%).
- **📋 Intelligent Categorization**: Tasks are automatically sorted into:
  - 🔴 **Very Important Tasks**: Non-negotiable, critical deadlines.
  - 🔵 **High Priority Tasks**: Strategic tasks that drive long-term goals.
  - 🟢 **Good-Good Priority**: Habits, wellness, and personal growth.
  - 🟣 **Low Priority Tasks**: Chores and flexible activities.
- **⏱️ Focus Mode**: Built-in Pomodoro-style timer to help you execute tasks without distraction.
- **🔥 Streaks & Analytics**: Visual progress bars, daily streak counters, and mood tracking to keep you motivated.
- **☁️ Cloud Sync**: Real-time data synchronization using Firebase, so your tasks are available everywhere.
- **🔐 Custom Security**: Secure your account data with a custom security question, preventing accidental data wipes.
- **📱 Premium Mobile-First UI**: Crafted with a beautiful, minimalist glassmorphism design that looks incredible on any device.

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (Vanilla + Custom Variables), Vanilla JavaScript (ES6 Modules)
- **Animations**: GSAP (GreenSock), AOS (Animate on Scroll)
- **Backend & Database**: Firebase Authentication & Cloud Firestore
- **AI Integration**: Groq API (Advanced LLM processing)
- **Icons & Typography**: FontAwesome 6, Google Fonts (Plus Jakarta Sans, Outfit)

## 🚀 Getting Started Locally

To run this project locally, you don't need any complex build tools. Since it uses standard ES6 modules, you just need a local web server to prevent CORS issues.

1. **Clone the repository** (if applicable) or download the files.
2. **Open the project folder**.
3. **Run a local development server**. You can use one of the following methods:
   - **VS Code**: Install the "Live Server" extension, right-click `index.html`, and click "Open with Live Server".
   - **Node.js**: Run `npx serve .` in the terminal.
   - **Python**: Run `python -m http.server 8000` in the terminal.
4. Open your browser and navigate to the local address (e.g., `http://localhost:8000`).

## ⚙️ Configuration (Firebase & AI)

Before deploying or running for production, ensure you have set up your API keys in the appropriate configuration files (e.g., `js/db-service.js` or `js/ai-service.js`):
- **Firebase Config**: You will need a Firebase project with Authentication (Email/Password or Google) and Firestore Database enabled.
- **Groq API Key**: Required for the AI prioritization engine to function.

## 🌐 Deploying to Vercel

Vercel is the easiest way to host this static web application for free.

### Method 1: Using the Vercel Dashboard (Recommended)
1. Push your project code to a **GitHub** repository.
2. Go to [Vercel.com](https://vercel.com) and log in or sign up.
3. Click on **"Add New..."** and select **"Project"**.
4. Import your GitHub repository.
5. In the "Configure Project" screen, leave the Framework Preset as **"Other"**.
6. The Build Command and Output Directory can be left blank (or default) since this is a static HTML/JS site.
7. Click **Deploy**. Vercel will instantly build and host your site on a live URL!

### Method 2: Using the Vercel CLI
1. Open your terminal in the project folder.
2. Install the Vercel CLI globally: `npm i -g vercel`
3. Run the deployment command: `vercel`
4. Follow the interactive prompts to link your account and deploy.
5. To deploy to production, run: `vercel --prod`

## 🛡️ Security Note

This app includes a "Delete All Progress" feature. To protect users from accidental wipes, it enforces a dynamic security question (configured during initial account setup). Ensure Firebase security rules are properly configured to prevent unauthorized database access.
