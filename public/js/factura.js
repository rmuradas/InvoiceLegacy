// factura.js - autorrellenar precio e iva al elegir un articulo del desplegable
// (Roberto 2021; antes se copiaba a mano del listado de articulos)
document.querySelectorAll('.campo-desc').forEach(function (campo) {
  campo.addEventListener('change', function () {
    var opciones = document.querySelectorAll('#lista-articulos option');
    for (var i = 0; i < opciones.length; i++) {
      if (opciones[i].value === campo.value) {
        var fila = campo.closest('tr');
        fila.querySelector('.campo-precio').value = opciones[i].getAttribute('data-precio');
        fila.querySelector('select[name="iva"]').value = opciones[i].getAttribute('data-iva');
        break;
      }
    }
  });
});
