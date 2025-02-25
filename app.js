require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();

// 미들웨어 설정
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// MySQL 연결
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

// ✅ 기존 비밀번호 해싱 (초기 설정)
(async function hashExistingPasswords() {
    try {
        const [users] = await db.query('SELECT id, password FROM users');
        for (const user of users) {
            if (!user.password.startsWith('$2b$')) {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
                console.log(`🔒 Password for user ${user.id} has been hashed.`);
            }
        }
    } catch (error) {
        console.error('❌ Error hashing existing passwords:', error);
    }
})();

// ✅ 테스트 유저 등록/업데이트
(async function createOrUpdateTestUser() {
    const testUsername = 'testuser';
    const testPassword = '123456';
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [testUsername]);
        if (rows.length > 0) {
            await db.query('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, testUsername]);
            console.log('✅ Test user password updated');
        } else {
            await db.query(
                'INSERT INTO users (school_type, school_name, name, username, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                ['University', 'Test School', 'Test User', testUsername, hashedPassword, 'admin', 'y']
            );
            console.log('✅ Test user created');
        }
    } catch (error) {
        console.error('❌ Error creating or updating test user:', error);
    }
})();

// 기본 라우트
app.get('/', (req, res) => {
    res.send('Hello, World! MySQL is connected!');
});

// ✅ 로그인 엔드포인트
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = rows[0];

        // bcrypt로 암호화된 비밀번호 비교
        const isMatch = user.password.startsWith('$2b$') 
            ? await bcrypt.compare(password, user.password)
            : user.password === password;

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // UTF-8 한글 인코딩 후 JWT 생성
        const token = jwt.sign(
            { 
                id: user.id, 
                school_name: Buffer.from(user.school_name, 'utf8').toString('base64'), // Base64 인코딩
                name: Buffer.from(user.name, 'utf8').toString('base64') // Base64 인코딩
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        res.status(200).json({ token });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ JWT 인증 미들웨어
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        console.log("🚨 인증 실패: 토큰이 없음");
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log("✅ 인증 성공:", decoded);
        next();
    } catch (error) {
        console.log("🚨 인증 실패: 유효하지 않은 토큰");
        return res.status(401).json({ message: "Invalid token" });
    }
};

// ✅ 인증이 필요한 엔드포인트 (테스트용)
app.get('/api/protected', authMiddleware, (req, res) => {
    res.json({ message: "This is a protected route", user: req.user });
});

// ✅ 유저가 승인된 WebGL 콘텐츠만 조회할 수 있도록 수정
app.get('/api/user/webgl', authMiddleware, async (req, res) => {
    const userId = req.user.id; // JWT에서 유저 ID 가져오기

    try {
        const [contents] = await db.query(
            'SELECT w.* FROM webgl_contents w INNER JOIN user_access ua ON w.id = ua.webgl_id WHERE ua.user_id = ?',
            [userId]
        );

        res.status(200).json(contents);
    } catch (error) {
        console.error('❌ WebGL 콘텐츠 불러오기 오류:', error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// ✅ WebGL 콘텐츠 추가 (관리자 기능)
app.post('/api/admin/add-webgl', authMiddleware, async (req, res) => {
    const { title, folderName, description } = req.body;
    const url = `/webgl-content/${folderName}/index.html`; // WebGL 콘텐츠 경로 생성

    try {
        await db.query('INSERT INTO webgl_contents (title, url, description) VALUES (?, ?, ?)', 
            [title, url, description]);
        
        res.status(200).json({ message: 'WebGL 콘텐츠가 등록되었습니다.' });
    } catch (error) {
        console.error('❌ WebGL 콘텐츠 추가 오류:', error);
        res.status(500).json({ message: '서버 오류 발생' });
    }
});

// ✅ Express 정적 파일 설정 (WebGL 콘텐츠 접근 가능하게 설정)
app.use('/webgl-content', express.static(path.join(__dirname, 'public/webgl-content')));

// ✅ 포트 설정 및 서버 실행
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
