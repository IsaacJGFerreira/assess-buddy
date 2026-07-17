import assert from "node:assert/strict";
import test from "node:test";

import { handleFeedbackImageProxy } from "@/lib/feedback-image-proxy.server";
import {
  createFeedbackImageProxyUrl,
  parseFirebaseFeedbackImageUrl,
} from "@/lib/feedback-image-url";

const bucket = "assess-buddy.firebasestorage.app";
const firebaseUrl =
  `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/` +
  "usuarios%2Fprofessor%2Fcomentarios%2Fimagem.png?alt=media&token=token-de-teste";

test("recognizes an existing Firebase download URL and creates the local proxy URL", () => {
  assert.deepEqual(parseFirebaseFeedbackImageUrl(firebaseUrl), {
    bucket,
    objectPath: "usuarios/professor/comentarios/imagem.png",
    url: new URL(firebaseUrl),
  });
  assert.equal(
    createFeedbackImageProxyUrl(firebaseUrl),
    `/api/feedback-image?source=${encodeURIComponent(firebaseUrl)}`,
  );
});

test("rejects arbitrary origins before making an external request", async () => {
  let fetched = false;
  const response = await handleFeedbackImageProxy(
    new Request("https://app.example/api/feedback-image?source=https://example.com/image.png"),
    {
      expectedBucket: bucket,
      fetcher: async () => {
        fetched = true;
        return new Response();
      },
    },
  );

  assert.equal(response.status, 400);
  assert.equal(fetched, false);
});

test("returns the authenticated Firebase image with a safe content type", async () => {
  const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const response = await handleFeedbackImageProxy(
    new Request(`https://app.example${createFeedbackImageProxyUrl(firebaseUrl)}`),
    {
      expectedBucket: bucket,
      fetcher: async (input) => {
        assert.equal(String(input), firebaseUrl);
        return new Response(pngHeader, { status: 200 });
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), pngHeader);
});

test("does not proxy an image from a different Firebase bucket", async () => {
  const response = await handleFeedbackImageProxy(
    new Request(`https://app.example${createFeedbackImageProxyUrl(firebaseUrl)}`),
    { expectedBucket: "another-bucket.appspot.com" },
  );
  assert.equal(response.status, 400);
});
