// Importy
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { sequelize, Lobby, User, Question } from './models.js';
import crypto from 'crypto';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Lub adres klienta
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.json());

// Pomocnicza funkcja do generowania unikalnych kodów lobby
function generateLobbyCode() {
    return crypto.randomInt(100000, 999999).toString();
}

// Mapowanie socketów do użytkowników
const userSockets = new Map();

// Obsługa WebSocket
io.on('connection', (socket) => {
    console.log('Użytkownik połączony:', socket.id);

    // Tworzenie lobby
    socket.on('createLobby', async ({ hostName }) => {
        const code = generateLobbyCode();

        try {
            const lobby = await Lobby.create({
                code,
                host: hostName,
            });
            socket.join(code);
            console.log("createLobby:succes")
            socket.emit('lobbyCreated', { success: true, code });
            //callback({ success: true, code });
        } catch (err) {
            console.log("createLobby:error")
            console.error(err);
            //callback({ success: false, error: 'Nie udało się utworzyć lobby.' });
        }
    });

    // Dołączanie do lobby
    socket.on('joinLobby', async ({ userName, lobbyCode }, callback) => {
        try {
            const lobby = await Lobby.findOne({ where: { code: lobbyCode } });
            if (!lobby) {
                return callback({ success: false, error: 'Lobby nie istnieje.' });
            }

            const user = await User.create({
                name: userName,
                lobbycode: lobbyCode,
                correctanswers: 0,
                lives: 3,
            });

            socket.join(lobbyCode);
            userSockets.set(socket.id, user.id);
            io.to(lobbyCode).emit('playerJoined', { userName });
            callback({ success: true });
        } catch (err) {
            console.error(err);
            callback({ success: false, error: 'Nie udało się dołączyć do lobby.' });
        }
    });

    // Rozpoczęcie gry przez hosta
    socket.on('startGame', async ({ lobbyCode }, callback) => {
        try {
            // Pobranie wszystkich graczy w lobby
            const players = await User.findAll({ where: { lobbycode: lobbyCode } });
            if (players.length === 0) {
                callback({ success: false, error: 'Brak graczy w lobby.' });
                return;
            }
    
            // Wylosowanie gracza
            const randomPlayer = players[Math.floor(Math.random() * players.length)];
    
            // Wylosowanie pytania
            const questions = await Question.findAll();
            if (questions.length === 0) {
                callback({ success: false, error: 'Brak pytań w bazie danych.' });
                return;
            }
            const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    
            // Przygotowanie danych dla hosta
            const hostData = {
                question: randomQuestion.question,
                correctAnswer: randomQuestion.correctanswer,
            };
    
            // Przygotowanie danych dla gracza
            const playerData = {
                answers: [
                    randomQuestion.answerA,
                    randomQuestion.answerB,
                    randomQuestion.answerC,
                    randomQuestion.answerD,
                ],
            };
    
            // Wysłanie danych do hosta
            const host = players.find(player => player.id === randomPlayer.host);
            if (host) {
                io.to(userSockets.get(host.id)).emit('gameStartedHost', hostData);
            }
    
            // Wysłanie danych do wybranego gracza
            io.to(userSockets.get(randomPlayer.id)).emit('gameStartedPlayer', playerData);
    
            callback({ success: true });
        } catch (err) {
            console.error(err);
            callback({ success: false, error: 'Nie udało się rozpocząć gry.' });
        }
    });
    

    // Wybór gracza przez gracza
    socket.on('choosePlayer', async ({ lobbyCode, chosenPlayerId }, callback) => {
        try {
            // Pobranie wybranego gracza
            const chosenPlayer = await User.findByPk(chosenPlayerId);
            if (!chosenPlayer || chosenPlayer.lobbycode !== lobbyCode) {
                callback({ success: false, error: 'Wybrany gracz nie istnieje w tym lobby.' });
                return;
            }
    
            // Wylosowanie pytania
            const questions = await Question.findAll();
            if (questions.length === 0) {
                callback({ success: false, error: 'Brak pytań w bazie danych.' });
                return;
            }
            const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    
            // Przygotowanie danych dla hosta
            const hostData = {
                question: randomQuestion.question,
                correctAnswer: randomQuestion.correctanswer,
            };
    
            // Przygotowanie danych dla gracza
            const playerData = {
                answers: [
                    randomQuestion.answerA,
                    randomQuestion.answerB,
                    randomQuestion.answerC,
                    randomQuestion.answerD,
                ],
            };
    
            // Wysłanie danych do hosta
            const host = await User.findOne({ where: { lobbycode: lobbyCode, id: chosenPlayer.host } });
            if (host) {
                io.to(userSockets.get(host.id)).emit('questionForHost', hostData);
            }
            
            // Wysłanie informacji o aktualnie odpowiadającym graczu do reszty graczy
            socket.broadcast.to(lobbyCode).emit('currentAnsweringPlayer', { answeringPlayerName });

            // Wysłanie danych do wybranego gracza
            io.to(userSockets.get(chosenPlayer.id)).emit('questionForPlayer', playerData);
    
            callback({ success: true });
        } catch (err) {
            console.error(err);
            callback({ success: false, error: 'Nie udało się wysłać pytania.' });
        }
    });
    

    // Przesyłanie odpowiedzi
    socket.on('submitAnswer', async ({ lobbyCode, playerId, chosenAnswer }, callback) => {
        try {
            const user = await User.findByPk(playerId);
            const question = await Question.findOne();

            const isCorrect = question.correctanswer === chosenAnswer;
            if (isCorrect) {
                user.correctanswers += 1;
                await user.save();
            }

            io.to(lobbyCode).emit('answerResult', { playerId, isCorrect });
            callback({ success: true, isCorrect });
        } catch (err) {
            console.error(err);
            callback({ success: false, error: 'Nie udało się przesłać odpowiedzi.' });
        }
    });

    // Koniec gry
    socket.on('endGame', async ({ lobbyCode }, callback) => {
        try {
            const players = await User.findAll({ where: { lobbycode: lobbyCode } });

            const rankings = players.map(player => ({
                name: player.name,
                correctanswers: player.correctanswers,
            })).sort((a, b) => b.correctanswers - a.correctanswers);

            io.to(lobbyCode).emit('gameEnded', { rankings });
            callback({ success: true });
        } catch (err) {
            console.error(err);
            callback({ success: false, error: 'Nie udało się zakończyć gry.' });
        }
    });

    // Rozłączenie użytkownika
    socket.on('disconnect', () => {
        const userId = userSockets.get(socket.id);
        if (userId) {
            userSockets.delete(socket.id);
            console.log(`Użytkownik ${userId} rozłączony.`);
        }
    });
});

// Start serwera
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});

export { app, server };
