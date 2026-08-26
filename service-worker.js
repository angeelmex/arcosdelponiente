/*
 * Arcos del Poniente - Service Worker V3
 * Firebase Cloud Messaging
 *
 * CORRECCIÓN SEGURA:
 * - No toca Code.gs, Accesos.gs, chat, NIP ni guardias.
 * - Muestra explícitamente tanto mensajes DATA-ONLY como
 *   mensajes que contienen payload.notification.
 * - Mantiene apertura por URL y badge.
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
  "2026.08.26-residente-push-estable-2";


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
 * FCM
 *
 * IMPORTANTE:
 * Antes se hacía "return" cuando payload.notification existía,
 * suponiendo que iOS/navegador la mostraría automáticamente.
 * En la práctica eso puede dejar la notificación sin mostrar.
 *
 * Ahora SIEMPRE la presentamos explícitamente desde el SW.
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


    const notificacion =
      payload &&
      payload.notification
        ? payload.notification
        : {};


    const titulo =
      datos.titulo ||
      notificacion.title ||
      "Arcos del Poniente";


    const cuerpo =
      datos.cuerpo ||
      notificacion.body ||
      "Tienes una nueva notificación.";


    const opciones = {
      body:
        cuerpo,

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
 * - si no, abrimos NOTIFICACIONES.
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
