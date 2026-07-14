import { createFileRoute } from "@tanstack/react-router";
import { StudentFeedbackEditor } from "@/components/class-feedback-panel";

export const Route = createFileRoute("/_authenticated/devolutiva/$id/$alunoId")({
  component: DevolutivaPage,
});

function DevolutivaPage() {
  const { id, alunoId } = Route.useParams();
  return <StudentFeedbackEditor assessmentId={id} studentId={alunoId} />;
}
