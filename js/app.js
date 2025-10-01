// ================= Firebase Configuration & Initialization =================
// Using Firebase SDK v8 global namespace as in your original code
const firebaseConfig = {
  apiKey: "AIzaSyCs7hYMtuvHCYawB8mtHeH1aKAFNOm8yQo",
  authDomain: "petitionsofnau-d6389.firebaseapp.com",
  projectId: "petitionsofnau-d6389",
  storageBucket: "petitionsofnau-d6389.firebasestorage.app",
  messagingSenderId: "416307461211",
  appId: "1:416301234567:web:ba5283700186306ae3937e",
  measurementId: "G-W3K3Z1T1ZH"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.log("Firebase already initialized:", error);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Firestore settings for better connectivity
db.settings({
  experimentalForceLongPolling: true
});

// ================= Google Sign-In Callback Function =================
window.handleCredentialResponse = async function(response) {
  console.log("Google Sign-In callback received");

  try {
    const credential = firebase.auth.GoogleAuthProvider.credential(response.credential);
    const userCredential = await auth.signInWithCredential(credential);
    const user = userCredential.user;

    console.log("User authenticated:", user.email);

    // Save user to Firestore
    try {
      await db.collection('users').doc(user.uid).set({
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        picture: user.photoURL,
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log("User saved to Firestore");
    } catch (firestoreError) {
      console.warn("Firestore save warning:", firestoreError);
    }

    // Store user info in sessionStorage
    sessionStorage.setItem('user', JSON.stringify({
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      picture: user.photoURL
    }));

    // Redirect to profile page
    window.location.href = 'profile.html';

  } catch (error) {
    console.error("Authentication error: ", error);
    alert('Помилка при вході в систему: ' + error.message);
  }
};

// ================= Google Sign-In Initialization =================
function initializeGoogleSignIn() {
  if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
    google.accounts.id.initialize({
      client_id: "846601442827-ov1kalordlr0v3294na4h9pfcbp1tqve.apps.googleusercontent.com",
      callback: window.handleCredentialResponse,
      auto_select: false
    });
    console.log("Google Sign-In initialized");
  } else {
    setTimeout(initializeGoogleSignIn, 100);
  }
}

// ================= Voting System Functions =================
// New function to handle voting using subcollections
async function voteForPetition(petitionId) {
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      alert('Будь ласка, увійдіть в систему для голосування');
      return;
    }

    const voteRef = db.collection('petitions').doc(petitionId)
      .collection('votes').doc(user.uid);

    // Check if user already voted
    const voteDoc = await voteRef.get();
    if (voteDoc.exists) {
      alert('Ви вже голосували за цю петицію');
      return;
    }

    // Create vote record
    await voteRef.set({
      votedAt: firebase.firestore.FieldValue.serverTimestamp(),
      voterId: user.uid
    });

    alert('Ваш голос успішно зараховано!');
    updatePetitionUI(petitionId);

  } catch (error) {
    console.error('Помилка при голосуванні:', error);
    alert('Помилка при голосуванні: ' + error.message);
  }
}

// Function to get vote count
async function getVoteCount(petitionId) {
  const votesSnapshot = await db.collection('petitions').doc(petitionId)
    .collection('votes').get();
  return votesSnapshot.size;
}

// Function to update UI after voting
async function updatePetitionUI(petitionId) {
  const voteCount = await getVoteCount(petitionId);

  // Update all vote count displays for this petition
  document.querySelectorAll(`.votes-count[data-id="${petitionId}"]`).forEach(el => {
    el.textContent = voteCount;
  });

  // Update vote buttons for this petition
  document.querySelectorAll(`.vote-btn[data-id="${petitionId}"]`).forEach(btn => {
    btn.disabled = true;
    btn.textContent = 'Вже проголосовано';
    btn.classList.add('btn-disabled');
  });
}

// Function to display user information with proper logout button
function displayUserInfo(user) {
  const userDiv = document.getElementById('user-info');
  const logoutSection = document.getElementById('logout-section');
  const logoutBtn = document.getElementById('logout-btn');

  if (userDiv && user) {
    userDiv.innerHTML = `
      <div class="user-profile">
        <img src="${user.picture}" alt="Аватар" class="user-avatar">
        <h2 class="user-name">Вітаємо, ${user.name}!</h2>
        <p class="user-email">${user.email}</p>
      </div>
    `;
  }

  // Show logout section and button
  if (logoutSection) {
    logoutSection.style.display = 'block';
  }

  if (logoutBtn) {
    logoutBtn.style.display = 'block';
  }
}

// ================= Main Application Logic =================
document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM loaded, initializing app...");

  initializeGoogleSignIn();

  const user = JSON.parse(sessionStorage.getItem('user'));
  const logoutBtn = document.getElementById('logout-btn');
  const createForm = document.getElementById('create-petition-form');

  // Authentication check for protected pages
  const protectedPages = ['profile.html', 'petitions.html'];
  const currentPage = window.location.pathname.split('/').pop();

  if (protectedPages.includes(currentPage) && !user) {
    window.location.href = 'login.html';
    return;
  }

  // Display user information with proper logout button
  if (user) {
    displayUserInfo(user);
  }

  // Logout handler - FIXED: Proper event listener attachment
  if (logoutBtn) {
    // Remove any existing event listeners to prevent duplicates
    logoutBtn.replaceWith(logoutBtn.cloneNode(true));
    const newLogoutBtn = document.getElementById('logout-btn');

    newLogoutBtn.addEventListener('click', function() {
      sessionStorage.removeItem('user');
      if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
      }
      auth.signOut().then(() => {
        window.location.href = 'login.html';
      }).catch(error => {
        console.error("Помилка при виході: ", error);
        alert("Помилка при виході.");
      });
    });
  }

  // Petition creation form
  if (createForm && user) {
    createForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const title = document.getElementById('petition-title').value.trim();
      const text = document.getElementById('petition-text').value.trim();

      if (!title || !text) {
        alert('Будь ласка, заповніть всі поля');
        return;
      }

      if (title.length < 5) {
        alert('Заголовок має містити щонайменше 5 символів');
        return;
      }

      if (text.length < 10) {
        alert('Текст петиції має містити щонайменше 10 символів');
        return;
      }

      const submitBtn = createForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;

      try {
        submitBtn.textContent = 'Створення...';
        submitBtn.disabled = true;

        await db.collection('petitions').add({
          title: title,
          text: text,
          author: user.name,
          authorUid: user.uid,
          email: user.email,
          date: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('Петицію успішно створено!');
        createForm.reset();
        if (document.getElementById('my-petitions')) displayUserPetitions();

      } catch (error) {
        console.error("Помилка при створенні петиції: ", error);
        alert('Помилка при створенні петиції. Спробуйте ще раз.');
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // ================= User Petitions Display =================
  async function displayUserPetitions() {
    const myPetitionsDiv = document.getElementById('my-petitions');
    if (!myPetitionsDiv || !user) return;

    try {
      myPetitionsDiv.innerHTML = '<div class="loading">Завантаження ваших петицій...</div>';

      const querySnapshot = await db.collection('petitions')
        .where('authorUid', '==', user.uid)
        .orderBy('date', 'desc')
        .get();

      if (!querySnapshot.empty) {
        // Process each petition to get vote counts
        const petitionElements = await Promise.all(
          querySnapshot.docs.map(async (doc) => {
            const p = doc.data();
            const voteCount = await getVoteCount(doc.id);
            const date = p.date && typeof p.date.toDate === 'function'
              ? new Date(p.date.toDate()).toLocaleDateString('uk-UA')
              : 'Невідома дата';

            return `
              <div class="petition-item">
                <div class="petition-header">
                  <h3 class="petition-title">${p.title}</h3>
                  <div class="petition-meta">
                    <span><i class="fas fa-calendar"></i> ${date}</span>
                    <span><i class="fas fa-chart-bar"></i> <strong class="votes-count" data-id="${doc.id}">${voteCount}</strong> голосів</span>
                  </div>
                </div>
                <div class="petition-text">${p.text}</div>
                <div class="petition-footer">
                  <button class="btn btn-danger delete-petition-btn" data-id="${doc.id}">
                    <i class="fas fa-trash"></i> Видалити петицію
                  </button>
                </div>
              </div>
            `;
          })
        );

        myPetitionsDiv.innerHTML = petitionElements.join('');
      } else {
        myPetitionsDiv.innerHTML = "<p class='text-center'>Ви ще не створили жодної петиції.</p>";
      }
    } catch (error) {
      console.error("Помилка при завантаженні петицій користувача: ", error);
      myPetitionsDiv.innerHTML = "<p class='text-center'>Помилка при завантаженні петицій.</p>";
    }
  }

  // ================= Latest Petition on Index Page =================
  const latestDiv = document.getElementById('latest-petition');
  if (latestDiv) {
    loadLatestPetition();
  }

  async function loadLatestPetition() {
    try {
      const querySnapshot = await db.collection('petitions')
        .orderBy('date', 'desc')
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const p = doc.data();
        const voteCount = await getVoteCount(doc.id);

        // Check if current user has voted
        let hasVoted = false;
        if (user) {
          const voteDoc = await db.collection('petitions').doc(doc.id)
            .collection('votes').doc(user.uid).get();
          hasVoted = voteDoc.exists;
        }

        latestDiv.innerHTML = `
          <div class="petition-item">
            <div class="petition-header">
              <h3 class="petition-title">${p.title}</h3>
              <div class="petition-meta">
                <span><i class="fas fa-user"></i> ${p.author}</span>
                <span><i class="fas fa-chart-bar"></i> <strong class="votes-count" data-id="${doc.id}">${voteCount}</strong> голосів</span>
              </div>
            </div>
            <div class="petition-text">${p.text}</div>
            <div class="petition-footer">
              <button class="btn btn-primary vote-btn" data-id="${doc.id}" ${hasVoted ? 'disabled' : ''}>
                <i class="fas fa-vote-yea"></i> ${hasVoted ? 'Вже проголосовано' : 'Голосувати'}
              </button>
            </div>
          </div>
        `;
      } else {
        latestDiv.innerHTML = "<p class='text-center'>Петицій ще немає. Створіть першу!</p>";
      }
    } catch (error) {
      console.error("Помилка при завантаженні останньої петиції: ", error);
      latestDiv.innerHTML = "<p class='text-center'>Помилка при завантаженні петиції.</p>";
    }
  }

  // ================= All Petitions Display =================
  const allDiv = document.getElementById('all-petitions');
  if (allDiv) {
    loadAllPetitions();
  }

  async function loadAllPetitions() {
    try {
      allDiv.innerHTML = '<div class="loading">Завантаження петицій...</div>';

      const querySnapshot = await db.collection('petitions')
        .orderBy('date', 'desc')
        .get();

      if (!querySnapshot.empty) {
        // Process each petition to get vote counts and voting status
        const petitionElements = await Promise.all(
          querySnapshot.docs.map(async (doc) => {
            const p = doc.data();
            const voteCount = await getVoteCount(doc.id);

            let hasVoted = false;
            if (user) {
              const voteDoc = await db.collection('petitions').doc(doc.id)
                .collection('votes').doc(user.uid).get();
              hasVoted = voteDoc.exists;
            }

            const date = p.date && typeof p.date.toDate === 'function'
              ? new Date(p.date.toDate()).toLocaleDateString('uk-UA')
              : 'Невідома дата';

            return `
              <div class="petition-item">
                <div class="petition-header">
                  <h3 class="petition-title">${p.title}</h3>
                  <div class="petition-meta">
                    <span><i class="fas fa-user"></i> ${p.author}</span>
                    <span><i class="fas fa-calendar"></i> ${date}</span>
                  </div>
                </div>
                <div class="petition-text">${p.text}</div>
                <div class="petition-footer">
                  <span class="votes-count" data-id="${doc.id}"><strong>${voteCount}</strong> голосів</span>
                  <button class="btn btn-primary vote-btn" data-id="${doc.id}" ${hasVoted ? 'disabled' : ''}>
                    <i class="fas fa-vote-yea"></i> ${hasVoted ? 'Вже проголосовано' : 'Голосувати'}
                  </button>
                </div>
              </div>
            `;
          })
        );

        allDiv.innerHTML = petitionElements.join('');
      } else {
        allDiv.innerHTML = "<p class='text-center'>Петицій ще немає. Створіть першу!</p>";
      }
    } catch (error) {
      console.error("Помилка при завантаженні всіх петицій: ", error);
      allDiv.innerHTML = "<p class='text-center'>Помилка при завантаженні петицій.</p>";
    }
  }

  // ================= Event Delegation for Dynamic Elements =================
  document.addEventListener('click', async function(e) {
    // Handle voting
    const voteBtn = e.target.closest('.vote-btn');
    if (voteBtn && !voteBtn.disabled) {
      const petitionId = voteBtn.getAttribute('data-id');

      if (!user) {
        alert('Щоб проголосувати, увійдіть у свій акаунт.');
        window.location.href = 'login.html';
        return;
      }

      await voteForPetition(petitionId);
    }

    // Handle petition deletion
    const deleteBtn = e.target.closest('.delete-petition-btn');
    if (deleteBtn) {
      const petitionId = deleteBtn.getAttribute('data-id');

      if (!user) {
        alert('У вас немає прав для видалення петиції.');
        return;
      }

      if (confirm('Ви впевнені, що хочете видалити цю петицію?')) {
        try {
          // Delete the petition document
          await db.collection('petitions').doc(petitionId).delete();

          // Note: In a production app, you might also want to delete the votes subcollection
          // This requires a Cloud Function as Firestore doesn't support recursive deletes

          displayUserPetitions();
        } catch (error) {
          console.error("Помилка при видаленні петиції: ", error);
          alert('Помилка при видаленні петиції. Можливо, у вас недостатньо прав.');
        }
      }
    }
  });

  // Initialize user petitions display if applicable
  if (document.getElementById('my-petitions') && user) {
    displayUserPetitions();
  }
});
