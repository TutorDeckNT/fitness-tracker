# Fitness Tracker PWA

A modern, offline-first Progressive Web App (PWA) to track your workouts, manage your training schedule, and analyze your progress. Built with vanilla HTML, CSS, and JavaScript, and powered by Firebase for seamless data syncing.

**Live App: [https://manav0-0.github.io/fitness-tracker/](https://manav0-0.github.io/fitness-tracker/)**

 
*(Suggestion: You can replace this with a screenshot of your app)*

## ✨ Features

*   **Modern & Responsive UI:** A clean, glassmorphism-style interface that works beautifully on desktop and mobile.
*   **PWA & Offline First:** Install the app on your phone or desktop for an app-like experience. Thanks to the service worker, core functionalities are available even without an internet connection.
*   **Google Authentication:** Securely sign in with your Google account to keep your data private and synced.
*   **Custom Workout Plans:** Create, edit, and delete multiple workout plans with specific exercises, sets, reps, RPE targets, and rest times.
*   **AI-Powered Transcription:** Use the power of Google's Gemini AI to automatically transcribe a workout plan from an uploaded file (`.pdf`, `.txt`, etc.) into the app's format.
*   **Weekly Schedule:** Assign your created workout plans to specific days of the week for a structured routine.
*   **Interactive Workout Logging:** Log your sets with a simple tap, which can trigger a built-in rest timer. The app remembers your previous performance for progressive overload.
*   **Progress Analytics:** Dive into your workout history with a dedicated analytics page.
    *   View at-a-glance stats like total workouts, volume, and sets.
    *   Use the **Personal Record Finder** to see your best lift for any exercise.
    *   Browse your complete workout history via a carousel or an interactive calendar.
    *   Delete incorrect workout entries directly from your history.

## 🚀 How to Use

1.  **Visit the Website:** Open [https://manav0-0.github.io/fitness-tracker/](https://manav0-0.github.io/fitness-tracker/).
2.  **Sign In:** Use the "Sign In with Google" button to create an account and start tracking.
3.  **(Optional) Install the App:** Your browser may prompt you to "Install" the app or "Add to Home Screen." This will add a shortcut to your device for easy access.
4.  **Create a Plan:**
    *   Navigate to **Manage Plan**.
    *   Use the **AI Transcriber** by providing a [free Google Gemini API key](https://aistudio.google.com/app/apikey) and uploading a file.
    *   Or, click **Add Workout** to build a plan manually.
5.  **Set Your Schedule:** In the "Manage Plan" screen, assign your workouts to the days of the week.
6.  **Start a Workout:**
    *   Back on the main page, your workout for the current day will be displayed. Click it to begin.
    *   Alternatively, select any workout from the dropdown menu.
7.  **Track Your Progress:** Click the **View Your Progress** card to go to the analytics page and see how you're improving over time.

## 🛠️ Technologies Used

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
*   **Backend & Database:** [Firebase](https://firebase.google.com/) (Authentication & Firestore)
*   **AI:** [Google Gemini API](https://ai.google.dev/) for workout transcription
*   **PWA:** Service Workers for caching and offline capabilities

## 👨‍💻 For Developers (Running Locally)

Interested in contributing or running your own instance?

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/manav0-0/fitness-tracker.git
    ```
2.  **Set up Firebase:**
    *   Create a new project in the [Firebase Console](https://console.firebase.google.com/).
    *   Enable **Google Authentication** in the "Authentication" tab.
    *   Create a **Firestore Database**.
    *   From your project settings, get your `firebaseConfig` object.
    *   In `index.html`, `edit-workouts.html`, and `progress-analytics.html`, replace the placeholder `firebaseConfig` with your own.
3.  **Run the project:** You can open the `index.html` file directly in your browser or use a simple local server.
