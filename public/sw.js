const CACHE_NAME = "video-cache-v3";
const VIDEOS = [
  "https://notfren.com/circusle/videos/intro.mp4", 
  "https://notfren.com/circusle/videos/mainbg.mp4"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        VIDEOS.map(async (url) => {
          try {
            // Используем no-cors режим для внешних ресурсов
            const response = await fetch(url, { 
              mode: 'no-cors',
              cache: 'default'
            });
            return cache.put(url, response);
          } catch (error) {
            console.warn(`Failed to cache ${url}:`, error);
            // Не блокируем установку Service Worker из-за ошибок кэширования
            return Promise.resolve();
          }
        })
      );
    }),
  );
});

self.addEventListener("fetch", (event) => {
  if (VIDEOS.some((url) => event.request.url.includes(url))) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        
        // Если нет в кэше, делаем запрос с no-cors
        return fetch(event.request, { 
          mode: 'no-cors',
          cache: 'default'
        }).then((response) => {
          // Кэшируем ответ для будущих запросов
          if (response.status === 200 || response.type === 'opaque') {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response.clone());
              return response;
            });
          }
          return response;
        }).catch((error) => {
          console.warn(`Fetch failed for ${event.request.url}:`, error);
          // Возвращаем обычный fetch как fallback
          return fetch(event.request);
        });
      }),
    );
  }
});