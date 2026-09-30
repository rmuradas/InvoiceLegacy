// facturas.js - todo lo de facturas (listado, nueva, detalle, rectificar, cobro)
// Julian: este fichero se ha ido haciendo grande, algun dia habria que
// partirlo. "Algun dia".

var express = require('express');
var router = express.Router();
var db = require('../db');
var util = require('../lib/util');
var calculo = require('../services/calculo');
var numeracion = require('../lib/numeracion');
var email = require('../services/email');
var config = require('../config');

// listado
router.get('/', function (req, res) {
  var sql = 'SELECT f.*, c.nombre AS cliente FROM facturas f JOIN clientes c ON c.id = f.cliente_id';
  var params = [];
  if (req.query.estado) {
    sql += ' WHERE f.estado = ?';
    params.push(req.query.estado);
  }
  sql += ' ORDER BY f.fecha DESC, f.id DESC';
  db.all(sql, params, function (err, facturas) {
    if (err) return res.status(500).send('Error BD: ' + err.message);
    res.render('facturas', { facturas: facturas, util: util, filtro: req.query.estado || '' });
  });
});

// formulario de nueva factura
router.get('/nueva', function (req, res) {
  db.all('SELECT * FROM clientes WHERE activo = 1 ORDER BY nombre', function (err, clientes) {
    if (err) return res.status(500).send('Error BD: ' + err.message);
    db.all('SELECT * FROM articulos WHERE activo = 1 ORDER BY referencia', function (err2, articulos) {
      if (err2) return res.status(500).send('Error BD: ' + err2.message);
      res.render('factura_nueva', { clientes: clientes, articulos: articulos });
    });
  });
});

// grabar factura nueva
// el formulario manda: cliente_id, fecha, obs y arrays desc[], cant[], precio[], iva[]
router.post('/nueva', function (req, res) {
  var clienteId = parseInt(req.body.cliente_id, 10);
  var fecha = req.body.fecha || util.hoy();

  db.get('SELECT * FROM clientes WHERE id = ?', [clienteId], function (err, cliente) {
    if (err || !cliente) return res.status(400).send('Cliente no valido');

    // montar lineas desde el formulario
    var descs = [].concat(req.body.desc || []);
    var cants = [].concat(req.body.cant || []);
    var precios = [].concat(req.body.precio || []);
    var ivas = [].concat(req.body.iva || []);
    var lineas = [];
    for (var i = 0; i < descs.length; i++) {
      if (!descs[i]) continue; // filas vacias del formulario
      lineas.push({
        descripcion: descs[i],
        cantidad: parseFloat(('' + cants[i]).replace(',', '.')),
        precio: parseFloat(('' + precios[i]).replace(',', '.')),
        tipoIva: parseInt(ivas[i], 10)
      });
    }
    if (lineas.length === 0) return res.status(400).send('La factura no tiene lineas');

    var calc = calculo.calcularFactura(lineas, cliente);

    var dias = cliente.dias_pago || config.VENCIMIENTO_DIAS;
    var vencimiento = util.sumarDias(fecha, dias);

    numeracion.siguienteNumero('FA', function (err2, numero) {
      if (err2) return res.status(500).send('Error numeracion: ' + err2.message);

      db.run('INSERT INTO facturas (numero,serie,cliente_id,fecha,vencimiento,base,iva,recargo,total,estado,observaciones) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [numero, 'FA', clienteId, fecha, vencimiento, calc.base, calc.iva, calc.recargo, calc.total, 'emitida',
          (req.body.obs || '') + (calc.descuentoPct > 0 ? ' Descuento volumen ' + calc.descuentoPct + '% aplicado' : '')],
        function (err3) {
          if (err3) return res.status(500).send('Error al grabar: ' + err3.message);
          var facturaId = this.lastID;

          // grabar lineas una a una (si falla una a mitad ya se apaño en su
          // dia a mano en la bd, no ha vuelto a pasar)
          var pendientes = calc.lineas.length;
          var huboError = null;
          calc.lineas.forEach(function (l) {
            db.run('INSERT INTO lineas (factura_id,descripcion,cantidad,precio,tipo_iva,base,cuota_iva,cuota_recargo) VALUES (?,?,?,?,?,?,?,?)',
              [facturaId, l.descripcion, l.cantidad, l.precio, l.tipoIva, l.base, l.cuotaIva, l.cuotaRecargo],
              function (e) {
                if (e) huboError = e;
                pendientes--;
                if (pendientes === 0) {
                  if (huboError) return res.status(500).send('Error al grabar lineas: ' + huboError.message);
                  email.enviarFactura({ numero: numero }, cliente, function () {
                    res.redirect('/facturas/' + facturaId);
                  });
                }
              });
          });
        });
    });
  });
});

// detalle / vista imprimible
router.get('/:id', function (req, res) {
  db.get('SELECT f.*, c.nombre AS cliente, c.nif, c.direccion, c.cp, c.poblacion, c.recargo_equivalencia FROM facturas f JOIN clientes c ON c.id = f.cliente_id WHERE f.id = ?',
    [req.params.id], function (err, factura) {
      if (err || !factura) return res.status(404).send('Factura no encontrada');
      db.all('SELECT * FROM lineas WHERE factura_id = ? ORDER BY id', [req.params.id], function (err2, lineas) {
        if (err2) return res.status(500).send('Error BD: ' + err2.message);
        res.render('factura_detalle', { f: factura, lineas: lineas, util: util, empresa: config.EMPRESA });
      });
    });
});

// marcar como cobrada
router.post('/:id/cobrar', function (req, res) {
  db.run("UPDATE facturas SET estado = 'cobrada' WHERE id = ? AND estado = 'emitida'", [req.params.id], function (err) {
    if (err) return res.status(500).send('Error BD: ' + err.message);
    res.redirect('/facturas/' + req.params.id);
  });
});

// rectificar una factura entera (abono total).
// Genera la rectificativa en serie RE con los importes en negativo y deja
// la original en estado "rectificada". Copia las lineas invirtiendo signos.
// OJO: aqui NO se recalcula nada, se invierte lo que hay (Puri dixit:
// la rectificativa tiene que ser espejo exacto de la original).
router.post('/:id/rectificar', function (req, res) {
  db.get('SELECT f.*, c.nombre AS cliente FROM facturas f JOIN clientes c ON c.id = f.cliente_id WHERE f.id = ?', [req.params.id], function (err, f) {
    if (err || !f) return res.status(404).send('Factura no encontrada');
    if (f.estado === 'rectificada') return res.status(400).send('Ya esta rectificada');
    if (f.serie === 'RE') return res.status(400).send('No se rectifica una rectificativa');

    db.all('SELECT * FROM lineas WHERE factura_id = ?', [req.params.id], function (err2, lineas) {
      if (err2) return res.status(500).send('Error BD: ' + err2.message);

      numeracion.siguienteNumero('RE', function (err3, numero) {
        if (err3) return res.status(500).send('Error numeracion: ' + err3.message);

        db.run('INSERT INTO facturas (numero,serie,cliente_id,fecha,vencimiento,base,iva,recargo,total,estado,rectifica_a,observaciones) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          [numero, 'RE', f.cliente_id, util.hoy(), null, -f.base, -f.iva, -f.recargo, -f.total, 'emitida', f.numero,
            'Rectifica ' + f.numero + '. ' + (req.body.motivo || '')],
          function (err4) {
            if (err4) return res.status(500).send('Error al grabar: ' + err4.message);
            var rectId = this.lastID;
            var pendientes = lineas.length;
            lineas.forEach(function (l) {
              db.run('INSERT INTO lineas (factura_id,descripcion,cantidad,precio,tipo_iva,base,cuota_iva,cuota_recargo) VALUES (?,?,?,?,?,?,?,?)',
                [rectId, 'Rectificación: ' + l.descripcion, -l.cantidad, l.precio, l.tipo_iva, -l.base, -l.cuota_iva, -l.cuota_recargo],
                function () {
                  pendientes--;
                  if (pendientes === 0) {
                    db.run("UPDATE facturas SET estado = 'rectificada' WHERE id = ?", [f.id], function () {
                      res.redirect('/facturas/' + rectId);
                    });
                  }
                });
            });
          });
      });
    });
  });
});

module.exports = router;
