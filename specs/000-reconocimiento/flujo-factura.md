# Ciclo de vida de una factura — GesFact 2.4

**Fase**: Caracterización (reconocimiento del sistema tal y como existe hoy).
**Fecha del análisis**: 2026-09-30.
**Método**: lectura completa, paso a paso, del código que crea, numera, calcula,
graba y cambia de estado una factura. Toda afirmación se apoya en fichero y líneas
concretas, o en datos reales observados en `datos/gesfact.db` (los datos de
referencia cargados por `db.js`, que son datos reales de producción según el propio
comentario del fichero — [db.js:91-92](../../db.js#L91-L92)). Donde no ha sido
posible confirmar un dato con código, se marca explícitamente como **SUPOSICIÓN**.

> Nota de alcance: este documento describe el comportamiento observado. No evalúa si
> es correcto ni propone cambios — eso corresponde al registro de anomalías y a una
> fase posterior, según la Constitución de esta fase
> ([.specify/memory/constitution.md](../../.specify/memory/constitution.md)).

---

## 0. Los tres caminos, confirmados en código

Se ha buscado en todo el repositorio cada sentencia `INSERT INTO facturas` para no
dar por supuesto ningún camino de creación. Resultado de la búsqueda (cuatro
apariciones, no tres):

| Fichero:línea | ¿Es un camino de creación real? |
|---|---|
| [routes/facturas.js:74](../../routes/facturas.js#L74) | Sí — **Camino A**, creación manual desde la web. |
| [scripts/remesa_mensual.js:61](../../scripts/remesa_mensual.js#L61) | Sí — **Camino B**, remesa mensual de contratos. |
| [routes/facturas.js:141](../../routes/facturas.js#L141) | Sí — **Camino C**, rectificación de una factura existente. |
| [db.js:123](../../db.js#L123) | **No**. Es la carga de datos de referencia que se ejecuta una sola vez, solo si la tabla `clientes` está vacía ([db.js:83-87](../../db.js#L83-L87)). No es un flujo de negocio: no pasa por `services/calculo.js` ni por `lib/numeracion.js`, inserta importes ya calculados a mano. Se excluye de este documento salvo como fuente de datos reales de ejemplo (sección 5.6). |

Un cuarto punto que **no** es un camino de creación pese a tocar `services/calculo.js`
y contratos: `routes/contratos.js:31-43` (baja de un contrato) calcula un prorrateo
con `calculo.calcularProrrateo` pero **no inserta ninguna factura** — solo muestra el
importe calculado en la URL de redirección
([routes/contratos.js:40](../../routes/contratos.js#L40)) para que administración la
emita a mano, tal y como documenta el propio comentario del código
([routes/contratos.js:29-30](../../routes/contratos.js#L29-L30)). Se trata en la
sección 5.1 por su relación directa con el Camino B, no como un cuarto camino.

`routes/informes.js` solo lee la tabla `facturas` (resumen de IVA y export CSV para
la gestoría); no escribe en ella en ningún punto — evidencia: búsqueda de
`INSERT`/`UPDATE` sobre `facturas` en ese fichero sin resultados,
[routes/informes.js:1-54](../../routes/informes.js#L1-L54) completo.

---

## 1. Camino A — Creación manual desde la web

### 1.1 Entrada

- Formulario `GET /facturas/nueva` ([routes/facturas.js:30-38](../../routes/facturas.js#L30-L38)),
  servido por [views/factura_nueva.ejs](../../views/factura_nueva.ejs), con 6 filas de
  línea fijas en el HTML ([views/factura_nueva.ejs:13-20](../../views/factura_nueva.ejs#L13-L20)).
- Envío `POST /facturas/nueva` con cuerpo `application/x-www-form-urlencoded`
  ([routes/facturas.js:42](../../routes/facturas.js#L42)):
  - `cliente_id` (obligatorio en el HTML, `required`, [views/factura_nueva.ejs:6](../../views/factura_nueva.ejs#L6)).
  - `fecha` (opcional; si falta, se usa `util.hoy()` — [routes/facturas.js:44](../../routes/facturas.js#L44)).
  - arrays paralelos `desc[]`, `cant[]`, `precio[]`, `iva[]`, uno por fila del
    formulario (hasta 6 filas; las filas sin descripción se descartan,
    [routes/facturas.js:56](../../routes/facturas.js#L56)).
  - `obs` (observaciones, opcional).
- No hay ninguna capa de autenticación delante de esta ruta — no existe `session`,
  `passport` ni middleware de login en todo el repositorio (búsqueda sin resultados
  salvo un comentario de `auth` dentro del bloque SMTP comentado de
  [services/email.js](../../services/email.js)). Cualquiera con acceso de red al
  puerto 3000 puede emitir una factura.

### 1.2 Recorrido de módulos, en orden

1. `routes/facturas.js` recibe el `POST` y parsea `cliente_id` y `fecha`
   ([routes/facturas.js:43-44](../../routes/facturas.js#L43-L44)).
2. `db.js` → `SELECT * FROM clientes WHERE id = ?`; si no existe, corta con 400
   ([routes/facturas.js:46-47](../../routes/facturas.js#L46-L47)).
3. `routes/facturas.js` monta el array `lineas` a partir de los campos del
   formulario, convirtiendo coma decimal a punto (`replace(',', '.')`)
   ([routes/facturas.js:50-63](../../routes/facturas.js#L50-L63)); si no queda
   ninguna línea, corta con 400 ([routes/facturas.js:64](../../routes/facturas.js#L64)).
4. `services/calculo.js` → `calcularFactura(lineas, cliente)`
   ([routes/facturas.js:66](../../routes/facturas.js#L66)) — ver 1.3.
5. `routes/facturas.js` calcula el vencimiento con `lib/util.js` → `sumarDias`
   ([routes/facturas.js:68-69](../../routes/facturas.js#L68-L69)).
6. `lib/numeracion.js` → `siguienteNumero('FA', cb)`
   ([routes/facturas.js:71](../../routes/facturas.js#L71)) — ver 1.4. Internamente
   vuelve a tocar `db.js` (lectura y escritura de `contadores`).
7. `db.js` → `INSERT INTO facturas (...)` con `estado = 'emitida'` explícito
   ([routes/facturas.js:74-76](../../routes/facturas.js#L74-L76)).
8. `db.js` → un `INSERT INTO lineas` por cada línea calculada, lanzados **todos a la
   vez** con `forEach` (no secuencial, no en transacción) y sincronizados a mano con
   un contador `pendientes`
   ([routes/facturas.js:85-98](../../routes/facturas.js#L85-L98)).
9. Cuando `pendientes === 0` y no hubo error: `services/email.js` →
   `enviarFactura({numero}, cliente, cb)`
   ([routes/facturas.js:93](../../routes/facturas.js#L93)). Esta función no hace
   ninguna llamada de red real: solo escribe en consola y llama a `cb(null)` de
   forma síncrona — el envío de correo está desactivado desde 2022
   ([services/email.js:11-29](../../services/email.js#L11-L29)).
10. `res.redirect('/facturas/' + facturaId)`
    ([routes/facturas.js:94](../../routes/facturas.js#L94)) — el navegador acaba en
    `GET /facturas/:id`, que vuelve a leer la factura y sus líneas de `db.js`
    ([routes/facturas.js:105-114](../../routes/facturas.js#L105-L114)).

### 1.3 Cálculos aplicados

Todos dentro de `services/calculo.js` → `calcularFactura(lineas, cliente)`
([services/calculo.js:48-88](../../services/calculo.js#L48-L88)):

1. `calcularLinea(cantidad, precio, tipoIva, conRecargo)` por cada línea, con
   `conRecargo = cliente.recargo_equivalencia == 1`
   ([services/calculo.js:26-34](../../services/calculo.js#L26-L34),
   [services/calculo.js:49](../../services/calculo.js#L49)) — cada línea redondea su
   propia base y su propia cuota de IVA a 2 decimales por separado (no se redondea
   sobre el total; el propio fichero avisa de que cambiar esto causó un incidente
   real con la gestoría en 2019, [services/calculo.js:1-7](../../services/calculo.js#L1-L7)).
   Si `conRecargo`, se añade `recargoPara(tipoIva)` sobre esa misma base
   ([services/calculo.js:12-23](../../services/calculo.js#L12-L23) para la tabla de
   tipos).
2. Con la suma de esas bases (`baseBruta`) se decide el descuento por volumen:
   `porcentajeDescuento(baseBruta)` → 2 % a partir de 1.000 €, 5 % a partir de
   5.000 € ([services/calculo.js:39-43](../../services/calculo.js#L39-L43)).
3. El descuento **no** se resta al final: se recalcula el precio de cada línea
   (`precioConDto`) y se vuelve a llamar a `calcularLinea` con ese precio rebajado,
   por petición explícita de la gestoría para que el desglose salga línea a línea
   ([services/calculo.js:63-84](../../services/calculo.js#L63-L84)).
4. `resultado.total = redondear2(base + iva + recargo)`
   ([services/calculo.js:86](../../services/calculo.js#L86)), todo con
   `lib/util.js` → `redondear2` (`Math.round(x*100)/100`,
   [lib/util.js:5-7](../../lib/util.js#L5-L7)).

Vencimiento (fuera de `calcularFactura`): `dias = cliente.dias_pago ||
config.VENCIMIENTO_DIAS` (30 por defecto, [config.js:40](../../config.js#L40)); luego
`util.sumarDias(fecha, dias)`
([routes/facturas.js:68-69](../../routes/facturas.js#L68-L69),
[lib/util.js:20-26](../../lib/util.js#L20-L26)).

### 1.4 Número de factura

`lib/numeracion.js` → `siguienteNumero('FA', cb)`
([lib/numeracion.js:14-28](../../lib/numeracion.js#L14-L28)):
1. `SELECT ultimo FROM contadores WHERE serie='FA' AND anyo=<año actual>`.
2. Si no hay fila para ese año, `INSERT INTO contadores (...,0)` y sigue con 0.
3. `reservar()`: `UPDATE contadores SET ultimo = ultimo+1 WHERE serie=... AND
   anyo=...`, y formatea el resultado como `FA-<año>-NNNNNN` (6 dígitos con ceros a
   la izquierda, [lib/numeracion.js:38-42](../../lib/numeracion.js#L38-L42)).

Lectura y escritura son dos pasos separados, sin transacción ni bloqueo explícito —
el propio comentario del fichero documenta que esto ya causó dos facturas con el
mismo número en enero de 2021
([lib/numeracion.js:8-10](../../lib/numeracion.js#L8-L10)).

### 1.5 Qué se graba, en qué tablas y en qué orden

1. `facturas` — una fila, `estado='emitida'`, `serie='FA'`, `rectifica_a` no se
   incluye en el `INSERT` (queda `NULL` por ausencia de columna)
   ([routes/facturas.js:74-76](../../routes/facturas.js#L74-L76)).
2. `lineas` — una fila por línea calculada, todas con el mismo `factura_id`, grabadas
   en paralelo (sección 1.2, paso 8).
3. `contadores` — ya se actualizó en el paso 1.4, **antes** del `INSERT` en
   `facturas` (la reserva del número ocurre antes de grabar la factura, no al
   revés).

No se graba nada en `clientes` ni `articulos`: se leen, no se modifican.

### 1.6 Estado resultante

`emitida` — único estado posible al terminar este camino
([routes/facturas.js:75](../../routes/facturas.js#L75), y por definición de la
columna, `DEFAULT 'emitida'`, [db.js:61](../../db.js#L61)).

---

## 2. Camino B — Remesa mensual de contratos

### 2.1 Entrada

- Ejecución manual por línea de comandos: `node scripts/remesa_mensual.js YYYY-MM`
  ([scripts/remesa_mensual.js:3](../../scripts/remesa_mensual.js#L3),
  [scripts/remesa_mensual.js:14-18](../../scripts/remesa_mensual.js#L14-L18) valida
  el formato). No hay ningún disparador dentro de la aplicación web que lo invoque;
  es un proceso Node independiente
  ([scripts/remesa_mensual.js:9](../../scripts/remesa_mensual.js#L9),
  `require('../db')` en vez de montarse en `server.js`).
- El propio script vuelve a llamar a `db.inicializar`
  ([scripts/remesa_mensual.js:23](../../scripts/remesa_mensual.js#L23)), la misma
  función que usa `server.js` al arrancar — crea las tablas si no existen y, si
  `clientes` está vacía, recarga los datos de referencia
  ([db.js:17-89](../../db.js#L17-L89)).

### 2.2 Recorrido de módulos, en orden

1. Calcula `primerDia` y `ultimoDia` del mes pedido con `lib/util.js` →
   `diasDelMes` ([scripts/remesa_mensual.js:20-21](../../scripts/remesa_mensual.js#L20-L21)).
2. `db.js` → `SELECT` de `contratos` unidos con `clientes`, filtrando los contratos
   activos en algún punto del mes: `fecha_alta <= ultimoDia AND (fecha_baja IS NULL
   OR fecha_baja >= primerDia)`
   ([scripts/remesa_mensual.js:26-29](../../scripts/remesa_mensual.js#L26-L29)). Esta
   consulta **no** mira la tabla `facturas` en ningún momento — no hay comprobación
   de si ese contrato ya se facturó este mes (ver 5.6).
3. Si no hay contratos, termina. Si hay, procesa cada contrato **secuencialmente**
   (llamada recursiva `procesarSiguiente()` dentro del propio callback, no
   `forEach` en paralelo como el Camino A)
   ([scripts/remesa_mensual.js:33-76](../../scripts/remesa_mensual.js#L33-L76)).
4. Por cada contrato: calcula el importe del mes (prorrateo inline, ver 2.3) y
   construye una única línea ([scripts/remesa_mensual.js:53-54](../../scripts/remesa_mensual.js#L53-L54)).
5. `services/calculo.js` → `calcularFactura(lineas, {recargo_equivalencia:
   co.recargo_equivalencia})`
   ([scripts/remesa_mensual.js:55](../../scripts/remesa_mensual.js#L55)) — el mismo
   motor de cálculo que el Camino A (ver 1.3): redondeo línea a línea, recargo de
   equivalencia si aplica, y **el mismo descuento por volumen**, aunque con una
   factura de una sola línea es infrecuente que el importe supere el umbral de
   1.000 €.
6. `lib/numeracion.js` → `siguienteNumero('FA', cb)`
   ([scripts/remesa_mensual.js:57](../../scripts/remesa_mensual.js#L57)) — el mismo
   módulo que el Camino A, misma serie `FA`, mismo contador compartido (ver 5.5).
7. `db.js` → `INSERT INTO facturas`
   ([scripts/remesa_mensual.js:61-63](../../scripts/remesa_mensual.js#L61-L63)) y
   después `INSERT INTO lineas` de la única línea
   ([scripts/remesa_mensual.js:67-69](../../scripts/remesa_mensual.js#L67-L69)).
8. Escribe una línea de progreso por consola y pasa al siguiente contrato
   ([scripts/remesa_mensual.js:71-73](../../scripts/remesa_mensual.js#L71-L73));
   al terminar todos, imprime el resumen y `process.exit(0)`
   ([scripts/remesa_mensual.js:38-40](../../scripts/remesa_mensual.js#L38-L40)).

### 2.3 Cálculos aplicados

- **Prorrateo del importe mensual — cálculo propio, NO usa
  `calculo.calcularProrrateo`** (ver hallazgo en 5.1):
  ```
  desde = max(contrato.fecha_alta, primerDia)
  hasta = min(contrato.fecha_baja, ultimoDia)   // si la baja cae dentro del mes
  diasMes = util.diasDelMes(primerDia)          // dias REALES del mes (28-31)
  diasServicio = dia(hasta) - dia(desde) + 1
  importe = redondear2(cuota / diasMes * diasServicio)
  ```
  ([scripts/remesa_mensual.js:45-51](../../scripts/remesa_mensual.js#L45-L51)).
- A partir de ahí, `calcularFactura` aplica exactamente los mismos pasos que en 1.3
  (redondeo por línea, recargo de equivalencia, descuento por volumen).
- Vencimiento: `util.sumarDias(fecha, co.dias_pago || 30)`
  ([scripts/remesa_mensual.js:60](../../scripts/remesa_mensual.js#L60)) — nótese el
  literal `30`, no `config.VENCIMIENTO_DIAS` (ver 5.2). `fecha` es siempre
  `ultimoDia`, el último día del mes facturado
  ([scripts/remesa_mensual.js:59](../../scripts/remesa_mensual.js#L59)), a diferencia
  del Camino A donde la fecha la elige quien rellena el formulario.

### 2.4 Número de factura

Idéntico mecanismo que 1.4: `lib/numeracion.js` → `siguienteNumero('FA', cb)`, mismo
contador `contadores` compartido con el Camino A — una remesa y una factura manual
emitidas el mismo año consumen números correlativos del mismo contador, sin
distinción de origen.

### 2.5 Qué se graba, en qué tablas y en qué orden

Por cada contrato, en este orden: `contadores` (dentro de `siguienteNumero`) →
`facturas` (una fila, `estado='emitida'`, `observaciones='Remesa <mes>'`) →
`lineas` (una única fila). Igual que el Camino A, la reserva del número ocurre antes
del `INSERT` en `facturas`. A diferencia del Camino A, aquí el `INSERT` de `lineas`
no puede fallar "a mitad" entre varias líneas porque solo hay una por factura.

### 2.6 Estado resultante

`emitida` — igual que el Camino A
([scripts/remesa_mensual.js:62](../../scripts/remesa_mensual.js#L62)).

---

## 3. Camino C — Rectificación de una factura existente

### 3.1 Entrada

- Botón "Rectificar (abono total)", visible solo si `f.estado === 'emitida' &&
  f.serie === 'FA'` ([views/factura_detalle.ejs:47-51](../../views/factura_detalle.ejs#L47-L51)).
- `POST /facturas/:id/rectificar` con un único campo opcional, `motivo`
  ([routes/facturas.js:129](../../routes/facturas.js#L129),
  [views/factura_detalle.ejs:50](../../views/factura_detalle.ejs#L50)).
- Guardas server-side, en este orden ([routes/facturas.js:130-133](../../routes/facturas.js#L130-L133)):
  1. La factura tiene que existir (404 si no).
  2. `estado !== 'rectificada'` (400 "Ya esta rectificada" si ya lo está).
  3. `serie !== 'RE'` (400 "No se rectifica una rectificativa").
  
  **Ninguna guarda comprueba `estado === 'cobrada'`.** El botón se oculta en la
  vista cuando la factura ya está cobrada
  ([views/factura_detalle.ejs:47](../../views/factura_detalle.ejs#L47), condición
  `f.estado === 'emitida'`), pero el servidor aceptaría igualmente un `POST` directo
  a esta ruta sobre una factura `cobrada` — la restricción existe solo en la
  interfaz, no en el código del route handler.

### 3.2 Recorrido de módulos, en orden

1. `db.js` → `SELECT` de la factura original + nombre del cliente
   ([routes/facturas.js:130](../../routes/facturas.js#L130)).
2. Guardas de 3.1.
3. `db.js` → `SELECT * FROM lineas WHERE factura_id = ?`
   ([routes/facturas.js:135](../../routes/facturas.js#L135)).
4. `lib/numeracion.js` → `siguienteNumero('RE', cb)`
   ([routes/facturas.js:138](../../routes/facturas.js#L138)) — mismo módulo que los
   caminos A y B, pero serie `RE` (contador independiente en `contadores`, clave
   primaria `(serie, anyo)`, [db.js:77-81](../../db.js#L77-L81)).
5. `db.js` → `INSERT INTO facturas` de la rectificativa, con los importes en
   negativo, `estado='emitida'`, `rectifica_a=<numero original>`
   ([routes/facturas.js:141-144](../../routes/facturas.js#L141-L144)).
6. `db.js` → un `INSERT INTO lineas` por cada línea original, en paralelo
   (`forEach`, mismo patrón sin transacción que el Camino A)
   ([routes/facturas.js:148-159](../../routes/facturas.js#L148-L159)).
7. Solo cuando terminan **todas** las líneas: `db.js` → `UPDATE facturas SET
   estado='rectificada' WHERE id=<factura original>`
   ([routes/facturas.js:154](../../routes/facturas.js#L154)) — este es el único
   punto de todo el sistema donde una factura pasa a `rectificada`.
8. `res.redirect('/facturas/' + rectId)`
   ([routes/facturas.js:155](../../routes/facturas.js#L155)) — redirige a la
   **rectificativa**, no a la factura original.

**Importante: este camino NO llama a `services/calculo.js` en ningún punto**
(confirmado: no hay ninguna referencia a `calculo.` entre las líneas 129 y 164 de
`routes/facturas.js`). No se recalcula nada — se invierte a mano el signo de lo que
ya había, por decisión explícita de la gestoría de que "la rectificativa tiene que
ser espejo exacto de la original"
([routes/facturas.js:124-128](../../routes/facturas.js#L124-L128)).

### 3.3 Cálculos aplicados (inversión manual, no hay función de cálculo)

Cabecera de la factura (`routes/facturas.js:142`):
`base=-f.base, iva=-f.iva, recargo=-f.recargo, total=-f.total`, `vencimiento=null`
(no se calcula ningún vencimiento para una rectificativa).

Por cada línea (`routes/facturas.js:150`):
```
descripcion = 'Rectificación: ' + l.descripcion
cantidad    = -l.cantidad
precio      =  l.precio          // SIN invertir — se copia tal cual, en positivo
tipo_iva    =  l.tipo_iva
base        = -l.base
cuota_iva   = -l.cuota_iva
cuota_recargo = -l.cuota_recargo
```
El campo `precio` es el único que **no** se invierte de signo; la coherencia
aritmética (cantidad negativa × precio positivo ≈ base negativa) se mantiene porque
`base`, `cuota_iva` y `cuota_recargo` también se copian ya invertidos directamente
del original, sin volver a multiplicar nada.

### 3.4 Número de factura

Igual mecanismo que 1.4 y 2.4, pero con `serie='RE'`: contador `(RE, año)`
independiente del contador `(FA, año)`.

### 3.5 Qué se graba, en qué tablas y en qué orden

1. `contadores` — se reserva el número `RE` (dentro de `siguienteNumero`).
2. `facturas` — una fila nueva (la rectificativa, serie `RE`, estado `emitida`).
3. `lineas` — una fila por cada línea de la factura original, con `factura_id`
   apuntando a la rectificativa nueva.
4. `facturas` (de nuevo) — **UPDATE**, no INSERT, sobre la fila de la factura
   **original**, cambiando su estado a `rectificada`. Este paso es el último de
   todos, después de que las líneas ya estén grabadas.

### 3.6 Estado resultante

Dos facturas quedan afectadas, con estados distintos:
- La **rectificativa** nueva (serie `RE`): `emitida`.
- La factura **original** (serie `FA`): `rectificada`.

---

## 4. Estados de una factura: qué valores existen y quién los cambia

La columna `estado` es texto libre (`TEXT NOT NULL DEFAULT 'emitida'`,
[db.js:61](../../db.js#L61)) — no hay una lista de valores permitidos a nivel de
base de datos (no hay `CHECK` ni tabla de catálogo). En todo el código solo se
escriben tres valores literales:

| Estado | Quién lo pone | Evidencia | Precondición comprobada por el servidor |
|---|---|---|---|
| `emitida` | Valor por defecto al `INSERT` en los tres caminos de creación (A, B, C) | [routes/facturas.js:75](../../routes/facturas.js#L75), [scripts/remesa_mensual.js:62](../../scripts/remesa_mensual.js#L62), [routes/facturas.js:143](../../routes/facturas.js#L143) | Ninguna — es el estado inicial siempre. |
| `cobrada` | `POST /facturas/:id/cobrar` | [routes/facturas.js:117-122](../../routes/facturas.js#L117-L122) | `estado = 'emitida'` en el propio `WHERE` del `UPDATE` (si ya está cobrada o rectificada, el `UPDATE` no afecta a ninguna fila y la ruta responde 200 igualmente, sin avisar de que no hizo nada — no comprueba el resultado de `this.changes`). **No comprueba `serie`**: aunque el botón de la vista no se muestra para facturas `RE` (condición `f.serie === 'FA'`, [views/factura_detalle.ejs:47](../../views/factura_detalle.ejs#L47)), nada en el servidor impide marcar como `cobrada` una rectificativa vía `POST` directo. |
| `rectificada` | `POST /facturas/:id/rectificar`, y solo sobre la factura **original** (nunca sobre la rectificativa que se acaba de crear) | [routes/facturas.js:154](../../routes/facturas.js#L154) | `estado !== 'rectificada'` y `serie !== 'RE'` ([routes/facturas.js:132-133](../../routes/facturas.js#L132-L133)); no comprueba `estado !== 'cobrada'` (ver 3.1). |

No existe ningún camino en el código que haga volver una factura de `cobrada` o
`rectificada` a `emitida`, ni que borre una factura — coherente con el comentario de
`lib/numeracion.js` de que, desde una inspección de 2020, las facturas no se borran
nunca ([lib/numeracion.js:3-6](../../lib/numeracion.js#L3-L6)).

---

## 5. Puntos donde dos caminos hacen "lo mismo" con código distinto

### 5.1 Prorrateo de cuota mensual: dos fórmulas distintas para el mismo concepto

Hay dos piezas de código que prorratean una cuota mensual y **no son la misma
función, ni dan necesariamente el mismo resultado**:

- `services/calculo.js` → `calcularProrrateo(cuota, desde, hasta)`
  ([services/calculo.js:95-102](../../services/calculo.js#L95-L102)): divide
  siempre por **30** ("a lo comercial", comentario explícito en
  [services/calculo.js:90-94](../../services/calculo.js#L90-L94)), con tope de 30
  días aunque el mes tenga 31. La usa únicamente `routes/contratos.js:39`, al dar de
  baja un contrato, **solo para mostrar el importe en pantalla** (no genera factura,
  ver sección 0).
- `scripts/remesa_mensual.js`, líneas 47-51
  ([scripts/remesa_mensual.js:47-51](../../scripts/remesa_mensual.js#L47-L51)):
  código de prorrateo **distinto, escrito aparte**, que divide por
  `util.diasDelMes(primerDia)` — los días **reales** del mes (28, 29, 30 o 31) — no
  por 30 fijo. Esta es la fórmula que **sí** genera la factura real de la remesa.

Efecto: para un mes de 31 días, un alta o baja a mitad de mes calculada con
`calculo.calcularProrrateo` (pantalla de baja de contrato) y la misma situación
calculada por `remesa_mensual.js` (factura real) producirían importes distintos,
porque una divide por 30 y la otra por 31. Para febrero (28 o 29 días) ocurre lo
mismo en sentido contrario. Ambas piezas de código existen, están en uso, y no hay
ninguna llamada de una a la otra — se verificó que `remesa_mensual.js` no importa
ni invoca `calcularProrrateo` en ningún punto (`grep` de `calcularProrrateo` en todo
el repositorio: solo aparece en `services/calculo.js` y en
`routes/contratos.js:39`).

### 5.2 Vencimiento: constante de configuración en un camino, literal en otro

- Camino A: `cliente.dias_pago || config.VENCIMIENTO_DIAS`
  ([routes/facturas.js:68](../../routes/facturas.js#L68)) — si mañana cambia
  `config.VENCIMIENTO_DIAS` (hoy 30, [config.js:40](../../config.js#L40)), este
  camino lo recoge automáticamente para los clientes sin `dias_pago` propio.
- Camino B: `co.dias_pago || 30`
  ([scripts/remesa_mensual.js:60](../../scripts/remesa_mensual.js#L60)) — el `30`
  está escrito directamente en el script, no referencia `config.VENCIMIENTO_DIAS`.
  Hoy coinciden en valor (30 = 30), pero son dos fuentes de verdad distintas para el
  mismo concepto de negocio.
- Camino C no calcula vencimiento en absoluto (`vencimiento: null`, sección 3.3).

### 5.3 El `INSERT INTO facturas` está escrito tres veces, sin función compartida

Las tres sentencias SQL de inserción en `facturas`
([routes/facturas.js:74](../../routes/facturas.js#L74),
[scripts/remesa_mensual.js:61](../../scripts/remesa_mensual.js#L61),
[routes/facturas.js:141](../../routes/facturas.js#L141)) son cadenas de texto
independientes, tecleadas cada una por separado (dos de ellas, en A y B, son
literalmente idénticas carácter a carácter salvo el valor de los parámetros). No
hay ninguna función común tipo `grabarFactura(...)` que las tres reutilicen: cada
camino construye su propio array de parámetros y llama a `db.run` directamente. Lo
mismo ocurre con el `INSERT INTO lineas`, repetido en los tres ficheros
([routes/facturas.js:86](../../routes/facturas.js#L86),
[scripts/remesa_mensual.js:67](../../scripts/remesa_mensual.js#L67),
[routes/facturas.js:149](../../routes/facturas.js#L149)).

### 5.4 Solo dos de los tres caminos pasan por `calcularFactura`

Los Caminos A y B calculan sus líneas con `services/calculo.js` →
`calcularFactura` (secciones 1.3 y 2.3) — comparten, por tanto, exactamente el
mismo redondeo, el mismo recargo de equivalencia y el mismo descuento por volumen.
El Camino C no llama a esa función en absoluto (sección 3.2): invierte a mano los
campos ya calculados de la factura original. Esto significa que si algún día
cambiara la lógica de `calcularFactura` (redondeo, descuento, recargo), ese cambio
afectaría a las facturas nuevas creadas por A y B, pero **no** alteraría cómo se
calcula una rectificativa, que seguiría siendo una simple inversión de signo.

### 5.5 Lo único realmente compartido entre los tres caminos: `lib/numeracion.js`

A diferencia de todo lo anterior, la numeración **sí** es una única pieza de código
reutilizada sin duplicar: los tres caminos llaman a la misma función
`numeracion.siguienteNumero(serie, cb)`
([routes/facturas.js:71](../../routes/facturas.js#L71),
[scripts/remesa_mensual.js:57](../../scripts/remesa_mensual.js#L57),
[routes/facturas.js:138](../../routes/facturas.js#L138)), cambiando solo el
parámetro `serie` (`'FA'` en A y B, `'RE'` en C). Es el único punto de los tres
caminos donde no hay divergencia de código para el mismo concepto.

### 5.6 Caso real en los datos: la falta de protección de duplicados en la remesa

Los datos de referencia cargados por `db.js` (reales según el propio comentario del
fichero, [db.js:91-92](../../db.js#L91-L92)) documentan un incidente concreto que
ilustra directamente el punto 2.2.2 (la remesa no comprueba si un contrato ya fue
facturado ese mes):

- `FA-2026-000106`, contrato del cliente 6, factura de la remesa de abril con
  observación literal **"Remesa abril. ERROR cuota duplicada, ver
  RE-2026-000001"** ([db.js:156](../../db.js#L156)).
- `RE-2026-000001`, misma fecha de cliente, `rectifica_a='FA-2026-000106'`,
  observación "Rectifica FA-2026-000106 (cuota abril duplicada)"
  ([db.js:160](../../db.js#L160)) — el Camino C en acción sobre el error del Camino
  B.
- `FA-2026-000107`, observación "Sustituye a FA-2026-000106"
  ([db.js:164](../../db.js#L164)), con fecha `2026-05-06` — una fecha que **no** es
  fin de mes, lo que es compatible con haberse creado por el Camino A (el Camino B
  siempre fecha la factura el último día del mes facturado, sección 2.3); esto es
  una lectura razonada de los datos a la luz del comportamiento del código, no una
  confirmación directa de cuál ruta se usó — se deja constancia de que es una
  inferencia, no un hecho verificado con logs de ejecución.

Esta secuencia real (B crea con error → C rectifica → probablemente A vuelve a
emitir) es el ejemplo más claro, con datos reales, de por qué las tres rutas de
creación y la de rectificación conviven en el mismo sistema.

---

## 6. Fuera del ciclo de vida de facturas (para no confundir con un cuarto camino)

- `routes/contratos.js` → `POST /:id/baja` calcula un prorrateo
  (`calculo.calcularProrrateo`, sección 5.1) pero no inserta ninguna fila en
  `facturas`; el propio comentario del código confirma que es administración quien
  "emite después a mano la factura del prorrateo"
  ([routes/contratos.js:28-30](../../routes/contratos.js#L28-L30)), usando
  probablemente el Camino A. Cuando esa factura manual se cree, pasará por
  `calcularFactura` (sección 1.3), no por `calcularProrrateo` — es decir, el importe
  que ve administración en pantalla (calculado a 30 días fijos) no es necesariamente
  el que se recalcularía si se metiera como una línea normal del formulario de
  factura nueva (el formulario no prorratea nada: el importe que se teclee en
  `precio` se toma tal cual, [views/factura_nueva.ejs:17](../../views/factura_nueva.ejs#L17)).
- `routes/informes.js` solo lee `facturas` y `lineas` (resumen de IVA y exportación
  CSV); no participa en la creación, cálculo inicial, numeración ni cambio de
  estado de ninguna factura (sección 0).
