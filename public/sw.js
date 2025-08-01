const CACHE_NAME = "video-cache-v2";
const VIDEOS = ["https://notfren.com/circusle/videos/intro.mp4", "https://notfren.com/circusle/videos/mainbg.mp4"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(VIDEOS.map((url) => cache.add(url)));
    }),
  );
});

self.addEventListener("fetch", (event) => {
  if (VIDEOS.some((url) => event.request.url.includes(url))) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return (
          response ||
          fetch(event.request).then((response) => {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response.clone());

              return response;
            });
          })
        );
      }),
    );
  }
});
