# Memoria histórica — GesFact 2.4

**Fase**: Caracterización (reconocimiento del sistema tal y como existe hoy).
**Fecha del análisis**: 2026-09-30.
**Método**: lectura completa de todos los comentarios del código fuente (rutas,
`lib/`, `services/`, scripts, vistas, ficheros de configuración y de datos) y de
`LEEME.txt`, buscando cualquier mención a un incidente, una decisión de negocio
atribuida a una persona, una advertencia de "no tocar" o un trabajo dejado a
medias. No se ha consultado a ningún miembro del negocio para este documento:
toda entrada se apoya en una cita literal de un comentario existente, con
fichero y línea. El histórico de `git` de este repositorio no aporta fechas
adicionales: el repositorio se inició con una única "foto inicial" del sistema
(commit `e1b0489`), así que todas las fechas de este documento proceden de los
propios comentarios, no de `git log`/`git blame`.

> Nota de alcance: siguiendo la Constitución de esta fase, este documento **no
> corrige ni propone soluciones**, ni juzga si una decisión pasada fue acertada.
> Es un inventario de lo que el propio código cuenta sobre su historia. Donde el
> comentario no da fecha exacta, se indica "sin fecha precisa" o una
> aproximación entre comillas, y cualquier interpretación que vaya más allá de
> la cita literal se marca explícitamente como **SUPOSICIÓN**.

---

## Cronología

### H1 — ~2017: reescritura completa del sistema anterior (Access) en Node
**Qué pasó**: GesFact 1.x funcionaba sobre Access; en 2017 se reescribió como la
aplicación Node/Express/EJS actual (v2.0). Parte de las funciones de utilidad
actuales ya vienen de aquella época y se marcan como sensibles.
**Implicados**: Julián (autor del comentario y, según `package.json`, autor del
proyecto).
**Evidencia**: [server.js:7](../../server.js#L7) ("v2.0 (2017): reescritura del
gesfact 1.x (Access) en node"); [lib/util.js:1-2](../../lib/util.js#L1-L2)
("algunas vienen del gesfact 1.x en Access, cuidado al tocar");
[package.json:9](../../package.json#L9) (`"author": "Julian"`).
**Pregunta para negocio**: ¿qué funciones concretas de `lib/util.js` vienen de
Access y qué comportamiento heredado de esa época no debe cambiar sin
verificarlo antes con alguien que conociera el sistema original?

---

### H2 — 11/2017: la validación de NIF se deja deliberadamente incompleta
**Qué pasó**: se documenta como pendiente comprobar la letra de control del
NIF/CIF; se decide dejar solo la comprobación de longitud porque el alta de
clientes la hace Marga y ella revisa el dato a simple vista.
**Implicados**: Julián (autor del comentario), Marga (responsable de la
revisión visual).
**Evidencia**: [lib/util.js:41-43](../../lib/util.js#L41-L43); reforzado en
[routes/clientes.js:16](../../routes/clientes.js#L16) ("la validacion 'fuerte'
la hace Marga mirandolo :)").
**Pregunta para negocio**: han pasado más de ocho años desde esa decisión
provisional — ¿sigue siendo Marga (u otra persona) quien revisa cada NIF a
mano hoy, y sigue siendo aceptable ese nivel de control?

---

### H3 — 03/2018: corrupción de datos por escritura simultánea → migración a sqlite
**Qué pasó**: el almacén de datos original en ficheros `.json` se corrompía
cuando Julián y Marga grababan a la vez. Se migra a sqlite para resolverlo.
**Implicados**: Julián, Marga.
**Evidencia**: [db.js:1-4](../../db.js#L1-L4); confirmado en
[server.js:6](../../server.js#L6) ("v2.2 (2018): paso de json a sqlite").
**Pregunta para negocio**: sqlite reduce pero no elimina el riesgo de
concurrencia (ver los hallazgos de condición de carrera más abajo, H14 y U4)
— ¿se considera resuelto el problema de fondo de 2018, o solo desplazado?

---

### H4 — 2018 (sin mes preciso): migración a MySQL queda pendiente, sin prisa
**Qué pasó**: se planteó migrar la base de datos a MySQL en un servidor nuevo;
la migración no se completó y se deja constancia expresa de que "no hay
prisa" porque sqlite va bien.
**Implicados**: Julián.
**Evidencia**: [db.js:3-4](../../db.js#L3-L4); [config.js:19](../../config.js#L19);
[LEEME.txt:11-13](../../LEEME.txt#L11-L13) ("Migrar la base de datos a MySQL del
servidor nuevo... SIN PRISA, sqlite va bien").
**Pregunta para negocio**: ¿sigue en pie el plan de tener un "servidor nuevo"
con MySQL, o se abandonó definitivamente y sqlite es hoy la decisión final?
**Trabajo abandonado**: sí — ver también H7 (el volcado de prueba asociado).

---

### H5 — 2018: descuento por volumen acordado con Paco
**Qué pasó**: se acuerda un descuento por volumen sobre la base de la factura
(2% a partir de 1.000 €, 5% a partir de 5.000 €) "para fidelizar hostelería".
**Implicados**: Paco.
**Evidencia**: [services/calculo.js:36-38](../../services/calculo.js#L36-L38).
**Pregunta para negocio**: **SUPOSICIÓN** — no hay en el código ningún dato
sobre quién es Paco (¿responsable comercial?, ¿gerencia?, ¿un cliente?); se
desconoce también si este acuerdo de 2018 sigue vigente hoy o si los umbrales
(1.000 €/5.000 €) y porcentajes (2%/5%) deberían revisarse. Conviene
confirmar con el negocio quién es Paco y si el acuerdo sigue activo.

---

### H6 — 2018: el descuento debe verse desglosado línea a línea, a petición de Puri
**Qué pasó**: se decide aplicar el descuento por volumen línea a línea (en vez
de como un concepto aparte) para que la gestoría lo vea desglosado así.
**Implicados**: Puri (gestoría).
**Evidencia**: [services/calculo.js:63-64](../../services/calculo.js#L63-L64).
**Pregunta para negocio**: ¿sigue siendo Puri (o la misma gestoría) quien
recibe y procesa esta información, y sigue necesitando el desglose en este
formato concreto?

---

### H7 — 10/2018: intento de migración a MySQL, nunca ejecutado en producción
**Qué pasó**: se genera un volcado de prueba para la migración a MySQL
planteada en H4. El propio fichero declara que nunca llegó a ejecutarse en
producción y que su esquema está desfasado (le faltan recargo de equivalencia
y rectificativas).
**Implicados**: Julián.
**Evidencia**: [datos/migracion_mysql_2018.sql:1-3](../../datos/migracion_mysql_2018.sql#L1-L3).
**Pregunta para negocio**: ¿puede eliminarse este fichero sin más (dado que
el propio comentario dice "se guarda por si acaso"), o hay algún motivo para
conservarlo que no conste en el código?
**Trabajo abandonado**: sí.

---

### H8 — 2019: se añaden los informes de IVA y la exportación a la gestoría
**Qué pasó**: la versión 2.3 incorpora el resumen de IVA por trimestre y la
exportación CSV para la gestoría.
**Implicados**: sin nombre concreto en el comentario de versión (ver H12 para
el acuerdo de formato con Puri, que es parte de este mismo desarrollo).
**Evidencia**: [server.js:5](../../server.js#L5) ("v2.3 (2019): informes de
iva y export gestoria").
**Pregunta para negocio**: ninguna pendiente específica de este hito; queda
recogido aquí solo como referencia temporal para H10-H12.

---

### H9 — ~11/03/2019: LEEME.txt se congela como última actualización
**Qué pasó**: Julián fecha su propia última actualización de `LEEME.txt` como
"aprox." el 11/03/2019. El código ha seguido evolucionando desde entonces
(hasta la v2.4 de 2021, ver H18) sin que este fichero se haya vuelto a
actualizar.
**Implicados**: Julián.
**Evidencia**: [LEEME.txt:20](../../LEEME.txt#L20).
**Pregunta para negocio**: ¿existe alguna otra documentación operativa más
reciente que `LEEME.txt` (procedimientos, notas internas), o es este fichero
desactualizado la única referencia escrita de cómo operar el sistema?

---

### H10 — 03/2019: incidente sin resolver en el cálculo de vencimientos
**Qué pasó**: el vencimiento de una factura salió calculado un día antes de lo
esperado; se sospecha del cambio de hora (horario de verano), pero el propio
autor no ha conseguido reproducir el fallo ni confirmarlo.
**Implicados**: Julián (autor del comentario; no se nombra a quién afectó la
factura).
**Evidencia**: [lib/util.js:17-19](../../lib/util.js#L17-L19).
**Pregunta para negocio**: ¿hay constancia, en algún caso posterior a 2019, de
otra factura con un vencimiento calculado incorrectamente? Ayudaría a acotar
si el bug sigue latente o si fue un caso aislado.

---

### H11 — 05/2019: incidente grave de redondeo — la gestoría devuelve todo el trimestre
**Qué pasó**: se cambió la forma de redondear las facturas (de línea a línea a
sobre la base total); Puri, de la gestoría, devolvió la declaración de todo el
trimestre porque no cuadraba con su programa de contabilidad (Contaplus). Se
revirtió el cambio y se dejó una advertencia expresa de no volver a tocarlo.
**Implicados**: Julián (autor del cambio revertido), Puri (gestoría, quien
detectó y rechazó el descuadre).
**Evidencia**: [services/calculo.js:1-7](../../services/calculo.js#L1-L7)
("AVISO (Julian, mayo 2019): NO CAMBIAR LA FORMA DE REDONDEAR... Puri
(gestoria) devolvio todo el trimestre. Se queda como esta.").
**Pregunta para negocio**: este comportamiento de redondeo lleva congelado
desde 2019 explícitamente por miedo a repetir el incidente — ¿sigue Puri (o
la gestoría actual) usando el mismo programa de contabilidad con la misma
exigencia de redondeo línea a línea, o ha cambiado de herramienta desde
entonces?
**Advertencia "no tocar"**: sí, la más explícita y mejor documentada de todo
el sistema.

---

### H12 — 2019: formato de exportación CSV acordado con Puri
**Qué pasó**: se fija el formato del fichero CSV de exportación a la gestoría
(separador punto y coma, decimales con coma, clave en la primera línea) como
acuerdo puntual con Puri.
**Implicados**: Puri (gestoría).
**Evidencia**: [routes/informes.js:32-33](../../routes/informes.js#L32-L33).
**Pregunta para negocio**: ¿sigue la gestoría aceptando exactamente este
formato hoy, o ha cambiado de programa/requisitos desde 2019? (Como ya
señala el registro de riesgos, este formato no está validado en ningún otro
sitio del código, así que un cambio de requisito rompería la integración en
silencio.)

---

### H13 — 2020: tras una inspección, las facturas dejan de borrarse nunca
**Qué pasó**: a raíz de una inspección (no se especifica de qué organismo), se
establece que las facturas no se borran nunca; cualquier corrección se hace
mediante una factura rectificativa en la serie `RE`.
**Implicados**: sin nombre concreto (se menciona "la inspección de 2020", sin
atribuir a una persona del negocio).
**Evidencia**: [lib/numeracion.js:3-6](../../lib/numeracion.js#L3-L6).
**Pregunta para negocio**: **SUPOSICIÓN** — no consta en el código qué
organismo o auditoría hizo esta inspección en 2020 (¿Agencia Tributaria?,
¿auditoría interna?, ¿la propia gestoría?); conviene confirmarlo porque
condiciona qué tan estricta debe ser esta regla y a quién rendir cuentas si
se incumple.

---

### H14 — 02/01/2021: dos facturas emitidas con el mismo número
**Qué pasó**: el 2 de enero de 2021 salieron dos facturas con idéntico número
porque Marga y Julián grabaron a la vez (condición de carrera). Se "arregló"
leyendo el último número justo antes de grabar; el propio autor admite que
"no ha vuelto a pasar (creo)", sin garantía estructural de que no pueda
repetirse.
**Implicados**: Julián, Marga.
**Evidencia**: [lib/numeracion.js:8-10](../../lib/numeracion.js#L8-L10).
**Pregunta para negocio**: ¿hay constancia de que este incidente (u otro de
numeración duplicada) haya vuelto a ocurrir desde 2021? Es relevante porque
el propio código (ver `registro-riesgos.md`, R3) sigue sin una protección
estructural contra la misma condición de carrera.

---

### H15 — verano 2021: Roberto (becario) automatiza la remesa mensual de cuotas
**Qué pasó**: Roberto, descrito como becario, crea `scripts/remesa_mensual.js`
para generar automáticamente las facturas de los contratos de cuota activos
cada mes, en vez de darlas de alta una a una a mano.
**Implicados**: Roberto.
**Evidencia**: [scripts/remesa_mensual.js:1-7](../../scripts/remesa_mensual.js#L1-L7).
**Pregunta para negocio**: ¿sigue Roberto vinculado al proyecto o a la
empresa hoy? Sería la persona con más contexto directo sobre cómo se pensó
y probó este script cuando se hizo.

---

### H16 — 2021: autorrelleno de artículos en el formulario de nueva factura
**Qué pasó**: Roberto añade el autorrelleno de precio e IVA al elegir un
artículo del desplegable en el formulario de nueva factura; antes se copiaba
a mano del listado de artículos.
**Implicados**: Roberto.
**Evidencia**: [public/js/factura.js:1-2](../../public/js/factura.js#L1-L2).
**Pregunta para negocio**: ninguna específica; se documenta como contexto de
autoría junto a H15, H17 y H18 (mismo periodo, mismo autor).

---

### H17 — 2021: Roberto retoca la hoja de estilos
**Qué pasó**: la hoja de estilos, originalmente de Julián (2017), es
retocada por Roberto en 2021.
**Implicados**: Julián (autor original), Roberto (retoque de 2021).
**Evidencia**: [public/css/estilos.css:1](../../public/css/estilos.css#L1).
**Pregunta para negocio**: ninguna específica; cambio puramente estético sin
impacto de negocio documentado.

---

### H18 — 2021: la remesa de Roberto se incorpora formalmente como v2.4
**Qué pasó**: la versión 2.4 (la que está en producción según este
repositorio) incorpora oficialmente el script de remesas creado por Roberto.
**Implicados**: Roberto.
**Evidencia**: [server.js:4](../../server.js#L4) ("v2.4 (2021): añadido el
script de remesas de Roberto").
**Pregunta para negocio**: ninguna específica; hito de versión que enlaza
H15-H17.

---

### H19 — 2021: módulo de albaranes de Roberto, a medias y fuera del repositorio
**Qué pasó**: Roberto empezó un módulo de albaranes en 2021; según
`LEEME.txt`, se quedó a medias en su ordenador personal, con la nota de
"preguntarle si vuelve en campaña".
**Implicados**: Roberto.
**Evidencia**: [LEEME.txt:15-16](../../LEEME.txt#L15-L16).
**Pregunta para negocio**: han pasado varios años desde entonces — ¿sigue
Roberto localizable?, ¿se sabe si ese trabajo se perdió, se retomó en otro
sitio, o sigue existiendo en algún ordenador? No hay ningún rastro de este
módulo en el código de este repositorio (ni tabla, ni ruta, ni vista).
**Trabajo abandonado**: sí, y es el único de los documentados aquí que no
deja ningún rastro dentro de este repositorio — toda la evidencia disponible
es la mención en `LEEME.txt`.

---

### H20 — 2022: se rompe el envío de facturas por correo (Arsys) y pasa a ser manual
**Qué pasó**: Arsys cambió su servidor de correo y dejó de aceptar la
autenticación que usaba GesFact. Desde entonces, las facturas se envían a
mano desde el Outlook personal de Marga (imprimiendo la vista de factura a
PDF desde el navegador). Se deja una advertencia expresa de hablar con
Manoli antes de reactivar el envío automático.
**Implicados**: Marga (envío manual actual), Manoli (persona a consultar
antes de tocar esto).
**Evidencia**: [services/email.js:1-6](../../services/email.js#L1-L6);
reforzado en [config.js:27-28](../../config.js#L27-L28) ("DEJO DE FUNCIONAR en
2022 (Arsys), hablar con Manoli antes de tocar nada de esto").
**Pregunta para negocio**: **SUPOSICIÓN** — no consta en el código qué rol
tiene Manoli (¿responsable de sistemas?, ¿gerencia?, ¿contacto con Arsys?);
conviene identificarla/o antes de plantear reactivar el envío de correo,
como pide el propio comentario. También sigue abierta la pregunta de si
sigue siendo Marga quien envía las facturas a mano hoy.
**Advertencia "no tocar"**: sí — no reactivar el envío sin hablar antes con
Manoli.
**Trabajo abandonado / pendiente**: sí — confirmado también en
[LEEME.txt:14](../../LEEME.txt#L14) ("Arreglar el envio de facturas por email
(roto desde lo de Arsys 2022)"), todavía sin resolver a fecha de este
análisis.

---

### H21 — 2023: se desinstala `nodemailer` por un aviso de seguridad
**Qué pasó**: la dependencia `nodemailer`, que quedó sin uso real tras el
incidente de 2022 (H20), se desinstala en 2023 porque generaba un aviso de
seguridad. El código de envío que la usaba se queda comentado en
`services/email.js`, sin borrar.
**Implicados**: sin nombre concreto en el comentario.
**Evidencia**: [services/email.js:8](../../services/email.js#L8) ("desinstalado
en 2023, daba un aviso de seguridad").
**Pregunta para negocio**: ¿quién tomó esta decisión y con qué criterio de
seguridad? No consta si fue una decisión técnica unilateral o si se avisó a
Manoli, dado el aviso de H20 de no tocar nada de esto sin hablar con ella/él
antes.

---

### H22 — 30/09/2026: primera entrevista de negocio real (parcial): se fija el criterio de prorrateo en días reales

**Qué pasó**: a diferencia de las entradas anteriores de esta cronología
(todas reconstruidas a partir de comentarios del código), esta entrada
procede de una entrevista de negocio real —
[entrevista-negocio.md](entrevista-negocio.md), preguntas 1 y 2 (primera
parte)— que sí tuvo lugar en esta sesión, no de una cita de código. Dos
hechos quedan confirmados directamente por negocio, no por simulación:
1. El criterio de prorrateo de baja/alta a mitad de mes que debe regir de
   aquí en adelante es el de **días reales del mes** (el mismo que ya usa la
   remesa automática desde 2021, no el mes comercial de 30 días heredado del
   Access). Esta decisión **contradice** el testimonio histórico citado en
   H1/H5 y en [services/calculo.js:92-94](../../services/calculo.js#L92-L94)
   ("Asi lo hacia Paco a mano en el Access y asi lo espera la gestoria"), que
   hasta esta fecha era el único testimonio de negocio documentado a favor de
   la fórmula contraria. No se borra ni se reescribe esa cita histórica: se
   deja constancia de que ha quedado superada por una decisión posterior y
   real, sin confirmar todavía si la propia gestoría comparte el cambio de
   criterio.
2. El acceso a la aplicación (puerto 3000, ver H-implícito en A-02 del
   registro de anomalías) está hoy limitado a la red interna de la oficina;
   no hay acceso confirmado desde fuera.
**Implicados**: Puri, Marga (pregunta 1); gerencia (pregunta 2, primera
parte).
**Evidencia**: [entrevista-negocio.md, preguntas 1 y 2](entrevista-negocio.md).
**Pregunta para negocio**: dado que esta decisión contradice el testimonio
histórico de Paco/gestoría, ¿comparte la propia gestoría (Puri) el cambio de
criterio, o su expectativa seguía siendo la del mes comercial de 30 días?
Debe confirmarse directamente antes de dar el cambio por definitivo en las
specs formales.

> **Nota metodológica**: esta entrada rompe, de forma deliberada y señalada,
> el método declarado al inicio de este documento (solo comentarios de
> código). Se incorpora porque el encargo de propagar la primera entrevista
> de negocio exige registrar aquí lo que el negocio revele y no estuviera ya
> documentado; el resto de la cronología (H1-H21) sigue siendo, exclusivamente,
> reconstrucción a partir de comentarios de código.

---

## Advertencias de "no tocar" sin fecha asociada

Estas advertencias están presentes en el código pero el comentario no indica
cuándo se introdujeron ni a raíz de qué evento concreto; se listan aparte para
no forzarles una fecha que no consta.

| Advertencia | Motivo declarado | Implicados | Evidencia |
|---|---|---|---|
| No renombrar `config.js` | El fichero se copia a mano al servidor de la oficina (`\\SERVIDOR\gesfact`) cuando se cambia algo; un cambio de nombre rompería ese proceso manual de despliegue. | Sin nombre concreto. | [config.js:2-3](../../config.js#L2-L3) |
| No tocar los datos de carga inicial en `db.js` | Administración los usa como referencia. | Sin nombre concreto. | [db.js:91-92](../../db.js#L91-L92) |
| No cambiar `CLAVE_EXPORT_GESTORIA` | Es la clave que exige la gestoría para aceptar el fichero de exportación. | Gestoría (sin nombre de persona). | [config.js:36](../../config.js#L36) |
| No tocar la rectificación para que "recalcule" nada | La rectificativa tiene que ser un espejo exacto de la original, por decisión expresa de la gestoría. | Puri (gestoría) — cita literal "Puri dixit". | [routes/facturas.js:124-128](../../routes/facturas.js#L124-L128) |
| No borrar los tipos de IVA antiguos (16/18/7/8) de `recargoPara` | Se conservan por si hay que reabrir ejercicios viejos del Access. | Sin nombre concreto. | [services/calculo.js:16-18](../../services/calculo.js#L16-L18) |

**Pregunta para negocio (común a las cinco)**: ¿siguen vigentes estas cinco
restricciones hoy? En particular, si el despliegue a producción ya no se hace
copiando `config.js` a mano, la primera advertencia podría estar obsoleta sin
que nadie lo haya confirmado por escrito.

---

## Otras decisiones y episodios sin fecha determinada

- **Caso pactado con la gestoría sobre el umbral de descuento**: un comentario
  junto a datos de referencia deja constancia de un caso ya hablado con la
  gestoría — una factura con base exactamente 1.000 € no lleva descuento por
  volumen (el umbral de H5 es estrictamente "a partir de", no "desde").
  Implicados: gestoría (sin nombre de persona). Evidencia:
  [db.js:138](../../db.js#L138). Pregunta para negocio: ¿hay más casos frontera
  de este tipo ya hablados con la gestoría que no estén documentados en
  ningún sitio del código?
- **Inserción de líneas de factura fallida a mitad, corregida a mano**: el
  propio código reconoce que, en algún momento no fechado, falló una
  inserción de líneas a mitad de una factura nueva y "se apañó a mano en la
  bd". Implicados: sin nombre concreto. Evidencia:
  [routes/facturas.js:81-83](../../routes/facturas.js#L81-L83). Pregunta para
  negocio: ¿se sabe cuándo ocurrió y qué factura concreta se vio afectada?
  Ayudaría a valorar la frecuencia real de este riesgo (ver también
  `registro-riesgos.md`, R4).
- **Deuda reconocida y pospuesta indefinidamente sobre el tamaño de
  `routes/facturas.js`**: el propio autor admite que el fichero se ha ido
  haciendo grande y que "algún día" habría que partirlo, entre comillas,
  dando a entender que no espera que ocurra pronto. Implicados: Julián.
  Evidencia: [routes/facturas.js:1-3](../../routes/facturas.js#L1-L3). Pregunta
  para negocio: fuera del alcance de esta fase decidir si se divide o no
  (Principio IV de la constitución de esta fase prohíbe refactors), pero es
  una señal a tener en cuenta para una fase posterior.

---

## Personas mencionadas en los comentarios

Tabla-resumen solo a efectos de referencia rápida; el detalle y la cita
concreta de cada aparición está en la cronología de arriba.

| Persona | Papel que se le atribuye en los comentarios | Primera mención (evidencia) |
|---|---|---|
| Julián | Autor original del sistema (`package.json:9`); contacto de soporte de uso interno hoy, según el pie de página de la aplicación. | [server.js:7](../../server.js#L7); [views/pie.ejs:2](../../views/pie.ejs#L2) ("ante cualquier problema llamar a Julián, ext. 22") |
| Marga | Da de alta y revisa clientes a simple vista; graba facturas; hace la copia de seguridad semanal a pendrive; envía facturas a mano por correo desde 2022; lanza la remesa mensual desde su ordenador. | [routes/clientes.js:16](../../routes/clientes.js#L16) |
| Puri | Contacto en la gestoría; acordó el desglose del descuento (H6), devolvió el trimestre por el redondeo (H11), acordó el formato CSV (H12), y exige que la rectificativa sea un espejo exacto (tabla de "no tocar"). | [services/calculo.js:6](../../services/calculo.js#L6) |
| Paco | Acordó el descuento por volumen en 2018 (H5); "así lo hacía Paco a mano en el Access", lo que sugiere que calculaba prorrateos manualmente antes de la reescritura de 2017 (H1). **SUPOSICIÓN**: no consta su rol exacto en la empresa. | [services/calculo.js:38](../../services/calculo.js#L38) y [services/calculo.js:92](../../services/calculo.js#L92) |
| Roberto | Becario en 2021; autor de la remesa mensual automática, del autorrelleno de artículos y de retoques de estilo; dejó a medias un módulo de albaranes. | [scripts/remesa_mensual.js:6](../../scripts/remesa_mensual.js#L6) |
| Manoli | Persona a consultar antes de tocar nada del envío de correo/SMTP. **SUPOSICIÓN**: no consta su rol exacto en la empresa. | [services/email.js:6](../../services/email.js#L6) |

---

## Notas de cobertura

- Esta cronología se apoya en los mismos ficheros ya inventariados en
  [mapa-sistema.md](mapa-sistema.md), [flujo-factura.md](flujo-factura.md) y
  [registro-riesgos.md](registro-riesgos.md); varias entradas de aquí amplían
  con su dimensión temporal y humana observaciones que aquellos documentos ya
  registraban desde el punto de vista técnico (en particular H11≈R15, H14≈R3,
  U4≈R4, H20-H21≈R9/R10).
- Se ha recorrido todo el repositorio en busca de comentarios (`// `, `/* */`,
  `-- `) en todos los ficheros `.js`, `.sql`, `.txt` y `.json`, y de
  comentarios EJS (`<%# %>`) en todas las vistas; estas últimas no contienen
  ninguno.
- No se ha encontrado ningún comentario adicional con fecha o nombre propio
  fuera de los recogidos aquí. Cualquier persona, fecha o decisión que el
  negocio conozca pero que no esté escrita en el código queda, por definición,
  fuera del alcance de este documento — es precisamente el tipo de
  información que las preguntas planteadas arriba buscan recuperar.
- Como en los documentos anteriores de esta fase, no se ha corregido ni se
  propone corregir nada de lo anterior.
