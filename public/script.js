// Socket connection
const socket = io();

// Game state
let gameState = {
    roomCode: null,
    playerName: null,
    isHost: false,
    players: [],
    currentRole: null,
    secretWord: null,
    currentTopic: null,
    diceRoll: null,
    timerInterval: null
};

// DOM elements
const screens = {
    welcome: document.getElementById('welcomeScreen'),
    rules: document.getElementById('rulesScreen'),
    lobby: document.getElementById('lobbyScreen'),
    game: document.getElementById('gameScreen')
};

const elements = {
    playerName: document.getElementById('playerName'),
    roomCode: document.getElementById('roomCode'),
    roomCodeDisplay: document.getElementById('roomCodeDisplay'),
    playerCount: document.getElementById('playerCount'),
    playersList: document.getElementById('playersList'),
    startGameBtn: document.getElementById('startGameBtn'),
    waitingMessage: document.getElementById('waitingMessage'),
    topicTitle: document.getElementById('topicTitle'),
    topicGrid: document.getElementById('topicGrid'),
    yellowDie: document.getElementById('yellowDie'),
    blueDie: document.getElementById('blueDie'),
    playerRole: document.getElementById('playerRole'),
    secretWordDisplay: document.getElementById('secretWordDisplay'),
    statusMessage: document.getElementById('statusMessage'),
    timer: document.getElementById('timer'),
    clueInput: document.getElementById('clueInput'),
    clueText: document.getElementById('clueText'),
    cluesList: document.getElementById('cluesList'),
    discussionControls: document.getElementById('discussionControls'),
    votingArea: document.getElementById('votingArea'),
    votingOptions: document.getElementById('votingOptions'),
    votingResults: document.getElementById('votingResults'),
    votesList: document.getElementById('votesList'),
    chameleonGuess: document.getElementById('chameleonGuess'),
    guessText: document.getElementById('guessText'),
    gameResult: document.getElementById('gameResult'),
    resultMessage: document.getElementById('resultMessage'),
    errorMessage: document.getElementById('errorMessage'),
    errorText: document.getElementById('errorText')
};

// Event listeners
document.getElementById('createRoomBtn').addEventListener('click', createRoom);
document.getElementById('joinRoomBtn').addEventListener('click', showJoinInput);
document.getElementById('confirmJoinBtn').addEventListener('click', joinRoom);
document.getElementById('showRules').addEventListener('click', showRules);
document.getElementById('backToLobby').addEventListener('click', showLobby);
document.getElementById('startGameBtn').addEventListener('click', startGame);
document.getElementById('submitClue').addEventListener('click', submitClue);
document.getElementById('endDiscussion').addEventListener('click', endDiscussion);
document.getElementById('submitGuess').addEventListener('click', submitGuess);
document.getElementById('playAgain').addEventListener('click', playAgain);
document.getElementById('closeError').addEventListener('click', hideError);

// Enter key handlers
elements.playerName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createRoom();
});

elements.roomCode.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinRoom();
});

elements.clueText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitClue();
});

elements.guessText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitGuess();
});

// Utility functions
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function showError(message) {
    elements.errorText.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    setTimeout(hideError, 5000);
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}

function updateTimer(seconds) {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    let remaining = seconds;
    elements.timer.textContent = formatTime(remaining);
    
    gameState.timerInterval = setInterval(() => {
        remaining--;
        elements.timer.textContent = formatTime(remaining);
        
        if (remaining <= 0) {
            clearInterval(gameState.timerInterval);
        }
    }, 1000);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Game functions
function createRoom() {
    const name = elements.playerName.value.trim();
    if (!name) {
        showError('Please enter your name');
        return;
    }
    
    gameState.playerName = name;
    socket.emit('createRoom', { playerName: name });
}

function showJoinInput() {
    document.getElementById('joinRoomInput').classList.remove('hidden');
    elements.roomCode.focus();
}

function joinRoom() {
    const name = elements.playerName.value.trim();
    const code = elements.roomCode.value.trim().toUpperCase();
    
    if (!name) {
        showError('Please enter your name');
        return;
    }
    
    if (!code || code.length !== 4) {
        showError('Please enter a valid 4-letter room code');
        return;
    }
    
    gameState.playerName = name;
    socket.emit('joinRoom', { roomCode: code, playerName: name });
}

function showRules() {
    showScreen('rules');
}

function showLobby() {
    showScreen('lobby');
}

function startGame() {
    socket.emit('startGame');
}

function submitClue() {
    const clue = elements.clueText.value.trim();
    if (!clue) {
        showError('Please enter a clue');
        return;
    }
    
    socket.emit('submitClue', { clue });
    elements.clueText.value = '';
    elements.clueInput.classList.add('hidden');
}

function endDiscussion() {
    socket.emit('endDiscussion');
}

function submitVote(playerId) {
    socket.emit('submitVote', { vote: playerId });
    
    // Update UI to show vote submitted
    document.querySelectorAll('.vote-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    if (playerId === 'nobody') {
        document.querySelector('[data-vote="nobody"]').classList.add('selected');
    } else {
        document.querySelector(`[data-vote="${playerId}"]`).classList.add('selected');
    }
}

function submitGuess() {
    const guess = elements.guessText.value.trim();
    if (!guess) {
        showError('Please enter your guess');
        return;
    }
    
    socket.emit('chameleonGuess', { guess });
    elements.chameleonGuess.classList.add('hidden');
}

function playAgain() {
    elements.gameResult.classList.add('hidden');
    showScreen('lobby');
}

// Socket event handlers
socket.on('roomCreated', (data) => {
    gameState.roomCode = data.roomCode;
    gameState.isHost = true;
    gameState.players = data.players;
    
    elements.roomCodeDisplay.textContent = data.roomCode;
    updatePlayersDisplay();
    showScreen('lobby');
});

socket.on('playerJoined', (data) => {
    gameState.players = data.players;
    gameState.isHost = data.isHost;
    updatePlayersDisplay();
    showScreen('lobby');
});

socket.on('playerLeft', (data) => {
    gameState.players = data.players;
    if (data.newHost) {
        gameState.isHost = data.newHost === socket.id;
    }
    updatePlayersDisplay();
});

socket.on('gameStarted', (data) => {
    gameState.currentTopic = data.topic;
    gameState.diceRoll = data.diceRoll;
    
    elements.topicTitle.textContent = data.topic.title;
    elements.yellowDie.textContent = data.diceRoll.yellow;
    elements.blueDie.textContent = data.diceRoll.blue;
    
    // Create topic grid
    elements.topicGrid.innerHTML = '';
    data.topic.words.forEach(word => {
        const div = document.createElement('div');
        div.className = 'topic-word';
        div.textContent = word;
        elements.topicGrid.appendChild(div);
    });
    
    showScreen('game');
});

socket.on('roleAssigned', (data) => {
    gameState.currentRole = data.role;
    gameState.secretWord = data.secretWord;
    
    if (data.role === 'chameleon') {
        elements.playerRole.textContent = '🦎 You are the CHAMELEON';
        elements.playerRole.className = 'role-display chameleon';
        elements.secretWordDisplay.textContent = 'You must figure out the secret word!';
    } else {
        elements.playerRole.textContent = '🔍 You are a PLAYER';
        elements.playerRole.className = 'role-display player';
        elements.secretWordDisplay.textContent = `Secret word: ${data.secretWord}`;
        
        // Highlight the secret word in the grid
        const words = document.querySelectorAll('.topic-word');
        words.forEach(word => {
            if (word.textContent === data.secretWord) {
                word.classList.add('highlight');
            }
        });
    }
});

socket.on('cluePhaseStarted', (data) => {
    elements.statusMessage.textContent = `${data.currentPlayer === socket.id ? 'Your turn!' : 'Waiting for clue...'}`;
    updateTimer(data.timeLimit);
    
    if (data.currentPlayer === socket.id) {
        elements.clueInput.classList.remove('hidden');
        elements.clueText.focus();
    }
    
    // Hide other elements
    elements.discussionControls.classList.add('hidden');
    elements.votingArea.classList.add('hidden');
});

socket.on('nextPlayerTurn', (data) => {
    elements.statusMessage.textContent = `${data.currentPlayer === socket.id ? 'Your turn!' : 'Waiting for clue...'}`;
    updateTimer(data.timeLimit);
    
    if (data.currentPlayer === socket.id) {
        elements.clueInput.classList.remove('hidden');
        elements.clueText.focus();
    }
});

socket.on('clueSubmitted', (data) => {
    const clueDiv = document.createElement('div');
    clueDiv.className = 'clue-item';
    clueDiv.innerHTML = `
        <span class="clue-player">${data.playerName}:</span>
        <span class="clue-text">${data.clue}</span>
    `;
    elements.cluesList.appendChild(clueDiv);
});

socket.on('discussionStarted', (data) => {
    elements.statusMessage.textContent = 'Discussion time! Who is the Chameleon?';
    elements.discussionControls.classList.remove('hidden');
    updateTimer(data.timeLimit);
});

socket.on('additionalClueRound', () => {
    elements.statusMessage.textContent = 'Tie vote! Additional clue round starting...';
    elements.cluesList.innerHTML = '';
});

socket.on('votingStarted', () => {
    elements.statusMessage.textContent = 'Time to vote! Who is the Chameleon?';
    elements.discussionControls.classList.add('hidden');
    elements.votingArea.classList.remove('hidden');
    
    // Create voting options
    elements.votingOptions.innerHTML = '';
    
    gameState.players.forEach(player => {
        const button = document.createElement('div');
        button.className = 'vote-option';
        button.textContent = player.name;
        button.dataset.vote = player.id;
        button.addEventListener('click', () => submitVote(player.id));
        elements.votingOptions.appendChild(button);
    });
    
    // Add "Nobody" option
    const nobodyButton = document.createElement('div');
    nobodyButton.className = 'vote-option';
    nobodyButton.textContent = 'Nobody (Skip to additional clues)';
    nobodyButton.dataset.vote = 'nobody';
    nobodyButton.addEventListener('click', () => submitVote('nobody'));
    elements.votingOptions.appendChild(nobodyButton);
    
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    elements.timer.textContent = '';
});

socket.on('voteSubmitted', (data) => {
    const voteDiv = document.createElement('div');
    voteDiv.className = 'vote-result';
    voteDiv.innerHTML = `
        <span>${data.playerName}</span>
        <span>voted for: ${data.vote}</span>
    `;
    elements.votesList.appendChild(voteDiv);
});

socket.on('votingResult', (data) => {
    elements.votingArea.classList.add('hidden');
    
    if (data.type === 'chameleonCaught') {
        elements.statusMessage.textContent = 'Chameleon caught! Waiting for their guess...';
        
        if (gameState.currentRole === 'chameleon') {
            elements.chameleonGuess.classList.remove('hidden');
            elements.guessText.focus();
        }
    } else if (data.type === 'wrongAccusation') {
        showGameResult(false, `Wrong! ${data.accused} was not the Chameleon. The Chameleon escaped!`);
    } else if (data.type === 'chameleonEscaped') {
        showGameResult(false, 'The Chameleon escaped! No one was caught.');
    }
});

socket.on('chameleonGuessResult', (data) => {
    const message = data.correct ? 
        `${data.chameleonName} guessed "${data.guess}" and won!` :
        `${data.chameleonName} guessed "${data.guess}" but the word was "${data.secretWord}". Players win!`;
    
    const playerWon = gameState.currentRole === 'chameleon' ? data.correct : !data.correct;
    showGameResult(playerWon, message);
});

socket.on('chameleonLeft', () => {
    showError('The Chameleon has left the chat! Game ended.');
    setTimeout(() => {
        showScreen('lobby');
    }, 3000);
});

socket.on('clueTimerEnded', (data) => {
    if (data.nextPlayer === socket.id) {
        elements.clueInput.classList.remove('hidden');
        elements.clueText.focus();
    }
});

socket.on('error', (data) => {
    showError(data.message);
});

// Helper functions
function updatePlayersDisplay() {
    elements.playerCount.textContent = gameState.players.length;
    elements.playersList.innerHTML = '';
    
    gameState.players.forEach(player => {
        const div = document.createElement('div');
        div.className = `player-item ${player.id === gameState.players.find(p => gameState.isHost && p.id === socket.id) ? 'host' : ''}`;
        div.textContent = player.name;
        elements.playersList.appendChild(div);
    });
    
    // Show/hide start button based on host status and player count
    if (gameState.isHost) {
        elements.startGameBtn.classList.remove('hidden');
        elements.waitingMessage.classList.add('hidden');
        elements.startGameBtn.disabled = gameState.players.length < 3;
    } else {
        elements.startGameBtn.classList.add('hidden');
        elements.waitingMessage.classList.remove('hidden');
    }
}

function showGameResult(won, message) {
    elements.resultMessage.innerHTML = `
        <div class="result-message ${won ? 'result-win' : 'result-lose'}">
            ${won ? '🎉 You Won!' : '😔 You Lost!'}
        </div>
        <p>${message}</p>
    `;
    elements.gameResult.classList.remove('hidden');
    
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
}

// Auto-uppercase room codes
elements.roomCode.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// Prevent multiple word clues
elements.clueText.addEventListener('input', (e) => {
    const words = e.target.value.trim().split(/\s+/);
    if (words.length > 1) {
        e.target.value = words[0];
        showError('Only one word allowed for clues!');
    }
});

// Initialize
showScreen('welcome');
