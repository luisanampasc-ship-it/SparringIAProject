import { redirect } from "next/navigation";

// El módulo inicial es el Simulador IA. Si Supabase devuelve un error de un enlace de correo
// (p. ej. enlace caducado), se muestra en la pantalla de inicio de sesión.
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const code = typeof params.error_code === "string" ? params.error_code : null;
  if (code || params.error) {
    const q = new URLSearchParams();
    if (code) q.set("error_code", code);
    if (typeof params.error_description === "string") q.set("error_description", params.error_description);
    redirect(`/login?${q.toString()}`);
  }
  redirect("/simulador");
}
