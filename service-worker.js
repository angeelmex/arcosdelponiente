/*
 * Arcos del Poniente - Service Worker V3.1
 * Notificaciones Firebase originales + caché seguro de páginas estáticas.
 *
 * Conserva la lógica de push/badge/clic y flags original.
 * El caché NO almacena respuestas de Apps Script, Firebase ni QR remotos.
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
  "2026.10.27-cache-seguro-v3";

const CACHE_FLAGS_NOTIFICACIONES_V3 =
  "arcos-flags-v3";

const FLAG_NUEVA_NOTIFICACION_V3 =
  "./flag-nueva-notificacion";

/*
 * IMPORTANTE:
 * Solo contienen HTML/archivos estáticos públicos, nunca sesiones
 * ni resultados personalizados de Apps Script.
 */
const CACHE_INICIO_SEGURO_V3 =
  "arcos-shell-seguro-v3-20261027";

const CACHE_PAGINAS_SEGURO_V3 =
  "arcos-paginas-seguro-v3-20261027";

const ARCHIVOS_INICIALES_SEGURO_V3 = [
  "./index.html",
  "./login.html",
  "./menu.html",
  "./instalar-app.html",
  "./pagos.html",
  "./manifest.webmanifest",
  "./icon-192.png"
];

const RUTA_APP_SEGURO_V3 =
  new URL(self.registration.scope).pathname;

const LIMITE_RED_NAVEGACION_V3_MS =
  6000;


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


/* Devuelve una ruta estable, sin ?v= ni otros parámetros. */
function claveLocalSeguraV3_(url) {

  const direccion =
    new URL(url);

  if (
    direccion.origin !== self.location.origin ||
    !direccion.pathname.startsWith(RUTA_APP_SEGURO_V3)
  ) {
    return null;
  }

  const ruta =
    direccion.pathname;

  /* Raíz de este proyecto: index.html, NUNCA raíz del dominio. */
  if (ruta === RUTA_APP_SEGURO_V3) {
    direccion.pathname =
      RUTA_APP_SEGURO_V3 + "index.html";
  }

  direccion.search = "";
  direccion.hash = "";
  return direccion.toString();
}


function esPaginaHtmlSeguraV3_(url) {

  const clave =
    claveLocalSeguraV3_(url);

  return !!clave &&
    new URL(clave).pathname.endsWith(".html");
}


function esArchivoLocalSeguroV3_(url) {

  const clave =
    claveLocalSeguraV3_(url);

  if (!clave) {
    return false;
  }

  const ruta = new URL(clave).pathname;

  /* Nunca interceptamos el archivo que instala/actualiza este SW. */
  if (
    ruta.endsWith("/service-worker.js") ||
    ruta.endsWith("/firebase-messaging-sw.js")
  ) {
    return false;
  }

  return /\.(?:css|js|png|jpe?g|webp|svg|ico|woff2?|webmanifest)$/i
    .test(ruta);
}


async function buscarPaginaGuardadaV3_(clave) {

  /* Preferimos la actualización obtenida en segundo plano.
   * Las versiones precargadas sirven como respaldo inicial. */
  const paginas =
    await caches.open(CACHE_PAGINAS_SEGURO_V3);

  const actualizada =
    await paginas.match(clave);

  if (actualizada) {
    return actualizada;
  }

  const shell =
    await caches.open(CACHE_INICIO_SEGURO_V3);

  return shell.match(clave);
}


function respuestaCorrectaV3_(respuesta, html) {

  if (!respuesta || !respuesta.ok) {
    return false;
  }

  /* Evita guardar un 404 o una página de error como si fuera menú. */
  if (html) {
    const tipo =
      respuesta.headers.get("content-type") || "";

    return tipo.toLowerCase().includes("text/html");
  }

  return true;
}


async function almacenarRespuestaSeguraV3_(clave, respuesta, html) {

  if (!respuestaCorrectaV3_(respuesta, html)) {
    return;
  }

  try {

    const destino =
      await caches.open(
        html
          ? CACHE_PAGINAS_SEGURO_V3
          : CACHE_INICIO_SEGURO_V3
      );

    await destino.put(
      clave,
      respuesta.clone()
    );

  }
  catch (error) {

    console.warn(
      "No fue posible actualizar caché local:",
      error
    );

  }

}


/*
 * Evita la espera infinita al entrar por primera vez en una sección
 * que aún NO está en caché, sin modificar el tráfico del backend.
 */
async function consultarNavegacionV3_(peticion, clave) {

  const controlador =
    new AbortController();

  const reloj =
    setTimeout(
      function() {
        controlador.abort();
      },
      LIMITE_RED_NAVEGACION_V3_MS
    );

  try {

    const respuesta =
      await fetch(peticion, {
        signal:
          controlador.signal,
        cache:
          "no-store"
      });

    await almacenarRespuestaSeguraV3_(
      clave,
      respuesta,
      true
    );

    return respuesta;

  }
  catch (error) {

    return null;

  }
  finally {

    clearTimeout(reloj);

  }

}


function paginaSinConexionV3_() {

  const pagina = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Conexión débil · Arcos del Poniente</title>
<style>
body{margin:0;font-family:Arial,sans-serif;background:#f4f7fb;color:#204d5d;
min-height:100vh;display:grid;place-items:center;padding:22px;box-sizing:border-box}
main{max-width:440px;text-align:center;background:#fff;padding:30px 22px;
border-radius:20px;box-shadow:0 8px 28px #204d5d13}
h1{font-size:23px}p{line-height:1.55;color:#526978}
button{padding:16px 28px;background:#204d5d;color:white;border:0;
border-radius:12px;font-size:17px;font-weight:bold;cursor:pointer}
</style></head><body><main>
<h1>Conexión débil</h1>
<p>Esta sección todavía no está guardada en tu teléfono y no se pudo
consultar en este momento. Tus datos y tu sesión no se modificaron.</p>
<button onclick="location.reload()">REINTENTAR</button>
</main></body></html>`;

  return new Response(pagina, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}


/*
 * Instalación: las páginas más usadas se guardan desde GitHub.
 * Un recurso opcional que falle no impide activar el SW.
 */
self.addEventListener(
  "install",
  function(event) {

    event.waitUntil(
      caches.open(CACHE_INICIO_SEGURO_V3)
        .then(
          function(cache) {

            return Promise.allSettled(
              ARCHIVOS_INICIALES_SEGURO_V3.map(
                function(archivo) {

                  return cache.add(
                    new Request(archivo, {
                      cache: "reload"
                    })
                  );

                }
              )
            );

          }
        )
        .then(function() {
          return self.skipWaiting();
        })
    );

  }
);


self.addEventListener(
  "activate",
  function(event) {

    event.waitUntil(
      (async function() {

        const nombres =
          await caches.keys();

        /* Solo cachés de PÁGINAS de pruebas anteriores.
         * Respeta arcos-flags-v3 y cualquier otro caché de datos. */
        await Promise.all(
          nombres
            .filter(
              function(nombre) {
                return (
                  nombre.startsWith("arcos-app-shell-") ||
                  nombre.startsWith("arcos-shell-seguro-") ||
                  nombre.startsWith("arcos-paginas-seguro-")
                ) &&
                nombre !== CACHE_INICIO_SEGURO_V3 &&
                nombre !== CACHE_PAGINAS_SEGURO_V3;
              }
            )
            .map(function(nombre) {
              return caches.delete(nombre);
            })
        );

        await self.clients.claim();

      })()
    );

  }
);


self.addEventListener(
  "fetch",
  function(event) {

    const peticion = event.request;

    if (peticion.method !== "GET") {
      return;
    }

    const clave =
      claveLocalSeguraV3_(peticion.url);

    if (!clave) {
      /* No tocar Apps Script, Firebase, QuickChart, Drive, etc. */
      return;
    }

    if (
      peticion.mode === "navigate" &&
      esPaginaHtmlSeguraV3_(peticion.url)
    ) {

      /* La actualización ocurre durante la vida del evento;
       * no se pierde al entregar inmediatamente la página cacheada. */
      const actualizar =
        consultarNavegacionV3_(peticion, clave);

      event.waitUntil(
        actualizar.then(function() {}).catch(function() {})
      );

      event.respondWith(
        (async function() {

          const guardada =
            await buscarPaginaGuardadaV3_(clave);

          if (guardada) {
            return guardada;
          }

          const desdeRed =
            await actualizar;

          if (desdeRed) {
            return desdeRed;
          }

          /* No entregar index.html en lugar de menu.html, etc. */
          return paginaSinConexionV3_();

        })()
      );

      return;
    }

    /* Recursos públicos del mismo repositorio (iconos/css/js locales). */
    if (esArchivoLocalSeguroV3_(peticion.url)) {

      event.respondWith(
        (async function() {

          const cache =
            await caches.open(CACHE_INICIO_SEGURO_V3);

          const guardado =
            await cache.match(clave);

          if (guardado) {
            return guardado;
          }

          const red =
            await fetch(peticion);

          if (respuestaCorrectaV3_(red, false)) {
            event.waitUntil(
              almacenarRespuestaSeguraV3_(clave, red, false)
            );
          }

          return red;

        })()
      );

    }

  }
);


/*
 * NOTIFICACIONES — misma lógica que tu Service Worker original.
 */
messaging.onBackgroundMessage(
  async function(payload) {

    console.log(
      "Notificación recibida:",
      payload
    );

    /* Marcamos la notificación antes de decidir cómo mostrarla. */
    await marcarNuevaNotificacionV3_();

    /* FCM/iOS maneja las que traen payload.notification. */
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

          for (const cliente of clientes) {

            if ("navigate" in cliente) {

              return cliente
                .navigate(destino)
                .then(
                  function() {

                    if ("focus" in cliente) {
                      return cliente.focus();
                    }

                  }
                );
            }
          }

          if (self.clients.openWindow) {
            return self.clients.openWindow(destino);
          }

        }
      )
    );
  }
);
