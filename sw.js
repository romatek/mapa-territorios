const CACHE_NAME =
"mapa-v1";

const urlsToCache = [

  "./",
  "./index.html",
  "./manifest.json",

  "https://unpkg.com/leaflet/dist/leaflet.css",
  "https://unpkg.com/leaflet/dist/leaflet.js",

  "https://unpkg.com/leaflet-draw/dist/leaflet.draw.css",
  "https://unpkg.com/leaflet-draw/dist/leaflet.draw.js"

];

self.addEventListener(

  "install",

  event => {

    event.waitUntil(

      caches.open(
        CACHE_NAME
      )

      .then(cache => {

        return cache.addAll(
          urlsToCache
        );

      })

    );

  }

);

self.addEventListener(

  "fetch",

  event => {

    event.respondWith(

      caches.match(
        event.request
      )

      .then(response => {

        return response ||

        fetch(
          event.request
        );

      })

    );

  }

);