import { getDownloadURL, ref } from "firebase/storage";

import { getFirebaseStorage } from "@/integrations/firebase/client";
import type { FeedbackQuestion } from "@/lib/devolutiva-pdf";
import type { Questao } from "@/lib/domain";

export async function prepareFeedbackQuestions(questions: Questao[]): Promise<FeedbackQuestion[]> {
  const storage = getFirebaseStorage();
  return Promise.all(
    questions.map(async (question) => {
      const path = question.resposta_modelo_imagem_path;
      if (!path) return question;

      try {
        return {
          ...question,
          resposta_modelo_imagem_url: await getDownloadURL(ref(storage, path)),
        };
      } catch {
        return { ...question, resposta_modelo_imagem_url: null };
      }
    }),
  );
}
