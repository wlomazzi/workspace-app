// Completes a Supabase Auth password-reset flow. The email link (sent by /forgot_password)
// lands here with a recovery token in the URL fragment; supabase-js's client automatically
// detects and consumes it (detectSessionInUrl defaults to true), turning it into a temporary
// "recovery" session we can use to set a new password via auth.updateUser().
const form = document.getElementById('resetPasswordForm');
const hintEl = document.getElementById('resetPasswordHint');
const errorEl = document.getElementById('resetPasswordError');
const successEl = document.getElementById('resetPasswordSuccess');
const newPasswordInput = document.getElementById('new_password');
const confirmPasswordInput = document.getElementById('confirm_password');
const submitBtn = document.getElementById('resetPasswordSubmitBtn');

let supabaseClient = null;

function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
}

function enableForm() {
    hintEl.textContent = 'Enter a new password for your account.';
    newPasswordInput.disabled = false;
    confirmPasswordInput.disabled = false;
    submitBtn.disabled = false;
}

async function init() {
    // Supabase redirects back here with #error=...&error_code=...&error_description=... when the
    // link itself was already invalid (expired, already used, or "clicked" ahead of time by an
    // email provider's link-scanner). Catch that immediately instead of waiting on a timeout.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hashParams.get('error')) {
        hintEl.textContent = '';
        const description = hashParams.get('error_description');
        showError(
            description
                ? decodeURIComponent(description.replace(/\+/g, ' '))
                : 'This password reset link is invalid or has expired. Please request a new one from the login page.'
        );
        return;
    }

    try {
        const configResponse = await fetch('/api/config');
        const config = await configResponse.json();

        supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

        // Give supabase-js a moment to parse the recovery token out of the URL fragment.
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (session) {
            enableForm();
            return;
        }

        // Sometimes detection finishes just after getSession() resolves - listen for it too.
        supabaseClient.auth.onAuthStateChange((event, changedSession) => {
            if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && changedSession) {
                enableForm();
            }
        });

        setTimeout(async () => {
            if (!newPasswordInput.disabled) return; // already enabled by the listener above
            const { data: { session: retrySession } } = await supabaseClient.auth.getSession();
            if (retrySession) {
                enableForm();
            } else {
                hintEl.textContent = '';
                showError('This password reset link is invalid or has expired. Please request a new one from the login page.');
            }
        }, 2500);

    } catch (error) {
        console.error('Error initializing password reset:', error);
        hintEl.textContent = '';
        showError('Something went wrong loading this page. Please try again later.');
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    errorEl.hidden = true;
    successEl.hidden = true;

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (newPassword.length < 6) {
        showError('Password must be at least 6 characters long.');
        return;
    }

    if (newPassword !== confirmPassword) {
        showError('Passwords do not match.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword });

        if (error) {
            showError(error.message || 'Failed to update password. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Set new password';
            return;
        }

        // Done with the temporary recovery session - sign out of it so it doesn't linger, then
        // send them to the normal login page to sign in with their new password.
        await supabaseClient.auth.signOut();

        successEl.textContent = 'Your password has been updated. Redirecting to login...';
        successEl.hidden = false;
        form.reset();

        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);

    } catch (error) {
        console.error('Error updating password:', error);
        showError('An unexpected error occurred. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Set new password';
    }
});

init();
