var suits = ["H", "C", "S", "D"], pictureSymbols = ["J", "Q", "K", "A"], deck = [], usedDeck = [],
    dealerHand = "Dealer",
    player0Hand = "Player0",
    player1Hand = "Player1",
    player2Hand = "Player2",
    allHands = [player0Hand, player1Hand, player2Hand],
    rules = {
        cardsDealtAtStart: 2,
        bustLimit: 21,
        autoStickLimit: 17
    },
    startScreen,
    gameScreen,
    playRoundButton,
    playDealerRoundButton,
    startDealerRoundButton,
    resetGameButton,
    UIButtons,
    outputSection,
    turnNumber = 0
;

function init() {
    createDeck();
    shuffleDeck();
    createPlayers();
    createDealer();
}

function startGame(numberOfPlayers) {
    startScreen = document.getElementById("StartScreen");
    gameScreen = document.getElementById("GameScreen");
    playRoundButton = document.getElementById("PlayRoundButton");
    playDealerRoundButton = document.getElementById("PlayDealerRoundButton");
    startDealerRoundButton = document.getElementById("StartDealerRoundButton");
    resetGameButton = document.getElementById("ResetButton");
    UIButtons = [playRoundButton, playDealerRoundButton, startDealerRoundButton];
    outputSection = document.getElementById("Output");
    startScreen.style.visibility = "hidden";
    outputSection.style.visibility = "visible";

    changePlayerDrivenState(numberOfPlayers);
    dealCards();
    showAllCards();
    checkForEndOfPlayerGame();
}

function playGame() {
    showPlayRoundButton(true);
    playTurn().then(checkForEndOfPlayerGame);
}

function playDealerRounds() {
    showPlayRoundButton(true);
    showPlayDealerRoundButton();
    checkDealerHand();
}

function checkDealerHand() {
    showPlayDealerRoundButton(true);
    dealerHand.getState() === "Playable" ? dealerHand.twist() : endGame();
    checkForEndOfDealerGame();
}


function endGame() {
    showAllCards();
    showResetButton();
    declareWinners();
}

function checkForEndOfPlayerGame() {
    return canWeStillPlay() ? showPlayRoundButton() : showStartDealerRoundButton()
}

function checkForEndOfDealerGame() {
    return canDealerStillPlay() ? showPlayDealerRoundButton() : endGame();
}

function canWeStillPlay() {
    return allHands.filter(player => player.getState() === "Playable").length !== 0;
}

function canDealerStillPlay() {
    console.log(dealerHand.getState());
    return dealerHand.getState() === "Playable";
}

function createCard(sym, suit) {
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
        suit: suits[suit], //H,C,S,D
        trueValue: trueValue //1,2,3,10,10,10,[1,11]
    }
}

function createSuit(suitValue) {
    var suitTemplate = [];
    for (var i = 2; i <= 10; i++) {
        suitTemplate.push(createCard(i, suitValue));
    }
    pictureSymbols.map(function (sym) {
        suitTemplate.push(createCard(sym, suitValue));
    });
    return suitTemplate;
}

function createDeck() {
    var currentSuit = -1;
    while (deck.length < 52) {
        currentSuit++;
        deck = deck.concat(createSuit(currentSuit));
    }
}

function createPlayers() {
    allHands = allHands.map(player => new Player(player));
}

function createDealer() {
    dealerHand = new Dealer(dealerHand)
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

    twist(){
        if (deck[0] === undefined) {
            deck = shuffle([...usedDeck]);usedDeck.length = 0;
            console.log(deck);
        }
        this.hand.push(deck.shift());
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

    stick () {
        this.state = "Sticking";
        showCards({
            name: this.name,
            simpleHand: this.simpleHand,
            currentHandValue: () => this.handValue,
            getState: () => this.state
        });
        return Promise.resolve()
    };

    burn () {
        this.reset();
        this.hasBurnt = true;
        return Promise.all(
            [...Array(rules.cardsDealtAtStart)].map(()=>this.twist())
        )
    }

    checkCards() {
        if (this.handValue > rules.bustLimit) this.state = "Bust";
        if (this.state === "Playable" && this.handValue > rules.autoStickLimit && !this.playerDriven) {
            this.state = "Sticking";
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
        this.hand.map(card => usedDeck.push(card));
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
    constructor (name){
        super(name, "Dealer");
    }
    twist(dealTurn){
        return super.twist().then(()=>{
            if(dealTurn===1) {
                showCards({
                    name: this.name,
                    simpleHand: () => [(this.hand[0].symbolicValue + this.hand[0].suit).toString(), "???"],
                    currentHandValue: () => this.hand[0].trueValue,
                    getState: () => ""
                });
            }
            return Promise.resolve();
        });
    }
}

function changePlayerDrivenState(numberOfPlayers) {
    allHands.map(player => player.makePlayerDriven(false));
    if (numberOfPlayers > 0) allHands[0].makePlayerDriven(true);
    if (numberOfPlayers > 1) allHands[1].makePlayerDriven(true);
    if (numberOfPlayers > 2) allHands[2].makePlayerDriven(true);
}

function dealCards() {
    for (var i = 0; i < rules.cardsDealtAtStart; i++) {
        allHands.concat(dealerHand).map(player => player.twist(i))
    }
}

function declareWinners() {
    var dealer = dealerHand,
        winStates = allHands.concat(dealerHand).map(function (player) {
            if (player === dealer) return;
            if (player.getState() === "Bust") {
                if (dealer.getState() === "Bust") return "Draw";
                return "Lose";
            }
            if (dealer.getState() === "Bust") return "Win!";
            return player.currentHandValue() > dealer.currentHandValue() ?
                "Win!" :
                player.currentHandValue() === dealer.currentHandValue() ?
                    "Draw" : "Lose";
        }).filter(e => typeof e === "string");

    winStates.map((p, i) => {
        document.getElementById("Player" + i + "WinState").textContent = p;
    });
}

function playerTwists(player, resolve) {
    return () => player.twist().then(resolve);
}
function playerSticks(player, resolve) {
    return () => player.stick().then(resolve);
}
function playerBurns(player, resolve){
    return () => player.burn().then(resolve);
}

function awaitPlayerAction(player) {
    let twist, stick, burn;
    return new Promise(resolve => Promise.race([
            new Promise((resolve) => {
                twist = playerTwists(player, resolve);
                return document.getElementById(player.name + "Twist").addEventListener("click", twist)
            }),
            new Promise((resolve) => {
                stick = playerSticks(player, resolve);
                return document.getElementById(player.name + "Stick").addEventListener("click", stick)
            }),
            new Promise((resolve) => {
                burn = playerBurns(player, resolve);
                let button = document.getElementById(player.name + "Burn");

                button.disabled = player.hasBurnt || player.currentHandValue() > 14;

                return button.addEventListener("click", burn)
            })
        ])
            .then(() => hidePlayerActionButtons(player, twist, stick, burn))
            .then(resolve)
    )
}

function hidePlayerActionButtons(player, twist, stick, burn) {
    document.getElementById(player.name + "Twist").removeEventListener("click", twist, false);
    document.getElementById(player.name + "Stick").removeEventListener("click", stick, false);
    document.getElementById(player.name + "Burn").removeEventListener("click", burn, false);
    document.getElementById(player.name + "Buttons").style.visibility = "hidden";
    return Promise.resolve();
}

function showPlayerActionButtons(player) {
    document.getElementById(player.name + "Buttons").style.visibility = "visible";
    return Promise.resolve(player);
}

function playTurn() {
    turnNumber++;
    showPlayRoundButton(true);
    return new Promise(resolve => {
        return allHands.reduce((promise, player) => {
            return promise.then(() => {
                if (player.isPlayerDriven()) {
                    if (player.getState() !== "Playable") return Promise.resolve();
                    return showPlayerActionButtons(player).then(awaitPlayerAction);
                } else {
                    return player.getState() === "Playable" ? player.twist() : Promise.resolve();
                }
            })
        }, Promise.resolve())
            .then(resolve);
    });
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

function showResetButton() {
    UIButtons.map(button => button.style.visibility = "hidden");
    resetGameButton.style.visibility = "visible";
}

function showAllCards() {
    document.getElementById("TurnNumber").textContent = "Turn : " + turnNumber;
    allHands.concat(dealerHand).map(showCards);
}

function showCards(playerHand) {
    document.getElementById(playerHand.name + "Name").textContent = playerHand.name;
    document.getElementById(playerHand.name + "Hand").textContent = playerHand.simpleHand();
    playerHand.simpleHand().map(cardName => {console.log(cardName)});
    document.getElementById(playerHand.name + "Total").textContent = "total : " + playerHand.currentHandValue();
    document.getElementById(playerHand.name + "PlayState").textContent = playerHand.getState();
}

function shuffleDeck() {
    deck = shuffle(deck);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
        [array[i], array[j]] = [array[j], array[i]]; // swap elements
    }
    return array;
}

function resetGame() {
    allHands.concat(dealerHand).map(hand => hand.reset());
    startScreen.style.visibility = "visible";
    gameScreen.style.visibility = "hidden";
    resetGameButton.style.visibility = "hidden";
    outputSection.style.visibility = "hidden";
    //resetWinStates
    ["", "", ""].map((p, i) => {
        document.getElementById("Player" + i + "WinState").textContent = p;
    });
}

init();




