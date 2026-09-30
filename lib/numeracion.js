// numeracion.js - numeracion de facturas por serie y año
//
// IMPORTANTE (legal): la numeracion tiene que ser correlativa y sin
// huecos dentro de cada serie y año. Por eso desde la inspeccion de 2020
// las facturas NO SE BORRAN NUNCA: si hay un error se hace rectificativa
// en la serie RE y se emite una nueva.
//
// Julian 01/2021: el 2 de enero salieron dos facturas con el mismo numero
// porque Marga y yo grabamos a la vez. Puse el ultimo+1 leyendo justo
// antes de grabar y no ha vuelto a pasar (creo).

var db = require('../db');

function siguienteNumero(serie, cb) {
  var anyo = new Date().getFullYear();
  db.get('SELECT ultimo FROM contadores WHERE serie = ? AND anyo = ?', [serie, anyo], function (err, fila) {
    if (err) return cb(err);
    if (!fila) {
      // año nuevo: se abre contador a cero
      db.run('INSERT INTO contadores (serie, anyo, ultimo) VALUES (?,?,0)', [serie, anyo], function (e2) {
        if (e2) return cb(e2);
        reservar(serie, anyo, 0, cb);
      });
    } else {
      reservar(serie, anyo, fila.ultimo, cb);
    }
  });
}

function reservar(serie, anyo, ultimo, cb) {
  var nuevo = ultimo + 1;
  db.run('UPDATE contadores SET ultimo = ? WHERE serie = ? AND anyo = ?', [nuevo, serie, anyo], function (err) {
    if (err) return cb(err);
    cb(null, formatear(serie, anyo, nuevo));
  });
}

function formatear(serie, anyo, n) {
  var s = '' + n;
  while (s.length < 6) s = '0' + s;
  return serie + '-' + anyo + '-' + s;
}

module.exports = {
  siguienteNumero: siguienteNumero,
  formatear: formatear
};
