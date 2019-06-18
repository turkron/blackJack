var suits = ["H", "C", "S", "D"], pictureSymbols = ["J", "Q", "K", "A"], deck = [],
    dealerHand = "dealer",
    player0Hand = "player0",
    player1Hand = "player1",
    player2Hand = "player2",
    players = [player0Hand, player1Hand, player2Hand, dealerHand],
    rules = {
        cardsDealtAtStart: 2,
        bustLimit: 21,
        autoStickLimit:17
    },
    startButton,
    outputSection
;

function init() {
    createDeck();
    shuffleDeck();
    createPlayers();
}

function startGame() {
    startButton = document.getElementById("StartButton");
    outputSection = document.getElementById("Output");
    startButton.style.visibility = "hidden";
    outputSection.style.visibility = "visible";
    outputSection.textContent = "Game playing in console.";
    dealCards();
    showCards();
    playTurns();
    //then proceed to work out the winner against the dealer
    //declareWinners();
}

function playTurns(){
    if(players.filter(function (player) {
        console.log(player.getState(), player.name, player.currentHandValue());
        return player.getState() === "Playable";
    }).length !== 0) {
        playTurn();
        return playTurns();
    }
}

function playTurn (){
    players.map(function (player) {
        if(player.getState() === "Playable"){
            player.addCard(deck.shift());
        }
    });
}

function showCards() {
    players.map(function (playerHand) {
        console.log(playerHand.name, "has : ", playerHand.currentHandValue(), ", made of :", playerHand.simpleHand());
    })
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

function createPlayer(playerName) {
    var currentHand = [],
        currentName = playerName,
        currentHandValue = 0,
        state = "Playable",
        playerDriven = false,
        addCard = function () {
            console.log(currentHand);
            currentHand.push(deck.shift());
            updateHandValue();
        },
        updateHandValue = function () {
            currentHandValue = currentHand.reduce(function (total, card) {
               return total + card.trueValue;
            },0);
            if (currentHandValue > rules.bustLimit) {
                currentHandValue = currentHand.reduce(function (total, card) {
                    if (card.trueValue === 11) {
                        //found an ace
                        card.trueValue = 1;
                    }
                    return total + card.trueValue;
                }, 0);

                //is the hand still bust?
                if (currentHandValue > rules.bustLimit) {
                    state = "Bust";
                }
            }
            if(state === "Playable" && currentHandValue > rules.autoStickLimit && !playerDriven){
                state = "Sticking";
            }
        },
        reset = function () {
            currentHand.length = 0;
            updateHandValue();
        }
    ;

    return {
        addCard: addCard,
        hand: currentHand,
        name: currentName,
        simpleHand: function () {
            return currentHand.map(function (card) {
                return (card.symbolicValue + card.suit).toString();
            })
        },
        value: currentHandValue,
        getState: function () {
            return state
        },
        isPlayerDriven: playerDriven,
        currentHandValue: function () {
            return currentHandValue;
        },
        reset:reset
    }
}

function createPlayers() {
    players = players.map(function (player) {
        return createPlayer(player);
    });
}

function dealCards() {
    for (var i = 0; i < rules.cardsDealtAtStart; i++) {
        players.map(function (player) {
            player.addCard()
        })
    }
}


init();




