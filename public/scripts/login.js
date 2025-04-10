const user = localStorage.getItem('access_token');

if (user) {
    // User is logged in, can send the token to the server or do other actions
    alert('User is loged in');
    console.log('User is Logged in - ID: ', user.user_id);
    window.location.href = 'index.html'; // Redirect to the homepage
}


// This script handles the login functionality for the user interface. It captures the form submission, 
// sends the login credentials to the server, and handles the response.
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('user_login').value;
    const password = document.getElementById('user_password').value;

    try {
        const response = await fetch('/api/users/user_login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            // Login successful
            alert("Login successful! You wiil be redirected to the homepage.");
            //console.log(data); // Here you can see the user data returned from the server and redirect to index.html
            // Save the access token and user ID in localStorage
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('user_id', data.user.id);
            localStorage.setItem('user_email', data.user.email);

            window.location.href = 'index.html'; 
        } else {
            // Shows the error message returned by the API
            alert(data.error || 'Login failed. Please try again.');
        }
    } catch (error) {
        console.error('Login error, please try again.', error);
        alert('An unexpected error occurred. Please try again later.');
    }
});
