# Sparring IA — guía para Claude Code

Plataforma SaaS de entrenamiento comercial con IA (análisis de llamadas + roleplay por voz). Toda la UI va en español.

## Comandos
- `npm run dev` — servidor local
- `npm run build` — build de producción (debe pasar antes de cada commit)
- `npm run lint` / `npx tsc --noEmit`

## Convenciones
- Next.js 15 App Router, TypeScript estricto, Tailwind v4. Las rutas de la app viven en `src/app/(app)/` y comparten sidebar/topbar.
- Colores solo mediante tokens (`bg-surface`, `text-muted`, `text-primary-text`, `bg-good-soft`…) definidos en `src/app/globals.css`; no uses colores hex sueltos en componentes, así el modo oscuro sigue funcionando. No construyas clases de Tailwind dinámicamente (`text-${x}`): usa los mapas `toneText`, `toneSoft`, `toneBg` de `src/lib/utils.ts`.
- Componentes base en `src/components/ui.tsx` (Card, Button, Segmented, Tabs, Select, Modal, Popover, Badge, ProgressBar, InfoTip…). Reutilízalos antes de crear otros.
- Estado global en `src/components/app-state.tsx` (`useApp()`). Los datos demo se generan en el cliente tras montar para evitar desajustes de hidratación.
- Agregaciones de métricas en `src/lib/analytics.ts`; modelo de datos en `src/lib/types.ts`.
- Las partes simuladas llevan comentarios `En producción…`; la hoja de ruta para sustituirlas está en el README.
- Usa la marca propia (nombre "Sparring IA" y el logo de `src/components/shell/logo.tsx`), no la de otros productos.
