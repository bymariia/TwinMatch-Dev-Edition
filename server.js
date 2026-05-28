// ==========================================================================
// SERVIDOR CORE // ORQUESTRADOR MULTIPLAYER (NODE.JS + SOCKET.IO)
// ==========================================================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { JogoDaMemoria } from './src/domain/jogoDaMemoria.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// --- MIDDLEWARES & ASSETS CONFIGURATION ---
app.use(express.static(path.join(__dirname, 'public')));
app.use('/src', express.static(path.join(__dirname, 'src')));

const listaTecnologias = [
  'JavaScript', 'Python', 'Java', 'C#', 
  'HTML5', 'CSS3', 'React', 'Node.js', 
  'GitHub', 'SQL', 'Docker', 'Linux'
];

// --- SERVER STATE MANAGEMENT ---
let jogo = new JogoDaMemoria(listaTecnologias);
const mapeamentoSockets = {}; 
let jogadoresQueremRematch = [];
let timerInterval = null;
let tempoAtual = 0; 

// ==========================================================================
// SISTEMA DE CRONOMETRAGEM (TIMERS & ENGINE CLOCK)
// ==========================================================================

function iniciarCronometro() {
  clearInterval(timerInterval);
  tempoAtual = 0;
  
  timerInterval = setInterval(() => {
    tempoAtual++;
    io.emit('tick_relogio', tempoAtual);
  }, 1000);
}

function pararCronometro() {
  clearInterval(timerInterval);
}

function trocarTurnoRelogio() {
  const jogadorAtual = jogo.obterTurnoAtual();
  jogo.registrarTempoTurno(jogadorAtual, tempoAtual);
  tempoAtual = 0;
  io.emit('tick_relogio', tempoAtual);
}

// ==========================================================================
// PROTOCOLO WEBSOCKET (SOCKET.IO EVENTS)
// ==========================================================================

io.on('connection', (socket) => {
  console.log(`[CONEXÃO] Novo cliente conectado: ${socket.id}`);
  socket.emit('estado_atualizado', sincronizarEstado());

  // Registro e Autenticação de Jogador
  socket.on('jogador_entrar', (apelido) => {
    try {
      const jogadores = jogo.obterJogadores();
      if (jogadores.includes(apelido)) {
        mapeamentoSockets[socket.id] = apelido;
      } else {
        jogo.adicionarJogador(apelido);
        mapeamentoSockets[socket.id] = apelido;
      }
      io.emit('estado_atualizado', sincronizarEstado());
    } catch (erro) {
      socket.emit('erro_sistema', erro.message);
    }
  });

  // Confirmação de Prontidão (Matchmaking)
  socket.on('jogador_pronto', (apelido) => {
    try {
      jogo.definirPronto(apelido);
      jogo.iniciar();
      if (jogo.obterStatus() === 'EM_ANDAMENTO') {
        iniciarCronometro();
      }
      io.emit('estado_atualizado', sincronizarEstado());
    } catch (erro) {
      socket.emit('erro_sistema', erro.message);
    }
  });

  // Gameplay: Interação com o Deck
  socket.on('virar_carta', ({ jogador, index }) => {
    if (jogo.obterTurnoAtual() !== jogador) return;
    
    const acertouPar = jogo.virarCarta(jogador, index);

    if (acertouPar) {
      io.emit('receber_reacao', { autor: 'SYS', mensagem: `⚡ ${jogador} fechou um par!` });
    }
    
    if (jogo.obterStatus() === 'FINALIZADO') {
      jogo.registrarTempoTurno(jogador, tempoAtual);
      pararCronometro();
    }

    io.emit('estado_atualizado', sincronizarEstado());

    const cartasViradas = jogo.obterCartas().filter(c => c.virada && !c.encontrada);
    
    if (!acertouPar && cartasViradas.length === 2) {
      io.emit('travar_cliques', true);
      trocarTurnoRelogio();
      setTimeout(() => {
        jogo.finalizarTurnoSeIncorreto();
        io.emit('travar_cliques', false);
        io.emit('estado_atualizado', sincronizarEstado());
      }, 1100);
    } else if (acertouPar && cartasViradas.length === 0 && jogo.obterStatus() === 'EM_ANDAMENTO') {
      trocarTurnoRelogio();
    }
  });

  // Chat e Interações de Emojis
  socket.on('enviar_reacao', ({ autor, mensagem }) => {
    io.emit('receber_reacao', { autor, mensagem });
  });

  // Abandono Voluntário (Desistência)
  socket.on('abandonar_partida', (apelido) => {
    const jogadores = jogo.obterJogadores();
    const vencedorPorWO = jogadores.find(j => j !== apelido);
    io.emit('partida_encerrada_wo', vencedorPorWO);
    resetarServidor();
  });

  // Tratamento de Desconexões de Rede
  socket.on('disconnect', () => {
    const apelido = mapeamentoSockets[socket.id];
    if (apelido) {
      console.log(`[DESCONEXÃO] ${apelido} saiu.`);
      delete mapeamentoSockets[socket.id];
      
      if (jogo.obterStatus() !== 'EM_ANDAMENTO') {
        resetarServidor();
        io.emit('estado_atualizado', sincronizarEstado());
      } else {
        const jogadores = jogo.obterJogadores();
        if (jogadores.includes(apelido)) {
          const sobrevivente = jogadores.find(j => j !== apelido);
          io.emit('partida_encerrada_wo', sobrevivente);
          resetarServidor();
        }
      }
    }
  });

  // Orquestração de Revanche Direta (Rematch Pipeline)
  socket.on('solicitar_rematch', (apelido) => {
    if (!jogadoresQueremRematch.includes(apelido)) {
      jogadoresQueremRematch.push(apelido);
      io.emit('receber_reacao', { autor: 'SYS', mensagem: `🔄 ${apelido} quer revanche!` });
    }

    if (jogadoresQueremRematch.length === 2) {
      const jogadoresAtuais = jogo.obterJogadores();
      jogo = new JogoDaMemoria(listaTecnologias);

      jogadoresAtuais.forEach(j => {
        jogo.adicionarJogador(j);
        jogo.definirPronto(j);
      });

      jogo.iniciar();
      iniciarCronometro();
      jogadoresQueremRematch = [];
      io.emit('estado_atualizado', sincronizarEstado());
    }
  });
});

// ==========================================================================
// UTILITÁRIOS E FUNÇÕES AUXILIARES DE ESTADO
// ==========================================================================

function sincronizarEstado() {
  return {
    jogadores: jogo.obterJogadores(),
    status: jogo.obterStatus(),
    turnoAtual: jogo.obterTurnoAtual(),
    cartas: jogo.obterCartas(),
    vencedor: jogo.obterStatus() === 'FINALIZADO' ? jogo.obterVencedor() : null,
    tempos: typeof jogo.obterTempos === 'function' ? jogo.obterTempos() : {},
    pontuacoes: jogo.obterJogadores().reduce((acc, j) => {
      acc[j] = jogo.obterPontuacao(j);
      return acc;
    }, {})
  };
}

function resetarServidor() {
  pararCronometro();
  jogo = new JogoDaMemoria(listaTecnologias);
  jogadoresQueremRematch = [];
  for (const prop in mapeamentoSockets) {
    delete mapeamentoSockets[prop];
  }
}

// --- BOOTSTRAP APPLICATION ---
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor multiplayer online na porta http://localhost:${PORT}`);
});