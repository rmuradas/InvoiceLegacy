# Contradicción 03 — Formato de importe en pantalla: función común en unas vistas, `toFixed` crudo en otras

**Fase**: Caracterización (reconocimiento del sistema tal y como existe hoy).
**Fecha del análisis**: 2026-09-30.
**Método**: búsqueda de todo uso de `toFixed` y de `util.formatearImporte`
en rutas y vistas (`grep` sobre `*.js` y `*.ejs` en todo el repositorio),
confirmando para cada aparición qué datos recibe la vista desde su ruta y si
`util` está entre ellos. No documentado como tal en los ficheros de
reconocimiento previos (que se centran en el cálculo, no en el formato de
salida) — es un hallazgo nuevo de este barrido.

> Nota de alcance: este documento **no** decide qué formato es el correcto ni
> corrige ninguna vista. Documenta la duplicación de la función de negocio
> "mostrar un importe en pantalla" y construye los ejemplos donde produce
> salidas distintas para el mismo dato.

---

## 1. Implementaciones implicadas

**Implementación A — la función común**: `lib/util.js` → `formatearImporte(x)`
([lib/util.js:51-58](../../lib/util.js#L51-L58)):

```js
function formatearImporte(x) {
  if (x === null || x === undefined || isNaN(x)) return '0,00';
  var neg = x < 0;
  var s = Math.abs(x).toFixed(2);
  var partes = s.split('.');
  var entero = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + entero + ',' + partes[1];
}
```

Usada de forma consistente en:
- `views/informe_iva.ejs:7-14` (resumen de IVA trimestral).
- `views/factura_detalle.ejs:28-40` (la propia factura, documento legal).
- `views/facturas.ejs:19` (listado de facturas).
- `routes/informes.js:43-45` (exportación CSV a la gestoría).

**Implementación B — `toFixed(2)` crudo sobre el número**, sin pasar por
`formatearImporte`, en tres pantallas de la misma aplicación:
- `views/index.ejs:6` — indicador "Importe pendiente de cobro" del panel de
  inicio: `<%= importePendiente.toFixed(2) %> &euro;`.
- `views/articulos.ejs:8` — columna "Precio" del catálogo:
  `<%= a.precio.toFixed(2) %>`.
- `views/contratos.ejs:8` — columna "Cuota/mes" del listado de contratos:
  `<%= co.cuota.toFixed(2) %>`.

Una cuarta aparición, de menor peso por no ser pantalla sino consola interna:
`scripts/remesa_mensual.js:71` — `console.log('  ' + numero + '  ' +
co.nombre + '  ' + calc.total.toFixed(2) + ' eur')`, el mensaje de progreso
que ve Marga al lanzar la remesa manualmente.

---

## 2. ¿Misma convención? Comparación paso a paso

| Aspecto | `formatearImporte` (A) | `toFixed(2)` crudo (B) |
|---|---|---|
| Precisión decimal | 2 decimales, con redondeo | 2 decimales, con redondeo — igual |
| Separador decimal | Coma (`,`) | Punto (`.`) — nativo de JS, **distinto** |
| Separador de miles | Punto (`.`) cada 3 cifras | Ninguno — **distinto** |
| Signo negativo | `-` delante del número | `-` delante del número — igual |
| Valores `null`/`NaN` | Se convierten a `'0,00'` | `NaN.toFixed(2)` da el string `'NaN'`, mostrado tal cual |

Coinciden en la precisión y en el signo; **divergen en el carácter decimal y
en la ausencia total de separador de miles** — es decir, en la convención de
formato español (coma decimal, punto de millares) frente al formato nativo de
JavaScript (punto decimal, sin millares), que es precisamente la convención
que `formatearImporte` existe para corregir (ver
[reglas-de-negocio.md RN-14](reglas-de-negocio.md#rn-14--formato-de-importe-separador-de-miles-con-punto-decimales-con-coma)).

---

## 3. Ejemplos concretos con resultados distintos, con datos reales de producción

**Panel de inicio** — el indicador "Importe pendiente de cobro" se calcula en
`server.js:24` como la suma de las facturas `FA` en estado `emitida`; con los
datos reales de la carga inicial ese valor es
**3.032,85 €** (2.756,38 + 122,23 + 154,24, según
[reglas-de-negocio.md RN-33](reglas-de-negocio.md#rn-33--importe-pendiente-de-cobro-solo-suma-la-serie-fa-a-diferencia-del-recuento-de-rn-32)).
En la misma pantalla de inicio, con el código actual, ese número se renderiza
literalmente como:

```
3032.85 €
```

mientras que si pasara por `formatearImporte` (como pasa el mismo tipo de
cifra en cualquier factura) se vería:

```
3.032,85 €
```

**Catálogo de artículos** — "Aceite de oliva virgen extra 5L", precio 27,45 €
([db.js:107](../../db.js#L107)). En `views/articulos.ejs:8` se muestra como
`27.45`. Ese mismo precio, copiado a una línea de factura real
(`FA-2026-000105`, [db.js:151](../../db.js#L151)), se muestra en
`views/factura_detalle.ejs` como `27,45` (vía `util.formatearImporte`,
[views/factura_detalle.ejs:28](../../views/factura_detalle.ejs#L28)) — el
mismo número, en la misma aplicación, con dos notaciones decimales distintas
según si se mira el catálogo o la factura.

**Listado de contratos** — "Mantenimiento cámaras frigoríficas", cuota 145,00 €
([db.js:117](../../db.js#L117)). `views/contratos.ejs:8` la muestra como
`145.00`. Esa misma cifra, facturada como línea real en `FA-2026-000105`
([db.js:150](../../db.js#L150)), se ve en la factura como `145,00`.

Este último caso es el más revelador: `routes/contratos.js` **sí** pasa
`util` a la vista (`res.render('contratos', { contratos: contratos, util:
util })`, [routes/contratos.js:12](../../routes/contratos.js#L12)), y la
propia plantilla `contratos.ejs` **ya usa** `util.fechaBonita` en la misma
fila, columna siguiente
([views/contratos.ejs:9](../../views/contratos.ejs#L9)) — es decir, no es que
`util` no esté disponible: la plantilla tenía a mano
`util.formatearImporte(co.cuota)` y en su lugar se escribió
`co.cuota.toFixed(2)` una celda antes.

En cambio, en `views/index.ejs` y `views/articulos.ejs` la causa es
estructural, no solo un olvido de plantilla: ni `server.js` (ruta `GET /`,
[server.js:20-36](../../server.js#L20-L36)) ni `routes/articulos.js` (ruta
`GET /`, [routes/articulos.js:8-13](../../routes/articulos.js#L8-L13)) pasan
`util` como variable de la vista — `formatearImporte` no está ni siquiera al
alcance de esas plantillas sin añadir antes esa dependencia al `render()`.

---

## 4. Cuándo se manifiesta la divergencia y cuándo coinciden

**Se manifiesta siempre**, en el 100% de las cargas de estas tres pantallas
(Inicio, Artículos, Contratos) — no es un caso límite raro, es el
comportamiento por defecto cada vez que alguien abre esas páginas. Ya es
visible con decimales en cualquier importe (punto en vez de coma) y se vuelve
aún más visible a partir de 1.000 € (ausencia de separador de miles, como en
el ejemplo del panel de inicio).

**"Coinciden" solo en el sentido económico** (el número, sin formatear, es el
mismo en ambos casos) pero **nunca coinciden en su representación visual**
para importes con decimales, que es prácticamente cualquier importe del
sistema.

Explicación razonada de por qué no se ha detectado como incidencia formal:
- Las pantallas afectadas (panel de inicio, catálogo, listado de contratos)
  son pantallas **internas** de gestión, no el documento legal que ve el
  cliente ni el fichero que procesa la gestoría — las dos vistas donde sí
  importa "salir bien" (`factura_detalle.ejs` y la exportación CSV de
  `routes/informes.js`) usan `formatearImporte` de forma consistente y nunca
  han mostrado el problema.
- No existe ningún proceso de conciliación externo (como el que sí existe
  para el redondeo de facturas frente al Contaplus de la gestoría, ver
  [memoria-historica.md H11](memoria-historica.md#h11--052019-incidente-grave-de-redondeo--la-gestoría-devuelve-todo-el-trimestre))
  que compare estas cifras de pantalla contra una referencia externa y
  pudiera sacar a la luz la inconsistencia de formato.
- Para importes de una sola cifra de miles hacia abajo, un punto en vez de
  una coma como separador decimal puede pasar desapercibido a simple vista
  para quien ya conoce el número que espera ver.

---

## 5. Historia probable

- `formatearImporte` y `fechaBonita` en `lib/util.js` provienen,
  según el propio comentario del fichero ("algunas vienen del gesfact 1.x en
  Access, cuidado al tocar", [lib/util.js:1-2](../../lib/util.js#L1-L2)), de
  las utilidades más antiguas del sistema, adoptadas desde el principio en
  las vistas "serias" de facturación e informes.
- `views/index.ejs`, `views/articulos.ejs` y `views/contratos.ejs` son
  pantallas de administración más sencillas (un panel resumen, un
  mantenimiento de catálogo, un mantenimiento de contratos), y todo apunta a
  que se escribieron con el atajo directo de JavaScript (`toFixed(2)`) sin
  considerarlas parte del "circuito de facturación formal" que sí exige la
  disciplina de `formatearImporte` — reforzado por el hecho de que ni
  `server.js` ni `routes/articulos.js` llegaron siquiera a cablear `util`
  como dependencia de esas vistas, una fricción pequeña pero suficiente para
  que nunca se haya corregido.
- El caso de `views/contratos.ejs` es distinto: ahí `util` sí está disponible
  y sí se usa en la misma fila para la fecha, lo que apunta más a un simple
  descuido puntual al escribir esa plantilla que a una limitación
  estructural.
- El `console.log` de `scripts/remesa_mensual.js:71` es el caso más
  comprensible de los cuatro: es un mensaje de progreso efímero en la
  terminal para que Marga vea que el script avanza mientras se ejecuta
  ([scripts/remesa_mensual.js:7](../../scripts/remesa_mensual.js#L7),
  "se lanza el dia 1 desde el ordenador de Marga"), no un documento que se
  guarde o se envíe a nadie.

---

## Pregunta para el guion de entrevista

¿Es aceptable para administración que el panel de inicio, el catálogo de
artículos y el listado de contratos muestren los importes con punto decimal
y sin separador de miles (formato "1234.56"), mientras que las facturas y los
informes de IVA los muestran con coma decimal y separador de miles (formato
"1.234,56")? ¿Se ha notado alguna vez esta inconsistencia al usar el sistema
día a día?
