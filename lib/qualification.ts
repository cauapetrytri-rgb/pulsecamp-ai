import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import type { LeadTier } from "@/lib/types";

export const QualificationSchema = z.object({
  score: z.number().int().min(0).max(100),
  tier: z.enum(["cold", "warm", "hot"]),
  qualified: z.boolean(),
  intent: z.string().min(1).max(220),
  urgency: z.enum(["low", "medium", "high", "unknown"]),
  budgetSignal: z.string().min(1).max(160),
  locationSignal: z.string().min(1).max(160),
  reasons: z.array(z.string().min(1).max(180)).max(4),
  objections: z.array(z.string().min(1).max(180)).max(4),
  recommendedAction: z.string().min(1).max(240),
});

export type QualificationResult = z.infer<typeof QualificationSchema> & {
  provider: "openai" | "rules";
};

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function qualifyWithRules(conversation: string, threshold = 70): QualificationResult {
  const text = conversation.toLocaleLowerCase("pt-BR");
  let score = 25;
  const reasons: string[] = [];
  const objections: string[] = [];

  if (includesAny(text, ["orçamento", "orcamento", "preço", "preco", "quanto custa", "valor"])) {
    score += 16;
    reasons.push("Perguntou sobre preço ou orçamento");
  }
  if (includesAny(text, ["quero contratar", "quero comprar", "quero fechar", "agendar", "visitar", "tenho interesse"])) {
    score += 26;
    reasons.push("Demonstrou intenção comercial explícita");
  }
  if (includesAny(text, ["hoje", "agora", "urgente", "esta semana", "o quanto antes"])) {
    score += 15;
    reasons.push("Apresentou urgência");
  }
  if (/r\$\s?\d|\b\d{3,}\b/.test(text) || includesAny(text, ["meu orçamento", "tenho verba"])) {
    score += 10;
    reasons.push("Indicou capacidade ou faixa de investimento");
  }
  if (includesAny(text, ["só olhando", "so olhando", "curiosidade", "de graça", "gratis", "gratuito"])) {
    score -= 22;
    objections.push("Baixo compromisso ou busca exclusiva por gratuidade");
  }

  score = Math.max(0, Math.min(100, score));
  const tier: LeadTier = score >= 80 ? "hot" : score >= 60 ? "warm" : "cold";
  const qualified = score >= threshold;

  return {
    score,
    tier,
    qualified,
    intent: qualified ? "Intenção comercial compatível com abordagem de vendas" : "Intenção ainda insuficiente para qualificação",
    urgency: includesAny(text, ["hoje", "agora", "urgente", "o quanto antes"]) ? "high" : "unknown",
    budgetSignal: /r\$\s?\d|\b\d{3,}\b/.test(text) ? "Há referência numérica de orçamento" : "Orçamento não confirmado",
    locationSignal: "Localização não confirmada",
    reasons: reasons.length ? reasons.slice(0, 4) : ["Ainda há poucos sinais comerciais na conversa"],
    objections,
    recommendedAction: qualified
      ? "Responder rapidamente, confirmar necessidade, prazo e orçamento e conduzir para o próximo passo."
      : "Fazer duas perguntas objetivas sobre necessidade, prazo e faixa de investimento antes de qualificar.",
    provider: "rules",
  };
}

export async function qualifyConversation(conversation: string, threshold = 70): Promise<QualificationResult> {
  if (!process.env.OPENAI_API_KEY) return qualifyWithRules(conversation, threshold);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_QUALIFICATION_MODEL || "gpt-5.4-mini";
  const response = await client.responses.parse({
    model,
    input: [
      {
        role: "system",
        content: [
          "Você classifica leads comerciais recebidos pelo WhatsApp para gestores de tráfego.",
          `Considere qualificado somente se a nota for maior ou igual a ${threshold}.`,
          "Use apenas sinais explícitos de necessidade, aderência, orçamento, localização e urgência.",
          "Não infira características sensíveis ou protegidas. Seja conservador quando faltarem dados.",
          "Responda em português do Brasil.",
        ].join(" "),
      },
      { role: "user", content: conversation.slice(-12_000) },
    ],
    text: { format: zodTextFormat(QualificationSchema, "lead_qualification") },
  });

  if (!response.output_parsed) throw new Error("A IA não retornou uma qualificação estruturada.");
  const parsed = QualificationSchema.parse(response.output_parsed);
  return { ...parsed, qualified: parsed.score >= threshold, provider: "openai" };
}
