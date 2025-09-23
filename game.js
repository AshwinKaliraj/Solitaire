class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.faceUp = false;
        this.element = null;
    }

    get color() {
        return (this.suit === 'hearts' || this.suit === 'diamonds') ? 'red' : 'black';
    }

    get symbol() {
        const symbols = {
            hearts: '♥',
            diamonds: '♦',
            clubs: '♣',
            spades: '♠'
        };
        return symbols[this.suit];
    }

    get rankLabel() {
        const labels = {
            1: 'A',
            11: 'J',
            12: 'Q',
            13: 'K'
        };
        return labels[this.rank] || this.rank.toString();
    }

    createElement() {
        const card = document.createElement('div');
        card.classList.add('card', this.color);
        card.innerHTML = this.symbol; // Suit symbol in center
        card.dataset.suit = this.suit;
        card.dataset.rank = this.rank;
        card.draggable = true;
        this.element = card;
        this.updateVisibility();
        return card;
    }

    updateVisibility() {
        if (this.element) {
            this.element.classList.toggle('hidden', !this.faceUp);
        }
    }

    flip() {
        this.faceUp = !this.faceUp;
        this.updateVisibility();
    }
}

class Pile {
    constructor(type) {
        this.type = type;
        this.cards = [];
        this.element = null;
    }

    addCard(card, faceUp = true) {
        card.faceUp = faceUp;
        this.cards.push(card);
        if (this.element) {
            this.element.appendChild(card.element || card.createElement());
            this.updateCardPositions();
        }
    }

    removeCard(card) {
        const index = this.cards.indexOf(card);
        if (index !== -1) {
            this.cards.splice(index, 1);
            if (card.element && card.element.parentNode === this.element) {
                card.element.remove();
            }
            this.updateCardPositions();
        }
        this.element.style.display = 'flex'; // Keep pile visible
    }

    addCards(cards) {
        cards.forEach(card => this.addCard(card, true));
    }

    removeCards(cards) {
        cards.forEach(card => this.removeCard(card));
    }

    getTopCard() {
        return this.cards[this.cards.length - 1];
    }

    updateCardPositions() {
        this.cards.forEach((card, index) => {
            if (card.element) {
                if (this.type === 'tableau') {
                    card.element.style.top = `${index * 30}px`;
                } else {
                    card.element.style.top = '0';
                }
            }
        });
    }
}

class Game {
    constructor() {
        this.deck = [];
        this.tableau = Array.from({ length: 7 }, () => new Pile('tableau'));
        this.foundations = Array.from({ length: 4 }, () => new Pile('foundation'));
        this.stock = new Pile('stock');
        this.waste = new Pile('waste');
        this.selectedCard = null;
        this.selectedPile = null;
        this.selectedCards = [];
        this.moveCount = 0;
        this.history = [];
        this.initElements();
        this.newGame();
    }

    initElements() {
        this.stock.element = document.getElementById('stock');
        this.waste.element = document.getElementById('waste');
        this.foundations.forEach((f, i) => {
            f.element = document.getElementById(`foundation-${i}`);
        });
        this.tableau.forEach((t, i) => {
            t.element = document.getElementById(`tableau-${i}`);
        });

        this.stock.element.addEventListener('click', () => this.drawFromStock());
        document.getElementById('new-game').addEventListener('click', () => this.newGame());
        document.getElementById('undo').addEventListener('click', () => this.undo());
        this.setupDragAndDrop();
    }

    createDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = Array.from({ length: 13 }, (_, i) => i + 1);
        this.deck = [];
        suits.forEach(suit => {
            ranks.forEach(rank => {
                this.deck.push(new Card(suit, rank));
            });
        });
        this.shuffleDeck();
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCards() {
        [this.stock, this.waste, ...this.foundations, ...this.tableau].forEach(pile => {
            pile.cards = [];
            pile.element.innerHTML = '';
            pile.element.style.display = 'flex'; // Keep piles visible
        });

        let cardIndex = 0;
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j <= i; j++) {
                const card = this.deck[cardIndex++];
                this.tableau[i].addCard(card, j === i);
            }
        }

        for (let i = cardIndex; i < this.deck.length; i++) {
            this.stock.addCard(this.deck[i], false);
        }

        this.updateAllPositions();
    }

    updateAllPositions() {
        [this.stock, this.waste, ...this.foundations, ...this.tableau].forEach(pile => pile.updateCardPositions());
    }

    drawFromStock() {
        this.saveState();
        if (this.stock.cards.length === 0) {
            while (this.waste.cards.length > 0) {
                const card = this.waste.getTopCard();
                if (!card) return;
                this.waste.removeCard(card);
                card.flip();
                this.stock.addCard(card, false);
            }
        } else {
            const card = this.stock.getTopCard();
            if (!card) return;
            this.stock.removeCard(card);
            card.flip();
            this.waste.addCard(card, true);
            this.incrementMove();
        }
    }

    newGame() {
        this.createDeck();
        this.dealCards();
        this.moveCount = 0;
        this.history = [];
        this.updateMoveCount();
    }

    undo() {
        if (this.history.length > 0) {
            const lastState = this.history.pop();
            this.restoreState(lastState);
            this.moveCount--;
            this.updateMoveCount();
        }
    }

    saveState() {
        const state = {
            tableau: this.tableau.map(p => p.cards.map(c => ({
                suit: c.suit,
                rank: c.rank,
                faceUp: c.faceUp
            }))),
            foundations: this.foundations.map(p => p.cards.map(c => ({
                suit: c.suit,
                rank: c.rank,
                faceUp: c.faceUp
            }))),
            stock: this.stock.cards.map(c => ({
                suit: c.suit,
                rank: c.rank,
                faceUp: c.faceUp
            })),
            waste: this.waste.cards.map(c => ({
                suit: c.suit,
                rank: c.rank,
                faceUp: c.faceUp
            }))
        };
        this.history.push(state);
    }

    restoreState(state) {
        [this.stock, this.waste, ...this.foundations, ...this.tableau].forEach(p => {
            p.cards = [];
            p.element.innerHTML = '';
            p.element.style.display = 'flex';
        });
        state.tableau.forEach((pileCards, i) => {
            pileCards.forEach(pc => {
                const card = new Card(pc.suit, pc.rank);
                card.faceUp = pc.faceUp;
                card.element = card.createElement();
                this.tableau[i].addCard(card, pc.faceUp);
            });
        });
        state.foundations.forEach((pileCards, i) => {
            pileCards.forEach(pc => {
                const card = new Card(pc.suit, pc.rank);
                card.faceUp = pc.faceUp;
                card.element = card.createElement();
                this.foundations[i].addCard(card, pc.faceUp);
            });
        });
        state.stock.forEach(pc => {
            const card = new Card(pc.suit, pc.rank);
            card.faceUp = pc.faceUp;
            card.element = card.createElement();
            this.stock.addCard(card, pc.faceUp);
        });
        state.waste.forEach(pc => {
            const card = new Card(pc.suit, pc.rank);
            card.faceUp = pc.faceUp;
            card.element = card.createElement();
            this.waste.addCard(card, pc.faceUp);
        });
        this.updateAllPositions();
    }

    incrementMove() {
        this.moveCount++;
        this.updateMoveCount();
    }

    updateMoveCount() {
        document.getElementById('move-count').innerText = `Moves: ${this.moveCount}`;
    }

    setupDragAndDrop() {
        const piles = [...this.tableau, ...this.foundations, this.waste];
        piles.forEach(pile => {
            pile.element.addEventListener('dragover', e => e.preventDefault());
            pile.element.addEventListener('drop', e => this.handleDrop(e, pile));
        });

        document.addEventListener('dragstart', e => {
            if (e.target.classList.contains('card') && !e.target.classList.contains('hidden')) {
                this.selectedCard = e.target;
                this.selectedPile = this.findPileOfCard(e.target);
                this.selectedCards = [];
                if (this.selectedPile.type === 'tableau') {
                    const card = this.cardsFindByElement(e.target);
                    const index = this.selectedPile.cards.indexOf(card);
                    this.selectedCards = this.selectedPile.cards.slice(index).filter(c => c.faceUp);
                } else {
                    this.selectedCards = [this.cardsFindByElement(e.target)];
                }
                e.dataTransfer.setData('text/plain', '');
            }
        });
    }

    findPileOfCard(cardElement) {
        return [...this.tableau, this.waste, ...this.foundations].find(p => p.element.contains(cardElement));
    }

    handleDrop(e, targetPile) {
        if (!this.selectedCard || !this.selectedCards.length) return;
        const sourcePile = this.selectedPile;
        const leadCard = this.selectedCards[0];
        if (this.canMove(leadCard, sourcePile, targetPile)) {
            this.saveState();
            sourcePile.removeCards(this.selectedCards);
            targetPile.addCards(this.selectedCards);
            if (sourcePile.type === 'tableau' && sourcePile.cards.length > 0) {
                const top = sourcePile.getTopCard();
                if (!top.faceUp) {
                    top.flip();
                }
            }
            this.incrementMove();
            this.checkWin();
        }
        this.selectedCard = null;
        this.selectedPile = null;
        this.selectedCards = [];
    }

    cardsFindByElement(element) {
        return [...this.stock.cards, ...this.waste.cards, ...this.foundations.flatMap(f => f.cards), ...this.tableau.flatMap(t => t.cards)]
            .find(c => c.element === element);
    }

    canMove(card, sourcePile, targetPile) {
        if (sourcePile === targetPile) return false;

        if (targetPile.type === 'foundation') {
            if (this.selectedCards.length > 1) return false; // Only one card to foundation
            const top = targetPile.getTopCard();
            if (!top) {
                return card.rank === 1;
            }
            return card.suit === top.suit && card.rank === top.rank + 1;
        } else if (targetPile.type === 'tableau') {
            const top = targetPile.getTopCard();
            if (!top) {
                return card.rank === 13;
            }
            return card.color !== top.color && card.rank === top.rank - 1;
        }
        return false;
    }

    checkWin() {
        if (this.foundations.every(f => f.cards.length === 13)) {
            alert('Congratulations! You won!');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Game();
});