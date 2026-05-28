# 🧠 TwinMatch: Dev Edition

> Desafie outros desenvolvedores em uma batalha de memória em tempo real! 

O **TwinMatch** é um jogo da memória multiplayer online focado no universo da programação. Os jogadores entram em um lobby, encontram um rival e disputam quem consegue achar mais pares de tecnologias em um tabuleiro interativo.

## 🚀 Como funciona o jogo

* **Matchmaking Simples:** Basta inserir seu apelido e clicar em "Ready". O servidor aguarda dois jogadores estarem prontos para iniciar a partida.
* **Sincronização em Tempo Real:** Se um jogador vira uma carta, o outro vê a animação instantaneamente. O turno é passado automaticamente caso o jogador erre o par.
* **Cronômetro e Placar:** O jogo conta o tempo de turno de cada jogador e acumula os pontos.
* **Interações e Revanche:** Os jogadores podem enviar reações no chat durante a partida e, ao final, solicitar um *Rematch* direto na sala, sem precisar recarregar a página.
* **Tratamento de W.O:** Se o seu rival desconectar ou abandonar a partida, você é declarado vencedor automaticamente.

---

## 🛠️ Arquitetura e Metodologia

Este projeto foi construído pensando em boas práticas de engenharia de software, separando claramente as responsabilidades entre o cliente (Frontend) e o servidor (Backend).

### Test-Driven Development (TDD)
Toda a lógica central do jogo (`JogoDaMemoria.js`) foi desenvolvida utilizando a metodologia **TDD**. Antes de construirmos a interface, criamos cenários de testes automatizados (`jogoDaMemoria.test.js`) para garantir que as regras de negócio — como virar cartas, validar pares, trocar turnos e calcular pontuações — funcionassem com 100% de precisão de forma isolada do servidor.

### Arquitetura Client-Server
* **Frontend (Client):** Um cliente leve em Vanilla JavaScript que cuida apenas da renderização do DOM (tabuleiro, painéis, modais) e de capturar os cliques do usuário para enviar ao servidor.
* **Backend (Server):** O "cérebro" do jogo. Um servidor Node.js atua como fonte da verdade (*Source of Truth*). Ele valida de quem é o turno, controla o cronômetro, processa os acertos e emite o novo estado da partida para todos os clientes conectados simultaneamente.

---

## 💻 Tecnologias e Ferramentas

| Categoria | Tecnologia | Função |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3 & JS Vanilla | Estrutura e interatividade da interface do usuário. |
| **Estilização** | Tailwind CSS | Classes utilitárias para um design responsivo e moderno. |
| **Backend** | Node.js & Express | Servidor web e roteamento de arquivos estáticos. |
| **Multiplayer** | Socket.io | Comunicação bidirecional via WebSockets (Tempo Real). |
| **Hospedagem** | Render | Deploy do servidor backend e entrega contínua. |
| **Versionamento**| Git & GitHub | Controle de versão do código. |

---

🎮 **[JOGUE AGORA ONLINE](https://twinmatch-devedition.onrender.com)** 🎮
