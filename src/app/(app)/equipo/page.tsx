"use client";

import { Mail, UserPlus } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-state";
import { Avatar, Badge, Button, Card, Modal, PageHeader, Select } from "@/components/ui";
import { REPS } from "@/lib/catalog";
import type { Rep, Role } from "@/lib/types";
import { avg } from "@/lib/utils";

const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Manager" },
  { value: "comercial", label: "Comercial" },
];

export default function EquipoPage() {
  const { sessions, toast } = useApp();
  const [members, setMembers] = useState<Rep[]>(REPS);
  const [invites, setInvites] = useState<{ email: string; role: Role }[]>([]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("comercial");

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-6">
      <PageHeader
        title="Equipo"
        subtitle={`${members.length} miembros · ${invites.length} invitaciones pendientes`}
        right={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <UserPlus className="size-4" /> Invitar miembro
          </Button>
        }
      />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] tracking-wider text-faint uppercase">
              <th className="p-4 font-semibold">Miembro</th>
              <th className="font-semibold">Rol</th>
              <th className="text-right font-semibold">Sesiones</th>
              <th className="text-right font-semibold">Score medio</th>
              <th className="pl-6 font-semibold">Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const ms = sessions.filter((s) => s.repId === m.id && s.status === "analizada");
              return (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="p-4">
                    <span className="flex items-center gap-3">
                      <Avatar name={m.name} />
                      <span>
                        <span className="block font-medium text-text">{m.name}</span>
                        <span className="text-xs text-muted">{m.email}</span>
                      </span>
                    </span>
                  </td>
                  <td>
                    <Select value={m.role} onChange={(r) => { setMembers((xs) => xs.map((x) => (x.id === m.id ? { ...x, role: r } : x))); toast("Rol actualizado"); }} options={ROLES} />
                  </td>
                  <td className="text-right text-text">{ms.length}</td>
                  <td className="text-right font-semibold text-text">{avg(ms.map((s) => s.score))}</td>
                  <td className="pl-6">
                    <Badge className={m.active ? "bg-good-soft text-good" : "bg-surface-2 text-muted"}>{m.active ? "Activo" : "Desactivado"}</Badge>
                  </td>
                  <td className="pr-4 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setMembers((xs) => xs.map((x) => (x.id === m.id ? { ...x, active: !x.active } : x)))}>
                      {m.active ? "Desactivar" : "Activar"}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {invites.map((i) => (
              <tr key={i.email} className="border-b border-border last:border-0">
                <td className="p-4">
                  <span className="flex items-center gap-3 text-muted">
                    <span className="grid size-8 place-items-center rounded-full bg-surface-2"><Mail className="size-4" /></span>
                    {i.email}
                  </span>
                </td>
                <td className="text-xs text-muted capitalize">{i.role}</td>
                <td colSpan={2} />
                <td className="pl-6"><Badge className="bg-warn-soft text-warn">Pendiente</Badge></td>
                <td className="pr-4 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setInvites((xs) => xs.filter((x) => x.email !== i.email))}>Cancelar</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Invitar miembro"
        subtitle="Recibirá un email para unirse a tu organización."
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              variant="primary"
              disabled={!/^\S+@\S+\.\S+$/.test(email)}
              onClick={() => {
                setInvites((xs) => [...xs, { email, role }]);
                toast(`Invitación enviada a ${email}`);
                setEmail("");
                setOpen(false);
              }}
            >
              Enviar invitación
            </Button>
          </>
        }
      >
        <label className="block text-xs text-muted">
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@empresa.com" className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30" />
        </label>
        <div className="mt-3">
          <Select label="Rol" value={role} onChange={setRole} options={ROLES} />
        </div>
      </Modal>
    </div>
  );
}
