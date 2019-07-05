var customNames = {
        Player0: "Player0",
        Player1: "Player1",
        Player2: "Player2",
        Dealer: "Dealer"
    },
    rules = {
        cardsDealtAtStart: 2,
        bustLimit: 21,
        autoStickLimit: 17,
        turnTimeoutLimit:10 //in seconds
    },
    dealerHand = "Dealer",
    player0Hand = "Player0",
    player1Hand = "Player1",
    player2Hand = "Player2",
    allHands = [player0Hand, player1Hand, player2Hand],
    deck,
    startScreen,
    gameScreen,
    playRoundButton,
    playDealerRoundButton,
    startDealerRoundButton,
    endScreenDiv,
    UIButtons,
    turnNumber = 0,
    previousNumberOfPlayers = 0
;

class Deck {

    #pictureSymbols = ["J", "Q", "K", "A"];
    #suits = ["H", "C", "S", "D"];
    #currentSuit = -1;
    usedCards = [];
    #inventory = [];
    #deckName = "deck_1";
    #deckCount;
    #deckImage;
    #deckContainer;

    constructor() {
        while (this.#inventory.length < 52) {
            this.#currentSuit++;
            this.#inventory = this.#inventory.concat(this.#createSuit(this.#currentSuit));
        }
        this.#deckCount = document.getElementById("CardCount");
        this.#deckImage = document.getElementById("Deck");
        this.#deckContainer = document.getElementById("DeckContainer");
        this.#shuffleDeck();
    };

    get name() {
        return this.#deckName
    };

    set name(name) {
        this.#deckName = name
    };

    #createCard = (sym, suit) => {
        var trueValue = -1;
        if (typeof sym !== "string") {
            trueValue = sym;
        } else {
            if (sym === "A") {
                trueValue = 11;
            } else {
                trueValue = 10;
            }
        }
        return {
            symbolicValue: sym.toString(), //1,2,3,K,Q,J,A
            suit: this.#suits[suit], //H,C,S,D
            trueValue: trueValue //1,2,3,10,10,10,[1,11]
        }
    };

    #createSuit = (suitValue) => {
        var suitTemplate = [];
        for (var i = 2; i <= 10; i++) {
            suitTemplate.push(this.#createCard(i, suitValue));
        }
        this.#pictureSymbols.map(sym => suitTemplate.push(this.#createCard(sym, suitValue)));
        return suitTemplate;
    };

    #replenishDeck = () => {
        this.#inventory = [...this.usedCards];
        this.#shuffleDeck();
        this.usedCards.length = 0;
    };

    drawTopCard() {
        if (this.#inventory[0] === undefined) this.#replenishDeck();
        this.#updateCount();
        return this.#inventory.shift();
    }

    showDeck = () => {
        if (this.#deckImage === null) this.#deckImage = document.getElementById("Deck");
        this.#deckImage.src = "poker_cards_chips_2d/Set_B/small/" + this.#deckName + ".png";
    };

    #updateCount = () => {
        if (this.#deckCount === null) this.#deckCount = document.getElementById("CardCount");
        this.#deckCount.textContent = "Count:" + this.#inventory.length;
        this.#deckImage.style.visibility = this.#inventory.length === 0 ? "hidden" : "visible";
    };

    #shuffleDeck = () => {
        for (let i = this.#inventory.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
            [this.#inventory[i], this.#inventory[j]] = [this.#inventory[j], this.#inventory[i]]; // swap elements
        }
    };
}

class Player {

    constructor(playerName) {
        this.hand = [];
        this.name = playerName;
        this.handValue = 0;
        this.hasBurnt = false;
        this.state = "Playable";
        this.playerDriven = false;
    };

    twist() {
        this.hand.push(deck.drawTopCard());
        this.updateHandValue();
        this.checkCards();
        showCards({
            name: this.name,
            simpleHand: this.simpleHand,
            currentHandValue: () => this.handValue,
            getState: () => this.state
        });
        return Promise.resolve();
    };

    stick() {
        this.state = "Sticking";
        showCards({
            name: this.name,
            simpleHand: this.simpleHand,
            currentHandValue: () => this.handValue,
            getState: () => this.state
        });
        return Promise.resolve()
    };

    burn() {
        this.reset();
        this.hasBurnt = true;
        return Promise.all(
            [...Array(rules.cardsDealtAtStart)].map(() => this.twist())
        )
    }

    checkCards(override) {
        if (this.state !== "Playable") return;
        if (this.handValue > rules.bustLimit) {
            this.state = "Bust";
            return;
        }
        if (this.handValue > rules.autoStickLimit) {
            if(this.hand.length === 2 && this.handValue === 21){
                this.state = "BlackJack!";
                return;
            }
            if(override || !this.playerDriven){
                this.state = "Sticking";
                return;
            }
        }
    };

    updateHandValue() {
        this.handValue = this.hand.reduce((total, card) => total + card.trueValue, 0);
        if (this.handValue > rules.bustLimit) {
            this.handValue = this.hand.reduce((total, card) => {
                if (card.trueValue === 11) card.trueValue = 1;
                return total + card.trueValue;
            }, 0);
        }
    };

    reset() {
        this.hand.map(card => deck.usedCards.push(card));
        this.hand.length = 0;
        this.updateHandValue();
        this.hasBurnt = false;
        this.state = "Playable";
    };

    simpleHand = () => this.hand.map(card => (card.symbolicValue + card.suit).toString());
    currentHandValue = () => this.handValue;
    getState = () => this.state;
    isPlayerDriven = () => this.playerDriven;
    makePlayerDriven = (state) => this.playerDriven = state;
}

class Dealer extends Player {
    constructor(name) {
        super(name, "Dealer");
    }

    twist(dealTurn) {
        return super.twist().then(() => {
            if (dealTurn === 1) {
                showCards({
                    name: this.name,
                    simpleHand: () => [(this.hand[0].symbolicValue + this.hand[0].suit).toString(), deck.name],
                    currentHandValue: () => this.hand[0].trueValue,
                    getState: () => ""
                });
            }
            return Promise.resolve();
        });
    }
}

function init() {
    deck = new Deck();
    createPlayers();
    createDealer();
}

function startGame(numberOfPlayers) {
    startScreen = document.getElementById("StartScreen");
    gameScreen = document.getElementById("GameScreen");
    playRoundButton = document.getElementById("PlayRoundButton");
    playDealerRoundButton = document.getElementById("PlayDealerRoundButton");
    startDealerRoundButton = document.getElementById("StartDealerRoundButton");
    endScreenDiv = document.getElementById("EndGameScreen");
    UIButtons = [playRoundButton, playDealerRoundButton, startDealerRoundButton];
    gameScreen.style.visibility = "visible";
    startScreen.style.visibility = "hidden";
    setCustomNames();
    deck.showDeck();
    changePlayerDrivenState(numberOfPlayers);
    dealCards();
    showAllCards();
    checkForEndOfPlayerGame();
}

function setCustomNames(){
    let nameFields = Array.from(document.getElementsByClassName("playerNames"));
    allHands.map((player,i) => {
        if(nameFields[i].value === "") return;
        customNames[player.name] = nameFields[i].value;
    });
}

function playGame() {
    showPlayRoundButton(true);
    playTurn().then(checkForEndOfPlayerGame);
}

function endGame() {
    showAllCards();
    showEndScreenButtons();
    declareWinners();
}

function awaitPlayerAction(player) {
    let twist, stick, burn, resetCounter, timer;
    return new Promise(resolve => Promise.race([
            new Promise(resolve => {
                twist = playerTwists(player, resolve);
                return document.getElementById(player.name + "Twist").addEventListener("click", twist)
            }),
            new Promise(resolve => {
                stick = playerSticks(player, resolve);
                return document.getElementById(player.name + "Stick").addEventListener("click", stick)
            }),
            new Promise(resolve => {
                burn = playerBurns(player, resolve);
                let button = document.getElementById(player.name + "Burn");
                button.disabled = player.hasBurnt || player.currentHandValue() > 14;
                return button.addEventListener("click", burn)
            }),
            new Promise(resolve => {
                let afk = playerIsAFK(player,resolve);
                resetCounter  = () => {
                    clearTimeout(timer);
                    timer = setTimeout(afk, timeLimit*1000);
                };
                let timeLimit = 10;
                timer = setTimeout(afk, timeLimit*1000);

                document.body.addEventListener("mousemove", resetCounter);
                return timer;
                //set timeout on mouse, reset if the player doesnt interact.
            })
        ])
            .then(() => hidePlayerActionButtons(player, twist, stick, burn, resetCounter, timer))
            .then(resolve)
    )
}

function canWeStillPlay() {
    return allHands.filter(player => player.getState() === "Playable").length !== 0;
}

function canDealerStillPlay() {
    return dealerHand.getState() === "Playable";
}

function checkForEndOfPlayerGame() {
    return canWeStillPlay() ? showPlayRoundButton() : showStartDealerRoundButton()
}

function checkForEndOfDealerGame() {
    return canDealerStillPlay() ? showPlayDealerRoundButton() : endGame();
}

function checkDealerHand() {
    showPlayDealerRoundButton(true);
    dealerHand.getState() === "Playable" ? dealerHand.twist() : endGame();
    checkForEndOfDealerGame();
}

function changePlayerDrivenState(numberOfPlayers) {
    previousNumberOfPlayers = numberOfPlayers;
    allHands.map(player => player.makePlayerDriven(false));
    if (numberOfPlayers > 0) allHands[0].makePlayerDriven(true);
    if (numberOfPlayers > 1) allHands[1].makePlayerDriven(true);
    if (numberOfPlayers > 2) allHands[2].makePlayerDriven(true);
}

function createPlayers() {
    allHands = allHands.map(player => new Player(player));
}

function createDealer() {
    dealerHand = new Dealer(dealerHand)
}

function dealCards() {
    for (var i = 0; i < rules.cardsDealtAtStart; i++) {
        allHands.concat(dealerHand).map(player => player.twist(i))
    }
}

function declareWinners() {
    var dealer = dealerHand,
        winStates = allHands.map(function (player) {
            if (player === dealer) return;
            if(player.getState() === "BlackJack!"){
                return dealer.getState() === "BlackJack!" ? "Draw" : "Win!";
            }
            if (player.getState() === "Bust") {
                if (dealer.getState() === "Bust") return "Draw";
                return "Lose";
            }
            if (dealer.getState() === "Bust") return "Win!";
            return player.currentHandValue() > dealer.currentHandValue() ? "Win!" :
                player.currentHandValue() === dealer.currentHandValue() ?
                    "Draw" : "Lose";
        }).filter(e => typeof e === "string");

    winStates.map((p, i) => {
        document.getElementById("Player" + i + "WinState").textContent = p;
    });
}

function hidePlayerActionButtons(player, twist, stick, burn, resetCounter, timer) {
    document.getElementById(player.name + "Twist").removeEventListener("click", twist, false);
    document.getElementById(player.name + "Stick").removeEventListener("click", stick, false);
    document.getElementById(player.name + "Burn").removeEventListener("click", burn, false);
    document.body.removeEventListener("mousemove",resetCounter,false);
    clearTimeout(timer);
    document.getElementById(player.name + "Buttons").style.visibility = "hidden";
    return Promise.resolve();
}

function playTurn() {
    turnNumber++;
    showPlayRoundButton(true);
    return new Promise(resolve => {
        return allHands.reduce((promise, player) => {
            return promise.then(() => {
                if (player.getState() !== "Playable") return Promise.resolve();
                return player.isPlayerDriven() ? showPlayerActionButtons(player).then(awaitPlayerAction) : player.twist();
            })
        }, Promise.resolve())
            .then(resolve);
    });
}

function playerTwists(player, resolve) {
    return () => player.twist().then(resolve);
}

function playerSticks(player, resolve) {
    return () => player.stick().then(resolve);
}

function playerBurns(player, resolve) {
    return () => player.burn().then(resolve);
}

function playerIsAFK(player,resolve) {
    return () => {
        player.checkCards(true);
        if(player.getState() === "Playable") player.twist();
        return resolve()
    };
}

function playDealerRounds() {
    showPlayRoundButton(true);
    showPlayDealerRoundButton();
    checkDealerHand();
}

function showPlayerActionButtons(player) {
    document.getElementById(player.name + "Buttons").style.visibility = "visible";
    return Promise.resolve(player);
}

function showPlayRoundButton(hidden) {
    playRoundButton.style.visibility = hidden ? "hidden" : "visible";
}

function showPlayDealerRoundButton(hidden) {
    playDealerRoundButton.style.visibility = hidden ? "hidden" : "visible";
}

function showStartDealerRoundButton(hidden) {
    startDealerRoundButton.style.visibility = hidden ? "hidden" : "visible";
}

function showEndScreenButtons() {
    UIButtons.map(button => button.style.visibility = "hidden");
    endScreenDiv.style.visibility = "visible";
}

function showAllCards() {
    document.getElementById("TurnNumber").textContent = "Turn : " + turnNumber;
    allHands.concat(dealerHand).map(showCards);
}

function showCards(playerHand) {
    document.getElementById(playerHand.name + "Name").textContent = customNames[playerHand.name];
    playerHand.simpleHand().map((cardName, cardIndex) =>
        document.getElementById(playerHand.name + "Card" + cardIndex).src = "poker_cards_chips_2d/Set_B/small/" + cardName + ".png"
    );
    document.getElementById(playerHand.name + "Total").textContent = "total : " + playerHand.currentHandValue();
    document.getElementById(playerHand.name + "PlayState").textContent = playerHand.getState();
}

function resetGame() {
    resetCards();
    startScreen.style.visibility = "visible";
    gameScreen.style.visibility = "hidden";
}

function playAgain() {
    resetCards();
    startGame(previousNumberOfPlayers);
}

function resetCards() {
    allHands.concat(dealerHand).map(hand => hand.reset());
    //resetWinStates
    ["", "", ""].map((p, i) => {
        document.getElementById("Player" + i + "WinState").textContent = p;
    });
    //reset card images
    Array.from(document.getElementsByClassName("card")).map(card => card.src = "");
    endScreenDiv.style.visibility = "hidden";
}


init();




