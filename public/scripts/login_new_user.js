// This script handles the registration form submission: sends the new user's credentials to
// the server and redirects to the login page on success.
const registerForm = document.getElementById('registerForm');
const registerSubmitBtn = document.getElementById('registerSubmitBtn');
const registerError = document.getElementById('registerError');

function showRegisterError(message) {
    registerError.textContent = message;
    registerError.hidden = false;
}

function hideRegisterError() {
    registerError.hidden = true;
    registerError.textContent = '';
}

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    hideRegisterError();

    const email = document.getElementById('user_login').value.trim();
    const password = document.getElementById('user_password').value;
    const passwordRepeat = document.getElementById('user_password_repeat').value;

    if (!email || !password || !passwordRepeat) {
        showRegisterError('Please fill in all fields.');
        return;
    }

    if (password.length < 6) {
        showRegisterError('Password must be at least 6 characters long.');
        return;
    }

    if (password !== passwordRepeat) {
        showRegisterError('Passwords do not match.');
        return;
    }

    registerSubmitBtn.disabled = true;
    registerSubmitBtn.textContent = 'Creating account...';

    try {
        const response = await apiFetch('/api/users/user_login/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, fullName: '' }),
        });

        const data = await response.json();

        if (response.ok) {
            registerSubmitBtn.textContent = 'Account created! Redirecting to login...';
            window.location.href = 'login.html';
        } else {
            showRegisterError(data.error || 'Registration failed. Please try again.');
            registerSubmitBtn.disabled = false;
            registerSubmitBtn.textContent = 'Sign Up';
        }
    } catch (error) {
        console.error('Register error:', error);
        showRegisterError('An unexpected error occurred. Please try again later.');
        registerSubmitBtn.disabled = false;
        registerSubmitBtn.textContent = 'Sign Up';
    }
});
