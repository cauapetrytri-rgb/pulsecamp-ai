import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { detectGtmContainers, normalizeGtmContainerId, normalizePublicUrl } from "@/lib/tracking";

function isBlockedAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19));
  }
  if (isIP(address) === 6) {
    const value = address.toLowerCase();
    return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") ||
      value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb") ||
      value.startsWith("2001:db8:") || value.startsWith("::ffff:127.") || value.startsWith("::ffff:10.") || value.startsWith("::ffff:192.168.");
  }
  return true;
}

async function assertPublicDestination(value: string) {
  const url = new URL(normalizePublicUrl(value));
  if (url.username || url.password) throw new Error("URLs com credenciais não são permitidas.");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local")) throw new Error("Use um domínio público para verificar a tag.");
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((item) => isBlockedAddress(item.address))) throw new Error("O domínio não aponta para um endereço público permitido.");
  return url;
}

async function limitedText(response: Response, limit = 1_500_000) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > limit) throw new Error("A página é grande demais para verificação automática.");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new Error("A página é grande demais para verificação automática."); }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

export async function verifyGtmInstallation(siteUrl: string, expectedContainerId: string) {
  const expected = normalizeGtmContainerId(expectedContainerId);
  let current = await assertPublicDestination(siteUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    for (let redirect = 0; redirect <= 3; redirect += 1) {
      const response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "text/html", "User-Agent": "PulseCamp-Tag-Verifier/1.0" },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirect === 3) throw new Error("O site redirecionou mais vezes que o permitido.");
        current = await assertPublicDestination(new URL(location, current).toString());
        continue;
      }
      if (!response.ok) throw new Error(`O site respondeu HTTP ${response.status}.`);
      const type = response.headers.get("content-type") || "";
      if (!type.includes("text/html")) throw new Error("A URL não retornou uma página HTML.");
      const containers = detectGtmContainers(await limitedText(response));
      const installed = containers.includes(expected);
      return {
        installed,
        containers,
        checkedUrl: current.toString(),
        message: installed
          ? `${expected} encontrado no HTML público.`
          : containers.length
            ? `Encontramos ${containers.join(", ")}, mas não ${expected}.`
            : `Nenhum container GTM foi encontrado no HTML público.`,
      };
    }
    throw new Error("Não foi possível concluir a verificação.");
  } finally {
    clearTimeout(timeout);
  }
}
