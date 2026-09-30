// email.js - envio de facturas por correo
//
// FUERA DE SERVICIO desde 2022: Arsys cambio el servidor de correo y
// dejo de autenticar. Las facturas se estan enviando A MANO desde el
// Outlook de Marga (se imprime la vista de factura a PDF con el navegador).
// Hablar con Manoli antes de reactivar esto.

// var nodemailer = require('nodemailer'); // desinstalado en 2023, daba un aviso de seguridad
var config = require('../config');

function enviarFactura(factura, cliente, cb) {
  /*
  var transporte = nodemailer.createTransport({
    host: config.SMTP.host,
    port: config.SMTP.puerto,
    secure: true,
    auth: { user: config.SMTP.usuario, pass: config.SMTP.clave }
  });
  transporte.sendMail({
    from: config.SMTP.usuario,
    to: cliente.email,
    subject: 'Factura ' + factura.numero + ' - Suministros Hidalgo',
    text: 'Adjuntamos su factura. Gracias por su confianza.'
  }, cb);
  */
  console.log('[email] AVISO: envio desactivado. Factura ' + factura.numero +
    ' pendiente de enviar a mano a ' + (cliente.email || '(sin email)'));
  cb(null);
}

module.exports = { enviarFactura: enviarFactura };
