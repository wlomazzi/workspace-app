// Top menu: Open the menu when clicking on the menu icon (sandwich icon)
function toggleMenu() {
    const menu = document.getElementById("menu");
    if (menu.style.display === "block") {
        menu.style.display = "none";
    } else {
        menu.style.display = "block";
    }
}

// Top menu: Close the menu when clicking outside of it (close sandwich icon menu)
document.addEventListener("click", function(event) {
    const menu = document.getElementById("menu");
    const menuIcon = document.querySelector(".menu-icon");
    
    if (!menu.contains(event.target) && !menuIcon.contains(event.target)) {
        menu.style.display = "none";
    }
});


// Submiting the login form
document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const user_id = document.getElementById("user_id").value;
    const user_password = document.getElementById("user_password").value;

    const response = await fetch("http://localhost:3000/api/users/login", {  // Changind the URL to the login API
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ user_id, user_password })
    });

    const result = await response.json();

    if (result.success) {
        alert("Login Successfull!");
        window.location.replace("index.html");  // Redirect to default page
    } else {
        alert(result.message);  // Show the error message
    }
});
