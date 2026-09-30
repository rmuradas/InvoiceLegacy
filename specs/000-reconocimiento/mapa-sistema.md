# Mapa del sistema — GesFact 2.4

**Fase**: Caracterización (reconocimiento del sistema tal y como existe hoy).
**Fecha del análisis**: 2026-09-30.
**Método**: lectura completa del código fuente del repositorio y de `package-lock.json`
(versiones reales instaladas). No se ha consultado a ningún miembro del negocio para
este documento; toda afirmación se apoya en fichero y líneas concretas. Donde no ha
sido posible confirmar un dato con código, se marca explícitamente como **SUPOSICIÓN**.

> Nota de alcance: siguiendo la Constitución de esta fase, este documento **describe**
> el sistema. No propone correcciones ni evalúa si el comportamiento observado es
> correcto o deseable — eso corresponde al registro de anomalías y a una fase
> posterior.

---

## 1. Módulos de lógica de servidor

### `server.js`
- **Responsabilidad de negocio**: arranca la aplicación y muestra el panel de inicio
  con los cuatro indicadores que usa administración de un vistazo: facturas emitidas,
  facturas pendientes de cobro, importe pendiente de cobro y clientes activos.
  Evidencia: [server.js:20-36](../../server.js#L20-L36).
- **Depende de**: `express` y `body-parser` (paquetes externos, [server.js:9-10](../../server.js#L9-L10)),
  `db.js` ([server.js:11](../../server.js#L11)), `config.js` ([server.js:12](../../server.js#L12)),
  y monta los cinco routers de negocio: `routes/clientes.js`, `routes/articulos.js`,
  `routes/contratos.js`, `routes/facturas.js`, `routes/informes.js`
  ([server.js:38-42](../../server.js#L38-L42)).
- **De quién depende**: de nadie dentro del proyecto; es el punto de entrada del
  proceso (`npm start` → `node server.js`, [package.json:7](../../package.json#L7)).
- **Criticidad**: **Alta**. Si no arranca, no hay aplicación: la inicialización de la
  base de datos es bloqueante y aborta el proceso si falla
  ([server.js:44-48](../../server.js#L44-L48)).

### `config.js`
- **Responsabilidad de negocio**: centraliza los datos fiscales de la empresa que
  aparecen impresos en cada factura, la ruta del fichero de base de datos, el IVA por
  defecto para artículos nuevos, las credenciales de correo y la clave que exige la
  gestoría para el fichero de exportación.
  Evidencia: [config.js:8-17](../../config.js#L8-L17), [config.js:29-37](../../config.js#L29-L37).
- **Depende de**: nada (no tiene ninguna sentencia `require` de módulos propios).
- **De quién depende**: `server.js:12`, `db.js:9`, `routes/articulos.js:6`,
  `routes/facturas.js:12`, `routes/informes.js:7`, `services/email.js:9`.
- **Criticidad**: **Alta**. Contiene el NIF y datos legales de la empresa que salen
  en todas las facturas (un error aquí afecta a *todas* las facturas nuevas que se
  emitan), y credenciales en texto plano dentro del propio código fuente
  ([config.js:32-34](../../config.js#L32-L34), clave SMTP; [config.js:37](../../config.js#L37),
  clave de exportación de la gestoría).

### `db.js`
- **Responsabilidad de negocio**: define y crea, si no existen, las tablas donde vive
  todo el negocio (clientes, artículos, contratos, facturas, líneas de factura y
  contadores de numeración), y precarga los datos de referencia que usa
  administración cuando la base de datos está vacía.
  Evidencia: [db.js:19-81](../../db.js#L19-L81) (creación de tablas),
  [db.js:93-181](../../db.js#L93-L181) (carga inicial de datos).
- **Depende de**: `sqlite3` (paquete externo, [db.js:8](../../db.js#L8)) y `config.js`
  (para `RUTA_BD`, [db.js:9,15](../../db.js#L9)).
- **De quién depende**: `server.js:11,44`, los cinco routers (`clientes.js:5`,
  `articulos.js:5`, `contratos.js:5`, `facturas.js:7`, `informes.js:5`),
  `lib/numeracion.js:12` y `scripts/remesa_mensual.js:9`.
- **Criticidad**: **Alta**. Es el único almacén de todo el histórico de facturación;
  el propio comentario del fichero documenta que la migración a este sistema en 2018
  se hizo porque el formato anterior (ficheros JSON) **se corrompía con escrituras
  simultáneas** ([db.js:2-4](../../db.js#L2-L4)).

### `lib/util.js`
- **Responsabilidad de negocio**: da formato a fechas e importes tal y como se
  esperan en pantalla, en las facturas impresas y en la exportación a la gestoría, y
  redondea los cálculos monetarios a 2 decimales.
  Evidencia: [lib/util.js:5-7](../../lib/util.js#L5-L7) (redondeo),
  [lib/util.js:29-33](../../lib/util.js#L29-L33) (fecha a formato español),
  [lib/util.js:51-58](../../lib/util.js#L51-L58) (importe con separador de miles).
- **Depende de**: nada.
- **De quién depende**: `services/calculo.js:9`, `routes/clientes.js:6`,
  `routes/contratos.js:6`, `routes/facturas.js:8`, `routes/informes.js:6`,
  `scripts/remesa_mensual.js:10`, y se pasa como variable a varias vistas EJS
  (`factura_detalle.ejs`, `facturas.ejs`, `contratos.ejs`, `informe_iva.ejs`) para
  formatear en pantalla.
- **Criticidad**: **Alta**. La función `redondear2` subyace a todos los cálculos de
  facturación del sistema; el propio `services/calculo.js` advierte de que un cambio
  en el redondeo ya causó un incidente real con la gestoría (ver más abajo).
  Además contiene un `TODO` sin resolver sobre un caso de vencimiento que salió mal
  por el cambio de hora ([lib/util.js:18-19](../../lib/util.js#L18-L19)) y una
  validación de NIF que reconoce como incompleta
  ([lib/util.js:42-44](../../lib/util.js#L42-L44)).

### `lib/numeracion.js`
- **Responsabilidad de negocio**: genera el número de factura correlativo y sin
  huecos que exige la ley para cada serie (`FA`, `RE`) y año.
  Evidencia: [lib/numeracion.js:3-6](../../lib/numeracion.js#L3-L6) (comentario
  explícito sobre la obligación legal), [lib/numeracion.js:38-42](../../lib/numeracion.js#L38-L42)
  (formato `SERIE-AÑO-000000`).
- **Depende de**: `db.js` ([lib/numeracion.js:12](../../lib/numeracion.js#L12)).
- **De quién depende**: `routes/facturas.js:10` (nueva factura y rectificativa),
  `scripts/remesa_mensual.js:12`.
- **Criticidad**: **Alta**. Un fallo aquí (número duplicado o con huecos) es un
  incumplimiento fiscal, no solo un bug técnico. El propio comentario documenta un
  incidente real: el 2 de enero de 2021 salieron dos facturas con el mismo número por
  una condición de carrera al grabar dos personas a la vez
  ([lib/numeracion.js:8-10](../../lib/numeracion.js#L8-L10)). El código actual sigue
  leyendo el último número y actualizándolo en dos pasos separados
  ([lib/numeracion.js:16-27](../../lib/numeracion.js#L16-L27)), sin una transacción
  atómica que impida ese mismo escenario de forma estructural (ver «Zonas oscuras»).

### `services/calculo.js`
- **Responsabilidad de negocio**: calcula la base, la cuota de IVA, el recargo de
  equivalencia y el descuento por volumen de cada factura, y prorratea el importe de
  las cuotas mensuales de contrato cuando el alta o la baja caen a mitad de mes.
  Evidencia: [services/calculo.js:26-33](../../services/calculo.js#L26-L33) (línea),
  [services/calculo.js:39-42](../../services/calculo.js#L39-L42) (descuento por
  volumen), [services/calculo.js:95-102](../../services/calculo.js#L95-L102)
  (prorrateo).
- **Depende de**: `lib/util.js:9`.
- **De quién depende**: `routes/contratos.js:7`, `routes/facturas.js:9`,
  `scripts/remesa_mensual.js:11`.
- **Criticidad**: **Alta**. Determina el importe exacto que se cobra a cada cliente y
  que se declara a Hacienda. El propio fichero contiene un aviso explícito: en mayo
  de 2019 se cambió la forma de redondear (sobre la base total en vez de línea a
  línea) y la gestoría devolvió todo el trimestre porque no cuadraba con su programa
  de contabilidad (Contaplus); desde entonces el comportamiento se congeló
  ([services/calculo.js:1-7](../../services/calculo.js#L1-L7)). El descuento por
  volumen (2% a partir de 1.000€, 5% a partir de 5.000€) y el prorrateo "a lo
  comercial" (mes de 30 días siempre) son reglas de negocio acordadas verbalmente con
  personas concretas y documentadas solo en comentarios
  ([services/calculo.js:36-38](../../services/calculo.js#L36-L38),
  [services/calculo.js:90-94](../../services/calculo.js#L90-L94)).

### `services/email.js`
- **Responsabilidad de negocio**: en teoría, enviar la factura por correo al cliente
  al emitirla; en la práctica, solo deja constancia por consola de que hay que
  enviarla a mano.
  Evidencia: [services/email.js:1-6](../../services/email.js#L1-L6) (comentario:
  "FUERA DE SERVICIO desde 2022"), [services/email.js:11-29](../../services/email.js#L11-L29)
  (la función real no envía nada; el código de envío está comentado).
- **Depende de**: `config.js:9` (solo dentro del bloque de código comentado, no en
  ejecución real).
- **De quién depende**: `routes/facturas.js:11`, invocado tras grabar cada factura
  nueva ([routes/facturas.js:93](../../routes/facturas.js#L93)).
- **Criticidad**: **Media**. Funcionalmente no bloquea nada — siempre llama a
  `cb(null)` sin fallar nunca ([services/email.js:28](../../services/email.js#L28)) —
  y el propio LEEME confirma que el envío real se hace a mano desde 2022
  ([LEEME.txt:14](../../LEEME.txt#L14)). Se marca "media" y no "baja" porque es una
  función de negocio invocada en el camino crítico de creación de cada factura que
  hoy no hace lo que su nombre indica, lo que puede inducir a error a quien lea el
  código sin conocer el contexto.

### `routes/clientes.js`
- **Responsabilidad de negocio**: da de alta, lista y da de baja a los clientes de
  Suministros Hidalgo.
  Evidencia: [routes/clientes.js:15-30](../../routes/clientes.js#L15-L30) (alta),
  [routes/clientes.js:32-37](../../routes/clientes.js#L32-L37) (baja).
- **Depende de**: `db.js:5`, `lib/util.js:6` (solo para `validarNIF`).
- **De quién depende**: `server.js:38`. (La tabla `clientes` en sí es leída
  directamente por otros módulos vía `db.js` — `routes/facturas.js`,
  `routes/contratos.js`, `scripts/remesa_mensual.js` — no a través de este router.)
- **Criticidad**: **Media**. Necesario para poder facturar a alguien, pero un fallo
  aquí no corrompe facturas ya emitidas. La validación de NIF es deliberadamente
  débil: solo comprueba la longitud, la calidad del dato depende de que "Marga los
  mira" ([routes/clientes.js:17](../../routes/clientes.js#L17), comentario explícito).

### `routes/articulos.js`
- **Responsabilidad de negocio**: mantiene el catálogo de artículos y servicios (con
  su precio sin IVA, tipo de IVA y unidad) que luego se usa para rellenar líneas de
  factura.
  Evidencia: [routes/articulos.js:8-24](../../routes/articulos.js#L8-L24).
- **Depende de**: `db.js:5`, `config.js:6` (para el IVA por defecto).
- **De quién depende**: `server.js:39`. El catálogo lo consume también
  `routes/facturas.js:33-35` (listado de artículos activos para el formulario de
  nueva factura) y `views/factura_nueva.ejs:22-24`, pero ambos leen la tabla
  directamente vía `db.js`, no llaman a este router.
- **Criticidad**: **Media**. Un error de precio o IVA en el catálogo se traslada a
  las facturas *nuevas* que se rellenen desde el desplegable, pero no afecta a lo ya
  facturado (el precio se copia a la línea de factura en el momento de crearla).

### `routes/contratos.js`
- **Responsabilidad de negocio**: da de alta y de baja las cuotas mensuales
  recurrentes de cada cliente (alquiler de máquinas, mantenimientos), y calcula el
  importe prorrateado del último mes cuando una baja cae a mitad de mes.
  Evidencia: [routes/contratos.js:16-26](../../routes/contratos.js#L16-L26) (alta),
  [routes/contratos.js:31-43](../../routes/contratos.js#L31-L43) (baja + prorrateo).
- **Depende de**: `db.js:5`, `lib/util.js:6`, `services/calculo.js:7`.
- **De quién depende**: `server.js:40`. La tabla `contratos` la lee también
  `scripts/remesa_mensual.js:26-29` directamente vía `db.js`.
- **Criticidad**: **Alta**. Es la fuente de los contratos que
  `scripts/remesa_mensual.js` convierte en facturas cada mes; un alta o baja mal
  registrada aquí hace que la remesa mensual facture de más, de menos, o fuera de
  plazo. Además, al dar de baja a mitad de mes, el sistema **no genera** la factura
  del prorrateo: solo muestra el importe en la URL de redirección para que
  administración la emita a mano ([routes/contratos.js:37-41](../../routes/contratos.js#L37-L41),
  confirmado en pantalla en [views/contratos.ejs:17](../../views/contratos.ejs#L17)).

### `routes/facturas.js`
- **Responsabilidad de negocio**: es el módulo central del negocio — lista, crea,
  muestra, marca como cobradas y rectifica las facturas de la empresa.
  Evidencia: fichero completo, [routes/facturas.js:1-166](../../routes/facturas.js#L1-L166).
- **Depende de**: `db.js:7`, `lib/util.js:8`, `services/calculo.js:9`,
  `lib/numeracion.js:10`, `services/email.js:11`, `config.js:12`.
- **De quién depende**: `server.js:41`.
- **Criticidad**: **Alta**. Gestiona el ciclo de vida legal completo de la factura,
  incluida la rectificación. El propio fichero reconoce su propio tamaño y falta de
  descomposición: *"este fichero se ha ido haciendo grande, algún día habría que
  partirlo. 'Algún día'."* ([routes/facturas.js:2-3](../../routes/facturas.js#L2-L3)).
  La rectificación es una operación delicada: invierte el signo de las líneas
  originales sin recalcular nada, por decisión explícita de la gestoría ("la
  rectificativa tiene que ser espejo exacto de la original",
  [routes/facturas.js:124-128](../../routes/facturas.js#L124-L128)). El guardado de
  las líneas de una factura nueva se hace con inserciones en paralelo sin
  transacción: el propio comentario documenta que ya ha fallado alguna a mitad y "se
  apañó a mano en la BD" ([routes/facturas.js:81-83](../../routes/facturas.js#L81-L83)).

### `routes/informes.js`
- **Responsabilidad de negocio**: genera el resumen de IVA repercutido por trimestre
  (para el modelo 303, que termina de rellenar la gestoría) y exporta las facturas
  del año en el formato CSV que pide la gestoría.
  Evidencia: [routes/informes.js:14-30](../../routes/informes.js#L14-L30) (resumen
  IVA), [routes/informes.js:32-51](../../routes/informes.js#L32-L51) (exportación
  CSV).
- **Depende de**: `db.js:5`, `lib/util.js:6`, `config.js:7` (clave de exportación).
- **De quién depende**: `server.js:42`.
- **Criticidad**: **Alta**. Alimenta directamente la declaración fiscal trimestral y
  el proceso administrativo de un tercero (la gestoría). El formato CSV (separador
  `;`, decimales con coma, clave en la primera línea) está fijado por un acuerdo
  puntual con una persona concreta en 2019
  ([routes/informes.js:32-33](../../routes/informes.js#L32-L33)) y no está validado
  en ningún otro sitio del código: un cambio de formato rompería silenciosamente la
  integración con la gestoría.

### `scripts/remesa_mensual.js`
- **Responsabilidad de negocio**: genera automáticamente, una vez al mes, las
  facturas de todos los contratos de cuota activos, para no tener que darlos de alta
  uno a uno a mano.
  Evidencia: [scripts/remesa_mensual.js:1-7](../../scripts/remesa_mensual.js#L1-L7).
- **Depende de**: `db.js:9`, `lib/util.js:10`, `services/calculo.js:11`,
  `lib/numeracion.js:12`.
- **De quién depende**: no lo importa ningún otro módulo del código; se ejecuta como
  proceso independiente (`node scripts/remesa_mensual.js AAAA-MM`). Se referencia
  como recordatorio operativo en la pantalla de inicio
  ([views/index.ejs:9-10](../../views/index.ejs#L9-L10)).
- **Criticidad**: **Alta**. Genera un volumen relevante de la facturación recurrente
  sin revisión línea a línea antes de emitir. Su ejecución depende por completo de
  un proceso humano manual: el propio LEEME dice que "se lanza el día 1 desde el
  ordenador de Marga" ([LEEME.txt](../../LEEME.txt) y
  [scripts/remesa_mensual.js:7](../../scripts/remesa_mensual.js#L7)); no hay
  evidencia en el código de ninguna tarea programada (cron, Task Scheduler) que lo
  automatice — **SUPOSICIÓN**: no puede descartarse que exista una tarea programada
  fuera del repositorio, en el ordenador de Marga; no hay evidencia ni en un sentido
  ni en el otro.

---

## 2. Capa de presentación

### `public/js/factura.js`
- **Responsabilidad de negocio**: autorrellena el precio y el IVA en el formulario
  de nueva factura al elegir un artículo del desplegable, para no copiarlo a mano
  del listado de artículos.
  Evidencia: [public/js/factura.js:1-15](../../public/js/factura.js#L1-L15).
- **Depende de**: la estructura HTML que genera `views/factura_nueva.ejs` (el
  `<datalist id="lista-articulos">` y las clases `.campo-desc` / `.campo-precio`,
  [views/factura_nueva.ejs:15-24](../../views/factura_nueva.ejs#L15-L24)).
- **De quién depende**: `views/factura_nueva.ejs:28` es la única vista que lo carga.
- **Criticidad**: **Baja**. Es una ayuda de usabilidad introducida en 2021; si falla,
  el formulario se puede seguir rellenando a mano como antes.

### `public/css/estilos.css`
- **Responsabilidad de negocio**: da la apariencia visual a todas las pantallas de
  la aplicación (incluida una hoja de estilo específica para impresión de facturas).
  Evidencia: [public/css/estilos.css:28](../../public/css/estilos.css#L28) (regla
  `@media print`).
- **Depende de**: nada.
- **De quién depende**: `views/cabecera.ejs:6`, incluida en todas las páginas.
- **Criticidad**: **Baja**. Puramente estético, sin impacto en cálculos ni datos.

### Vistas EJS (`views/*.ejs`)

| Vista | Responsabilidad de negocio | Alimentada por | Criticidad y por qué |
|---|---|---|---|
| `cabecera.ejs` | Cabecera y menú de navegación común a toda la aplicación. Evidencia: [views/cabecera.ejs:9-20](../../views/cabecera.ejs#L9-L20). | Incluida por todas las demás vistas (p. ej. [views/index.ejs:1](../../views/index.ejs#L1)). | Baja — solo estructura. |
| `pie.ejs` | Pie de página con el aviso de uso interno y el contacto de soporte (Julián, ext. 22). Evidencia: [views/pie.ejs:2](../../views/pie.ejs#L2). | Incluida por todas las demás vistas. | Baja. |
| `index.ejs` | Panel de inicio con los cuatro indicadores de negocio y recordatorio de la remesa mensual. Evidencia: [views/index.ejs:3-10](../../views/index.ejs#L3-L10). | `server.js:20-36`. | Baja — es un resumen de solo lectura. |
| `clientes.ejs` | Alta y listado de clientes, con aviso de validación. Evidencia: [views/clientes.ejs:1-27](../../views/clientes.ejs#L1-L27). | `routes/clientes.js`. | Media. |
| `articulos.ejs` | Alta y listado del catálogo de artículos. Evidencia: [views/articulos.ejs:1-22](../../views/articulos.ejs#L1-L22). | `routes/articulos.js`. | Media. |
| `contratos.ejs` | Alta y baja de contratos, con el aviso de que el prorrateo del último mes se emite a mano. Evidencia: [views/contratos.ejs:17](../../views/contratos.ejs#L17). | `routes/contratos.js`. | Alta — ligada a la facturación recurrente. |
| `facturas.ejs` | Listado y filtro de facturas por estado. Evidencia: [views/facturas.ejs:1-24](../../views/facturas.ejs#L1-L24). | `routes/facturas.js` (GET `/`). | Alta — puerta de entrada al histórico legal de facturación. |
| `factura_nueva.ejs` | Formulario de creación de factura, con 6 líneas fijas y autocompletado de artículos. Evidencia: [views/factura_nueva.ejs:11-24](../../views/factura_nueva.ejs#L11-L24). | `routes/facturas.js` (GET/POST `/nueva`). | Alta. |
| `factura_detalle.ejs` | La propia factura imprimible/legal, con los botones de "marcar cobrada" y "rectificar". Evidencia: [views/factura_detalle.ejs:1-54](../../views/factura_detalle.ejs#L1-L54). | `routes/facturas.js` (GET `/:id`). | Alta — es el documento legal que ve el cliente. |
| `informes.ejs` | Menú de acceso a los informes de IVA y a la exportación para la gestoría. Evidencia: [views/informes.ejs:1-10](../../views/informes.ejs#L1-L10). | `routes/informes.js` (GET `/`). | Media — es solo un índice. |
| `informe_iva.ejs` | Resumen de IVA repercutido por tipo, usado como base del modelo 303. Evidencia: [views/informe_iva.ejs:1-17](../../views/informe_iva.ejs#L1-L17). | `routes/informes.js` (GET `/iva`). | Alta — alimenta la declaración fiscal. |

---

## 3. Datos

### `datos/gesfact.db`
- **Responsabilidad de negocio**: es el almacén persistente único de todo el negocio
  real: clientes, catálogo, contratos, facturas, líneas y contadores de numeración.
- **Depende de**: nada; es un artefacto de datos, no código. Se crea y gestiona
  exclusivamente desde `db.js`.
- **De quién depende**: todo el sistema, de forma indirecta a través de `db.js`.
- **Criticidad**: **Alta**. Es el activo de negocio más crítico del proyecto — si se
  pierde o se corrompe, se pierde el histórico legal de facturación. La única copia
  de seguridad documentada es manual y semanal: *"Marga copia datos/gesfact.db a un
  pendrive los viernes"* ([LEEME.txt:18](../../LEEME.txt#L18)).

### `datos/migracion_mysql_2018.sql`
Ver «Zonas oscuras» — es un artefacto muerto, no forma parte del sistema en
funcionamiento.

---

## 4. Configuración del proyecto (Spec Kit / esta fase)

Los directorios `.claude/`, `.specify/` y `specs/` contienen la configuración del
flujo de trabajo de especificación (Spec Kit) y la constitución de esta fase de
caracterización ([.specify/memory/constitution.md](../../.specify/memory/constitution.md)).
No son parte de la aplicación GesFact en producción: no los ejecuta `server.js` ni
ningún script de negocio. Se documentan aquí solo para que el mapa sea completo,
con **criticidad baja** para el negocio de facturación (alta para la disciplina de
esta fase de trabajo, que es un asunto distinto).

---

## 5. Diagrama de dependencias (texto)

```
node server.js  (punto de entrada, npm start)
│
├── config.js                              [sin dependencias propias]
├── db.js ── sqlite3 (externo)
│      └── config.js                       (ruta del fichero .db)
│
├── routes/clientes.js
│      ├── db.js
│      └── lib/util.js                     (validarNIF)
│
├── routes/articulos.js
│      ├── db.js
│      └── config.js                       (IVA_DEFECTO)
│
├── routes/contratos.js
│      ├── db.js
│      ├── lib/util.js
│      └── services/calculo.js             (calcularProrrateo)
│              └── lib/util.js
│
├── routes/facturas.js                     ← módulo central del negocio
│      ├── db.js
│      ├── lib/util.js
│      ├── services/calculo.js             (calcularFactura)
│      ├── lib/numeracion.js               (siguienteNumero)
│      │      └── db.js
│      ├── services/email.js               (desactivado; no envía nada)
│      │      └── config.js                (solo en código comentado)
│      └── config.js                       (EMPRESA, VENCIMIENTO_DIAS)
│
└── routes/informes.js
       ├── db.js
       ├── lib/util.js
       └── config.js                       (CLAVE_EXPORT_GESTORIA)

scripts/remesa_mensual.js                  ← EJECUCIÓN MANUAL, fuera del árbol de
│                                             server.js; nadie lo importa como módulo
├── db.js
├── lib/util.js
├── services/calculo.js
└── lib/numeracion.js

--- capa de presentación (recibe datos ya calculados, no accede a db.js) ---

views/cabecera.ejs  ──> public/css/estilos.css
views/pie.ejs
views/index.ejs          ← server.js
views/clientes.ejs       ← routes/clientes.js
views/articulos.ejs      ← routes/articulos.js
views/contratos.ejs      ← routes/contratos.js
views/facturas.ejs       ← routes/facturas.js
views/factura_nueva.ejs  ← routes/facturas.js   ──> public/js/factura.js
views/factura_detalle.ejs← routes/facturas.js
views/informes.ejs       ← routes/informes.js
views/informe_iva.ejs    ← routes/informes.js

--- almacén de datos ---

datos/gesfact.db  <── leído/escrito EXCLUSIVAMENTE a través de db.js
```

**Lectura del diagrama**: `routes/facturas.js` es el nodo con más aristas de entrada
y salida del sistema — toca cuatro de los cinco módulos de lógica compartida
(`db.js`, `lib/util.js`, `services/calculo.js`, `lib/numeracion.js`) más
`services/email.js` y `config.js`. Es, con diferencia, el módulo cuya rotura tendría
mayor radio de impacto sobre el negocio.

---

## 6. Tecnologías y versiones reales

Las versiones siguientes están tomadas de los paquetes **resueltos** en
`package-lock.json` (lo que realmente se instala hoy con `npm install`), no del
rango declarado en `package.json` ni de lo que dice `LEEME.txt`:

| Tecnología | Versión declarada (`package.json`) | Versión real resuelta (`package-lock.json`) | Evidencia |
|---|---|---|---|
| Node.js / npm (runtime) | no declarado (sin campo `engines`) | no fijada por el proyecto | [package.json](../../package.json) completo — no existe la clave `"engines"` |
| express | `^4.22.2` | **4.22.3** | [package-lock.json:663-664](../../package-lock.json#L663-L664) |
| body-parser | `^1.20.5` | **1.20.8** | [package-lock.json:237-238](../../package-lock.json#L237-L238) |
| ejs | `^3.1.10` | **3.1.10** | [package-lock.json:529-530](../../package-lock.json#L529-L530) |
| sqlite3 | `^5.1.7` | **5.1.7** | [package-lock.json:2103-2104](../../package-lock.json#L2103-L2104) |

Otros datos técnicos verificados en el código:

- **Base de datos**: SQLite, un único fichero (`datos/gesfact.db`), sin servidor de
  base de datos independiente. Evidencia: [config.js:20](../../config.js#L20),
  [db.js:15](../../db.js#L15).
- **Motor de vistas**: EJS, renderizado en servidor; no hay ningún framework de
  frontend (React, Vue, etc.) ni bundler ni paso de build — el JS y CSS de
  `public/` se sirven tal cual. Evidencia: [server.js:16,18](../../server.js#L16),
  ausencia de cualquier `webpack.config.js`, `vite.config.js` o similar en el
  repositorio.
- **Estilo del código**: JavaScript ES5 (`var`, funciones con `function`, callbacks
  anidados; sin `async`/`await`, sin clases, sin módulos ES). Evidencia: patrón
  constante en todo `routes/`, `lib/`, `services/`, `db.js`.
- **Sin pruebas automatizadas**: no existe ningún fichero `*.test.js`/`*.spec.js`,
  ni carpeta de tests, ni script `"test"` en `package.json`, ni ninguna dependencia
  de testing en `package-lock.json`. Evidencia: búsqueda en todo el repositorio sin
  resultados y [package.json:6-8](../../package.json#L6-L8) (solo existe el script
  `"start"`).
- **Sin integración continua ni contenedores**: no hay carpeta `.github/workflows`,
  ni `Dockerfile`, ni `docker-compose.yml`, ni `.nvmrc`. Evidencia: búsqueda en todo
  el repositorio sin resultados.
- **`nodemailer`** apareció en el histórico del proyecto para el envío de correo,
  pero fue desinstalado en 2023 y hoy no figura en `package.json` ni en
  `package-lock.json`. Evidencia: comentario
  [services/email.js:8](../../services/email.js#L8) ("desinstalado en 2023, daba un
  aviso de seguridad") y ausencia total de `nodemailer` en `package-lock.json`.
- **SUPOSICIÓN** sobre la versión de Node.js en producción: `LEEME.txt:5` indica
  "Instalar node 8 desde nodejs.org (la versión LTS)", pero Node.js 8 alcanzó su fin
  de vida en diciembre de 2019 y el propio `LEEME.txt` está fechado como
  desactualizado por el usuario en el encargo de esta tarea. No hay ningún fichero en
  el repositorio (`.nvmrc`, campo `engines`, CI) que fije qué versión de Node corre
  realmente hoy en el ordenador de producción de la oficina; es una pregunta abierta
  para el negocio, no un hecho verificable con el código disponible.

---

## 7. Zonas oscuras

Todo lo que sigue son observaciones descriptivas para inventariar lo que no encaja
en el mapa funcional de arriba. Siguiendo la Constitución de esta fase, no se ha
corregido ni se propone corregir nada de lo listado aquí; se deja constancia para
el registro de anomalías y para que el negocio decida.

### Código muerto / funcionalidad desactivada dentro de ficheros activos
- **`services/email.js`**: el 90% del fichero es código de envío real (con
  `nodemailer`) comentado y sin ejecutar desde 2022; la función exportada no hace lo
  que su nombre (`enviarFactura`) sugiere — solo imprime un aviso por consola.
  Evidencia: [services/email.js:8-29](../../services/email.js#L8-L29).
- **`config.js` → bloque `SMTP`**: credenciales (usuario y contraseña) para un
  servidor de correo que el propio fichero admite que dejó de funcionar en 2022.
  Siguen en el código en texto plano aunque no se usan en ningún flujo de ejecución
  real. Evidencia: [config.js:27-34](../../config.js#L27-L34).
- **`services/calculo.js` → `recargoPara`**: contiene tipos de IVA que ya no existen
  en España (16%, 18%, 7%, 8%), mantenidos explícitamente "por si hay que reabrir
  ejercicios viejos del Access". No hay ninguna referencia a esos tipos en el resto
  del código actual (ni en `db.js`, ni en los formularios, que solo ofrecen 21/10/4).
  Evidencia: [services/calculo.js:16-21](../../services/calculo.js#L16-L21),
  frente a [routes/articulos.js:17](../../routes/articulos.js#L17) y
  [views/factura_nueva.ejs:18](../../views/factura_nueva.ejs#L18) (solo 21/10/4).

### Fichero huérfano
- **`datos/migracion_mysql_2018.sql`**: el propio fichero se autodescribe como
  "volcado de PRUEBA... NUNCA SE LLEGÓ A EJECUTAR EN PRODUCCIÓN" y con "el esquema
  desfasado (faltan recargo y rectificativas)". No lo referencia ningún script ni
  ninguna documentación de ejecución del proyecto; es un vestigio de un intento de
  migración a MySQL de 2018 que no prosperó. Evidencia:
  [datos/migracion_mysql_2018.sql:1-5](../../datos/migracion_mysql_2018.sql#L1-L5),
  confirmado como pendiente todavía hoy en [LEEME.txt:12-13](../../LEEME.txt#L12-L13).

### Funcionalidad a medias (fuera del propio repositorio)
- **Módulo de albaranes**: `LEEME.txt` menciona que "Roberto empezó un módulo de
  albaranes en 2021, está a medias en su ordenador (preguntarle si vuelve en
  campaña)". No existe ningún rastro de ese módulo en este repositorio (ni ruta, ni
  vista, ni tabla en `db.js`). Evidencia: [LEEME.txt:15-16](../../LEEME.txt#L15-L16).
  **SUPOSICIÓN**: se desconoce si ese trabajo sigue existiendo en algún ordenador
  personal, si se perdió, o si se retomó fuera de este repositorio; es una pregunta
  para el negocio, no verificable con lo que hay aquí.

### Riesgos de concurrencia documentados pero no resueltos estructuralmente
- **`lib/numeracion.js`**: el propio comentario admite que hubo una duplicidad real
  de números de factura en enero de 2021 por una condición de carrera (dos personas
  grabando a la vez), "arreglada" leyendo el último número justo antes de grabar
  ([lib/numeracion.js:8-10](../../lib/numeracion.js#L8-L10)). El código sigue
  haciendo una lectura (`SELECT`) y una escritura (`UPDATE`) como dos operaciones
  separadas sin transacción explícita ni bloqueo
  ([lib/numeracion.js:14-36](../../lib/numeracion.js#L14-L36)), por lo que la misma
  clase de condición de carrera sigue siendo estructuralmente posible; el propio
  autor lo admite con un "no ha vuelto a pasar (creo)" ([lib/numeracion.js:10](../../lib/numeracion.js#L10)).
- **`routes/facturas.js` → alta de líneas de factura**: las líneas de una factura
  nueva se insertan en paralelo con `forEach` sin transacción; el propio comentario
  documenta que ya ha fallado una inserción a mitad de guardado y que "se apañó a
  mano en la BD" ([routes/facturas.js:81-97](../../routes/facturas.js#L81-L97)).

### Otras observaciones sin clasificar
- **`body-parser` como dependencia explícita**: desde Express 4.16 (2017), Express
  incluye internamente `express.urlencoded()`/`express.json()`, que cubren el mismo
  uso que se le da aquí a `body-parser` ([server.js:17](../../server.js#L17)). No es
  un hallazgo de comportamiento (la aplicación funciona igual), solo una
  particularidad de dependencias que llama la atención al leer el código.
- **`config.js`** advierte en un comentario que el fichero "se copia a mano al
  servidor de la oficina (`\\SERVIDOR\gesfact`) cuando se cambia algo" y "NO
  RENOMBRAR" ([config.js:2-3](../../config.js#L2-L3)). Esto implica que el despliegue
  a producción no pasa por ningún control de versiones ni proceso automatizado
  documentado en este repositorio — **SUPOSICIÓN**: se desconoce si existe algún otro
  mecanismo de despliegue no reflejado aquí; no hay evidencia de código para
  confirmarlo o descartarlo.
- **`LEEME.txt` como única documentación operativa**: está fechado por su propio
  autor como "última actualización... 11/03/2019 (aprox)"
  ([LEEME.txt:20](../../LEEME.txt#L20)) y el propio encargo de esta tarea lo señala
  como desactualizado. Coexiste con la numeración de versión en cabecera de
  `server.js` que sí ha seguido evolucionando hasta 2021
  ([server.js:1-7](../../server.js#L1-L7)), lo que confirma que el código avanzó sin
  que el LEEME se actualizara en paralelo.
