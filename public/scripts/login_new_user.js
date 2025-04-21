document.getElementById("registerForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const user_login    = document.getElementById("user_login").value;
    const user_password = document.getElementById("user_password").value;

    const response = await fetch("http://localhost:3000/api/users/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ user_login, user_password })
    });

    const result = await response.json();
    //alert(result.message);

    if (result.success) {
        window.location.replace("login.html");  // Forcing the browser to navigate to the login page
    }else {
        alert(result.message);
    }

});



// This script handles the login functionality for the user interface. It captures the form submission, 
// sends the login credentials to the server, and handles the response.
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    //const fullName = document.getElementById('user_fullname').value;
    const fullName = '';
    const email    = document.getElementById('user_login').value;
    const password = document.getElementById('user_password').value;

    try {
        const response = await fetch('/api/users/user_login/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
                fullName
            }),
        });

        const data = await response.json();

        if (response.ok) {
            // Register successful
            alert("User registered successfully");

            //localStorage.setItem('access_token', data.access_token);
            //localStorage.setItem('user_id', data.user.id);
            //localStorage.setItem('user_email', data.user.email);

            window.location.href = 'login.html'; 
        } else {
            // Shows the error message returned by the API
            alert(data.error || 'Register failed. Please try again.');
        }
    } catch (error) {
        console.error('Register error, please try again.', error);
        alert('An unexpected error occurred. Please try again later.');
    }
});
