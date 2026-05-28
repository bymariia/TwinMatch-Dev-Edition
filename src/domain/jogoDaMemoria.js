export const StatusJogo = Object.freeze({
  ESPERANDO_JOGADORES: 'ESPERANDO_JOGADORES',
  EM_ANDAMENTO: 'EM_ANDAMENTO',
  FINALIZADO: 'FINALIZADO'
});

export class JogoDaMemoria {
  // Estado interno protegido
  #listaTecnologias;
  #status;
  #jogadores;
  #cartas;
  #turnoAtual;
  #pontuacoes;
  #cartasViradasNoTurno;
  #jogadoresProntos;  // Controle de sincronização de prontidão
  #temposAcumulados;  // Métricas de tempo acumulado para desempate

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

  // --- Getters & Queries ---

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

  // --- Regras de Negócio e Transições de Estado ---

  // Registra confirmação de prontidão de um jogador
  definirPronto(apelido) {
    if (this.#jogadores.includes(apelido)) {
      this.#jogadoresProntos[apelido] = true;
    }
  }

  // Agrega o tempo de resposta do turno ao histórico do jogador
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

  // Inicializa o deck de cartas (permite burlar o shuffle para rodar testes controlados)
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
      this.#cartas.forEach((carta, index) => {
        carta.id = index;
      });
    }

    this.#status = StatusJogo.EM_ANDAMENTO;
  }

  // RF14: Avaliação de vitória com desempate matemático por tempo de processamento cognitivo
  obterVencedor() {
    if (this.#status !== StatusJogo.FINALIZADO) return null;

    const [p1, p2] = this.#jogadores;
    const pontosP1 = this.obterPontuacao(p1);
    const pontosP2 = this.obterPontuacao(p2);

    if (pontosP1 === pontosP2) {
      const tempoP1 = this.#temposAcumulados[p1] || 0;
      const tempoP2 = this.#temposAcumulados[p2] || 0;

      if (tempoP1 === tempoP2) return 'Empate';
      return tempoP1 < tempoP2 ? p1 : p2;
    }

    return pontosP1 > pontosP2 ? p1 : p2;
  }

  // Processa a revelação de cartas individuais e computação de pontuação de par correspondente
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

  // Executa o roll-back visual das cartas incompatíveis e transfere a propriedade do turno
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