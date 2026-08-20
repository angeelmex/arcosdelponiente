/*
 * Arcos del Poniente - Service Worker V3
 * Notificaciones Firebase Cloud Messaging
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
 * No almacenamos las páginas HTML en caché.
 * Así GitHub Pages puede actualizarse sin quedarse
 * mostrando versiones antiguas.
 */
self.addEventListener(
  "fetch",
  function(event) {

    return;

  }
);


messaging.onBackgroundMessage(
  function(payload) {

    console.log(
      "Notificación recibida:",
      payload
    );


    const notificacion =
      payload.notification || {};


    const datos =
      payload.data || {};


    const titulo =
      notificacion.title ||
      datos.titulo ||
      "Arcos del Poniente";


    const opciones = {
      body:
        notificacion.body ||
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
