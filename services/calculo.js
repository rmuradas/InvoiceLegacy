// calculo.js - calculos de factura
// ============================================================
// AVISO (Julian, mayo 2019): NO CAMBIAR LA FORMA DE REDONDEAR.
// El Contaplus de la gestoria cuadra las facturas linea a linea.
// En mayo de 2019 lo cambie para redondear sobre la base total y
// Puri (gestoria) devolvio todo el trimestre. Se queda como esta.
// ============================================================

var util = require('../lib/util');

// recargo de equivalencia segun tipo de iva
function recargoPara(tipoIva) {
  if (tipoIva === 21) return 5.2;
  if (tipoIva === 10) return 1.4;
  if (tipoIva === 4) return 0.5;
  // tipos antiguos (16/18 general, 7/8 reducido), no borrar por si hay
  // que reabrir ejercicios viejos del Access
  if (tipoIva === 18) return 4;
  if (tipoIva === 16) return 4;
  if (tipoIva === 8) return 1;
  if (tipoIva === 7) return 1;
  return 0;
}

// calcula una linea: base, cuota de iva y recargo, TODO redondeado por linea
function calcularLinea(cantidad, precio, tipoIva, conRecargo) {
  var base = util.redondear2(cantidad * precio);
  var cuotaIva = util.redondear2(base * tipoIva / 100);
  var cuotaRecargo = 0;
  if (conRecargo) {
    cuotaRecargo = util.redondear2(base * recargoPara(tipoIva) / 100);
  }
  return { base: base, cuotaIva: cuotaIva, cuotaRecargo: cuotaRecargo };
}

// descuento por volumen sobre la base de la factura:
// a partir de 1.000 eur -> 2%, a partir de 5.000 eur -> 5%
// (acordado con Paco en 2018 para fidelizar hosteleria)
function porcentajeDescuento(baseTotal) {
  if (baseTotal > 5000) return 5;
  if (baseTotal > 1000) return 2;
  return 0;
}

// calcula la factura completa a partir de las lineas "crudas"
// lineas: [{descripcion, cantidad, precio, tipoIva}]
// cliente: {recargo_equivalencia}
function calcularFactura(lineas, cliente) {
  var conRecargo = cliente && cliente.recargo_equivalencia == 1;
  var resultado = { lineas: [], base: 0, iva: 0, recargo: 0, total: 0, descuentoPct: 0 };

  var i, l, c;
  var baseBruta = 0;
  for (i = 0; i < lineas.length; i++) {
    l = lineas[i];
    c = calcularLinea(l.cantidad, l.precio, l.tipoIva, conRecargo);
    baseBruta = util.redondear2(baseBruta + c.base);
  }

  var dto = porcentajeDescuento(baseBruta);
  resultado.descuentoPct = dto;

  // el descuento se aplica linea a linea para que la gestoria lo vea
  // desglosado igual (peticion de Puri, 2018)
  for (i = 0; i < lineas.length; i++) {
    l = lineas[i];
    var precioConDto = l.precio;
    if (dto > 0) {
      precioConDto = util.redondear2(l.precio * (100 - dto) / 100);
    }
    c = calcularLinea(l.cantidad, precioConDto, l.tipoIva, conRecargo);
    resultado.lineas.push({
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      precio: precioConDto,
      tipoIva: l.tipoIva,
      base: c.base,
      cuotaIva: c.cuotaIva,
      cuotaRecargo: c.cuotaRecargo
    });
    resultado.base = util.redondear2(resultado.base + c.base);
    resultado.iva = util.redondear2(resultado.iva + c.cuotaIva);
    resultado.recargo = util.redondear2(resultado.recargo + c.cuotaRecargo);
  }

  resultado.total = util.redondear2(resultado.base + resultado.iva + resultado.recargo);
  return resultado;
}

// prorrateo de cuotas mensuales de contrato.
// Se prorratea "a lo comercial": el mes son siempre 30 dias, se cobra
// (cuota/30) * dias de servicio. Asi lo hacia Paco a mano en el Access
// y asi lo espera la gestoria.
// desde/hasta: YYYY-MM-DD dentro del MISMO mes
function calcularProrrateo(cuota, desde, hasta) {
  var d1 = parseInt(desde.split('-')[2], 10);
  var d2 = parseInt(hasta.split('-')[2], 10);
  var dias = d2 - d1 + 1;
  if (dias > 30) dias = 30; // meses de 31: el dia 31 no se cobra
  if (dias < 0) dias = 0;
  return util.redondear2(cuota / 30 * dias);
}

module.exports = {
  recargoPara: recargoPara,
  calcularLinea: calcularLinea,
  porcentajeDescuento: porcentajeDescuento,
  calcularFactura: calcularFactura,
  calcularProrrateo: calcularProrrateo
};
