// ======================================================
// FIREBASE IMPORTS
// ======================================================

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    serverTimestamp,
    deleteDoc,
    doc,
    updateDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

// ======================================================
// FIREBASE CONFIG
// ======================================================

const firebaseConfig = {
    apiKey: "AIzaSyB4b8F6FY4Sx-D8EoEfMq9xwSjZ8mFxYqI",
    authDomain: "pinkwave-news.firebaseapp.com",
    projectId: "pinkwave-news",
    storageBucket: "pinkwave-news.firebasestorage.app",
    messagingSenderId: "918042852758",
    appId: "1:918042852758:web:c3c2bbc8589225e2e8b1b7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ======================================================
// AUTH STATE (LOCAL MVP)
// ======================================================

const isUser = localStorage.getItem("isUserLoggedIn") === "true";
const isEditor = localStorage.getItem("isEditorLoggedIn") === "true";
const isGuest = !isUser && !isEditor;

const userNickname = localStorage.getItem("userNickname") || "User";

// ======================================================
// STATE
// ======================================================

let replyingTo = null;

// ======================================================
// OPEN COMMENTS
// ======================================================

document.addEventListener("click", (e) => {
    if (e.target.classList.contains("open-comments")) {
        const newsId = e.target.dataset.id;
        toggleComments(newsId, e.target);
    }
});

// ======================================================
// TOGGLE COMMENTS (lazy load)
// ======================================================

async function toggleComments(newsId, button) {
    let container = document.getElementById(`comments-${newsId}`);

    // ==========================
    // FIRST OPEN (create + load + show)
    // ==========================
    if (!container) {
        container = document.createElement("div");
        container.id = `comments-${newsId}`;
        container.className = "comments-container";

        button.parentElement.appendChild(container);

        container.style.display = "block";

        await loadComments(newsId, container);
        renderInput(newsId, container);

        return;
    }

    // ==========================
    // TOGGLE AFTER FIRST LOAD
    // ==========================
    container.style.display =
        container.style.display === "none" ? "block" : "none";
}

// ======================================================
// LOAD COMMENTS
// ======================================================

async function loadComments(newsId, container) {
    container.innerHTML = "<p class='comment-loading'>Завантаження...</p>";

    const q = query(
        collection(db, "news", newsId, "comments"),
        orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    container.innerHTML = "";

    snapshot.forEach((d) => {
        const c = d.data();
        const id = d.id;

        const canEdit = isEditor || c.nickname === userNickname;

        const el = document.createElement("div");
        el.className = "comment";

        el.innerHTML = `
      <div class="comment-header">
        <span class="comment-author">${c.nickname}</span>
      </div>

      <div class="comment-text">${c.text}</div>

      ${c.replyTo
                ? `<div class="comment-reply">↳ відповідь</div>`
                : ""
            }

      <div class="comment-actions">
        <button class="reply-btn" data-id="${id}" data-news="${newsId}">
          Відповісти
        </button>

        ${canEdit
                ? `
            <button class="edit-comment" data-id="${id}" data-news="${newsId}">
              Редагувати
            </button>

            <button class="delete-comment" data-id="${id}" data-news="${newsId}">
              Видалити
            </button>
          `
                : ""
            }
      </div>
    `;

        container.appendChild(el);
    });
}

// ======================================================
// INPUT RENDER
// ======================================================

function renderInput(newsId, container) {
    const wrap = document.createElement("div");
    wrap.className = "comment-input-wrap";

    if (isGuest) {
        wrap.innerHTML = `
      <p class="comment-guest">Увійдіть, щоб залишати коментарі</p>
    `;
    } else {
        wrap.innerHTML = `
      <input id="comment-input-${newsId}" placeholder="Коментар..." />
      <button class="send-comment" data-id="${newsId}">Надіслати</button>
    `;
    }

    container.appendChild(wrap);
}

// ======================================================
// ACTIONS (event delegation)
// ======================================================

document.addEventListener("click", async (e) => {

    // SEND COMMENT
    if (e.target.classList.contains("send-comment")) {
        const newsId = e.target.dataset.id;
        const input = document.getElementById(`comment-input-${newsId}`);

        const text = input.value.trim();
        if (!text) return;

        await addDoc(collection(db, "news", newsId, "comments"), {
            text,
            nickname: userNickname,
            replyTo: replyingTo || null,
            createdAt: serverTimestamp()
        });

        replyingTo = null;
        input.value = "";

        const container = document.getElementById(`comments-${newsId}`);
        await loadComments(newsId, container);
        renderInput(newsId, container);
    }

    // DELETE COMMENT
    if (e.target.classList.contains("delete-comment")) {
        const newsId = e.target.dataset.news;
        const id = e.target.dataset.id;

        await deleteDoc(doc(db, "news", newsId, "comments", id));

        const container = document.getElementById(`comments-${newsId}`);
        await loadComments(newsId, container);
        renderInput(newsId, container);
    }

    // EDIT COMMENT
    if (e.target.classList.contains("edit-comment")) {
        const newsId = e.target.dataset.news;
        const id = e.target.dataset.id;

        const ref = doc(db, "news", newsId, "comments", id);
        const snap = await getDoc(ref);

        if (snap.exists()) {
            const newText = prompt("Редагувати коментар:", snap.data().text);

            if (newText && newText.trim()) {
                await updateDoc(ref, {
                    text: newText.trim()
                });
            }
        }

        const container = document.getElementById(`comments-${newsId}`);
        await loadComments(newsId, container);
        renderInput(newsId, container);
    }

    // REPLY
    if (e.target.classList.contains("reply-btn")) {
        replyingTo = e.target.dataset.id;
        alert("Ви відповідаєте на коментар");
    }
});