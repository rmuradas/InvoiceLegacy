# Contradicción 04 — Cierre de un periodo mensual: cálculo real en un sitio, constante "31" fija en otro

**Fase**: Caracterización (reconocimiento del sistema tal y como existe hoy).
**Fecha del análisis**: 2026-09-30.
**Método**: comparación de las dos técnicas del repositorio que necesitan
determinar "el último día de un mes" para acotar un periodo, verificando con
qué valor concreto resuelve cada una la misma entrada. A diferencia de las
Contradicciones 01-03, aquí el efecto práctico actual (qué facturas quedan
dentro de un trimestre) **no** cambia entre ambas técnicas — la divergencia es
de valor y de método, no (todavía) de resultado visible — por lo que se marca
así explícitamente en el punto 3. Relacionado con
[reglas-de-negocio.md RN-29](reglas-de-negocio.md#rn-29--los-tramos-trimestrales-usan-meses-de-calendario-fijos-con-el-día-de-cierre-codificado-siempre-como-31),
que ya señala el riesgo desde el ángulo de "constante mágica"; este documento
lo reencuadra como una duplicación del mismo concepto de negocio ("fin de un
periodo mensual") resuelta de dos formas incompatibles.

> Nota de alcance: este documento **no** decide si debe corregirse ni cómo.
> Documenta la duplicación y construye el ejemplo donde el **valor** calculado
> difiere, aunque el resultado de la consulta no lo haga hoy.

---

## 1. Implementaciones implicadas

**Implementación A — cálculo real del fin de mes**: `lib/util.js` →
`diasDelMes(fecha)` ([lib/util.js:36-39](../../lib/util.js#L36-L39)):

```js
function diasDelMes(fecha) {
  var p = fecha.split('-');
  return new Date(parseInt(p[0], 10), parseInt(p[1], 10), 0).getDate();
}
```

Usada por `scripts/remesa_mensual.js` para fijar el último día real del mes
que se factura: `var ultimoDia = mes + '-' + util.diasDelMes(mes + '-01');`
([scripts/remesa_mensual.js:21](../../scripts/remesa_mensual.js#L21)), y
también dentro del propio cálculo de prorrateo de ese script
([scripts/remesa_mensual.js:47](../../scripts/remesa_mensual.js#L47), ver
Contradicción 01).

**Implementación B — constante fija "31"**: `routes/informes.js`, resumen de
IVA trimestral ([routes/informes.js:14-19](../../routes/informes.js#L14-L19)):

```js
var meses = { 1: ['01', '03'], 2: ['04', '06'], 3: ['07', '09'], 4: ['10', '12'] };
var desde = anyo + '-' + meses[t][0] + '-01';
var hasta = anyo + '-' + meses[t][1] + '-31';
```

El límite superior del trimestre se construye siempre con el literal `'31'`
como día de cierre del último mes del trimestre, sin llamar a `diasDelMes` ni
a ninguna otra función que calcule cuántos días tiene realmente ese mes.

Una tercera forma más, para contraste (no es objeto central de esta
contradicción, pero muestra que el propio fichero de informes resuelve "qué
factura cae en este periodo" de una tercera manera distinta todavía): la
exportación CSV anual del mismo fichero no usa límites de mes en absoluto,
sino un filtro de texto por año completo:
`"WHERE f.fecha LIKE ?", [anyo + '-%']`
([routes/informes.js:38](../../routes/informes.js#L38)).

---

## 2. ¿Misma convención? Comparación paso a paso

| Aspecto | Implementación A (`diasDelMes`) | Implementación B (informe de IVA) |
|---|---|---|
| Qué calcula | El número real de días del mes (28/29/30/31), usando aritmética de fechas (`new Date(año, mes, 0)`) | Un literal de texto `'31'`, igual para los 4 trimestres, sin cálculo alguno |
| Corrección para meses de 30 días (abril, junio, septiembre, noviembre) | Correcta: devuelve 30 | Incorrecta como *fecha*: produce el literal `'AAAA-06-31'`, una fecha que no existe en el calendario |
| Corrección para febrero (28/29 días) | Correcta, incluye el año bisiesto | Igual de "incorrecta": produce `'AAAA-02-31'`, inexistente |
| Por qué no falla en la práctica hoy | No aplica — siempre es correcta | Porque la comparación que la usa (`f.fecha >= desde AND f.fecha <= hasta`) se hace sobre **cadenas de texto** `YYYY-MM-DD`, no sobre fechas reales; una cadena `'AAAA-06-31'`, aunque no exista como fecha, sigue ordenando alfabéticamente por encima de cualquier fecha real de ese mes |

No es la misma convención ni el mismo método: A resuelve el concepto "fin de
mes" con una función general y correcta para cualquier entrada; B lo resuelve
con un atajo que solo "funciona" gracias a una propiedad incidental del
formato de almacenamiento (que el texto `YYYY-MM-DD` ordena igual que las
fechas reales). Son dos técnicas incompatibles para la misma pregunta de
negocio ("¿cuál es el último día de este mes/periodo?").

---

## 3. Ejemplo concreto: mismo mes, valor distinto (el resultado de la consulta no cambia, el valor sí)

Para la entrada "junio de 2026" (mes de 30 días):

- **A** (`diasDelMes('2026-06-01')`) devuelve `30` → fecha de cierre real:
  **`2026-06-30`**.
- **B** (informe de IVA, trimestre 2) construye el límite como
  **`2026-06-31`** — una fecha que no existe en ningún calendario.

Es un resultado concretamente distinto para la misma entrada ("¿cuál es el
día de cierre de junio de 2026?"): 30 frente a 31. Donde esta contradicción
se diferencia de las anteriores es en que, **con los datos y el motor de
almacenamiento actuales, esa diferencia no cambia qué facturas quedan
incluidas**: la factura real `FA-2026-000108`, fechada `2026-05-31`
([db.js:168](../../db.js#L168)), sigue entrando correctamente en el trimestre
2 con el límite `'2026-06-31'` porque `'2026-05-31' <= '2026-06-31'` es cierto
como comparación de texto (el mismo razonamiento que ya documenta
[RN-29](reglas-de-negocio.md#rn-29--los-tramos-trimestrales-usan-meses-de-calendario-fijos-con-el-día-de-cierre-codificado-siempre-como-31)).
Ninguna factura real queda nunca excluida por error gracias a esta
coincidencia del formato de texto.

La divergencia real y verificable no está, por tanto, en qué facturas se
incluyen hoy, sino en que **el sistema contiene dos respuestas distintas e
incompatibles a la misma pregunta de negocio**, y solo una de ellas (A) sigue
siendo correcta si cambiara la representación de la fecha (ver punto 4).

---

## 4. Cuándo se manifestaría un resultado distinto y cuándo coinciden

**Coinciden en el resultado observable de la consulta** mientras se cumplan
dos condiciones que hoy se cumplen siempre: (a) la columna `fecha` se guarda
como texto `TEXT` en formato `YYYY-MM-DD`
([db.js:55](../../db.js#L55)), y (b) la comparación en SQL se hace como
comparación de cadenas (el comportamiento por defecto de SQLite sobre una
columna `TEXT`). Ambas son ciertas hoy en todo el sistema.

**Divergirían en resultado observable**, no solo en valor interno, si
cambiara cualquiera de esas dos condiciones — escenarios nada descabellados
dado el propio histórico del proyecto:
- Si la migración a MySQL, planteada ya en 2018 y dejada pendiente
  ([memoria-historica.md H4](memoria-historica.md#h4--2018-sin-mes-preciso-migración-a-mysql-queda-pendiente-sin-prisa);
  [datos/migracion_mysql_2018.sql](../../datos/migracion_mysql_2018.sql))
  se retomara alguna vez y `fecha` pasara a ser una columna de tipo fecha
  real en vez de texto, una comparación contra el valor literal
  `'2026-06-31'` podría directamente fallar o ser rechazada por el motor,
  mientras que el código que usa `diasDelMes` seguiría funcionando sin
  cambios porque nunca produce una fecha inexistente.
- Si alguna vez se cambiara el formato de fecha almacenado (por ejemplo a
  `DD/MM/YYYY`, que es como ya se muestra en pantalla vía `fechaBonita`), la
  comparación de cadenas dejaría de ordenar correctamente y la coincidencia
  actual desaparecería.

Por qué no se ha detectado: el valor `hasta` de esta consulta nunca se
muestra en pantalla (se usa solo como parámetro interno de la consulta SQL,
[routes/informes.js:23-26](../../routes/informes.js#L23-L26); las vistas
`informes.ejs` e `informe_iva.ejs` no imprimen el rango de fechas consultado
en ningún punto), por lo que nadie ve nunca literalmente el texto
"31/06/2026" en una pantalla que pudiera delatar el problema — la
coincidencia con el formato de texto lo mantiene invisible tanto para quien
revisa el resultado (los importes del resumen de IVA son correctos) como
para quien revisa la pantalla (no hay fecha inexistente que se llegue a
imprimir).

---

## 5. Historia probable

- `diasDelMes` es una utilidad general de `lib/util.js`, con el mismo origen
  probable que el resto de funciones de ese fichero (posiblemente heredada o
  adaptada del sistema Access anterior a 2017, según el aviso genérico del
  encabezado, [lib/util.js:1-2](../../lib/util.js#L1-L2)), aunque no hay
  comentario específico que fije su fecha de creación.
- El resumen de IVA trimestral y la exportación CSV se incorporaron juntos en
  la versión 2.3 de 2019
  ([server.js:5](../../server.js#L5); [memoria-historica.md H8](memoria-historica.md#h8--2019-se-añaden-los-informes-de-iva-y-la-exportación-a-la-gestoría)),
  con el formato de exportación pactado explícitamente con Puri, de la
  gestoría ([memoria-historica.md H12](memoria-historica.md#h12--2019-formato-de-exportación-csv-acordado-con-puri)).
  No hay ningún comentario que documente por qué el cierre de trimestre se
  escribió con un literal "31" en vez de reutilizar `diasDelMes` (que ya
  existía, dado que otras partes del sistema de esa época la usan); la
  hipótesis más simple es que quien escribió esta consulta concreta trató el
  límite superior como "una fecha suficientemente alta para no excluir nada
  de ese mes" en vez de como "el último día real de ese mes", y como la
  comparación de texto lo permite sin fallar nunca, el atajo nunca se puso a
  prueba ni se corrigió.

---

## Pregunta para el guion de entrevista

¿Es consciente el negocio de que el cierre de cada trimestre en el resumen de
IVA se calcula con un "31" fijo que no es una fecha real en la mitad de los
meses del año, y de que esto solo funciona hoy porque las fechas se comparan
como texto? ¿Se ha planteado alguna vez cambiar el formato de almacenamiento
de fechas o migrar a otro motor de base de datos (la migración a MySQL de
2018 sigue mencionada como pendiente en `LEEME.txt`), lo que rompería esta
coincidencia?
