const TEST_MODE = true;
const PLAYER_ROLE = "h";
const MY_CHICKEN_ID = 1;
const TOTAL_LIVES = 5;
const MAX_BULLETS = 10;
const GAME_TIME = 30;
const CROSSHAIRFADE_X_TEST = 80;
const CROSSHAIRFADE_Y_TEST = 150;
const END_SCREEN_MESSAGE = "GAME OVER";

const HEART_SYMBOL = "♥";
const COUNTDOWN_TIME = 5;
const REFRESH_RATE = 30;
const xSpeed = 200;
const ySpeed = 200;

const VIRTUAL_WIDTH  = 15000;
const VIRTUAL_HEIGHT = 10000;
const VIRTUAL_FONT_SIZE = 0.043;
const VIRTUAL_CHICKEN_WIDTH = 0.072;
const VIRTUAL_CHICKEN_HEIGHT = 0.14;
const VIRTUAL_BULLET_WIDTH = 0.02;
const VIRTUAL_BULLET_HEIGHT = 0.071;


const chickenRelativWidth = 0.072;
const chickenRelativHeight = 0.066;

const MY_ROOM = 1;

const picLeft = new Image();
const picLeftMe = new Image();
const picUp = new Image();
const picUpMe = new Image();
const picDown = new Image();
const picDownMe = new Image();
const picRight = new Image();
const picRightMe = new Image();
const bullet = new Image();
const crosshair = new Image();

picLeft.src = "img/copyrightChick.png";
picLeftMe.src = "img/copyrightChickGreen.png";
picUp.src = "img/copyrightChickUp.png";
picUpMe.src = "img/copyrightChickUpMe.png";
picDown.src = "img/copyrightChickDown.png";
picDownMe.src = "img/copyrightChickDownMe.png";
picRight.src = "img/copyrightChickReverse.png";
picRightMe.src = "img/copyrightChickReverseGreen.png";
bullet.src = "img/bullet.png";
crosshair.src = "img/crosshair.png";

class Gameboard {
    constructor(/*lobbyId*/) {
        const thisSave = this;
        //this.lobbyId = lobbyId;

        this.canvas = document.getElementById("game");
        this.ctx = this.canvas.getContext("2d");

        window.onresize = function() {
            thisSave.resized();
        };
        this.resized();

        this.chicks = [];
        this.animatedShot = {
            progress: 0,
            x: 0,
            y: 0
        }

        // register mouse click
        document.getElementById("game").onclick = function(e) {
            thisSave.sendHunterShot(e, thisSave);
        };

        // register keypresses
        document.onkeydown = function(e){
            thisSave.sendChickControl(e);
        };

        document.oncontextmenu = function(e) {
            thisSave.reload(thisSave);
        }


        // create socket connection and event actions
        this.socket = io.connect('https://chlorhuhn.rocks', {secure:true});

        this.socket.on('connect', function() {
            console.log("socket connection established");
        });

        this.socket.on('connect_error', function(message) {
            console.log("error @ establishing socket connection: " + message);
        });

        this.socket.on('lobbyStatus', function(message) {
            console.log("socket.io: sent lobbyStatus; " + message);
            thisSave.clearCanvas(); 
            thisSave.drawText(message);
        });

        this.socket.on('startingSoon', function(countDownTime) {
            console.log("socket.io: sent starting soon");
            thisSave.startCountdown(countDownTime);
        });

        this.socket.on('assignRole', function(data) {
            console.log("socket.io: sent assignRole");
            thisSave.assignRole(data);
        });

        this.socket.on('startingNow', function(data) {
            console.log("socket.io: sent startingNow");
            thisSave.startGame(data);
        });

        this.socket.on('syncChicks', function(syncedChicks) {
            console.log("socket.io: sent syncChicks");
            thisSave.syncChicks(syncedChicks);
        });

        this.socket.on('updateChick', function(chick) {
            console.log("socket.io: sent updateChick");
            thisSave.updateChick(chick);
        });

        this.socket.on('killChick', function(id) {
            console.log("socket.io: sent killChick");
            thisSave.killChick(id);
        });

        this.socket.on('crosshairPosition', function(data) {
            console.log("socket.io: sent crosshairPosition");
            thisSave.animatedShot.progress = REFRESH_RATE;
            thisSave.animatedShot.x = data.x;
            thisSave.animatedShot.y = data.y;
        });


        this.socket.on('endOfGame', function(data) {
            console.log("socket.io: sent endOfGame");
            console.log(data);
            clearInterval(thisSave.gameInterval);
            clearInterval(thisSave.timeLeftInterval);
            if(thisSave.myRole === 'h') {
                $(thisSave.canvas).css("cursor", "default");
            }

            const statHtml = thisSave.createStatisticsText(data);
        });

        this.socket.on('disconnect', function() {
            console.log("socket connection was closed");
        });


    }

    resized() {
        this.width  = this.canvas.scrollWidth;
        this.height = this.canvas.scrollHeight;
        this.canvas.width  = this.canvas.scrollWidth;
        this.canvas.height = this.canvas.scrollHeight;
    }

    startCountdown(i) {
        const thisSave = this;
        this.countdownValue = i;
        while(i >= 0) {
            setTimeout(function() {
                thisSave.clearCanvas();
                thisSave.drawCountdown(thisSave);
                --thisSave.countdownValue
            }, i * 1000);
            --i;
        }
    }

    drawCountdown(thisSave) {
        if(thisSave.countdownValue >= 0) {
            thisSave.drawText(thisSave.countdownValue);
        }
    }

    drawText(text) {
        this.ctx.font = Math.round(VIRTUAL_FONT_SIZE * this.canvas.height) + "px Arial";
        this.ctx.fillStyle = "black";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(text, this.canvas.width / 2 ,this.canvas.height / 2);
    }

    assignRole(roleData) {
        this.myRole = roleData.role;
        if(this.myRole === 'c') {
            this.myChickenId = roleData.chickenId;
        } else {
            this.bulletsLeft = roleData.bulletsLeft;
        }
    }

    startGame(game) {
        const thisSave = this;
        this.chicks = game.chicks;
        this.timeLeft = game.timeLeft;

        if(this.myRole === 'h') {
            $(this.canvas).css("cursor", "url('img/crosshair.png') 25 25 , auto");
        } 

        this.gameInterval = setInterval(function(){
            thisSave.gameLoop();
        }, REFRESH_RATE);
        this.timeLeftInterval = setInterval(function(){
            --thisSave.timeLeft;
        }, 1000);
    }

    gameLoop() {
        this.clearCanvas();
        if(this.timeLeft < 0) {
            this.drawText(END_SCREEN_MESSAGE);
            this.drawTimeLeft();
            clearInterval(this.gameInterval);
            clearInterval(this.timeLeftInterval);
            return;
        };

        if(TEST_MODE) {
            this.updateDirections(); // uncomment when server is working
        }
        this.updateChicks();
        this.drawChicks();
        this.drawAnimatedShot();
        this.drawTimeLeft();

        if(this.myRole == "h") {
            this.drawBulletsLeft();
        } else {
            this.drawLives();
        }
//        this.drawLives();
    }

    sendChickControl(e) {
        if(this.myRole === 'h'){
            return;
        }
        e.preventDefault();
        let direction;
        e = e || window.event;
        if (e.keyCode == '38') { // up key
            direction = 'n';
        }
        else if (e.keyCode == '40') { // down key
            direction = 's';
        }
        else if (e.keyCode == '37') { // left key
            direction = 'w';
        }
        else if (e.keyCode == '39') { // right key
            direction = 'e';
        }else {
            return; //other keys ignored
        }

        // only emit to server if direction changed // change how to find mychicken!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        let myChickIndex;
        for(let i = 0; i< this.chicks.length; i++) {
            if(this.chicks[i].id === this.myChickenId) {
                myChickIndex = i;
            }
        }
        if(this.chicks[myChickIndex].direction != direction) {
            this.socket.emit('chickInput', direction);
        }

        if(TEST_MODE) {
            chicks[myChickIndex].direction = direction;
        }
    }

    sendHunterShot(e, thisSave) {
        if(this.myRole === 'c'){
            return;
        }
        e = e || window.event;

        const rect = thisSave.canvas.getBoundingClientRect();
        const canvasPosX = event.clientX - rect.left;
        const canvasPosY = event.clientY - rect.top;
        const virtualX = canvasPosX * (VIRTUAL_WIDTH/thisSave.canvas.width);
        const virtualY = canvasPosY * (VIRTUAL_HEIGHT/thisSave.canvas.height);


        console.log("canvasX: %s;canvasY:%s", canvasPosX, canvasPosY);
        console.log("actual game: x-" + virtualX + ";y-" + virtualY);

        --thisSave.bulletsLeft;

        thisSave.socket.emit('hunterShot', {
            x: virtualX,
            y: virtualY
        });
    }

    reload(thisSave) {
        if(thisSave.myRole === 'h') {
            thisSave.socket.emit('hunterReload');
            setTimeout(function() {
                thisSave.bulletsLeft = MAX_BULLETS;
            },300);
        }
    }

    updateDirections() {
        for(let i = 0; i < this.chicks.length; i++) {
            if(i === this.myChickenId) {
                continue;
            }

            const random = Math.random();
            if(Math.round(random * 100) % 15 == 1) {
                switch (true) {
                    case (random < 0.25):
                        this.chicks[i].direction = 'n';
                        break;
                    case (random < 0.5):
                        this.chicks[i].direction = 'e';
                        break;
                    case (random < 0.75):
                        this.chicks[i].direction = 's';
                        break;
                    default:
                        this.chicks[i].direction = 'w';
                }
            }
        }
    }

    updateChicks() {
        for(let i = 0; i < this.chicks.length; i++) {
            switch(this.chicks[i].direction) {
                case 'n':
                    this.chicks[i].y -= ySpeed;
                    this.chicks[i].y  = (this.chicks[i].y  < 0) ? 0: this.chicks[i].y;
                    break;
                case 'e':
                    this.chicks[i].x += xSpeed;
                    this.chicks[i].x = (this.chicks[i].x >= VIRTUAL_WIDTH * (1-VIRTUAL_CHICKEN_WIDTH)) ?VIRTUAL_WIDTH * (1-VIRTUAL_CHICKEN_WIDTH): this.chicks[i].x;
                  break;
                case 's':
                    this.chicks[i].y += ySpeed;
                    this.chicks[i].y = (this.chicks[i].y >= VIRTUAL_HEIGHT * (1-VIRTUAL_CHICKEN_HEIGHT)) ? VIRTUAL_HEIGHT * (1-VIRTUAL_CHICKEN_HEIGHT): this.chicks[i].y;
                    break;
                case 'w':
                    this.chicks[i].x -= xSpeed;
                    this.chicks[i].x  = (this.chicks[i].x  < 0) ? 0: this.chicks[i].x;
                    break;
                default:
                    alert("one of the chicken has an undefined flying-direction");
            }
        }
    }

    updateChick(chick) {
        for(let i = 0; i < this.chicks.length; i++) {
            if(this.chicks[i].id === chick.id) {
                this.chicks[i].x = chick.x;
                this.chicks[i].y = chick.y;
                this.chicks[i].direction = chick.direction;
            }
        }
    }

    syncChicks(syncedChicks) {
        this.chicks = syncedChicks;
    }

    killChick(id) {
        for(let i = 0; i < this.chicks.length; i++) {
            if(this.chicks[i].id === id) {
                this.chicks[i].alive = false;
            }
        }
    }

    reviveChicken(revivedChicken) {
        for(let i = 0; i < this.chicks.length; i++) {
            if(this.chicks[i].id === revivedChicken.id) {
                this.chicks[i].x = revivedChicken.x;
                this.chicks[i].y = revivedChicken.y;
                this.chicks[i].direction = revivedChicken.direction;
                this.chicks[i].alive = true;
            }
        }
    }

    drawChicks() {
        let myChickIndex;
        for(let i = 0; i< this.chicks.length; i++) {
            if(this.chicks[i].id === this.myChickenId) {
                myChickIndex = i;
            }
        }

        for(let i = 0; i < this.chicks.length; i++) {

            if(this.chicks[i].alive === false) {
                continue;
            }

            if(this.chicks[i].direction === 'e') {
                if(i === myChickIndex) {
                    this.ctx.drawImage(picRightMe, this.drawableX(this.chicks[i].x), this.drawableY(this.chicks[i].y), VIRTUAL_CHICKEN_WIDTH * this.canvas.width, VIRTUAL_CHICKEN_HEIGHT * this.canvas.height);
                } else {
                    this.ctx.drawImage(picRight, this.drawableX(this.chicks[i].x), this.drawableY(this.chicks[i].y), VIRTUAL_CHICKEN_WIDTH * this.canvas.width, VIRTUAL_CHICKEN_HEIGHT * this.canvas.height);
                }
            } else if(this.chicks[i].direction === 'w'){
                if(i === myChickIndex) {
                    this.ctx.drawImage(picLeftMe, this.drawableX(this.chicks[i].x), this.drawableY(this.chicks[i].y), VIRTUAL_CHICKEN_WIDTH * this.canvas.width, VIRTUAL_CHICKEN_HEIGHT * this.canvas.height);
                } else {
                    this.ctx.drawImage(picLeft, this.drawableX(this.chicks[i].x), this.drawableY(this.chicks[i].y), VIRTUAL_CHICKEN_WIDTH * this.canvas.width, VIRTUAL_CHICKEN_HEIGHT * this.canvas.height);
                }
            }else if(this.chicks[i].direction === 'n'){
                if(i === myChickIndex) {
                    this.ctx.drawImage(picUpMe, this.drawableX(this.chicks[i].x), this.drawableY(this.chicks[i].y), VIRTUAL_CHICKEN_HEIGHT * this.canvas.height, VIRTUAL_CHICKEN_WIDTH * this.canvas.width);
                } else {
                    this.ctx.drawImage(picUp, this.drawableX(this.chicks[i].x), this.drawableY(this.chicks[i].y), VIRTUAL_CHICKEN_HEIGHT * this.canvas.height, VIRTUAL_CHICKEN_WIDTH * this.canvas.width);
                }
            }else{
                if(i === myChickIndex) {
                    this.ctx.drawImage(picDownMe, this.drawableX(this.chicks[i].x), this.drawableY(this.chicks[i].y),  VIRTUAL_CHICKEN_HEIGHT * this.canvas.height, VIRTUAL_CHICKEN_WIDTH * this.canvas.width);
                } else {
                    this.ctx.drawImage(picDown, this.drawableX(this.chicks[i].x), this.drawableY(this.chicks[i].y), VIRTUAL_CHICKEN_HEIGHT * this.canvas.height, VIRTUAL_CHICKEN_WIDTH * this.canvas.width);
                }
            }
        }
    }

    drawTimeLeft() {
        this.ctx.font = Math.round(VIRTUAL_FONT_SIZE * this.canvas.height) + "px Arial";
        this.ctx.fillStyle = "black";
        this.ctx.textAlign = "right";
        this.ctx.textBaseline = "top";
        this.ctx.fillText(this.timeLeft, this.canvas.width - this.drawableX(10) , this.drawableY(10));
    }

    drawLives() {
        let xPos = VIRTUAL_WIDTH;//this.canvas.width;
        let myChickIndex;

        for(let i = 0; i< this.chicks.length; i++) {
            if(this.chicks[i].id === this.myChickenId) {
                myChickIndex = i;
            }
        }

        if(myChickIndex === null) {
            console.log("error, mychickenid is not found in chicks array");
            return;
        }

        const livesLeft = this.chicks[myChickIndex].lives;
        const livesLost = TOTAL_LIVES - livesLeft;


        this.ctx.font = Math.round(VIRTUAL_FONT_SIZE * this.canvas.height) + "px Arial";
        this.ctx.fillStyle = "black";
        this.ctx.textAlign = "right";
        this.ctx.textBaseline = "bottom";

        let xOffsetLeft;
        if(livesLeft === 0) {
            xOffsetLeft = 0;
        } else {
            xOffsetLeft = this.ctx.measureText(HEART_SYMBOL.repeat(livesLeft)).width;
        }

        let xOffsetLost;
        if(livesLost === 0) {
            xOffsetLost = 0;
        } else {
            xOffsetLost = this.ctx.measureText(HEART_SYMBOL.repeat(livesLost)).width;
        }
        this.ctx.fillText(HEART_SYMBOL.repeat(livesLost), this.canvas.width - this.drawableX(10) , this.canvas.height);

        this.ctx.fillStyle = "red";
        this.ctx.fillText(HEART_SYMBOL.repeat(livesLeft), this.canvas.width - this.drawableX(10)- xOffsetLost , this.canvas.height);


    }

    drawBulletsLeft() {
        const bulletWidth = VIRTUAL_BULLET_WIDTH * this.canvas.width;
        const bulletHeight = VIRTUAL_BULLET_HEIGHT * this.canvas.height;
        for(let i = 0; i < this.bulletsLeft; ++i) {
            this.ctx.drawImage(bullet, this.canvas.width - bulletWidth - (i*bulletWidth), this.canvas.height - bulletHeight - this.drawableY(10), bulletWidth, bulletHeight);
        }
    }

    drawAnimatedShot() {
        if(this.animatedShot.progress > 0) {
            this.ctx.globalAlpha = this.animatedShot.progress / REFRESH_RATE;
            this.ctx.drawImage(crosshair, this.drawableX(this.animatedShot.x), this.drawableY(this.animatedShot.y));
            this.ctx.globalAlpha = 1;
            --this.animatedShot.progress;
        }
    }

    clearCanvas() {
        this.ctx.clearRect(0,0, this.canvas.width, this.canvas.height);
    }

    drawableX(virtualX){
        return virtualX * this.canvas.width/VIRTUAL_WIDTH;
    }

    drawableY(virtualY){
        return virtualY * this.canvas.height/VIRTUAL_HEIGHT;
    }

    createStatisticsText(data) {
        const mainContent = document.getElementById("main-content");
        mainContent.innerHTML = '<table id="stats" class="p-2 text-white bg-primary"></table>';

        const statisticsDiv = document.getElementById("stats");
        stats.innerHTML += "<tr><td>Hunter: </td><td>" + data.hunter.username + "</tr><tr><td>Shots: </td><td>" + data.hunter.shots + "</td></tr><tr><td>Hit Ratio: </td><td>" + Math.round(100 * data.hunter.hits/data.hunter.shots) / 100 + "</td></tr><br>";

        for(let chicken in data.chicken) {
            stats.innerHTML += "<br><tr><td>Chicken " + chicken + ": </td><td>" + data.chicken[chicken].username + "</td></tr><tr><td>Lifes left: </td><td>" + data.chicken[chicken].lifesLeft + "</td></tr>";
        }

        stats.innerHTML += '<br><button class="btn-sm bg-secondary text-white" id="backToLobby">zurück zur lobby</button>'
    }
}

const activteGame = new Gameboard();
