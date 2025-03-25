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

