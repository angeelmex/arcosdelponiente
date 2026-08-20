/*
 * Arcos del Poniente - Service Worker V3
 *
 * Primera etapa:
 * - Hace que la plataforma tenga base PWA.
 * - Prepara el manejo de notificaciones push.
 * - NO almacena HTML en caché para evitar que GitHub Pages
 *   muestre versiones antiguas después de cada actualización.
 */

const VERSION =
  "arcos-v3-20260820-1";


self.addEventListener(
  "install",
  function(event) {

    self.skipWaiting();

  }
);


self.addEventListener(
  "activate",
  function(event) {

    event.waitUntil(
      self.clients.claim()
    );

  }
);


/*
 * Por ahora dejamos la navegación normal por red.
 * Esto evita que index.html, menu.html y los demás módulos
 * queden atrapados en una versión vieja.
 */
self.addEventListener(
  "fetch",
  function(event) {

    return;

  }
);


/*
 * Este bloque quedará listo para la siguiente etapa,
 * cuando registremos cada dispositivo para Web Push.
 */
self.addEventListener(
  "push",
  function(event) {

    let datos = {
      titulo:
        "Arcos del Poniente",

      cuerpo:
        "Tienes una nueva notificación.",

      url:
        "./"
    };


    if (
      event.data
    ) {

      try {

        const recibidos =
          event.data.json();


        datos = {
          titulo:
            recibidos.titulo ||
            datos.titulo,

          cuerpo:
            recibidos.cuerpo ||
            datos.cuerpo,

          url:
            recibidos.url ||
            datos.url,

          tag:
            recibidos.tag ||
            ""
        };

      }
      catch (error) {

        datos.cuerpo =
          event.data.text();

      }

    }


    event.waitUntil(
      self.registration.showNotification(
        datos.titulo,
        {
          body:
            datos.cuerpo,

          icon:
            "./icon-192.png",

          badge:
            "./icon-192.png",

          tag:
            datos.tag || undefined,

          data: {
            url:
              datos.url
          }
        }
      )
    );

  }
);


self.addEventListener(
  "notificationclick",
  function(event) {

    event.notification.close();


    const destino =
      event.notification.data &&
      event.notification.data.url
        ? event.notification.data.url
        : "./";


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
              "focus" in cliente
            ) {

              cliente.navigate(
                destino
              );


              return cliente.focus();

            }

          }


          if (
            self.clients.openWindow
          ) {

            return self.clients.openWindow(
              destino
            );

          }

        }
      )
    );

  }
);
