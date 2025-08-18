$(document).ready(function () {
  // Cuando se hace clic en un enlace de la sub-navbar
  $("#squeegee-tabs .nav-link").on("click", function (event) {
    // Previene el comportamiento por defecto del enlace (que es recargar la página)
    event.preventDefault();

    // 1. Quita la clase "active" de todas las pestañas
    $("#squeegee-tabs .nav-link").removeClass("active");

    // 2. Añade la clase "active" solo a la pestaña que se le hizo clic
    $(this).addClass("active");

    // 3. Oculta todos los paneles de contenido
    $(".tab-content-panel").hide();

    // 4. Muestra solo el panel de contenido correspondiente a la pestaña
    var target = $(this).data("target"); // Obtiene el valor de "data-target"
    $(target).show(); // Muestra el div con el ID correspondiente
  });
});

$(document).ready(function () {
  // 1. Define los datos: qué modelos corresponden a cada línea de trabajo.
  // La clave (ej: 'wkl1') debe coincidir con el 'value' del primer menú.
  const modelosPorLinea = {
    wkl1: [
      { value: "MRR35", text: "MRR35" },
      { value: "FCM-30", text: "FCM-30" },
      { value: "powerPack-gen3-k4a", text: "PowerPack Gen3.0 KA4" },
    ],
    wkl2: [
      { value: "MGH100AD-ESC-BL7", text: "MGH100AD ESC BL7" },
      { value: "MGH100AD-MOCi", text: "MGH100AD MOCi" },
      { value: "MGH100AD-Esc", text: "MGH100AD Esc" },
      { value: "IDB-Gen2-IPTS", text: "IDB Gen2  IPTS" },
      { value: "powerPack-gen3-k4a", text: "PowerPack Gen3.0 KA4" },
      
    ],
    wkl3: [
      { value: "IDB-Gen2-IPTS", text: "IDB Gen2  IPTS" },
      { value: "MGH100-RCU", text: "MGH100 RCU" },
      { value: "IDB-GEN2-MAIN-AD", text: "IDB GEN 2.0 MAIN AD" },
    ],
    wkl4: [
      { value: "IDB-Gen2-IPTS", text: "IDB Gen2  IPTS" },
      { value: "MGH100-RCU", text: "MGH100 RCU" },
      { value: "IDB-GEN2-MAIN-AD", text: "IDB GEN 2.0 MAIN AD" },
      { value: "IAMM2", text: "IAMM2" },
      { value: "FRHC", text: "FRHC" },
    ],
  };

  // 2. Escucha el evento "change" en el menú de Línea de Trabajo.
  $("#lineaDeTrabajo").on("change", function () {
    const lineaSeleccionada = $(this).val(); // Obtiene el valor seleccionado (ej: 'wkl1')
    const $modeloSelect = $("#modelo"); // Selecciona el menú de modelos

    // 3. Limpia las opciones anteriores del menú de modelos (excepto la primera que dice "Seleccionar")
    $modeloSelect.find("option:not(:first)").remove();

    // 4. Comprueba si se ha seleccionado una línea válida.
    if (lineaSeleccionada) {
      // Si se seleccionó una línea, habilita el menú de modelos.
      $modeloSelect.prop("disabled", false);

      // Obtiene los modelos que corresponden a la línea seleccionada.
      const modelos = modelosPorLinea[lineaSeleccionada];

      // 5. Agrega las nuevas opciones al menú de modelos.
      if (modelos) {
        modelos.forEach(function (modelo) {
          $modeloSelect.append(
            $("<option>", {
              value: modelo.value,
              text: modelo.text,
            })
          );
        });
      }
    } else {
      // Si se vuelve a "Seleccionar", deshabilita el menú de modelos.
      $modeloSelect.prop("disabled", true);
    }
  });
});
