/* ════════════════════════════════════════════════════════════
   ADMIN.JS — Lógica do painel de indicadores (admin.html)
   ════════════════════════════════════════════════════════════ */

/* ╔══════════════════════════════════════════════════════════╗
   ║  ✏️  CONFIGURAÇÕES — edite apenas este bloco            ║
   ╚══════════════════════════════════════════════════════════╝ */
const CONFIG = {

  /* 1. Mesma URL do Web App usada no script.js
        Exemplo: "https://script.google.com/macros/s/XXXXXXX/exec" */
  urlAppsScript: "https://script.google.com/macros/s/AKfycbwEWPB91WZOxjppmwlfT45gF-ZzOA4WJ-yXOQlsh1Tx_0bhUSzZfvD3FiqcN_tiBK5MdA/exec",

  /* 2. URL base do seu site (onde está o index.html publicado)
        Exemplos:
          "https://meuusuario.github.io"              ← repo com nome do usuário
          "https://meuusuario.github.io/meu-projeto"  ← repo com nome diferente */
  urlBase: "https://meuusuario.github.io",

};
/* ══════════════════════════════════════════════════════════ */


/* Estado local: guarda os dados gerados até salvar */
let dadosGerados = null;


/* ── Botão GERAR ────────────────────────────────────────────
   Converte o nome em código slug, monta o link, exibe o QR Code
─────────────────────────────────────────────────────────── */
document.getElementById("btnGerar").addEventListener("click", () => {
  const nome = document.getElementById("nomeIndicador").value.trim();

  if (!nome) {
    pulsarCampo("nomeIndicador");
    return;
  }

  /* Gera o código e o link */
  const codigo = slugify(nome);
  const link   = `${CONFIG.urlBase}/?ref=${codigo}`;

  /* URL do QR Code — API gratuita, sem necessidade de cadastro */
  const qrSrc =
    `https://api.qrserver.com/v1/create-qr-code/` +
    `?size=200x200&data=${encodeURIComponent(link)}&margin=10&color=1a73e8&bgcolor=ffffff`;

  /* Preenche o painel de resultado */
  document.getElementById("outCodigo").textContent = codigo;
  document.getElementById("outLink").textContent   = link;
  document.getElementById("qrImg").src             = qrSrc;

  /* Exibe o painel */
  const painel = document.getElementById("painelResultado");
  painel.style.display = "block";

  /* Reseta o botão Salvar e oculta alertas anteriores */
  resetarBtnSalvar();
  esconderAlerta("alertaSalvar");

  /* Avança barra de etapas para a etapa 2 */
  setEtapa(2);

  /* Guarda em memória para usar no botão Salvar */
  dadosGerados = { nome, codigo, link };

  /* Rola suavemente até o painel */
  setTimeout(() =>
    painel.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80
  );
});


/* ── Botão SALVAR ────────────────────────────────────────────
   Envia os dados para o Apps Script → aba "Indicadores"
─────────────────────────────────────────────────────────── */
document.getElementById("btnSalvar").addEventListener("click", async () => {
  if (!dadosGerados) return;

  const btn     = document.getElementById("btnSalvar");
  const spinner = document.getElementById("spinnerSalvar");
  const txt     = document.getElementById("txtSalvar");

  /* Ativa carregamento */
  btn.disabled          = true;
  spinner.style.display = "inline-block";
  txt.textContent       = "Salvando...";

  const payload = {
    action:  "indicador",
    nome:    dadosGerados.nome,
    codigo:  dadosGerados.codigo,
    link:    dadosGerados.link,
  };

  try {
    const resp   = await fetch(CONFIG.urlAppsScript, {
      method:  "POST",
      body:    JSON.stringify(payload),
      headers: { "Content-Type": "text/plain" },
    });

    const dados = await resp.json().catch(() => ({ status: "sucesso" }));

    if (dados.status === "aviso") {
      /* Código duplicado — avisa sem tratar como erro */
      mostrarAlerta("alertaSalvar",
        `⚠️ ${dados.mensagem}`, "error");
      resetarBtnSalvar();
      return;
    }

    /* Sucesso */
    mostrarAlerta("alertaSalvar",
      "✅ Indicador salvo na planilha com sucesso!", "success");
    txt.textContent = "✅ Salvo!";
    setEtapa(3);

    /* Limpa o formulário após 3 s */
    setTimeout(() => {
      document.getElementById("nomeIndicador").value  = "";
      document.getElementById("painelResultado").style.display = "none";
      dadosGerados = null;
      setEtapa(1);
    }, 3200);

  } catch (err) {
    mostrarAlerta("alertaSalvar",
      "❌ Erro ao salvar. Verifique a URL do Apps Script.", "error");
    resetarBtnSalvar();
  }
});


/* ════════════════════════════════════════════════════════════
   FUNÇÕES AUXILIARES
   ════════════════════════════════════════════════════════════ */

/**
 * Converte um nome em slug kebab-case sem acentos.
 * "João da Silva" → "joao-da-silva"
 * @param {string} str
 * @returns {string}
 */
function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // remove acentos
    .replace(/[^a-z0-9\s]/g, "")       // remove caracteres especiais
    .trim()
    .replace(/\s+/g, "-");             // espaços → hífens
}

/**
 * Copia o texto de um elemento para a área de transferência
 * e muda o ícone do botão por 1.5 s como feedback visual.
 * @param {string} id  - ID do elemento com o texto
 * @param {HTMLElement} btn - Botão clicado
 */
function copiar(id, btn) {
  const texto = document.getElementById(id).textContent;
  navigator.clipboard.writeText(texto).then(() => {
    const original = btn.textContent;
    btn.textContent = "✅";
    setTimeout(() => { btn.textContent = original; }, 1600);
  }).catch(() => {
    /* Fallback para navegadores sem suporte a clipboard API */
    const el = document.createElement("textarea");
    el.value = texto;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    btn.textContent = "✅";
    setTimeout(() => { btn.textContent = "📋"; }, 1600);
  });
}

/**
 * Atualiza a barra de progresso de etapas.
 * @param {1|2|3} n - Etapa atual
 */
function setEtapa(n) {
  ["step1", "step2", "step3"].forEach((id, i) => {
    const el = document.getElementById(id);
    el.className = "steps-bar__step";
    if (i + 1 <  n) el.classList.add("steps-bar__step--complete");
    if (i + 1 === n) el.classList.add("steps-bar__step--active");
  });
}

/**
 * Exibe um alerta de feedback.
 * @param {string} id   - ID do elemento .alert
 * @param {string} msg  - Texto da mensagem
 * @param {"success"|"error"} tipo
 */
function mostrarAlerta(id, msg, tipo) {
  const el = document.getElementById(id);
  el.textContent   = msg;
  el.className     = `alert alert--${tipo}`;
  el.style.display = "block";
}

/**
 * Esconde um alerta.
 * @param {string} id
 */
function esconderAlerta(id) {
  document.getElementById(id).style.display = "none";
}

/**
 * Anima o campo com borda vermelha por 700 ms (validação visual).
 * @param {string} id
 */
function pulsarCampo(id) {
  const el = document.getElementById(id);
  el.classList.add("field--error");
  el.focus();
  setTimeout(() => el.classList.remove("field--error"), 700);
}

/**
 * Restaura o botão Salvar ao estado inicial.
 */
function resetarBtnSalvar() {
  const btn     = document.getElementById("btnSalvar");
  const spinner = document.getElementById("spinnerSalvar");
  const txt     = document.getElementById("txtSalvar");

  btn.disabled          = false;
  spinner.style.display = "none";
  txt.textContent       = "💾 Salvar na planilha";
}