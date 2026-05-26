// Objeto congelado para garantir que os status não sejam alterados de fora
export const StatusJogo = Object.freeze({
  ESPERANDO_JOGADORES: 'ESPERANDO_JOGADORES',
  EM_ANDAMENTO: 'EM_ANDAMENTO',
  FINALIZADO: 'FINALIZADO'
});

export class JogoDaMemoria {
  // Campos privados (#) que guardam o estado interno do jogo de forma segura
  #listaTecnologias;
  #status;
  #jogadores;
  #cartas;
  #turnoAtual;
  #pontuacoes;
  #cartasViradasNoTurno;
  #jogadoresProntos;  // RF01: Controla quem deu "Start"
  #temposAcumulados;  // RF14: Acumula o tempo gasto por jogador

  constructor(listaTecnologias) {
    this.#listaTecnologias = listaTecnologias;
    this.#status = StatusJogo.ESPERANDO_JOGADORES;
    this.#jogadores = [];
    this.#cartas = [];
    this.#turnoAtual = null;
    this.#pontuacoes = {};
    this.#cartasViradasNoTurno = [];
    this.#jogadoresProntos = {};
    this.#temposAcumulados = {};
  }

  // Métodos Públicos de Consulta (Getters)
  obterStatus() {
    return this.#status;
  }

  obterCartas() {
    return this.#cartas;
  }

  obterJogadores() {
    return this.#jogadores;
  }

  obterTurnoAtual() {
    return this.#turnoAtual;
  }

  obterPontuacao(apelido) {
    return this.#pontuacoes[apelido] || 0;
  }
  obterTempos() {
    return this.#temposAcumulados;
  }
  // RF01: Define que um jogador clicou em "Start"
  definirPronto(apelido) {
    if (this.#jogadores.includes(apelido)) {
      this.#jogadoresProntos[apelido] = true;
    }
  }

  // RF14: Registra o tempo que o jogador levou no turno
  registrarTempoTurno(apelido, segundos) {
    if (this.#jogadores.includes(apelido)) {
      this.#temposAcumulados[apelido] = (this.#temposAcumulados[apelido] || 0) + segundos;
    }
  }

  adicionarJogador(apelido) {
    if (this.#jogadores.length >= 2) {
      throw new Error('Sala cheia');
    }

    this.#jogadores.push(apelido);
    this.#pontuacoes[apelido] = 0;
    this.#jogadoresProntos[apelido] = false;
    this.#temposAcumulados[apelido] = 0;

    if (this.#jogadores.length === 1) {
      this.#turnoAtual = apelido;
    }
  }

  // Permite desativar o embaralhamento durante os testes para evitar comportamento aleatório
  iniciar(embaralhar = true) {
    const todosProntos = this.#jogadores.length === 2 && this.#jogadores.every(j => this.#jogadoresProntos[j]);

    if (!todosProntos) {
      return;
    }

    const cartasDuplicadas = [...this.#listaTecnologias, ...this.#listaTecnologias];

    this.#cartas = cartasDuplicadas.map((conteudo, id) => ({
      id,
      conteudo,
      virada: false,
      encontrada: false
    }));

    if (embaralhar) {
      this.#cartas.sort(() => Math.random() - 0.5);
      // Reatribui os IDs baseados na nova ordem embaralhada
      this.#cartas.forEach((carta, index) => {
        carta.id = index;
      });
    }

    this.#status = StatusJogo.EM_ANDAMENTO;
  }

  obterVencedor() {
    if (this.#status !== StatusJogo.FINALIZADO) return null;

    const [p1, p2] = this.#jogadores;
    const pontosP1 = this.obterPontuacao(p1);
    const pontosP2 = this.obterPontuacao(p2);

    // RF14: Critério de Desempate por Tempo Acumulado
    if (pontosP1 === pontosP2) {
      const tempoP1 = this.#temposAcumulados[p1] || 0;
      const tempoP2 = this.#temposAcumulados[p2] || 0;

      if (tempoP1 === tempoP2) return 'Empate';
      return tempoP1 < tempoP2 ? p1 : p2;
    }

    return pontosP1 > pontosP2 ? p1 : p2;
  }

  virarCarta(apelido, indiceCarta) {
    if (this.#status !== StatusJogo.EM_ANDAMENTO) return false;
    if (this.#turnoAtual !== apelido) return false;
    if (this.#cartasViradasNoTurno.length >= 2) return false;

    const carta = this.#cartas[indiceCarta];
    if (!carta || carta.virada || carta.encontrada) return false;

    carta.virada = true;
    this.#cartasViradasNoTurno.push({ indice: indiceCarta, carta });

    if (this.#cartasViradasNoTurno.length < 2) {
      return false;
    }

    const [primeira, segunda] = this.#cartasViradasNoTurno;

    if (primeira.carta.conteudo === segunda.carta.conteudo) {
      primeira.carta.encontrada = true;
      segunda.carta.encontrada = true;
      this.#pontuacoes[apelido] += 1;
      this.#cartasViradasNoTurno = [];

      const todasEncontradas = this.#cartas.every(c => c.encontrada);
      if (todasEncontradas) {
        this.#status = StatusJogo.FINALIZADO;
      }

      return true;
    }

    return false;
  }

  finalizarTurnoSeIncorreto() {
    if (this.#cartasViradasNoTurno.length !== 2) return;

    const [primeira, segunda] = this.#cartasViradasNoTurno;

    this.#cartas[primeira.indice].virada = false;
    this.#cartas[segunda.indice].virada = false;

    this.#cartasViradasNoTurno = [];

    const proximoJogador = this.#jogadores.find(j => j !== this.#turnoAtual);
    this.#turnoAtual = proximoJogador;
  }
}