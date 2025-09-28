// ================= Google Sign-In =================
window.handleCredentialResponse = function(response) {
  const data = parseJwt(response.credential);
  sessionStorage.setItem('user', JSON.stringify(data));
  window.location.href = 'profile.html';
};

function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

// ================= Profile page =================
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(sessionStorage.getItem('user'));
  const userDiv = document.getElementById('user-info');
  const logoutBtn = document.getElementById('logout-btn');
  const createForm = document.getElementById('create-petition-form');

  if (userDiv && user) {
    userDiv.innerHTML = `
      <h2>Вітаємо, ${user.name}!</h2>
      <p>Email: ${user.email}</p>
      <img src="${user.picture}" alt="Аватар користувача" style="border-radius:50%; width:100px;">
    `;
    logoutBtn.style.display = 'block';
  } else if (userDiv) {
    // Якщо користувач не авторизований
    window.location.href = 'login.html';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('user');
      google.accounts.id.disableAutoSelect();
      window.location.href = 'login.html';
    });
  }

  if (createForm) {
    createForm.addEventListener('submit', e => {
      e.preventDefault();
      const title = document.getElementById('petition-title').value;
      const text = document.getElementById('petition-text').value;

      const petitions = JSON.parse(localStorage.getItem('petitions')) || [];
      petitions.push({
        title,
        text,
        author: user.name,
        email: user.email,
        votes: 0,
        date: new Date().toISOString()
      });
      localStorage.setItem('petitions', JSON.stringify(petitions));
      alert('Петицію створено!');
      createForm.reset();
    });
  }

  // ================= Index page =================
  const latestDiv = document.getElementById('latest-petition');
  if (latestDiv) {
    const petitions = JSON.parse(localStorage.getItem('petitions')) || [];
    if (petitions.length > 0) {
      const last = petitions[petitions.length - 1];
      latestDiv.innerHTML = `
        <h3>${last.title}</h3>
        <p><strong>Автор:</strong> ${last.author}</p>
        <p>${last.text}</p>
        <p><strong>Голосів:</strong> ${last.votes}</p>
      `;
    } else {
      latestDiv.innerHTML = "<p>Петицій ще немає.</p>";
    }
  }

  // ================= Petitions page =================
  const allDiv = document.getElementById('all-petitions');
  if (allDiv) {
    const petitions = JSON.parse(localStorage.getItem('petitions')) || [];
    if (petitions.length > 0) {
      allDiv.innerHTML = petitions.map(p => `
        <div style="border:1px solid #ccc; margin-bottom:10px; padding:5px;">
          <h3>${p.title}</h3>
          <p><strong>Автор:</strong> ${p.author}</p>
          <p>${p.text}</p>
          <p><strong>Голосів:</strong> ${p.votes}</p>
        </div>
      `).join('');
    } else {
      allDiv.innerHTML = "<p>Петицій ще немає.</p>";
    }
  }
});
