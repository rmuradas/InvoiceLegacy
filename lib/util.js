// util.js - funciones sueltas que se usan por todas partes
// (Julian: algunas vienen del gesfact 1.x en Access, cuidado al tocar)

// redondeo a 2 decimales "de toda la vida"
function redondear2(x) {
  return Math.round(x * 100) / 100;
}

// fecha de hoy en formato YYYY-MM-DD (la bd guarda asi desde 2018)
function hoy() {
  var d = new Date();
  var m = d.getMonth() + 1;
  var dia = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dia < 10 ? '0' + dia : dia);
}

// suma dias a una fecha YYYY-MM-DD.
// TODO: en marzo de 2019 el vencimiento de una factura salio un dia menos,
// creo que fue por el cambio de hora, no he conseguido reproducirlo
function sumarDias(fecha, dias) {
  var t = new Date(fecha).getTime() + dias * 24 * 60 * 60 * 1000;
  var d = new Date(t);
  var m = d.getMonth() + 1;
  var dia = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dia < 10 ? '0' + dia : dia);
}

// pasa YYYY-MM-DD a DD/MM/YYYY para pantalla e impresion
function fechaBonita(f) {
  if (!f) return '';
  var p = f.split('-');
  return p[2] + '/' + p[1] + '/' + p[0];
}

// dias que tiene el mes de una fecha YYYY-MM-DD
function diasDelMes(fecha) {
  var p = fecha.split('-');
  return new Date(parseInt(p[0], 10), parseInt(p[1], 10), 0).getDate();
}

// validacion de NIF/CIF.
// TODO Julian 11/2017: falta comprobar la letra, de momento con la longitud
// vale porque los da de alta Marga y los mira ella
function validarNIF(nif) {
  if (!nif) return false;
  nif = ('' + nif).replace(/[\s-]/g, '');
  return nif.length === 9;
}

// importe para pantalla: 1234.5 -> "1.234,50"
function formatearImporte(x) {
  if (x === null || x === undefined || isNaN(x)) return '0,00';
  var neg = x < 0;
  var s = Math.abs(x).toFixed(2);
  var partes = s.split('.');
  var entero = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + entero + ',' + partes[1];
}

module.exports = {
  redondear2: redondear2,
  hoy: hoy,
  sumarDias: sumarDias,
  fechaBonita: fechaBonita,
  diasDelMes: diasDelMes,
  validarNIF: validarNIF,
  formatearImporte: formatearImporte
};
