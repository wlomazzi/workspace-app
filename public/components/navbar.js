document.addEventListener("DOMContentLoaded", function () {
    // Fetch the navbar HTML and insert it into the page first
    fetch("/components/navbar.html") // Path to the navbar HTML file
        .then(response => response.text()) // Convert the response to text
        .then(async html => {
            const navbarContainer = document.createElement("div");
            navbarContainer.innerHTML = html;

            // Insert the navbar HTML at the top of the body
            document.body.insertBefore(navbarContainer, document.body.firstChild);

            const userId    = localStorage.getItem('user_id');  // Get the user ID from localStorage
            const userEmail = localStorage.getItem('user_email');  // Get the user's email from localStorage

            if (userId) {
                //alert("User is logged in, ID: " + userId);
                try {
                    const response = await fetch('/api/users/user_login/session', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            user_id: userId,  // Pass the user_id in the request body
                        }),
                    });
            
                    const data = await response.json();
            
                    //console.log(data); // Here you we see the user data returned by the server

                    localStorage.setItem('user_picture' , data.profile.avatar_url);
                    localStorage.setItem('user_fullname', data.profile.full_name);
                    localStorage.setItem('user_location', data.profile.location);
                    localStorage.setItem('user_phone'   , data.profile.phone);
                    localStorage.setItem('user_coworker', data.profile.is_coworker);
                    localStorage.setItem('user_owner'   , data.profile.is_owner);

                    const profilePicElement = document.querySelector(".user-session-profile-pic");
                    if (profilePicElement) {
                        profilePicElement.src = data.profile.avatar_url;
                    }
    
                    const userNameElement = document.getElementById("user-session-name");
                    if (userNameElement) {
                        userNameElement.textContent = `${data.profile.full_name}`;
                    } else {
                        console.error("User name element not found.");
                    }
    
                    const userEmailElement = document.getElementById("user-session-email");
                    if (userEmailElement) {
                        userEmailElement.textContent = userEmail;
                    }
    
                    const userLocationElement = document.getElementById("user-session-location");
                    if (userLocationElement) {
                        userLocationElement.textContent = data.profile.location;
                    }
    

                } catch (error) {
                    console.error('Error in request:', error);
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



// Function to handle the logout process
async function logout() {
    try {
        const response = await fetch('/api/users/user_login/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (response.ok) {
            alert('Logout realized successfully! You will be redirected to the login page.');
            // Remove all user-related data from localStorage
            localStorage.removeItem('logged_user');
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_email');
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_picture');
            localStorage.removeItem('user_fullname');
            localStorage.removeItem('user_location');
            localStorage.removeItem('user_phone');
            localStorage.removeItem('user_coworker');
            localStorage.removeItem('user_owner');

            window.location.href = "index.html";
        } else {
            console.error('Logout error:', data.error);
            alert(data.error || 'Logout failed. Please try again.');
        }
    } catch (error) {
        console.error('Error during logout:', error);
        alert('Logout error, please try again.', error);
    }
}
