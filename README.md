# 🦎 The Chameleon Game

A web-based implementation of the popular board game "The Chameleon" - a social deduction game where players try to identify the hidden Chameleon while the Chameleon attempts to blend in and guess the secret word.

## 🎮 Game Features

- **Real-time multiplayer**: 3-8 players can join a room
- **Mobile-friendly**: Optimized for phone play in portrait mode
- **Timer system**: 1 minute per clue, 5 minutes discussion
- **Room codes**: 4-letter room codes for easy joining
- **Host controls**: Only room host can start games
- **Auto-reconnection**: Game state persists on page refresh
- **Multiple rounds**: Play as many rounds as you want

## 🎯 How to Play

1. **Setup**: One player creates a room, others join with the room code
2. **Roles**: One player is secretly the Chameleon, others are regular players
3. **Topic**: Everyone sees a card with 16 related words
4. **Secret Word**: Dice determine which word is secret (Chameleon doesn't know)
5. **Clues**: Each player gives one word clue related to the secret word
6. **Discussion**: 5 minutes to debate who the Chameleon is
7. **Voting**: Vote for who you think is the Chameleon
8. **Chameleon's Chance**: If caught, Chameleon can guess the secret word to win

## 🚀 Deployment on Vercel

### Prerequisites
- Node.js 16+ installed locally
- A Vercel account

### Quick Deploy

1. **Clone/Download** all the files to your local machine:
   ```
   chameleon-game/
   ├── package.json
   ├── vercel.json
   ├── server.js
   ├── README.md
   └── public/
       ├── index.html
       ├── style.css
       └── script.js
   ```

2. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

3. **Deploy to Vercel**:
   ```bash
   cd chameleon-game
   vercel
   ```

4. **Follow the prompts**:
   - Login to your Vercel account
   - Set up and deploy the project
   - Choose your deployment settings

### Alternative: Deploy via Vercel Website

1. **Create a new repository** on GitHub with all the files
2. **Go to [vercel.com](https://vercel.com)** and sign in
3. **Import your repository**
4. **Deploy** - Vercel will automatically detect it's a Node.js project

### Environment Setup

The game will work out of the box with no additional environment variables needed.

## 📱 Usage

1. **Visit your deployed URL**
2. **Enter your name** and create or join a room
3. **Wait for 3+ players** to join
4. **Host starts the game**
5. **Follow the game prompts** to play!

## 🎨 Topic Cards Included

The game comes with 10 pre-made topic cards:
- 🍕 **FOOD**: Pizza, Sushi, Pasta, Tacos...
- 🦁 **ANIMALS**: Lion, Eagle, Shark, Tiger...
- 🎬 **MOVIES**: Action, Comedy, Drama, Horror...
- ⚽ **SPORTS**: Soccer, Basketball, Tennis, Golf...
- 🌈 **COLORS**: Red, Blue, Green, Yellow...
- 🌍 **COUNTRIES**: USA, China, India, Brazil...
- 👨‍⚕️ **JOBS**: Doctor, Teacher, Engineer, Artist...
- ☀️ **WEATHER**: Sunny, Rainy, Cloudy, Snowy...
- 🚗 **TRANSPORT**: Car, Bus, Train, Plane...
- 📱 **TECHNOLOGY**: Phone, Computer, Internet, Robot...

## 🔧 Game Rules Implementation

- **Dice System**: Uses d6 (yellow) and d8 (blue) like the original game
- **Coordinate Mapping**: Proper 4x4 grid mapping for topic cards
- **Timer Controls**: Automatic progression with manual override options
- **Voting System**: Majority vote with tie-breaking via additional clue rounds
- **Host Management**: Auto-assigns new host if current host leaves
- **Chameleon Disconnection**: Game ends with notification if Chameleon leaves

## 🎲 Technical Details

- **Backend**: Node.js with Express and Socket.IO
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Real-time Communication**: WebSocket connections
- **Mobile Responsive**: CSS Grid and Flexbox layouts
- **State Management**: Server-side game state with client synchronization

## 🐛 Troubleshooting

**Connection Issues:**
- Check your internet connection
- Try refreshing the page
- Ensure WebSocket connections aren't blocked

**Game Not Starting:**
- Ensure minimum 3 players are in the room
- Only the room host (👑) can start games
- Check that all players have stable connections

**Mobile Issues:**
- Use in portrait mode for best experience
- Ensure your browser supports modern JavaScript features
- Clear browser cache if experiencing issues

## 🤝 Contributing

This is a complete implementation ready for deployment. Feel free to modify the topic cards in `server.js` or customize the styling in `public/style.css`.

## 📄 License

This project is a fan-made implementation of The Chameleon board game for educational and entertainment purposes. The original game is published by Big Potato Games.

---

**Enjoy playing The Chameleon! 🦎**
