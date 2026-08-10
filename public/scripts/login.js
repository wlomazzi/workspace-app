// If the user already has a valid session token, skip the login page entirely.
// No blocking alert here - a silent redirect is the expected behavior for "already logged in".
const existingToken = localStorage.getItem('access_token');
if (existingToken) {
    window.location.href = 'index.html';
}

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
        const response = await fetch('/api/users/user_login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            // Save the access token and user ID, then redirect straight to the homepage.
            // No blocking alert - the redirect itself is enough feedback.
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('user_id', data.user.id);
            localStorage.setItem('user_email', data.user.email);

            loginSubmitBtn.textContent = 'Success! Redirecting...';
            window.location.href = 'index.html';
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
