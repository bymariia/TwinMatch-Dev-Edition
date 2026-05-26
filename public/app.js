// Conexão automática com o servidor backend
const socket = io();

let meuApelido = null;
let estadoLocal = {};
let travadoParaClique = false;

// --- SELEÇÃO DE ELEMENTOS DO DOM ---
const painelInicial = document.getElementById('painel-inicial');
const painelTabuleiro = document.getElementById('painel-tabuleiro');
const gridCartas = document.getElementById('grid-cartas');
const inputApelido = document.getElementById('input-apelido');
const btnEntrar = document.getElementById('btn-entrar');
const p1Nome = document.getElementById('p1-nome');
const p2Nome = document.getElementById('p2-nome');
const btnReadyP1 = document.getElementById('btn-ready-p1');
const btnReadyP2 = document.getElementById('btn-ready-p2');
const pontosP1 = document.getElementById('pontos-p1');
const pontosP2 = document.getElementById('pontos-p2');
const turnoJogador = document.getElementById('turno-jogador');
const tempoTurno = document.getElementById('tempo-turno'); // <-- CRONÔMETRO AQUI
const historicoChat = document.getElementById('historico-chat');
const btnAbandonar = document.getElementById('btn-abandonar');
const placarP1 = document.getElementById('placar-p1');
const placarP2 = document.getElementById('placar-p2');

const modalConfirmarAbandono = document.getElementById('modal-confirmar-abandono');
const btnConfirmarAbandono = document.getElementById('btn-confirmar-abandono');
const btnCancelarAbandono = document.getElementById('btn-cancelar-abandono');

const modalFim = document.getElementById('modal-fim');
const modalTitulo = document.getElementById('modal-titulo');
const resP1Val = document.getElementById('res-p1-val');
const resP2Val = document.getElementById('res-p2-val');
const resP1Label = document.getElementById('res-p1-label');
const resP2Label = document.getElementById('res-p2-label');
const resVencedor = document.getElementById('res-vencedor');
const btnNovaPartida = document.getElementById('btn-nova-partida');
const btnSair = document.getElementById('btn-sair');

const dicionarioIcones = {
  'JavaScript': 'devicon-javascript-plain colored', 'Python': 'devicon-python-plain colored',
  'Java': 'devicon-java-plain colored', 'C#': 'devicon-csharp-plain colored',
  'HTML5': 'devicon-html5-plain colored', 'CSS3': 'devicon-css3-plain colored',
  'React': 'devicon-react-original colored', 'Node.js': 'devicon-nodejs-plain colored',
  'GitHub': 'devicon-github-original text-slate-100', 'SQL': 'devicon-sqlite-plain colored',
  'Docker': 'devicon-docker-plain colored', 'Linux': 'devicon-linux-plain colored'
};

// --- ENVIO DE EVENTOS PARA O SERVIDOR ---
btnEntrar.addEventListener('click', () => {
  const apelido = inputApelido.value.trim();
  if (!apelido) return;
  meuApelido = apelido;
  socket.emit('jogador_entrar', apelido);
  inputApelido.value = '';
});

btnReadyP1.addEventListener('click', () => {
  socket.emit('jogador_pronto', meuApelido);
  btnReadyP1.textContent = 'AGUARDANDO RIVAL...';
  btnReadyP1.className = "bg-emerald-600 text-[10px] px-3 py-1 rounded-full uppercase font-bold text-white cursor-not-allowed";
  btnReadyP1.disabled = true;
});

btnReadyP2.addEventListener('click', () => {
  socket.emit('jogador_pronto', meuApelido);
  btnReadyP2.textContent = 'AGUARDANDO RIVAL...';
  btnReadyP2.className = "bg-emerald-600 text-[10px] px-3 py-1 rounded-full uppercase font-bold text-white cursor-not-allowed";
  btnReadyP2.disabled = true;
});

btnAbandonar.addEventListener('click', () => {
  modalConfirmarAbandono.classList.remove('hidden');
});

btnCancelarAbandono.addEventListener('click', () => modalConfirmarAbandono.classList.add('hidden'));

btnConfirmarAbandono.addEventListener('click', () => {
  modalConfirmarAbandono.classList.add('hidden');
  socket.emit('abandonar_partida', meuApelido);
});

// O botão Sair continua reiniciando a página (isso está correto)
btnSair.addEventListener('click', () => location.reload());

// MODIFICAÇÃO AQUI: O botão Rematch agora fala com o servidor
btnNovaPartida.addEventListener('click', () => {
  // 1. Envia o sinal de revanche para o servidor
  socket.emit('solicitar_rematch', meuApelido);

  // 2. Muda o visual do botão para indicar que está esperando o outro jogador
  btnNovaPartida.textContent = 'AGUARDANDO RIVAL...';
  btnNovaPartida.disabled = true;
  btnNovaPartida.className = "flex-grow bg-slate-700 text-slate-400 font-extrabold py-4 rounded-2xl text-xs uppercase tracking-wider cursor-not-allowed";
});

// --- ESCUTANDO DO SERVIDOR EM TEMPO REAL ---

// RECEBE E FORMATA O TEMPO DO CRONÔMETRO
socket.on('tick_relogio', (segundosTotais) => {
  if (!tempoTurno) return;
  const minutos = Math.floor(segundosTotais / 60).toString().padStart(2, '0');
  const segundos = (segundosTotais % 60).toString().padStart(2, '0');
  tempoTurno.textContent = `${minutos}:${segundos}`;
});

socket.on('estado_atualizado', (estadoServer) => {
  const primeiroCarregamento = Object.keys(estadoLocal).length === 0;
  estadoLocal = estadoServer;

  // Atualiza painel de autenticação inicial
  const j = estadoServer.jogadores;
  p1Nome.textContent = j[0] || 'Aguardando...';
  p2Nome.textContent = j[1] || 'Aguardando...';

  // Gerenciar botões de Ready sem sobrescrever o clique recente
  if (j[0]) {
    if (j[0] === meuApelido) {
      if (btnReadyP1.textContent !== 'AGUARDANDO RIVAL...') {
        btnReadyP1.disabled = false;
        btnReadyP1.className = "bg-indigo-600 hover:bg-indigo-500 text-[10px] px-3 py-1 rounded-full uppercase font-bold text-white cursor-pointer";
      }
    } else {
      btnReadyP1.disabled = true;
      btnReadyP1.className = "bg-slate-700 text-[10px] px-3 py-1 rounded-full text-slate-500 cursor-not-allowed";
    }
  }
  if (j[1]) {
    if (j[1] === meuApelido) {
      if (btnReadyP2.textContent !== 'AGUARDANDO RIVAL...') {
        btnReadyP2.disabled = false;
        btnReadyP2.className = "bg-purple-600 hover:bg-purple-500 text-[10px] px-3 py-1 rounded-full uppercase font-bold text-white cursor-pointer";
      }
    } else {
      btnReadyP2.disabled = true;
      btnReadyP2.className = "bg-slate-700 text-[10px] px-3 py-1 rounded-full text-slate-500 cursor-not-allowed";
    }
  }

  // Se o jogo começou (ou foi reiniciado), alterna os painéis
  if (estadoServer.status === 'EM_ANDAMENTO') {
    painelInicial.classList.add('hidden');
    painelTabuleiro.classList.remove('hidden');
    
    // 1. Esconde o modal de fim de jogo que estava aberto
    modalFim.classList.add('hidden'); 

    // 2. Restaura o botão de Rematch para o estado e design original verde-esmeralda
    btnNovaPartida.disabled = false;
    btnNovaPartida.innerHTML = `<i class="fas fa-play mr-1.5"></i> Rematch`;
    btnNovaPartida.className = "flex-grow bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 text-white font-extrabold py-4 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20";

    renderizarTabuleiro(primeiroCarregamento);
  }

  // Se o jogo terminou normalmente
  if (estadoServer.status === 'FINALIZADO') {
    exibirModalFimNormal(estadoServer);
  }
});

socket.on('travar_cliques', (travar) => {
  travadoParaClique = travar;
});

socket.on('partida_encerrada_wo', (vencedorPorWO) => {
  modalTitulo.textContent = "MATCH_HALTED";
  resVencedor.textContent = `${vencedorPorWO} (W.O.)`;
  btnNovaPartida.classList.add('hidden');
  modalFim.classList.remove('hidden');
});

socket.on('erro_sistema', (msg) => alert(msg));

// --- RENDERIZAÇÃO DA INTERFACE ---
function renderizarTabuleiro(forçarCascata) {
  const j = estadoLocal.jogadores;
  document.getElementById('txt-placar-p1').textContent = j[0] || 'P1';
  document.getElementById('txt-placar-p2').textContent = j[1] || 'P2';

  pontosP1.textContent = estadoLocal.pontuacoes[j[0]] || 0;
  pontosP2.textContent = estadoLocal.pontuacoes[j[1]] || 0;
  turnoJogador.textContent = estadoLocal.turnoAtual || '---';

  if (estadoLocal.turnoAtual === j[0]) {
    placarP1.className = "p-4 rounded-2xl bg-slate-800 border border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all opacity-100";
    placarP2.className = "p-4 rounded-2xl bg-slate-900/40 border border-white/5 transition-all opacity-40 scale-95";
  } else {
    placarP2.className = "p-4 rounded-2xl bg-slate-800 border border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all opacity-100";
    placarP1.className = "p-4 rounded-2xl bg-slate-900/40 border border-white/5 transition-all opacity-40 scale-95";
  }

  gridCartas.innerHTML = '';
  estadoLocal.cartas.forEach((carta, index) => {
    const cardElement = document.createElement('div');
    cardElement.className = 'perspective h-28 sm:h-32 cursor-pointer select-none';
    if (forçarCascata) {
      cardElement.classList.add('animate-card');
      cardElement.style.animationDelay = `${index * 0.04}s`;
    }

    const innerCard = document.createElement('div');
    innerCard.className = `w-full h-full relative flip-card-inner rounded-2xl shadow-xl ${carta.virada || carta.encontrada ? 'card-flipped' : ''}`;

    const front = document.createElement('div');
    front.className = 'w-full h-full absolute rounded-2xl bg-slate-800 border-2 border-indigo-500/50 flex flex-col items-center justify-center p-2 text-white card-flipped backface-hidden shadow-inner gap-2';
    const iconeClasse = dicionarioIcones[carta.conteudo] || 'devicon-javascript-plain colored';
    front.innerHTML = `<i class="${iconeClasse} text-4xl"></i><span class="text-[9px] font-mono text-slate-400">${carta.conteudo}</span>`;

    const back = document.createElement('div');
    back.className = 'w-full h-full absolute rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 border-2 border-white/10 hover:border-indigo-400 flex items-center justify-center font-mono font-bold text-2xl text-indigo-400/50 transition-all backface-hidden';
    back.innerHTML = '<i class="fas fa-microchip"></i>';

    innerCard.appendChild(front);
    innerCard.appendChild(back);
    cardElement.appendChild(innerCard);

    if (carta.encontrada) {
      cardElement.classList.add('pointer-events-none');
      front.classList.add('grayscale', 'opacity-30', 'bg-slate-900');
    }

    cardElement.addEventListener('click', () => {
      if (travadoParaClique || carta.virada || carta.encontrada) return;
      if (estadoLocal.turnoAtual !== meuApelido) {
        logNoConsole('SYS', 'Calma dev, não é o seu turno!');
        return;
      }

      socket.emit('virar_carta', { jogador: meuApelido, index });
    });
    gridCartas.appendChild(cardElement);
  });
}

function exibirModalFimNormal(estadoServer) {
  const j = estadoServer.jogadores;

  // Nomes e Pontuação de Pares
  resP1Label.textContent = j[0];
  resP2Label.textContent = j[1];
  resP1Val.textContent = `${estadoServer.pontuacoes[j[0]]} pares`;
  resP2Val.textContent = `${estadoServer.pontuacoes[j[1]]} pares`;

  // Tempos Acumulados
  const tempoP1 = estadoServer.tempos[j[0]] || 0;
  const tempoP2 = estadoServer.tempos[j[1]] || 0;
  document.getElementById('res-p1-tempo').textContent = `${tempoP1}s acumulados`;
  document.getElementById('res-p2-tempo').textContent = `${tempoP2}s acumulados`;

  // Declaração do Vencedor
  modalTitulo.textContent = "VICTORY_DECLARED";
  btnNovaPartida.classList.remove('hidden');
  resVencedor.textContent = estadoServer.vencedor === 'Empate' ? "DRAW GAME!" : estadoServer.vencedor;

  modalFim.classList.remove('hidden');
}

// --- CONSOLE DE REAÇÕES INTERATIVAS ---
function logNoConsole(autor, msg) {
  const div = document.createElement('div');
  div.innerHTML = `<span class="text-indigo-400">[${autor}]</span> ${msg}`;
  historicoChat.appendChild(div);
  historicoChat.scrollTop = historicoChat.scrollHeight;
}

document.querySelectorAll('.btn-emoji').forEach(b => {
  b.addEventListener('click', () => {
    if (!meuApelido) return;
    socket.emit('enviar_reacao', { autor: meuApelido.substring(0, 3).toUpperCase(), mensagem: b.textContent });
  });
});

socket.on('receber_reacao', ({ autor, mensagem }) => {
  logNoConsole(autor, mensagem);
});