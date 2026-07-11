import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTrackedDestination,
  attachTrackingToken,
  detectGtmContainers,
  forwardTrackingParameters,
  gtmBodySnippet,
  gtmHeadSnippet,
  normalizeGtmContainerId,
  parseTrackingReference,
} from "../lib/tracking";

test("normaliza e valida IDs de container GTM", () => {
  assert.equal(normalizeGtmContainerId(" gtm-abc123 "), "GTM-ABC123");
  assert.throws(() => normalizeGtmContainerId("G-ABC123"), /GTM-/);
});

test("injeta e recupera a referência que liga o clique à conversa do WhatsApp", () => {
  const destination = new URL(attachTrackingToken("https://wa.me/5511999999999?text=Quero%20saber%20mais", "abc123def456"));
  assert.match(destination.searchParams.get("text") || "", /Ref: PC-abc123def456/);
  const parsed = parseTrackingReference(destination.searchParams.get("text") || "");
  assert.equal(parsed.token, "abc123def456");
  assert.equal(parsed.cleanText, "Quero saber mais");
});

test("gera os dois trechos de instalação com o container informado", () => {
  const head = gtmHeadSnippet("GTM-ABC123");
  const body = gtmBodySnippet("GTM-ABC123");
  assert.match(head, /googletagmanager\.com\/gtm\.js/);
  assert.match(head, /GTM-ABC123/);
  assert.match(body, /googletagmanager\.com\/ns\.html\?id=GTM-ABC123/);
});

test("detecta containers no HTML público sem duplicidade", () => {
  assert.deepEqual(detectGtmContainers("GTM-ABC123 x gtm-abc123 y GTM-Z9"), ["GTM-ABC123", "GTM-Z9"]);
});

test("monta destino com UTM e encaminha somente parâmetros de atribuição", () => {
  const destination = buildTrackedDestination("example.com/oferta", {
    source: "meta",
    medium: "paid_social",
    campaign: "maio",
  });
  const incoming = new URLSearchParams("fbclid=click-1&utm_content=hero&admin=true");
  const forwarded = new URL(forwardTrackingParameters(destination, incoming));
  assert.equal(forwarded.searchParams.get("utm_source"), "meta");
  assert.equal(forwarded.searchParams.get("utm_content"), "hero");
  assert.equal(forwarded.searchParams.get("fbclid"), "click-1");
  assert.equal(forwarded.searchParams.has("admin"), false);
});
