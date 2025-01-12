// Importy
import { io } from "socket.io-client";

// Konfiguracja połączenia z serwerem
const SERVER_URL = "http://localhost:3000"; // Zmień na odpowiedni URL, jeśli serwer jest hostowany zdalnie
const socket = io(SERVER_URL);

// Funkcja pomocnicza do logowania wyników
function logResult(method, result) {
    console.log(`Metoda: ${method}`, result);
}

// Funkcja do testowania metod serwera
async function testServer() {
    console.log("Rozpoczynam testowanie serwera...");

    // Testowanie metody createLobby
    socket.emit("createLobby", { hostName: "HostUser" }, (response) => {
        logResult("createLobby", response);
        if (response.success) {
            const lobbyCode = response.code;

            // Testowanie metody joinLobby
            socket.emit("joinLobby", { userName: "Player1", lobbyCode }, (joinResponse) => {
                logResult("joinLobby", joinResponse);

                if (joinResponse.success) {
                    // Testowanie metody startGame
                    socket.emit("startGame", { lobbyCode }, (startGameResponse) => {
                        logResult("startGame", startGameResponse);

                        if (startGameResponse.success) {
                            // Testowanie metody choosePlayer
                            const testPlayerId = 1; // Zakładamy, że ID istnieje
                            socket.emit(
                                "choosePlayer",
                                { lobbyCode, chosenPlayerId: testPlayerId },
                                (choosePlayerResponse) => {
                                    logResult("choosePlayer", choosePlayerResponse);

                                    // Testowanie metody submitAnswer
                                    socket.emit(
                                        "submitAnswer",
                                        { lobbyCode, playerId: testPlayerId, chosenAnswer: "A" },
                                        (submitAnswerResponse) => {
                                            logResult("submitAnswer", submitAnswerResponse);

                                            // Testowanie metody endGame
                                            socket.emit("endGame", { lobbyCode }, (endGameResponse) => {
                                                logResult("endGame", endGameResponse);

                                                console.log("Testowanie zakończone.");
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    });
                }
            });
        }
    });
}

// Uruchom testowanie
socket.on("connect", () => {
    console.log("Połączono z serwerem.");
    testServer();
});

socket.on("disconnect", () => {
    console.log("Rozłączono z serwerem.");
});
