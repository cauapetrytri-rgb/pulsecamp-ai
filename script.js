const campaigns = [
  {
    name: "Lead Solar Premium",
    channel: "Meta + Google",
    status: "Ajustar",
    roas: "3,1x",
    budget: "R$ 18.400",
    signal: "Fadiga de criativo em publico frio",
    badge: "yellow",
  },
  {
    name: "Reativacao 90 dias",
    channel: "Email + WhatsApp",
    status: "Pronta",
    roas: "6,4x",
    budget: "R$ 2.900",
    signal: "Alto potencial de recompra",
    badge: "green",
  },
  {
    name: "Diagnostico gratuito",
    channel: "LinkedIn + Meta",
    status: "Ativa",
    roas: "4,7x",
    budget: "R$ 11.200",
    signal: "Escalar criativo B",
    badge: "green",
  },
  {
    name: "Oferta relampago Julho",
    channel: "CRM",
    status: "Risco",
    roas: "1,8x",
    budget: "R$ 7.600",
    signal: "CPA acima da margem prevista",
    badge: "red",
  },
];

const approvals = [
  {
    title: "Carrossel: 5 sinais de campanha desperdicando verba",
    copy: "IA recomenda publicar hoje as 18h40. Gancho com maior chance de clique: 'sua verba pode estar vazando sem aparecer no dashboard'.",
  },
  {
    title: "Email: diagnostico gratuito",
    copy: "Segmento com 2.491 contatos. Previsao de 31 reunioes se enviado em duas ondas.",
  },
  {
    title: "WhatsApp: recuperacao de proposta",
    copy: "Mensagem curta e consultiva para leads que abriram proposta e nao responderam em 72h.",
  },
];

const table = document.querySelector("#campaignTable");
const approvalList = document.querySelector("#approvalList");
const views = document.querySelectorAll(".view");
const navItems = document.querySelectorAll(".nav-item");
const modal = document.querySelector("#modal");
const modalBody = document.querySelector("#modalBody");
const campaignForm = document.querySelector("#campaignForm");
const campaignOutput = document.querySelector("#campaignOutput");

function renderCampaigns() {
  const header = `
    <div class="campaign-row header">
      <span>Campanha</span>
      <span>Canal</span>
      <span>Status</span>
      <span>ROAS</span>
      <span>Verba</span>
      <span>Sinal da IA</span>
    </div>
  `;

  const rows = campaigns
    .map(
      (campaign) => `
      <article class="campaign-row">
        <strong>${campaign.name}</strong>
        <span>${campaign.channel}</span>
        <span class="badge ${campaign.badge}">${campaign.status}</span>
        <span>${campaign.roas}</span>
        <span>${campaign.budget}</span>
        <p>${campaign.signal}</p>
      </article>
    `,
    )
    .join("");

  table.innerHTML = header + rows;
}

function renderApprovals() {
  approvalList.innerHTML = approvals
    .map(
      (item, index) => `
      <article>
        <strong>${item.title}</strong>
        <p>${item.copy}</p>
        <div class="top-actions">
          <button class="secondary-button" type="button" data-approval="${index}">Editar</button>
          <button class="primary-button" type="button" data-approve="${index}">Aprovar</button>
        </div>
      </article>
    `,
    )
    .join("");
}

function showView(id) {
  views.forEach((view) => view.classList.toggle("active-view", view.id === id));
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === id));
}

function openModal(message) {
  if (message) {
    modalBody.textContent = message;
  }
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function generateCampaign(event) {
  event.preventDefault();
  const form = new FormData(campaignForm);
  const goal = form.get("goal");
  const audience = form.get("audience");
  const offer = form.get("offer");

  campaignOutput.innerHTML = `
    <strong>Campanha: ${goal}</strong>
    <h3>Hipotese</h3>
    <p>${audience} tende a responder melhor a uma promessa de clareza operacional, com prova rapida e convite de baixo atrito.</p>
    <h3>Oferta</h3>
    <p>${offer}. A IA recomenda apresentar como auditoria de 12 minutos com 3 oportunidades imediatas.</p>
    <h3>Plano multicanal</h3>
    <ul>
      <li>Meta Ads: 3 criativos com dor, prova e comparativo antes/depois.</li>
      <li>Google: grupo de busca para intencao alta e landing page objetiva.</li>
      <li>Email: sequencia de 4 mensagens para leads mornos.</li>
      <li>WhatsApp: follow-up consultivo para quem clicou e nao agendou.</li>
    </ul>
    <h3>Regra da IA</h3>
    <p>Se o CPA subir 20% por 48h, reduzir verba fria e mover orcamento para remarketing automaticamente.</p>
  `;
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const nav = target.closest(".nav-item");
  if (nav) {
    showView(nav.dataset.view);
  }

  if (target.matches("[data-action='create-campaign']")) {
    showView("planner");
  }

  if (target.matches("[data-action='open-ai']")) {
    openModal("A IA recomenda pausar a campanha de menor margem, acelerar a reativacao por WhatsApp e publicar o criativo com prova social hoje as 18h40.");
  }

  if (target.matches("[data-action='close-modal']")) {
    closeModal();
  }

  if (target.matches("[data-action='apply-recommendation']")) {
    closeModal();
    showView("planner");
    campaignOutput.innerHTML = `
      <strong>Plano criado a partir da recomendacao</strong>
      <h3>Acoes automaticas</h3>
      <ul>
        <li>Pausar 12% da verba fria por 5 dias.</li>
        <li>Criar teste A/B com duas promessas de alto contraste.</li>
        <li>Enviar follow-up para leads que abriram proposta.</li>
        <li>Gerar relatorio executivo para aprovacao do gestor.</li>
      </ul>
    `;
  }

  if (target.matches("[data-approve]")) {
    target.textContent = "Aprovado";
    target.setAttribute("disabled", "true");
  }
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

campaignForm.addEventListener("submit", generateCampaign);

renderCampaigns();
renderApprovals();
