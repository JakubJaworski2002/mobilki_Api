import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('1zN', 'Michalek', 'iMdjVwUTRckXLgxyNlcsHXdsBcEWnfXk', {
    host: 'mysql-production-d596.up.railway.app',
    dialect: 'mysql', 
    dialectOptions: {
        charset: 'utf8mb4', // Ustawienie poprawnego kodowania
    },
});
const Lobby = sequelize.define('Lobby', {
    code:
    {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
    },
    host:
    {
        type: Sequelize.STRING,
        allowNull: false,
    },
},{timestamps: false,});
const User = sequelize.define('User', {
    name:
    {
        type: Sequelize.STRING,
        allowNull: false,
    },
    lobbycode:
    {
        type: Sequelize.STRING,
        allowNull: false,
    },
    correctanswers:
    {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    lives:
    {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
},{timestamps: false,});
const Question = sequelize.define('Question', {
    question:
    {
        type: Sequelize.STRING,
        allowNull: false,
    },
    answerA:
    {
        type: Sequelize.STRING,
        allowNull: false,
    },
    answerB:
    {
        type: Sequelize.STRING,
        allowNull: false,
    },
    answerC:
    {
        type: Sequelize.STRING,
        allowNull: false,
    },
    answerD:
    {
        type: Sequelize.STRING,
        allowNull: false,
    },
    correctanswer:
    {
        type: Sequelize.STRING,
        allowNull: false,
    },
},{timestamps: false,});

(async () => {
    await sequelize.sync({ alter: true })
        .then(() => console.log('Database synchronized'))
        .catch(err => console.error('Database synchronization error:', err));
})();
(async () => {
    try {
        await sequelize.authenticate();
        console.log('Połączono z bazą danych!');
    } catch (error) {
        console.error('Błąd połączenia z bazą danych:', error);
    }
})();

export { sequelize, Lobby, User,Question };