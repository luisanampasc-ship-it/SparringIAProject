# Sparring IA

Plataforma de entrenamiento comercial con IA: analiza llamadas de venta reales, puntúa a cada comercial con una rúbrica configurable, da feedback accionable y permite practicar con prospectos de IA por voz.

> **Estado actual:** sin variables de entorno, todas las pantallas funcionan en modo demo con datos de ejemplo. Con Supabase, ElevenLabs y Claude configurados se activan los usuarios y datos reales, la voz real del simulador y la lectura de webs con IA (ver [Hoja de ruta](#hoja-de-ruta)).

## Funcionalidades

| Sección | Qué incluye |
| --- | --- |
| **Simulador IA** (módulo 1, página inicial) | Catálogo de prospectos con cara ilustrada (o foto subida) y búsqueda; creación con asistente IA, configuración manual, desde web o desde grabación; dificultad y tipo de llamada; sesión de voz con detección de turnos (el prospecto espera a que termines de hablar y se calla si le interrumpes) y botón «He terminado»; límite mensual de minutos por colaborador; análisis automático al colgar. |
| **Dashboard** | KPIs con comparación frente al período anterior, resumen para el gerente, insights de la semana, evolución con 6 métricas y párrafo interpretativo bajo cada gráfico, comparativa del equipo con detalle por comercial, dispersión del score y cuadro de fortalezas y debilidades del equipo y de cada integrante. |
| **Centro de Entrenamiento** | *Métricas generales*: embudo, tipos de llamada, calidad del prospecto y evolución interpretada. *Habilidades técnicas · Objeciones*: top de objeciones, frases repetidas, matriz por comercial, guiones sugeridos y skills técnicas. *Estrategias de venta*: speech por perfil de cliente (analítico, directo, expresivo, amable) y estrategia por tipo de llamada. *Habilidades blandas*: % por persona y equipo, análisis de confiabilidad, oratoria y muletillas. *Aspectos de mejora*: top 5 a mejorar, errores frecuentes, dónde entrenar y momentos clave. |
| **Centro de Llamadas** | Biblioteca filtrable y agrupada por fecha, selección múltiple (reanalizar/eliminar), subida de audio (MP3, MP4, M4A, WAV, WebM, OGG, MOV; máx. 18 MB) o transcripción pegada. Detalle con reproductor con forma de onda, pestañas Resumen / Feedback / Transcripción, cambio manual de resultado, historial de versiones, edición, acciones rápidas y notas con guardado automático. |
| **Criterios** | Score global y por categoría, evolución por rúbrica, editor de pesos por tipo de llamada (validación del 100%) que recalcula las puntuaciones, y skills granulares. |
| **Integraciones / Equipo / Cuenta** | Conectores (Zoom, Meet, Teams, Fathom, Fireflies, Aircall, HubSpot, Pipedrive, Calendly, Slack, webhook), gestión de miembros e invitaciones con límite de minutos de simulador por colaborador, perfil, plan, créditos y preferencias. |
| **Global** | Buscador ⌘K, selector de rango (1W/1M/3M/6M/YTD o personalizado), modo claro/oscuro, notificaciones activas/archivadas, diseño responsive. |

## Stack

- [Next.js 15](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS v4 con tokens de color para claro/oscuro (`src/app/globals.css`), basados en la paleta del HPE Design System (paquete `hpe-design-tokens`)
- Recharts (gráficos), lucide-react (íconos), next-themes (tema)

## Ejecutar en local

```bash
npm install
npm run dev
# abre http://localhost:3000
```

Otros comandos: `npm run build`, `npm run lint`.

## Desplegar en Vercel

1. Sube el código a GitHub (este repo).
2. En [vercel.com/new](https://vercel.com/new) importa el repositorio `SparringIAProject`.
3. Vercel detecta Next.js automáticamente: deja los valores por defecto y pulsa **Deploy**.
4. Cada `git push` a `main` vuelve a desplegar. Las ramas generan *preview deployments*.

En esta versión no hacen falta variables de entorno. Cuando conectes los servicios reales, cópialas desde `.env.example` a **Settings → Environment Variables** en Vercel.

## Estructura

```
src/
  app/
    (app)/            # rutas con sidebar + topbar
      simulador/ dashboard/ entrenamiento/ llamadas/
      criterios/ integraciones/ equipo/ cuenta/
    globals.css       # tokens de diseño (claro/oscuro)
  components/
    app-state.tsx     # estado global (sesiones, rúbricas, créditos, notificaciones)
    shell/            # sidebar, topbar, selector de fechas, logo
    calls/            # biblioteca, subida, detalle, reproductor
    simulator/        # creación de prospectos, configuración y llamada
    team.tsx          # insights, comparativa, fortalezas/debilidades, interpretaciones
    training-center.tsx # pestañas del Centro de Entrenamiento
    persona-face.tsx  # caras ilustradas de los prospectos
    ui.tsx charts.tsx filters.tsx objection-script.tsx
  lib/
    types.ts          # modelo de datos
    catalog.ts        # reps, prospectos, skills, rúbricas, integraciones
    demo-data.ts      # generador determinista de datos demo + simulación del análisis
    analytics.ts      # agregaciones para dashboards
    insights.ts       # interpretación de gráficos, habilidades blandas, muletillas, fortalezas
    strategies.ts     # perfiles de cliente y estrategias por tipo de llamada
```

## Hoja de ruta

Los puntos donde hoy hay simulación están marcados en el código con comentarios `En producción…`.

1. **Supabase** (Fase A integrada; se activa con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`):
   - Esquema en `supabase/migrations/0001_init.sql`: `organizations`, `members`, `invites`, `personas`, `sessions` (sesión completa en JSON), `session_notes` y el bucket privado `recordings`.
   - Seguridad por filas (RLS): cada organización solo ve lo suyo; los comerciales ven sus sesiones y admin/manager todas; solo el admin cambia roles y límites de minutos.
   - Alta: email y contraseña (`/login`). Quien se registra crea su organización y queda como admin; los invitados (`/api/team/invite`, desde Equipo) se unen a la organización que los invitó.
   - Carga y guardado en `src/components/app-state.tsx` + `src/lib/supabase/data.ts`; el middleware (`src/middleware.ts`) refresca la sesión y envía al login.
   - Las rutas de API exigen sesión y `/api/voice/session` calcula el límite de minutos en el servidor.
   - Pendiente (Fase B): Google, correos personalizados (SMTP propio), varias organizaciones por usuario y migrar créditos/notificaciones.
2. **Pipeline de análisis** (`/api/analyze`): transcripción con diarización (OpenAI `gpt-4o-transcribe`, AssemblyAI o Deepgram) → métricas de tono → LLM con salida JSON validada con Zod usando la rúbrica de la organización → guardar como nueva versión → notificación. Reemplaza `simulateAnalyzedSession` en `src/lib/demo-data.ts`.
3. **Simulador de voz con ElevenLabs Agents** (ya integrado, se activa con `ELEVENLABS_API_KEY`):
   - `/api/voice/session` (servidor) crea o reutiliza el agente "Sparring IA · Prospecto" con permiso para que cada llamada envíe su guion, primer mensaje, idioma y voz; elige una voz con acento peruano según el sexo del prospecto (o las de `ELEVENLABS_VOICE_FEMALE` / `ELEVENLABS_VOICE_MALE`) y devuelve un token temporal de WebRTC. La clave nunca llega al navegador.
   - El guion se construye en `src/lib/prospect-prompt.ts` con la ficha del prospecto, la dificultad, el tipo de llamada y lo que vende el comercial (español de Perú, respuestas cortas, sin romper el personaje).
   - En el navegador (`src/components/simulator/training.tsx`) se usa `@elevenlabs/client`: sus eventos alimentan la transcripción, los turnos y los minutos contados (el tiempo entre que el comercial termina y el prospecto empieza a hablar no cuenta).
   - El modelo de IA del agente se puede cambiar en el panel de ElevenLabs (por ejemplo, un modelo de Claude rápido para menor latencia).
   - Sin la clave, o si ElevenLabs falla, el simulador sigue en modo demo con la voz del navegador.
   - Pendiente: validar el límite de minutos en el servidor con la base de datos (hoy lo envía el cliente).
4. **Generación de prospectos**: desde descripción o desde audio (hoy con las reglas de `src/lib/persona-generator.ts`), y desde web, que ya funciona en `/api/personas/from-web`:
   - Lee la portada y hasta 4 páginas internas («Nosotros», «Servicios», «Equipo»…) de la web indicada, solo URLs públicas http(s).
   - Con `ANTHROPIC_API_KEY` usa Claude para extraer rubro, qué vende, a quién y el equipo directivo publicado; sin la clave usa reglas sencillas.
   - Nombre del prospecto: el contacto que escriba el comercial > un directivo que aparezca en la web > nombre ficticio. Si es un nombre real, la descripción indica que se basa en información pública y que la personalidad y las objeciones son simuladas.
   - **Pendiente (fase 2): Apollo.** Conectar un proveedor de datos B2B (Apollo u otro similar, con API de pago) para obtener decisores reales a partir del dominio. No se extraen datos de LinkedIn porque sus condiciones lo prohíben.
5. **Exportar PDF** (hecho): transcripción o informe completo, generados en el navegador con `@react-pdf/renderer` (`src/components/calls/pdf-report.tsx`). Pendiente: logo de la organización en la cabecera.
6. **Integraciones**: webhook `/api/ingest` con API key, OAuth de Zoom/HubSpot, alertas en Slack.
7. **Créditos y pagos** con Stripe.
8. **Insights semanales** del Dashboard con un Vercel Cron; los párrafos interpretativos de `src/lib/insights.ts` pueden pasar a generarse con un LLM.
