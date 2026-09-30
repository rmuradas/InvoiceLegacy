# Registro de anomalías — GesFact 2.4

**Fase**: Caracterización (reconocimiento del sistema tal y como existe hoy).
**Fecha del análisis**: 2026-09-30.
**Método**: consolidación de todos los hallazgos de la fase de reconocimiento e
ingeniería inversa. Se han recorrido como fuente de entrada, sin dejar ninguna
huérfana:

- las reglas clasificadas como **DUDOSAS** o **ACCIDENTALES** en
  [reglas-de-negocio.md](reglas-de-negocio.md), y las **INTENCIONALES con
  historia de incidente** documentada (anomalías positivas, reglas
  protegidas);
- las cuatro contradicciones documentadas en
  [contradiccion-01](contradiccion-01-prorrateo-cuota-mensual.md),
  [contradiccion-02](contradiccion-02-dias-vencimiento-por-defecto.md),
  [contradiccion-03](contradiccion-03-formato-importe-en-pantalla.md) y
  [contradiccion-04](contradiccion-04-cierre-de-periodo-mensual.md);
- las 16 entradas de [registro-riesgos.md](registro-riesgos.md);
- las discrepancias comentario-vs-código y las advertencias de "no tocar" de
  [memoria-historica.md](memoria-historica.md).

> **Aviso de cobertura**: en este repositorio **no existe** todavía un fichero
> `entrevista-negocio.md` ni un documento independiente de "arqueología de
> datos". El testimonio **NEGOCIO** de este registro se apoya, por tanto, en
> las citas de código ya atribuidas a una persona y fechadas que recoge
> `memoria-historica.md` (p. ej. "Puri dixit", "acordado con Paco en 2018",
> "hablar con Manoli") — testimonio histórico de segunda mano, no una
> entrevista en vivo —, y el testimonio **DATOS** se apoya en los ejemplos ya
> calculados sobre datos reales de `db.js` que verifica `reglas-de-negocio.md`
> y los documentos de contradicción. Donde ninguna de esas dos fuentes exista
> para una anomalía, la clasificación queda **PENDIENTE**, tal como exige la
> regla innegociable de este encargo. Esta es precisamente la limitación que
> debería resolver una entrevista de negocio real antes de pasar a
> especificación formal.

> **Nota de alcance**: como en los documentos anteriores de esta fase, este
> registro no corrige ni propone soluciones definitivas; ordena y cierra
> clasificaciones donde la evidencia lo permite, y dice explícitamente qué
> falta donde no lo permite.

> **Nota de actualización (2026-09-30)**: ya existe
> [entrevista-negocio.md](entrevista-negocio.md), primera entrevista de
> negocio de este reconocimiento. Este registro se ha propagado con su
> contenido sin sobrescribir en silencio ninguna clasificación anterior: cada
> anomalía afectada conserva su texto original y añade, al final de su
> "Decisión de negocio pendiente", un aviso que remite a la sección
> [Propagación del acta de entrevista de negocio](#propagación-del-acta-de-entrevista-de-negocio-2026-09-30)
> al final de este documento, donde consta el cambio de clasificación
> completo (estado anterior → estado nuevo) y su justificación. **Aviso
> importante**: de las 19 preguntas de esa acta, solo la 1 (y la primera
> mitad de la 2) tienen respuesta **REAL**; las otras 18 son **SIMULADAS**
> (el consultor respondiendo en el papel de negocio, a petición explícita de
> quien conducía la sesión) y, por expreso aviso del propio acta, no deben
> tratarse como decisión de negocio real. Por eso este registro solo **cierra
> definitivamente** la anomalía con respuesta REAL (A-01) y **actualiza
> parcialmente** la que tiene una mitad REAL (A-02); en las 17 restantes se
> registra la respuesta SIMULADA como **hipótesis de trabajo pendiente de
> validar con la persona real**, sin cerrar la clasificación.

---

## Anomalías (ordenadas de mayor a menor impacto económico)

### A-01 — Prorrateo de cuota mensual: dos fórmulas distintas para el mismo concepto, con riesgo real de doble facturación

**Descripción**: la baja/alta a mitad de mes de un contrato se prorratea con
mes comercial fijo de 30 días si se calcula desde la pantalla manual de baja,
pero con los días reales del mes si la calcula la remesa automática, y ambos
caminos pueden llegar a facturar el mismo mes y contrato por separado.

**Evidencia**:
- CÓDIGO: [services/calculo.js:90-102](../../services/calculo.js#L90-L102)
  (`calcularProrrateo`, divisor fijo 30, con tope) frente a
  [scripts/remesa_mensual.js:43-51](../../scripts/remesa_mensual.js#L43-L51)
  (divisor `util.diasDelMes`, sin tope); mecanismo de colisión descrito en
  [contradiccion-01 §4.2](contradiccion-01-prorrateo-cuota-mensual.md#4-cuándo-se-manifiesta-la-divergencia-y-cuándo-coinciden)
  (la consulta de la remesa selecciona también contratos dados de baja ese
  mismo mes).
- DATOS: ejemplo con datos reales del contrato "Alquiler máquina de café
  Futurmat F3" (cuota 90,00 €, [db.js:119](../../db.js#L119)): 45,00 € por el
  camino manual frente a 48,21 € por la remesa para una baja el 15 de febrero
  de 2026 — 8 de los 12 meses del año producen resultados distintos
  ([contradiccion-01 §3](contradiccion-01-prorrateo-cuota-mensual.md#3-ejemplos-concretos-con-resultados-distintos-para-la-misma-entrada)).
  Existe además un precedente real de doble facturación del mismo concepto y
  mes: `FA-2026-000106`/`RE-2026-000001`/`FA-2026-000107`
  ([db.js:156-168](../../db.js#L156-L168)), aunque no hay evidencia de que se
  originara por esta vía concreta.
- NEGOCIO: "Asi lo hacia Paco a mano en el Access y asi lo espera la
  gestoria" ([services/calculo.js:92-94](../../services/calculo.js#L92-L94))
  respalda la fórmula A como la heredada y esperada; no hay ningún comentario
  equivalente que respalde la fórmula B de la remesa (Roberto, verano 2021,
  sin referencia a la fórmula ya existente).

**Clasificación**: **BUG HISTÓRICO CON DEPENDIENTES**. La fórmula A (mes
comercial de 30 días) tiene testimonio de negocio + código a su favor como la
convención esperada; la fórmula B es una desviación sin respaldo. No se
clasifica como INTENCIONAL la coexistencia de ambas porque ningún testigo
avala que sea deliberado tener dos fórmulas.

**Depende de este comportamiento**: los importes ya facturados por la remesa
mensual desde 2021 con la fórmula B (contratos con alta/baja a mitad de un
mes de 28, 29 o 31 días) son documentos legales ya emitidos; no pueden
recalcularse retroactivamente sin volver a facturar al cliente.

**Tratamiento acordado**: corregir en fase de modernización, unificando ambos
caminos en una sola función de prorrateo. **Precaución**: la corrección debe
aplicarse solo hacia adelante (facturas nuevas); no debe tocar ni regularizar
facturas ya emitidas por la remesa con la fórmula de días reales.

**Decisión de negocio pendiente**: ¿cuál de las dos fórmulas (mes comercial de
30 días o días reales del mes) es la que el negocio considera correcta de
aquí en adelante? — **Responsable: gestoría/administración (Puri y Marga)**.

> **Actualización (2026-09-30)**: **RESUELTA con testimonio REAL** — ver la
> sección «Propagación del acta de entrevista de negocio (2026-09-30)»,
> bloque A-01, al final de este documento.

---

### A-02 — Ausencia total de autenticación y autorización

**Descripción**: cualquier persona con acceso de red al puerto 3000 puede ver
clientes, crear facturas, marcarlas como cobradas o rectificarlas, sin ningún
control de acceso.

**Evidencia**:
- CÓDIGO: búsqueda de `session`/`passport`/middleware de login en todo el
  repositorio sin resultados;
  [server.js:14-42](../../server.js#L14-L42) monta todas las rutas de
  negocio sin ningún middleware previo de control de acceso
  ([registro-riesgos.md R1](registro-riesgos.md)).
- DATOS: no aplica (ausencia estructural, no depende de un valor de datos).
- NEGOCIO: no consta ningún testimonio, ni a favor ni en contra, de que la
  falta de autenticación sea una decisión consciente basada en el perímetro
  de red de la oficina.

**Clasificación**: **ACCIDENTAL**. No hay evidencia de que sea una decisión
deliberada; es la ausencia por defecto típica de una aplicación interna nunca
revisada desde el ángulo de seguridad.

**Depende de este comportamiento**: nadie identificado que dependa de que
siga sin haber autenticación; sí depende de ello, indirectamente, la
comodidad actual de uso (nadie tiene que iniciar sesión).

**Tratamiento acordado**: documentar sin especificar hasta resolver la
pregunta de negocio; la introducción de autenticación en la modernización no
tiene complicación retroactiva (no toca datos ya guardados).

**Decisión de negocio pendiente**: ¿está el acceso al puerto 3000 realmente
restringido a la red interna de la oficina (firewall, VLAN aislada) de forma
fiable, o accede alguien desde fuera (VPN, teletrabajo)? ¿Se acepta el riesgo
actual o se exige autenticación en la modernización? — **Responsable:
gerencia / responsable de sistemas**.

> **Actualización (2026-09-30)**: **PARCIALMENTE RESUELTA** (mitad REAL,
> mitad SIMULADA) — ver la sección «Propagación del acta de entrevista de
> negocio (2026-09-30)», bloque A-02, al final de este documento.

---

### A-03 — Credenciales reales y datos de producción expuestos en el historial de git

**Descripción**: la base de datos real (`datos/gesfact.db`, con NIF,
direcciones y facturas reales) y `config.js` (con contraseña SMTP y clave de
exportación en texto plano) están en el repositorio git desde el primer
commit, sin exclusión en `.gitignore`.

**Evidencia**:
- CÓDIGO: `.gitignore` solo excluye `node_modules/`
  ([.gitignore:1](../../.gitignore#L1)); `config.js:29-37`
  ([config.js:29-37](../../config.js#L29-L37)) contiene las credenciales;
  [db.js:91-92](../../db.js#L91-L92) confirma que son datos reales de
  referencia ([registro-riesgos.md R2](registro-riesgos.md)).
- DATOS: `git ls-files` confirma que ambos ficheros están rastreados desde el
  commit `e1b0489` (foto inicial).
- NEGOCIO: no hay ningún testimonio que respalde esta exposición como
  deliberada; al contrario, `config.js:2-3` explica que el fichero se copia a
  mano al servidor de la oficina, lo que sugiere que nunca se pensó en su
  exposición pública/en repositorio compartido.

**Clasificación**: **BUG A SECAS**. No hay ninguna lectura razonable en la
que comprometer datos fiscales/personales reales y una contraseña sea
intencional.

**Depende de este comportamiento**: el proceso manual de despliegue (copiar
`config.js` a mano a `\\SERVIDOR\gesfact`,
[config.js:2-3](../../config.js#L2-L3)) depende del nombre y ubicación
actuales del fichero, no de que esté en git.

**Tratamiento acordado**: corregir en fase de modernización — excluir ambos
ficheros de git, rotar la contraseña SMTP (aunque el servidor esté inactivo
desde 2022, [memoria-historica.md H20](memoria-historica.md#h20--2022-se-rompe-el-envío-de-facturas-por-correo-arsys-y-pasa-a-ser-manual))
y la clave de exportación. **Precaución**: la exposición ya ocurrida en el
historial de git no se deshace solo con excluir los ficheros hacia adelante;
reescribir el historial tiene coste operativo (invalida clones existentes) y
debe valorarse aparte, sin bloquear la rotación de credenciales.

**Decisión de negocio pendiente**: ¿sigue vigente el proceso de despliegue
manual copiando `config.js` por su nombre actual a `\\SERVIDOR\gesfact`, o ya
no es así? Condiciona si renombrar el fichero en la modernización es seguro.
— **Responsable: Julián / responsable de sistemas**.

> **Actualización (2026-09-30)**: hipótesis SIMULADA registrada, sin cerrar
> — ver la sección «Propagación del acta de entrevista de negocio
> (2026-09-30)», bloque A-03, al final de este documento.

---

### A-04 — Numeración legal de facturas sin transacción ni restricción `UNIQUE`, con incidente real de duplicidad

**Descripción**: el número de factura se lee y se actualiza en dos
operaciones SQL separadas sin transacción ni bloqueo, y la columna `numero`
no tiene `UNIQUE`; ya causó una duplicidad real en enero de 2021.

**Evidencia**:
- CÓDIGO: [lib/numeracion.js:14-36](../../lib/numeracion.js#L14-L36) (SELECT
  y UPDATE separados); [db.js:50-63](../../db.js#L50-L63) (sin `UNIQUE` en
  `numero`).
- DATOS: no aplica evidencia adicional de datos más allá del incidente ya
  documentado.
- NEGOCIO: "el 2 de enero de 2021 salieron dos facturas con idéntico número
  porque Marga y Julián grabaron a la vez... no ha vuelto a pasar (creo)"
  ([lib/numeracion.js:8-10](../../lib/numeracion.js#L8-L10);
  [memoria-historica.md H14](memoria-historica.md#h14--02012021-dos-facturas-emitidas-con-el-mismo-número)).

**Clasificación**: **BUG A SECAS**. Confirmado como incidente real por el
propio autor, sin ninguna lectura de "riesgo aceptado a propósito" (la
propia cita admite incertidumbre — "creo" — no conformidad).

**Depende de este comportamiento**: nadie identificado depende de que la
condición de carrera siga siendo posible; el incidente de 2021 ya se corrigió
a mano en su momento y no requiere ninguna acción retroactiva adicional.

**Tratamiento acordado**: corregir en fase de modernización (transacción +
restricción `UNIQUE`). Sin problema de retroactividad: no altera ninguna
numeración ya emitida.

**Decisión de negocio pendiente**: ninguna — la corrección técnica no
requiere validación de negocio, solo confirmar que la corrección estructural
es aceptable como mejora de fiabilidad en la modernización.

---

### A-05 — Inserción de factura y de rectificativa sin transacción

**Descripción**: la cabecera y las líneas de una factura nueva (y, de forma
análoga, la rectificativa, sus líneas y el cambio de estado de la original)
se insertan en pasos SQL separados sin transacción; un fallo a mitad deja un
documento legal incompleto.

**Evidencia**:
- CÓDIGO: [routes/facturas.js:74-98](../../routes/facturas.js#L74-L98) (alta,
  `INSERT` de cabecera y `forEach` de líneas);
  [routes/facturas.js:129-164](../../routes/facturas.js#L129-L164)
  (rectificación, tres operaciones encadenadas) —
  [registro-riesgos.md R4/R5](registro-riesgos.md).
- DATOS: no aplica caso real adicional más allá del ya citado en NEGOCIO.
- NEGOCIO: comentario explícito que reconoce que ya ocurrió: "se apañó a mano
  en la bd" tras una inserción de líneas fallida a mitad
  ([routes/facturas.js:81-83](../../routes/facturas.js#L81-L83);
  [memoria-historica.md, "Inserción de líneas de factura fallida a
  mitad"](memoria-historica.md#otras-decisiones-y-episodios-sin-fecha-determinada)).

**Clasificación**: **BUG A SECAS**. Reconocido por el propio código como algo
que ya falló y se corrigió a mano, sin ninguna lectura de intencionalidad.

**Depende de este comportamiento**: nadie identificado.

**Tratamiento acordado**: corregir en fase de modernización (envolver en
transacción). Sin problema de retroactividad.

**Decisión de negocio pendiente**: ¿se conoce la fecha y la factura concreta
afectada por el fallo ya ocurrido? Ayudaría a valorar la frecuencia real del
riesgo, aunque no bloquea la corrección técnica. — **Responsable: Marga /
Julián**.

---

### A-06 — Indicadores del panel de inicio inconsistentes entre sí

**Descripción**: el panel de inicio muestra "4 facturas pendientes de cobro"
pero un "importe pendiente" que solo corresponde a 3 de esas 4 facturas,
porque el recuento no filtra por serie y la suma sí.

**Evidencia**:
- CÓDIGO: [server.js:22-25](../../server.js#L22-L25) — recuento total
  (`RN-31`), recuento de pendientes sin filtrar serie (`RN-32`, línea 23),
  suma de pendientes filtrando `serie = 'FA'` (`RN-33`, línea 24).
- DATOS: con la carga inicial hay 4 facturas en `'emitida'`
  (`FA-2026-000105/107/108` y `RE-2026-000001`) pero el importe pendiente
  (3.032,85 €) solo suma las 3 de serie `FA`
  ([reglas-de-negocio.md RN-33](reglas-de-negocio.md#rn-33--importe-pendiente-de-cobro-solo-suma-la-serie-fa-a-diferencia-del-recuento-de-rn-32)).
- NEGOCIO: no hay ningún comentario que explique por qué el recuento y la
  suma usan criterios distintos.

**Clasificación**: **BUG A SECAS**. La asimetría entre recuento y suma no
tiene ninguna justificación documentada y es verificable con datos reales
como una inconsistencia interna del propio panel.

**Depende de este comportamiento**: nadie identificado fuera del propio panel
(es un indicador en pantalla, no un documento emitido ni una exportación).

**Tratamiento acordado**: corregir en fase de modernización, unificando el
criterio de recuento y de suma. Sin problema de retroactividad (es un
indicador calculado al vuelo, no un dato almacenado).

**Decisión de negocio pendiente**: ¿deben los indicadores "facturas
emitidas"/"facturas pendientes" del panel incluir o excluir las facturas
rectificadas y las rectificativas? Esto determina cuál de los dos criterios
(con o sin filtro de serie) es el correcto para unificar. — **Responsable:
Marga / administración**.

> **Actualización (2026-09-30)**: hipótesis SIMULADA registrada, sin cerrar
> — ver la sección «Propagación del acta de entrevista de negocio
> (2026-09-30)», bloque A-06, al final de este documento.

---

### A-07 — Validación de NIF/CIF: solo longitud, sin dígito de control

**Descripción**: un NIF/CIF se da por válido si tiene 9 caracteres tras
quitar espacios/guiones; no se comprueba la letra de control.

**Evidencia**:
- CÓDIGO: [lib/util.js:41-48](../../lib/util.js#L41-L48).
- DATOS: `validarNIF('ABCDEFGHI')` (9 caracteres sin significado real como
  NIF) → `true`.
- NEGOCIO: "TODO Julian 11/2017: falta comprobar la letra, de momento con la
  longitud vale porque los da de alta Marga y los mira ella"
  ([lib/util.js:41-43](../../lib/util.js#L41-L43), reforzado en
  [routes/clientes.js:16](../../routes/clientes.js#L16); atribuido y fechado
  — [memoria-historica.md H2](memoria-historica.md#h2--112017-la-validación-de-nif-se-deja-deliberadamente-incompleta)).

**Clasificación**: **INTENCIONAL** (protegida). Decisión consciente y
explícita, atribuida a Julián y fechada en 11/2017, con el control de calidad
del dato delegado deliberadamente en la revisión visual de Marga. Cumple los
tres testigos: CÓDIGO (comentario), NEGOCIO (Julián, 11/2017, criterio de
Marga) y DATOS (comportamiento verificado).

**Depende de este comportamiento**: Marga (revisión visual de cada alta de
cliente), y por extensión cualquier factura y exportación a la gestoría que
use ese NIF.

**Tratamiento acordado**: especificar tal cual en la modernización (solo
longitud, sin dígito de control), salvo que el negocio decida lo contrario.

**Decisión de negocio pendiente**: han pasado más de 8 años desde 2017 —
¿sigue siendo Marga (u otra persona) quien revisa cada NIF a mano hoy, y
sigue siendo aceptable ese nivel de control, o conviene añadir la validación
del dígito en la modernización? — **Responsable: Marga / administración**.

> **Actualización (2026-09-30)**: hipótesis SIMULADA registrada, sin cerrar
> — ver la sección «Propagación del acta de entrevista de negocio
> (2026-09-30)», bloque A-07, al final de este documento.

---

### A-08 — Redondeo línea a línea (nunca sobre el total), con riesgo de coma flotante en casos frontera

**Descripción**: la base y la cuota de IVA de cada línea se redondean a 2
decimales de forma independiente, y el total es la suma de esas cantidades ya
redondeadas; nunca se calcula una cuota global sobre la base total.

**Evidencia**:
- CÓDIGO: [services/calculo.js:1-7](../../services/calculo.js#L1-L7) (aviso
  explícito), [services/calculo.js:26-34](../../services/calculo.js#L26-L34);
  [lib/util.js:5-7](../../lib/util.js#L5-L7) (`redondear2`, con el riesgo
  clásico de representación binaria de coma flotante en valores `,xx5`,
  [registro-riesgos.md R15](registro-riesgos.md)).
- DATOS: tres líneas de 10,01 € con IVA 21% dan 6,30 € calculando línea a
  línea frente a 6,31 € calculando sobre el total — diferencia real de 0,01 €
  ([reglas-de-negocio.md RN-01](reglas-de-negocio.md#rn-01--el-redondeo-a-2-decimales-se-aplica-línea-a-línea-nunca-sobre-el-total)).
- NEGOCIO: "AVISO (Julian, mayo 2019): NO CAMBIAR LA FORMA DE REDONDEAR...
  Puri (gestoria) devolvio todo el trimestre. Se queda como esta."
  ([services/calculo.js:1-7](../../services/calculo.js#L1-L7);
  [memoria-historica.md H11](memoria-historica.md#h11--052019-incidente-grave-de-redondeo--la-gestoría-devuelve-todo-el-trimestre)).

**Clasificación**: **INTENCIONAL** (protegida — la advertencia mejor
documentada de todo el sistema). Los tres testigos coinciden: CÓDIGO, DATOS y
NEGOCIO (Julián y Puri, mayo 2019, incidente real y nombrado).

**Depende de este comportamiento**: la gestoría (Puri, programa de
contabilidad Contaplus) y, por extensión, toda declaración trimestral de IVA
ya presentada con este método de redondeo.

**Tratamiento acordado**: especificar tal cual, sin ninguna variación,
incluyendo el detalle de que el redondeo se hace línea a línea. **Precaución**:
cualquier reimplementación (p. ej. en un lenguaje o motor distinto) debe
reproducir exactamente el mismo comportamiento de redondeo, incluidos los
casos frontera de coma flotante de `Math.round(x*100)/100`, para no reabrir
el incidente de 2019.

**Decisión de negocio pendiente**: ¿sigue Puri (o la gestoría actual) usando
el mismo programa de contabilidad con la misma exigencia de redondeo línea a
línea, o ha cambiado de herramienta desde 2019? — **Responsable: gestoría
(Puri) / Marga**.

> **Actualización (2026-09-30)**: hipótesis SIMULADA registrada, sin cerrar
> — ver la sección «Propagación del acta de entrevista de negocio
> (2026-09-30)», bloque A-08, al final de este documento.

---

### A-09 — La rectificativa es un espejo exacto: invierte signos sin recalcular nada

**Descripción**: al generar la rectificativa de una factura no se recalcula
ningún importe; se copian las líneas originales invirtiendo el signo de
cantidad, base, cuota de IVA y cuota de recargo (el precio unitario no se
invierte).

**Evidencia**:
- CÓDIGO: [routes/facturas.js:124-160](../../routes/facturas.js#L124-L160),
  en particular [routes/facturas.js:149-150](../../routes/facturas.js#L149-L150).
- DATOS: línea original de `FA-2026-000106` (cantidad 1, precio 90,00 €, base
  90,00 €, cuota IVA 18,90 €, [db.js:157](../../db.js#L157)) frente a su
  rectificativa en `RE-2026-000001` (cantidad -1, precio 90,00 € sin cambiar,
  base -90,00 €, cuota IVA -18,90 €, [db.js:161](../../db.js#L161)).
- NEGOCIO: "OJO: aqui NO se recalcula nada, se invierte lo que hay (Puri
  dixit: la rectificativa tiene que ser espejo exacto de la original)"
  ([routes/facturas.js:124-128](../../routes/facturas.js#L124-L128)).

**Clasificación**: **INTENCIONAL** (protegida). Los tres testigos presentes:
CÓDIGO, DATOS (ejemplo real verificado) y NEGOCIO (Puri, cita literal).

**Depende de este comportamiento**: la gestoría (Puri), y el resumen de IVA
trimestral (`RN-28`), que asume que las rectificativas "cuadran solas" gracias
precisamente a este espejo exacto.

**Tratamiento acordado**: especificar tal cual, sin excepción.

**Decisión de negocio pendiente**: ninguna — testimonio directo y sin
ambigüedad.

---

### A-10 — Formato y clave fija de la exportación CSV a la gestoría

**Descripción**: todo CSV exportado para la gestoría empieza con
`CLAVE;<clave fija>` y usa separador `;`, decimales con coma y punto de
miles, como formato acordado.

**Evidencia**:
- CÓDIGO: [config.js:36-37](../../config.js#L36-L37);
  [routes/informes.js:40-50](../../routes/informes.js#L40-L50).
- DATOS: primera línea real de cualquier exportación:
  `'CLAVE;SH-CONTA-7731'`.
- NEGOCIO: "clave que pide la gestoria para el fichero de exportacion (no
  cambiar)" ([config.js:36](../../config.js#L36)); "formato acordado con Puri
  en 2019: punto y coma, decimales con coma, y la clave en la primera linea"
  ([routes/informes.js:32-33](../../routes/informes.js#L32-L33);
  [memoria-historica.md H12](memoria-historica.md#h12--2019-formato-de-exportación-csv-acordado-con-puri)).

**Clasificación**: **INTENCIONAL** (protegida). Tres testigos: CÓDIGO, DATOS
y NEGOCIO (Puri, 2019).

**Depende de este comportamiento**: la gestoría (Puri), cuyo programa de
contabilidad espera literalmente este formato y esta clave.

**Tratamiento acordado**: especificar tal cual, sin variación de formato ni
de clave.

**Decisión de negocio pendiente**: ¿sigue la gestoría aceptando exactamente
este formato y esta clave hoy, o ha cambiado de programa/requisitos desde
2019? — **Responsable: gestoría (Puri)**.

> **Actualización (2026-09-30)**: hipótesis SIMULADA registrada, sin cerrar
> — ver la sección «Propagación del acta de entrevista de negocio
> (2026-09-30)», bloque A-10, al final de este documento.

---

### A-11 — La exportación CSV anual no filtra por estado de la factura

**Descripción**: el CSV anual incluye una fila por cada factura del año, sea
cual sea su estado (`emitida`, `cobrada`, `rectificada`) y su serie (`FA` o
`RE`), sin excluir las anuladas por una rectificativa.

**Evidencia**:
- CÓDIGO: [routes/informes.js:34-38](../../routes/informes.js#L34-L38) (sin
  filtro de `estado`).
- DATOS: la exportación de 2026 incluye tres filas para una sola operación
  económica real: `FA-2026-000106` (rectificada), `RE-2026-000001` y
  `FA-2026-000107`
  ([reglas-de-negocio.md RN-30](reglas-de-negocio.md#rn-30--la-exportación-csv-anual-incluye-todas-las-facturas-del-año-sin-filtrar-por-estado)).
- NEGOCIO: no hay ningún comentario que indique si la gestoría espera ver
  estas tres filas o si debería excluirse alguna (a diferencia del propio
  formato del CSV, que sí tiene testimonio — ver A-10).

**Clasificación**: **PENDIENTE**. Falta el testimonio de negocio: podría ser
intencional (que la gestoría vea también las anuladas, con su propio criterio
de conciliación, igual que hace con el resumen de IVA — `RN-28`) o un
descuido de no añadir el filtro.

**Depende de este comportamiento**: la gestoría, si ya está acostumbrada a
recibir y conciliar estas tres filas por operación.

**Tratamiento acordado**: documentar sin especificar hasta resolver la
pregunta de negocio.

**Decisión de negocio pendiente**: ¿la gestoría espera ver las tres filas de
una operación rectificada (original, abono y sustituta) en la exportación
anual, o debería excluirse alguna? — **Responsable: gestoría (Puri)**.

> **Actualización (2026-09-30)**: hipótesis SIMULADA registrada, sin cerrar
> — ver la sección «Propagación del acta de entrevista de negocio
> (2026-09-30)», bloque A-11, al final de este documento.

---

### A-12 — Envío de factura por email desactivado, con llamada residual y credenciales SMTP muertas

**Descripción**: al grabar una factura se invoca el envío por email, pero la
implementación real está desactivada desde 2022 y solo escribe un aviso por
consola; las credenciales SMTP siguen en `config.js` en texto plano.

**Evidencia**:
- CÓDIGO: [routes/facturas.js:93](../../routes/facturas.js#L93) (invocación);
  [services/email.js:11-29](../../services/email.js#L11-L29) (implementación
  desactivada); [config.js:27-34](../../config.js#L27-L34) (credenciales).
- DATOS: alta de factura para un cliente con email real imprime
  `'[email] AVISO: envio desactivado...'` y continúa con éxito igualmente
  ([reglas-de-negocio.md RN-21](reglas-de-negocio.md#rn-21--al-grabar-una-factura-se-intenta-enviar-por-email-pero-no-se-envía-nada)).
- NEGOCIO: "DEJO DE FUNCIONAR en 2022 (Arsys), hablar con Manoli antes de
  tocar nada de esto" ([config.js:27-28](../../config.js#L27-L28));
  "desinstalado en 2023, daba un aviso de seguridad"
  ([services/email.js:8](../../services/email.js#L8);
  [memoria-historica.md H20-H21](memoria-historica.md#h20--2022-se-rompe-el-envío-de-facturas-por-correo-arsys-y-pasa-a-ser-manual)).

**Clasificación**: **INTENCIONAL** (protegida) en cuanto a que las facturas
no se envían por correo desde 2022: testimonio CÓDIGO + NEGOCIO (Manoli,
2022) cumplen los dos testigos exigidos. **DUDOSA→PENDIENTE**, en cambio, en
cuanto a si seguir invocando `enviarFactura` (que no hace nada) es
deliberado o un simple olvido de limpieza — no hay testigo que lo confirme.

**Depende de este comportamiento**: Marga (envía las facturas a mano por
Outlook desde 2022); Manoli, a quien hay que consultar antes de reactivar
nada.

**Tratamiento acordado**: especificar tal cual el hecho de que el envío
automático está desactivado (protegido); documentar sin especificar la
limpieza de la llamada residual y de las credenciales hasta resolver la
pregunta de negocio. **Precaución**: rotar la contraseña SMTP expuesta (ver
A-03) es independiente de si se reactiva el envío o no.

**Decisión de negocio pendiente**: ¿sigue teniendo sentido mantener la
llamada a `enviarFactura` sabiendo que no hace nada desde 2022, o debería
retirarse en la modernización? ¿Sigue Marga enviando las facturas a mano
hoy? — **Responsable: Manoli / Marga**.

> **Actualización (2026-09-30)**: hipótesis SIMULADA registrada, sin cerrar
> — ver la sección «Propagación del acta de entrevista de negocio
> (2026-09-30)», bloque A-12, al final de este documento.

---

### A-13 — Descuento por volumen: umbral sobre base bruta y desglose línea a línea

**Descripción**: a partir de 1.000 € de base bruta el descuento es del 2%, a
partir de 5.000 € del 5% (frontera estrictamente "mayor que"), y se aplica
recalculando el precio de cada línea, no como un concepto aparte.

**Evidencia**:
- CÓDIGO: [services/calculo.js:36-43](../../services/calculo.js#L36-L43)
  (umbral); [services/calculo.js:63-84](../../services/calculo.js#L63-L84)
  (aplicación línea a línea).
- DATOS: `FA-2026-000103` tiene base exactamente 1.000,00 € y, según su
  propia observación en la base de datos, no lleva descuento
  ([db.js:138-139](../../db.js#L138-L139)), confirmando la frontera exacta
  "mayor que".
- NEGOCIO: "acordado con Paco en 2018 para fidelizar hosteleria"
  ([services/calculo.js:36-38](../../services/calculo.js#L36-L38)); "el
  descuento se aplica linea a linea... peticion de Puri, 2018"
  ([services/calculo.js:63-64](../../services/calculo.js#L63-L64);
  [memoria-historica.md H5/H6](memoria-historica.md#h5--2018-descuento-por-volumen-acordado-con-paco)).

**Clasificación**: **INTENCIONAL** (protegida). Tres testigos completos:
CÓDIGO, DATOS (caso frontera real ya pactado) y NEGOCIO (Paco y Puri, 2018).

**Depende de este comportamiento**: clientes de hostelería con acuerdo de
volumen, y la gestoría (Puri), que espera el desglose línea a línea.

**Tratamiento acordado**: especificar tal cual, incluida la frontera
estricta "mayor que" en ambos umbrales.

**Decisión de negocio pendiente**: **SUPOSICIÓN sin confirmar** — no consta
el rol exacto de Paco en la empresa, ni si el acuerdo de 2018 (umbrales
1.000 €/5.000 €, porcentajes 2%/5%) sigue vigente hoy o debería revisarse. —
**Responsable: Paco (o quien ocupe su rol comercial hoy)**.

> **Actualización (2026-09-30)**: hipótesis SIMULADA registrada sobre la
> vigencia del acuerdo, sin cerrar; el rol de Paco sigue sin confirmar y pasa
> a la agenda de la próxima ronda — ver la sección «Propagación del acta de
> entrevista de negocio (2026-09-30)», bloque A-13, al final de este
> documento.

---

### A-14 — Vencimiento: `dias_pago = 0` se trata igual que "sin asignar" (30 días por defecto)

**Descripción**: la comprobación `cliente.dias_pago || config.VENCIMIENTO_DIAS`
trata como "no asignado" tanto `null`/`undefined` como el número `0`, por el
comportamiento del operador `||` de JavaScript.

**Evidencia**:
- CÓDIGO: [routes/facturas.js:68-69](../../routes/facturas.js#L68-L69).
- DATOS: no existe hoy ningún cliente con `dias_pago = 0` en la carga
  inicial — el efecto es verificable por ejecución mental del código
  (`0 || 30` evalúa a `30`), no observable todavía en un dato real
  ([reglas-de-negocio.md RN-11](reglas-de-negocio.md#rn-11--fecha-de-vencimiento-días-de-pago-del-cliente-o-30-días-por-defecto)).
- NEGOCIO: ningún comentario indica que se haya considerado nunca un cliente
  de pago al contado.

**Clasificación**: **ACCIDENTAL**. Efecto colateral verificable del operador
`||` sobre un valor numérico, sin respaldo de intención en ningún testigo.

**Depende de este comportamiento**: nadie identificado hoy (no existe cliente
afectado en los datos reales).

**Tratamiento acordado**: corregir en fase de modernización (comprobación
explícita de `null`/`undefined` en vez de `||`). Sin problema de
retroactividad: no hay ningún cliente real afectado todavía.

**Decisión de negocio pendiente**: ¿existe hoy, o se ha planteado alguna vez,
algún cliente de pago al contado (`dias_pago = 0`)? — **Responsable: Marga /
administración**.

> **Actualización (2026-09-30)**: hipótesis SIMULADA registrada, sin cerrar
> — ver la sección «Propagación del acta de entrevista de negocio
> (2026-09-30)», bloque A-14, al final de este documento.

---

### A-15 — Duplicación de la constante "30 días de vencimiento por defecto"

**Descripción**: el alta manual de factura usa la constante
`config.VENCIMIENTO_DIAS` para el vencimiento por defecto, mientras que la
remesa mensual usa el literal `30` tecleado directamente, sin importar
`config.js`.

**Evidencia**:
- CÓDIGO: [config.js:39-40](../../config.js#L39-L40) (constante);
  [scripts/remesa_mensual.js:60](../../scripts/remesa_mensual.js#L60)
  (literal); [scripts/remesa_mensual.js:9-12](../../scripts/remesa_mensual.js#L9-L12)
  confirma que el script nunca hace `require('../config')`.
- DATOS: hoy ambos valen 30, por lo que no hay ninguna factura real con
  resultado distinto todavía
  ([contradiccion-02 §3](contradiccion-02-dias-vencimiento-por-defecto.md#3-ejemplo-concreto-con-resultado-distinto-para-la-misma-entrada)).
- NEGOCIO: ningún comentario explica por qué la remesa no reutiliza la
  constante ya existente.

**Clasificación**: **ACCIDENTAL** (latente — no manifestado en ningún dato
real todavía).

**Depende de este comportamiento**: nadie identificado mientras ambos valores
coincidan; se activaría el día que alguien cambie `config.VENCIMIENTO_DIAS`
esperando que afecte a toda la facturación.

**Tratamiento acordado**: corregir en fase de modernización (que la remesa
lea la misma constante). Sin problema de retroactividad: la divergencia nunca
se ha manifestado.

**Decisión de negocio pendiente**: si algún día cambia el plazo de pago por
defecto de la empresa, ¿sabe el negocio que ese cambio no afectaría hoy a la
remesa mensual salvo que se edite también el script? — **Responsable: Julián
/ Marga**.

> **Actualización (2026-09-30)**: hipótesis SIMULADA registrada, sin cerrar
> — ver la sección «Propagación del acta de entrevista de negocio
> (2026-09-30)», bloque A-15, al final de este documento.

---

### A-16 — Cierre de trimestre con el día "31" fijo, en vez del fin de mes real

**Descripción**: el límite superior de cada trimestre del resumen de IVA se
construye siempre con el literal `'31'`, aunque el mes tenga 28, 29 o 30
días; funciona hoy solo porque las fechas se comparan como texto.

**Evidencia**:
- CÓDIGO: [routes/informes.js:14-19](../../routes/informes.js#L14-L19)
  (literal `'31'`) frente a [lib/util.js:36-39](../../lib/util.js#L36-L39)
  (`diasDelMes`, que sí calcula el día real y que el propio sistema usa en
  otros puntos — ver A-01).
- DATOS: para el trimestre 2 de 2026 el límite construido es `'2026-06-31'`
  (fecha inexistente); la factura real `FA-2026-000108`
  (`'2026-05-31'`, [db.js:168](../../db.js#L168)) sigue incluyéndose
  correctamente porque `'2026-05-31' <= '2026-06-31'` es cierto como
  comparación de texto
  ([contradiccion-04 §3](contradiccion-04-cierre-de-periodo-mensual.md#3-ejemplo-concreto-mismo-mes-valor-distinto-el-resultado-de-la-consulta-no-cambia-el-valor-sí)).
- NEGOCIO: ningún comentario explica por qué se usa siempre "31" en vez de
  `diasDelMes`.

**Clasificación**: **ACCIDENTAL** (latente — el resultado de hoy es correcto
solo por una coincidencia del formato de almacenamiento en texto).

**Depende de este comportamiento**: nadie depende de que sea "31" en
concreto; sí depende, indirectamente, de que las fechas sigan siendo texto
`YYYY-MM-DD` para que la coincidencia se siga sosteniendo.

**Tratamiento acordado**: corregir en fase de modernización (usar
`diasDelMes` o una comparación de fechas real). Sin problema de
retroactividad para los datos ya facturados; sí es una precondición si algún
día cambia el motor de base de datos o el formato de fecha almacenado.

**Decisión de negocio pendiente**: ¿se ha planteado alguna vez cambiar el
formato de almacenamiento de fechas o migrar a otro motor de base de datos
(la migración a MySQL de 2018 sigue pendiente en `LEEME.txt`)? Eso rompería
la coincidencia que hoy mantiene este código funcionando. — **Responsable:
Julián**.

> **Actualización (2026-09-30)**: hipótesis SIMULADA registrada, sin cerrar
> — ver la sección «Propagación del acta de entrevista de negocio
> (2026-09-30)», bloque A-16, al final de este documento.

---

### A-17 — Formato de importe inconsistente en pantallas internas (`toFixed` crudo vs `formatearImporte`)

**Descripción**: el panel de inicio, el catálogo de artículos y el listado de
contratos muestran los importes con `toFixed(2)` crudo (punto decimal, sin
separador de miles), mientras que facturas e informes usan
`formatearImporte` (coma decimal, punto de miles).

**Evidencia**:
- CÓDIGO: `views/index.ejs:6`, `views/articulos.ejs:8`,
  `views/contratos.ejs:8` (`toFixed(2)`) frente a
  [lib/util.js:51-58](../../lib/util.js#L51-L58) (`formatearImporte`), usada
  de forma consistente en facturas e informes.
- DATOS: el importe pendiente real de 3.032,85 € se muestra como `3032.85`
  en el panel de inicio; el precio real de "Aceite de oliva virgen extra 5L"
  (27,45 €, [db.js:107](../../db.js#L107)) se ve como `27.45` en el catálogo
  y como `27,45` en la factura real que lo contiene
  ([contradiccion-03 §3](contradiccion-03-formato-importe-en-pantalla.md#3-ejemplos-concretos-con-resultados-distintos-con-datos-reales-de-producción)).
- NEGOCIO: sin testimonio; el propio formato correcto (`formatearImporte`) sí
  tiene testimonio de Puri para las facturas (ver A-10), lo que confirma por
  contraste que el formato crudo de estas tres pantallas no es el acordado.

**Clasificación**: **BUG A SECAS**. Confirmado por código y datos como una
inconsistencia sin respaldo; en `views/contratos.ejs` incluso hay un descuido
verificable (la plantilla ya recibe `util` y ya usa `util.fechaBonita` en la
misma fila).

**Depende de este comportamiento**: nadie — son pantallas internas de
administración, no documentos legales ni exportaciones.

**Tratamiento acordado**: corregir en fase de modernización (usar
`formatearImporte` en las tres vistas, y pasar `util` a las rutas que hoy no
lo hacen). Sin problema de retroactividad: es solo presentación en pantalla.

**Decisión de negocio pendiente**: ¿se ha notado alguna vez esta
inconsistencia al usar el sistema día a día? (no bloquea la corrección, solo
informa de la urgencia). — **Responsable: Marga**.

> **Actualización (2026-09-30)**: hipótesis SIMULADA registrada, sin cerrar
> — ver la sección «Propagación del acta de entrevista de negocio
> (2026-09-30)», bloque A-17, al final de este documento.

---

### A-18 — Posible error de un día en el vencimiento por cambio de hora (`sumarDias`)

**Descripción**: `sumarDias` suma días operando con `getTime()` en hora
local; hay un incidente real documentado (marzo de 2019) de un vencimiento
calculado un día antes de lo esperado, nunca reproducido ni confirmado.

**Evidencia**:
- CÓDIGO: [lib/util.js:17-26](../../lib/util.js#L17-L26).
- DATOS: no hay caso reproducible ni dato adicional más allá del propio
  comentario.
- NEGOCIO: "un vencimiento salió un día antes de lo esperado... se sospecha
  del cambio de hora... no se ha conseguido reproducir"
  ([lib/util.js:17-19](../../lib/util.js#L17-L19);
  [memoria-historica.md H10](memoria-historica.md#h10--031-2019-incidente-sin-resolver-en-el-cálculo-de-vencimientos)).

**Clasificación**: **BUG A SECAS**. Reconocido como incidente real por el
propio autor, sin ninguna lectura de intencionalidad ni de riesgo aceptado.

**Depende de este comportamiento**: nadie identificado (caso aislado, no
reproducido desde 2019).

**Tratamiento acordado**: corregir en fase de modernización (usar aritmética
de fechas robusta frente a cambios de horario). Sin problema de
retroactividad conocido, dado que no hay ningún caso confirmado posterior.

**Decisión de negocio pendiente**: ¿hay constancia de algún otro caso
posterior a 2019 de un vencimiento mal calculado? Ayudaría a acotar si sigue
latente. — **Responsable: Marga / Julián**.

> **Actualización (2026-09-30)**: hipótesis SIMULADA registrada, sin cerrar
> — ver la sección «Propagación del acta de entrevista de negocio
> (2026-09-30)», bloque A-18, al final de este documento.

---

### A-19 — Exportación CSV sin escapar el separador ni caracteres de fórmula

**Descripción**: el CSV para la gestoría concatena campos de texto libre
(nombre de cliente) con `;` sin comprobar si el propio campo contiene `;`,
saltos de línea, o caracteres que Excel interpreta como inicio de fórmula.

**Evidencia**:
- CÓDIGO: [routes/informes.js:34-51](../../routes/informes.js#L34-L51)
  (`join(';')`); [routes/clientes.js:21-30](../../routes/clientes.js#L21-L30)
  (nombre de cliente sin restricción de caracteres) —
  [registro-riesgos.md R12](registro-riesgos.md).
- DATOS: no hay ningún cliente real en la carga inicial con `;` o `=` en el
  nombre que materialice el problema hoy.
- NEGOCIO: sin testimonio, ni a favor ni en contra.

**Clasificación**: **BUG A SECAS**. Ausencia de validación claramente no
deliberada, sin ninguna lectura alternativa razonable.

**Depende de este comportamiento**: nadie.

**Tratamiento acordado**: corregir en fase de modernización (escapar el
separador y neutralizar caracteres de fórmula al exportar). Sin problema de
retroactividad: solo afecta a exportaciones futuras.

**Decisión de negocio pendiente**: ninguna.

---

### A-20 — Importes del formulario de factura sin validar `NaN` ni negativos

**Descripción**: cantidades y precios se convierten con `parseFloat` tras
sustituir coma por punto, sin comprobar `NaN`, negativos ni límites antes de
calcular y grabar la factura.

**Evidencia**:
- CÓDIGO: [routes/facturas.js:59-63](../../routes/facturas.js#L59-L63), sin
  comprobación posterior antes de
  [routes/facturas.js:66](../../routes/facturas.js#L66) —
  [registro-riesgos.md R13](registro-riesgos.md).
- DATOS: no hay ningún caso real en la carga inicial con este problema.
- NEGOCIO: sin testimonio.

**Clasificación**: **BUG A SECAS**. Falta de validación de entrada sin
ninguna lectura de intencionalidad.

**Depende de este comportamiento**: nadie; se agrava por A-02 (sin
autenticación), pero es un problema independiente.

**Tratamiento acordado**: corregir en fase de modernización (validar
numérico, no negativo, con límites razonables). Sin problema de
retroactividad.

**Decisión de negocio pendiente**: ninguna.

---

### A-21 — Comparación `==` en vez de `===` en el criterio de recargo de equivalencia

**Descripción**: `cliente.recargo_equivalencia == 1` usa igualdad débil en
vez de estricta; no cambia el resultado con los valores enteros 0/1 que
guarda hoy la base de datos.

**Evidencia**:
- CÓDIGO: [services/calculo.js:48-49](../../services/calculo.js#L48-L49).
- DATOS: verificado con "Ferretería El Tornillo"
  (`recargo_equivalencia = 1`, [db.js:97](../../db.js#L97)) y "Cafetería La
  Parada" (`= 0`, [db.js:96](../../db.js#L96)): el resultado es correcto en
  ambos casos con los valores actuales.
- NEGOCIO: sin testimonio sobre este detalle concreto de implementación (sí
  hay testimonio sobre el criterio de negocio en sí — solo clientes en
  recargo —, que no es la parte anómala aquí).

**Clasificación**: **ACCIDENTAL**. Detalle de implementación sin comentario
que lo explique, sin impacto detectado hoy con los datos reales.

**Depende de este comportamiento**: nadie; sin impacto observable mientras
`recargo_equivalencia` siga almacenándose como entero 0/1.

**Tratamiento acordado**: corregir en fase de modernización de forma trivial
(usar `===`). Sin problema de retroactividad.

**Decisión de negocio pendiente**: ninguna.

---

### A-22 — Copia de seguridad única, manual y semanal

**Descripción**: la única copia de seguridad documentada de la base de datos
(todo el negocio) es manual y semanal, a un pendrive.

**Evidencia**:
- CÓDIGO: no aplica (es un proceso operativo, no código).
- DATOS: no aplica.
- NEGOCIO: "Marga copia datos/gesfact.db a un pendrive los viernes"
  ([LEEME.txt:18](../../LEEME.txt#L18)) — atribuido a Marga, sin fecha
  precisa más allá de "los viernes" como práctica recurrente.

**Clasificación**: **ACCIDENTAL**. Solo un testigo (NEGOCIO, vía `LEEME.txt`)
y sin confirmación de que sea un riesgo aceptado de forma consciente por
gerencia; no alcanza los dos testigos exigidos para tratarla como
INTENCIONAL, así que la práctica en sí queda documentada pero la decisión de
mantenerla o mejorarla queda pendiente.

**Depende de este comportamiento**: Marga (proceso que ella misma ejecuta);
todo el negocio depende de que esa copia exista y esté actualizada.

**Tratamiento acordado**: documentar sin especificar hasta que gerencia se
pronuncie sobre el nivel de riesgo aceptable.

**Decisión de negocio pendiente**: ¿se acepta el riesgo de perder hasta una
semana de facturación legal entre dos viernes, o se invierte en copia
automática y fuera de la oficina en la modernización? — **Responsable:
gerencia**.

> **Actualización (2026-09-30)**: hipótesis SIMULADA registrada, sin cerrar
> — ver la sección «Propagación del acta de entrevista de negocio
> (2026-09-30)», bloque A-22, al final de este documento.

---

### A-23 — Marcar una factura como cobrada falla en silencio si no está en estado "emitida"

**Descripción**: si se intenta cobrar una factura que ya está `'cobrada'` o
`'rectificada'`, el `UPDATE` no afecta a ninguna fila, pero la aplicación
responde igual (redirección) sin informar de ningún error.

**Evidencia**:
- CÓDIGO: [routes/facturas.js:117-122](../../routes/facturas.js#L117-L122).
- DATOS: `POST /facturas/6/cobrar` sobre `FA-2026-000106` (ya `'rectificada'`,
  [db.js:156](../../db.js#L156)) no afecta a ninguna fila y responde igual
  que si hubiera funcionado.
- NEGOCIO: ningún comentario explica si el silencio ante el fallo es
  deliberado.

**Clasificación**: **PENDIENTE**. El filtro `estado = 'emitida'` parece una
guarda de negocio deliberada, pero no hay testigo que confirme si el silencio
ante el fallo también lo es.

**Depende de este comportamiento**: quien use el botón de cobrar sin darse
cuenta de que no ha pasado nada (riesgo de creer cobrada una factura que no
lo está, o de reintentar sin saber por qué no cambia).

**Tratamiento acordado**: documentar sin especificar hasta resolver la
pregunta de negocio.

**Decisión de negocio pendiente**: ¿es aceptable para administración que esa
acción falle en silencio, o debería avisar cuando no hace nada? —
**Responsable: Marga / administración**.

> **Actualización (2026-09-30)**: hipótesis SIMULADA registrada, sin cerrar
> — ver la sección «Propagación del acta de entrevista de negocio
> (2026-09-30)», bloque A-23, al final de este documento.

---

### A-24 — La rectificativa no hereda fecha ni vencimiento de la factura original

**Descripción**: la fecha de una rectificativa es siempre la fecha en que se
genera (hoy), no la de la factura que rectifica, y su vencimiento queda
`null`.

**Evidencia**:
- CÓDIGO: [routes/facturas.js:142](../../routes/facturas.js#L142).
- DATOS: `FA-2026-000106` fechada el 30/04/2026
  ([db.js:156](../../db.js#L156)); su rectificativa `RE-2026-000001` fechada
  el 06/05/2026, sin vencimiento ([db.js:160](../../db.js#L160)).
- NEGOCIO: ningún comentario explica esta decisión, a diferencia de A-09
  (espejo exacto), donde sí hay testimonio explícito.

**Clasificación**: **PENDIENTE**. Podría ser deliberado (una rectificativa no
genera nuevo plazo de cobro) o un efecto colateral de no haberlo considerado;
ningún testigo lo confirma.

**Depende de este comportamiento**: nadie identificado más allá de la propia
coherencia del documento legal.

**Tratamiento acordado**: documentar sin especificar hasta resolver la
pregunta de negocio.

**Decisión de negocio pendiente**: ¿es deliberado que la rectificativa no
herede fecha ni vencimiento de la original, o debería reflejar la fecha de la
factura que rectifica? — **Responsable: gestoría (Puri) / Marga**.

> **Actualización (2026-09-30)**: hipótesis SIMULADA registrada, sin cerrar
> — ver la sección «Propagación del acta de entrevista de negocio
> (2026-09-30)», bloque A-24, al final de este documento.

---

### A-25 — Vulnerabilidades de dependencias nativas en la cadena de compilación de `sqlite3`

**Descripción**: `npm audit` señala vulnerabilidades crítica y altas en el
paquete `tar` y sus dependientes (`node-gyp`, `make-fetch-happen`,
`cacache`), usados al compilar el módulo nativo `sqlite3@5.1.7`.

**Evidencia**:
- CÓDIGO: [package.json:15](../../package.json#L15) (`sqlite3` como
  dependencia).
- DATOS: salida literal de `npm audit --json`: `tar` (crítica,
  GHSA-34x7-hfp2-rc4v), varias altas, todas con `fixAvailable` apuntando a
  `sqlite3@6.0.1` ([registro-riesgos.md R14](registro-riesgos.md)).
- NEGOCIO: sin testimonio.

**Clasificación**: **BUG A SECAS** (en el sentido de deuda técnica no
deliberada; nadie eligió a propósito depender de versiones vulnerables).

**Depende de este comportamiento**: nadie; solo se activa durante
`npm install`/recompilación (p. ej. al preparar un ordenador nuevo de
oficina, [LEEME.txt:5-7](../../LEEME.txt#L5-L7)), no en la ejecución normal.

**Tratamiento acordado**: corregir en fase de modernización (actualizar a
`sqlite3@6.0.1`). **Precaución**: es un cambio de versión mayor; probar la
compatibilidad de la API usada antes de desplegar.

**Decisión de negocio pendiente**: ninguna — es una decisión técnica, no de
negocio.

---

### A-26 — Código y artefactos muertos mantenidos "por si acaso"

**Descripción**: `recargoPara` mantiene cuatro tipos de IVA históricos
(16/18/7/8) que ningún otro punto del código actual puede generar, y el
fichero `datos/migracion_mysql_2018.sql` documenta una migración que nunca
llegó a ejecutarse en producción, con un esquema ya desfasado.

**Evidencia**:
- CÓDIGO: [services/calculo.js:16-21](../../services/calculo.js#L16-L21)
  frente a [routes/articulos.js:17](../../routes/articulos.js#L17) (solo
  21/10/4 en uso real); [datos/migracion_mysql_2018.sql:1-3](../../datos/migracion_mysql_2018.sql#L1-L3).
- DATOS: catálogo y formulario de factura solo ofrecen 21/10/4; los tipos
  históricos son inalcanzables con los datos y el código actuales.
- NEGOCIO: "no borrar por si hay que reabrir ejercicios viejos del Access"
  ([services/calculo.js:16-18](../../services/calculo.js#L16-L18)) para los
  tipos de IVA; "se guarda por si acaso" para el fichero de migración
  ([memoria-historica.md H7](memoria-historica.md#h7--10-2018-intento-de-migración-a-mysql-nunca-ejecutado-en-producción)),
  sin nombre de persona concreto ni fecha exacta en este segundo caso.

**Clasificación**: **INTENCIONAL** (protegida) para los tipos de IVA
históricos — cumple CÓDIGO + NEGOCIO (razón explícita, aunque sin persona
nombrada, sí con contexto y motivo claro) + DATOS (inalcanzabilidad
verificada). **PENDIENTE** para el fichero de migración a MySQL: solo hay
testigo CÓDIGO (la propia nota "por si acaso"), sin negocio ni dato que
confirme que de verdad debe conservarse.

**Depende de este comportamiento**: nadie identificado para ninguno de los
dos artefactos (son código inalcanzable / un fichero de referencia sin uso).

**Tratamiento acordado**: especificar tal cual (conservar) los tipos de IVA
históricos si en algún momento se reabren ejercicios antiguos del Access;
documentar sin especificar el fichero de migración hasta resolver si puede
eliminarse.

**Decisión de negocio pendiente**: ¿puede eliminarse
`datos/migracion_mysql_2018.sql` sin más, dado que nunca se ejecutó y su
esquema está desfasado, o hay algún motivo para conservarlo que no conste en
el código? — **Responsable: Julián**.

> **Actualización (2026-09-30)**: hipótesis SIMULADA registrada, sin cerrar
> — ver la sección «Propagación del acta de entrevista de negocio
> (2026-09-30)», bloque A-26, al final de este documento.

---

## Propagación del acta de entrevista de negocio (2026-09-30)

Esta sección aplica el contenido de
[entrevista-negocio.md](entrevista-negocio.md) a las clasificaciones
anteriores, sin sobrescribir ningún texto original: cada bloque indica el
**estado anterior**, la **evidencia NEGOCIO añadida** (acta, pregunta,
persona, fecha) y el **estado nuevo**, con su justificación. Se sigue el
mismo criterio de rigor que el resto de este documento: una respuesta
**SIMULADA** del acta (el consultor respondiendo en el papel de negocio) no
es un testigo NEGOCIO válido para cerrar una clasificación — solo se registra
como hipótesis de trabajo pendiente de validar. Una respuesta **REAL** sí
cuenta como testigo NEGOCIO pleno.

### A-01 — Prorrateo de cuota mensual

- **Estado anterior**: BUG HISTÓRICO CON DEPENDIENTES, con decisión de
  negocio pendiente ("¿cuál de las dos fórmulas... es la correcta?").
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 1, respondida por
  Puri/Marga — **REAL**. Respuesta: días reales del mes.
- **Estado nuevo**: **RESUELTA** (BUG HISTÓRICO CON DEPENDIENTES → criterio de
  negocio fijado para el futuro: **días reales del mes**, el mismo que ya usa
  la remesa automática desde 2021). La decisión aplica solo hacia adelante;
  no se recalculan retroactivamente las facturas ya emitidas por la remesa
  desde 2021 con esta fórmula, ni las emitidas a mano con la fórmula del mes
  comercial de 30 días.
- **Efecto colateral registrado**: esta decisión **contradice** el testigo
  NEGOCIO histórico que hasta ahora respaldaba la fórmula contraria ("Asi lo
  hacia Paco a mano en el Access y asi lo espera la gestoria",
  [services/calculo.js:92-94](../../services/calculo.js#L92-L94)). No se
  borra ni se reinterpreta esa cita: queda registrada como testimonio
  histórico ya superado por una decisión de negocio posterior y real, no como
  un testimonio erróneo. Se abre una pregunta nueva de confirmación con la
  gestoría — ver el nuevo evento H22 de
  [memoria-historica.md](memoria-historica.md) y la sección "Pendiente para
  próxima ronda" de [entrevista-negocio.md](entrevista-negocio.md).

### A-02 — Ausencia de autenticación

- **Estado anterior**: ACCIDENTAL, con decisión de negocio pendiente sobre si
  el acceso está realmente limitado a la oficina y si se acepta el riesgo o
  se exige autenticación.
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 2 (primera parte),
  respondida por gerencia — **REAL**: el acceso está limitado a la oficina.
  Repregunta de la misma pregunta 2 (segunda parte) — **SIMULADA**: se exige
  autenticación en la modernización.
- **Estado nuevo**: **PARCIALMENTE RESUELTA**. El hecho de que el acceso hoy
  esté limitado a la red de la oficina queda confirmado con testigo NEGOCIO
  real y ya no es una incógnita (ver también
  [registro-riesgos.md, actualización a R1](registro-riesgos.md)). La
  decisión de exigir autenticación en la modernización, en cambio, es solo
  una hipótesis SIMULADA: **sigue pendiente de que gerencia la confirme
  realmente** antes de fijarla como requisito.

### A-03 — Despliegue manual de `config.js`

- **Estado anterior**: BUG A SECAS, con decisión de negocio pendiente sobre
  si el despliegue manual sigue vigente.
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 3, respondida en
  el papel de Julián/sistemas — **SIMULADA**: sigue vigente.
- **Estado nuevo**: sin cambio de clasificación. Se registra la hipótesis
  SIMULADA (sigue vigente) como criterio de trabajo para no bloquear el
  avance, pero **no se cierra**: requiere confirmación real de Julián antes
  de decidir si renombrar `config.js` en la modernización es seguro.

### A-06 — Indicadores del panel inconsistentes

- **Estado anterior**: BUG A SECAS, con decisión de negocio pendiente sobre
  si las rectificativas cuentan como "pendientes".
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 4, respondida en
  el papel de Marga — **SIMULADA**: no deben contar.
- **Estado nuevo**: sin cambio de clasificación. Hipótesis SIMULADA
  registrada (excluir rectificativas del recuento, unificando con el criterio
  de RN-33) pendiente de confirmación real de Marga.

### A-07 — Validación de NIF sin dígito de control

- **Estado anterior**: INTENCIONAL (protegida), con decisión de negocio
  pendiente sobre si sigue siendo aceptable el control visual.
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 5, respondida en
  el papel de Marga — **SIMULADA**: añadir comprobación automática.
- **Estado nuevo**: sin cambio de clasificación (sigue INTENCIONAL como
  comportamiento actual). Hipótesis SIMULADA registrada (añadir dígito de
  control en la modernización) pendiente de confirmación real de Marga.

### A-08 — Redondeo línea a línea

- **Estado anterior**: INTENCIONAL (protegida), con decisión de negocio
  pendiente sobre si la gestoría sigue exigiendo el mismo cálculo.
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 6, respondida en
  el papel de Puri — **SIMULADA**: sigue vigente, sin variación.
- **Estado nuevo**: sin cambio de clasificación. Hipótesis SIMULADA
  registrada (mantener tal cual) pendiente de confirmación real de Puri;
  dado el historial del incidente de 2019, esta confirmación real es de las
  más sensibles de la lista.

### A-10 — Formato y clave fija del CSV

- **Estado anterior**: INTENCIONAL (protegida), con decisión de negocio
  pendiente sobre si la gestoría sigue aceptando el mismo formato y clave.
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 7, respondida en
  el papel de Puri — **SIMULADA**: sí, sin variación.
- **Estado nuevo**: sin cambio de clasificación. Hipótesis SIMULADA
  registrada pendiente de confirmación real de Puri.

### A-11 — Exportación CSV anual sin filtrar por estado

- **Estado anterior**: PENDIENTE.
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 8, respondida en
  el papel de Puri — **SIMULADA**: incluir las tres filas, sin filtro.
- **Estado nuevo**: **sigue PENDIENTE**. La respuesta SIMULADA apunta a no
  añadir filtro (mismo criterio que RN-28), pero al no ser testimonio real no
  basta para levantar la clasificación PENDIENTE; se registra como hipótesis
  de trabajo a confirmar con Puri.

### A-12 — Llamada residual a `enviarFactura`

- **Estado anterior**: INTENCIONAL (envío desactivado) / PENDIENTE (limpieza
  de la llamada residual).
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 9, respondida en
  el papel de Manoli/Marga — **SIMULADA**: retirar la llamada; Marga sigue
  enviando a mano.
- **Estado nuevo**: la parte INTENCIONAL (envío desactivado desde 2022) no
  cambia. La parte PENDIENTE (limpieza de la llamada residual) **sigue
  PENDIENTE**: se registra la hipótesis SIMULADA (retirarla) a confirmar con
  Manoli antes de tocar nada de este módulo, tal como exige la advertencia ya
  documentada en [memoria-historica.md H20](memoria-historica.md#h20--2022-se-rompe-el-envío-de-facturas-por-correo-arsys-y-pasa-a-ser-manual).

### A-13 — Descuento por volumen acordado con Paco

- **Estado anterior**: INTENCIONAL (protegida), con decisión de negocio
  pendiente marcada explícitamente como "SUPOSICIÓN sin confirmar" (rol de
  Paco).
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 10, respondida en
  el papel de "Paco (o quien ocupe su rol comercial hoy)" — **SIMULADA**:
  sigue vigente. El propio acta marca aparte, como nota sin resolver, que el
  rol de Paco **no** se puede simular razonablemente.
- **Estado nuevo**: sin cambio de clasificación. Hipótesis SIMULADA
  registrada sobre la vigencia del acuerdo (umbrales y porcentajes sin
  cambio), pero el **rol de Paco sigue sin confirmar** — pasa íntegro a la
  agenda de la próxima ronda (ver
  [entrevista-negocio.md, "Pendiente para próxima ronda"](entrevista-negocio.md)).

### A-14 — `dias_pago = 0` tratado como "sin asignar"

- **Estado anterior**: ACCIDENTAL, con decisión de negocio pendiente sobre si
  existen clientes de pago al contado.
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 11, respondida en
  el papel de Marga — **SIMULADA**: no existe ninguno hoy, pero conviene
  corregir igualmente.
- **Estado nuevo**: sin cambio de clasificación. Hipótesis SIMULADA
  registrada (no hay cliente afectado hoy) pendiente de confirmación real de
  Marga; no condiciona la corrección técnica, que se acomete igual en la
  modernización.

### A-15 — Constante "30 días" duplicada

- **Estado anterior**: ACCIDENTAL (latente), con decisión de negocio
  pendiente sobre si el negocio es consciente de la divergencia latente.
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 12, respondida en
  el papel de Julián/Marga — **SIMULADA**: debe unificarse.
- **Estado nuevo**: sin cambio de clasificación. Hipótesis SIMULADA
  registrada (unificar en la modernización) pendiente de confirmación real.

### A-16 — Cierre de trimestre con "31" fijo

- **Estado anterior**: ACCIDENTAL (latente), con decisión de negocio
  pendiente sobre planes de cambio de motor de BD o formato de fecha.
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 13, respondida en
  el papel de Julián — **SIMULADA**: no hay planes concretos actualmente.
- **Estado nuevo**: sin cambio de clasificación. Hipótesis SIMULADA
  registrada (sin plan de cambio de motor) pendiente de confirmación real de
  Julián; la corrección técnica (usar `diasDelMes`) no depende de esta
  respuesta.

### A-17 — Formato de importe inconsistente

- **Estado anterior**: BUG A SECAS, con decisión de negocio pendiente sobre
  si se ha notado la inconsistencia.
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 14, respondida en
  el papel de Marga — **SIMULADA**: sí, notada pero no priorizada.
- **Estado nuevo**: sin cambio de clasificación. Hipótesis SIMULADA
  registrada pendiente de confirmación real de Marga; no condiciona la
  corrección, ya prevista igualmente en la modernización.

### A-18 — Posible error de un día en el vencimiento

- **Estado anterior**: BUG A SECAS, con decisión de negocio pendiente sobre
  si hay constancia de otro caso desde 2019.
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 15, respondida en
  el papel de Marga/Julián — **SIMULADA**: no hay constancia de otro caso.
- **Estado nuevo**: sin cambio de clasificación. Hipótesis SIMULADA
  registrada pendiente de confirmación real.

### A-22 — Copia de seguridad única, manual y semanal

- **Estado anterior**: ACCIDENTAL, con decisión de negocio pendiente sobre si
  se acepta el riesgo o se invierte en backup automático.
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 16, respondida en
  el papel de gerencia — **SIMULADA**: invertir en copia automática y
  externa.
- **Estado nuevo**: sin cambio de clasificación. Hipótesis SIMULADA
  registrada (invertir en backup automático) pendiente de confirmación real
  de gerencia — es, junto con A-02, de las decisiones con mayor impacto de
  negocio de toda la lista si se confirma.

### A-23 — Fallo silencioso al marcar una factura como cobrada

- **Estado anterior**: PENDIENTE.
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 17, respondida en
  el papel de Marga — **SIMULADA**: debe avisar.
- **Estado nuevo**: **sigue PENDIENTE**. Hipótesis SIMULADA registrada (añadir
  aviso explícito) pendiente de confirmación real de Marga.

### A-24 — La rectificativa no hereda fecha ni vencimiento

- **Estado anterior**: PENDIENTE.
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 18, respondida en
  el papel de Puri/Marga — **SIMULADA**: está bien tal como está.
- **Estado nuevo**: **sigue PENDIENTE**. Hipótesis SIMULADA registrada
  (mantener el comportamiento actual) pendiente de confirmación real de Puri
  y Marga.

### A-26 — Fichero de migración a MySQL de 2018

- **Estado anterior**: INTENCIONAL (IVA histórico) / PENDIENTE (fichero de
  migración).
- **Evidencia NEGOCIO añadida**: acta 2026-09-30, pregunta 19, respondida en
  el papel de Julián — **SIMULADA**: puede eliminarse.
- **Estado nuevo**: la parte INTENCIONAL (tipos de IVA históricos) no cambia.
  La parte PENDIENTE (fichero de migración) **sigue PENDIENTE**: se registra
  la hipótesis SIMULADA (eliminarlo) pendiente de confirmación real de
  Julián.

---

## Tabla resumen

| ID | Clasificación | Tratamiento | Decisión de negocio pendiente |
|---|---|---|---|
| A-01 | BUG HISTÓRICO CON DEPENDIENTES | Corregir en modernización (unificar), sin efecto retroactivo sobre facturas ya emitidas | ¿Qué fórmula de prorrateo es la correcta? |
| A-02 | ACCIDENTAL | Documentar sin especificar | ¿Se acepta el riesgo de red interna sin autenticación? |
| A-03 | BUG A SECAS | Corregir en modernización (excluir de git, rotar credenciales) | ¿Sigue vigente el despliegue manual por nombre de `config.js`? |
| A-04 | BUG A SECAS | Corregir en modernización (transacción + `UNIQUE`) | Ninguna |
| A-05 | BUG A SECAS | Corregir en modernización (transacción) | ¿Se conoce el caso ya ocurrido? |
| A-06 | BUG A SECAS | Corregir en modernización (unificar criterio) | ¿Deben incluirse rectificadas/rectificativas en los indicadores? |
| A-07 | INTENCIONAL | Especificar tal cual | ¿Sigue siendo válido el control visual de Marga? |
| A-08 | INTENCIONAL | Especificar tal cual (con precaución de coma flotante) | ¿Sigue la gestoría con el mismo programa/exigencia? |
| A-09 | INTENCIONAL | Especificar tal cual | Ninguna |
| A-10 | INTENCIONAL | Especificar tal cual | ¿Sigue la gestoría aceptando este formato/clave? |
| A-11 | PENDIENTE | Documentar sin especificar | ¿Debe filtrarse el CSV anual por estado? |
| A-12 | INTENCIONAL (envío) / PENDIENTE (limpieza) | Especificar tal cual + documentar sin especificar | ¿Retirar la llamada residual y rotar credenciales? |
| A-13 | INTENCIONAL | Especificar tal cual | ¿Sigue vigente el acuerdo de 2018 con Paco? |
| A-14 | ACCIDENTAL | Corregir en modernización | ¿Existen clientes de pago al contado? |
| A-15 | ACCIDENTAL | Corregir en modernización | ¿Se sabe que la remesa no seguiría un cambio de `config.js`? |
| A-16 | ACCIDENTAL | Corregir en modernización | ¿Se plantea cambiar el formato de fecha o el motor de BD? |
| A-17 | BUG A SECAS | Corregir en modernización | ¿Se ha notado la inconsistencia visual? |
| A-18 | BUG A SECAS | Corregir en modernización | ¿Hay otro caso posterior a 2019? |
| A-19 | BUG A SECAS | Corregir en modernización | Ninguna |
| A-20 | BUG A SECAS | Corregir en modernización | Ninguna |
| A-21 | ACCIDENTAL | Corregir en modernización (trivial) | Ninguna |
| A-22 | ACCIDENTAL | Documentar sin especificar | ¿Se acepta el riesgo de backup semanal manual? |
| A-23 | PENDIENTE | Documentar sin especificar | ¿Es aceptable el fallo silencioso al cobrar? |
| A-24 | PENDIENTE | Documentar sin especificar | ¿Debe la rectificativa heredar fecha/vencimiento? |
| A-25 | BUG A SECAS | Corregir en modernización (actualizar dependencia) | Ninguna |
| A-26 | INTENCIONAL (IVA histórico) / PENDIENTE (fichero migración) | Especificar tal cual + documentar sin especificar | ¿Puede eliminarse el fichero de migración? |

---

## Lista de clasificaciones PENDIENTES (agenda de la próxima conversación con el negocio)

> **Actualización (2026-09-30)**: tras la propagación de
> [entrevista-negocio.md](entrevista-negocio.md) (ver sección
> "Propagación del acta de entrevista de negocio" más arriba), el punto 1
> (A-01) queda **retirado de esta lista**: tiene respuesta REAL y se
> considera resuelto. El resto de puntos **se mantienen**, porque sus
> respuestas en el acta son SIMULADAS (el consultor respondiendo en el papel
> de negocio) y el propio acta advierte que no deben tratarse como decisión
> real. Cada punto conserva ahora, entre paréntesis, la hipótesis de trabajo
> SIMULADA ya registrada, a título de borrador a confirmar — no como
> respuesta cerrada.

Esta lista **no está vacía**: quedan 18 puntos por confirmar con una persona
real (el punto 2, A-02, solo a medias: el hecho de red ya es real, falta
confirmar la decisión de exigir autenticación). Estos son, literalmente, los
puntos que deben confirmarse en la próxima conversación con el negocio antes
de dar por cerradas las specs formales:

1. ~~**A-01** — ¿Cuál de las dos fórmulas de prorrateo (mes comercial de 30
   días o días reales del mes) es la correcta?~~ **RESUELTA (REAL)**: días
   reales del mes. Retirada de esta lista.
2. **A-02** — ¿Se exige autenticación en la modernización? (el hecho de que
   el acceso hoy está limitado a la red interna ya es REAL y no requiere
   nueva confirmación; hipótesis SIMULADA sobre la decisión: sí, exigirla) —
   *Responsable: gerencia*.
3. **A-03** — ¿Sigue vigente el despliegue manual de `config.js` por su
   nombre y ruta actuales? (hipótesis SIMULADA: sí, sigue vigente) —
   *Responsable: Julián*.
4. **A-06** — ¿Deben los indicadores del panel incluir o excluir facturas
   rectificadas y rectificativas? (hipótesis SIMULADA: excluirlas) —
   *Responsable: Marga*.
5. **A-07** — ¿Sigue siendo aceptable el control visual de NIF por Marga, sin
   dígito de control? (hipótesis SIMULADA: no, añadir comprobación
   automática) — *Responsable: Marga*.
6. **A-08** — ¿Sigue la gestoría exigiendo el mismo redondeo línea a línea
   con el mismo programa de contabilidad? (hipótesis SIMULADA: sí, sin
   variación) — *Responsable: Puri*.
7. **A-10** — ¿Sigue la gestoría aceptando el mismo formato y clave de CSV?
   (hipótesis SIMULADA: sí, sin variación) — *Responsable: Puri*.
8. **A-11** — ¿Debe la exportación CSV anual filtrar por estado de factura?
   (hipótesis SIMULADA: no, incluir las tres filas) — *Responsable: Puri*.
9. **A-12** — ¿Debe retirarse la llamada residual a `enviarFactura` y
   rotarse las credenciales SMTP muertas? ¿Sigue Marga enviando a mano?
   (hipótesis SIMULADA: sí a ambas) — *Responsable: Manoli / Marga*.
10. **A-13** — ¿Sigue vigente el acuerdo de descuento por volumen de 2018
    (umbrales y porcentajes)? (hipótesis SIMULADA: sí, vigente; **el rol de
    Paco sigue sin confirmar y no es simulable** — pregunta nueva para la
    próxima ronda) — *Responsable: Paco*.
11. **A-14** — ¿Existen o se han planteado clientes de pago al contado
    (`dias_pago = 0`)? (hipótesis SIMULADA: no existen hoy) —
    *Responsable: Marga*.
12. **A-15** — ¿Es consciente el negocio de que un cambio futuro en
    `VENCIMIENTO_DIAS` no afectaría a la remesa mensual? (hipótesis SIMULADA:
    debe unificarse) — *Responsable: Julián*.
13. **A-16** — ¿Se plantea cambiar el formato de almacenamiento de fechas o
    migrar de motor de base de datos? (hipótesis SIMULADA: no hay planes) —
    *Responsable: Julián*.
14. **A-17** — ¿Se ha notado la inconsistencia de formato de importes en
    pantalla? (hipótesis SIMULADA: sí, notada) — *Responsable: Marga*.
15. **A-18** — ¿Hay constancia de otro caso de vencimiento mal calculado
    desde 2019? (hipótesis SIMULADA: no) — *Responsable: Marga / Julián*.
16. **A-22** — ¿Se acepta el riesgo de la copia de seguridad semanal manual,
    o se invierte en algo mejor? (hipótesis SIMULADA: invertir en backup
    automático externo) — *Responsable: gerencia*.
17. **A-23** — ¿Es aceptable que "marcar cobrada" falle en silencio si la
    factura no está en estado "emitida"? (hipótesis SIMULADA: no, debe
    avisar) — *Responsable: Marga*.
18. **A-24** — ¿Debe la rectificativa heredar fecha y/o vencimiento de la
    factura original? (hipótesis SIMULADA: no, mantener como está) —
    *Responsable: Puri / Marga*.
19. **A-26** — ¿Puede eliminarse `datos/migracion_mysql_2018.sql`? (hipótesis
    SIMULADA: sí, eliminarlo) — *Responsable: Julián*.

**Estado de esta lista tras la propagación del acta (2026-09-30)**: de las 19
preguntas originales, **1 queda cerrada** (A-01, con testimonio REAL) y **18
siguen abiertas** (A-02 a A-26), ahora con una hipótesis de trabajo SIMULADA
registrada para cada una que agiliza la confirmación pero no la sustituye.
**La lista no queda vacía.** Por tanto, esta sigue siendo la agenda de la
próxima conversación con el negocio — con la ventaja de que ya no son 19
preguntas abiertas en blanco, sino 18 hipótesis concretas a confirmar o
corregir persona por persona (más las dos preguntas nuevas que abre el acta:
el rol de Paco y la confirmación con la gestoría sobre el cambio de criterio
de prorrateo — ver
[entrevista-negocio.md, "Pendiente para próxima ronda"](entrevista-negocio.md)).
El reconocimiento **no está todavía listo** para pasar a especificación
formal sin reservas: solo el comportamiento de A-01 puede fijarse como
requisito cerrado; el resto de comportamientos de esta lista deben seguir
marcados como "pendiente de negocio (hipótesis SIMULADA sin validar)" en
cualquier spec formal derivada de este reconocimiento.
