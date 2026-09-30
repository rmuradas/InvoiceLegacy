-- volcado de PRUEBA para la migracion a MySQL (Julian, oct 2018)
-- NUNCA SE LLEGO A EJECUTAR EN PRODUCCION. El esquema esta desfasado
-- (faltan recargo y rectificativas). Se guarda por si acaso.
CREATE TABLE clientes (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(120), nif VARCHAR(12));
CREATE TABLE facturas (id INT AUTO_INCREMENT PRIMARY KEY, numero VARCHAR(20), cliente INT, importe DECIMAL(10,2));
