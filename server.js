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

app.use(express.static(path.join(__dirname, 'public')));
app.use('/src', express.static(path.join(__dirname, 'src')));

const listaTecnologias = [
  'JavaScript', 'Python', 'Java', 'C#', 
  'HTML5', 'CSS3', 'React', 'Node.js', 
  'GitHub', 'SQL', 'Docker', 'Linux'
];

let jogo = new JogoDaMemoria(listaTecnologias);
const mapeamentoSockets = {}; 
let jogadoresQueremRematch = [];

let timerInterval = null;
let tempoAtual = 0; 

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

io.on('connection', (socket) => {
  console.log(`[CONEXÃO] Novo cliente conectado: ${socket.id}`);
  socket.emit('estado_atualizado', sincronizarEstado());

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

  socket.on('virar_carta', ({ jogador, index }) => {
    if (jogo.obterTurnoAtual() !== jogador) return;
    
    const acertouPar = jogo.virarCarta(jogador, index);

    // ✨ NOVIDADE: AVISA NO CHAT QUANDO FECHA O PAR!
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

  socket.on('enviar_reacao', ({ autor, mensagem }) => {
    io.emit('receber_reacao', { autor, mensagem }); // ✨ CORREÇÃO DE DIGITAÇÃO AQUI
  });

  socket.on('abandonar_partida', (apelido) => {
    const jogadores = jogo.obterJogadores();
    const vencedorPorWO = jogadores.find(j => j !== apelido);
    io.emit('partida_encerrada_wo', vencedorPorWO);
    resetarServidor();
  });

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

  // 🔄 NOVO: GERENCIAR SOLICITAÇÃO DE REVANCHE DIRECTA
  socket.on('solicitar_rematch', (apelido) => {
    // Evita adicionar o mesmo jogador duas vezes no array se ele clicar repetido
    if (!jogadoresQueremRematch.includes(apelido)) {
      jogadoresQueremRematch.push(apelido);
      io.emit('receber_reacao', { autor: 'SYS', mensagem: `🔄 ${apelido} quer revanche!` });
    }

    // Se os dois jogadores aceitaram o rematch
    if (jogadoresQueremRematch.length === 2) {
      // 1. Guardamos quem são os jogadores atuais antes de resetar a classe
      const jogadoresAtuais = jogo.obterJogadores();

      // 2. Criamos uma nova instância limpa do jogo
      jogo = new JogoDaMemoria(listaTecnologias);

      // 3. Inserimos os mesmos jogadores de volta na nova instância
      jogadoresAtuais.forEach(j => {
        jogo.adicionarJogador(j);
        jogo.definirPronto(j); // Já coloca os dois como Ready automaticamente
      });

      // 4. Forçamos o início do motor do jogo
      jogo.iniciar();

      // 5. Reiniciamos os cronômetros do servidor
      iniciarCronometro();

      // 6. Limpamos a lista de rematch para a próxima partida
      jogadoresQueremRematch = [];

      // 7. Disparamos o estado atualizado para o app.js fechar o modal e redesenhar o grid
      io.emit('estado_atualizado', sincronizarEstado());
    }
  });
});

function sincronizarEstado() {
  return {
    jogadores: jogo.obterJogadores(),
    status: jogo.obterStatus(),
    turnoAtual: jogo.obterTurnoAtual(),
    cartas: jogo.obterCartas(),
    vencedor: jogo.obterStatus() === 'FINALIZADO' ? jogo.obterVencedor() : null,
    // ✨ NOVIDADE: AGORA O SERVIDOR MANDA OS TEMPOS PARA O FRONTEND
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
  for (const prop in mapeamentoSockets) delete mapeamentoSockets[prop];
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor multiplayer online na porta http://localhost:${PORT}`);
});