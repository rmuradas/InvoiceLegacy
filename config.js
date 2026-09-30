// config.js - configuracion general de GesFact
// OJO: este fichero se copia a mano al servidor de la oficina (\\SERVIDOR\gesfact)
// cuando se cambia algo. NO RENOMBRAR.

module.exports = {

  // Datos de la empresa (salen en las facturas)
  EMPRESA: {
    nombre: 'Suministros Hidalgo, S.L.',
    nif: 'B45812390',
    direccion: 'Pol. Ind. La Vega, nave 7',
    cp: '45200',
    poblacion: 'Illescas (Toledo)',
    telefono: '925 511 XXX',
    email: 'administracion@suministroshidalgo.es',
    registro: 'Insc. R.M. de Toledo, Tomo 1.482, Folio 90, Hoja TO-28.315'
  },

  // Base de datos (desde 2018 usamos sqlite, la migracion a MySQL quedo pendiente)
  RUTA_BD: './datos/gesfact.db',

  PUERTO: 3000,

  // IVA por defecto para articulos nuevos
  IVA_DEFECTO: 21,

  // Correo para envio de facturas -- DEJO DE FUNCIONAR en 2022 (Arsys),
  // hablar con Manoli antes de tocar nada de esto
  SMTP: {
    host: 'smtp.arsys.es',
    puerto: 465,
    usuario: 'facturas@suministroshidalgo.es',
    clave: 'Hidalgo2019!'
  },

  // clave que pide la gestoria para el fichero de exportacion (no cambiar)
  CLAVE_EXPORT_GESTORIA: 'SH-CONTA-7731',

  // dias de vencimiento por defecto si el cliente no tiene forma de pago
  VENCIMIENTO_DIAS: 30
};
