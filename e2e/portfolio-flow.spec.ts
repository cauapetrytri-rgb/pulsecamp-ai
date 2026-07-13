import { expect, test } from "@playwright/test";

test("fluxo full-stack demonstrativo", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("E-mail").fill("invalido@pulsecamp.demo");
  await page.getByLabel("Senha").fill("senha-incorreta");
  await page.getByRole("button", { name: "Entrar no PulseCamp" }).click();
  await expect(page.locator(".login-error")).toContainText("inválidos");

  await page.getByLabel("E-mail").fill("admin@pulsecamp.demo");
  await page.getByLabel("Senha").fill("PulseCamp2026!");
  await page.getByRole("button", { name: "Entrar no PulseCamp" }).click();
  await expect(page.getByRole("heading", { name: /Boa tarde/ })).toBeVisible();

  await page.getByRole("button", { name: "Empresas" }).click();
  await page.getByRole("button", { name: "Adicionar empresa" }).first().click();
  const companyName = `Empresa E2E ${Date.now()}`;
  await page.getByLabel("Nome da empresa").fill(companyName);
  await page.getByLabel("Segmento").fill("Tecnologia");
  await page.getByRole("button", { name: "Adicionar empresa" }).last().click();
  await expect(page.getByRole("status")).toContainText("Empresa adicionada");

  await page.getByLabel("Empresa").first().selectOption("client-solar");
  await page.getByRole("button", { name: "Criar" }).click();
  await page.getByRole("button", { name: "Simular novo lead" }).click();
  await expect(page.getByRole("status")).toContainText("Novo lead recebido");

  await page.getByRole("button", { name: "Pipeline" }).click();
  const lead = page.locator(".pipeline-card").first();
  const target = page.locator(".pipeline-column").filter({ hasText: "Agendamento" }).first();
  await lead.dragTo(target);
  await expect(page.getByRole("status")).toContainText("Etapa atualizada");

  await page.getByRole("button", { name: "Vendas", exact: true }).click();
  await page.getByRole("button", { name: "Registrar venda" }).click();
  await page.locator('select[name="leadId"]').selectOption({ index: 1 });
  await page.getByLabel("Valor da venda").fill("2490");
  await page.getByRole("button", { name: "Registrar e enviar" }).click();
  await expect(page.getByRole("status")).toContainText("Venda registrada");
});
