import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/avaliacoes/$id/devolutiva/$alunoId")({
  beforeLoad: ({ params }) => {
    throw redirect({ href: `/devolutiva/${params.id}/${params.alunoId}` });
  },
});
