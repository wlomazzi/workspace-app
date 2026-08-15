// Pages that need the user to log in first (e.g. "Message the owner" on space_details.html when
// logged out) link here with ?redirect=<page> so login lands back where the user actually wanted
// to go instead of always index.html. Only a plain relative "somepage.html" (optionally with its
// own query string) is accepted - anything else (an absolute URL, a protocol-relative "//host/...",
// etc.) falls back to index.html, so this can't be turned into an open redirect.
function getSafeRedirectTarget() {
    const raw = new URLSearchParams(window.location.search).get('redirect');
    if (!raw) return 'index.html';

    let decoded;
    try {
        decoded = decodeURIComponent(raw);
    } catch {
        return 'index.html';
    }

    return /^[a-zA-Z0-9_-]+\.html(\?[^\s]*)?$/.test(decoded) ? decoded : 'index.html';
}

// If the user already has a valid session, skip the login page entirely. The session itself now
// lives in an httpOnly cookie the page can't read directly, so this has to ask the server.
// No blocking alert here - a silent redirect is the expected behavior for "already logged in".
checkSession().then(result => {
    if (result.loggedIn) {
        window.location.href = getSafeRedirectTarget();
    }
});

// This script handles the login functionality for the user interface. It captures the form submission,
// sends the login credentials to the server, and handles the response.
const loginForm = document.getElementById('loginForm');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const loginError = document.getElementById('loginError');

function showLoginError(message) {
    loginError.textContent = message;
    loginError.hidden = false;
}

function hideLoginError() {
    loginError.hidden = true;
    loginError.textContent = '';
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    hideLoginError();

    const email = document.getElementById('user_login').value.trim();
    const password = document.getElementById('user_password').value;

    if (!email || !password) {
        showLoginError('Please enter your username and password.');
        return;
    }

    // Disable the button and show a loading state to prevent duplicate submits
    loginSubmitBtn.disabled = true;
    loginSubmitBtn.textContent = 'Logging in...';

    try {
        const response = await apiFetch('/api/users/user_login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            // The actual session token is set as an httpOnly cookie by the server - it never
            // touches this JS. What's kept here is just a non-sensitive display hint (used for
            // instant "am I logged in" UI checks); the server never trusts it for authorization.
            localStorage.setItem('user_id', data.user.id);
            localStorage.setItem('user_email', data.user.email);

            // One-shot flag read by navbar.js on the very next page load: makes sure the
            // "rate your past stays" modal pops up right at login, instead of relying on the
            // looser "first page load in this browser session" heuristic it uses otherwise.
            sessionStorage.setItem('just_logged_in', 'true');

            loginSubmitBtn.textContent = 'Success! Redirecting...';
            window.location.href = getSafeRedirectTarget();
        } else {
            showLoginError(data.error || 'Login failed. Please check your credentials and try again.');
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.textContent = 'Login';
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginError('An unexpected error occurred. Please try again later.');
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.textContent = 'Login';
    }
});
