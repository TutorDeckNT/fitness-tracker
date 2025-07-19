const CACHE_NAME = 'fitness-tracker-cache-v38e564e';
const APP_SHELL = [
    '/',
    'index.html',
    'edit-workouts.html',
    'manage-data.html',
    'progress-analytics.html',
    'style.css',
    'edit-workouts-style.css',
    'manage-data-style.css',
    'progress-analytics-style.css',
    'manifest.json',
    'images/eagle.png',
    'images/Rosecurve.png',
    // --- CRITICAL: Added all external CDN scripts ---
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js'
];

let timerInterval = null;
let timerEndTime = null;

// --- Caching Logic ---

// On install, pre-cache the entire application shell.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching App Shell');
        // addAll is atomic. If one file fails, the whole cache operation fails.
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker.
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
          // If a cache is not our current one, delete it.
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Tell the active service worker to take control of the page immediately.
      return self.clients.claim();
    })
  );
});

// The core of our caching strategy: Cache-First, falling back to Network.
self.addEventListener('fetch', event => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If the response is in the cache, return it immediately.
        if (cachedResponse) {
          return cachedResponse;
        }

        // If it's not in the cache, fetch it from the network.
        return fetch(event.request).then(
          networkResponse => {
            // We need to clone the response. A response is a stream
            // and can only be consumed once. We need one for the browser
            // and one for the cache.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Cache the new response for future use.
                cache.put(event.request, responseToCache);
              });

            // Return the network response to the browser.
            return networkResponse;
          }
        );
      })
      .catch(error => {
        // If both the cache and the network fail (e.g., user is offline
        // and the resource was never cached), the request will fail.
        // The browser will show its default offline error page.
        console.error('Service Worker: Fetch failed:', error);
        // You could optionally return a fallback offline page here.
      })
  );
});


// --- Existing Timer and Message Logic (Unchanged) ---

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

self.addEventListener('message', (event) => {
    if (event.data.command === 'START_TIMER') {
        if (event.data.duration > 0) {
            timerEndTime = Date.now() + event.data.duration * 1000;
            runCountdown();
        }
    }

    if (event.data.command === 'STOP_TIMER') {
