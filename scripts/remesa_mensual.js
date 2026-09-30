// remesa_mensual.js - genera las facturas de las cuotas de contratos de un mes
//
// USO:  node scripts/remesa_mensual.js 2026-06
//
// Se pasa el mes a facturar (normalmente el que acaba de terminar).
// Lo añadio Roberto (becario) en verano de 2021 para no meter las cuotas
// a mano cada mes. Se lanza el dia 1 desde el ordenador de Marga.

var db = require('../db');
var util = require('../lib/util');
var calculo = require('../services/calculo');
var numeracion = require('../lib/numeracion');

var mes = process.argv[2];
if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
  console.log('Uso: node scripts/remesa_mensual.js YYYY-MM');
  process.exit(1);
}

var primerDia = mes + '-01';
var ultimoDia = mes + '-' + util.diasDelMes(mes + '-01');

db.inicializar(function (err) {
  if (err) { console.error(err); process.exit(1); }

  db.all('SELECT co.*, cl.nombre, cl.recargo_equivalencia, cl.dias_pago FROM contratos co ' +
    'JOIN clientes cl ON cl.id = co.cliente_id ' +
    'WHERE co.fecha_alta <= ? AND (co.fecha_baja IS NULL OR co.fecha_baja >= ?)',
    [ultimoDia, primerDia], function (err2, contratos) {
      if (err2) { console.error(err2); process.exit(1); }
      if (contratos.length === 0) { console.log('No hay contratos que facturar en ' + mes); process.exit(0); }

      var i = 0;
      procesarSiguiente();

      function procesarSiguiente() {
        if (i >= contratos.length) {
          console.log('Remesa ' + mes + ' terminada: ' + contratos.length + ' facturas.');
          process.exit(0);
        }
        var co = contratos[i++];

        // calcular el importe del mes; si el alta o la baja caen dentro
        // del mes se prorratea por los dias reales del mes
        var desde = co.fecha_alta > primerDia ? co.fecha_alta : primerDia;
        var hasta = (co.fecha_baja && co.fecha_baja < ultimoDia) ? co.fecha_baja : ultimoDia;
        var diasMes = util.diasDelMes(primerDia);
        var d1 = parseInt(desde.split('-')[2], 10);
        var d2 = parseInt(hasta.split('-')[2], 10);
        var diasServicio = d2 - d1 + 1;
        var importe = util.redondear2(co.cuota / diasMes * diasServicio);

        var sufijo = (diasServicio < diasMes) ? ' (' + diasServicio + ' dias)' : ' (' + nombreMes(mes) + ')';
        var lineas = [{ descripcion: co.concepto + sufijo, cantidad: 1, precio: importe, tipoIva: co.tipo_iva }];
        var calc = calculo.calcularFactura(lineas, { recargo_equivalencia: co.recargo_equivalencia });

        numeracion.siguienteNumero('FA', function (err3, numero) {
          if (err3) { console.error(err3); process.exit(1); }
          var fecha = ultimoDia;
          var venc = util.sumarDias(fecha, co.dias_pago || 30);
          db.run('INSERT INTO facturas (numero,serie,cliente_id,fecha,vencimiento,base,iva,recargo,total,estado,observaciones) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
            [numero, 'FA', co.cliente_id, fecha, venc, calc.base, calc.iva, calc.recargo, calc.total, 'emitida', 'Remesa ' + nombreMes(mes)],
            function (err4) {
              if (err4) { console.error(err4); process.exit(1); }
              var fid = this.lastID;
              var l = calc.lineas[0];
              db.run('INSERT INTO lineas (factura_id,descripcion,cantidad,precio,tipo_iva,base,cuota_iva,cuota_recargo) VALUES (?,?,?,?,?,?,?,?)',
                [fid, l.descripcion, l.cantidad, l.precio, l.tipoIva, l.base, l.cuotaIva, l.cuotaRecargo],
                function (err5) {
                  if (err5) { console.error(err5); process.exit(1); }
                  console.log('  ' + numero + '  ' + co.nombre + '  ' + calc.total.toFixed(2) + ' eur');
                  procesarSiguiente();
                });
            });
        });
      }
    });
});

function nombreMes(m) {
  var nombres = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return nombres[parseInt(m.split('-')[1], 10) - 1] + ' ' + m.split('-')[0];
}
