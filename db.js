// db.js - acceso a la base de datos
// Julian 03/2018: pasamos de ficheros .json a sqlite porque se corrompian
// los datos cuando Marga y yo grabamos a la vez. La migracion a MySQL
// del servidor nuevo quedo pendiente (ver LEEME.txt).

var fs = require('fs');
var path = require('path');
var sqlite3 = require('sqlite3');
var config = require('./config');

if (!fs.existsSync(path.dirname(config.RUTA_BD))) {
  fs.mkdirSync(path.dirname(config.RUTA_BD));
}

var db = new sqlite3.Database(config.RUTA_BD);

function inicializar(cb) {
  db.serialize(function () {
    db.run('CREATE TABLE IF NOT EXISTS clientes (' +
      'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      'nombre TEXT NOT NULL,' +
      'nif TEXT,' +
      'direccion TEXT,' +
      'cp TEXT,' +
      'poblacion TEXT,' +
      'email TEXT,' +
      'recargo_equivalencia INTEGER DEFAULT 0,' +   // 1 = minorista en recargo
      'dias_pago INTEGER,' +                        // NULL -> el de config
      'activo INTEGER DEFAULT 1)');

    db.run('CREATE TABLE IF NOT EXISTS articulos (' +
      'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      'referencia TEXT,' +
      'nombre TEXT NOT NULL,' +
      'precio REAL NOT NULL,' +                     // precio unitario SIN iva
      'tipo_iva INTEGER NOT NULL,' +                // 21 / 10 / 4
      "unidad TEXT DEFAULT 'ud'," +                 // ud, kg, caja...
      'activo INTEGER DEFAULT 1)');

    // contratos = cuotas mensuales (alquiler de maquinas, mantenimientos)
    db.run('CREATE TABLE IF NOT EXISTS contratos (' +
      'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      'cliente_id INTEGER NOT NULL,' +
      'concepto TEXT NOT NULL,' +
      'cuota REAL NOT NULL,' +                      // cuota mensual sin iva
      'tipo_iva INTEGER NOT NULL DEFAULT 21,' +
      'fecha_alta TEXT NOT NULL,' +                 // YYYY-MM-DD
      'fecha_baja TEXT)');                          // NULL = sigue activo

    db.run('CREATE TABLE IF NOT EXISTS facturas (' +
      'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      'numero TEXT NOT NULL,' +                     // FA-2026-000123
      "serie TEXT NOT NULL DEFAULT 'FA'," +
      'cliente_id INTEGER NOT NULL,' +
      'fecha TEXT NOT NULL,' +
      'vencimiento TEXT,' +
      'base REAL NOT NULL,' +
      'iva REAL NOT NULL,' +
      'recargo REAL NOT NULL DEFAULT 0,' +
      'total REAL NOT NULL,' +
      "estado TEXT NOT NULL DEFAULT 'emitida'," +   // emitida / cobrada / rectificada
      'rectifica_a TEXT,' +                         // numero de la factura rectificada
      'observaciones TEXT)');

    db.run('CREATE TABLE IF NOT EXISTS lineas (' +
      'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      'factura_id INTEGER NOT NULL,' +
      'descripcion TEXT NOT NULL,' +
      'cantidad REAL NOT NULL,' +
      'precio REAL NOT NULL,' +
      'tipo_iva INTEGER NOT NULL,' +
      'base REAL NOT NULL,' +                       // ya redondeada (ver calculo.js)
      'cuota_iva REAL NOT NULL,' +
      'cuota_recargo REAL NOT NULL DEFAULT 0)');

    // contadores de numeracion por serie y año
    db.run('CREATE TABLE IF NOT EXISTS contadores (' +
      'serie TEXT NOT NULL,' +
      'anyo INTEGER NOT NULL,' +
      'ultimo INTEGER NOT NULL,' +
      'PRIMARY KEY (serie, anyo))');

    db.get('SELECT COUNT(*) AS n FROM clientes', function (err, fila) {
      if (err) return cb(err);
      if (fila.n > 0) return cb(null);
      cargarDatosIniciales(cb);
    });
  });
}

// datos que habia en el sistema cuando se hizo la copia (no tocar,
// administracion los usa de referencia)
function cargarDatosIniciales(cb) {
  db.serialize(function () {
    var insCli = db.prepare('INSERT INTO clientes (nombre,nif,direccion,cp,poblacion,email,recargo_equivalencia,dias_pago) VALUES (?,?,?,?,?,?,?,?)');
    insCli.run('Cafetería La Parada, S.C.', 'J45771102', 'Av. de la Estación 12', '45200', 'Illescas', 'laparada@gmail.com', 0, null);
    insCli.run('Ferretería El Tornillo', '03488812K', 'C/ Mayor 4', '45220', 'Yeles', 'eltornillo4@hotmail.com', 1, null);
    insCli.run('Restaurante Casa Ubaldo, S.L.', 'B45610021', 'Ctra. de Toledo km 3', '45200', 'Illescas', 'reservas@casaubaldo.es', 0, 60);
    insCli.run('Panadería Hnos. Cifuentes', 'E45332218', 'Pza. del Grano 2', '45223', 'Seseña', null, 1, null);
    insCli.run('Hotel Vega Baja, S.A.', 'A45102939', 'Av. Castilla-La Mancha 55', '45003', 'Toledo', 'compras@hotelvegabaja.com', 0, 60);
    insCli.run('Bar Nuevo Siglo', '70355910k', 'C/ Real 31', '45200', 'Illescas', null, 0, null);
    insCli.finalize();

    var insArt = db.prepare('INSERT INTO articulos (referencia,nombre,precio,tipo_iva,unidad) VALUES (?,?,?,?,?)');
    insArt.run('MEN-0012', 'Vaso caña 20cl (caja 72)', 21.60, 21, 'caja');
    insArt.run('MEN-0034', 'Plato llano hostelería 25cm (caja 12)', 28.90, 21, 'caja');
    insArt.run('ALI-0101', 'Aceite de oliva virgen extra 5L', 27.45, 4, 'ud');
    insArt.run('ALI-0117', 'Harina panificable 25kg', 14.20, 4, 'saco');
    insArt.run('ALI-0230', 'Café en grano natural 1kg', 11.95, 10, 'ud');
    insArt.run('ALI-0245', 'Azúcar blanquilla 10kg', 9.80, 10, 'saco');
    insArt.run('LIM-0410', 'Desengrasante cocinas 10L', 18.50, 21, 'ud');
    insArt.run('SER-0001', 'Portes y manipulación', 6.00, 21, 'ud');
    insArt.finalize();

    var insCon = db.prepare('INSERT INTO contratos (cliente_id,concepto,cuota,tipo_iva,fecha_alta,fecha_baja) VALUES (?,?,?,?,?,?)');
    insCon.run(1, 'Alquiler máquina de café Futurmat F3', 90.00, 21, '2024-03-01', null);
    insCon.run(3, 'Mantenimiento cámaras frigoríficas', 145.00, 21, '2023-01-15', null);
    insCon.run(5, 'Alquiler lavavasos barra piscina', 60.00, 21, '2025-06-16', '2025-09-15');
    insCon.run(6, 'Alquiler máquina de café Futurmat F3', 90.00, 21, '2026-02-15', null);
    insCon.finalize();

    // facturas historicas (resumen, tal cual quedaron grabadas)
    var insFac = db.prepare('INSERT INTO facturas (numero,serie,cliente_id,fecha,vencimiento,base,iva,recargo,total,estado,rectifica_a,observaciones) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
    var insLin = db.prepare('INSERT INTO lineas (factura_id,descripcion,cantidad,precio,tipo_iva,base,cuota_iva,cuota_recargo) VALUES (?,?,?,?,?,?,?,?)');

    insFac.run('FA-2026-000101', 'FA', 1, '2026-01-31', '2026-03-02', 133.20, 27.97, 0, 161.17, 'cobrada', null, 'Remesa enero');
    insLin.run(1, 'Alquiler máquina de café Futurmat F3 (enero)', 1, 90.00, 21, 90.00, 18.90, 0);
    insLin.run(1, 'Café en grano natural 1kg', 2, 11.95, 10, 23.90, 2.39, 0);
    insLin.run(1, 'Azúcar blanquilla 10kg', 1, 9.80, 10, 9.80, 0.98, 0);
    insLin.run(1, 'Vaso caña 20cl (caja 72)', 0.44, 21.60, 21, 9.50, 2.00, 0);

    insFac.run('FA-2026-000102', 'FA', 2, '2026-02-06', '2026-03-08', 115.60, 24.28, 6.01, 145.89, 'cobrada', null, null);
    insLin.run(2, 'Desengrasante cocinas 10L', 4, 18.50, 21, 74.00, 15.54, 3.85);
    insLin.run(2, 'Plato llano hostelería 25cm (caja 12)', 1, 28.90, 21, 28.90, 6.07, 1.50);
    insLin.run(2, 'Vaso caña 20cl (caja 72)', 0.5, 21.60, 21, 10.80, 2.27, 0.56);
    insLin.run(2, 'Portes y manipulación', 0.32, 6.00, 21, 1.90, 0.40, 0.10);

    // OJO caso comentado con la gestoria: base 1000 justa NO lleva descuento
    insFac.run('FA-2026-000103', 'FA', 5, '2026-02-20', '2026-04-21', 1000.00, 210.00, 0, 1210.00, 'cobrada', null, 'Pedido apertura temporada');
    insLin.run(3, 'Plato llano hostelería 25cm (caja 12)', 20, 28.90, 21, 578.00, 121.38, 0);
    insLin.run(3, 'Vaso caña 20cl (caja 72)', 15, 21.60, 21, 324.00, 68.04, 0);
    insLin.run(3, 'Desengrasante cocinas 10L', 5, 18.50, 21, 92.50, 19.43, 0);
    insLin.run(3, 'Portes y manipulación', 0.92, 6.00, 21, 5.50, 1.15, 0);

    insFac.run('FA-2026-000104', 'FA', 4, '2026-03-05', '2026-04-04', 152.30, 6.09, 0.76, 159.15, 'cobrada', null, null);
    insLin.run(4, 'Harina panificable 25kg', 8, 14.20, 4, 113.60, 4.54, 0.57);
    insLin.run(4, 'Aceite de oliva virgen extra 5L', 1.41, 27.45, 4, 38.70, 1.55, 0.19);

    insFac.run('FA-2026-000105', 'FA', 3, '2026-03-31', '2026-05-30', 2287.75, 468.63, 0, 2756.38, 'emitida', null, 'Descuento volumen 2% aplicado');
    insLin.run(5, 'Mantenimiento cámaras frigoríficas (marzo)', 1, 145.00, 21, 145.00, 30.45, 0);
    insLin.run(5, 'Aceite de oliva virgen extra 5L', 24, 27.45, 4, 658.80, 26.35, 0);
    insLin.run(5, 'Café en grano natural 1kg', 30, 11.95, 10, 358.50, 35.85, 0);
    insLin.run(5, 'Plato llano hostelería 25cm (caja 12)', 40, 28.90, 21, 1156.00, 242.76, 0);
    insLin.run(5, 'Portes y manipulación', 2.87, 6.00, 21, 17.20, 3.61, 0);

    insFac.run('FA-2026-000106', 'FA', 6, '2026-04-30', '2026-05-30', 101.61, 20.62, 0, 122.23, 'rectificada', null, 'Remesa abril. ERROR cuota duplicada, ver RE-2026-000001');
    insLin.run(6, 'Alquiler máquina de café Futurmat F3 (abril)', 1, 90.00, 21, 90.00, 18.90, 0);
    insLin.run(6, 'Café en grano natural 1kg', 0.97, 11.95, 10, 11.61, 1.16, 0);

    insFac.run('RE-2026-000001', 'RE', 6, '2026-05-06', null, -101.61, -20.62, 0, -122.23, 'emitida', 'FA-2026-000106', 'Rectifica FA-2026-000106 (cuota abril duplicada)');
    insLin.run(7, 'Rectificación: Alquiler máquina de café Futurmat F3 (abril)', -1, 90.00, 21, -90.00, -18.90, 0);
    insLin.run(7, 'Rectificación: Café en grano natural 1kg', -0.97, 11.95, 10, -11.61, -1.16, 0);

    insFac.run('FA-2026-000107', 'FA', 6, '2026-05-06', '2026-06-05', 101.61, 20.62, 0, 122.23, 'emitida', null, 'Sustituye a FA-2026-000106');
    insLin.run(8, 'Alquiler máquina de café Futurmat F3 (abril)', 1, 90.00, 21, 90.00, 18.90, 0);
    insLin.run(8, 'Café en grano natural 1kg', 0.97, 11.95, 10, 11.61, 1.16, 0);

    insFac.run('FA-2026-000108', 'FA', 1, '2026-05-31', '2026-06-30', 128.05, 26.19, 0, 154.24, 'emitida', null, 'Remesa mayo');
    insLin.run(9, 'Alquiler máquina de café Futurmat F3 (mayo)', 1, 90.00, 21, 90.00, 18.90, 0);
    insLin.run(9, 'Café en grano natural 1kg', 2, 11.95, 10, 23.90, 2.39, 0);
    insLin.run(9, 'Vaso caña 20cl (caja 72)', 0.66, 21.60, 21, 14.15, 2.97, 0);

    insFac.finalize();
    insLin.finalize();

    db.run("INSERT INTO contadores (serie,anyo,ultimo) VALUES ('FA',2026,108)");
    db.run("INSERT INTO contadores (serie,anyo,ultimo) VALUES ('RE',2026,1)", function (err) {
      cb(err || null);
    });
  });
}

module.exports = db;
module.exports.inicializar = inicializar;
