// This line is automatically updated by your GitHub Action (YAML script)
const CACHE_NAME = 'fitness-tracker-cache-v9b8d448';

// This is the list of all files needed for the app to work offline.
const APP_SHELL = [
    // HTML files
    'index.html',
    'edit-workouts.html',
    'manage-data.html',
    'progress-analytics.html',

    // CSS files
    'css/base.css',
    'css/style.css',
    'css/edit-workouts-style.css',
    'css/manage-data-style.css',
    'css/progress-analytics-style.css',

    // NEW JAVASCRIPT MODULES
    'js/firebase-config.js',
    'js/auth.js',
    'js/utils.js',
    'js/main-app.js',
    'js/edit-workouts.js',
    'js/manage-data.js',
    'js/progress-analytics.js',
    
    // Other assets
    'manifest.json',
    'images/eagle.png',
    'images/Rosecurve.png',

    // External libraries that should also be cached
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js'
];

// --- CACHING & OFFLINE LOGIC ---

// On install, pre-cache the entire application shell.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching App Shell');
        // Use addAll with a new Request object to ignore cache-busting query strings
        const requests = APP_SHELL.map(url => new Request(url, { cache: 'reload' }));
        return cache.addAll(requests);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch(error => {
          console.error('Service Worker: Failed to cache app shell.', error);
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
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If we have a cached response, return it.
        if (cachedResponse) {
          return cachedResponse;
        }

        // If not, fetch from the network.
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
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
        // Optional: return a fallback page if offline, e.g., an offline.html file
        // return caches.match('offline.html');
      })
  );
});
