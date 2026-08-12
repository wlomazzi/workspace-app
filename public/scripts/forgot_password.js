// Sends the "forgot password" email via the backend, which in turn calls Supabase Auth's
// resetPasswordForEmail(). The link inside that email points back at reset_password.html.
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const submitBtn = document.getElementById('forgotPasswordSubmitBtn');
const errorEl = document.getElementById('forgotPasswordError');
const successEl = document.getElementById('forgotPasswordSuccess');

forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    errorEl.hidden = true;
    successEl.hidden = true;

    const email = document.getElementById('user_email').value.trim();
    if (!email) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
        const redirectTo = `${window.location.origin}/reset_password.html`;

        const response = await fetch('/api/users/user_login/forgot_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, redirectTo }),
        });

        const data = await response.json();

        // The backend always answers with the same generic message (on purpose - it never
        // reveals whether that email actually has an account, to avoid leaking who's registered).
        successEl.textContent = data.message || 'If an account exists for that email, a password reset link has been sent.';
        successEl.hidden = false;
        forgotPasswordForm.reset();
    } catch (error) {
        console.error('Error requesting password reset:', error);
        errorEl.textContent = 'An unexpected error occurred. Please try again later.';
        errorEl.hidden = false;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send reset link';
    }
});
