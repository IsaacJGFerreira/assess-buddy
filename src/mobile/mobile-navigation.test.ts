import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  mobilePrimaryTab,
  parseMobileRoute,
  serializeMobileRoute,
  type MobileRoute,
} from "./mobile-navigation";
import { getMobileLayoutProfile, MOBILE_VALIDATION_WIDTHS } from "./mobile-responsive";

describe("mobile navigation", () => {
  it("serializa e restaura todas as rotas do aplicativo", () => {
    const routes: MobileRoute[] = [
      { kind: "dashboard" },
      { kind: "classes" },
      { kind: "assessments" },
      { kind: "new-assessment" },
      { kind: "assessment", assessmentId: "avaliação 1", section: "questions" },
      { kind: "assessment", assessmentId: "a/2", section: "feedback" },
    ];

    for (const route of routes) {
      assert.deepEqual(parseMobileRoute(serializeMobileRoute(route)), route);
    }
  });

  it("mantém o contexto de avaliações nas telas internas", () => {
    assert.equal(mobilePrimaryTab({ kind: "dashboard" }), "dashboard");
    assert.equal(mobilePrimaryTab({ kind: "classes" }), "classes");
    assert.equal(mobilePrimaryTab({ kind: "new-assessment" }), "assessments");
    assert.equal(
      mobilePrimaryTab({ kind: "assessment", assessmentId: "a1", section: "report" }),
      "assessments",
    );
  });

  it("usa uma rota segura quando o endereço é inválido", () => {
    assert.deepEqual(parseMobileRoute("#/desconhecida"), { kind: "dashboard" });
    assert.deepEqual(parseMobileRoute("#/avaliacoes/%E0%A4%A/questions"), {
      kind: "dashboard",
    });
    assert.deepEqual(parseMobileRoute("#/avaliacoes/a1/invalida"), {
      kind: "assessment",
      assessmentId: "a1",
      section: "details",
    });
  });
});

describe("mobile responsiveness", () => {
  it("mantém uma coluna e alvos de toque adequados nas quatro larguras exigidas", () => {
    for (const width of MOBILE_VALIDATION_WIDTHS) {
      const profile = getMobileLayoutProfile(width);
      assert.equal(profile.columns, 1, `${width}px deve permanecer em uma coluna`);
      assert.ok(profile.minimumTouchTarget >= 44, `${width}px deve ter área de toque adequada`);
      assert.ok(profile.contentPadding * 2 < width, `${width}px deve preservar área útil`);
    }
  });

  it("reduz apenas o espaçamento na largura de 360px", () => {
    assert.equal(getMobileLayoutProfile(360).density, "compact");
    assert.equal(getMobileLayoutProfile(390).density, "comfortable");
    assert.equal(getMobileLayoutProfile(430).showBottomNavLabels, true);
  });

  it("mantém toque, teclado e diálogos protegidos pelo CSS móvel", () => {
    const css = readFileSync(new URL("./mobile.css", import.meta.url), "utf8");

    assert.match(css, /min-height:\s*48px/);
    assert.match(css, /font-size:\s*16px !important/);
    assert.match(css, /@media \(max-width:\s*389px\)/);
    assert.match(css, /@media \(max-height:\s*520px\)/);
    assert.match(css, /\[role="dialog"\]/);
    assert.match(css, /max-height:\s*calc\(100dvh/);
  });
});
