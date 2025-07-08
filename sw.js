const CACHE_NAME = 'fitness-tracker-cache-v13-adjust-vibrate'; // New version

let timerInterval = null;
let timerEndTime = null;

function runCountdown() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!timerEndTime) {
            clearInterval(timerInterval);
            return;
        }
        const remainingMs = timerEndTime - Date.now();
        const remainingSeconds = Math.max(0, Math.round(remainingMs / 1000));
        
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({ type: 'TIMER_UPDATE', remainingSeconds: remainingSeconds });
            });
        });

        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            timerEndTime = null;
            self.registration.showNotification('Rest Over!', {
                body: 'Time to start your next set!',
                vibrate: [200, 100, 200],
                tag: 'fitness-timer-notification'
            });
        }
    }, 1000);
}

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
    if (event.data.command === 'START_TIMER') {
        if (event.data.duration > 0) {
            timerEndTime = Date.now() + event.data.duration * 1000;
            runCountdown();
        }
    }

    if (event.data.command === 'STOP_TIMER') {
        clearInterval(timerInterval);
        timerEndTime = null;
    }

    if (event.data.command === 'SYNC_TIMER') {
        if (timerEndTime) {
            runCountdown();
        }
    }

    // NEW: Handle adjusting the timer
    if (event.data.command === 'ADJUST_TIMER') {
        if (timerEndTime) {
            timerEndTime += event.data.seconds * 1000;
        }
    }
});
