# Registro de riesgos y deuda técnica — GesFact 2.4

**Fase**: Caracterización (reconocimiento del sistema tal y como existe hoy).
**Fecha del análisis**: 2026-09-30.
**Método**: lectura completa del código fuente, de `package-lock.json`, del histórico
de `git` de este repositorio y de `npm audit`. Toda fila se apoya en fichero y línea
concreta, o en la salida literal de una herramienta. No se ha consultado a ningún
miembro del negocio para este documento.

> Nota de alcance: siguiendo la Constitución de esta fase, este documento **no
> corrige ni propone soluciones**. Es un inventario de lo que ya está en el sistema
> hoy — riesgos visibles y deuda técnica —, ordenado para ayudar a decidir por dónde
> empezar en una fase posterior. La columna "Probabilidad" estima la posibilidad de
> que el riesgo se materialice (o vuelva a materializarse) en el uso normal del
> sistema tal y como está hoy, no la facilidad de explotación deliberada.

**Criterio de orden**: la tabla está ordenada de mayor a menor combinación
impacto × probabilidad, tratando "Alta" > "Media" > "Baja" en ambos ejes de forma
independiente (p. ej. Alta/Media se coloca por delante de Media/Alta cuando el
impacto es el factor con mayor coste de negocio si el riesgo se materializa).

---

| ID | Descripción | Evidencia | Impacto de negocio | Probabilidad |
|---|---|---|---|---|
| R1 | No existe ninguna capa de autenticación ni autorización delante de la aplicación: cualquier persona con acceso de red al puerto 3000 puede ver clientes, crear facturas, marcarlas como cobradas o rectificarlas. | Búsqueda de `session`/`passport`/middleware de login en todo el repositorio sin resultados; [server.js:14-42](../../server.js#L14-L42) monta todas las rutas de negocio sin ningún middleware previo de control de acceso. | Cualquier persona en la red de la oficina (u otra que alcance el puerto) puede falsificar o alterar facturas legales y ver datos fiscales/personales de clientes. | Alta |
| R2 | La base de datos real de producción (`datos/gesfact.db`, con NIF, direcciones y facturas reales de clientes) y `config.js` (con contraseña SMTP y clave de exportación de la gestoría en texto plano) están comprometidos en `git` desde el primer commit, sin exclusión en `.gitignore`. | `git ls-files` confirma ambos ficheros rastreados; `.gitignore` solo excluye `node_modules/` ([.gitignore:1](../../.gitignore#L1)); commit `e1b0489` ya los incluye; [config.js:29-37](../../config.js#L29-L37) (credenciales); [db.js:91-92](../../db.js#L91-L92) (el propio comentario dice que son datos reales de referencia). | Cualquiera con acceso al repositorio (hoy o en cualquier momento futuro, vía historial) tiene datos personales y fiscales reales de clientes y credenciales válidas, de forma permanente e irrevocable por un simple borrado posterior. | Alta |
| R3 | La numeración legal de facturas (`lib/numeracion.js`) lee el último número y lo actualiza en dos operaciones SQL separadas sin transacción ni bloqueo, y la columna `numero` no tiene restricción `UNIQUE` en el esquema. Ya causó una duplicidad real en enero de 2021. | [lib/numeracion.js:14-36](../../lib/numeracion.js#L14-L36) (SELECT y UPDATE separados); [lib/numeracion.js:8-10](../../lib/numeracion.js#L8-L10) (incidente real documentado por el propio autor); [db.js:50-63](../../db.js#L50-L63) (definición de `facturas` sin `UNIQUE` en `numero`). | Dos facturas con el mismo número es un incumplimiento de la obligación legal de numeración correlativa sin huecos ni duplicados. | Media |
| R4 | Al crear una factura nueva, la cabecera y cada línea se insertan en pasos separados (`INSERT` de cabecera, luego un `INSERT` por línea disparado con `forEach`, sin transacción). El propio comentario admite que una inserción ya falló a mitad y se corrigió a mano en la base de datos. | [routes/facturas.js:74-98](../../routes/facturas.js#L74-L98); comentario explícito en [routes/facturas.js:81-83](../../routes/facturas.js#L81-L83). | Un fallo a mitad de guardado deja una factura con cabecera pero sin todas sus líneas (o con líneas huérfanas), es decir, un documento legal incompleto que hay que detectar y corregir a mano. | Media |
| R5 | La rectificación de una factura (`POST /facturas/:id/rectificar`) encadena tres operaciones —insertar la rectificativa, insertar sus líneas invertidas, y marcar la original como "rectificada"— también sin transacción. | [routes/facturas.js:129-164](../../routes/facturas.js#L129-L164), en particular el `UPDATE` final de estado en [routes/facturas.js:154](../../routes/facturas.js#L154) tras las inserciones de línea. | Un fallo a mitad de este flujo puede dejar una factura rectificativa sin todas sus líneas, o la factura original sin marcar como rectificada mientras ya existe su rectificativa — rompe la trazabilidad legal exigida entre una factura y su rectificación. | Media |
| R6 | El cálculo de prorrateo del último mes de un contrato se hace de dos formas distintas según el camino: `services/calculo.js#calcularProrrateo` divide siempre por 30 días ("a lo comercial"), mientras que `scripts/remesa_mensual.js` divide por los días reales del mes (`util.diasDelMes`). | [services/calculo.js:90-102](../../services/calculo.js#L90-L102) (división fija por 30); [scripts/remesa_mensual.js:47-51](../../scripts/remesa_mensual.js#L47-L51) (división por días reales del mes vía `diasDelMes`). | Un alta o baja a mitad de mes puede facturarse por un importe distinto según si se calculó desde la pantalla de baja de contrato o desde la remesa mensual automática, para el mismo concepto y el mismo cliente — discrepancia visible y sin explicación aparente para quien reciba dos facturas prorrateadas con criterios distintos. | Alta |
| R7 | La única copia de seguridad documentada de la base de datos (el único almacén de todo el negocio) es manual y semanal. | [LEEME.txt:18](../../LEEME.txt#L18): "Marga copia datos/gesfact.db a un pendrive los viernes". | Un fallo de disco o borrado accidental entre dos viernes puede perder hasta una semana de facturación legal irrecuperable, sin ninguna copia automática ni fuera de la oficina. | Baja |
| R8 | La validación de NIF/CIF solo comprueba la longitud (9 caracteres); no valida la letra de control. El propio comentario admite que la calidad del dato depende de que una persona lo revise a simple vista. | [lib/util.js:41-48](../../lib/util.js#L41-L48); uso en [routes/clientes.js:18-20](../../routes/clientes.js#L18-L20) con comentario explícito "la validación 'fuerte' la hace Marga mirándolo :)" ([routes/clientes.js:16](../../routes/clientes.js#L16)). | Un NIF/CIF mal tecleado puede colarse en facturas y en la exportación a la gestoría sin ningún aviso automático, con riesgo de incidencia con la Agencia Tributaria o con la propia gestoría. | Media |
| R9 | `services/email.js` exporta una función llamada `enviarFactura`, invocada en el camino crítico de cada factura nueva, que no envía nada: solo escribe un aviso por consola y siempre llama a su callback como si hubiese tenido éxito. El código de envío real está comentado desde 2022. | [services/email.js:11-29](../../services/email.js#L11-L29); invocación en [routes/facturas.js:93](../../routes/facturas.js#L93). | Cualquier desarrollo futuro que confíe en el nombre de la función (o en que un fallo de envío se notificaría) asumirá que las facturas se están enviando por correo cuando en realidad no ocurre nada; el propio nombre de la función contradice lo que hace. | Media |
| R10 | Las credenciales SMTP en `config.js` (usuario y contraseña en texto plano) corresponden a un servidor que el propio fichero admite que dejó de funcionar en 2022, y la dependencia que las usaba (`nodemailer`) fue desinstalada en 2023 "por dar un aviso de seguridad", pero el bloque de credenciales sigue en el código. | [config.js:27-34](../../config.js#L27-L34); [services/email.js:8](../../services/email.js#L8) (comentario sobre la desinstalación de `nodemailer`). | Una contraseña de correo corporativo real, aunque hoy inactiva, queda expuesta en texto plano (y comprometida en `git`, ver R2) sin ningún beneficio funcional a cambio, incluido el riesgo de que se reutilice esa misma contraseña en otro sitio. | Media |
| R11 | `lib/util.js#sumarDias` suma días a una fecha operando con `getTime()` en hora local; el propio comentario documenta un caso real (marzo de 2019) en el que un vencimiento salió un día antes de lo esperado, atribuido al cambio de hora, sin haberse podido reproducir ni corregir. | [lib/util.js:17-26](../../lib/util.js#L17-L26), comentario explícito en las líneas 18-19. | Una fecha de vencimiento de cobro calculada mal (aunque sea un día) puede alterar plazos de pago o de reclamación frente a un cliente, y el propio equipo admite no tener el bug bajo control. | Baja |
| R12 | La exportación CSV para la gestoría construye cada línea concatenando campos de texto libre (nombre de cliente) con `;` como separador, sin escapar ni comprobar si el propio campo contiene `;`, saltos de línea, o caracteres que Excel interpreta como inicio de fórmula (`=`, `+`, `-`, `@`). | [routes/informes.js:34-51](../../routes/informes.js#L34-L51), en particular el `join(';')` de la línea 45 sobre datos como `f.nombre` que provienen de `clientes.nombre`, un campo de texto libre sin restricción de caracteres en [routes/clientes.js:21-30](../../routes/clientes.js#L21-L30). | Un nombre de cliente con un `;` desplaza silenciosamente las columnas del fichero que recibe la gestoría (base/IVA/total mal emparejados), o si se abre en Excel, un nombre que empiece por `=` puede ejecutarse como fórmula. | Baja |
| R13 | Las cantidades y precios del formulario de nueva factura se convierten con `parseFloat` tras sustituir la coma por punto, sin comprobar `NaN`, negativos, ni límites, antes de calcular y grabar la factura. | [routes/facturas.js:59-63](../../routes/facturas.js#L59-L63) (parseo), sin ninguna comprobación posterior antes de [routes/facturas.js:66](../../routes/facturas.js#L66) (`calcularFactura`) ni de la inserción en BD. | Un valor no numérico o mal formateado en el formulario puede propagar `NaN` a la base, cuota de IVA y total de una factura legal ya grabada, sin ningún aviso — combinado con R1 (sin autenticación), cualquiera con acceso a la red puede provocarlo. | Baja |
| R14 | `npm audit` señala vulnerabilidades de severidad crítica y alta en la cadena de dependencias de compilación nativa de `sqlite3@5.1.7` (paquete `tar`: sobrescritura arbitraria de ficheros vía hardlink; `node-gyp`, `make-fetch-happen`, `cacache` dependientes de ese `tar`). | Salida de `npm audit --json` ejecutada en este análisis: `tar` (crítica, GHSA-34x7-hfp2-rc4v), `node-gyp`/`make-fetch-happen`/`cacache` (altas), todas con `fixAvailable` apuntando a `sqlite3@6.0.1` (cambio de versión mayor); declarado en [package.json:15](../../package.json#L15). | Estas vulnerabilidades solo se activan durante `npm install` / recompilación del módulo nativo (p. ej. al preparar "un ordenador nuevo de oficina", según [LEEME.txt:5-7](../../LEEME.txt#L5-L7)), no en la ejecución normal de la aplicación ya instalada — impacto acotado a ese momento puntual. | Baja |
| R15 | El redondeo monetario (`lib/util.js#redondear2`) usa `Math.round(x*100)/100`, sujeto al error clásico de representación binaria de coma flotante en valores frontera (p. ej. un importe que matemáticamente acaba en `,xx5` puede redondear hacia abajo en vez de hacia arriba por cómo se representa internamente el número). El propio `services/calculo.js` prohíbe explícitamente tocar esta forma de redondear. | [lib/util.js:5-7](../../lib/util.js#L5-L7); prohibición explícita en [services/calculo.js:1-7](../../services/calculo.js#L1-L7) tras el incidente de 2019 con la gestoría. | Un desajuste de un céntimo en un caso frontera concreto, de baja frecuencia pero posible en cualquier factura cuyo importe caiga exactamente en ese límite de redondeo. | Baja |
| R16 | Código y artefactos muertos mantenidos "por si acaso": tipos de IVA históricos (16/18/7/8) en `recargoPara` sin ninguna referencia en el resto del código actual, y el fichero `datos/migracion_mysql_2018.sql`, que se autodescribe como "NUNCA SE LLEGÓ A EJECUTAR EN PRODUCCIÓN" con un esquema desfasado. | [services/calculo.js:16-21](../../services/calculo.js#L16-L21) frente a [routes/articulos.js:17](../../routes/articulos.js#L17) (solo 21/10/4 en uso real); [datos/migracion_mysql_2018.sql:1-3](../../datos/migracion_mysql_2018.sql#L1-L3). | Bajo por sí solo (no se ejecuta ni se referencia), pero es ruido que puede inducir a error o a reutilizarse sin darse cuenta de que está desfasado si alguien lo retoma sin contexto. | Baja |

---

## Actualización tras acta de entrevista de negocio (2026-09-30)

Ya existe [entrevista-negocio.md](entrevista-negocio.md). Sin modificar la
tabla original, se deja constancia de lo que aporta a estos riesgos. De sus
19 preguntas, solo la 1 (y la primera mitad de la 2) tienen respuesta
**REAL**; el resto son **SIMULADAS** (el consultor respondiendo en el papel
de negocio) y no deben tratarse como decisión real ni como cierre de un
riesgo — se registran como hipótesis de trabajo pendientes de confirmar.

- **R1 (ausencia de autenticación)**: acta, pregunta 2 (primera parte),
  respondida por gerencia — **REAL**: el acceso al puerto 3000 está hoy
  limitado a la red de la oficina; no consta acceso desde fuera. Esto es un
  hecho nuevo confirmado, no documentado hasta ahora (antes solo se sabía que
  no había autenticación, no si el perímetro de red mitigaba el riesgo). La
  probabilidad de explotación por parte de alguien ajeno a la oficina baja en
  la práctica actual, aunque la tabla mantiene "Alta" porque sigue siendo
  cierto que cualquiera dentro de esa red, sin excepción, puede operar sin
  ningún control. La repregunta de la misma pregunta 2 (¿se exige
  autenticación en la modernización?) tiene respuesta **SIMULADA**: sí,
  exigirla — hipótesis pendiente de confirmar con gerencia real antes de
  fijarla como requisito.
- **R6 (dos fórmulas de prorrateo)**: acta, pregunta 1, respondida por
  Puri/Marga — **REAL**: el criterio correcto de aquí en adelante es días
  reales del mes. Esto no reduce el riesgo ya materializado en el pasado (las
  facturas ya emitidas con cada fórmula no se recalculan), pero fija cuál de
  las dos implementaciones debe quedar como la única al modernizar, cerrando
  la ambigüedad de origen de este riesgo.
- **R7 (copia de seguridad única, manual y semanal)**: acta, pregunta 16,
  respondida en el papel de gerencia — **SIMULADA**: invertir en copia
  automática y externa. Hipótesis de trabajo registrada, pendiente de
  confirmación real de gerencia; no se cierra el riesgo con esta sola
  respuesta.
- **R8 (validación de NIF sin dígito de control)**: acta, pregunta 5,
  respondida en el papel de Marga — **SIMULADA**: añadir la comprobación
  automática. Hipótesis registrada, pendiente de confirmación real.

El resto de riesgos de esta tabla (R2 a R5, R9 a R16) no fueron objeto de
ninguna pregunta directa en esta acta; siguen tal cual estaban documentados.

---

## Notas de cobertura

- Este registro se apoya en los mismos ficheros ya inventariados en
  [mapa-sistema.md](mapa-sistema.md) y [flujo-factura.md](flujo-factura.md); varias
  filas de esta tabla amplían observaciones ya registradas allí en la sección
  "Zonas oscuras", añadiendo aquí una estimación explícita de impacto y probabilidad
  que aquellos documentos, centrados en describir, no incluían.
- No se ha ejecutado ningún escáner de seguridad más allá de `npm audit` (no hay, por
  ejemplo, análisis estático de código ni pruebas de penetración) — este registro
  cubre lo que es **visible** leyendo el código y el histórico de `git`, no un
  análisis de seguridad exhaustivo.
- Como en los documentos anteriores de esta fase, no se ha corregido ni se propone
  corregir nada de lo anterior.
