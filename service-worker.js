/*
 * Arcos del Poniente - Service Worker V3
 * Firebase Cloud Messaging
 *
 * - Evita notificaciones duplicadas.
 * - Los mensajes con payload.notification los muestra FCM/iOS.
 * - Los mensajes DATA-ONLY (chat/accesos) los muestra este Service Worker.
 * - Mantiene URL de destino y badge.
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
  "2026.08.27-notificaciones-inteligentes-1";


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
        String(
          Date.now()
        ),
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
  function() {
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

self.addEventListener(
  "fetch",
  function(event) {
    return;
  }
);

messaging.onBackgroundMessage(
  async function(payload) {

    console.log(
      "Notificación recibida:",
      payload
    );


    /*
     * Marcamos que hay información nueva ANTES de decidir
     * cómo se mostrará el push. Así la bandeja sabrá que
     * debe actualizarse la próxima vez que se abra.
     */
    await marcarNuevaNotificacionV3_();


    /*
     * Si FCM/iOS ya recibió un payload.notification,
     * lo presenta automáticamente. Salimos aquí para
     * evitar mostrarla por segunda vez.
     */
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
