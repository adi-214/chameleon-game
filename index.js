const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage (will reset when server restarts)
let rooms = new Map();
let playerSockets = new Map();

const topicCards = [
  {
    title: "FOOD",
    words: [
      ["Pizza", "Sushi", "Pasta", "Tacos"],
      ["Burger", "Salad", "Soup", "Rice"], 
      ["Bread", "Cheese", "Fish", "Meat"],
      ["Fruit", "Cake", "Coffee", "Wine"]
    ]
  },
  {
    title: "ANIMALS",
    words: [
      ["Lion", "Eagle", "Shark", "Tiger"],
      ["Bear", "Wolf", "Fox", "Cat"],
      ["Dog", "Horse", "Cow", "Pig"],
      ["Fish", "Bird", "Snake", "Frog"]
    ]
  },
  {
    title: "MOVIES",
    words: [
      ["Action", "Comedy", "Drama", "Horror"],
      ["Romance", "Sci-Fi", "Fantasy", "Thriller"],
      ["Mystery", "Musical", "Western", "Crime"],
      ["War", "Family", "Documentary", "Animation"]
    ]
  },
  {
    title: "SPORTS",
    words: [
      ["Soccer", "Basketball", "Tennis", "Golf"],
      ["Baseball", "Football", "Hockey", "Boxing"],
      ["Swimming", "Running", "Cycling", "Skiing"],
      ["Volleyball", "Cricket", "Rugby", "Badminton"]
    ]
  },
  {
    title: "COLORS",
    words: [
      ["Red", "Blue", "Green", "Yellow"],
      ["Purple", "Orange", "Pink", "Brown"],
      ["Black", "White", "Gray", "Gold"],
      ["Silver", "Cyan", "Magenta", "Lime"]
    ]
  }
];

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function getSecretWord(topicIndex, yellowDie, blueDie) {
  const coordMap = {
    '1,1': [0,0], '1,2': [0,1], '1,3': [0,2], '1,4': [0,3],
    '1,5': [1,0], '1,6': [1,1], '1,7': [1,2], '1,8': [1,3],
    '2,1': [2,0], '2,2': [2,1], '2,3': [2,2], '2,4': [2,3],
    '2,5': [3,0], '2,6': [3,1], '2,7': [3,2], '2,8': [3,3],
    '3,1': [0,0], '3,2': [0,1], '3,3': [0,2], '3,4': [0,3],
    '3,5': [1,0], '3,6': [1,1], '3,7': [1,2], '3,8': [1,3],
    '4,1': [2,0], '4,2': [2,1], '4,3': [2,2], '4,4': [2,3],
    '4,5': [3,0], '4,6': [3,1], '4,7': [3,2], '4,8': [3,3],
    '5,1': [0,0], '5,2': [0,1], '5,3': [0,2], '5,4': [0,3],
    '5,5': [1,0], '5,6': [1,1], '5,7': [1,2], '5,8': [1,3],
    '6,1': [2,0], '6,2': [2,1], '6,3': [2,2], '6,4': [2,3],
    '6,5': [3,0], '6,6': [3,1], '6,7': [3,2], '6,8': [3,3]
  };
  
  const key = `${yellowDie},${blueDie}`;
  const [row, col] = coordMap[key];
  return topicCards[topicIndex].words[row][col];
}

// API Routes
app.post('/api/create-room', (req, res) => {
  const { playerName } = req.body;
  
  if (!playerName || playerName.trim() === '') {
    return res.status(400).json({ error: 'Player name is required' });
  }
  
  const roomCode = generateRoomCode();
  const playerId = Date.now().toString() + Math.random().toString(36).substring(2);
  
  const room = {
    code: roomCode,
    host: playerId,
    players: new Map(),
    gameState: 'waiting',
    currentTopic: null,
    secretWord: null,
    chameleonId: null,
    diceRoll: null,
    clues: new Map(),
    votes: new Map(),
    currentClueIndex: 0,
    lastActivity: Date.now()
  };
  
  room.players.set(playerId, {
    id: playerId,
    name: playerName.trim(),
    role: null,
    lastSeen: Date.now()
  });
  
  rooms.set(roomCode, room);
  
  res.json({ 
    roomCode,
    playerId,
    players: Array.from(room.players.values()),
    isHost: true 
  });
});

app.post('/api/join-room', (req, res) => {
  const { roomCode, playerName } = req.body;
  
  if (!roomCode || !playerName) {
    return res.status(400).json({ error: 'Room code and player name are required' });
  }
  
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  if (room.players.size >= 8) {
    return res.status(400).json({ error: 'Room is full' });
  }
  
  if (room.gameState !== 'waiting') {
    return res.status(400).json({ error: 'Game is already in progress' });
  }
  
  const playerId = Date.now().toString() + Math.random().toString(36).substring(2);
  
  room.players.set(playerId, {
    id: playerId,
    name: playerName.trim(),
    role: null,
    lastSeen: Date.now()
  });
  
  room.lastActivity = Date.now();
  
  res.json({ 
    roomCode: room.code,
    playerId,
    players: Array.from(room.players.values()),
    isHost: room.host === playerId
  });
});

app.get('/api/room/:roomCode', (req, res) => {
  const { roomCode } = req.params;
  const { playerId } = req.query;
  
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  // Update player's last seen
  if (playerId && room.players.has(playerId)) {
    room.players.get(playerId).lastSeen = Date.now();
  }
  
  res.json({
    code: room.code,
    players: Array.from(room.players.values()),
    gameState: room.gameState,
    isHost: room.host === playerId,
    currentTopic: room.currentTopic !== null ? topicCards[room.currentTopic] : null,
    diceRoll: room.diceRoll,
    secretWord: room.gameState === 'playing' && room.players.get(playerId)?.role === 'player' ? room.secretWord : null,
    role: room.players.get(playerId)?.role,
    clues: Array.from(room.clues.entries()).map(([pid, clue]) => ({
      playerId: pid,
      playerName: room.players.get(pid)?.name,
      clue
    })),
    votes: Array.from(room.votes.entries()).map(([pid, vote]) => ({
      playerId: pid,
      playerName: room.players.get(pid)?.name,
      vote: vote === 'nobody' ? 'Nobody' : room.players.get(vote)?.name || 'Unknown'
    })),
    currentClueIndex: room.currentClueIndex,
    chameleonId: room.chameleonId
  });
});

app.post('/api/start-game', (req, res) => {
  const { roomCode, playerId } = req.body;
  
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  if (room.host !== playerId) {
    return res.status(403).json({ error: 'Only host can start the game' });
  }
  
  if (room.players.size < 3) {
    return res.status(400).json({ error: 'Need at least 3 players' });
  }
  
  // Initialize game
  const playerIds = Array.from(room.players.keys());
  const chameleonIndex = Math.floor(Math.random() * playerIds.length);
  const chameleonId = playerIds[chameleonIndex];
  
  const topicIndex = Math.floor(Math.random() * topicCards.length);
  const yellowDie = Math.floor(Math.random() * 6) + 1;
  const blueDie = Math.floor(Math.random() * 8) + 1;
  
  room.gameState = 'clueGiving';
  room.currentTopic = topicIndex;
  room.chameleonId = chameleonId;
  room.diceRoll = { yellow: yellowDie, blue: blueDie };
  room.secretWord = getSecretWord(topicIndex, yellowDie, blueDie);
  room.clues.clear();
  room.votes.clear();
  room.currentClueIndex = 0;
  room.lastActivity = Date.now();
  
  // Set roles
  room.players.forEach((player, id) => {
    player.role = id === chameleonId ? 'chameleon' : 'player';
  });
  
  res.json({ success: true });
});

app.post('/api/submit-clue', (req, res) => {
  const { roomCode, playerId, clue } = req.body;
  
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  if (room.gameState !== 'clueGiving') {
    return res.status(400).json({ error: 'Not in clue giving phase' });
  }
  
  const playerIds = Array.from(room.players.keys());
  if (playerIds[room.currentClueIndex] !== playerId) {
    return res.status(400).json({ error: 'Not your turn' });
  }
  
  room.clues.set(playerId, clue.trim());
  room.currentClueIndex++;
  room.lastActivity = Date.now();
  
  if (room.currentClueIndex >= playerIds.length) {
    room.gameState = 'discussion';
  }
  
  res.json({ success: true });
});

app.post('/api/end-discussion', (req, res) => {
  const { roomCode, playerId } = req.body;
  
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  if (room.gameState !== 'discussion') {
    return res.status(400).json({ error: 'Not in discussion phase' });
  }
  
  room.gameState = 'voting';
  room.votes.clear();
  room.lastActivity = Date.now();
  
  res.json({ success: true });
});

app.post('/api/submit-vote', (req, res) => {
  const { roomCode, playerId, vote } = req.body;
  
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  if (room.gameState !== 'voting') {
    return res.status(400).json({ error: 'Not in voting phase' });
  }
  
  room.votes.set(playerId, vote);
  room.lastActivity = Date.now();
  
  // Check if all players have voted
  if (room.votes.size === room.players.size) {
    const voteCounts = new Map();
    const playerIds = Array.from(room.players.keys());
    
    playerIds.forEach(id => voteCounts.set(id, 0));
    voteCounts.set('nobody', 0);
    
    room.votes.forEach(vote => {
      voteCounts.set(vote, voteCounts.get(vote) + 1);
    });
    
    let maxVotes = 0;
    let winners = [];
    
    voteCounts.forEach((count, candidate) => {
      if (count > maxVotes) {
        maxVotes = count;
        winners = [candidate];
      } else if (count === maxVotes && count > 0) {
        winners.push(candidate);
      }
    });
    
    if (winners.length > 1 || winners[0] === 'nobody') {
      room.gameState = 'chameleonEscaped';
    } else {
      const accused = winners[0];
      if (accused === room.chameleonId) {
        room.gameState = 'chameleonGuess';
      } else {
        room.gameState = 'wrongAccusation';
      }
    }
  }
  
  res.json({ success: true });
});

app.post('/api/chameleon-guess', (req, res) => {
  const { roomCode, playerId, guess } = req.body;
  
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  if (room.gameState !== 'chameleonGuess' || room.chameleonId !== playerId) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  
  const correct = guess.toLowerCase() === room.secretWord.toLowerCase();
  room.gameState = correct ? 'chameleonWins' : 'playersWin';
  room.lastActivity = Date.now();
  
  res.json({ 
    success: true,
    correct,
    secretWord: room.secretWord
  });
});

app.post('/api/reset-game', (req, res) => {
  const { roomCode, playerId } = req.body;
  
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  if (room.host !== playerId) {
    return res.status(403).json({ error: 'Only host can reset the game' });
  }
  
  room.gameState = 'waiting';
  room.currentTopic = null;
  room.secretWord = null;
  room.chameleonId = null;
  room.diceRoll = null;
  room.clues.clear();
  room.votes.clear();
  room.currentClueIndex = 0;
  room.lastActivity = Date.now();
  
  // Reset player roles
  room.players.forEach((player) => {
    player.role = null;
  });
  
  res.json({ success: true });
});

// Clean up old rooms every 5 minutes
setInterval(() => {
  const now = Date.now();
  const ROOM_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  for (const [roomCode, room] of rooms.entries()) {
    if (now - room.lastActivity > ROOM_TIMEOUT) {
      rooms.delete(roomCode);
      console.log(`Cleaned up room ${roomCode}`);
    }
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
