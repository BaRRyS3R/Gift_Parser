const CACHE_NAME = "video-cache-v5"; // Увеличили версию
const VIDEOS = [ 
  "https://notfren.com/circusle/videos/mainbg.mp4",
  // Добавляем новые видео для игровых режимов
  "https://notfren.com/circusle/mode_reaction.mp4",
  "https://notfren.com/circusle/mode_survival.mp4", 
  "https://notfren.com/circusle/mode_rotation.mp4",
  "https://notfren.com/circusle/mode_physics.mp4"
];

self.addEventListener("install", (event) => {
  console.log("[SW] Installing new version with game mode videos");
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        VIDEOS.map(async (url) => {
          try {
            console.log(`[SW] Caching video: ${url}`);
            
            // Используем no-cors режим для внешних ресурсов
            const response = await fetch(url, { 
              mode: 'no-cors',
              cache: 'default'
            });
            
            await cache.put(url, response);
            console.log(`[SW] Successfully cached: ${url}`);
            
            return Promise.resolve();
          } catch (error) {
            console.warn(`[SW] Failed to cache ${url}:`, error);
            // Не блокируем установку Service Worker из-за ошибок кэширования
            return Promise.resolve();
          }
        })
      );
    }).then(() => {
      console.log("[SW] All videos cached successfully");
      // Принудительно активируем новый SW
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating new version");
  
  event.waitUntil(
    // Удаляем старые кэши
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`[SW] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log("[SW] Taking control of all clients");
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", (event) => {
  // Проверяем, является ли запрос одним из наших видео
  const isVideoRequest = VIDEOS.some((url) => event.request.url.includes(url));
  
  if (isVideoRequest) {
    console.log(`[SW] Handling video request: ${event.request.url}`);
    
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          console.log(`[SW] Serving from cache: ${event.request.url}`);
          return response;
        }
        
        console.log(`[SW] Fetching from network: ${event.request.url}`);
        
        // Если нет в кэше, делаем запрос с no-cors
        return fetch(event.request, { 
          mode: 'no-cors',
          cache: 'default'
        }).then((response) => {
          // Кэшируем ответ для будущих запросов
          if (response.status === 200 || response.type === 'opaque') {
            return caches.open(CACHE_NAME).then((cache) => {
              console.log(`[SW] Caching response for: ${event.request.url}`);
              cache.put(event.request, response.clone());
              return response;
            });
          }
          return response;
        }).catch((error) => {
          console.warn(`[SW] Fetch failed for ${event.request.url}:`, error);
          // Возвращаем обычный fetch как fallback
          return fetch(event.request);
        });
      }),
    );
  }
});