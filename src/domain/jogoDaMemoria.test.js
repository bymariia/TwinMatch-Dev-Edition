import { JogoDaMemoria, StatusJogo } from './jogoDaMemoria.js';

describe('Jogo da Memória Dev (Lógica Real-Time)', () => {
  let linguagensExemplo;

  beforeEach(() => {
    // Mock inicializado com 12 pares (24 cartas)
    linguagensExemplo = [
      'JavaScript', 'Python', 'Java', 'C#', 
      'HTML5', 'CSS3', 'React', 'Node.js', 
      'GitHub', 'SQL', 'Docker', 'Linux'
    ];
  });

  test('TDD - Estado Inicial: jogo recém-instanciado deve começar esperando jogadores e sem cartas geradas', () => {
    const jogo = new JogoDaMemoria(linguagensExemplo);
    const statusAtual = jogo.obterStatus();
    const cartas = jogo.obterCartas();
    const jogadores = jogo.obterJogadores();

    expect(statusAtual).toBe(StatusJogo.ESPERANDO_JOGADORES);
    expect(cartas.length).toBe(0);
    expect(jogadores.length).toBe(0);
  });

  test('TDD - Jogadores: deve permitir adicionar até 2 jogadores e definir os turnos corretamente', () => {
    const jogo = new JogoDaMemoria(linguagensExemplo);

    jogo.adicionarJogador('Player1');
    expect(jogo.obterJogadores()).toEqual(['Player1']);
    expect(jogo.obterTurnoAtual()).toBe('Player1');

    jogo.adicionarJogador('Player2');
    expect(jogo.obterJogadores()).toEqual(['Player1', 'Player2']);
    
    expect(() => jogo.adicionarJogador('Player3')).toThrow('Sala cheia');
  });

  test('TDD - Inicialização do Tabuleiro: ao iniciar o jogo, deve duplicar as cartas, embaralhar e mudar o status', () => {
    const jogo = new JogoDaMemoria(linguagensExemplo);
    jogo.adicionarJogador('Player1');
    jogo.adicionarJogador('Player2');

    jogo.definirPronto('Player1');
    jogo.definirPronto('Player2');
    jogo.iniciar(false); 

    const cartas = jogo.obterCartas();
    
    expect(cartas.length).toBe(24); 
    expect(jogo.obterStatus()).toBe(StatusJogo.EM_ANDAMENTO);

    const contagem = {};
    cartas.forEach(carta => {
      contagem[carta.conteudo] = (contagem[carta.conteudo] || 0) + 1;
    });
    
    expect(contagem['JavaScript']).toBe(2);
    expect(contagem['Python']).toBe(2);
    expect(contagem['Linux']).toBe(2);
  });

  test('TDD - Virada de Cartas (Erro): se as duas cartas viradas forem diferentes, deve desvirá-las e passar o turno', () => {
    const jogo = new JogoDaMemoria(linguagensExemplo);
    jogo.adicionarJogador('Player1');
    jogo.adicionarJogador('Player2');
    jogo.definirPronto('Player1');
    jogo.definirPronto('Player2');
    jogo.iniciar(false);

    const cartas = jogo.obterCartas();
    
    // Simulação de erro com cartas diferentes (Índices não embaralhados)
    const indiceCard1 = 0;
    const indiceCard2 = 1;

    jogo.virarCarta('Player1', indiceCard1);
    expect(cartas[indiceCard1].virada).toBe(true);

    const completouPar = jogo.virarCarta('Player1', indiceCard2);
    expect(completouPar).toBe(false);

    jogo.finalizarTurnoSeIncorreto();
    expect(cartas[indiceCard1].virada).toBe(false);
    expect(cartas[indiceCard2].virada).toBe(false);
    expect(jogo.obterTurnoAtual()).toBe('Player2');
  });

  test('TDD - Virada de Cartas (Acerto): se as duas cartas forem iguais, devem ficar viradas, pontuar e manter o turno', () => {
    const jogo = new JogoDaMemoria(linguagensExemplo);
    jogo.adicionarJogador('Player1');
    jogo.adicionarJogador('Player2');
    jogo.definirPronto('Player1');
    jogo.definirPronto('Player2');
    jogo.iniciar(false);

    const cartas = jogo.obterCartas();
    
    // Simulação de acerto de par exato
    const indiceCard1 = 0;
    const indiceCard2 = 12;

    jogo.virarCarta('Player1', indiceCard1);
    const completouPar = jogo.virarCarta('Player1', indiceCard2);

    expect(completouPar).toBe(true);
    
    expect(cartas[indiceCard1].virada).toBe(true);
    expect(cartas[indiceCard2].virada).toBe(true);

    expect(jogo.obterPontuacao('Player1')).toBe(1);
    expect(jogo.obterTurnoAtual()).toBe('Player1');
  });

  test('TDD - Condição de Vitória: quando todos os pares forem encontrados, o jogo deve finalizar e declarar o vencedor', () => {
    const jogo = new JogoDaMemoria(['JavaScript']);
    jogo.adicionarJogador('Player1');
    jogo.adicionarJogador('Player2');
    jogo.definirPronto('Player1');
    jogo.definirPronto('Player2');
    jogo.iniciar(false);

    jogo.virarCarta('Player1', 0);
    jogo.virarCarta('Player1', 1);

    expect(jogo.obterStatus()).toBe(StatusJogo.FINALIZADO);
    expect(jogo.obterVencedor()).toBe('Player1');
  });

  // ================= TESTES DE REGRAS DE NEGÓCIO ================= //

  test('TDD - RF01: não deve iniciar o jogo até que ambos os jogadores deem Start (fiquem prontos)', () => {
    const jogo = new JogoDaMemoria(linguagensExemplo);
    jogo.adicionarJogador('Player1');
    jogo.adicionarJogador('Player2');

    jogo.definirPronto('Player1');
    jogo.iniciar(false);
    expect(jogo.obterStatus()).toBe(StatusJogo.ESPERANDO_JOGADORES);

    jogo.definirPronto('Player2');
    jogo.iniciar(false);
    expect(jogo.obterStatus()).toBe(StatusJogo.EM_ANDAMENTO);
  });

  test('TDD - RF14: em caso de empate de pontos, deve vencer o jogador com menor tempo acumulado', () => {
    // Mapeamento de pares: JS(0,4), Python(1,5), Java(2,6), C#(3,7)
    const jogo = new JogoDaMemoria(['JavaScript', 'Python', 'Java', 'C#']);
    jogo.adicionarJogador('Player1');
    jogo.adicionarJogador('Player2');
    jogo.definirPronto('Player1');
    jogo.definirPronto('Player2');
    jogo.iniciar(false);

    // Registro simulado de métricas de tempo
    jogo.registrarTempoTurno('Player1', 20);
    jogo.registrarTempoTurno('Player2', 10);

    // Player 1 acerta dois pares
    jogo.virarCarta('Player1', 0);
    jogo.virarCarta('Player1', 4);
    jogo.virarCarta('Player1', 1);
    jogo.virarCarta('Player1', 5);

    // Player 1 executa erro intencional para alternância de turno
    jogo.virarCarta('Player1', 2);
    jogo.virarCarta('Player1', 3);
    jogo.finalizarTurnoSeIncorreto(); 

    // Player 2 acerta dois pares finais
    jogo.virarCarta('Player2', 2);
    jogo.virarCarta('Player2', 6);
    jogo.virarCarta('Player2', 3);
    jogo.virarCarta('Player2', 7);

    expect(jogo.obterStatus()).toBe(StatusJogo.FINALIZADO);
    expect(jogo.obterPontuacao('Player1')).toBe(2);
    expect(jogo.obterPontuacao('Player2')).toBe(2);
    
    // Valida desempate com base no menor tempo acumulado
    expect(jogo.obterVencedor()).toBe('Player2');
  });

});