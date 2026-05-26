import { JogoDaMemoria, StatusJogo } from './jogoDaMemoria.js';

describe('Jogo da Memória Dev (Lógica Real-Time)', () => {
  let linguagensExemplo;

  beforeEach(() => {
    // Lista Oficial do seu BRD: 12 Pares (24 Cartas no total)
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
    
    // Na lista não embaralhada de 12 itens duplicados:
    // Índice 0 é 'JavaScript' e Índice 1 é 'Python'. São diferentes!
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
    
    // Índice 0 é 'JavaScript' e Índice 12 é 'JavaScript' (o par duplicado)
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

  // ================= TESTES DE REGRAS DE NEGÓCIO (BRD) ================= //

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
    // 4 linguagens geram 8 cartas: ['JS', 'Python', 'Java', 'C#', 'JS', 'Python', 'Java', 'C#']
    // Índices dos pares: JS(0,4), Python(1,5), Java(2,6), C#(3,7)
    const jogo = new JogoDaMemoria(['JavaScript', 'Python', 'Java', 'C#']);
    jogo.adicionarJogador('Player1');
    jogo.adicionarJogador('Player2');
    jogo.definirPronto('Player1');
    jogo.definirPronto('Player2');
    jogo.iniciar(false);

    jogo.registrarTempoTurno('Player1', 20); // Mais lento
    jogo.registrarTempoTurno('Player2', 10); // Mais rápido

    // Player 1 faz 2 pares: JavaScript(0,4) e Python(1,5) -> Placar P1 = 2
    jogo.virarCarta('Player1', 0);
    jogo.virarCarta('Player1', 4);
    jogo.virarCarta('Player1', 1);
    jogo.virarCarta('Player1', 5);

    // Player 1 erra de propósito com Java(2) e C#(3) para passar o turno!
    jogo.virarCarta('Player1', 2);
    jogo.virarCarta('Player1', 3);
    jogo.finalizarTurnoSeIncorreto(); // Vez do Player 2!

    // Player 2 faz os 2 pares restantes: Java(2,6) e C#(3,7) -> Placar P2 = 2
    jogo.virarCarta('Player2', 2);
    jogo.virarCarta('Player2', 6);
    jogo.virarCarta('Player2', 3);
    jogo.virarCarta('Player2', 7);

    // Validações
    expect(jogo.obterStatus()).toBe(StatusJogo.FINALIZADO);
    expect(jogo.obterPontuacao('Player1')).toBe(2);
    expect(jogo.obterPontuacao('Player2')).toBe(2);
    
    // O desempate deve coroar o Player 2 por ser mais rápido
    expect(jogo.obterVencedor()).toBe('Player2');
  });

});