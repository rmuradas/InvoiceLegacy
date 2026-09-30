# Contradicción 01 — Prorrateo de cuota mensual de contrato: dos fórmulas distintas para el mismo concepto

**Fase**: Caracterización (reconocimiento del sistema tal y como existe hoy).
**Fecha del análisis**: 2026-09-30.
**Método**: comparación línea a línea de las dos únicas piezas de código del
repositorio que prorratean una cuota mensual de contrato, verificada ejecutando
mentalmente ambas fórmulas con los mismos datos de entrada. Documento derivado
de una duplicidad ya señalada, desde ángulos distintos, en
[flujo-factura.md §5.1](flujo-factura.md#51-prorrateo-de-cuota-mensual-dos-fórmulas-distintas-para-el-mismo-concepto),
[reglas-de-negocio.md RN-07/RN-08](reglas-de-negocio.md#rn-07--prorrateo-de-la-baja-de-un-contrato-mes-comercial-de-30-días-con-tope)
y [registro-riesgos.md R6](registro-riesgos.md); este documento la reelabora en
el formato de contradicción pedido para el registro de anomalías y el guion de
entrevista, con un ejemplo numérico adicional y un mecanismo de colisión
operativa no descrito en los documentos anteriores.

> Nota de alcance: este documento **no** decide cuál fórmula es la correcta.
> Eso es una pregunta de negocio, no técnica (Principio III de la constitución
> de esta fase).

---

## 1. Implementaciones implicadas

**Implementación A** — `services/calculo.js` → `calcularProrrateo(cuota, desde, hasta)`
([services/calculo.js:90-102](../../services/calculo.js#L90-L102)):

```js
function calcularProrrateo(cuota, desde, hasta) {
  var d1 = parseInt(desde.split('-')[2], 10);
  var d2 = parseInt(hasta.split('-')[2], 10);
  var dias = d2 - d1 + 1;
  if (dias > 30) dias = 30; // meses de 31: el dia 31 no se cobra
  if (dias < 0) dias = 0;
  return util.redondear2(cuota / 30 * dias);
}
```

Se invoca desde un único punto: `routes/contratos.js` → `POST /:id/baja`
([routes/contratos.js:31-43](../../routes/contratos.js#L31-L43), llamada en la
línea 39). Este es el camino "manual": una pantalla web que, al dar de baja un
contrato, **muestra en pantalla** (en la URL de redirección) el importe
prorrateado del último mes para que administración emita luego la factura a
mano por el Camino A de facturación ([routes/contratos.js:28-30](../../routes/contratos.js#L28-L30)).
No genera ninguna factura por sí misma.

**Implementación B** — `scripts/remesa_mensual.js`, cálculo inline, sin llamar
a `calcularProrrateo` en ningún punto
([scripts/remesa_mensual.js:43-51](../../scripts/remesa_mensual.js#L43-L51)):

```js
var desde = co.fecha_alta > primerDia ? co.fecha_alta : primerDia;
var hasta = (co.fecha_baja && co.fecha_baja < ultimoDia) ? co.fecha_baja : ultimoDia;
var diasMes = util.diasDelMes(primerDia);
var d1 = parseInt(desde.split('-')[2], 10);
var d2 = parseInt(hasta.split('-')[2], 10);
var diasServicio = d2 - d1 + 1;
var importe = util.redondear2(co.cuota / diasMes * diasServicio);
```

Se ejecuta como parte del proceso automático mensual (`node
scripts/remesa_mensual.js YYYY-MM`) que **sí genera la factura real**
([scripts/remesa_mensual.js:57-69](../../scripts/remesa_mensual.js#L57-L69)).

Verificado por búsqueda en todo el repositorio: `calcularProrrateo` solo
aparece en `services/calculo.js` (su definición) y en
`routes/contratos.js:39` (su única llamada) — `scripts/remesa_mensual.js` no
la importa ni la invoca en ningún punto.

---

## 2. ¿Misma convención? Comparación paso a paso

| Paso | Implementación A (`calcularProrrateo`) | Implementación B (`remesa_mensual.js`) |
|---|---|---|
| Días de servicio | `d2 - d1 + 1`, extrayendo el día del mes con `split('-')[2]` | Idéntico: `d2 - d1 + 1`, mismo `split('-')[2]` — código prácticamente calcado |
| Divisor (días del mes) | **Fijo: 30**, siempre, para cualquier mes | `util.diasDelMes(primerDia)` — días **reales** del mes (28, 29, 30 o 31) |
| Tope superior | Si `dias > 30`, se recorta a 30 (el día 31 "no se cobra") | **No hay tope**: si el mes tiene 31 días y el servicio cubre los 31, se divide y multiplica por 31 tal cual |
| Guarda de negativos | Si `dias < 0`, se fuerza a 0 | No existe guarda equivalente |
| Redondeo final | `util.redondear2` | `util.redondear2` — idéntico |

Comparten el fragmento de extracción del día de mes y la llamada final a
`redondear2`, lo que sugiere que una se escribió mirando a la otra (o
copiando su esqueleto), pero **el núcleo del cálculo — el divisor — es
distinto y no hay tope ni guarda de negativos en B**. No es la misma
convención: A representa el "mes comercial de 30 días" heredado del sistema
Access anterior ("Asi lo hacia Paco a mano en el Access",
[services/calculo.js:92](../../services/calculo.js#L92)); B representa un mes
calendario real.

---

## 3. Ejemplos concretos con resultados distintos para la misma entrada

Contrato real de la carga inicial: cliente 6, "Alquiler máquina de café
Futurmat F3", cuota 90,00 €
([db.js:119](../../db.js#L119)). Tomando un caso de baja/alta a mitad de mes
con **15 días de servicio** (idéntico en ambas fórmulas) y variando solo el
mes:

| Mes de baja/alta | Días del mes | A: `90/30×15` | B: `90/diasMes×15` | Diferencia |
|---|---|---|---|---|
| Febrero (28 días, 2026 no bisiesto) | 28 | 45,00 € | **48,21 €** | 3,21 € |
| Febrero bisiesto (29 días) | 29 | 45,00 € | **46,55 €** | 1,55 € |
| Abril/junio/septiembre/noviembre (30 días) | 30 | 45,00 € | **45,00 €** | 0,00 € |
| Enero/marzo/mayo/julio/agosto/octubre/diciembre (31 días) | 31 | 45,00 € | **43,55 €** | 1,45 € |

El primer caso (febrero) ya está documentado con datos reales en
[reglas-de-negocio.md RN-08](reglas-de-negocio.md#rn-08--la-remesa-mensual-prorratea-altas-y-bajas-con-los-días-reales-del-mes-no-con-el-mes-comercial-de-30-días-de-rn-07).
Este documento añade el caso de mes de 31 días para mostrar que la divergencia
no es exclusiva de febrero: **8 de los 12 meses del año producen un importe
distinto** según qué camino calcule el prorrateo; solo los 4 meses de 30 días
coinciden por construcción (A siempre divide por 30, así que solo "acierta"
cuando el mes real también tiene 30).

Cuantificación del rango de divergencia posible para este contrato concreto
(cuota 90,00 €, 15 días de servicio): entre **-3,21 €** (febrero no bisiesto)
y **+1,45 €** (mes de 31 días) respecto al valor que "vería" la pantalla
manual. Para contratos con cuotas mayores (p. ej. "Mantenimiento cámaras
frigoríficas", 145,00 €/mes, [db.js:117](../../db.js#L117)) la diferencia
absoluta escala proporcionalmente.

---

## 4. Cuándo se manifiesta la divergencia y cuándo coinciden

**Coinciden** únicamente cuando el mes de la baja o el alta parcial tiene
exactamente 30 días de calendario (abril, junio, septiembre, noviembre) — una
coincidencia aritmética, no un caso buscado por ninguno de los dos códigos.

**Divergen** en los otros 8 meses del año (los de 31 días y febrero), que son
la mayoría.

**Por qué probablemente nadie lo ha detectado como incidente reportado**
(razonamiento a partir del propio código, no confirmado con logs de
ejecución — se marca explícitamente como tal):

1. La implementación A nunca llega a generar una factura por sí misma: solo
   escribe un número en la URL de redirección
   ([routes/contratos.js:40](../../routes/contratos.js#L40)) para que
   administración, después, **teclee manualmente** ese importe en el
   formulario de nueva factura (Camino A de facturación, que no prorratea
   nada — el precio que se escriba se toma tal cual,
   [views/factura_nueva.ejs:17](../../views/factura_nueva.ejs#L17)). No hay en
   el sistema ningún punto donde ambos números (el de la pantalla de baja y
   el que generaría la remesa) se calculen y se muestren juntos para que
   alguien note la diferencia.
2. Sin embargo, existe un mecanismo concreto por el que **sí podrían
   colisionar en la misma factura real**: la consulta de
   `scripts/remesa_mensual.js` selecciona contratos con
   `fecha_baja IS NULL OR fecha_baja >= primerDia`
   ([scripts/remesa_mensual.js:26-29](../../scripts/remesa_mensual.js#L26-L29)).
   Un contrato dado de baja a mitad del mes **sigue cumpliendo esta condición
   para ese mismo mes** (su `fecha_baja` sigue siendo `>= primerDia` de ese
   mes), por lo que la remesa —si se ejecuta el día 1 del mes siguiente, como
   dice hacerse habitualmente
   ([LEEME.txt](../../LEEME.txt), [scripts/remesa_mensual.js:7](../../scripts/remesa_mensual.js#L7))—
   **generaría automáticamente una factura para ese contrato y ese mes de
   baja**, con el importe calculado por la fórmula B (días reales). Si
   administración, mientras tanto, ya hubiese emitido a mano la factura de
   ese mismo mes usando el número que le mostró la pantalla de baja (fórmula
   A), el contrato quedaría facturado **dos veces para el mismo mes, con dos
   importes distintos**, por dos caminos distintos del sistema.
3. Este mecanismo es estructuralmente idéntico, en forma, al incidente real
   ya documentado en los datos de referencia:
   `FA-2026-000106` ("Remesa abril. ERROR cuota duplicada, ver
   RE-2026-000001", [db.js:156](../../db.js#L156)), rectificada por
   `RE-2026-000001` y sustituida por `FA-2026-000107`
   ([db.js:160](../../db.js#L160), [db.js:164](../../db.js#L164)) — un caso
   real de doble facturación para el mismo concepto y mes, corregido a
   posteriori con una rectificativa. No hay evidencia en el código de que
   ese incidente concreto se originara por esta vía de baja/remesa en
   particular (podría deberse a cualquier otra causa de doble facturación);
   se señala aquí como **ilustración de que el tipo de fallo que este
   mecanismo permitiría ya se ha materializado al menos una vez en el
   sistema**, no como prueba de que fue exactamente este mecanismo.

---

## 5. Historia probable

Reconstruida a partir de comentarios y de
[memoria-historica.md](memoria-historica.md):

- `calcularProrrateo` (mes comercial de 30 días, con tope) es la convención
  original, heredada explícitamente del sistema Access anterior a 2017: "Asi
  lo hacia Paco a mano en el Access y asi lo espera la gestoria"
  ([services/calculo.js:92-94](../../services/calculo.js#L92-L94);
  [memoria-historica.md H5](memoria-historica.md#h5--2018-descuento-por-volumen-acordado-con-paco)
  sitúa a Paco en 2018, antes de que existiera el script de remesa).
- `scripts/remesa_mensual.js` lo añadió Roberto, descrito como becario, en el
  verano de 2021 ([memoria-historica.md H15](memoria-historica.md#h15--verano-2021-roberto-becario-automatiza-la-remesa-mensual-de-cuotas);
  confirmado también en [scripts/remesa_mensual.js:6](../../scripts/remesa_mensual.js#L6)),
  como una automatización nueva para no tener que dar de alta las cuotas una
  a una a mano.
- No hay en `scripts/remesa_mensual.js` ningún comentario que mencione
  `calcularProrrateo` ni que compare o justifique por qué se usa una fórmula
  distinta a la ya existente en `services/calculo.js` — a pesar de que el
  propio script sí importa `calculo` para otra cosa (`calcularFactura`,
  [scripts/remesa_mensual.js:11](../../scripts/remesa_mensual.js#L11),
  [scripts/remesa_mensual.js:55](../../scripts/remesa_mensual.js#L55)), es
  decir, tenía el módulo delante y aun así escribió el prorrateo aparte.
- La lectura más plausible, sin confirmación directa: Roberto escribió una
  automatización nueva pensando en "días reales de servicio" como concepto
  más intuitivo para un cálculo automático, sin conocer (o sin haber
  revisado) que ya existía una función de prorrateo con una convención
  distinta y deliberadamente congelada. No hay revisión de código
  documentada que hubiera cruzado ambas piezas.

---

## Pregunta para el guion de entrevista

¿Cuál de las dos fórmulas de prorrateo (mes comercial de 30 días fijo, o días
reales del mes) es la que el negocio considera correcta para las cuotas
mensuales de contrato? ¿Es consciente el negocio de que hoy conviven ambas, y
de que un contrato dado de baja a mitad de mes podría llegar a facturarse dos
veces — una a mano con el número de la pantalla de baja, otra automáticamente
por la remesa del día 1 — antes de que alguien lo detecte?
