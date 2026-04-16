/* ════════════════════════════════════════════════════════════
   SCRIPT.JS — Lógica do formulário público (index.html)
   ════════════════════════════════════════════════════════════ */

/* ╔══════════════════════════════════════════════════════════╗
   ║  ✏️  CONFIGURAÇÕES — edite apenas este bloco            ║
   ╚══════════════════════════════════════════════════════════╝ */
const CONFIG = {

  /* 1. URL do Web App gerada no Google Apps Script
        Exemplo: "https://script.google.com/macros/s/XXXXXXX/exec"
        Deixe entre aspas duplas, exatamente como copiou. */
  urlAppsScript: "https://script.google.com/macros/s/AKfycbwEWPB91WZOxjppmwlfT45gF-ZzOA4WJ-yXOQlsh1Tx_0bhUSzZfvD3FiqcN_tiBK5MdA/exec",

  /* 2. Número do WhatsApp que vai receber o contato do lead
        Formato: DDI + DDD + número (somente dígitos, sem espaços)
        Exemplo Brasil: "5511999999999" */
  whatsappNumero: "5511999999999",

  /* 3. Nome do seu projeto — aparece na mensagem automática do WhatsApp */
  nomeProjeto: "Gran Treviso",

};
/* ══════════════════════════════════════════════════════════ */


/* ── Inicialização: lê o parâmetro ?ref= da URL ─────────────
   Exemplo: index.html?ref=joao-silva
   O valor "joao-silva" é gravado no campo oculto #indicador
   e exibido no badge da página.
─────────────────────────────────────────────────────────── */
(function lerIndicadorDaURL() {
  const ref = new URLSearchParams(window.location.search).get("ref") || "";

  // Grava no campo oculto do formulário
  document.getElementById("indicador").value = ref;

  // Mostra o badge somente se houver um indicador na URL
  if (ref) {
    const badge = document.getElementById("badgeRef");
    document.getElementById("nomeRef").textContent = capitalizar(ref.replace(/-/g, " "));
    badge.style.display = "block";
  }
})();


/* ── Máscara de telefone em tempo real ──────────────────────
   Formata enquanto o usuário digita:
   "11999999999" → "(11) 99999-9999"
─────────────────────────────────────────────────────────── */
document.getElementById("numero").addEventListener("input", function () {
  let n = this.value.replace(/\D/g, "").slice(0, 11);

  if (n.length <= 10) {
    // Telefone fixo: (XX) XXXX-XXXX
    n = n.replace(/^(\d{0,2})(\d{0,4})(\d{0,4})$/,
      (_, ddd, parte1, parte2) =>
        [ddd && `(${ddd}`, parte1 && `) ${parte1}`, parte2 && `-${parte2}`]
          .filter(Boolean).join(""));
  } else {
    // Celular: (XX) XXXXX-XXXX
    n = n.replace(/^(\d{2})(\d{5})(\d{0,4})$/, "($1) $2-$3");
  }

  this.value = n;
});


/* ── Envio do formulário ────────────────────────────────────
   1. Valida os campos
   2. Envia os dados para o Apps Script via fetch POST
   3. Redireciona para o WhatsApp com mensagem personalizada
─────────────────────────────────────────────────────────── */
document.getElementById("formLead").addEventListener("submit", async function (ev) {
  ev.preventDefault();
  esconderAlerta();

  /* Coleta valores */
  const nome      = document.getElementById("nome").value.trim();
  const numero    = document.getElementById("numero").value.trim();
  const email     = document.getElementById("email").value.trim();
  const indicador = document.getElementById("indicador").value.trim();

  /* ── Validação de campos obrigatórios ── */
  let valido = true;

  [["nome", nome], ["numero", numero], ["email", email]].forEach(([id, val]) => {
    const input = document.getElementById(id);
    if (!val) {
      input.classList.add("field--error");
      valido = false;
    } else {
      input.classList.remove("field--error");
    }
  });

  if (!valido) {
    mostrarAlerta("⚠️ Preencha todos os campos antes de continuar.", "error");
    return;
  }

  /* ── Validação de formato de e-mail ── */
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById("email").classList.add("field--error");
    mostrarAlerta("⚠️ Digite um e-mail válido.", "error");
    return;
  }

  /* ── Remove erros ao focar novamente ── */
  ["nome", "numero", "email"].forEach(id => {
    document.getElementById(id).addEventListener("focus", function () {
      this.classList.remove("field--error");
    }, { once: true });
  });

  /* ── Data e hora atual (fuso de São Paulo via locale) ── */
  const dataHora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  /* ── Ativa estado de carregamento ── */
  setCarregando(true);

  /* ── Payload enviado ao Apps Script ── */
  const payload = {
    action: "lead",
    nome,
    numero,
    email,
    indicador,
    dataHora,
  };

  try {
    /* Envia via POST
       Usamos "text/plain" para evitar o preflight CORS do Apps Script */
    await fetch(CONFIG.urlAppsScript, {
      method:  "POST",
      body:    JSON.stringify(payload),
      headers: { "Content-Type": "text/plain" },
    });

    mostrarAlerta("✅ Recebemos seus dados! Redirecionando para o WhatsApp...", "success");

    /* ── Monta a mensagem personalizada do WhatsApp ── */
    const nomeIndicador = indicador
      ? capitalizar(indicador.replace(/-/g, " "))
      : "um amigo";

    const mensagem =
      `Olá! Meu nome é ${nome}, acabei de preencher o formulário` +
      ` e vim pela indicação de ${nomeIndicador}.` +
      ` Gostaria de saber mais sobre ${CONFIG.nomeProjeto}.`;

    /* Redireciona após 1.5 s para o usuário ver a mensagem de sucesso */
    setTimeout(() => {
      window.location.href =
        `https://wa.me/${CONFIG.whatsappNumero}?text=${encodeURIComponent(mensagem)}`;
    }, 1500);

  } catch (err) {
    mostrarAlerta(
      "❌ Não foi possível enviar. Verifique sua conexão e tente novamente.",
      "error"
    );
    setCarregando(false);
  }
});


/* ════════════════════════════════════════════════════════════
   FUNÇÕES AUXILIARES
   ════════════════════════════════════════════════════════════ */

/**
 * Ativa ou desativa o estado de carregamento do botão de envio.
 * @param {boolean} ativo
 */
function setCarregando(ativo) {
  const btn     = document.getElementById("btnEnviar");
  const spinner = document.getElementById("spinner");
  const texto   = document.getElementById("btnTexto");

  btn.disabled          = ativo;
  spinner.style.display = ativo ? "block" : "none";
  texto.textContent     = ativo ? "Enviando..." : "💬 Quero ser contactado";
}

/**
 * Exibe uma mensagem de feedback para o usuário.
 * @param {string} msg  - Texto da mensagem
 * @param {"success"|"error"} tipo
 */
function mostrarAlerta(msg, tipo) {
  const el = document.getElementById("alerta");
  el.textContent   = msg;
  el.className     = `alert alert--${tipo}`;
  el.style.display = "block";
}

/** Esconde o alerta. */
function esconderAlerta() {
  document.getElementById("alerta").style.display = "none";
}

/**
 * Capitaliza a primeira letra de cada palavra.
 * "joao silva" → "Joao Silva"
 * @param {string} str
 * @returns {string}
 */
function capitalizar(str) {
  return str.replace(/\b\w/g, l => l.toUpperCase());
}