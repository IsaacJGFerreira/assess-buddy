import { getBytes, getMetadata, ref } from "firebase/storage";

import { getFirebaseStorage } from "@/integrations/firebase/client";
import type { FeedbackQuestion } from "@/lib/devolutiva-pdf";
import type { Questao } from "@/lib/domain";
import { normalizeFeedbackImageMime, storageBytesToDataUrl } from "@/lib/feedback-image-data";

export async function prepareFeedbackQuestions(questions: Questao[]): Promise<FeedbackQuestion[]> {
  const storage = getFirebaseStorage();
  return Promise.all(
    questions.map(async (question) => {
      const path = question.resposta_modelo_imagem_path;
      if (!path) return question;

      try {
        const imageReference = ref(storage, path);
        const [bytes, metadata] = await Promise.all([
          getBytes(imageReference, 8 * 1024 * 1024),
          getMetadata(imageReference),
        ]);
        return {
          ...question,
          resposta_modelo_imagem_url: storageBytesToDataUrl(
            bytes,
            normalizeFeedbackImageMime(metadata.contentType, path),
          ),
        };
      } catch {
        return { ...question, resposta_modelo_imagem_url: null };
      }
    }),
  );
}
