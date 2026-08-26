/*
 * Arcos del Poniente - Service Worker V3
 * Firebase Cloud Messaging
 *
 * - Evita notificaciones duplicadas.
 * - Las notificaciones manuales guardan la URL de destino.
 * - Si una notificación de FCM llega sin data.url,
 *   al tocarla abre NOTIFICACIONES.
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
  "2026.08.26-chat-iphone-1";


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


/*
 * No almacenamos HTML en caché.
 */
self.addEventListener(
  "fetch",
  function(event) {

    return;

  }
);


/*
 * FCM:
 * - Si el payload incluye "notification", FCM / el navegador
 *   ya la presenta y NO mostramos una segunda.
 * - Si llega solo como "data", nosotros la mostramos.
 */
messaging.onBackgroundMessage(
  async function(payload) {

    console.log(
      "Notificación recibida:",
      payload
    );


    const datos =
      payload &&
      payload.data
        ? payload.data
        : {};


    /*
     * Cuando el backend manda un payload "notification",
     * FCM/navegador normalmente ya lo muestra por sí mismo.
     * Evitamos duplicarlo.
     */
    if (
      payload &&
      payload.notification
    ) {

      return;

    }


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
          : undefined,

      data: {
        url:
          datos.url ||
          URL_NOTIFICACIONES,

        tipo:
          datos.tipo ||
          "",

        idResidente:
          datos.idResidente ||
          ""
      }
    };


    /*
     * En una PWA instalada, intentamos marcar inmediatamente
     * el icono aun cuando la app esté cerrada.
     * Al volver a abrirla, menu.html reemplaza este indicador
     * por el número real de mensajes pendientes.
     */
    try {

      if (
        self.navigator &&
        "setAppBadge" in self.navigator
      ) {

        await self.navigator
          .setAppBadge(
            1
          );

      }

    }
    catch (errorBadge) {

      console.log(
        "No fue posible actualizar badge:",
        errorBadge
      );

    }


    return self.registration
      .showNotification(
        titulo,
        opciones
      );

  }
);


/*
 * Al tocar cualquier notificación:
 * - si trae una URL específica, la usamos;
 * - si no trae URL (caso común de notificación automática FCM),
 *   abrimos la bandeja de NOTIFICACIONES.
 */
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

            return self.clients.openWindow(
              destino
            );

          }

        }
      )
    );

  }
);
