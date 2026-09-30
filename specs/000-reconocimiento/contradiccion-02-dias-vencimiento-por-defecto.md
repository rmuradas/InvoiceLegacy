# Contradicción 02 — Días de vencimiento por defecto: constante compartida en un camino, literal copiado en otro

**Fase**: Caracterización (reconocimiento del sistema tal y como existe hoy).
**Fecha del análisis**: 2026-09-30.
**Método**: comparación línea a línea de las dos expresiones del repositorio
que calculan "días de pago del cliente, o un valor por defecto si no tiene
asignado", verificando qué fuente usa cada una para ese valor por defecto y
qué ocurriría si esa fuente cambiara. Documento derivado de una observación ya
apuntada en [flujo-factura.md §5.2](flujo-factura.md#52-vencimiento-constante-de-configuración-en-un-camino-literal-en-otro);
este documento la desarrolla en el formato de contradicción, con foco en el
escenario concreto que la haría manifestarse.

> Nota de alcance: este documento **no** decide cuál valor por defecto debería
> usarse ni si la duplicación debe eliminarse. Documenta el hecho y construye
> el escenario en que produciría resultados distintos.

---

## 1. Implementaciones implicadas

**Implementación A** — `routes/facturas.js`, Camino A (creación manual de
factura desde la web):

```js
var dias = cliente.dias_pago || config.VENCIMIENTO_DIAS;
var vencimiento = util.sumarDias(fecha, dias);
```
([routes/facturas.js:68-69](../../routes/facturas.js#L68-L69)), donde
`config.VENCIMIENTO_DIAS` es una constante nombrada, definida una sola vez:

```js
// dias de vencimiento por defecto si el cliente no tiene forma de pago
VENCIMIENTO_DIAS: 30
```
([config.js:39-40](../../config.js#L39-L40)).

**Implementación B** — `scripts/remesa_mensual.js`, Camino B (remesa mensual
de contratos):

```js
var venc = util.sumarDias(fecha, co.dias_pago || 30);
```
([scripts/remesa_mensual.js:60](../../scripts/remesa_mensual.js#L60)) — el
`30` está escrito directamente como literal en el script.

Evidencia de que B no referencia la constante compartida: las únicas
dependencias que `scripts/remesa_mensual.js` importa son `db`, `lib/util`,
`services/calculo` y `lib/numeracion`
([scripts/remesa_mensual.js:9-12](../../scripts/remesa_mensual.js#L9-L12)) —
**el fichero nunca hace `require('../config')`**, así que ni siquiera tiene
acceso a `config.VENCIMIENTO_DIAS` aunque quisiera usarla sin modificar sus
imports.

Camino C (rectificación) no calcula ningún vencimiento
(`vencimiento: null`, [routes/facturas.js:142](../../routes/facturas.js#L142)),
por lo que no participa de esta contradicción.

---

## 2. ¿Misma convención? Comparación paso a paso

| Aspecto | Implementación A | Implementación B |
|---|---|---|
| Regla de negocio | "días de pago del cliente/contrato, o 30 por defecto si no tiene" | Idéntica en su enunciado |
| Operador usado | `||` de JavaScript | `||` de JavaScript — idéntico, con el mismo efecto colateral de tratar `0` como "no asignado" (ver [reglas-de-negocio.md RN-11](reglas-de-negocio.md#rn-11--fecha-de-vencimiento-días-de-pago-del-cliente-o-30-días-por-defecto)) |
| Fuente del valor por defecto | `config.VENCIMIENTO_DIAS` — una única constante con nombre, importable y modificable en un solo sitio | El literal `30` tecleado directamente en el script |
| Nº de fuentes de verdad para "30 días por defecto" | — | Son **dos fuentes independientes** para el mismo concepto de negocio |

El enunciado de la regla es idéntico letra por letra (incluido el mismo
efecto colateral del operador `||` sobre el valor `0`), lo que sugiere que B
se escribió copiando o imitando el patrón de A. La diferencia no está en la
lógica de la expresión sino en **de dónde saca el número 30**: una constante
nombrada y centralizada, frente a un literal suelto sin relación declarada
con esa constante.

---

## 3. Ejemplo concreto con resultado distinto para la misma entrada

**Hoy, con los valores actuales, A y B no divergen**: `config.VENCIMIENTO_DIAS`
vale `30` ([config.js:40](../../config.js#L40)) y el literal de B también es
`30` — los dos caminos calculan exactamente la misma fecha de vencimiento para
un cliente/contrato sin días de pago propios.

La divergencia es **latente**, no manifestada todavía en ningún dato real, y
se construye así:

- Supóngase que el negocio decide cambiar el plazo de pago por defecto a 45
  días y alguien actualiza `config.js:40` a `VENCIMIENTO_DIAS: 45` (el único
  cambio que, por diseño, "debería" bastar — es exactamente para eso que la
  constante existe y está centralizada en un fichero que, según su propio
  comentario, se copia a mano al servidor cuando cambia algo,
  [config.js:2-3](../../config.js#L2-L3)).
- **Camino A** recoge el cambio automáticamente: cualquier factura nueva de
  un cliente sin `dias_pago` propio vencerá a 45 días.
- **Camino B** sigue calculando 30 días, porque su `30` nunca dependió de
  `config.js`.

Ejemplo con un cliente real de la carga inicial que **sí** pasa regularmente
por ambos caminos — cliente 1, "Cafetería La Parada, S.C." (`dias_pago =
null`, [db.js:96](../../db.js#L96)), que tiene un contrato activo de cuota
mensual (`Alquiler máquina de café Futurmat F3`,
[db.js:116](../../db.js#L116)) facturado por la remesa cada mes
([db.js:126](../../db.js#L126), factura `FA-2026-000101` de enero;
[db.js:168](../../db.js#L168), factura `FA-2026-000108` de mayo):

| Camino | Fecha factura | Vencimiento con `VENCIMIENTO_DIAS = 30` (hoy) | Vencimiento si `VENCIMIENTO_DIAS` pasara a 45 |
|---|---|---|---|
| A (manual, si se le facturara algo suelto) | 2026-07-01 | 2026-07-31 | **2026-08-15** |
| B (remesa, su cuota mensual real) | 2026-07-01 | 2026-07-31 | **2026-07-31** (sin cambio) |

Mismo cliente, mismo tipo de concepto recurrente, mismo mes: 15 días de
diferencia en el vencimiento según qué camino generó la factura, el día en
que alguien cambie una única constante pensando que afecta a todo el sistema.

---

## 4. Cuándo se manifiesta la divergencia y cuándo coinciden

**Coinciden siempre hoy**, y han coincidido desde el origen del sistema:
no hay evidencia (ni en el código ni en
[memoria-historica.md](memoria-historica.md)) de que
`config.VENCIMIENTO_DIAS` se haya modificado nunca desde que existe. Por
eso esta duplicación lleva "dormida" — invisible — desde que Roberto escribió
`scripts/remesa_mensual.js` en 2021: nunca ha habido un motivo para tocar el
valor por defecto de vencimiento, así que el hecho de que B no lea la
constante no ha tenido ninguna consecuencia observable todavía.

**Se manifestaría** en el momento exacto en que alguien cambiara
`config.VENCIMIENTO_DIAS` esperando que el cambio afectara a "todas las
facturas nuevas", sin saber que el script de remesa (que genera buena parte
de la facturación recurrente, según
[mapa-sistema.md](mapa-sistema.md#scriptsremesa_mensualjs)) no lo consulta.
Es exactamente el tipo de fallo silencioso que solo aparece cuando cambia una
configuración que "en teoría" es la única fuente de verdad.

---

## 5. Historia probable

- `config.VENCIMIENTO_DIAS` pertenece al núcleo original de `routes/facturas.js`
  (Camino A), que según `server.js` data de la reescritura de 2017
  ([server.js:7](../../server.js#L7), "v2.0 (2017): reescritura del gesfact
  1.x (Access) en node"; ver también
  [memoria-historica.md H1](memoria-historica.md#h1--2017-reescritura-completa-del-sistema-anterior-access-en-node)).
  Es razonable asumir que se diseñó desde el principio como constante
  centralizada, junto con el resto de datos de configuración de empresa.
- `scripts/remesa_mensual.js` es de 2021, obra de Roberto
  ([memoria-historica.md H15](memoria-historica.md#h15--verano-2021-roberto-becario-automatiza-la-remesa-mensual-de-cuotas)).
  El hecho de que el script ni siquiera importe `config.js` (a diferencia de
  `routes/facturas.js`, que sí lo hace,
  [routes/facturas.js:12](../../routes/facturas.js#L12)) sugiere que, al
  escribir la lógica de vencimiento de la remesa, Roberto reprodujo de
  memoria el número "30 días" como dato conocido del negocio, sin pararse a
  importar y reutilizar la constante ya existente en `config.js` — un patrón
  consistente con el mismo origen que la Contradicción 01 (prorrateo):
  automatización nueva escrita sin cruzar referencias con el código ya
  existente que resuelve un concepto equivalente.

---

## Pregunta para el guion de entrevista

Si algún día cambia el plazo de pago por defecto de la empresa (hoy 30 días),
¿sabe el negocio que ese cambio en `config.js` **no** afectaría a las
facturas generadas por la remesa mensual automática, que seguiría aplicando
30 días fijos salvo que también se edite `scripts/remesa_mensual.js` por
separado?
