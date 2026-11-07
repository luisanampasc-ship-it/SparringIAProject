# Sparring IA

Plataforma de entrenamiento comercial con IA: analiza llamadas de venta reales, puntúa a cada comercial con una rúbrica configurable, da feedback accionable y permite practicar con prospectos de IA por voz.

> **Estado actual: v0.1 — UI completa con datos demo.** Todas las pantallas funcionan en el navegador con datos de ejemplo generados en el cliente. El siguiente paso es conectar Supabase (auth, base de datos y storage) y los proveedores de IA (ver [Hoja de ruta](#hoja-de-ruta)).

## Funcionalidades

| Sección | Qué incluye |
| --- | --- |
| **Dashboard** | KPIs (puntuación media, sesiones, tasa de éxito, manejo de objeciones), evolución del rendimiento con 6 métricas, actividad del equipo y desglose por tipo de sesión. Filtros por tipo (combinado/real/roleplay), comercial y rango de fechas. |
| **Métricas** | *Resultados*: titular dinámico, embudo de conversión, tabla por tipo de llamada, calidad del prospecto → cierre, top de objeciones y evolución. *Objeciones*: ranking con calidad de manejo y guiones sugeridos de 3 pasos. *Habilidades*: top 5 dominadas / a mejorar con tooltips y momentos clave recientes. |
| **Llamadas** | Biblioteca filtrable y agrupada por fecha, selección múltiple (reanalizar/eliminar), subida de audio (MP3, MP4, M4A, WAV, WebM, OGG, MOV; máx. 18 MB) o transcripción pegada. Detalle con reproductor con forma de onda, pestañas Resumen / Feedback / Transcripción, cambio manual de resultado, historial de versiones, edición, acciones rápidas (copiar enlace, transcripción, resumen IA, exportar PDF) y notas con guardado automático. |
| **Panel Manager** | Insights automáticos de la semana, KPIs con sparkline y comparación con el período anterior, comparativa del equipo (con detalle por comercial), "Dónde entrenar" y evolución del score con banda de dispersión. |
| **Simulador IA** | Catálogo de prospectos con búsqueda y filtros; creación con asistente IA, configuración manual, desde web o desde grabación; configuración de dificultad y tipo de llamada; sesión de voz con micrófono, temporizador y consumo de créditos; análisis automático al colgar. |
| **Criterios** | Score global y por categoría, evolución por rúbrica, editor de pesos por tipo de llamada (validación del 100%) que recalcula las puntuaciones, y skills granulares. |
| **Integraciones / Equipo / Cuenta** | Conectores (Zoom, Meet, Teams, Fathom, Fireflies, Aircall, HubSpot, Pipedrive, Calendly, Slack, webhook), gestión de miembros e invitaciones, perfil, plan, créditos y preferencias. |
| **Global** | Buscador ⌘K, selector de rango (1W/1M/3M/6M/YTD o personalizado), modo claro/oscuro, notificaciones activas/archivadas, diseño responsive. |

## Stack

- [Next.js 15](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS v4 con tokens de color para claro/oscuro (`src/app/globals.css`)
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
      dashboard/ metricas/ llamadas/ panel-manager/
      simulador/ criterios/ integraciones/ equipo/ cuenta/
    globals.css       # tokens de diseño (claro/oscuro)
  components/
    app-state.tsx     # estado global (sesiones, rúbricas, créditos, notificaciones)
    shell/            # sidebar, topbar, selector de fechas, logo
    calls/            # biblioteca, subida, detalle, reproductor
    simulator/        # creación de prospectos, configuración y llamada
    ui.tsx charts.tsx filters.tsx objection-script.tsx
  lib/
    types.ts          # modelo de datos
    catalog.ts        # reps, prospectos, skills, rúbricas, integraciones
    demo-data.ts      # generador determinista de datos demo + simulación del análisis
    analytics.ts      # agregaciones para dashboards
```

## Hoja de ruta

Los puntos donde hoy hay simulación están marcados en el código con comentarios `En producción…`.

1. **Supabase**: auth (email + Google), tablas `organizations`, `members`, `sessions`, `objections`, `skill_detections`, `key_moments`, `personas`, `rubrics`, `notifications`; Storage para audios; RLS por organización (los comerciales ven solo lo suyo).
2. **Pipeline de análisis** (`/api/analyze`): transcripción con diarización (OpenAI `gpt-4o-transcribe`, AssemblyAI o Deepgram) → métricas de tono → LLM con salida JSON validada con Zod usando la rúbrica de la organización → guardar como nueva versión → notificación. Reemplaza `simulateAnalyzedSession` en `src/lib/demo-data.ts`.
3. **Simulador de voz**: OpenAI Realtime API por WebRTC (endpoint `/api/realtime-token` que emite tokens efímeros). El *system prompt* se construye con la persona, la dificultad y el tipo de llamada. Reemplaza el modo demo de `src/components/simulator/training.tsx`.
4. **Generación de prospectos** (`/api/personas/generate`): desde descripción, URL (scraping + LLM) o audio.
5. **Exportar PDF** con `@react-pdf/renderer` (hoy usa la impresión del navegador).
6. **Integraciones**: webhook `/api/ingest` con API key, OAuth de Zoom/HubSpot, alertas en Slack.
7. **Créditos y pagos** con Stripe.
8. **Insights semanales** del Panel Manager con un Vercel Cron.
