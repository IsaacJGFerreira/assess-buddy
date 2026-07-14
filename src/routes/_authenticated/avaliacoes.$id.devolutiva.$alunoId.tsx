import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/avaliacoes/$id/devolutiva/$alunoId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/devolutiva/$id/$alunoId",
      params: { id: params.id, alunoId: params.alunoId },
    });
  },
});
