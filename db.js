require('dotenv').config(); // .env 파일 로드
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: true // 보안 연결
    }
});

connection.connect(err => {
    if (err) {
        console.error('❌ MySQL 연결 실패:', err);
        return;
    }
    console.log('✅ MySQL 연결 성공!');
});

module.exports = connection;