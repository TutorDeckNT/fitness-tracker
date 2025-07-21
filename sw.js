// --- THIS IS THE COMPLETE AND CORRECT SERVICE WORKER FILE ---

// This line is automatically updated by your GitHub Action (YAML script)
const CACHE_NAME = 'fitness-tracker-cache-v342cd84';

// This is the list of all files needed for the app to work offline.
const APP_SHELL = [
    '/',
    'index.html',
    'edit-workouts.html',
    'manage-data.html',
    'progress-analytics.html',
    'css/base.css',
    'css/style.css',
    'css/edit-workouts-style.css',
    'css/manage-data-style.css',
    'css/progress-analytics-style.css',
    'manifest.json',
    'images/eagle.png',
    'images/Rosecurve.png',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js'
];

// --- TIMER LOGIC ---

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

// --- CACHING & OFFLINE LOGIC ---

// On install, pre-cache the entire application shell.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// On activation, clean up any old, unused caches.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// The core caching strategy: Cache-First, falling back to Network.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(
          networkResponse => {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }
        );
      })
      .catch(error => {
        console.error('Service Worker: Fetch failed:', error);
      })
  );
});

// --- MESSAGE HANDLING LOGIC ---

// This listener handles all commands sent from the app to the service worker.
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

    if (event.data.command === 'ADJUST_TIMER') {
        if (timerEndTime) {
            timerEndTime += event.data.seconds * 1000;
        }
    }
});
