import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_PATH = ":memory:";

test("cria link persistente, registra clique e redireciona com atribuição", async () => {
  const { resetDatabaseForTests, getDb } = await import("../lib/db");
  resetDatabaseForTests();
  const { POST } = await import("../app/api/links/route");
  const created = await POST(new Request("http://localhost/api/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: "client-solar",
      name: "Oferta Solar",
      destination: "https://example.com/oferta",
      channel: "Meta Ads",
      campaign: "Maio",
      utmSource: "meta",
    }),
  }));
  assert.equal(created.status, 201);
  const payload = await created.json() as { link: { id: string; slug: string } };

  const { GET } = await import("../app/go/[slug]/route");
  const redirected = await GET(
    new Request(`http://localhost/go/${payload.link.slug}?fbclid=abc&utm_content=hero`),
    { params: Promise.resolve({ slug: payload.link.slug }) },
  );
  assert.equal(redirected.status, 307);
  const location = new URL(redirected.headers.get("location")!);
  assert.equal(location.searchParams.get("utm_source"), "meta");
  assert.equal(location.searchParams.get("fbclid"), "abc");
  assert.equal(location.searchParams.get("utm_content"), "hero");
  assert.ok(location.searchParams.get("pcid"));
  const clicks = getDb().prepare("SELECT COUNT(*) AS count FROM tracked_link_clicks WHERE link_id = ?").get(payload.link.id) as { count: number };
  assert.equal(clicks.count, 1);
  resetDatabaseForTests();
});

test("cadastra site com URL e ID GTM normalizados", async () => {
  const { resetDatabaseForTests } = await import("../lib/db");
  resetDatabaseForTests();
  const { POST } = await import("../app/api/sites/route");
  const response = await POST(new Request("http://localhost/api/sites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: "client-alfa", name: "Site Alfa", url: "example.com", gtmContainerId: "gtm-alfa123" }),
  }));
  assert.equal(response.status, 201);
  const payload = await response.json() as { site: { url: string; gtm_container_id: string; status: string } };
  assert.equal(payload.site.url, "https://example.com/");
  assert.equal(payload.site.gtm_container_id, "GTM-ALFA123");
  assert.equal(payload.site.status, "pending");
  resetDatabaseForTests();
});

test("associa clique do site ao lead do WhatsApp e envia fbc no evento", async () => {
  const { resetDatabaseForTests, getDb } = await import("../lib/db");
  resetDatabaseForTests();
  const { POST } = await import("../app/api/links/route");
  const created = await POST(new Request("http://localhost/api/links", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: "client-solar", name: "Site para WhatsApp", destination: "https://wa.me/5511999999999?text=Quero+orçamento", channel: "Meta Ads", campaign: "Solar Julho" }),
  }));
  const link = await created.json() as { link: { slug: string } };
  const { GET } = await import("../app/go/[slug]/route");
  const redirect = await GET(new Request(`http://localhost/go/${link.link.slug}?fbclid=fb-click-123&utm_source=meta`), { params: Promise.resolve({ slug: link.link.slug }) });
  const messageText = new URL(redirect.headers.get("location")!).searchParams.get("text")!;
  const { processInboundMessage } = await import("../lib/lead-pipeline");
  const result = await processInboundMessage({
    messageId: "wamid.tracked", wabaId: "waba-demo-solar", phoneNumberId: "phone-demo-solar",
    from: "5511988877766", displayName: "Lead rastreado", timestamp: 1783612800,
    text: messageText, ctwaClid: null, sourceAdId: null, sourceUrl: null, sourceHeadline: null,
  });
  const lead = getDb().prepare("SELECT tracked_click_id, source_channel, source_campaign FROM leads WHERE id = ?").get(result.leadId) as { tracked_click_id: string; source_channel: string; source_campaign: string };
  assert.ok(lead.tracked_click_id);
  assert.equal(lead.source_channel, "Meta Ads");
  assert.equal(lead.source_campaign, "Solar Julho");
  const contact = result.events[0];
  assert.match(contact.request_json, /fb\.1\.\d+\.fb-click-123/);
  resetDatabaseForTests();
});
