// clientes.js - mantenimiento de clientes

var express = require('express');
var router = express.Router();
var db = require('../db');
var util = require('../lib/util');

router.get('/', function (req, res) {
  db.all('SELECT * FROM clientes ORDER BY nombre', function (err, clientes) {
    if (err) return res.status(500).send('Error BD: ' + err.message);
    res.render('clientes', { clientes: clientes, aviso: req.query.aviso || '' });
  });
});

router.post('/nuevo', function (req, res) {
  // la validacion "fuerte" la hace Marga mirandolo :)
  if (!req.body.nombre) return res.redirect('/clientes?aviso=Falta el nombre');
  if (req.body.nif && !util.validarNIF(req.body.nif)) {
    return res.redirect('/clientes?aviso=El NIF no parece valido');
  }
  db.run('INSERT INTO clientes (nombre,nif,direccion,cp,poblacion,email,recargo_equivalencia,dias_pago) VALUES (?,?,?,?,?,?,?,?)',
    [req.body.nombre, req.body.nif || null, req.body.direccion || null, req.body.cp || null,
      req.body.poblacion || null, req.body.email || null,
      req.body.recargo_equivalencia ? 1 : 0,
      req.body.dias_pago ? parseInt(req.body.dias_pago, 10) : null],
    function (err) {
      if (err) return res.status(500).send('Error BD: ' + err.message);
      res.redirect('/clientes');
    });
});

router.post('/:id/baja', function (req, res) {
  db.run('UPDATE clientes SET activo = 0 WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).send('Error BD: ' + err.message);
    res.redirect('/clientes');
  });
});

module.exports = router;
