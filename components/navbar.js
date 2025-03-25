document.addEventListener("DOMContentLoaded", function () {
    // Fetch the navbar HTML and insert it into the page first
    fetch("/components/navbar.html") // Path to the navbar HTML file
        .then(response => response.text()) // Convert the response to text
        .then(html => {
            const navbarContainer = document.createElement("div");
            navbarContainer.innerHTML = html;

            // Insert the navbar HTML at the top of the body
            document.body.insertBefore(navbarContainer, document.body.firstChild);

            // Now we can safely access the navbar elements
            const user = JSON.parse(sessionStorage.getItem("loggedUser"));

            if (user) {

                const profilePicElement = document.querySelector(".user-session-profile-pic");
                if (profilePicElement) {
                    profilePicElement.src = user.profilePic;
                }

                const userNameElement = document.getElementById("user-session-name");
                if (userNameElement) {
                    userNameElement.textContent = `${user.firstName} ${user.lastName}`;
                } else {
                    console.error("User name element not found.");
                }

                const userEmailElement = document.getElementById("user-session-email");
                if (userEmailElement) {
                    userEmailElement.textContent = user.email;
                }

                const userLocationElement = document.getElementById("user-session-location");
                if (userLocationElement) {
                    userLocationElement.textContent = user.location;
                }

            }else{
                const profilePicElement = document.querySelector(".user-session-profile-pic");
                if (profilePicElement) {
                    profilePicElement.src = "user.profilePic";
                    profilePicElement.src = "/images/user_default.png";
                }

                const userNameElement = document.getElementById("user-session-name");
                if (userNameElement) {
                    userNameElement.textContent = "User";
                } else {
                    console.error("User name element not found.");
                }
            }
        })
        .catch(error => console.error("Error loading navbar:", error));
});



// Top menu: When clicking on the Home link, redirect to the home page
function menuHomeRedirect() {
    window.location.href = "index.html"; // Redirects to the homepage
}


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
    const menuIcon = document.querySelector(".user-icon");
    // Check if menu and menuIcon exist before using contains()
    if (menu && menuIcon && !menu.contains(event.target) && !menuIcon.contains(event.target)) {
        menu.style.display = "none";
    }
});

// Function to handle logout
function logout() {
    // Remove the logged-in user from sessionStorage
    sessionStorage.removeItem("loggedUser");

    // Optionally, redirect the user to the login page or homepage
    window.location.href = "index.html";  // Redirecting to login page
}