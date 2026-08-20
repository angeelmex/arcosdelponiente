/*
 * Arcos del Poniente - Service Worker V3
 * Firebase Cloud Messaging
 *
 * Corrección:
 * - Si Firebase ya trae un bloque "notification", NO mostramos otra
 *   notificación manual. El navegador/FCM ya la presenta.
 * - Solo mostramos manualmente cuando el mensaje viene como "data".
 * Esto evita notificaciones duplicadas.
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
 * - Mensajes con "notification": FCM ya los muestra.
 * - Mensajes solo con "data": aquí sí creamos la notificación.
 */
messaging.onBackgroundMessage(
  function(payload) {

    console.log(
      "Notificación recibida:",
      payload
    );


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

      data: {
        url:
          datos.url ||
          "./"
      }
    };


    return self.registration
      .showNotification(
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
