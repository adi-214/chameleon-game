const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static('public'));

// Game state
const rooms = new Map();
const playerSockets = new Map(); // socketId -> {roomCode, playerId}

// Topic cards with 16 words each
const topicCards = [
  {
    title: "FOOD",
    words: [
      "Pizza", "Sushi", "Pasta", "Tacos",
      "Burger", "Salad", "Soup", "Rice",
      "Bread", "Cheese", "Fish", "Meat",
      "Fruit", "Cake", "Coffee", "Wine"
    ]
  },
  {
    title: "ANIMALS",
    words: [
      "Lion", "Eagle", "Shark", "Tiger",
      "Bear", "Wolf", "Fox", "Cat",
      "Dog", "Horse", "Cow", "Pig",
      "Fish", "Bird", "Snake", "Frog"
    ]
  },
  {
    title: "MOVIES",
    words: [
      "Action", "Comedy", "Drama", "Horror",
      "Romance", "Sci-Fi", "Fantasy", "Thriller",
      "Mystery", "Musical", "Western", "Crime",
      "War", "Family", "Documentary", "Animation"
    ]
  },
  {
    title: "SPORTS",
    words: [
      "Soccer", "Basketball", "Tennis", "Golf",
      "Baseball", "Football", "Hockey", "Boxing",
      "Swimming", "Running", "Cycling", "Skiing",
      "Volleyball", "Cricket", "Rugby", "Badminton"
    ]
  },
  {
    title: "COLORS",
    words: [
      "Red", "Blue", "Green", "Yellow",
      "Purple", "Orange", "Pink", "Brown",
      "Black", "White", "Gray", "Gold",
      "Silver", "Cyan", "Magenta", "Lime"
    ]
  },
  {
    title: "COUNTRIES",
    words: [
      "USA", "China", "India", "Brazil",
      "Russia", "Japan", "Germany", "France",
      "UK", "Italy", "Spain", "Canada",
      "Australia", "Mexico", "Argentina", "Egypt"
    ]
  },
  {
    title: "JOBS",
    words: [
      "Doctor", "Teacher", "Engineer", "Artist",
      "Chef", "Pilot", "Nurse", "Police",
      "Lawyer", "Farmer", "Actor", "Writer",
      "Musician", "Designer", "Scientist", "Driver"
    ]
  },
  {
    title: "WEATHER",
    words: [
      "Sunny", "Rainy", "Cloudy", "Snowy",
      "Windy", "Stormy", "Foggy", "Hot",
      "Cold", "Warm", "Cool", "Humid",
      "Dry", "Freezing", "Thunder", "Rainbow"
    ]
  },
  {
    title: "TRANSPORT",
    words: [
      "Car", "Bus", "Train", "Plane",
      "Ship", "Bike", "Taxi", "Truck",
      "Boat", "Subway", "Helicopter", "Scooter",
      "Ferry", "Rocket", "Balloon", "Skateboard"
    ]
  },
  {
    title: "TECHNOLOGY",
    words: [
      "Phone", "Computer", "Internet", "Robot",
      "AI", "Game", "App", "Website",
      "Email", "Video", "Music", "Photo",
      "Cloud", "Code", "Data", "Software"
    ]
  }
];

// Coordinate mapping for d6 (yellow) x d8 (blue)
const coordinateMap = {
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

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function createRoom(hostId, hostName) {
  const roomCode = generateRoomCode();
  const room = {
    code: roomCode,
    host: hostId,
    players: new Map(),
    gameState: 'waiting', // waiting, playing, clueGiving, discussion, voting, chameleonGuess
    currentTopic: null,
    secretWord: null,
    chameleonId: null,
    diceRoll: null,
    clues: new Map(),
    votes: new Map(),
    currentClueIndex: 0,
    clueTimer: null,
    discussionTimer: null,
    additionalClueRound: false
  };
  
  room.players.set(hostId, {
    id: hostId,
    name: hostName,
    role: null,
    connected: true
  });
  
  rooms.set(roomCode, room);
  return room;
}

function getSecretWord(topicIndex, yellowDie, blueDie) {
  const key = `${yellowDie},${blueDie}`;
  const [row, col] = coordinateMap[key];
  return topicCards[topicIndex].words[row * 4 + col];
}

function startGame(room) {
  if (room.players.size < 3) return false;
  
  const playerIds = Array.from(room.players.keys());
  const chameleonIndex = Math.floor(Math.random() * playerIds.length);
  const chameleonId = playerIds[chameleonIndex];
  
  const topicIndex = Math.floor(Math.random() * topicCards.length);
  const yellowDie = Math.floor(Math.random() * 6) + 1;
  const blueDie = Math.floor(Math.random() * 8) + 1;
  
  room.gameState = 'playing';
  room.currentTopic = topicIndex;
  room.chameleonId = chameleonId;
  room.diceRoll = { yellow: yellowDie, blue: blueDie };
  room.secretWord = getSecretWord(topicIndex, yellowDie, blueDie);
  room.clues.clear();
  room.votes.clear();
  room.currentClueIndex = 0;
  room.additionalClueRound = false;
  
  // Set roles
  room.players.forEach((player, id) => {
    player.role = id === chameleonId ? 'chameleon' : 'player';
  });
  
  return true;
}

function nextClueGivingPhase(room) {
  room.gameState = 'clueGiving';
  room.currentClueIndex = 0;
  room.clues.clear();
  
  // Start clue timer for first player
  const playerIds = Array.from(room.players.keys());
  startClueTimer(room, playerIds[0]);
}

function startClueTimer(room, playerId) {
  if (room.clueTimer) clearTimeout(room.clueTimer);
  
  room.clueTimer = setTimeout(() => {
    // Auto-skip if no clue given
    const playerIds = Array.from(room.players.keys());
    room.currentClueIndex++;
    
    if (room.currentClueIndex < playerIds.length) {
      startClueTimer(room, playerIds[room.currentClueIndex]);
      io.to(room.code).emit('clueTimerEnded', { nextPlayer: playerIds[room.currentClueIndex] });
    } else {
      startDiscussionPhase(room);
    }
  }, 60000); // 1 minute
}

function startDiscussionPhase(room) {
  if (room.clueTimer) clearTimeout(room.clueTimer);
  room.gameState = 'discussion';
  
  room.discussionTimer = setTimeout(() => {
    startVotingPhase(room);
  }, 300000); // 5 minutes
}

function startVotingPhase(room) {
  if (room.discussionTimer) clearTimeout(room.discussionTimer);
  room.gameState = 'voting';
  room.votes.clear();
}

function processVotes(room) {
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
  
  // If tie or nobody voted, start additional clue round
  if (winners.length > 1 || winners[0] === 'nobody') {
    if (!room.additionalClueRound) {
      room.additionalClueRound = true;
      nextClueGivingPhase(room);
      return { type: 'additionalClues' };
    } else {
      // Chameleon wins after additional round
      return { type: 'chameleonEscaped' };
    }
  }
  
  const accused = winners[0];
  
  if (accused === room.chameleonId) {
    room.gameState = 'chameleonGuess';
    return { type: 'chameleonCaught', chameleonId: accused };
  } else {
    return { type: 'wrongAccusation', accused, chameleonId: room.chameleonId };
  }
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('createRoom', ({ playerName }) => {
    const room = createRoom(socket.id, playerName);
    playerSockets.set(socket.id, { roomCode: room.code, playerId: socket.id });
    socket.join(room.code);
    
    socket.emit('roomCreated', { 
      roomCode: room.code, 
      players: Array.from(room.players.values()),
      isHost: true 
    });
  });
  
  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const room = rooms.get(roomCode.toUpperCase());
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (room.players.size >= 8) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }
    
    if (room.gameState !== 'waiting') {
      socket.emit('error', { message: 'Game is already in progress' });
      return;
    }
    
    room.players.set(socket.id, {
      id: socket.id,
      name: playerName,
      role: null,
      connected: true
    });
    
    playerSockets.set(socket.id, { roomCode: room.code, playerId: socket.id });
    socket.join(room.code);
    
    io.to(room.code).emit('playerJoined', { 
      players: Array.from(room.players.values()),
      isHost: room.host === socket.id
    });
  });
  
  socket.on('startGame', () => {
    const playerInfo = playerSockets.get(socket.id);
    if (!playerInfo) return;
    
    const room = rooms.get(playerInfo.roomCode);
    if (!room || room.host !== socket.id) return;
    
    if (startGame(room)) {
      io.to(room.code).emit('gameStarted', {
        topic: topicCards[room.currentTopic],
        diceRoll: room.diceRoll
      });
      
      // Send role information
      room.players.forEach((player, id) => {
        const playerSocket = io.sockets.sockets.get(id);
        if (playerSocket) {
          playerSocket.emit('roleAssigned', { 
            role: player.role,
            secretWord: player.role === 'chameleon' ? null : room.secretWord
          });
        }
      });
      
      nextClueGivingPhase(room);
      const playerIds = Array.from(room.players.keys());
      io.to(room.code).emit('cluePhaseStarted', { 
        currentPlayer: playerIds[0],
        timeLimit: 60
      });
    }
  });
  
  socket.on('submitClue', ({ clue }) => {
    const playerInfo = playerSockets.get(socket.id);
    if (!playerInfo) return;
    
    const room = rooms.get(playerInfo.roomCode);
    if (!room || room.gameState !== 'clueGiving') return;
    
    const playerIds = Array.from(room.players.keys());
    if (playerIds[room.currentClueIndex] !== socket.id) return;
    
    room.clues.set(socket.id, clue);
    
    if (room.clueTimer) clearTimeout(room.clueTimer);
    
    room.currentClueIndex++;
    
    io.to(room.code).emit('clueSubmitted', { 
      playerId: socket.id, 
      playerName: room.players.get(socket.id).name,
      clue 
    });
    
    if (room.currentClueIndex < playerIds.length) {
      startClueTimer(room, playerIds[room.currentClueIndex]);
      io.to(room.code).emit('nextPlayerTurn', { 
        currentPlayer: playerIds[room.currentClueIndex],
        timeLimit: 60
      });
    } else {
      startDiscussionPhase(room);
      io.to(room.code).emit('discussionStarted', { timeLimit: 300 });
    }
  });
  
  socket.on('submitVote', ({ vote }) => {
    const playerInfo = playerSockets.get(socket.id);
    if (!playerInfo) return;
    
    const room = rooms.get(playerInfo.roomCode);
    if (!room || room.gameState !== 'voting') return;
    
    room.votes.set(socket.id, vote);
    
    io.to(room.code).emit('voteSubmitted', { 
      playerId: socket.id,
      playerName: room.players.get(socket.id).name,
      vote: vote === 'nobody' ? 'Nobody' : room.players.get(vote)?.name || 'Unknown'
    });
    
    if (room.votes.size === room.players.size) {
      const result = processVotes(room);
      
      if (result.type === 'additionalClues') {
        io.to(room.code).emit('additionalClueRound');
        const playerIds = Array.from(room.players.keys());
        io.to(room.code).emit('cluePhaseStarted', { 
          currentPlayer: playerIds[0],
          timeLimit: 60
        });
      } else {
        io.to(room.code).emit('votingResult', result);
        
        if (result.type === 'chameleonCaught') {
          // Wait for chameleon's guess
        } else {
          // Game over
          room.gameState = 'waiting';
        }
      }
    }
  });
  
  socket.on('chameleonGuess', ({ guess }) => {
    const playerInfo = playerSockets.get(socket.id);
    if (!playerInfo) return;
    
    const room = rooms.get(playerInfo.roomCode);
    if (!room || room.gameState !== 'chameleonGuess' || room.chameleonId !== socket.id) return;
    
    const correct = guess.toLowerCase() === room.secretWord.toLowerCase();
    
    io.to(room.code).emit('chameleonGuessResult', {
      guess,
      correct,
      secretWord: room.secretWord,
      chameleonName: room.players.get(socket.id).name
    });
    
    room.gameState = 'waiting';
  });
  
  socket.on('endDiscussion', () => {
    const playerInfo = playerSockets.get(socket.id);
    if (!playerInfo) return;
    
    const room = rooms.get(playerInfo.roomCode);
    if (!room || room.gameState !== 'discussion') return;
    
    startVotingPhase(room);
    io.to(room.code).emit('votingStarted');
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const playerInfo = playerSockets.get(socket.id);
    if (!playerInfo) return;
    
    const room = rooms.get(playerInfo.roomCode);
    if (!room) return;
    
    // If chameleon disconnects during game
    if (room.gameState !== 'waiting' && room.chameleonId === socket.id) {
      io.to(room.code).emit('chameleonLeft');
      room.gameState = 'waiting';
    }
    
    room.players.delete(socket.id);
    
    // If host left, assign new host
    if (room.host === socket.id && room.players.size > 0) {
      room.host = Array.from(room.players.keys())[0];
    }
    
    if (room.players.size === 0) {
      rooms.delete(room.code);
    } else {
      io.to(room.code).emit('playerLeft', { 
        players: Array.from(room.players.values()),
        newHost: room.host
      });
    }
    
    playerSockets.delete(socket.id);
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
