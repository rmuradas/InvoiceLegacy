// contratos.js - cuotas mensuales (alquileres y mantenimientos)

var express = require('express');
var router = express.Router();
var db = require('../db');
var util = require('../lib/util');
var calculo = require('../services/calculo');

router.get('/', function (req, res) {
  db.all('SELECT co.*, cl.nombre AS cliente FROM contratos co JOIN clientes cl ON cl.id = co.cliente_id ORDER BY cl.nombre', function (err, contratos) {
    if (err) return res.status(500).send('Error BD: ' + err.message);
    res.render('contratos', { contratos: contratos, util: util });
  });
});

router.post('/nuevo', function (req, res) {
  db.run('INSERT INTO contratos (cliente_id,concepto,cuota,tipo_iva,fecha_alta) VALUES (?,?,?,?,?)',
    [parseInt(req.body.cliente_id, 10), req.body.concepto,
      parseFloat(('' + req.body.cuota).replace(',', '.')),
      parseInt(req.body.tipo_iva || 21, 10),
      req.body.fecha_alta || util.hoy()],
    function (err) {
      if (err) return res.status(500).send('Error BD: ' + err.message);
      res.redirect('/contratos');
    });
});

// dar de baja un contrato a una fecha: si la baja cae a mitad de mes,
// administracion emite despues a mano la factura del prorrateo con el
// importe que calcula esta pantalla
router.post('/:id/baja', function (req, res) {
  var fechaBaja = req.body.fecha_baja || util.hoy();
  db.get('SELECT * FROM contratos WHERE id = ?', [req.params.id], function (err, contrato) {
    if (err || !contrato) return res.status(404).send('Contrato no encontrado');
    db.run('UPDATE contratos SET fecha_baja = ? WHERE id = ?', [fechaBaja, req.params.id], function (err2) {
      if (err2) return res.status(500).send('Error BD: ' + err2.message);
      // importe del ultimo mes: del dia 1 al dia de la baja, a lo comercial
      var primeroDeMes = fechaBaja.slice(0, 8) + '01';
      var importe = calculo.calcularProrrateo(contrato.cuota, primeroDeMes, fechaBaja);
      res.redirect('/contratos?prorrateo=' + importe.toFixed(2));
    });
  });
});

module.exports = router;
