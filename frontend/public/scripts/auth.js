import { apiLogin, apiVerify } from "./api.js";
import { TOKEN_KEY, USER_KEY, LVL_KEY } from "./config.js";

export function hookAuthUI() {
    const loginBtn = document.getElementById("loginBtn");
    const modal = document.getElementById("loginModal");
    const goBtn = document.getElementById("continueBtn");
    const input = document.getElementById("usernameInput");
    const badge = document.getElementById("userBadge");
    const panel = document.getElementById("userPanel");
    const logoutBtn = document.getElementById("logoutBtn");
    const closeBtn = document.getElementById("loginCloseBtn");

    const openModal = () => {
        modal.classList.remove("hidden");
        document.body.classList.add("modal-open");
    };

    const closeModal = () => {
        modal.classList.add("hidden");
        document.body.classList.remove("modal-open");
        input.value = "";
    };

    const showBadge = () => {
        const username = localStorage.getItem(USER_KEY);
        const level = localStorage.getItem(LVL_KEY) ?? 0;
        if (username) {
            loginBtn.classList.add("hidden");
            panel.classList.remove("hidden");
            badge.textContent = `${username} · Lv ${level}`;
        } else {
            panel.classList.add("hidden");
            loginBtn.classList.remove("hidden");
        }
    };

    const attemptLogin = async () => {
        //console.log("HH");
        const username = input.value.trim();
        if (!username) return;
        console.log("sdf");
        try {
            const { token, username: saved, highestLevel } = await apiLogin(username);
            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(USER_KEY, saved);
            localStorage.setItem(LVL_KEY, highestLevel ?? 0);
            console.log("5555");
            //show("game");
            closeModal();
            showBadge();
        } catch (err) {
            alert(err.message || "Unable to login right now.");
        }
    };

    const logout = () => {
        [TOKEN_KEY, USER_KEY, LVL_KEY].forEach((k) => localStorage.removeItem(k));
        showBadge();
    };

    loginBtn.addEventListener("click", () => {
        openModal();
        input.focus();
    });
    goBtn.addEventListener("click", attemptLogin);
        console.log("HHH");
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") attemptLogin();
    });
    logoutBtn.addEventListener("click", logout);
    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        apiVerify()
            .then((data) => {
                if (!data) return;
                localStorage.setItem(USER_KEY, data.username);
                localStorage.setItem(LVL_KEY, data.highestLevel ?? 0);
            })
            .finally(showBadge);
    } else {
        showBadge();
    }

    return { showBadge, logout };
}
