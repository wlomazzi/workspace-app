
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
            localStorage.setItem('access_token', data.access_token);
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




/*
// Check if the user is already logged in
const user = JSON.parse(sessionStorage.getItem("loggedUser"));

// Submiting the login form
if (user) {
    // If the user is already logged in, display a message and redirect to index.html
    alert("You are already logged in.");
    window.location.replace("index.html"); // Redirect to homepage or dashboard
} else {

    // Proceed with the login form submission if the user is not logged in
    document.getElementById("loginForm").addEventListener("submit", async function(event) {
        event.preventDefault();
    
        const user_login    = document.getElementById("user_login").value;
        const user_password = document.getElementById("user_password").value;
    
        try {
            const response = await fetch("http://localhost:3000/api/users/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ user_login, user_password })
            });
    
            const result = await response.json();
    
            if (result.success) {
                alert("Login successful!");
    
                // Store the logged user in sessionStorage
                sessionStorage.setItem("loggedUser", JSON.stringify(result.user));
    
                // Check if there's a redirect URL saved in sessionStorage
                const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
                if (redirectUrl) {
                    // Redirect to the last visited page
                    window.location.href = redirectUrl;
                    // Optionally, clear the redirect URL after using it
                    sessionStorage.removeItem('redirectAfterLogin');
                } else {
                    // If no redirect URL is saved, go to the homepage
                    window.location.href = "index.html";
                }
            } else {
                alert(result.message); // Display login error message
            }
        } catch (error) {
            console.error("Login error:", error);
            alert("An unexpected error occurred. Please try again later.");
        }
    });
    

    /*
    document.getElementById("loginForm").addEventListener("submit", async function(event) {
        event.preventDefault();

        const user_login = document.getElementById("user_login").value;
        const user_password = document.getElementById("user_password").value;

        try {
            const response = await fetch("http://localhost:3000/api/users/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ user_login, user_password })
            });

            const result = await response.json();

            if (result.success) {
                alert("Login successful!");

                // Store the logged user in sessionStorage
                console.log(result.user);
                sessionStorage.setItem("loggedUser", JSON.stringify(result.user));

                // Redirect to homepage or dashboard
                window.location.replace("index.html");
            } else {
                alert(result.message); // Display login error message
            }
        } catch (error) {
            console.error("Login error:", error);
            alert("An unexpected error occurred. Please try again later.");
        }
    });
    
}
*/