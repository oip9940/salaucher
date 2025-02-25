document.getElementById('login-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorMessage = document.getElementById('error-message'); // 오류 메시지 요소

  // 기존 오류 메시지 초기화
  errorMessage.textContent = "";
  errorMessage.style.display = "none";

  try {
      const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
          localStorage.setItem('token', data.token); // JWT 토큰 저장
          window.location.href = '/main.html'; // 로그인 성공 시 mainpage.html로 이동
      } else {
          // 오류 메시지 표시
          errorMessage.textContent = "로그인 정보가 틀립니다. 다시 확인 부탁드립니다.";
          errorMessage.style.display = "block";
      }
  } catch (error) {
      console.error('Error:', error);
      errorMessage.textContent = "서버 오류가 발생했습니다. 다시 시도해주세요.";
      errorMessage.style.display = "block";
  }
});

async function loadUserWebGL() {
  const token = localStorage.getItem('token'); // 저장된 JWT 토큰 가져오기
  if (!token) {
      alert("로그인이 필요합니다.");
      window.location.href = "/index.html"; // 로그인 페이지로 이동
      return;
  }

  const response = await fetch('/api/user/webgl', {
      method: "GET",
      headers: {
          "Authorization": `Bearer ${token}`, // JWT 토큰 포함
          "Content-Type": "application/json"
      }
  });

  const data = await response.json();
  if (response.ok) {
      console.log("사용자 승인 콘텐츠:", data);
      // 콘텐츠 표시 로직 추가
  } else {
      alert(data.message);
      window.location.href = "/index.html"; // 로그인 필요 시 로그인 페이지로 이동
  }
}

// 비밀번호 표시/숨기기 기능
document.getElementById('toggle-password').addEventListener('click', function () {
  const passwordInput = document.getElementById('password');
  const icon = this;

  if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      icon.src = 'image/eye_icon.svg'; // 비밀번호 보이기 아이콘
  } else {
      passwordInput.type = 'password';
      icon.src = 'image/eye_cross_icon.svg'; // 비밀번호 숨기기 아이콘
  }
});
