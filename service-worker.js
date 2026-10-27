/*
 * Arcos del Poniente - Service Worker V4
 * Firebase Cloud Messaging + App Shell de arranque
 *
 * CONSERVA:
 * - Evita notificaciones duplicadas.
 * - Los mensajes con payload.notification los muestra FCM/iOS.
 * - Los mensajes DATA-ONLY (chat/accesos) los muestra este Service Worker.
 * - Mantiene URL de destino y badge.
 *
 * AGREGA:
 * - Caché del arranque de la app.
 * - index.html, login.html, manifest e iconos pueden abrir desde caché
 *   cuando GitHub Pages está lento o la conexión falla.
 */

importScripts(
  "https://www.gstatic.com/firebasejs/12.17.0/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/12.17.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey:
    "AIzaSyDse3UCwboAneei4QM0KG468IkB8UeyG50",

  authDomain:
    "arcos-residentes.firebaseapp.com",

  projectId:
    "arcos-residentes",

  storageBucket:
    "arcos-residentes.firebasestorage.app",

  messagingSenderId:
    "359067671558",

  appId:
    "1:359067671558:web:f0395d4220d5b5f40d7787"
});

const messaging =
  firebase.messaging();

const URL_NOTIFICACIONES =
  "./notificaciones.html";

const VERSION_SW =
  "2026.10.27-app-shell-1";

const CACHE_APP_SHELL_V4 =
  "arcos-app-shell-v4";

const ARCHIVOS_APP_SHELL_V4 = [
  "./",
  "./index.html",
  "./login.html",
  "./manifest.webmanifest",
  "./icon-192.png"
];

const CACHE_FLAGS_NOTIFICACIONES_V3 =
  "arcos-flags-v3";

const FLAG_NUEVA_NOTIFICACION_V3 =
  "./flag-nueva-notificacion";

async function marcarNuevaNotificacionV3_() {
  try {
    const cache =
      await caches.open(
        CACHE_FLAGS_NOTIFICACIONES_V3
      );

    await cache.put(
      FLAG_NUEVA_NOTIFICACION_V3,
      new Response(
        String(Date.now()),
        {
          headers: {
            "Content-Type":
              "text/plain"
          }
        }
      )
    );
  }
  catch (error) {
    console.log(
      "No fue posible marcar nueva notificación:",
      error
    );
  }

  try {
    const clientes =
      await self.clients.matchAll(
        {
          type:
            "window",

          includeUncontrolled:
            true
        }
      );

    clientes.forEach(
      function(cliente) {
        cliente.postMessage(
          {
            tipo:
              "NUEVA_NOTIFICACION"
          }
        );
      }
    );
  }
  catch (errorClientes) {
    console.log(
      "No fue posible avisar a las ventanas abiertas:",
      errorClientes
    );
  }
}

self.addEventListener(
  "install",
  function(event) {
    event.waitUntil(
      caches
        .open(
          CACHE_APP_SHELL_V4
        )
        .then(
          function(cache) {
            return Promise.allSettled(
              ARCHIVOS_APP_SHELL_V4.map(
                function(url) {
                  return cache.add(
                    new Request(
                      url,
                      {
                        cache:
                          "reload"
                      }
                    )
                  );
                }
              )
            );
          }
        )
        .then(
          function() {
            return self.skipWaiting();
          }
        )
    );
  }
);

self.addEventListener(
  "activate",
  function(event) {
    event.waitUntil(
      Promise.all([
        self.clients.claim(),

        caches
          .keys()
          .then(
            function(claves) {
              return Promise.all(
                claves.map(
                  function(clave) {
                    if (
                      clave.indexOf(
                        "arcos-app-shell-"
                      ) === 0 &&
                      clave !==
                        CACHE_APP_SHELL_V4
                    ) {
                      return caches.delete(
                        clave
                      );
                    }

                    return Promise.resolve(
                      false
                    );
                  }
                )
              );
            }
          )
      ])
    );
  }
);

self.addEventListener(
  "fetch",
  function(event) {
    const request =
      event.request;

    if (
      !request ||
      request.method !==
        "GET"
    ) {
      return;
    }

    let url;

    try {
      url =
        new URL(
          request.url
        );
    }
    catch (error) {
      return;
    }

    if (
      url.origin !==
        self.location.origin
    ) {
      return;
    }

    if (
      request.mode ===
        "navigate"
    ) {
      event.respondWith(
        caches
          .match(
            request
          )
          .then(
            async function(respuestaCache) {
              if (
                !respuestaCache &&
                (
                  url.pathname.endsWith(
                    "/arcosdelponiente/"
                  ) ||
                  url.pathname.endsWith(
                    "/arcosdelponiente/index.html"
                  )
                )
              ) {
                respuestaCache =
                  await caches.match(
                    "./index.html"
                  );
              }

              const actualizar =
                fetch(
                  request
                )
                .then(
                  async function(respuestaRed) {
                    if (
                      respuestaRed &&
                      respuestaRed.ok
                    ) {
                      const cache =
                        await caches.open(
                          CACHE_APP_SHELL_V4
                        );

                      await cache.put(
                        request,
                        respuestaRed.clone()
                      );
                    }

                    return respuestaRed;
                  }
                )
                .catch(
                  function() {
                    return null;
                  }
                );

              if (
                respuestaCache
              ) {
                actualizar.catch(
                  function() {}
                );

                return respuestaCache;
              }

              const respuestaRed =
                await actualizar;

              if (
                respuestaRed
              ) {
                return respuestaRed;
              }

              const fallback =
                await caches.match(
                  "./index.html"
                );

              if (
                fallback
              ) {
                return fallback;
              }

              return new Response(
                "No fue posible cargar Arcos del Poniente. Verifica tu conexión e intenta nuevamente.",
                {
                  status:
                    503,

                  headers: {
                    "Content-Type":
                      "text/plain; charset=UTF-8"
                  }
                }
              );
            }
          )
      );

      return;
    }

    const archivo =
      url.pathname
        .split("/")
        .pop();

    const esRecursoEsencial =
      archivo ===
        "manifest.webmanifest" ||
      archivo ===
        "icon-192.png";

    if (
      esRecursoEsencial
    ) {
      event.respondWith(
        caches
          .match(
            request
          )
          .then(
            function(respuestaCache) {
              if (
                respuestaCache
              ) {
                return respuestaCache;
              }

              return fetch(
                request
              )
              .then(
                function(respuestaRed) {
                  if (
                    respuestaRed &&
                    respuestaRed.ok
                  ) {
                    const copia =
                      respuestaRed.clone();

                    caches
                      .open(
                        CACHE_APP_SHELL_V4
                      )
                      .then(
                        function(cache) {
                          cache.put(
                            request,
                            copia
                          );
                        }
                      );
                  }

                  return respuestaRed;
                }
              );
            }
          )
      );
    }
  }
);

messaging.onBackgroundMessage(
  async function(payload) {
    console.log(
      "Notificación recibida:",
      payload
    );

    await marcarNuevaNotificacionV3_();

    if (
      payload &&
      payload.notification
    ) {
      return;
    }

    const datos =
      payload &&
      payload.data
        ? payload.data
        : {};

    const titulo =
      datos.titulo ||
      "Arcos del Poniente";

    const opciones = {
      body:
        datos.cuerpo ||
        "Tienes una nueva notificación.",

      icon:
        "./icon-192.png",

      badge:
        "./icon-192.png",

      tag:
        datos.tipo ===
          "CHAT_CASETA"
          ? "chat-caseta"
          : (
              datos.tipo ===
                "INGRESO"
                ? "acceso-ingreso"
                : (
                    datos.tipo ===
                      "SALIDA"
                      ? "acceso-salida"
                      : undefined
                  )
            ),

      data: {
        url:
          datos.url ||
          URL_NOTIFICACIONES,

        tipo:
          datos.tipo ||
          "",

        idResidente:
          datos.idResidente ||
          "",

        idAcceso:
          datos.idAcceso ||
          ""
      }
    };

    try {
      if (
        self.navigator &&
        "setAppBadge" in self.navigator
      ) {
        await self.navigator.setAppBadge(1);
      }
    }
    catch (errorBadge) {
      console.log(
        "No fue posible actualizar badge:",
        errorBadge
      );
    }

    return self.registration.showNotification(
      titulo,
      opciones
    );
  }
);

self.addEventListener(
  "notificationclick",
  function(event) {
    event.notification.close();

    const destino =
      event.notification &&
      event.notification.data &&
      event.notification.data.url
        ? event.notification.data.url
        : URL_NOTIFICACIONES;

    event.waitUntil(
      self.clients.matchAll(
        {
          type:
            "window",

          includeUncontrolled:
            true
        }
      )
      .then(
        function(clientes) {
          for (
            const cliente of clientes
          ) {
            if (
              "navigate" in cliente
            ) {
              return cliente
                .navigate(
                  destino
                )
                .then(
                  function() {
                    if (
                      "focus" in cliente
                    ) {
                      return cliente.focus();
                    }
                  }
                );
            }
          }

          if (
            self.clients.openWindow
          ) {
            return self.clients.openWindow(destino);
          }
        }
      )
    );
  }
);
