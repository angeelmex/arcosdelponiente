/*
 * Arcos del Poniente - recuperación de conexión residente V3
 *
 * Objetivo:
 * Si una consulta de ESTADO queda congelada por el navegador,
 * Android/PWA o una respuesta intermitente de Apps Script,
 * vuelve a consultar el estado de ESA MISMA operación.
 *
 * SEGURIDAD:
 * - NO reenvía formularios POST.
 * - NO genera un requestId nuevo.
 * - NO repite votos, pases, peticiones, cambios de perfil, etc.
 * - Solo activa el manejador de error que cada módulo ya tenía
 *   para volver a preguntar por el mismo requestId.
 *
 * Si este archivo no carga por cualquier motivo, las páginas
 * continúan usando su comportamiento anterior.
 */

(function () {

  "use strict";


  const TIEMPO_MAXIMO_CONSULTA_MS =
    6500;


  const TIEMPO_REANUDAR_MS =
    2200;


  const vigilados =
    new WeakMap();


  function esConsultaEstado(
    nodo
  ) {

    return (
      nodo &&
      nodo.tagName === "SCRIPT" &&
      String(
        nodo.src || ""
      ).indexOf(
        "api=operacionEstado"
      ) >= 0
    );

  }


  function liberar(
    script
  ) {

    const datos =
      vigilados.get(
        script
      );


    if (
      datos &&
      datos.temporizador
    ) {

      clearTimeout(
        datos.temporizador
      );

    }


    vigilados.delete(
      script
    );

  }


  function forzarReintentoSeguro(
    script
  ) {

    if (
      !script ||
      !script.isConnected
    ) {

      liberar(
        script
      );

      return;

    }


    /*
     * Cada módulo ya define script.onerror para:
     * 1) retirar esta consulta,
     * 2) esperar un momento,
     * 3) volver a consultar EL MISMO requestId.
     *
     * No tocamos ni repetimos el POST original.
     */
    if (
      typeof script.onerror ===
        "function"
    ) {

      const manejador =
        script.onerror;


      liberar(
        script
      );


      try {

        manejador.call(
          script,
          new Event(
            "error"
          )
        );

      }
      catch (error) {

        try {

          script.remove();

        }
        catch (errorRemove) {}

      }


      return;

    }


    /*
     * Si una página no tiene recuperación propia,
     * no inventamos una operación nueva.
     */
    liberar(
      script
    );

  }


  function vigilar(
    script
  ) {

    if (
      !esConsultaEstado(
        script
      ) ||
      vigilados.has(
        script
      )
    ) {

      return;

    }


    const datos = {
      inicio:
        Date.now(),

      temporizador:
        null
    };


    datos.temporizador =
      setTimeout(
        function() {

          forzarReintentoSeguro(
            script
          );

        },
        TIEMPO_MAXIMO_CONSULTA_MS
      );


    vigilados.set(
      script,
      datos
    );


    script.addEventListener(
      "load",
      function() {

        /*
         * Normalmente la propia respuesta elimina el script.
         * Damos un pequeño margen y limpiamos el watchdog si
         * la consulta terminó con normalidad.
         */
        setTimeout(
          function() {

            if (
              !script.isConnected
            ) {

              liberar(
                script
              );

            }

          },
          50
        );

      },
      {
        once:
          true
      }
    );

  }


  function revisarScriptsExistentes() {

    document
      .querySelectorAll(
        'script[src*="api=operacionEstado"]'
      )
      .forEach(
        vigilar
      );

  }


  function recuperarAlVolver() {

    if (
      document.visibilityState &&
      document.visibilityState !==
        "visible"
    ) {

      return;

    }


    document
      .querySelectorAll(
        'script[src*="api=operacionEstado"]'
      )
      .forEach(
        function(script) {

          const datos =
            vigilados.get(
              script
            );


          if (
            !datos
          ) {

            vigilar(
              script
            );

            return;

          }


          if (
            Date.now() -
              datos.inicio >=
              TIEMPO_REANUDAR_MS
          ) {

            forzarReintentoSeguro(
              script
            );

          }

        }
      );

  }


  const observador =
    new MutationObserver(
      function(cambios) {

        cambios.forEach(
          function(cambio) {

            cambio.addedNodes
              .forEach(
                function(nodo) {

                  if (
                    esConsultaEstado(
                      nodo
                    )
                  ) {

                    vigilar(
                      nodo
                    );

                  }

                }
              );

          }
        );

      }
    );


  function iniciar() {

    revisarScriptsExistentes();


    observador.observe(
      document.documentElement,
      {
        childList:
          true,

        subtree:
          true
      }
    );


    document.addEventListener(
      "visibilitychange",
      function() {

        if (
          document.visibilityState ===
            "visible"
        ) {

          recuperarAlVolver();

        }

      }
    );


    window.addEventListener(
      "pageshow",
      recuperarAlVolver
    );

  }


  if (
    document.readyState ===
      "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      iniciar,
      {
        once:
          true
      }
    );

  }
  else {

    iniciar();

  }

})();
