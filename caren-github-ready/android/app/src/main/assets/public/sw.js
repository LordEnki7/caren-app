// CAREN Service Worker for Offline Emergency Features
const CACHE_NAME = 'caren-v1.0.0';
const OFFLINE_URL = '/offline';

// Critical resources that must be cached for offline emergency functionality
const CRITICAL_RESOURCES = [
  '/',
  '/offline',
  '/record',
  '/ai-assistant',
  '/emergency-contacts',
  '/manifest.json'
];

// Emergency commands that work offline
const EMERGENCY_COMMANDS = [
  'call 911',
  'emergency',
  'help',
  'panic',
  'danger',
  'police',
  'ambulance',
  'fire department'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('CAREN Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching critical resources');
        return cache.addAll(CRITICAL_RESOURCES);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('CAREN Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Handle emergency API calls offline
  if (url.pathname.includes('/api/emergency') && !navigator.onLine) {
    event.respondWith(handleOfflineEmergency(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Cache-first strategy for resources
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }
            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
});

// Handle offline emergency requests
async function handleOfflineEmergency(request) {
  console.log('Handling offline emergency request');
  
  try {
    const body = await request.text();
    const data = JSON.parse(body);
    
    // Store emergency data locally for sync when online
    const emergencyData = {
      timestamp: Date.now(),
      type: 'emergency_alert',
      data: data,
      synced: false
    };
    
    // Store in IndexedDB for persistence
    await storeEmergencyData(emergencyData);
    
    // Attempt to trigger native emergency actions
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Emergency alert stored locally. Will sync when online.',
      offline: true
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Offline emergency handling failed:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Emergency request failed',
      offline: true
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Store emergency data in IndexedDB
async function storeEmergencyData(data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CAREN-Emergency', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['emergencies'], 'readwrite');
      const store = transaction.objectStore('emergencies');
      
      const addRequest = store.add(data);
      addRequest.onsuccess = () => resolve();
      addRequest.onerror = () => reject(addRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('emergencies')) {
        const store = db.createObjectStore('emergencies', { keyPath: 'timestamp' });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };
  });
}

// Background sync for emergency data
self.addEventListener('sync', (event) => {
  if (event.tag === 'emergency-sync') {
    event.waitUntil(syncEmergencyData());
  }
});

// Sync stored emergency data when back online
async function syncEmergencyData() {
  console.log('Syncing emergency data...');
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CAREN-Emergency', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['emergencies'], 'readwrite');
      const store = transaction.objectStore('emergencies');
      const index = store.index('synced');
      
      const getAllRequest = index.getAll(false);
      getAllRequest.onsuccess = async () => {
        const unsyncedData = getAllRequest.result;
        
        for (const item of unsyncedData) {
          try {
            const response = await fetch('/api/emergency/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.data)
            });
            
            if (response.ok) {
              // Mark as synced
              item.synced = true;
              store.put(item);
              console.log('Emergency data synced:', item.timestamp);
            }
          } catch (error) {
            console.error('Failed to sync emergency data:', error);
          }
        }
        resolve();
      };
    };
  });
}

// Push notification handling for emergency alerts
self.addEventListener('push', (event) => {
  const options = {
    body: 'Emergency alert received',
    icon: '/pwa-192x192.png',
    badge: '/emergency-badge-72x72.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Alert'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.message || options.body;
    options.data = data;
  }

  event.waitUntil(
    self.registration.showNotification('CAREN Emergency Alert', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/emergency?alert=' + (event.notification.data?.id || 'latest'))
    );
  }
});

console.log('CAREN Service Worker loaded successfully');