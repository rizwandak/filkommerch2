import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/kasir")({
  beforeLoad: () => {
    throw redirect({ to: "/pos" });
  },
});
