<!--
Sync Impact Report
==================
Versión: plantilla sin rellenar → 1.0.0
Tipo de cambio: MAJOR (ratificación inicial de la constitución del proyecto)

Principios añadidos:
  I.   El comportamiento actual es sagrado
  II.  Evidencia obligatoria
  III. Los hallazgos no se corrigen, se registran
  IV.  Cero dependencias nuevas, cero refactors
  V.   Español de España, siempre

Secciones añadidas:
  - Alcance de esta fase (documentar y proteger GesFact, no mejorarlo)
  - Registro de anomalías (estructura y disciplina de clasificación)
  - Flujo de trabajo y puertas de calidad
  - Gobernanza

Secciones eliminadas: ninguna (plantilla base, primera redacción)

Plantillas dependientes:
  ⚠ No se ha verificado la alineación de .specify/templates/plan-template.md,
    spec-template.md, tasks-template.md ni checklist-template.md en esta sesión
    (fuera del alcance de /speckit-constitution; requiere revisión manual antes
    de usarlos en esta fase de caracterización).

Seguimientos pendientes:
  - TODO(RATIFICATION_DATE): se desconoce la fecha real de ratificación por el
    negocio. Se usa la fecha de redacción de este documento (2026-09-30) como
    fecha de ratificación formal del texto; si el negocio ratificó los
    principios verbalmente en una fecha anterior, corregir aquí con evidencia
    (nombre y fecha del testimonio).
-->

# Constitución de GesFact (Fase de Caracterización)

## Contexto y alcance de esta fase

GesFact es el sistema de facturación en producción de Suministros Hidalgo S.L.
(Node.js + Express + EJS + sqlite3, ver [package.json](../../package.json)).
Factura dinero real; la gestoría y otros terceros dependen de sus resultados
exactos, céntimo a céntimo. Esta fase del proyecto tiene un único objetivo:
**documentar y proteger el sistema tal y como existe hoy**, construyendo una
base de conocimiento verificable (incluyendo tests de caracterización) que
permita, en una fase posterior, decidir con criterio qué cambiar. Esta fase
**no** es una fase de mejora, corrección de errores ni refactorización.

## Principios Fundamentales

### I. El comportamiento actual es sagrado

El comportamiento observable de GesFact — cálculos, redondeos, numeración de
facturas, formatos de salida, reglas de IVA, casos límite, incluso los que
parezcan errores — es la referencia de verdad mientras dure esta fase.
NINGÚN cambio de comportamiento observable se introduce sin una decisión
explícita y por escrito del negocio, sin excepción por "parecer" un bug
evidente. Si un comportamiento parece incorrecto, se documenta como tal en el
registro de anomalías (Principio III); no se toca el código para "arreglarlo".
Cualquier modificación de código en esta fase (por ejemplo, instrumentación
para tests de caracterización) debe ser verificada como behavior-preserving
antes y después del cambio.

**Razón**: el sistema mueve dinero real de clientes reales. Un cambio de
comportamiento no autorizado, por bienintencionado que sea, puede descuadrar
facturas ya emitidas, romper la conciliación con la gestoría, o alterar
obligaciones fiscales ya declaradas. Solo el negocio tiene la autoridad y el
contexto para decidir que un comportamiento debe cambiar.

### II. Evidencia obligatoria

Toda afirmación sobre lo que el sistema hace DEBE ir acompañada de su
evidencia, que solo puede ser una de estas tres:
1. Fichero y líneas de código concretas (p. ej. `services/calculo.js:42-58`).
2. Un dato real observado en la base de datos (`datos/gesfact.db`), citando
   la consulta usada y el resultado obtenido.
3. Testimonio directo del negocio, citado con nombre de la persona y fecha
   en que lo dijo.

Ninguna otra fuente es válida como evidencia (no vale "es lo habitual en
estos sistemas", "probablemente", ni inferencias sin verificar contra el
código o los datos). Toda afirmación que no pueda respaldarse con una de
estas tres evidencias se marca explícitamente como **SUPOSICIÓN** en la
documentación, y esa suposición se convierte en una pregunta pendiente de
validar con el negocio — nunca se da por buena en silencio.

**Razón**: en un sistema heredado sin documentación fiable, la memoria
colectiva y la intuición del desarrollador son la principal fuente de bugs de
documentación. Exigir evidencia trazable impide que suposiciones no
verificadas se cuelen como si fueran hechos, y dificulta que las alucinaciones
de un asistente de IA disfracen intuición como conocimiento constatado.

### III. Los hallazgos no se corrigen, se registran

Todo bug, riesgo, deuda técnica o comportamiento extraño descubierto durante
la caracterización se anota en el registro de anomalías del proyecto, con su
clasificación (al menos: tipo, severidad percibida, evidencia según el
Principio II, y módulo/fichero afectado). Corregir un hallazgo —por trivial
o evidente que parezca su arreglo— es una decisión que corresponde al
siguiente módulo/fase del proyecto (cuando el negocio decida qué se corrige,
cuándo y con qué prioridad), no a esta fase de documentación. En esta fase no
se abren pull requests de corrección de bugs descubiertos durante el
análisis.

**Razón**: mezclar "documentar" con "arreglar sobre la marcha" es la forma
más rápida de romper el Principio I sin darse cuenta, y de perder la
trazabilidad de qué cambió y por qué. Separar el registro de la corrección
da al negocio el control explícito sobre el orden y la prioridad de los
cambios.

### IV. Cero dependencias nuevas, cero refactors

Durante esta fase no se añade ningún paquete npm nuevo (ni siquiera como
`devDependency`) y no se reorganiza, renombra ni reestructura código
existente. Los tests de caracterización que se escriban usan exclusivamente
el runner nativo de Node (`node:test`, con `node:assert`), sin librerías de
testing, mocking, ni utilidades externas. Cualquier necesidad detectada de
una dependencia nueva o de un refactor se anota como hallazgo (Principio III)
para que se valore en una fase posterior.

**Razón**: cada dependencia nueva o reorganización de código es una
superficie adicional de riesgo y de posible cambio de comportamiento
involuntario (Principio I), y contradice el objetivo de esta fase, que es
observar y documentar el sistema tal cual, no prepararlo para el futuro.

### V. Español de España, siempre

Toda la documentación, comentarios, nombres de hallazgos, mensajes de commit
relacionados con esta fase y comunicación generada en este proyecto se
redactan en español de España, coherente con el resto del proyecto (código,
vistas EJS, `LEEME.txt`) y con sus usuarios (Suministros Hidalgo S.L.).

**Razón**: el proyecto y su gente ya operan en español de España; introducir
inglés o variantes latinoamericanas de forma inconsistente dificulta la
lectura al negocio, que es quien debe validar los hallazgos y tomar
decisiones sobre ellos.

## Registro de anomalías

- Todo hallazgo (bug, riesgo, rareza, comportamiento no documentado
  previamente) se registra en un documento de anomalías del proyecto,
  identificable y versionado junto con el resto de artefactos de esta fase.
- Cada entrada del registro DEBE incluir, como mínimo: descripción del
  hallazgo, clasificación (tipo/severidad), evidencia según el Principio II,
  fichero(s) y línea(s) afectados, y fecha de detección.
- Las SUPOSICIONES (Principio II) que no se hayan podido confirmar con el
  negocio se listan aparte, como preguntas abiertas, diferenciadas
  claramente de los hallazgos confirmados.
- El registro de anomalías es un artefacto de lectura para el negocio y para
  la fase siguiente del proyecto; no es una lista de tareas de esta fase.

## Flujo de trabajo y puertas de calidad

- Antes de documentar cualquier comportamiento, se busca su evidencia
  (Principio II); si no se encuentra evidencia directa, se marca como
  SUPOSICIÓN y se convierte en pregunta para el negocio.
- Los tests de caracterización se escriben para constatar el comportamiento
  actual (incluidos los casos que parecen erróneos), no para validar el
  comportamiento "correcto" esperado. Un test de caracterización que falla
  documenta una discrepancia con lo observado y debe resolverse corrigiendo
  el test (para que refleje la realidad), nunca cambiando el código de
  producción bajo esta fase.
- Cualquier tarea que implique instalar un paquete, reorganizar ficheros, o
  cambiar un resultado observable del sistema queda fuera del alcance de
  esta fase y se deriva como hallazgo o como petición explícita al negocio.
- Antes de cerrar cualquier hallazgo como "confirmado", debe tener evidencia
  verificable adjunta; si solo hay una sospecha razonada, queda como
  SUPOSICIÓN/pregunta abierta.

## Gobernanza

Esta constitución prevalece sobre cualquier otra práctica o preferencia
individual durante la fase de caracterización de GesFact. En caso de
conflicto entre una instrucción de trabajo y esta constitución, prevalece la
constitución, y la discrepancia se plantea al negocio antes de continuar.

**Enmiendas**: cualquier cambio a esta constitución requiere una decisión
explícita y documentada (quién la pide, por qué, y con qué evidencia o
mandato del negocio), se registra en este mismo fichero mediante el
"Sync Impact Report" al inicio, y actualiza la versión conforme a semántica
de versiones:
- MAJOR: eliminación o redefinición incompatible de un principio existente.
- MINOR: incorporación de un principio o sección nueva, o ampliación
  material de una guía existente.
- PATCH: aclaraciones, correcciones de redacción o cambios no semánticos.

**Cumplimiento**: cualquier artefacto producido en esta fase (documentación,
tests de caracterización, registro de anomalías) debe poder verificarse
contra estos cinco principios antes de darse por válido. La ausencia de
evidencia, la introducción de una dependencia nueva, un refactor no
solicitado, o la corrección silenciosa de un hallazgo son motivo de rechazo
del artefacto, no de su aceptación con reservas.

**Version**: 1.0.0 | **Ratified**: 2026-09-30 | **Last Amended**: 2026-09-30
