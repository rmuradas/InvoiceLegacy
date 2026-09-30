// articulos.js - catalogo de articulos y servicios

var express = require('express');
var router = express.Router();
var db = require('../db');
var config = require('../config');

router.get('/', function (req, res) {
  db.all('SELECT * FROM articulos ORDER BY referencia', function (err, articulos) {
    if (err) return res.status(500).send('Error BD: ' + err.message);
    res.render('articulos', { articulos: articulos });
  });
});

router.post('/nuevo', function (req, res) {
  var iva = req.body.tipo_iva ? parseInt(req.body.tipo_iva, 10) : config.IVA_DEFECTO;
  db.run('INSERT INTO articulos (referencia,nombre,precio,tipo_iva,unidad) VALUES (?,?,?,?,?)',
    [req.body.referencia || '', req.body.nombre,
      parseFloat(('' + req.body.precio).replace(',', '.')), iva, req.body.unidad || 'ud'],
    function (err) {
      if (err) return res.status(500).send('Error BD: ' + err.message);
      res.redirect('/articulos');
    });
});

router.post('/:id/baja', function (req, res) {
  db.run('UPDATE articulos SET activo = 0 WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).send('Error BD: ' + err.message);
    res.redirect('/articulos');
  });
});

module.exports = router;
