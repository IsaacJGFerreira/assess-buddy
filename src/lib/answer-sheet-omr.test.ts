import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeAnswerSheetMarks,
  OmrAnalysisError,
  type AnswerSheetOmrGeometry,
  type OmrBubbleTarget,
  type OmrPoint,
  type OmrRasterImage,
} from "@/lib/answer-sheet-omr";

const WIDTH = 1200;
const HEIGHT = 848;
const geometry = buildGeometry();
const detectedCorners = {
  topLeft: { x: 30, y: 28 },
  topRight: { x: 1160, y: 18 },
  bottomLeft: { x: 20, y: 815 },
  bottomRight: { x: 1170, y: 825 },
};

test("reads objective, blank and numeric marks after perspective alignment", () => {
  const image = createSyntheticSheet([
    ["q1", null, "B"],
    ["q3", 0, "0"],
    ["q3", 1, "7"],
  ]);
  const analysis = analyzeAnswerSheetMarks(image, geometry);

  const first = analysis.readings.find((reading) => reading.questionId === "q1");
  const second = analysis.readings.find((reading) => reading.questionId === "q2");
  const numeric = analysis.readings.find((reading) => reading.questionId === "q3");
  assert.equal(first?.value, "B");
  assert.equal(first?.status, "confident");
  assert.equal(second?.value, null);
  assert.equal(second?.status, "blank");
  assert.equal(numeric?.value, "07");
  assert.equal(numeric?.status, "confident");
  assert.ok(analysis.markerConfidence > 0.7);
});

test("flags two filled bubbles in the same question for review", () => {
  const image = createSyntheticSheet([
    ["q1", null, "A"],
    ["q1", null, "B"],
  ]);
  const analysis = analyzeAnswerSheetMarks(image, geometry);
  const reading = analysis.readings.find((item) => item.questionId === "q1");

  assert.equal(reading?.status, "ambiguous");
  assert.equal(reading?.requiresReview, true);
  assert.equal(reading?.value, null);
  assert.equal(reading?.reviewReason, "multiple");
  assert.deepEqual(reading?.detectedValues.sort(), ["A", "B"]);
});

test("flags a partially filled numeric response as incomplete", () => {
  const image = createSyntheticSheet([["q3", 0, "4"]]);
  const analysis = analyzeAnswerSheetMarks(image, geometry);
  const reading = analysis.readings.find((item) => item.questionId === "q3");

  assert.equal(reading?.status, "ambiguous");
  assert.equal(reading?.requiresReview, true);
  assert.equal(reading?.reviewReason, "incomplete");
});

test("rejects an image without the four alignment markers", () => {
  const image = createRaster(WIDTH, HEIGHT);
  assert.throws(
    () => analyzeAnswerSheetMarks(image, geometry),
    (error) => error instanceof OmrAnalysisError && error.message.includes("quadrados pretos"),
  );
});

function buildGeometry(): AnswerSheetOmrGeometry {
  const bubbles: OmrBubbleTarget[] = [];
  for (const [questionId, questionNumber, y] of [
    ["q1", 1, 0.4],
    ["q2", 2, 0.5],
  ] as const) {
    for (const [index, value] of ["A", "B", "C"].entries()) {
      bubbles.push(
        makeBubble(questionId, questionNumber, "objective", value, null, 0.25 + index * 0.05, y),
      );
    }
  }
  for (let digitIndex = 0; digitIndex < 2; digitIndex += 1) {
    for (let digit = 0; digit < 10; digit += 1) {
      bubbles.push(
        makeBubble(
          "q3",
          3,
          "numeric",
          String(digit),
          digitIndex,
          0.62 + digitIndex * 0.07,
          0.22 + digit * 0.055,
        ),
      );
    }
  }
  return {
    markers: {
      topLeft: { x: 6 / 297, y: 6 / 210 },
      topRight: { x: 291 / 297, y: 6 / 210 },
      bottomLeft: { x: 6 / 297, y: 204 / 210 },
      bottomRight: { x: 291 / 297, y: 204 / 210 },
    },
    markerWidth: 4 / 297,
    markerHeight: 4 / 210,
    bubbles,
  };
}

function makeBubble(
  questionId: string,
  questionNumber: number,
  kind: "objective" | "numeric",
  value: string,
  digitIndex: number | null,
  x: number,
  y: number,
): OmrBubbleTarget {
  return {
    questionId,
    questionNumber,
    kind,
    value,
    digitIndex,
    x,
    y,
    radiusX: 2.5 / 297,
    radiusY: 2.5 / 210,
  };
}

function createSyntheticSheet(
  filled: Array<[questionId: string, digitIndex: number | null, value: string]>,
): OmrRasterImage {
  const image = createRaster(WIDTH, HEIGHT);
  const markerSize = 16;
  for (const corner of Object.values(detectedCorners)) {
    fillRectangle(
      image,
      corner.x - markerSize / 2,
      corner.y - markerSize / 2,
      markerSize,
      markerSize,
    );
  }
  for (const bubble of geometry.bubbles) {
    const center = mapBubble(bubble);
    drawRing(image, center.x, center.y, 10, 2);
    fillRectangle(image, center.x - 1, center.y - 3, 2, 6);
    const isFilled = filled.some(
      ([questionId, digitIndex, value]) =>
        questionId === bubble.questionId &&
        digitIndex === bubble.digitIndex &&
        value === bubble.value,
    );
    if (isFilled) drawDisc(image, center.x, center.y, 7);
  }
  return image;
}

function createRaster(width: number, height: number): OmrRasterImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = 255;
    data[offset + 1] = 255;
    data[offset + 2] = 255;
    data[offset + 3] = 255;
  }
  return { data, width, height };
}

function mapBubble(point: OmrPoint): OmrPoint {
  const reference = geometry.markers;
  const referenceLeft = (reference.topLeft.x + reference.bottomLeft.x) / 2;
  const referenceRight = (reference.topRight.x + reference.bottomRight.x) / 2;
  const referenceTop = (reference.topLeft.y + reference.topRight.y) / 2;
  const referenceBottom = (reference.bottomLeft.y + reference.bottomRight.y) / 2;
  const u = (point.x - referenceLeft) / (referenceRight - referenceLeft);
  const v = (point.y - referenceTop) / (referenceBottom - referenceTop);
  return {
    x:
      detectedCorners.topLeft.x * (1 - u) * (1 - v) +
      detectedCorners.topRight.x * u * (1 - v) +
      detectedCorners.bottomLeft.x * (1 - u) * v +
      detectedCorners.bottomRight.x * u * v,
    y:
      detectedCorners.topLeft.y * (1 - u) * (1 - v) +
      detectedCorners.topRight.y * u * (1 - v) +
      detectedCorners.bottomLeft.y * (1 - u) * v +
      detectedCorners.bottomRight.y * u * v,
  };
}

function fillRectangle(
  image: OmrRasterImage,
  left: number,
  top: number,
  width: number,
  height: number,
) {
  for (
    let y = Math.max(0, Math.floor(top));
    y < Math.min(image.height, Math.ceil(top + height));
    y += 1
  ) {
    for (
      let x = Math.max(0, Math.floor(left));
      x < Math.min(image.width, Math.ceil(left + width));
      x += 1
    ) {
      setBlack(image, x, y);
    }
  }
}

function drawDisc(image: OmrRasterImage, centerX: number, centerY: number, radius: number) {
  for (let y = Math.floor(centerY - radius); y <= Math.ceil(centerY + radius); y += 1) {
    for (let x = Math.floor(centerX - radius); x <= Math.ceil(centerX + radius); x += 1) {
      if ((x - centerX) ** 2 + (y - centerY) ** 2 <= radius ** 2) setBlack(image, x, y);
    }
  }
}

function drawRing(
  image: OmrRasterImage,
  centerX: number,
  centerY: number,
  radius: number,
  thickness: number,
) {
  const outer = radius ** 2;
  const inner = (radius - thickness) ** 2;
  for (let y = Math.floor(centerY - radius); y <= Math.ceil(centerY + radius); y += 1) {
    for (let x = Math.floor(centerX - radius); x <= Math.ceil(centerX + radius); x += 1) {
      const distance = (x - centerX) ** 2 + (y - centerY) ** 2;
      if (distance <= outer && distance >= inner) setBlack(image, x, y);
    }
  }
}

function setBlack(image: OmrRasterImage, x: number, y: number) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const offset = (y * image.width + x) * 4;
  image.data[offset] = 0;
  image.data[offset + 1] = 0;
  image.data[offset + 2] = 0;
  image.data[offset + 3] = 255;
}
