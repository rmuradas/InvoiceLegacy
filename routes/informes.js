// informes.js - resumen de iva y exportacion para la gestoria

var express = require('express');
var router = express.Router();
var db = require('../db');
var util = require('../lib/util');
var config = require('../config');

router.get('/', function (req, res) {
  res.render('informes', { anyo: new Date().getFullYear() });
});

// resumen de iva por trimestre (para el modelo 303 lo termina la gestoria)
router.get('/iva', function (req, res) {
  var anyo = parseInt(req.query.anyo, 10) || new Date().getFullYear();
  var t = parseInt(req.query.trimestre, 10) || 1;
  var meses = { 1: ['01', '03'], 2: ['04', '06'], 3: ['07', '09'], 4: ['10', '12'] };
  var desde = anyo + '-' + meses[t][0] + '-01';
  var hasta = anyo + '-' + meses[t][1] + '-31';

  // se suma desde las lineas para tener el desglose por tipo (las
  // rectificativas entran con signo negativo y cuadran solas)
  db.all('SELECT l.tipo_iva, SUM(l.base) AS base, SUM(l.cuota_iva) AS cuota, SUM(l.cuota_recargo) AS recargo ' +
    'FROM lineas l JOIN facturas f ON f.id = l.factura_id ' +
    'WHERE f.fecha >= ? AND f.fecha <= ? GROUP BY l.tipo_iva ORDER BY l.tipo_iva DESC',
    [desde, hasta], function (err, filas) {
      if (err) return res.status(500).send('Error BD: ' + err.message);
      res.render('informe_iva', { filas: filas, anyo: anyo, trimestre: t, util: util });
    });
});

// exportacion CSV para la gestoria (formato acordado con Puri en 2019:
// punto y coma, decimales con coma, y la clave en la primera linea)
router.get('/export-gestoria', function (req, res) {
  var anyo = parseInt(req.query.anyo, 10) || new Date().getFullYear();
  db.all('SELECT f.numero, f.fecha, c.nombre, c.nif, f.base, f.iva, f.recargo, f.total, f.estado ' +
    'FROM facturas f JOIN clientes c ON c.id = f.cliente_id ' +
    "WHERE f.fecha LIKE ? ORDER BY f.numero", [anyo + '-%'], function (err, filas) {
      if (err) return res.status(500).send('Error BD: ' + err.message);
      var lineas = ['CLAVE;' + config.CLAVE_EXPORT_GESTORIA];
      lineas.push('NUMERO;FECHA;CLIENTE;NIF;BASE;IVA;RECARGO;TOTAL;ESTADO');
      filas.forEach(function (f) {
        lineas.push([f.numero, util.fechaBonita(f.fecha), f.nombre, f.nif || '',
          util.formatearImporte(f.base), util.formatearImporte(f.iva),
          util.formatearImporte(f.recargo), util.formatearImporte(f.total), f.estado].join(';'));
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="facturas_' + anyo + '.csv"');
      res.send(lineas.join('\r\n'));
    });
});

module.exports = router;
