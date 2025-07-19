# Fitness Tracker PWA

A modern, offline-first Progressive Web App (PWA) designed for simplicity and power. Track your workouts, manage your training schedule, and analyze your progress with a clean, intuitive interface. Built with vanilla HTML, CSS, and JavaScript, and powered by Firebase for seamless, real-time data syncing.

**Live App: [https://TutorDeckNT.github.io/fitness-tracker/](https://TutorDeckNT.github.io/fitness-tracker/)**

## ✨ Core Features

This application is packed with features designed to make workout tracking efficient and insightful.

### 🏋️‍♂️ Workout & Plan Management
- **Custom Workout Plans:** Create, edit, and delete multiple, detailed workout plans.
- **AI-Powered Transcription:** Use the power of Google's Gemini AI to automatically transcribe a workout plan from an uploaded file (`.pdf`, `.txt`, etc.) directly into the app's format.
- **Manual & Import Options:** Add plans manually with a dedicated editor, or import plans from a `.json` file.
- **Flexible Exercise Details:** Specify exercises, warmup sets, working sets, rep ranges, RPE targets, and rest times for each plan.
- **Weekly Schedule:** Assign your created workout plans to specific days of the week for a structured routine.
- **Drag-and-Drop Reordering:** Easily reorder exercises within a workout plan to match your preferred flow.

### 📱 Live Workout Tracking
- **Interactive Logging:** Log your sets with a simple tap. The app displays your previous performance for the same set to encourage progressive overload.
- **Integrated Rest Timer:** A checkmark on a set automatically suggests starting a rest timer. The timer can be run in a fullscreen overlay or as a minimized widget.

### 📊 Progress Analytics & Data Tools
- **At-a-Glance Dashboard:** View key stats like total workouts completed, total weight lifted, and total sets performed.
- **Interactive Charts:** Visualize your progress with charts for "Total Weight Lifted Over Time" and "Estimated 1RM Over Time" for specific exercises.
- **Personal Record (PR) Finder:** Instantly find your best-ever set (based on estimated 1-Rep Max) for any exercise in your history.
- **Complete Workout History:** Browse your entire workout history in a carousel or use an interactive calendar to jump to a specific date.
- **Data Management:** A dedicated page to clean up your data. Merge duplicate exercise names (e.g., "Bench Press" vs. "Benchpress") or delete all records of an exercise from your history.

### 🚀 Technology & PWA
- **Offline First:** Thanks to a robust service worker, the app is fully functional offline. Any changes you make will sync automatically when you reconnect.
- **Installable (PWA):** Install the app on your phone or desktop for a native, app-like experience directly from your home screen or dock.
- **Google Authentication:** Securely sign in with your Google account to keep your data private and synced across all your devices.
- **Modern & Responsive UI:** A clean, glassmorphism-style interface that is fully responsive and works beautifully on any screen size.

## 🛠️ Tech Stack

-   **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
-   **Charts:** [Chart.js](https://www.chartjs.org/) with `chartjs-adapter-date-fns`
-   **Backend & Database:** [Firebase](https://firebase.google.com/)
    -   **Authentication:** For secure Google Sign-In.
    -   **Firestore:** As the real-time NoSQL database.
-   **AI:** [Google Gemini API](https://ai.google.dev/) for workout transcription.
-   **PWA:** Service Workers for caching, offline capabilities, and background timers.

## 👨‍💻 Running Locally

Interested in contributing or running your own instance? Follow these steps.

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/TutorDeckNT/fitness-tracker.git
    cd fitness-tracker
    ```

2.  **Run with a Local Server:**
    Because the app uses ES6 modules and fetches resources, you need to run it through a local server. Opening the `index.html` file directly from the filesystem will not work. A great, simple tool for this is the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension for VS Code.

3.  **Set up Firebase:**
    *   Create a new project in the [Firebase Console](https://console.firebase.google.com/).
    *   In the **Authentication** tab, enable **Google** as a Sign-in provider.
    *   In the **Firestore Database** tab, create a new database. Start in **test mode** for easy setup (you can add security rules later).
    *   Go to your Project Settings (click the ⚙️ icon) and scroll down to the "Your apps" card.
    *   Click the web icon (`</>`) to register a new web app.
    *   After registering, Firebase will provide you with a `firebaseConfig` object. **Copy this object.**

4.  **Add Your Firebase Config:**
    You need to replace the placeholder `firebaseConfig` object in the `<script>` tags of the following four files with the one you copied from your Firebase project:
    -   `index.html`
    -   `edit-workouts.html`
    -   `progress-analytics.html`
    -   `manage-data.html`

    It will look like this:
    ```html
    <script>
    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
    };

    firebase.initializeApp(firebaseConfig);
    // ... rest of the script
    </script>
    ```

5.  **(Optional) Set up Gemini API Key:**
    To use the "Transcribe with AI" feature, you need a Google Gemini API key.
    *   Get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey).
    *   The key is entered directly into the UI when you use the feature; no code changes are needed.

You should now have a fully functional local instance of the Fitness Tracker!

## 📁 Project Structure

```
/
├── index.html                  # Main dashboard and workout logging
├── edit-workouts.html          # Creating/editing plans and schedule
├── progress-analytics.html     # Analytics, charts, and history
├── manage-data.html            # Tool for merging/deleting exercise names
│
├── style.css                   # Main stylesheet
├── edit-workouts-style.css     # Styles for the plan editor page
├── progress-analytics-style.css# Styles for the analytics page
├── manage-data-style.css       # Styles for the data management page
│
├── sw.js                       # The Service Worker for PWA/offline functionality
├── manifest.json               # PWA manifest file
│
└── images/
    ├── eagle.png               # App icon
    └── Rosecurve.png           # AI icon
```

## 🤝 Contributing

Contributions are welcome! If you have a feature request, bug report, or want to improve the code:

1.  **Fork the repository.**
2.  Create a new branch (`git checkout -b feature/YourAmazingFeature`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some YourAmazingFeature'`).
5.  Push to the branch (`git push origin feature/YourAmazingFeature`).
6.  Open a **Pull Request**.
