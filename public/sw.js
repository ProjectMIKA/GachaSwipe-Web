// GachaSwipe Service Worker - Cyberpunk PWA Shell & Virtual Media Cache
const CACHE_NAME = 'gachaswipe-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg'
];

// Helper: Query virtual image file directly from IndexedDB
function getVirtualFileFromIndexedDB(fileName) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('GachaSwipeWebDB');
      req.onerror = () => resolve(null);
      req.onsuccess = (e) => {
        const db = e.target.result;
        if (!db || !db.objectStoreNames.contains('files')) {
          if (db) db.close();
          return resolve(null);
        }
        try {
          const tx = db.transaction('files', 'readonly');
          const store = tx.objectStore('files');
          const getReq = store.get(fileName);
          getReq.onsuccess = () => {
            resolve(getReq.result || null);
            db.close();
          };
          getReq.onerror = () => {
            resolve(null);
            db.close();
          };
        } catch (txErr) {
          db.close();
          resolve(null);
        }
      };
    } catch (openErr) {
      resolve(null);
    }
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[M.I.K.A SW] Cache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignore non-GET requests and external API calls (e.g., LLM generation endpoints, audio streams)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // ✨ Virtual Media Interceptor: Intercept requests for /media_... and serve from IndexedDB ✨
  const pathname = url.pathname;
  if (pathname.includes('/media_') || pathname.startsWith('/media_')) {
    const fileName = pathname.split('/').pop();
    event.respondWith(
      (async () => {
        try {
          const fileRecord = await getVirtualFileFromIndexedDB(fileName);
          if (fileRecord && fileRecord.content_base64) {
            let b64 = fileRecord.content_base64;
            if (b64.includes(',')) b64 = b64.split(',')[1];
            const binaryStr = atob(b64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            return new Response(bytes.buffer, {
              status: 200,
              headers: {
                'Content-Type': fileRecord.mimeType || 'image/png',
                'Cache-Control': 'public, max-age=31536000, immutable'
              }
            });
          }
        } catch (err) {
          console.warn('[M.I.K.A SW] Virtual media fetch error:', fileName, err);
        }
        // Fallback: network fetch or 404
        return fetch(event.request).catch(() => new Response('Image not found', { status: 404 }));
      })()
    );
    return;
  }

  // Network-first strategy for index.html, cache-first for static assets
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback if offline
        return cachedResponse;
      });
    })
  );
});
