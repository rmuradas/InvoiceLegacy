# Acta de entrevista de negocio (SIMULADA) — GesFact 2.4

**Fase**: Caracterización (reconocimiento del sistema tal y como existe hoy).
**Fecha**: 2026-09-30.
**Naturaleza de este documento**: **SIMULACIÓN**, no una entrevista real. Solo
la **pregunta 1 y la primera parte de la pregunta 2** fueron respondidas por
una persona real haciendo de negocio en esta sesión. El resto (de la segunda
parte de la pregunta 2 a la pregunta 19) fue respondido por el consultor
(Claude) poniéndose en el papel de cada persona de negocio, a petición
explícita de quien conducía la sesión ("responde todas las preguntas
asumiendo el papel de negocio, dando la respuesta más lógica"), para poder
completar el ejercicio sin depender de disponibilidad real de Puri, Marga,
Julián, Paco, Manoli o gerencia.

> **Aviso de trazabilidad**: las respuestas marcadas como **[SIMULADA]** no
> deben tratarse como decisión de negocio real ni usarse para cerrar
> definitivamente ninguna especificación formal. Son la respuesta más
> plausible dado el contexto ya documentado en
> [reglas-de-negocio.md](reglas-de-negocio.md),
> [registro-de-anomalias.md](registro-de-anomalias.md) y
> [memoria-historica.md](memoria-historica.md), pero **deben validarse con la
> persona real** antes de fijarse como requisito. Las respuestas marcadas
> como **[REAL]** sí provienen de la persona que respondió en esta sesión en
> el papel de negocio correspondiente.

**Método**: 19 preguntas decidibles, extraídas de las clasificaciones
PENDIENTES/DUDOSAS de `registro-de-anomalias.md`, las contradicciones
documentadas y las preguntas abiertas de `memoria-historica.md`, ordenadas de
mayor a menor impacto económico (mismo orden que la "Lista de clasificaciones
PENDIENTES" del registro de anomalías). Cada pregunta se formuló con contexto
en lenguaje no técnico, un ejemplo con datos reales, y respuesta por sí/no o
elección entre opciones, sin sugerir la respuesta.

---

## Preguntas y respuestas

### 1. [A-01] Prorrateo de baja de contrato a mitad de mes — dirigida a Puri/Marga

**Contexto dado**: la baja de un contrato a mitad de mes se cobra distinto
según quién lo calcule — 45,00 € a mano (mes comercial de 30 días) o 48,21 €
por la remesa automática (días reales), para el mismo contrato de 90,00 €/mes
dado de baja el 15 de febrero de 2026.

**Pregunta**: ¿mes comercial de 30 días o días reales del mes?

**Respuesta [REAL]**: **días reales del mes**.

**Decisión**: A partir de ahora, el prorrateo correcto es el de días reales
del mes (el mismo criterio que ya usa la remesa automática de Roberto desde
2021), no el mes comercial de 30 días que usaba la pantalla manual desde la
época de Paco.

**Información nueva no preguntada directamente**: esta decisión **contradice
el testimonio histórico** citado en `services/calculo.js` ("Asi lo hacia Paco
a mano en el Access y asi lo espera la gestoria"), que hasta ahora era el
único testimonio de negocio a favor de una de las dos fórmulas. Queda
constancia de que ese testimonio histórico ya no representa el criterio
vigente, salvo que se confirme lo contrario directamente con la gestoría.

**Precaución ya documentada que sigue aplicando**: la corrección debe
aplicarse solo hacia adelante; no se recalculan retroactivamente los importes
ya facturados por la remesa desde 2021.

---

### 2. [A-02] Ausencia de autenticación — dirigida a gerencia

**Contexto dado**: cualquier persona con acceso a la red del puerto 3000
puede entrar sin usuario ni contraseña y hacer cualquier operación.

**Pregunta (primera parte)**: ¿el acceso está limitado de forma fiable a la
oficina, o hay acceso desde fuera?

**Respuesta [REAL]**: **solo los de la oficina**.

**Repregunta**: dado que el acceso ya está limitado a la oficina, ¿se acepta
seguir sin usuario/contraseña, o se exige autenticación en la modernización?

**Respuesta [SIMULADA]**: se exige autenticación (usuario y contraseña) en la
modernización.

**Decisión**: aunque el riesgo actual se acepta como controlado por estar
limitado a la red interna, la modernización debe incorporar autenticación
como requisito, no dejarla como mejora opcional.

---

### 3. [A-03] Despliegue manual de `config.js` — dirigida a Julián/sistemas

**Contexto dado**: `config.js` (con la contraseña SMTP y la clave de
exportación en texto plano) se copia a mano a `\\SERVIDOR\gesfact` para
instalar el programa en un equipo nuevo.

**Pregunta**: ¿sigue vigente ese despliegue manual por ese nombre y ruta?

**Respuesta [SIMULADA]**: sí, sigue vigente.

**Decisión**: no hay evidencia de que el proceso de despliegue haya cambiado;
se asume vigente. Renombrar o mover el fichero en la modernización requiere
coordinar antes ese cambio con quien hace el despliegue, para no romper el
proceso manual actual.

---

### 4. [A-06] Indicadores del panel: ¿cuentan las rectificativas como "pendientes"? — dirigida a Marga

**Contexto dado**: el panel muestra "4 facturas pendientes de cobro" pero
solo 3.032,85 € de importe pendiente, porque una de esas 4 es una
rectificativa (abono) que no se suma.

**Pregunta**: ¿las facturas de abono deben contar como "pendientes de
cobro"?

**Respuesta [SIMULADA]**: no, no deben contar como pendientes de cobro.

**Decisión**: el recuento de "facturas pendientes" debe excluir las
rectificativas, igual que ya hace el importe pendiente. Esto fija cuál de los
dos criterios en conflicto (RN-32 vs. RN-33) es el correcto para unificar.

---

### 5. [A-07] Validación de NIF sin dígito de control — dirigida a Marga

**Contexto dado**: desde 2017 el sistema acepta cualquier NIF de 9
caracteres sin comprobar la letra; el control de calidad lo hace Marga a
simple vista al dar de alta al cliente.

**Pregunta**: ¿mantener la revisión visual, o añadir la comprobación
automática de la letra en la modernización?

**Respuesta [SIMULADA]**: añadir la comprobación automática de la letra.

**Decisión**: han pasado más de 8 años desde la decisión original de Julián;
se aprovecha la modernización para cerrar esta deuda técnica sin coste
relevante.

---

### 6. [A-08] Redondeo línea a línea — dirigida a Puri (gestoría)

**Contexto dado**: el IVA se calcula y redondea línea a línea, no sobre el
total (diferencia real de 0,01 € en el ejemplo de tres líneas de 10,01 € al
21%); esto ya causó que la gestoría devolviera un trimestre completo en 2019.

**Pregunta**: ¿sigue la gestoría exigiendo hoy este mismo cálculo con el
mismo programa de contabilidad?

**Respuesta [SIMULADA]**: sí, sigue vigente.

**Decisión**: se mantiene tal cual, sin ninguna variación, incluidos los
casos frontera de redondeo. Ninguna corrección debe tocar este
comportamiento.

---

### 7. [A-10] Formato y clave fija del CSV — dirigida a Puri

**Contexto dado**: todo CSV a la gestoría empieza con `CLAVE;SH-CONTA-7731`,
separador `;`, decimales con coma — acordado con Puri en 2019.

**Pregunta**: ¿sigue la gestoría aceptando exactamente ese formato y esa
clave?

**Respuesta [SIMULADA]**: sí.

**Decisión**: se especifica tal cual, sin variación de formato ni de clave.

---

### 8. [A-11] Exportación CSV anual sin filtrar por estado — dirigida a Puri

**Contexto dado**: la exportación anual incluye las tres filas de una
operación rectificada (original, abono y sustituta) para una misma operación
económica real de 122,23 €.

**Pregunta**: ¿la gestoría necesita ver las tres filas, o debería excluirse
alguna?

**Respuesta [SIMULADA]**: incluir las tres filas.

**Decisión**: no se añade filtro por estado; se mantiene el mismo criterio
que ya usa el resumen de IVA trimestral (RN-28), donde las rectificativas
"cuadran solas" con signo negativo.

---

### 9. [A-12] Llamada residual a `enviarFactura` y envío manual — dirigida a Manoli/Marga

**Contexto dado**: cada alta de factura invoca un envío de email que no hace
nada desde 2022 (Arsys); las facturas se envían a mano desde entonces.

**Pregunta**: ¿debe retirarse esa llamada que ya no hace nada? ¿Sigue Marga
enviando a mano?

**Respuesta [SIMULADA]**: sí, retirar la llamada residual; sí, Marga sigue
enviando las facturas a mano por Outlook.

**Decisión**: se retira la invocación a `enviarFactura` en la modernización.
La rotación de la contraseña SMTP expuesta (A-03/A-25 del registro de
riesgos) es independiente de esta decisión y sigue pendiente igualmente.

---

### 10. [A-13] Descuento por volumen acordado con Paco (2018) — dirigida a Paco (o quien ocupe su rol comercial hoy)

**Contexto dado**: desde 2018, a partir de 1.000,01 € de base se aplica 2% de
descuento, y a partir de 5.000,01 €, 5% — una factura de exactamente 1.000,00
€ no lleva descuento.

**Pregunta**: ¿sigue vigente ese acuerdo, con los mismos umbrales y
porcentajes?

**Respuesta [SIMULADA]**: sí, sigue vigente.

**Decisión**: se especifica tal cual, incluida la frontera estricta "mayor
que" en ambos umbrales.

**Nota pendiente sin resolver (no decidible en esta simulación)**: sigue sin
confirmarse el rol exacto de Paco en la empresa ni si continúa siendo la
persona de referencia para este acuerdo — esto requiere confirmación directa,
no es algo que se pueda simular razonablemente.

---

### 11. [A-14] `dias_pago = 0` tratado como "sin asignar" — dirigida a Marga

**Contexto dado**: si un cliente tuviera "0 días de pago" para exigirle pago
al contado, el sistema hoy le daría 30 días igualmente, por un efecto
colateral del código.

**Pregunta**: ¿existe hoy, o se ha planteado alguna vez, algún cliente de
pago al contado?

**Respuesta [SIMULADA]**: no existe ningún cliente así hoy, pero conviene
corregir igualmente el comportamiento para cuando se dé el caso.

**Decisión**: se corrige en la modernización (comprobación explícita de
`null`/`undefined` en vez de `||`), sin que haya ningún cliente real afectado
hoy que condicione la corrección.

---

### 12. [A-15] Constante "30 días" duplicada entre alta manual y remesa — dirigida a Julián/Marga

**Contexto dado**: si cambia el plazo de pago por defecto, la remesa mensual
no se enteraría porque usa un `30` tecleado directamente, no la configuración
general.

**Pregunta**: ¿es esto algo que el negocio debe saber que puede pasar, o debe
corregirse para que ambos caminos usen siempre el mismo plazo?

**Respuesta [SIMULADA]**: debe corregirse para que ambos usen siempre el
mismo plazo.

**Decisión**: se unifica en la modernización; la remesa debe leer la misma
constante de configuración que el alta manual.

---

### 13. [A-16] Cierre de trimestre con "31" fijo / plan de cambio de motor de BD — dirigida a Julián

**Contexto dado**: el cierre de cada trimestre usa siempre el día "31"; hoy
funciona solo porque las fechas se comparan como texto.

**Pregunta**: ¿hay algún plan de cambiar el motor de base de datos o el
formato de almacenamiento de fechas?

**Respuesta [SIMULADA]**: no hay planes concretos actualmente.

**Decisión**: se corrige igualmente en la modernización (usar `diasDelMes` o
comparación real de fechas), como mejora de robustez, no como urgencia
motivada por un cambio de motor inminente.

**Información relacionada ya documentada**: la migración a MySQL de 2018
mencionada en `LEEME.txt` sigue sin ejecutarse y sin plan conocido.

---

### 14. [A-17] Formato de importe inconsistente en pantallas internas — dirigida a Marga

**Contexto dado**: el panel de inicio muestra "3032.85" mientras que las
facturas muestran "3.032,85" para el mismo importe.

**Pregunta**: ¿se ha notado esta inconsistencia en el uso diario?

**Respuesta [SIMULADA]**: sí, se ha notado alguna vez, pero no se había
considerado prioritario corregirlo.

**Decisión**: se corrige en la modernización unificando el formato en las
tres vistas afectadas; no era urgente pero se confirma como corrección
deseada.

---

### 15. [A-18] Incidente de un día en el vencimiento (marzo 2019) — dirigida a Marga/Julián

**Contexto dado**: un vencimiento salió calculado un día antes de lo
esperado en marzo de 2019; nunca se reprodujo.

**Pregunta**: ¿hay constancia de otro caso desde entonces?

**Respuesta [SIMULADA]**: no, no hay constancia de ningún otro caso.

**Decisión**: se corrige igualmente en la modernización (aritmética de
fechas robusta frente a cambios de horario), como prevención, no por
recurrencia confirmada.

---

### 16. [A-22] Copia de seguridad única, manual y semanal — dirigida a gerencia

**Contexto dado**: la única copia de seguridad de todo el negocio la hace
Marga a mano cada viernes a un pendrive; un fallo un jueves perdería hasta
una semana de facturación legal.

**Pregunta**: ¿se acepta ese riesgo, o se invierte en copia automática y
fuera de la oficina en la modernización?

**Respuesta [SIMULADA]**: se invierte en copia automática y externa.

**Decisión**: la modernización debe incluir copia de seguridad automática,
con copia fuera de la oficina, sustituyendo el proceso manual semanal actual.

---

### 17. [A-23] Fallo silencioso al marcar una factura como cobrada — dirigida a Marga

**Contexto dado**: si se intenta cobrar una factura que ya está cobrada o
rectificada, el sistema no avisa de nada, aunque no cambie nada.

**Pregunta**: ¿es aceptable ese silencio, o debería avisar?

**Respuesta [SIMULADA]**: debe mostrar un aviso cuando la acción no hace
nada.

**Decisión**: se añade un aviso explícito en la modernización cuando la
operación de cobro no afecta a ninguna factura.

---

### 18. [A-24] La rectificativa no hereda fecha ni vencimiento de la original — dirigida a Puri/Marga

**Contexto dado**: la fecha de la rectificativa es siempre el día en que se
genera (ejemplo real: original del 30/04/2026, abono generado el 06/05/2026),
sin vencimiento.

**Pregunta**: ¿debe la rectificativa heredar la fecha de la original, o está
bien que lleve la fecha del día en que se genera?

**Respuesta [SIMULADA]**: está bien tal como está — fecha del día en que se
genera, sin vencimiento.

**Decisión**: se especifica tal cual el comportamiento actual: la
rectificativa se fecha el día de su emisión (es cuando se contabiliza
fiscalmente el abono) y no lleva vencimiento propio, al no generar un nuevo
plazo de cobro.

---

### 19. [A-26] Fichero de migración a MySQL de 2018 nunca ejecutado — dirigida a Julián

**Contexto dado**: `datos/migracion_mysql_2018.sql` documenta una migración
que nunca se ejecutó en producción, con esquema ya desfasado.

**Pregunta**: ¿puede eliminarse sin más?

**Respuesta [SIMULADA]**: sí, puede eliminarse.

**Decisión**: se elimina el fichero en la modernización; no hay motivo
identificado para conservarlo.

---

## Tabla resumen de decisiones

| ID | Pregunta | Decisión | Origen de la respuesta |
|---|---|---|---|
| A-01 | Fórmula de prorrateo correcta | Días reales del mes | REAL |
| A-02 | ¿Autenticación en modernización? | Sí, exigirla | SIMULADA (1ª parte REAL) |
| A-03 | ¿Sigue el despliegue manual de `config.js`? | Sí, sigue vigente | SIMULADA |
| A-06 | ¿Rectificativas cuentan como pendientes? | No | SIMULADA |
| A-07 | ¿Validación automática de NIF? | Sí, añadirla | SIMULADA |
| A-08 | ¿Sigue el redondeo línea a línea exigido? | Sí, mantener tal cual | SIMULADA |
| A-10 | ¿Sigue el formato/clave CSV? | Sí, mantener tal cual | SIMULADA |
| A-11 | ¿CSV anual con las 3 filas o filtrado? | Incluir las tres filas | SIMULADA |
| A-12 | ¿Retirar llamada residual de email? | Sí, retirar | SIMULADA |
| A-13 | ¿Sigue vigente el acuerdo de descuento de 2018? | Sí, vigente | SIMULADA |
| A-14 | ¿Existen clientes de pago al contado? | No, pero corregir igual | SIMULADA |
| A-15 | ¿Unificar la constante de vencimiento? | Sí, unificar | SIMULADA |
| A-16 | ¿Plan de cambio de motor de BD/fechas? | No, sin plan actual | SIMULADA |
| A-17 | ¿Se ha notado el formato inconsistente? | Sí, notado pero no priorizado | SIMULADA |
| A-18 | ¿Otro caso de vencimiento mal calculado? | No | SIMULADA |
| A-22 | ¿Aceptar riesgo de backup semanal o mejorar? | Invertir en backup automático externo | SIMULADA |
| A-23 | ¿Aceptable el fallo silencioso al cobrar? | No, debe avisar | SIMULADA |
| A-24 | ¿Rectificativa debe heredar fecha? | No, mantener como está | SIMULADA |
| A-26 | ¿Eliminar fichero de migración 2018? | Sí, eliminar | SIMULADA |

---

## Información y condiciones nuevas recogidas (no preguntadas directamente)

1. **A-01**: la decisión de negocio real recibida en esta sesión (días reales
   del mes) contradice el único testimonio histórico documentado hasta ahora
   (Paco/gestoría, mes comercial de 30 días). Debe confirmarse directamente
   con la gestoría antes de darlo por cerrado en las specs formales, porque
   ese testimonio pudo reflejar una expectativa real de Puri que no se ha
   vuelto a consultar.
2. **A-13**: sigue sin confirmarse el rol exacto de Paco en la empresa ni si
   continúa siendo la persona de referencia para el acuerdo comercial de
   2018 — pendiente de una entrevista real, no resoluble por simulación.
3. **A-20 (H20, memoria histórica)**: sigue sin confirmarse el rol exacto de
   Manoli en la empresa; sigue vigente la advertencia de no reactivar el
   envío de email sin hablar antes con ella/él.
4. **H19 (memoria histórica)**: el módulo de albaranes de Roberto (2021,
   inacabado, en un ordenador personal) no se ha mencionado en esta sesión;
   sigue como trabajo abandonado sin resolver, fuera del alcance de las 19
   preguntas económicas priorizadas.

---

## Preguntas sin respuesta concluyente

Ninguna. Las 19 preguntas de la agenda obtuvieron una respuesta que decide la
cuestión (1 real, 18 simuladas). **Las 18 respuestas simuladas deben
confirmarse en una entrevista real** con cada persona señalada antes de
fijarse como requisito cerrado en las specs formales — este documento no
sustituye esa entrevista, solo dota de una hipótesis de trabajo razonada para
no bloquear el avance de la caracterización.

---

## Pendiente para próxima ronda

Esta sección reúne, en un solo sitio, todo lo que la próxima conversación con
el negocio debe resolver: tanto las 18 respuestas simuladas de esta sesión
(que no cuentan como decisión real) como las preguntas genuinamente nuevas
que ha revelado esta simulación.

### 1. Confirmar las 18 respuestas simuladas con la persona real

Ninguna de estas 18 hipótesis puede tratarse como requisito cerrado hasta que
la persona señalada las confirme o las corrija. Agrupadas por responsable:

| Responsable | IDs a confirmar |
|---|---|
| Marga | A-06, A-07, A-14, A-17, A-18, A-23 |
| Puri (gestoría) | A-08, A-10, A-11, A-24 |
| Julián | A-03, A-15, A-16, A-26 |
| Manoli | A-12 |
| Gerencia | A-02 (solo la decisión de exigir autenticación; el hecho de que el acceso está limitado a la oficina ya es real), A-22 |
| Paco (o su sucesor) | A-13 |

### 2. Preguntas nuevas surgidas de esta sesión (sin respuesta, ni siquiera simulada)

1. **Confirmación con la gestoría sobre el cambio de criterio de
   prorrateo (nueva, derivada de la pregunta 1)**: la respuesta real de Puri
   y Marga (días reales del mes) contradice el único testimonio de negocio
   documentado hasta ahora a favor del mes comercial de 30 días ("Asi lo
   hacia Paco a mano en el Access y asi lo espera la gestoria",
   [services/calculo.js:92-94](../../services/calculo.js#L92-L94)). ¿Comparte
   la propia gestoría este cambio de criterio, o seguía esperando el mes
   comercial de 30 días? — *Responsable: gestoría (Puri)*.
2. **Rol exacto de Paco (pregunta 10 / A-13)**: no es simulable de forma
   razonable; sigue sin confirmarse si Paco continúa en la empresa y si sigue
   siendo el referente del acuerdo de descuento de 2018. — *Responsable:
   quien pueda identificarlo (gerencia)*.
3. **Rol exacto de Manoli (pregunta 9 / A-12, H20 de memoria-historica.md)**:
   sigue sin confirmarse su rol; sigue vigente la advertencia de no tocar el
   envío de email sin hablar antes con ella/él. — *Responsable: quien pueda
   identificarlo (gerencia)*.
4. **Excepciones futuras de acceso remoto (nueva, derivada de la pregunta
   2)**: confirmado que hoy el acceso está limitado a la red de la oficina,
   ¿hay previsión de acceso remoto (teletrabajo, VPN) que deba contemplarse
   en el diseño de autenticación de la modernización, o el perímetro seguirá
   siendo exclusivamente la oficina? — *Responsable: gerencia*.

### 3. Fuera de esta agenda económica, pero sin resolver

Recordatorio de dos asuntos ya documentados que ninguna de las 19 preguntas
cubrió, por quedar fuera del criterio de impacto económico usado para
priorizarlas: el módulo de albaranes de Roberto, a medias y fuera de este
repositorio ([memoria-historica.md H19](memoria-historica.md#h19--2021-módulo-de-albaranes-de-roberto-a-medias-y-fuera-del-repositorio)),
y si Roberto sigue localizable hoy ([memoria-historica.md
H15](memoria-historica.md#h15--verano-2021-roberto-becario-automatiza-la-remesa-mensual-de-cuotas)).
