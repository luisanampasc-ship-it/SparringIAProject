import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // "Métricas" pasó a llamarse "Centro de Entrenamiento".
      { source: "/metricas", destination: "/entrenamiento", permanent: true },
      // El Panel Manager se eliminó: su contenido se repartió entre Dashboard y Centro de Entrenamiento.
      { source: "/panel-manager", destination: "/dashboard", permanent: true },
    ];
  },
};

export default nextConfig;
