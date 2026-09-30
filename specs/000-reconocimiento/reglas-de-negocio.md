# Reglas de negocio — GesFact 2.4

**Fase**: Caracterización (reconocimiento del sistema tal y como existe hoy).
**Fecha del análisis**: 2026-09-30.
**Método**: lectura completa del código de los módulos de lógica de negocio
central (criticidad **Alta** según [mapa-sistema.md](mapa-sistema.md)) y de las
utilidades de las que dependen. Cada regla se ha verificado ejecutando
mentalmente el código con valores concretos; donde ha sido posible se han
usado los datos reales de la carga inicial de `db.js` (la única "producción"
disponible en este repositorio). Toda regla lleva su evidencia de fichero y
líneas (Principio II de la constitución). Ninguna regla se ha corregido ni se
propone corregir: donde el comportamiento parece un error, se documenta como
tal y se clasifica, nunca se repara (Principio III).

> Nota de alcance: este documento **no** evalúa si una regla es correcta o
> deseable. Documenta lo que el código hace hoy, tal y como lo haría.

---

## 1. Módulos seleccionados

Módulos de lógica de negocio central con criticidad **Alta** en el mapa del
sistema, más las utilidades compartidas de las que dependen (que también son
Alta):

- `services/calculo.js` — cálculo de base, IVA, recargo de equivalencia,
  descuento por volumen y prorrateo.
- `lib/numeracion.js` — numeración legal de facturas.
- `lib/util.js` — redondeo, fechas, validación de NIF, formato de pantalla
  (utilidad de la que dependen todos los módulos anteriores y posteriores).
- `config.js` — constantes de negocio (IVA por defecto, días de vencimiento,
  clave de exportación).
- `db.js` — esquema de datos y carga inicial (fuente de los valores reales
  usados como ejemplo en este documento).
- `routes/facturas.js` — ciclo de vida completo de la factura (alta, cobro,
  rectificación).
- `routes/contratos.js` — altas/bajas de cuotas recurrentes y prorrateo de
  baja.
- `routes/informes.js` — resumen de IVA trimestral y exportación a la
  gestoría.
- `scripts/remesa_mensual.js` — generación automática mensual de facturas de
  contrato.
- `server.js` — indicadores de negocio del panel de inicio.

Quedan fuera por ser criticidad Media y no ser dependencia de los anteriores:
`routes/clientes.js` (salvo la validación de NIF, ya cubierta vía
`lib/util.js`) y `services/email.js` (módulo desactivado, sin efecto de
negocio real — se menciona en RN-21 solo porque se invoca en el camino
crítico de alta de factura). Se ha consultado puntualmente
`routes/articulos.js` únicamente para confirmar el uso real de
`config.IVA_DEFECTO` (RN-15).

---

## 2. Cálculo de importes

### RN-01 — El redondeo a 2 decimales se aplica línea a línea, nunca sobre el total

**Enunciado**: la base y la cuota de IVA de cada línea de factura se calculan
y redondean a 2 decimales de forma independiente, y el total de la factura es
la suma de esas cantidades ya redondeadas. No se calcula nunca una cuota de
IVA global sobre la base total y se redondea después.

**Ejemplo calculado**: tres líneas idénticas, cantidad 1, precio 10,01 €,
IVA 21%, sin recargo.
- Por línea (código actual): `cuotaIva = redondear2(10,01 × 21 / 100) = redondear2(2,1021) = 2,10 €`.
  Con 3 líneas: base total = 30,03 €, IVA total = 3 × 2,10 = **6,30 €**.
- Si se calculara sobre el total (lo que se probó en mayo de 2019):
  `redondear2(30,03 × 21 / 100) = redondear2(6,3063) = 6,31 €`.
- Diferencia real de 0,01 € entre ambos métodos — exactamente la clase de
  discrepancia que, según el comentario del fichero, hizo que la gestoría
  devolviera todo un trimestre.

**Evidencia**: [services/calculo.js:1-7](../../services/calculo.js#L1-L7)
(aviso explícito de no cambiarlo), [services/calculo.js:26-34](../../services/calculo.js#L26-L34)
(`calcularLinea`), [services/calculo.js:81-86](../../services/calculo.js#L81-L86)
(acumulación de totales ya redondeados), [lib/util.js:5-7](../../lib/util.js#L5-L7)
(`redondear2`).

**Clasificación**: **INTENCIONAL**. Comentario explícito y fechado
("AVISO... NO CAMBIAR LA FORMA DE REDONDEAR") que describe el incidente real
que causó la decisión.

---

### RN-02 — Tipos de recargo de equivalencia por tipo de IVA

**Enunciado**: cuando corresponde aplicar recargo de equivalencia, el
porcentaje depende del tipo de IVA de la línea: 21% → 5,2%, 10% → 1,4%,
4% → 0,5%. Además existen porcentajes para tipos de IVA históricos ya no
vigentes en España (18% y 16% → 4%; 8% y 7% → 1%), que ningún otro punto del
código actual puede generar (el catálogo y el formulario de factura solo
ofrecen 21/10/4).

**Ejemplo calculado**: línea con tipo de IVA 10% y recargo aplicable →
`recargoPara(10) = 1,4`.

**Evidencia**: [services/calculo.js:12-23](../../services/calculo.js#L12-L23).

**Clasificación**: **INTENCIONAL** en cuanto a los tres tipos vigentes
(porcentajes legales de recargo de equivalencia en España). Los cuatro tipos
históricos son código muerto mantenido a propósito ("no borrar por si hay que
reabrir ejercicios viejos del Access") — también INTENCIONAL, aunque
inalcanzable hoy.

---

### RN-03 — El recargo de equivalencia solo se aplica si el cliente está marcado como tal

**Enunciado**: el recargo de equivalencia de una línea solo se calcula si el
cliente de la factura tiene `recargo_equivalencia = 1`. Para el resto de
clientes, la cuota de recargo de cada línea es siempre 0, sea cual sea el
tipo de IVA.

**Ejemplo calculado** (dato real de la carga inicial): "Ferretería El
Tornillo" tiene `recargo_equivalencia = 1`
([db.js:97](../../db.js#L97)). Una línea suya de cantidad 10, precio 20,00 €,
IVA 21%: base = 200,00 €, cuota IVA = `redondear2(200 × 21/100)` = 42,00 €,
cuota recargo = `redondear2(200 × 5,2/100)` = **10,40 €**, total línea =
252,40 €. La misma línea para "Cafetería La Parada" (`recargo_equivalencia =
0`, [db.js:96](../../db.js#L96)) tendría cuota de recargo 0,00 €.

**Evidencia**: [services/calculo.js:48-49](../../services/calculo.js#L48-L49)
(`conRecargo = cliente && cliente.recargo_equivalencia == 1`).

**Clasificación**: **INTENCIONAL** en el criterio de negocio (solo clientes
minoristas en recargo). La comparación con `==` en vez de `===` es un matiz
de implementación sin comentario que la explique — **DUDOSA** como detalle
técnico aislado, aunque no cambia el resultado con los valores enteros
0/1 que guarda hoy la base de datos.

---

### RN-04 — Descuento por volumen sobre la base bruta de la factura

**Enunciado**: antes de aplicar el descuento, se suma la base bruta de todas
las líneas (cantidad × precio de catálogo, sin descontar). Si esa base
bruta es superior a 5.000 €, el descuento es del 5%. Si es superior a
1.000 € (y no llega a 5.000 €), el descuento es del 2%. Si es exactamente
1.000 € o menos, no hay descuento. La frontera es estrictamente "mayor que"
(`>`), no "mayor o igual".

**Ejemplo calculado** (dato real): la factura FA-2026-000103 tiene una base
de exactamente 1.000,00 € y, según su propia observación en la base de
datos, **no** lleva descuento
([db.js:139](../../db.js#L139), comentario "OJO caso comentado con la
gestoria: base 1000 justa NO lleva descuento",
[db.js:138](../../db.js#L138)). Ejecutando el código: `porcentajeDescuento(1000.00)` →
1000 > 5000 es falso, 1000 > 1000 es falso → devuelve 0. Si la base bruta
fuera 1.000,01 € en vez de 1.000,00 €, `1000.01 > 1000` ya es cierto y el
descuento salta a 2% sobre **toda** la factura — un céntimo de diferencia en
la base bruta puede suponer varias decenas de euros de descuento según el
importe total.

**Evidencia**: [services/calculo.js:36-43](../../services/calculo.js#L36-L43).

**Clasificación**: **INTENCIONAL**. Comentario explícito ("acordado con Paco
en 2018 para fidelizar hosteleria") y confirmado por el propio dato real de
`db.js` que documenta la frontera exacta.

---

### RN-05 — El descuento se aplica al precio unitario de cada línea, no al total

**Enunciado**: cuando corresponde descuento, no se resta un importe al total
de la factura; se recalcula el precio unitario de cada línea aplicándole el
porcentaje de descuento (redondeado a 2 decimales), y con ese precio ya
descontado se vuelve a calcular base, cuota de IVA y cuota de recargo de la
línea desde cero.

**Ejemplo calculado**: una línea de cantidad 100, precio de catálogo 15,00 €,
IVA 21%, sin recargo, como única línea de la factura → base bruta = 1.500,00 €
→ descuento 2% (RN-04). Precio con descuento =
`redondear2(15,00 × 98/100) = 14,70 €`. Línea recalculada: base =
`100 × 14,70 = 1.470,00 €`, cuota IVA = `redondear2(1.470,00 × 21/100) =
308,70 €`. Total factura = 1.470,00 + 308,70 = **1.778,70 €** (en vez de los
1.500,00 + 315,00 = 1.815,00 € que saldrían sin descuento).

**Evidencia**: [services/calculo.js:63-84](../../services/calculo.js#L63-L84).

**Clasificación**: **INTENCIONAL**. Comentario explícito: "el descuento se
aplica linea a linea para que la gestoria lo vea desglosado igual (peticion
de Puri, 2018)".

---

### RN-06 — El total de la factura es base + cuota de IVA + cuota de recargo

**Enunciado**: el total de cada factura es la suma de la base imponible, la
cuota de IVA y la cuota de recargo de equivalencia (0 si no aplica), todo
ello ya acumulado línea a línea con redondeo a 2 decimales en cada paso
(consecuencia directa de RN-01).

**Ejemplo calculado**: con las tres líneas del ejemplo de RN-01 (base total
30,03 €, IVA total 6,30 €, sin recargo) → total = **36,33 €**.

**Evidencia**: [services/calculo.js:86](../../services/calculo.js#L86).

**Clasificación**: **INTENCIONAL** (consecuencia directa de la política de
redondeo de RN-01, con el mismo respaldo documental).

---

### RN-07 — Prorrateo de la baja de un contrato: mes comercial de 30 días, con tope

**Enunciado**: cuando se da de baja un contrato de cuota mensual a mitad de
mes, el importe del último mes se calcula como `(cuota mensual / 30) × días
de servicio`, donde "días de servicio" es del día 1 del mes de la baja hasta
el día de la baja, ambos inclusive. Si el resultado supera 30 días (porque el
mes de la baja tiene 31), se limita a 30: el día 31 no añade importe
adicional sobre el de un mes completo. Si el resultado fuera negativo, se
trata como 0 días.

**Ejemplo calculado**: contrato con cuota 90,00 €, baja el 15 de un mes
cualquiera → días de servicio = 15 → importe =
`redondear2(90,00 / 30 × 15) = 45,00 €`. Si la baja fuera el día 31 de un mes
de 31 días → días de servicio = 31, se limita a 30 → importe =
`redondear2(90,00 / 30 × 30) = 90,00 €` (el mes completo, sin descuento
alguno por darse de baja el último día).

**Evidencia**: [services/calculo.js:90-102](../../services/calculo.js#L90-L102)
(`calcularProrrateo`), [routes/contratos.js:37-40](../../routes/contratos.js#L37-L40)
(quién la invoca y cuándo).

**Clasificación**: **INTENCIONAL**. Comentario explícito: "Asi lo hacia Paco
a mano en el Access y asi lo espera la gestoria".

---

### RN-08 — La remesa mensual prorratea altas y bajas con los días reales del mes, no con el mes comercial de 30 días de RN-07

**Enunciado**: cuando `scripts/remesa_mensual.js` genera automáticamente la
factura mensual de un contrato cuya alta o baja cae dentro del mes que se
está facturando, calcula los días de servicio de forma análoga a RN-07 (día
de alta o día 1 del mes, hasta día de baja o último día del mes), pero divide
por los **días reales que tiene ese mes en el calendario** (28, 29, 30 o 31,
según `util.diasDelMes`), no por 30 fijo, y sin el tope de RN-07.

**Ejemplo calculado**: mismo contrato del ejemplo de RN-07 (cuota 90,00 €),
pero baja el día 15 de febrero de 2026 (mes de 28 días, 2026 no es
bisiesto), procesado por la remesa mensual en vez de por la pantalla de baja
de contratos: días de servicio = 15, días del mes = 28 → importe =
`redondear2(90,00 / 28 × 15) = redondear2(48,2142857...) = 48,21 €`. La
**misma baja, el mismo contrato, el mismo mes**, calculada por la pantalla
manual de baja de `routes/contratos.js` (RN-07) da **45,00 €**; calculada por
la remesa mensual (esta regla) da **48,21 €** — una diferencia de 3,21 € para
exactamente el mismo escenario de negocio, según qué camino del código lo
calcule.

**Evidencia**: [scripts/remesa_mensual.js:43-51](../../scripts/remesa_mensual.js#L43-L51)
(cálculo con `diasMes = util.diasDelMes(primerDia)`, días reales), frente a
[services/calculo.js:95-101](../../services/calculo.js#L95-L101) (mes fijo de
30 días con tope) invocado desde
[routes/contratos.js:37-40](../../routes/contratos.js#L37-L40).

**Clasificación**: **ACCIDENTAL**. No hay ningún comentario en
`scripts/remesa_mensual.js` que documente esta segunda fórmula de prorrateo
ni que la relacione con la convención "a lo comercial" de `calculo.js`
(congelada desde 2019, ver RN-07). El propio fichero explica que lo añadió
"Roberto (becario) en verano de 2021" como automatismo nuevo, sin referencia
a la fórmula ya existente en `services/calculo.js`. Es la discrepancia más
concreta detectada entre dos reglas que deberían representar el mismo
concepto de negocio ("prorrateo a lo comercial del último/primer mes") y no
lo hacen.

---

## 3. Numeración legal de facturas

### RN-09 — Numeración correlativa y sin huecos por serie y año

**Enunciado**: cada factura recibe un número con formato
`SERIE-AAAA-NNNNNN` (serie `FA` para facturas normales, `RE` para
rectificativas; año de cuatro dígitos; correlativo de 6 dígitos con ceros a
la izquierda), correlativo dentro de su serie y año, sin saltos. Las
facturas nunca se borran, precisamente para poder garantizar esta
correlatividad.

**Ejemplo calculado** (dato real): el contador de la serie `FA` para 2026
queda en 108 tras la carga inicial
([db.js:176](../../db.js#L176)); la siguiente factura `FA` de 2026 sería
`FA-2026-000109`. El contador de `RE` para 2026 queda en 1
([db.js:177](../../db.js#L177)), coherente con la única rectificativa
existente, `RE-2026-000001` ([db.js:160](../../db.js#L160)).

**Evidencia**: [lib/numeracion.js:1-6](../../lib/numeracion.js#L1-L6)
(comentario legal explícito), [lib/numeracion.js:38-42](../../lib/numeracion.js#L38-L42)
(formato).

**Clasificación**: **INTENCIONAL**. Comentario explícito que cita la
inspección de 2020 como origen de la regla de no borrar nunca facturas.

---

### RN-10 — El contador de numeración se reinicia a 0 en cada año natural

**Enunciado**: al emitir la primera factura de una serie en un año nuevo (no
existe todavía fila en `contadores` para esa serie+año), se crea el contador
en 0 y se reserva inmediatamente el número 1. El correlativo de cada serie
es independiente por año: no continúa el del año anterior.

**Ejemplo calculado**: la primera factura de la serie `FA` del año 2027
(hipotético, sin fila en `contadores` para `FA`/2027) → se inserta
`(FA, 2027, 0)` y se reserva el número 1 → resultado `FA-2027-000001`,
aunque el año 2026 haya terminado en el número 108.

**Evidencia**: [lib/numeracion.js:14-27](../../lib/numeracion.js#L14-L27).

**Clasificación**: **INTENCIONAL** (consecuencia directa y coherente con
RN-09: la correlatividad legal se exige "dentro de cada serie y año", según
el propio comentario del fichero).

---

## 4. Vencimiento y validación de datos

### RN-11 — Fecha de vencimiento: días de pago del cliente o 30 días por defecto

**Enunciado**: la fecha de vencimiento de una factura nueva es su fecha de
emisión más los días de pago configurados en la ficha del cliente; si el
cliente no tiene días de pago asignados, se usan los 30 días por defecto de
la configuración general. La comprobación de "si el cliente tiene días de
pago" se hace con el operador `||` de JavaScript, que trata como "no
asignado" tanto `null`/`undefined` como el número **0**.

**Ejemplo calculado** (dato real): "Hotel Vega Baja, S.A." tiene
`dias_pago = 60` ([db.js:100](../../db.js#L100)). Una factura suya fechada el
1 de julio de 2026 vence el **30 de agosto de 2026**
(`sumarDias('2026-07-01', 60)`). Para un cliente sin `dias_pago` asignado
(`null`, como la mayoría de los clientes de la carga inicial), la misma
factura vencería a los 30 días
(`config.VENCIMIENTO_DIAS`, [config.js:40](../../config.js#L40)):
1 de agosto de 2026.

**Caso límite (ejecución mental, no hay ningún cliente así en los datos
semilla)**: si un cliente se diera de alta con `dias_pago = 0` con la
intención de exigir pago al contado (vencimiento el mismo día), el código
actual lo trataría exactamente igual que si no tuviera días de pago
asignados, porque `0 || 30` evalúa a `30` en JavaScript. Esa factura
vencería a 30 días en vez de al contado.

**Evidencia**: [routes/facturas.js:68-69](../../routes/facturas.js#L68-L69),
[lib/util.js:20-26](../../lib/util.js#L20-L26) (`sumarDias`),
[config.js:39-40](../../config.js#L39-L40).

**Clasificación**: la regla general (30 días por defecto) es **INTENCIONAL**
(constante de configuración explícita y comentada). El tratamiento de
`dias_pago = 0` como "sin asignar" es **ACCIDENTAL**: es un efecto colateral
del operador `||` sobre un valor numérico, sin ningún comentario que indique
que un cliente de pago al contado se haya considerado alguna vez.

---

### RN-12 — Validación de NIF/CIF: solo longitud, no la letra de control

**Enunciado**: un NIF/CIF se considera válido si, tras quitarle espacios y
guiones, tiene exactamente 9 caracteres. No se comprueba el dígito/letra de
control ni el formato por tipo de entidad.

**Ejemplo calculado**: `validarNIF('12345678')` (8 caracteres) → `false`
(se rechaza, aunque le falte solo la letra). `validarNIF('ABCDEFGHI')`
(9 caracteres, sin ningún significado como NIF real) → `true` (se acepta).

**Evidencia**: [lib/util.js:41-48](../../lib/util.js#L41-L48).

**Clasificación**: **INTENCIONAL** como decisión consciente y explícita, no
como olvido: "TODO Julian 11/2017: falta comprobar la letra, de momento con
la longitud vale porque los da de alta Marga y los mira ella". Sigue sin
resolverse desde 2017.

---

## 5. Formato de salida

### RN-13 — Formato de fecha en pantalla, impresión y exportación: DD/MM/AAAA

**Enunciado**: las fechas se guardan internamente como `AAAA-MM-DD` pero se
muestran siempre en formato español `DD/MM/AAAA` en pantalla, en la factura
impresa y en la exportación CSV a la gestoría.

**Ejemplo calculado**: `fechaBonita('2026-09-30')` → `'30/09/2026'`.

**Evidencia**: [lib/util.js:28-33](../../lib/util.js#L28-L33).

**Clasificación**: **INTENCIONAL** (formato de fecha español estándar,
coherente en todo el sistema).

---

### RN-14 — Formato de importe: separador de miles con punto, decimales con coma

**Enunciado**: los importes se muestran con separador de miles (`.`) y
coma decimal, con siempre 2 decimales, y con signo `-` delante si son
negativos.

**Ejemplo calculado** (datos reales): `formatearImporte(2756.38)` →
`'2.756,38'` (total de la factura FA-2026-000105,
[db.js:149](../../db.js#L149)). `formatearImporte(-122.23)` → `'-122,23'`
(total de la rectificativa RE-2026-000001,
[db.js:160](../../db.js#L160)).

**Evidencia**: [lib/util.js:51-58](../../lib/util.js#L51-L58).

**Clasificación**: **INTENCIONAL** (formato español estándar, usado también
en el CSV de exportación que exige explícitamente decimales con coma — ver
RN-30).

---

## 6. Catálogo y configuración

### RN-15 — IVA por defecto de un artículo nuevo: 21%

**Enunciado**: al dar de alta un artículo nuevo sin indicar explícitamente
su tipo de IVA en el formulario, se le asigna el 21%.

**Ejemplo calculado**: alta de artículo con `tipo_iva` vacío en el
formulario → `iva = config.IVA_DEFECTO = 21`.

**Evidencia**: [config.js:24-25](../../config.js#L24-L25),
[routes/articulos.js:16](../../routes/articulos.js#L16).

**Clasificación**: **INTENCIONAL** (constante de configuración explícita).

---

### RN-16 — Clave fija de la gestoría en cada exportación CSV

**Enunciado**: todo fichero CSV exportado para la gestoría empieza
obligatoriamente con una línea `CLAVE;<clave>`, donde la clave es una
constante fija del sistema, igual para todas las exportaciones.

**Ejemplo calculado**: primera línea de cualquier exportación:
`'CLAVE;SH-CONTA-7731'`.

**Evidencia**: [config.js:36-37](../../config.js#L36-L37),
[routes/informes.js:40](../../routes/informes.js#L40).

**Clasificación**: **INTENCIONAL**. Comentario explícito: "clave que pide la
gestoria para el fichero de exportacion (no cambiar)".

---

## 7. Ciclo de vida de la factura

### RN-17 — Una factura nueva exige al menos una línea con descripción

**Enunciado**: el formulario de factura nueva manda siempre 6 filas fijas;
las filas sin descripción se descartan. Si, tras descartarlas, no queda
ninguna línea, la factura se rechaza y no se graba nada.

**Ejemplo calculado**: formulario con las 6 filas en blanco → `lineas.length
=== 0` → respuesta 400 "La factura no tiene lineas", ninguna fila se inserta
en `facturas` ni en `lineas`.

**Evidencia**: [routes/facturas.js:54-64](../../routes/facturas.js#L54-L64).

**Clasificación**: **INTENCIONAL** (validación mínima explícita).

---

### RN-18 — La fecha de una factura nueva es la de hoy si no se indica otra

**Enunciado**: si el formulario de nueva factura no trae fecha, se usa la
fecha del día en que se graba.

**Ejemplo calculado**: alta sin campo `fecha` el 30 de septiembre de 2026 →
`fecha = util.hoy() = '2026-09-30'`.

**Evidencia**: [routes/facturas.js:44](../../routes/facturas.js#L44).

**Clasificación**: **INTENCIONAL**.

---

### RN-19 — Toda factura nueva nace en estado "emitida"

**Enunciado**: no existe forma de crear una factura ya "cobrada" o en
cualquier otro estado distinto de "emitida" desde el alta.

**Evidencia**: [routes/facturas.js:75](../../routes/facturas.js#L75).

**Ejemplo calculado**: cualquier alta por el formulario `/facturas/nueva`
inserta la fila con `estado = 'emitida'`, sin excepción ni parámetro que lo
cambie.

**Clasificación**: **INTENCIONAL**.

---

### RN-20 — El descuento por volumen aplicado se anota automáticamente en observaciones

**Enunciado**: cuando una factura nueva lleva descuento por volumen (RN-04),
se añade automáticamente al campo de observaciones el texto "Descuento
volumen N% aplicado", a continuación de lo que haya escrito el usuario.

**Ejemplo calculado**: usuario escribe observación "Pedido urgente" en una
factura con descuento del 2% (ejemplo de RN-05) → observación final grabada:
`'Pedido urgente Descuento volumen 2% aplicado'`.

**Evidencia**: [routes/facturas.js:76](../../routes/facturas.js#L76).

**Clasificación**: **INTENCIONAL** (trazabilidad del descuento para quien
revise la factura después).

---

### RN-21 — Al grabar una factura se intenta "enviar" por email, pero no se envía nada

**Enunciado**: tras grabar correctamente una factura nueva (cabecera y
líneas), el sistema invoca el envío del email al cliente. En la
implementación actual, esa función nunca envía correo real: solo escribe un
aviso por consola y siempre continúa con éxito (nunca hace fallar el alta de
la factura, pase lo que pase).

**Ejemplo calculado**: alta de una factura para un cliente con email
`'laparada@gmail.com'` → se imprime por consola `'[email] AVISO: envio
desactivado. Factura FA-2026-000109 pendiente de enviar a mano a
laparada@gmail.com'` y la petición HTTP redirige igualmente al detalle de la
factura como si se hubiera enviado.

**Evidencia**: [routes/facturas.js:93](../../routes/facturas.js#L93)
(invocación), [services/email.js:11-29](../../services/email.js#L11-L29)
(implementación real desactivada; código de envío con `nodemailer` queda
comentado).

**Clasificación**: **INTENCIONAL** en cuanto a que la desactivación es
deliberada y documentada ("FUERA DE SERVICIO desde 2022... hablar con Manoli
antes de reactivar esto"). Es **DUDOSA** en cuanto a si seguir invocando una
función llamada `enviarFactura` que no envía nada es una decisión consciente
de mantener el enganche por si se reactiva, o simplemente nadie ha limpiado
la llamada — el código no lo dice.

---

### RN-22 — Marcar una factura como cobrada solo funciona si está en estado "emitida"

**Enunciado**: la acción de "marcar cobrada" solo cambia el estado de una
factura concreta si su estado actual es exactamente `'emitida'`. Si la
factura ya está `'cobrada'` o está `'rectificada'`, la operación no cambia
nada en la base de datos, pero la aplicación no informa de ningún error: la
petición responde igual (redirección al detalle) tanto si se ha actualizado
una fila como si no se ha actualizado ninguna.

**Ejemplo calculado**: `POST /facturas/6/cobrar` sobre la factura
`FA-2026-000106`, que en los datos de carga inicial ya está en estado
`'rectificada'` ([db.js:156](../../db.js#L156)) → el `UPDATE ... WHERE id = 6
AND estado = 'emitida'` no afecta a ninguna fila (0 filas actualizadas), pero
la respuesta redirige a `/facturas/6` sin ningún aviso de que no ha pasado
nada.

**Evidencia**: [routes/facturas.js:117-122](../../routes/facturas.js#L117-L122).

**Clasificación**: **DUDOSA**. El filtro `estado = 'emitida'` en el `UPDATE`
parece una guarda de negocio deliberada (no se puede "cobrar" dos veces ni
cobrar una rectificada), pero no hay ningún comentario que explique la
decisión de no informar del fallo al usuario; no puede decidirse desde el
código si el silencio es intencional o un descuido.

---

### RN-23 — No se puede rectificar una factura ya rectificada ni una rectificativa

**Enunciado**: la rectificación (abono total) de una factura está prohibida
en dos casos: si la factura ya está en estado `'rectificada'` (ya tiene su
rectificativa), o si la propia factura es de la serie `RE` (no se rectifica
una rectificativa). En cambio, sí está permitido rectificar una factura ya
`'cobrada'`.

**Ejemplo calculado**: `POST /facturas/6/rectificar` sobre
`FA-2026-000106` (estado `'rectificada'`,
[db.js:156](../../db.js#L156)) → 400 "Ya esta rectificada". `POST
/facturas/7/rectificar` sobre `RE-2026-000001` (serie `RE`,
[db.js:160](../../db.js#L160)) → 400 "No se rectifica una rectificativa".

**Evidencia**: [routes/facturas.js:132-133](../../routes/facturas.js#L132-L133).

**Clasificación**: **INTENCIONAL** (dos validaciones explícitas con mensaje
propio para cada caso).

---

### RN-24 — La rectificativa es un espejo exacto: invierte signos sin recalcular nada

**Enunciado**: al generar la rectificativa de una factura, no se recalcula
ningún importe (ni aunque hayan cambiado desde entonces los tipos de IVA, el
recargo de equivalencia del cliente o las reglas de descuento). Se copian
las líneas originales invirtiendo el signo de la cantidad, la base, la cuota
de IVA y la cuota de recargo. El precio unitario de cada línea **no** se
invierte: queda positivo, igual que en la línea original; lo que cambia de
signo es la cantidad.

**Ejemplo calculado** (dato real): la línea original de `FA-2026-000106`
"Alquiler máquina de café Futurmat F3 (abril)": cantidad 1, precio 90,00 €,
base 90,00 €, cuota IVA 18,90 € ([db.js:157](../../db.js#L157)). Su
rectificativa en `RE-2026-000001`: cantidad **-1**, precio **90,00 €** (sin
cambiar), base **-90,00 €**, cuota IVA **-18,90 €**
([db.js:161](../../db.js#L161)).

**Evidencia**: [routes/facturas.js:124-160](../../routes/facturas.js#L124-L160),
en particular la inserción de líneas en
[routes/facturas.js:149-150](../../routes/facturas.js#L149-L150).

**Clasificación**: **INTENCIONAL**. Comentario explícito y con testimonio
citado: "OJO: aqui NO se recalcula nada, se invierte lo que hay (Puri dixit:
la rectificativa tiene que ser espejo exacto de la original)".

---

### RN-25 — La rectificativa no lleva vencimiento y se fecha el día en que se emite (no el de la factura original)

**Enunciado**: la fecha de una factura rectificativa es siempre la fecha en
que se genera (hoy), no la fecha de la factura que rectifica, y su
vencimiento queda vacío (`null`).

**Ejemplo calculado** (dato real): `FA-2026-000106` está fechada el 30 de
abril de 2026 ([db.js:156](../../db.js#L156)); su rectificativa
`RE-2026-000001` está fechada el 6 de mayo de 2026, seis días después,
y no tiene vencimiento ([db.js:160](../../db.js#L160)).

**Evidencia**: [routes/facturas.js:142](../../routes/facturas.js#L142)
(`util.hoy()` para la fecha, `null` para el vencimiento).

**Clasificación**: **DUDOSA**. No hay comentario que explique por qué la
rectificativa no hereda la fecha de la original ni por qué no tiene
vencimiento (a diferencia de RN-24, donde sí hay testimonio explícito sobre
"espejo exacto"); podría ser una decisión deliberada (una rectificativa no
genera un nuevo plazo de cobro) o un efecto colateral de no haberlo
considerado al escribir el código.

---

### RN-26 — Al rectificar, la factura original pasa a estado "rectificada"

**Enunciado**: además de crear la rectificativa, la propia factura original
cambia su estado a `'rectificada'`, con independencia de si estaba
`'emitida'` o ya `'cobrada'` (no hay restricción sobre el estado previo,
salvo las de RN-23).

**Ejemplo calculado** (dato real): `FA-2026-000106` pasó de `'emitida'` a
`'rectificada'` al generarse `RE-2026-000001`
([db.js:156](../../db.js#L156), observación "ERROR cuota duplicada, ver
RE-2026-000001").

**Evidencia**: [routes/facturas.js:154](../../routes/facturas.js#L154).

**Clasificación**: **INTENCIONAL**.

---

### RN-27 — La rectificativa consume el contador correlativo de su propia serie (RE)

**Enunciado**: el número de una rectificativa se pide con la misma función
de numeración que una factura normal, pero para la serie `RE`, por lo que
sigue su propia secuencia correlativa por año (RN-09/RN-10), independiente
de la serie `FA`.

**Ejemplo calculado** (dato real): con un único abono emitido en 2026, su
número es `RE-2026-000001` ([db.js:160](../../db.js#L160)), mientras que la
serie `FA` del mismo año ya iba por el 108.

**Evidencia**: [routes/facturas.js:138](../../routes/facturas.js#L138).

**Clasificación**: **INTENCIONAL** (consecuencia directa de RN-09/RN-10,
aplicada también a la serie RE).

---

## 8. Informes y exportación a la gestoría

### RN-28 — El resumen de IVA trimestral se calcula desde las líneas, no desde las facturas, y las rectificativas se netean solas

**Enunciado**: el resumen de IVA repercutido por trimestre suma base, cuota
de IVA y cuota de recargo agrupando por tipo de IVA, tomando los datos de la
tabla de líneas (no de la cabecera de factura). Como las líneas de una
rectificativa llevan importes en negativo, al sumarlas junto con las de la
factura original y su sustituta, el resultado neto del trimestre queda
correcto sin ningún tratamiento especial para las rectificativas.

**Ejemplo calculado** (datos reales, segundo trimestre de 2026, tipo de IVA
21%): en ese trimestre existen tres facturas relacionadas con el mismo
concepto: `FA-2026-000106` (base 90,00 €, cuota 18,90 €, luego rectificada),
`RE-2026-000001` (base -90,00 €, cuota -18,90 €) y
`FA-2026-000107` (base 90,00 €, cuota 18,90 €, la sustituye). Sumando las
tres: base neta = 90,00 − 90,00 + 90,00 = **90,00 €**, cuota neta = 18,90 −
18,90 + 18,90 = **18,90 €** — el resumen trimestral refleja correctamente
que, económicamente, solo hubo una operación de 90,00 €, pese a que hay tres
facturas distintas en la base de datos.

**Evidencia**: [routes/informes.js:21-29](../../routes/informes.js#L21-L29).

**Clasificación**: **INTENCIONAL**. El propio comentario lo explica: "se
suma desde las lineas para tener el desglose por tipo (las rectificativas
entran con signo negativo y cuadran solas)".

---

### RN-29 — Los tramos trimestrales usan meses de calendario fijos, con el día de cierre codificado siempre como "31"

**Enunciado**: el trimestre 1 va de enero a marzo, el 2 de abril a junio, el
3 de julio a septiembre y el 4 de octubre a diciembre. Para el límite
superior de cada trimestre, el código usa siempre el día "31" como día de
cierre del mes final, independientemente de que ese mes tenga en realidad
28, 29, 30 o 31 días.

**Ejemplo calculado** (dato real): para el trimestre 2 de 2026 (abril-junio),
el límite superior de la consulta es la cadena `'2026-06-31'` — una fecha
que no existe en el calendario, porque junio tiene 30 días. Aun así, la
factura real `FA-2026-000108`, fechada `'2026-05-31'`
([db.js:168](../../db.js#L168)), sí queda incluida en el trimestre 2, porque
la comparación `f.fecha <= '2026-06-31'` se hace como comparación de
**cadenas de texto**, no de fechas reales, y `'2026-05-31' <= '2026-06-31'`
es cierto alfabéticamente. Por la misma razón, una factura del 30 de junio
también quedaría incluida (`'2026-06-30' <= '2026-06-31'` es cierto).

**Evidencia**: [routes/informes.js:17-19](../../routes/informes.js#L17-L19).

**Clasificación**: **DUDOSA**, con inclinación a **ACCIDENTAL**. No hay
ningún comentario que explique por qué se usa siempre "31"; el resultado de
hoy es correcto, pero solo porque las fechas se comparan como texto en
formato `AAAA-MM-DD` (que ordena igual que las fechas reales) y porque nunca
existe una fecha real con día 31 en un mes de 30 días que pudiera quedar
excluida por error. Es una constante mágica que funciona por una coincidencia
del formato de almacenamiento, no por un cálculo real de fin de mes (compárese
con `lib/util.js:diasDelMes`, que si calcula los días reales de un mes y que
el propio sistema usa en otros puntos — ver RN-08).

---

### RN-30 — La exportación CSV anual incluye todas las facturas del año, sin filtrar por estado

**Enunciado**: el fichero CSV para la gestoría incluye una fila por cada
factura cuya fecha caiga en el año solicitado, sea cual sea su estado
(`emitida`, `cobrada` o `rectificada`) y sea de la serie `FA` o `RE`. No hay
ningún filtro que excluya facturas anuladas o sustituidas.

**Ejemplo calculado** (datos reales): la exportación del año 2026 incluye,
entre otras, tres filas para lo que económicamente es una sola operación:
`FA-2026-000106;30/04/2026;...;101,61;20,62;0,00;122,23;rectificada`,
`RE-2026-000001;06/05/2026;...;-101,61;-20,62;0,00;-122,23;emitida` y
`FA-2026-000107;06/05/2026;...;101,61;20,62;0,00;122,23;emitida`.

**Evidencia**: [routes/informes.js:34-38](../../routes/informes.js#L34-L38)
(consulta sin filtro de `estado`), [routes/informes.js:40-50](../../routes/informes.js#L40-L50)
(formato: separador `;`, cabecera fija, importes con
`formatearImporte` — decimales con coma, RN-14).

**Clasificación**: el formato del CSV (separador, clave, decimales con coma)
es **INTENCIONAL** — comentario explícito: "formato acordado con Puri en
2019: punto y coma, decimales con coma, y la clave en la primera linea". Que
no se filtre por estado es **DUDOSA**: podría ser intencional (para que la
gestoría vea también las anuladas, con su propio criterio de conciliación,
igual que en RN-28) o un descuido de no añadir el filtro; el código no lo
dice.

---

## 9. Indicadores del panel de inicio

### RN-31 — "Total de facturas" cuenta todas las filas, incluidas rectificadas y rectificativas

**Enunciado**: el indicador "facturas emitidas" del panel de inicio es un
recuento de todas las filas de la tabla `facturas`, sin distinguir estado ni
serie.

**Ejemplo calculado** (datos reales de la carga inicial): 9 filas en total
en `facturas` (6 `FA` cobradas/emitidas, 1 `FA` rectificada, 1 `RE`, 1 `FA`
sustituta) → indicador = **9**.

**Evidencia**: [server.js:22](../../server.js#L22).

**Clasificación**: **DUDOSA**. No hay comentario que aclare si "facturas
emitidas" debería excluir las anuladas por una rectificativa; el nombre en
pantalla ("facturas emitidas") es compatible con ambas lecturas.

---

### RN-32 — "Facturas pendientes de cobro" cuenta el estado "emitida" de cualquier serie, incluidas rectificativas

**Enunciado**: el indicador de facturas pendientes cuenta las filas con
`estado = 'emitida'`, sin filtrar por serie — incluye tanto facturas `FA`
como rectificativas `RE` que todavía estén en estado `'emitida'`.

**Ejemplo calculado** (datos reales): en estado `'emitida'` hay 4 filas:
`FA-2026-000105`, `RE-2026-000001`, `FA-2026-000107` y `FA-2026-000108` →
indicador = **4**.

**Evidencia**: [server.js:23](../../server.js#L23).

**Clasificación**: **DUDOSA** (misma incertidumbre que RN-31, agravada por
la discrepancia con RN-33 — ver más abajo).

---

### RN-33 — "Importe pendiente de cobro" solo suma la serie FA, a diferencia del recuento de RN-32

**Enunciado**: el importe pendiente de cobro suma el `total` de las facturas
con `estado = 'emitida'` **y además** `serie = 'FA'`, excluyendo las
rectificativas pendientes (serie `RE`) — a diferencia del recuento de
"facturas pendientes" (RN-32), que sí las incluye.

**Ejemplo calculado** (datos reales): de las 4 facturas en estado
`'emitida'` (RN-32), solo 3 son de serie `FA`: 2.756,38 + 122,23 + 154,24 =
**3.032,85 €**. La cuarta, `RE-2026-000001` (-122,23 €, serie `RE`), cuenta
en el indicador de "4 facturas pendientes" (RN-32) pero **no** en este
importe. El panel de inicio muestra así, a la vez, "4 facturas pendientes"
y un importe pendiente que no corresponde a la suma de esas 4 facturas.

**Evidencia**: [server.js:24](../../server.js#L24).

**Clasificación**: **ACCIDENTAL**. No hay ningún comentario que justifique
por qué el recuento y la suma usan criterios distintos (uno filtra por serie,
el otro no); es la discrepancia más concreta detectada en el panel de inicio,
comparable a la de RN-08 entre los dos cálculos de prorrateo.

---

### RN-34 — "Clientes activos" cuenta los clientes con `activo = 1`

**Enunciado**: el indicador de clientes del panel de inicio cuenta
únicamente los clientes que no han sido dados de baja (`activo = 1`).

**Ejemplo calculado** (datos reales): los 6 clientes de la carga inicial
tienen todos `activo = 1` por defecto (ninguno se da de baja en la propia
carga) → indicador = **6**.

**Evidencia**: [server.js:25](../../server.js#L25).

**Clasificación**: **INTENCIONAL**.

---

## 10. Preguntas abiertas derivadas de las reglas anteriores

Estas son las SUPOSICIONES y ambigüedades detectadas al extraer las reglas,
convertidas en preguntas para el negocio, según exige el Principio II de la
constitución:

1. **RN-08** (prorrateo): ¿cuál de las dos fórmulas de prorrateo (mes
   comercial de 30 días fijo, usada al dar de baja un contrato a mano, o
   días reales del mes, usada por la remesa mensual automática) es la que
   el negocio considera correcta? Ambas están en producción hoy, aplicadas
   según qué pantalla o proceso gestione la baja.
2. **RN-11** (vencimiento): ¿existe hoy, o se ha planteado alguna vez, algún
   cliente de pago al contado (`dias_pago = 0`)? Si existiera, el sistema le
   daría 30 días de plazo en vez de exigirle el pago inmediato, por el
   tratamiento de `0` como "sin asignar".
3. **RN-21** (email): ¿sigue teniendo sentido mantener la llamada a
   `enviarFactura` en el camino de alta de cada factura, sabiendo que no
   envía nada desde 2022, o es simplemente código que nadie ha retirado?
4. **RN-22** (marcar cobrada): cuando se intenta cobrar una factura que no
   está en estado "emitida", el sistema no informa de ningún error. ¿Es
   aceptable para administración que esa acción falle en silencio?
5. **RN-25** (fecha y vencimiento de la rectificativa): ¿es deliberado que
   la rectificativa no herede fecha ni vencimiento de la factura original,
   o se ha planteado alguna vez que debería reflejar la fecha de la factura
   que rectifica?
6. **RN-29** (cierre de trimestre con "31" fijo): dado que el resultado
   correcto de hoy depende de una coincidencia del formato de
   almacenamiento de fechas como texto, ¿es consciente el negocio de esta
   fragilidad, o convendría preguntar si alguna vez se ha planteado cambiar
   el formato de fecha o el motor de base de datos, lo que rompería esta
   coincidencia?
7. **RN-30** (exportación CSV sin filtrar por estado): ¿la gestoría espera
   ver las tres filas de una operación rectificada (original, abono y
   sustituta) en la exportación anual, o debería excluirse alguna?
8. **RN-31/RN-32** (indicadores "facturas emitidas" y "facturas
   pendientes"): ¿el negocio espera que estos recuentos incluyan o excluyan
   las facturas rectificadas y las rectificativas? El nombre en pantalla no
   lo aclara y el código no es consistente entre los distintos indicadores
   (ver también RN-33).
9. **RN-33** (importe pendiente vs. recuento de pendientes): esta es la
   pregunta más urgente de este bloque — el panel de inicio muestra un
   número de "facturas pendientes" y un "importe pendiente" que, con los
   datos reales de hoy, no son consistentes entre sí (4 facturas frente a
   un importe que solo corresponde a 3 de ellas). ¿Es este comportamiento
   conocido por quien usa el panel a diario?
