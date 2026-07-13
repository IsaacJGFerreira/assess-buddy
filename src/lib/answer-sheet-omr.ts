export interface OmrPoint {
  x: number;
  y: number;
}

export type OmrMarkerCorner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

export interface OmrBubbleTarget {
  questionId: string;
  questionNumber: number;
  kind: "objective" | "numeric";
  value: string;
  digitIndex: number | null;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
}

export interface AnswerSheetOmrGeometry {
  markers: Record<OmrMarkerCorner, OmrPoint>;
  markerWidth: number;
  markerHeight: number;
  bubbles: OmrBubbleTarget[];
}

export interface OmrRasterImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

interface OmrContentBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface OmrDetectedMarker extends OmrPoint {
  score: number;
  darkness: number;
}

export interface OmrBubbleSample extends OmrBubbleTarget {
  imageX: number;
  imageY: number;
  imageRadius: number;
  score: number;
}

export type OmrReadingStatus = "confident" | "blank" | "ambiguous" | "reviewed";
export type OmrReviewReason = "multiple" | "weak" | "incomplete";

export interface OmrQuestionReading {
  questionId: string;
  questionNumber: number;
  kind: "objective" | "numeric";
  value: string | null;
  status: OmrReadingStatus;
  reviewReason: OmrReviewReason | null;
  detectedValues: string[];
  confidence: number;
  requiresReview: boolean;
  samples: OmrBubbleSample[];
}

export interface AnswerSheetOmrAnalysis {
  markers: Record<OmrMarkerCorner, OmrDetectedMarker>;
  threshold: number;
  markerConfidence: number;
  averageConfidence: number;
  readings: OmrQuestionReading[];
}

export class OmrAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OmrAnalysisError";
  }
}

export function collectAnswerSheetOmrGeometry(pageElement: HTMLElement): AnswerSheetOmrGeometry {
  const pageRect = pageElement.getBoundingClientRect();
  if (pageRect.width <= 0 || pageRect.height <= 0) {
    throw new OmrAnalysisError("A referência da folha ainda não terminou de carregar.");
  }

  const markerElements: Record<OmrMarkerCorner, Element | null> = {
    topLeft: pageElement.querySelector(".marker-top-left"),
    topRight: pageElement.querySelector(".marker-top-right"),
    bottomLeft: pageElement.querySelector(".marker-bottom-left"),
    bottomRight: pageElement.querySelector(".marker-bottom-right"),
  };
  if (Object.values(markerElements).some((element) => !element)) {
    throw new OmrAnalysisError("A referência não contém os quatro marcadores de alinhamento.");
  }

  const markerRects = Object.fromEntries(
    Object.entries(markerElements).map(([corner, element]) => [
      corner,
      (element as HTMLElement).getBoundingClientRect(),
    ]),
  ) as Record<OmrMarkerCorner, DOMRect>;

  const markers = Object.fromEntries(
    Object.entries(markerRects).map(([corner, rect]) => [
      corner,
      {
        x: (rect.left + rect.width / 2 - pageRect.left) / pageRect.width,
        y: (rect.top + rect.height / 2 - pageRect.top) / pageRect.height,
      },
    ]),
  ) as Record<OmrMarkerCorner, OmrPoint>;

  const bubbles = Array.from(
    pageElement.querySelectorAll<HTMLElement>("[data-omr-bubble='true']"),
  ).map((element): OmrBubbleTarget => {
    const rect = element.getBoundingClientRect();
    const questionId = element.dataset.omrQuestionId;
    const value = element.dataset.omrValue;
    const kind = element.dataset.omrKind;
    const questionNumber = Number(element.dataset.omrQuestionNumber);
    if (
      !questionId ||
      value === undefined ||
      (kind !== "objective" && kind !== "numeric") ||
      !Number.isFinite(questionNumber)
    ) {
      throw new OmrAnalysisError("Uma bolha da referência não possui identificação válida.");
    }
    const digitIndexValue = element.dataset.omrDigitIndex;
    return {
      questionId,
      questionNumber,
      kind,
      value,
      digitIndex:
        digitIndexValue === undefined || digitIndexValue === "" ? null : Number(digitIndexValue),
      x: (rect.left + rect.width / 2 - pageRect.left) / pageRect.width,
      y: (rect.top + rect.height / 2 - pageRect.top) / pageRect.height,
      radiusX: rect.width / pageRect.width / 2,
      radiusY: rect.height / pageRect.height / 2,
    };
  });

  if (bubbles.length === 0) {
    throw new OmrAnalysisError("Esta página não possui bolhas para leitura.");
  }

  return {
    markers,
    markerWidth: markerRects.topLeft.width / pageRect.width,
    markerHeight: markerRects.topLeft.height / pageRect.height,
    bubbles,
  };
}

export function analyzeAnswerSheetMarks(
  image: OmrRasterImage,
  geometry: AnswerSheetOmrGeometry,
): AnswerSheetOmrAnalysis {
  validateRaster(image);
  const integral = buildDarknessIntegral(image);
  const contentBounds = findDarkContentBounds(image);
  const markers = detectMarkers(image, geometry, integral, contentBounds);
  validateMarkerQuadrilateral(markers, contentBounds);

  const referenceHorizontalSpan =
    (geometry.markers.topRight.x -
      geometry.markers.topLeft.x +
      (geometry.markers.bottomRight.x - geometry.markers.bottomLeft.x)) /
    2;
  const referenceVerticalSpan =
    (geometry.markers.bottomLeft.y -
      geometry.markers.topLeft.y +
      (geometry.markers.bottomRight.y - geometry.markers.topRight.y)) /
    2;
  const horizontalScale =
    (distance(markers.topLeft, markers.topRight) +
      distance(markers.bottomLeft, markers.bottomRight)) /
    2 /
    referenceHorizontalSpan;
  const verticalScale =
    (distance(markers.topLeft, markers.bottomLeft) +
      distance(markers.topRight, markers.bottomRight)) /
    2 /
    referenceVerticalSpan;

  const samples = geometry.bubbles.map((bubble): OmrBubbleSample => {
    const mapped = mapReferencePoint(bubble, geometry.markers, markers);
    const imageRadius = Math.max(
      3,
      Math.min(bubble.radiusX * horizontalScale, bubble.radiusY * verticalScale),
    );
    return {
      ...bubble,
      imageX: mapped.x,
      imageY: mapped.y,
      imageRadius,
      score: sampleBubbleDarkness(image, mapped.x, mapped.y, imageRadius),
    };
  });

  const threshold = calculateMarkThreshold(samples.map((sample) => sample.score));
  const readings = classifyQuestionReadings(samples, threshold);
  const markerConfidence = average(
    Object.values(markers).map((marker) => clamp((marker.score - 45) / 170, 0, 1)),
  );
  const averageConfidence = average(readings.map((reading) => reading.confidence));

  return { markers, threshold, markerConfidence, averageConfidence, readings };
}

function validateRaster(image: OmrRasterImage) {
  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width < 200 ||
    image.height < 200 ||
    image.data.length !== image.width * image.height * 4
  ) {
    throw new OmrAnalysisError("A imagem preparada não possui resolução válida para leitura.");
  }
}

function buildDarknessIntegral(image: OmrRasterImage): Uint32Array {
  const stride = image.width + 1;
  const integral = new Uint32Array(stride * (image.height + 1));
  for (let y = 0; y < image.height; y += 1) {
    let rowTotal = 0;
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      rowTotal += pixelDarkness(image.data, offset);
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + rowTotal;
    }
  }
  return integral;
}

function detectMarkers(
  image: OmrRasterImage,
  geometry: AnswerSheetOmrGeometry,
  integral: Uint32Array,
  contentBounds: OmrContentBounds,
): Record<OmrMarkerCorner, OmrDetectedMarker> {
  return Object.fromEntries(
    (Object.keys(geometry.markers) as OmrMarkerCorner[]).map((corner) => [
      corner,
      detectMarker(image, geometry, integral, corner, contentBounds),
    ]),
  ) as Record<OmrMarkerCorner, OmrDetectedMarker>;
}

function detectMarker(
  image: OmrRasterImage,
  geometry: AnswerSheetOmrGeometry,
  integral: Uint32Array,
  corner: OmrMarkerCorner,
  contentBounds: OmrContentBounds,
): OmrDetectedMarker {
  const expected = geometry.markers[corner];
  const referenceHorizontalSpan =
    (geometry.markers.topRight.x -
      geometry.markers.topLeft.x +
      (geometry.markers.bottomRight.x - geometry.markers.bottomLeft.x)) /
    2;
  const referenceVerticalSpan =
    (geometry.markers.bottomLeft.y -
      geometry.markers.topLeft.y +
      (geometry.markers.bottomRight.y - geometry.markers.topRight.y)) /
    2;
  const estimatedPageWidth =
    contentBounds.width / Math.max(0.2, referenceHorizontalSpan + geometry.markerWidth);
  const estimatedPageHeight =
    contentBounds.height / Math.max(0.2, referenceVerticalSpan + geometry.markerHeight);
  const expectedHalfWidth = Math.max(2, (geometry.markerWidth * estimatedPageWidth) / 2);
  const expectedHalfHeight = Math.max(2, (geometry.markerHeight * estimatedPageHeight) / 2);
  const searchWidth = Math.max(expectedHalfWidth * 9, contentBounds.width * 0.18);
  const searchHeight = Math.max(expectedHalfHeight * 9, contentBounds.height * 0.14);
  const onRight = corner === "topRight" || corner === "bottomRight";
  const onBottom = corner === "bottomLeft" || corner === "bottomRight";
  const searchLeft = onRight
    ? contentBounds.right - searchWidth
    : contentBounds.left - expectedHalfWidth * 2;
  const searchRight = onRight
    ? contentBounds.right + expectedHalfWidth * 2
    : contentBounds.left + searchWidth;
  const searchTop = onBottom
    ? contentBounds.bottom - searchHeight
    : contentBounds.top - expectedHalfHeight * 2;
  const searchBottom = onBottom
    ? contentBounds.bottom + expectedHalfHeight * 2
    : contentBounds.top + searchHeight;
  let best = scoreMarkerCandidate(
    image,
    integral,
    expected.x * image.width,
    expected.y * image.height,
    expectedHalfWidth,
    expectedHalfHeight,
  );
  let bestHalfWidth = expectedHalfWidth;
  let bestHalfHeight = expectedHalfHeight;

  for (const scale of [0.72, 0.86, 1, 1.14, 1.28]) {
    const halfWidth = expectedHalfWidth * scale;
    const halfHeight = expectedHalfHeight * scale;
    const step = Math.max(1, Math.floor(Math.min(halfWidth, halfHeight) / 3));
    for (let y = searchTop; y <= searchBottom; y += step) {
      for (let x = searchLeft; x <= searchRight; x += step) {
        const candidate = scoreMarkerCandidate(image, integral, x, y, halfWidth, halfHeight);
        if (candidate.score > best.score) {
          best = candidate;
          bestHalfWidth = halfWidth;
          bestHalfHeight = halfHeight;
        }
      }
    }
  }

  const refinementRadius = Math.max(2, Math.floor(Math.min(bestHalfWidth, bestHalfHeight) / 3));
  const coarseBest = best;
  for (let y = coarseBest.y - refinementRadius; y <= coarseBest.y + refinementRadius; y += 1) {
    for (let x = coarseBest.x - refinementRadius; x <= coarseBest.x + refinementRadius; x += 1) {
      const candidate = scoreMarkerCandidate(image, integral, x, y, bestHalfWidth, bestHalfHeight);
      if (candidate.score > best.score) best = candidate;
    }
  }

  if (best.darkness < 82 || best.score < 48) {
    throw new OmrAnalysisError(
      "Não foi possível localizar os quatro quadrados pretos. Refine o recorte mantendo a folha inteira visível.",
    );
  }
  return best;
}

function findDarkContentBounds(image: OmrRasterImage): OmrContentBounds {
  const darkByColumn = new Uint32Array(image.width);
  const darkByRow = new Uint32Array(image.height);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (pixelDarkness(image.data, (y * image.width + x) * 4) < 150) continue;
      darkByColumn[x] += 1;
      darkByRow[y] += 1;
    }
  }
  const minimumColumnInk = Math.max(2, Math.floor(image.height * 0.002));
  const minimumRowInk = Math.max(2, Math.floor(image.width * 0.002));
  const left = darkByColumn.findIndex((count) => count >= minimumColumnInk);
  const top = darkByRow.findIndex((count) => count >= minimumRowInk);
  const right = findLastIndex(darkByColumn, (count) => count >= minimumColumnInk);
  const bottom = findLastIndex(darkByRow, (count) => count >= minimumRowInk);
  if (right < left || bottom < top) {
    throw new OmrAnalysisError(
      "A imagem não contém contraste suficiente para localizar os quatro quadrados pretos.",
    );
  }
  return {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function findLastIndex(values: Uint32Array, predicate: (value: number) => boolean): number {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (predicate(values[index])) return index;
  }
  return -1;
}

function scoreMarkerCandidate(
  image: OmrRasterImage,
  integral: Uint32Array,
  centerX: number,
  centerY: number,
  halfWidth: number,
  halfHeight: number,
): OmrDetectedMarker {
  const inner = rectangleStats(
    image,
    integral,
    centerX - halfWidth,
    centerY - halfHeight,
    centerX + halfWidth,
    centerY + halfHeight,
  );
  const outer = rectangleStats(
    image,
    integral,
    centerX - halfWidth * 1.8,
    centerY - halfHeight * 1.8,
    centerX + halfWidth * 1.8,
    centerY + halfHeight * 1.8,
  );
  const ringArea = Math.max(1, outer.area - inner.area);
  const ringMean = (outer.sum - inner.sum) / ringArea;
  return {
    x: centerX,
    y: centerY,
    darkness: inner.mean,
    score: inner.mean - ringMean * 0.55,
  };
}

function rectangleStats(
  image: OmrRasterImage,
  integral: Uint32Array,
  leftValue: number,
  topValue: number,
  rightValue: number,
  bottomValue: number,
) {
  const left = clamp(Math.floor(leftValue), 0, image.width - 1);
  const top = clamp(Math.floor(topValue), 0, image.height - 1);
  const right = clamp(Math.ceil(rightValue), left + 1, image.width);
  const bottom = clamp(Math.ceil(bottomValue), top + 1, image.height);
  const stride = image.width + 1;
  const sum =
    integral[bottom * stride + right] -
    integral[top * stride + right] -
    integral[bottom * stride + left] +
    integral[top * stride + left];
  const area = (right - left) * (bottom - top);
  return { sum, area, mean: sum / Math.max(1, area) };
}

function validateMarkerQuadrilateral(
  markers: Record<OmrMarkerCorner, OmrDetectedMarker>,
  contentBounds: OmrContentBounds,
) {
  const topWidth = distance(markers.topLeft, markers.topRight);
  const bottomWidth = distance(markers.bottomLeft, markers.bottomRight);
  const leftHeight = distance(markers.topLeft, markers.bottomLeft);
  const rightHeight = distance(markers.topRight, markers.bottomRight);
  if (
    Math.min(topWidth, bottomWidth) < Math.max(120, contentBounds.width * 0.62) ||
    Math.min(leftHeight, rightHeight) < Math.max(120, contentBounds.height * 0.62) ||
    markers.topLeft.x >= markers.topRight.x ||
    markers.bottomLeft.x >= markers.bottomRight.x ||
    markers.topLeft.y >= markers.bottomLeft.y ||
    markers.topRight.y >= markers.bottomRight.y
  ) {
    throw new OmrAnalysisError(
      "Os marcadores encontrados não formam uma folha completa. Volte ao recorte e inclua os quatro cantos.",
    );
  }
}

function mapReferencePoint(
  point: OmrPoint,
  reference: Record<OmrMarkerCorner, OmrPoint>,
  detected: Record<OmrMarkerCorner, OmrDetectedMarker>,
): OmrPoint {
  const referenceLeft = (reference.topLeft.x + reference.bottomLeft.x) / 2;
  const referenceRight = (reference.topRight.x + reference.bottomRight.x) / 2;
  const referenceTop = (reference.topLeft.y + reference.topRight.y) / 2;
  const referenceBottom = (reference.bottomLeft.y + reference.bottomRight.y) / 2;
  const u = (point.x - referenceLeft) / (referenceRight - referenceLeft);
  const v = (point.y - referenceTop) / (referenceBottom - referenceTop);
  return {
    x:
      detected.topLeft.x * (1 - u) * (1 - v) +
      detected.topRight.x * u * (1 - v) +
      detected.bottomLeft.x * (1 - u) * v +
      detected.bottomRight.x * u * v,
    y:
      detected.topLeft.y * (1 - u) * (1 - v) +
      detected.topRight.y * u * (1 - v) +
      detected.bottomLeft.y * (1 - u) * v +
      detected.bottomRight.y * u * v,
  };
}

function sampleBubbleDarkness(
  image: OmrRasterImage,
  centerX: number,
  centerY: number,
  radius: number,
): number {
  const innerRadius = Math.max(2, radius * 0.68);
  const left = clamp(Math.floor(centerX - innerRadius), 0, image.width - 1);
  const right = clamp(Math.ceil(centerX + innerRadius), 0, image.width - 1);
  const top = clamp(Math.floor(centerY - innerRadius), 0, image.height - 1);
  const bottom = clamp(Math.ceil(centerY + innerRadius), 0, image.height - 1);
  const radiusSquared = innerRadius * innerRadius;
  let total = 0;
  let count = 0;
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const deltaX = x + 0.5 - centerX;
      const deltaY = y + 0.5 - centerY;
      if (deltaX * deltaX + deltaY * deltaY > radiusSquared) continue;
      total += pixelDarkness(image.data, (y * image.width + x) * 4);
      count += 1;
    }
  }
  return count > 0 ? total / count / 255 : 0;
}

function calculateMarkThreshold(scores: number[]): number {
  if (scores.length === 0) return 0.28;
  const sorted = [...scores].sort((a, b) => a - b);
  const baseline = percentile(sorted, 0.25);
  const high = percentile(sorted, 0.85);
  const threshold = baseline + Math.max(0.13, (high - baseline) * 0.45);
  return clamp(threshold, 0.2, 0.54);
}

function classifyQuestionReadings(
  samples: OmrBubbleSample[],
  threshold: number,
): OmrQuestionReading[] {
  const byQuestion = new Map<string, OmrBubbleSample[]>();
  for (const sample of samples) {
    const values = byQuestion.get(sample.questionId) ?? [];
    values.push(sample);
    byQuestion.set(sample.questionId, values);
  }

  return Array.from(byQuestion.values())
    .map((questionSamples) => {
      const first = questionSamples[0];
      if (first.kind === "numeric") {
        return classifyNumericQuestion(questionSamples, threshold);
      }
      const classification = classifyBubbleGroup(questionSamples, threshold);
      return {
        questionId: first.questionId,
        questionNumber: first.questionNumber,
        kind: first.kind,
        value: classification.value,
        status: classification.status,
        reviewReason: classification.reviewReason,
        detectedValues: classification.detectedValues,
        confidence: classification.confidence,
        requiresReview: classification.requiresReview,
        samples: questionSamples,
      };
    })
    .sort((a, b) => a.questionNumber - b.questionNumber);
}

function classifyNumericQuestion(
  samples: OmrBubbleSample[],
  threshold: number,
): OmrQuestionReading {
  const first = samples[0];
  const byDigit = new Map<number, OmrBubbleSample[]>();
  for (const sample of samples) {
    if (sample.digitIndex === null) continue;
    const values = byDigit.get(sample.digitIndex) ?? [];
    values.push(sample);
    byDigit.set(sample.digitIndex, values);
  }
  const groups = Array.from(byDigit.entries())
    .sort(([left], [right]) => left - right)
    .map(([, values]) => classifyBubbleGroup(values, threshold));
  const allBlank = groups.length > 0 && groups.every((group) => group.status === "blank");
  const allConfident = groups.length > 0 && groups.every((group) => group.status === "confident");
  const confidence = average(groups.map((group) => group.confidence));
  const detectedValues = groups.flatMap((group) => group.detectedValues);

  if (allBlank) {
    return {
      questionId: first.questionId,
      questionNumber: first.questionNumber,
      kind: "numeric",
      value: null,
      status: "blank",
      reviewReason: null,
      detectedValues: [],
      confidence,
      requiresReview: false,
      samples,
    };
  }
  if (allConfident) {
    return {
      questionId: first.questionId,
      questionNumber: first.questionNumber,
      kind: "numeric",
      value: groups.map((group) => group.value).join(""),
      status: "confident",
      reviewReason: null,
      detectedValues,
      confidence,
      requiresReview: false,
      samples,
    };
  }
  const suggestion = groups.every((group) => group.value !== null)
    ? groups.map((group) => group.value).join("")
    : null;
  const reviewReason = groups.some((group) => group.reviewReason === "multiple")
    ? "multiple"
    : groups.some((group) => group.status === "blank")
      ? "incomplete"
      : "weak";
  return {
    questionId: first.questionId,
    questionNumber: first.questionNumber,
    kind: "numeric",
    value: suggestion,
    status: "ambiguous",
    reviewReason,
    detectedValues,
    confidence,
    requiresReview: true,
    samples,
  };
}

function classifyBubbleGroup(samples: OmrBubbleSample[], threshold: number) {
  const ranked = [...samples].sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const second = ranked[1];
  const gap = top.score - (second?.score ?? 0);
  const marked = ranked.filter((sample) => sample.score >= threshold);

  if (marked.length === 0) {
    const confidentBlank = top.score <= threshold - 0.035;
    return {
      value: confidentBlank ? null : top.value,
      status: confidentBlank ? ("blank" as const) : ("ambiguous" as const),
      reviewReason: confidentBlank ? null : ("weak" as const),
      detectedValues: confidentBlank ? [] : [top.value],
      confidence: clamp((threshold - top.score + 0.05) / 0.18, 0.15, 1),
      requiresReview: !confidentBlank,
    };
  }
  if (marked.length === 1) {
    const confident = top.score >= threshold + 0.025 && gap >= 0.055;
    return {
      value: top.value,
      status: confident ? ("confident" as const) : ("ambiguous" as const),
      reviewReason: confident ? null : ("weak" as const),
      detectedValues: [top.value],
      confidence: clamp((gap + top.score - threshold) / 0.32, 0.2, 1),
      requiresReview: !confident,
    };
  }
  return {
    value: null,
    status: "ambiguous" as const,
    reviewReason: "multiple" as const,
    detectedValues: marked.map((sample) => sample.value),
    confidence: clamp(gap / 0.2, 0.1, 0.55),
    requiresReview: true,
  };
}

function pixelDarkness(data: Uint8ClampedArray, offset: number): number {
  const alpha = data[offset + 3] / 255;
  const luminance = data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
  const composited = luminance * alpha + 255 * (1 - alpha);
  return Math.round(255 - composited);
}

function percentile(sorted: number[], ratio: number): number {
  if (sorted.length === 0) return 0;
  const index = clamp(Math.round((sorted.length - 1) * ratio), 0, sorted.length - 1);
  return sorted[index];
}

function distance(left: OmrPoint, right: OmrPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
