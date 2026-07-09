const CACHE_NAME =
"mapa-v2";

const urlsToCache = [

  "./",
  "./index.html",
  "./manifest.json",

  "https://unpkg.com/leaflet/dist/leaflet.css",
  "https://unpkg.com/leaflet/dist/leaflet.js",

  "https://unpkg.com/leaflet-draw/dist/leaflet.draw.css",
  "https://unpkg.com/leaflet-draw/dist/leaflet.draw.js"

];

// =========================
// INSTALL
// =========================

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

// =========================
// FETCH
// =========================

self.addEventListener(

  "fetch",

  event => {

    event.respondWith(

      caches.match(
        event.request
      )

      .then(response => {

        if(response){

          return response;

        }

        return fetch(
          event.request
        )

        .then(networkResponse => {

          // GUARDAR TILES
          if(

            event.request.url.includes(
              "tile.openstreetmap.org"
            )

          ){

            const clone =
            networkResponse.clone();

            caches.open(
              CACHE_NAME
            )

            .then(cache => {

              cache.put(
                event.request,
                clone
              );

            });

          }

          return networkResponse;

        });

      })

    );

  }

);