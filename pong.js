/* ============================================================
   FLYBRAIN PONG
   Opção A — Modelo neural funcional
   ============================================================ */

const Pong = {

    // =========================================================
    // CONFIGURAÇÕES
    // =========================================================

    canvas: null,
    ctx: null,

    width: 1000,
    height: 600,

    running: false,

    brainInterval: 50, // cérebro roda a cada 50 ms = 20 Hz
    lastBrainUpdate: 0,

    // =========================================================
    // BOLA
    // =========================================================

    ball: {
        x: 500,
        y: 300,

        radius: 9,

        vx: 6,
        vy: 3
    },

    // =========================================================
    // RAQUETE DO CÉREBRO
    // =========================================================

    brainPaddle: {
        x: 30,
        y: 250,

        width: 15,
        height: 100,

        velocity: 0,

        maxSpeed: 9
    },

    // =========================================================
    // RAQUETE OPONENTE
    // =========================================================

    enemyPaddle: {
        x: 955,
        y: 250,

        width: 15,
        height: 100,

        velocity: 0,

        maxSpeed: 7
    },

    // =========================================================
    // PONTUAÇÃO
    // =========================================================

    playerScore: 0,
    enemyScore: 0,

    // =========================================================
    // TELEMETRIA
    // =========================================================

    neural: {
        left: 0,
        right: 0,

        difference: 0,

        walk: 0,

        flight: 0,

        feed: 0,

        groom: 0,

        head: 0
    },

    // =========================================================
    // INICIALIZAÇÃO
    // =========================================================

    init() {

        this.canvas = document.createElement("canvas");

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.canvas.style.display = "block";
        this.canvas.style.margin = "20px auto";

        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext("2d");

        console.log("=================================");
        console.log("FLYBRAIN PONG");
        console.log("=================================");

        if (typeof BRAIN === "undefined") {

            console.error(
                "BRAIN não foi encontrado."
            );

            return;
        }

        console.log("BRAIN encontrado.");

        // Inicializa o cérebro se necessário
        if (typeof BRAIN.setup === "function") {

            BRAIN.setup();

        }

        this.resetBall();

        this.running = true;

        requestAnimationFrame(
            this.gameLoop.bind(this)
        );
    },

    // =========================================================
    // RESET DA BOLA
    // =========================================================

    resetBall() {

        this.ball.x = this.width / 2;

        this.ball.y = this.height / 2;

        const direction =
            Math.random() > 0.5 ? 1 : -1;

        this.ball.vx = 6 * direction;

        this.ball.vy =
            (Math.random() * 6) - 3;
    },

    // =========================================================
    // RETINA VIRTUAL
    // =========================================================

    getVisualStimulus() {

        const ball = this.ball;
        const paddle = this.brainPaddle;

        /*
         * A retina não recebe simplesmente:
         *
         * "bola está acima"
         *
         * Ela recebe uma representação espacial simplificada.
         *
         * Dividimos o campo visual em:
         *
         * UP
         * CENTER
         * DOWN
         *
         * e adicionamos movimento.
         */

        const relativeY =
            ball.y -
            (paddle.y + paddle.height / 2);

        const normalizedY =
            relativeY /
            (this.height / 2);

        const clampedY =
            Math.max(
                -1,
                Math.min(1, normalizedY)
            );

        const ballApproaching =
            ball.vx < 0;

        const ballLeaving =
            ball.vx > 0;

        const verticalSpeed =
            ball.vy;

        return {

            relativeY:
                clampedY,

            above:
                Math.max(0, -clampedY),

            center:
                1 - Math.abs(clampedY),

            below:
                Math.max(0, clampedY),

            movementUp:
                Math.max(
                    0,
                    -verticalSpeed / 8
                ),

            movementDown:
                Math.max(
                    0,
                    verticalSpeed / 8
                ),

            approaching:
                ballApproaching,

            leaving:
                ballLeaving
        };
    },

    // =========================================================
    // ESTIMULAÇÃO VISUAL
    // =========================================================

    stimulateVision() {

        const vision =
            this.getVisualStimulus();

        /*
         * IMPORTANTE:
         *
         * Não movemos a raquete aqui.
         *
         * Aqui somente alimentamos
         * o sistema neural.
         */

        if (!BRAIN.postSynaptic) {
            return;
        }

        // -----------------------------------------------------
        // VIS_R1R6
        //
        // Movimento visual
        // -----------------------------------------------------

        if (BRAIN.postSynaptic.VIS_R1R6) {

            const motion =
                vision.above +
                vision.below +
                vision.movementUp +
                vision.movementDown;

            BRAIN.postSynaptic.VIS_R1R6[
                BRAIN.thisState
            ] += motion * 5;
        }

        // -----------------------------------------------------
        // VIS_R7R8
        //
        // Presença visual / posição geral
        // -----------------------------------------------------

        if (BRAIN.postSynaptic.VIS_R7R8) {

            const visualPresence =
                vision.center +
                vision.above +
                vision.below;

            BRAIN.postSynaptic.VIS_R7R8[
                BRAIN.thisState
            ] += visualPresence * 4;
        }

        // -----------------------------------------------------
        // VIS_LPTC
        //
        // Fluxo óptico / movimento
        // -----------------------------------------------------

        if (BRAIN.postSynaptic.VIS_LPTC) {

            const opticFlow =
                Math.abs(
                    vision.movementUp
                ) +
                Math.abs(
                    vision.movementDown
                );

            BRAIN.postSynaptic.VIS_LPTC[
                BRAIN.thisState
            ] += opticFlow * 4;
        }

        // -----------------------------------------------------
        // MECH_CHORD
        //
        // Pequena representação da mudança
        // de posição do objeto.
        // -----------------------------------------------------

        if (BRAIN.postSynaptic.MECH_CHORD) {

            BRAIN.postSynaptic.MECH_CHORD[
                BRAIN.thisState
            ] +=
                Math.abs(
                    this.ball.vy
                ) * 0.5;
        }
    },

    // =========================================================
    // ATUALIZAÇÃO DO CÉREBRO
    // =========================================================

    updateBrain() {

        if (
            typeof BRAIN.update !== "function"
        ) {
            return;
        }

        /*
         * Alimenta o cérebro com visão.
         */

        this.stimulateVision();

        /*
         * Executa o modelo neural.
         */

        BRAIN.update();

        /*
         * Capturamos as saídas motoras.
         */

        this.readMotorOutput();
    },

    // =========================================================
    // LEITURA DO OUTPUT MOTOR
    // =========================================================

    readMotorOutput() {

        this.neural.left =
            Number(
                BRAIN.accumWalkLeft || 0
            );

        this.neural.right =
            Number(
                BRAIN.accumWalkRight || 0
            );

        this.neural.difference =
            this.neural.left -
            this.neural.right;

        this.neural.walk =
            this.neural.left +
            this.neural.right;

        this.neural.flight =
            Number(
                BRAIN.accumFlight || 0
            );

        this.neural.feed =
            Number(
                BRAIN.accumFeed || 0
            );

        this.neural.groom =
            Number(
                BRAIN.accumGroom || 0
            );

        this.neural.head =
            Number(
                BRAIN.accumHead || 0
            );
    },

    // =========================================================
    // CONTROLE DA RAQUETE
    // =========================================================

    updateBrainPaddle() {

        /*
         * ESTE É O PONTO MAIS IMPORTANTE.
         *
         * Não usamos:
         *
         * ball.y > paddle.y
         *
         * nem:
         *
         * paddle.y = ball.y
         *
         * A decisão vem do output neural.
         */

        let signal =
            this.neural.difference;

        /*
         * Normalização.
         *
         * O modelo pode produzir valores relativamente
         * grandes, portanto limitamos a resposta.
         */

        signal =
            Math.max(
                -20,
                Math.min(20, signal)
            );

        /*
         * Converte o output motor em velocidade.
         */

        const neuralVelocity =
            signal * 0.45;

        this.brainPaddle.velocity =
            Math.max(
                -this.brainPaddle.maxSpeed,
                Math.min(
                    this.brainPaddle.maxSpeed,
                    neuralVelocity
                )
            );

        this.brainPaddle.y +=
            this.brainPaddle.velocity;

        // Limites da tela

        if (
            this.brainPaddle.y < 0
        ) {

            this.brainPaddle.y = 0;

        }

        if (
            this.brainPaddle.y +
            this.brainPaddle.height >
            this.height
        ) {

            this.brainPaddle.y =
                this.height -
                this.brainPaddle.height;

        }
    },

    // =========================================================
    // FÍSICA DA BOLA
    // =========================================================

    updateBall() {

        const ball = this.ball;

        ball.x += ball.vx;

        ball.y += ball.vy;

        // Parede superior

        if (
            ball.y - ball.radius <= 0
        ) {

            ball.y =
                ball.radius;

            ball.vy *= -1;
        }

        // Parede inferior

        if (
            ball.y + ball.radius >=
            this.height
        ) {

            ball.y =
                this.height -
                ball.radius;

            ball.vy *= -1;
        }

        // -----------------------------------------------------
        // RAQUETE DO CÉREBRO
        // -----------------------------------------------------

        if (
            ball.vx < 0 &&
            this.collision(
                ball,
                this.brainPaddle
            )
        ) {

            ball.x =
                this.brainPaddle.x +
                this.brainPaddle.width +
                ball.radius;

            this.bounce(
                ball,
                this.brainPaddle
            );
        }

        // -----------------------------------------------------
        // OPONENTE
        // -----------------------------------------------------

        if (
            ball.vx > 0 &&
            this.collision(
                ball,
                this.enemyPaddle
            )
        ) {

            ball.x =
                this.enemyPaddle.x -
                ball.radius;

            this.bounce(
                ball,
                this.enemyPaddle
            );
        }

        // -----------------------------------------------------
        // GOL DO CÉREBRO
        // -----------------------------------------------------

        if (
            ball.x < -20
        ) {

            this.enemyScore++;

            this.resetBall();

            console.log(
                "Ponto do oponente:",
                this.enemyScore
            );
        }

        // -----------------------------------------------------
        // GOL DO OPONENTE
        // -----------------------------------------------------

        if (
            ball.x >
            this.width + 20
        ) {

            this.playerScore++;

            this.resetBall();

            console.log(
                "Ponto do cérebro:",
                this.playerScore
            );
        }
    },

    // =========================================================
    // COLISÃO
    // =========================================================

    collision(ball, paddle) {

        return (

            ball.x - ball.radius <
            paddle.x +
            paddle.width &&

            ball.x + ball.radius >
            paddle.x &&

            ball.y - ball.radius <
            paddle.y +
            paddle.height &&

            ball.y + ball.radius >
            paddle.y
        );
    },

    // =========================================================
    // REBATE
    // =========================================================

    bounce(ball, paddle) {

        ball.vx *= -1.05;

        /*
         * O ponto da colisão influencia
         * o ângulo da bola.
         */

        const paddleCenter =
            paddle.y +
            paddle.height / 2;

        const difference =
            ball.y -
            paddleCenter;

        const normalized =
            difference /
            (paddle.height / 2);

        ball.vy =
            normalized * 7;

        // Limite de velocidade

        const maxSpeed = 14;

        ball.vx =
            Math.max(
                -maxSpeed,
                Math.min(
                    maxSpeed,
                    ball.vx
                )
            );
    },

    // =========================================================
    // IA DO OPONENTE
    // =========================================================

    updateEnemy() {

        const paddle =
            this.enemyPaddle;

        const target =
            this.ball.y -
            paddle.height / 2;

        const difference =
            target -
            paddle.y;

        paddle.velocity =
            Math.max(
                -paddle.maxSpeed,
                Math.min(
                    paddle.maxSpeed,
                    difference * 0.08
                )
            );

        paddle.y +=
            paddle.velocity;

        if (paddle.y < 0) {
            paddle.y = 0;
        }

        if (
            paddle.y +
            paddle.height >
            this.height
        ) {

            paddle.y =
                this.height -
                paddle.height;
        }
    },

    // =========================================================
    // DESENHO
    // =========================================================

    draw() {

        const ctx = this.ctx;

        // Fundo

        ctx.fillStyle = "#050505";

        ctx.fillRect(
            0,
            0,
            this.width,
            this.height
        );

        // Linha central

        ctx.strokeStyle =
            "#333";

        ctx.setLineDash([
            10,
            10
        ]);

        ctx.beginPath();

        ctx.moveTo(
            this.width / 2,
            0
        );

        ctx.lineTo(
            this.width / 2,
            this.height
        );

        ctx.stroke();

        ctx.setLineDash([]);

        // -----------------------------------------------------
        // RAQUETE DO CÉREBRO
        // -----------------------------------------------------

        ctx.fillStyle =
            "#00ff88";

        ctx.fillRect(
            this.brainPaddle.x,
            this.brainPaddle.y,
            this.brainPaddle.width,
            this.brainPaddle.height
        );

        // -----------------------------------------------------
        // OPONENTE
        // -----------------------------------------------------

        ctx.fillStyle =
            "#ff4444";

        ctx.fillRect(
            this.enemyPaddle.x,
            this.enemyPaddle.y,
            this.enemyPaddle.width,
            this.enemyPaddle.height
        );

        // -----------------------------------------------------
        // BOLA
        // -----------------------------------------------------

        ctx.fillStyle =
            "#ffffff";

        ctx.beginPath();

        ctx.arc(
            this.ball.x,
            this.ball.y,
            this.ball.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();

        // -----------------------------------------------------
        // PLACAR
        // -----------------------------------------------------

        ctx.font =
            "bold 40px Arial";

        ctx.textAlign =
            "center";

        ctx.fillText(
            this.playerScore,
            this.width / 2 - 80,
            50
        );

        ctx.fillText(
            this.enemyScore,
            this.width / 2 + 80,
            50
        );

        // -----------------------------------------------------
        // INFORMAÇÕES NEURAIS
        // -----------------------------------------------------

        ctx.textAlign =
            "left";

        ctx.font =
            "14px monospace";

        ctx.fillStyle =
            "#00ff88";

        ctx.fillText(
            "FLYBRAIN",
            20,
            25
        );

        ctx.fillText(
            "LEFT  : " +
            this.neural.left.toFixed(2),
            20,
            50
        );

        ctx.fillText(
            "RIGHT : " +
            this.neural.right.toFixed(2),
            20,
            70
        );

        ctx.fillText(
            "DIFF  : " +
            this.neural.difference.toFixed(2),
            20,
            90
        );

        ctx.fillText(
            "WALK  : " +
            this.neural.walk.toFixed(2),
            20,
            110
        );

        ctx.fillStyle =
            "#ffffff";

        ctx.fillText(
            "Neural update: 20 Hz",
            20,
            140
        );
    },

    // =========================================================
    // LOOP PRINCIPAL
    // =========================================================

    gameLoop(timestamp) {

        if (!this.running) {
            return;
        }

        // Física do Pong

        this.updateBall();

        // Oponente

        this.updateEnemy();

        // -----------------------------------------------------
        // CÉREBRO
        // -----------------------------------------------------

        if (
            timestamp -
            this.lastBrainUpdate >=
            this.brainInterval
        ) {

            this.lastBrainUpdate =
                timestamp;

            this.updateBrain();

            this.updateBrainPaddle();
        }

        // Renderização

        this.draw();

        requestAnimationFrame(
            this.gameLoop.bind(this)
        );
    }
};


// ============================================================
// INICIAR
// ============================================================

window.addEventListener(
    "load",
    () => {

        Pong.init();

    }
);