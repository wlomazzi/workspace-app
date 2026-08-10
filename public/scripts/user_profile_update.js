const user = localStorage.getItem('user_id');

// Shared inline feedback area (below the role checkboxes). Green for success, red for errors.
// Replaces every alert() on this page with non-blocking, in-page messages.
function showMessage(text, type = 'error', autoHideMs = null) {
    const messageDiv = document.getElementById("message");
    if (!messageDiv) return;

    messageDiv.textContent = text;
    messageDiv.style.color = type === 'success' ? '#1fa855' : '#ff00009a';

    if (autoHideMs) {
        setTimeout(function () {
            if (messageDiv.textContent === text) messageDiv.textContent = '';
        }, autoHideMs);
    }
}

function clearMessage() {
    const messageDiv = document.getElementById("message");
    if (messageDiv) messageDiv.textContent = '';
}

if (!user) {
    // No blocking alert - just send the user to the login page.
    window.location.href = 'login.html';
}

document.addEventListener("DOMContentLoaded", function () {
    if (!user) return;

    const userEmail      = localStorage.getItem('user_email');  // Get the user's email from localStorage
    const userPhone      = localStorage.getItem('user_phone');  // Get the user's phone from localStorage
    const userLocation   = localStorage.getItem('user_location');  // Get the user's location from localStorage
    const userFullName   = localStorage.getItem('user_fullname');  // Get the full name of the localStorage user
    const userProfilePic = localStorage.getItem('user_picture');  // Get the username avatar from localStorage
    const userIsOwner    = localStorage.getItem('user_owner');  // Check if the user is an owner
    const userIsCoworker = localStorage.getItem('user_coworker');  // Check if the user is a coworker

    // Populate the fields with the logged-in user's data
    document.getElementById("user-fullName").value = userFullName;
    document.getElementById("user-email").value = userEmail;
    document.getElementById("user-phone").value = userPhone;
    document.getElementById("user-location").value = userLocation;
    document.getElementById("profile-pic").src = userProfilePic;

    document.getElementById("is_owner").checked = (userIsOwner === 'true');

    // For Coworker, ensure it cannot be unchecked
    const coworkerCheckbox = document.getElementById("is_coworker");
    coworkerCheckbox.checked = (userIsCoworker === 'true');

    // Prevent unchecking coworker checkbox
    coworkerCheckbox.addEventListener('change', function() {
        if (!this.checked) {
            this.checked = true;  // Re-check the checkbox if it gets unchecked
            showMessage("The 'Coworker' profile is the default and cannot be unchecked. However, you can select the 'Owner' profile if applicable.", 'error', 10000);
        }
    });
});


// Function to validate the content typed in the phone field
document.getElementById("user-phone").addEventListener("blur", function(event) {
    let phone = event.target.value;
    // Remove non-numeric characters
    phone = phone.replace(/\D/g, "");

    // Checks if the number has 10 or 11 digits (not counting the country code)
    if (phone.length === 10 || phone.length === 11) {
        // Formats the number in the format (999) 999-9999
        phone = phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
    } else {
        showMessage("Invalid phone number!", 'error', 5000);
        phone = "";
    }

    // Sets the formatted value in the input field
    event.target.value = phone;
});


// Add an event listener to the "Update Profile" button
const updateProfileBtn = document.getElementById("updateProfile");

updateProfileBtn.addEventListener("click", async function () {
    clearMessage();

    // Collect the form data
    const user_id   = user;
    const fullName  = document.getElementById("user-fullName").value;
    const phone     = document.getElementById("user-phone").value;
    const location  = document.getElementById("user-location").value;
    const isOwner   = document.getElementById("is_owner").checked;  // Check if the 'Owner' checkbox is checked

    // Validate if all required fields are filled
    if (!fullName || !phone || !location) {
        showMessage("Please fill out all the required fields.");
        return;
    }

    // Validate if the user is logged in (check JWT or localStorage)
    const access_token = localStorage.getItem('access_token');
    if (!access_token) {
        showMessage("Your session has expired. Please log in again.");
        return;
    }

    // Prepare the data to send
    const profileData = {
        user_id: user_id,
        full_name: fullName,
        location: location,
        phone: phone,
        is_owner: isOwner,
        is_coworker: true  // Always set to TRUE as per the request
    };

    updateProfileBtn.disabled = true;
    updateProfileBtn.textContent = "Saving...";

    try {
        // Send the updated data to the backend
        const response = await fetch('/api/users/user_login/profile_update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`,
            },
            body: JSON.stringify(profileData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Keep localStorage in sync with what was just saved
            localStorage.setItem('user_fullname', fullName);
            localStorage.setItem('user_phone', phone);
            localStorage.setItem('user_location', location);
            localStorage.setItem('user_owner', isOwner);
            localStorage.setItem('user_coworker', true);

            showMessage("Profile updated successfully.", 'success');
            updateProfileBtn.textContent = "Saved!";

            // Brief pause so the success message is actually visible before navigating away
            setTimeout(function () {
                window.location.href = "user_profile.html";
            }, 700);
        } else {
            showMessage("Failed to update the profile: " + (result.message || "Please try again."));
            updateProfileBtn.disabled = false;
            updateProfileBtn.textContent = "Update Profile";
        }
    } catch (error) {
        console.error("Error updating profile:", error);
        showMessage("An error occurred while updating the profile. Please try again.");
        updateProfileBtn.disabled = false;
        updateProfileBtn.textContent = "Update Profile";
    }
});


// CHANGE PASSWORD -----------------------------------------------------------------------------
const toggleBtn = document.getElementById("togglePasswordSection");
const passwordSection = document.getElementById("passwordSection");
const passwordMessage = document.getElementById("passwordMessage");
const updatePasswordBtn = document.getElementById("updatePassword");

function showPasswordMessage(text, type = 'error') {
    passwordMessage.textContent = text;
    passwordMessage.className = `password-message ${type}`;
    passwordMessage.hidden = false;
}

function clearPasswordMessage() {
    passwordMessage.hidden = true;
    passwordMessage.textContent = '';
}

if (toggleBtn && passwordSection) {
    toggleBtn.addEventListener("click", function () {
        const isOpen = !passwordSection.hidden;
        passwordSection.hidden = isOpen;
        toggleBtn.setAttribute("aria-expanded", String(!isOpen));
    });
}

if (updatePasswordBtn) {
    updatePasswordBtn.addEventListener("click", async function () {
        clearPasswordMessage();

        const currentPassword = document.getElementById("current-password").value;
        const newPassword = document.getElementById("new-password").value;
        const confirmNewPassword = document.getElementById("confirm-new-password").value;
        const email = localStorage.getItem('user_email');

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            showPasswordMessage("Please fill in all password fields.");
            return;
        }

        if (newPassword.length < 6) {
            showPasswordMessage("The new password must be at least 6 characters long.");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showPasswordMessage("New password and confirmation do not match.");
            return;
        }

        if (newPassword === currentPassword) {
            showPasswordMessage("The new password must be different from the current password.");
            return;
        }

        updatePasswordBtn.disabled = true;
        updatePasswordBtn.textContent = "Updating...";

        try {
            const response = await fetch('/api/users/user_login/change_password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showPasswordMessage("Password updated successfully.", 'success');
                document.getElementById("current-password").value = "";
                document.getElementById("new-password").value = "";
                document.getElementById("confirm-new-password").value = "";
            } else {
                showPasswordMessage(result.error || "Failed to update password. Please try again.");
            }
        } catch (error) {
            console.error("Error changing password:", error);
            showPasswordMessage("An error occurred while updating the password. Please try again.");
        } finally {
            updatePasswordBtn.disabled = false;
            updatePasswordBtn.textContent = "Update Password";
        }
    });
}


// JavaScript to handle image upload
document.getElementById("profile-pic").addEventListener("click", function () {
    // Trigger the hidden file input when the profile image is clicked
    document.getElementById("fileInput").click();
});


document.getElementById("fileInput").addEventListener("change", async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    clearMessage();

    if (!user) {
        showMessage("You must be logged in to upload an image.");
        return;
    }

    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
        showMessage("Please select a valid image file.");
        return;
    }

    const access_token = localStorage.getItem('access_token');
    if (!access_token) {
        showMessage("Your session has expired. Please log in again.");
        return;
    }

    const formData = new FormData();
    formData.append("user_id", user);
    formData.append("file", file);

    const profilePicElement = document.getElementById("profile-pic");
    const previousSrc = profilePicElement.src;
    profilePicElement.style.opacity = "0.5"; // subtle loading feedback on the avatar itself

    try {
        const response = await fetch("/api/users/user_login/profile_picture", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
            },
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            profilePicElement.src = result.avatar_url;
            localStorage.setItem('user_picture', result.avatar_url);
            showMessage("Profile photo updated.", 'success', 4000);
        } else {
            profilePicElement.src = previousSrc;
            showMessage("Failed to update profile picture.");
        }
    } catch (error) {
        console.error("Error uploading image:", error);
        profilePicElement.src = previousSrc;
        showMessage("An error occurred while uploading the image.");
    } finally {
        profilePicElement.style.opacity = "1";
    }
});
