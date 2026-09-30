// server.js - GesFact 2.4 (Suministros Hidalgo)
// arrancar con: node server.js   y abrir http://localhost:3000
//
// v2.4 (2021): añadido el script de remesas de Roberto
// v2.3 (2019): informes de iva y export gestoria
// v2.2 (2018): paso de json a sqlite
// v2.0 (2017): reescritura del gesfact 1.x (Access) en node

var express = require('express');
var bodyParser = require('body-parser');
var db = require('./db');
var config = require('./config');

var app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

app.get('/', function (req, res) {
  // dashboard: cuatro numeros y a correr
  db.get('SELECT COUNT(*) AS n FROM facturas', function (e1, f) {
    db.get("SELECT COUNT(*) AS n FROM facturas WHERE estado = 'emitida'", function (e2, p) {
      db.get("SELECT SUM(total) AS s FROM facturas WHERE estado = 'emitida' AND serie = 'FA'", function (e3, imp) {
        db.get('SELECT COUNT(*) AS n FROM clientes WHERE activo = 1', function (e4, c) {
          res.render('index', {
            totalFacturas: f ? f.n : 0,
            pendientes: p ? p.n : 0,
            importePendiente: imp && imp.s ? imp.s : 0,
            clientes: c ? c.n : 0
          });
        });
      });
    });
  });
});

app.use('/clientes', require('./routes/clientes'));
app.use('/articulos', require('./routes/articulos'));
app.use('/contratos', require('./routes/contratos'));
app.use('/facturas', require('./routes/facturas'));
app.use('/informes', require('./routes/informes'));

db.inicializar(function (err) {
  if (err) {
    console.error('Error inicializando la base de datos:', err);
    process.exit(1);
  }
  app.listen(config.PUERTO, function () {
    console.log('==============================================');
    console.log('  GesFact 2.4 - Suministros Hidalgo, S.L.');
    console.log('  http://localhost:' + config.PUERTO);
    console.log('==============================================');
  });
});
