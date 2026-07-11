import assert from "node:assert/strict";
import test from "node:test";

import { dashboardHref, isAppView } from "../lib/navigation";

test("valida somente áreas conhecidas do produto", () => {
  assert.equal(isAppView("campaigns"), true);
  assert.equal(isAppView("billing"), true);
  assert.equal(isAppView("unknown"), false);
  assert.equal(isAppView(undefined), false);
});

test("gera links persistentes para área e empresa", () => {
  assert.equal(dashboardHref("dashboard"), "/");
  assert.equal(dashboardHref("leads"), "/?view=leads");
  assert.equal(dashboardHref("campaigns", "client alfa"), "/?view=campaigns&client=client+alfa");
  assert.equal(dashboardHref("dashboard", "client-1"), "/?client=client-1");
});
