const user = localStorage.getItem('user_id');

if (user) {
    // User is logged in, can send the token to the server or do other actions
    //console.log('Users is logged - ID: ', user);
} else {
    // User is not logged in
    alert("User is not logged in. Please log in to access this page.");
    // Redirect to login page or show a message
    window.location.href = 'login.html'; // Uncomment this line to redirect to login page
    console.log('User is not logged in');
}


document.addEventListener("DOMContentLoaded", function () {
    if (user) {

        const userId         = localStorage.getItem('user_id');  // Get the user ID from localStorage
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
        //document.getElementById("is_coworker").checked = (userIsCoworker === 'true');        

        // For Coworker, ensure it cannot be unchecked
        const coworkerCheckbox = document.getElementById("is_coworker");
        coworkerCheckbox.checked = (userIsCoworker === 'true');

        // Prevent unchecking coworker checkbox
        coworkerCheckbox.addEventListener('change', function() {
            if (!this.checked) {
                this.checked = true;  // Re-check the checkbox if it gets unchecked

                // Show message below the checkboxes
                const messageDiv = document.getElementById("message");
                messageDiv.innerHTML = "The 'Coworker' profile is the default and cannot be unchecked. However, you can select the 'Owner' profile if applicable.";

                // Make the message disappear after 10 seconds
                setTimeout(function() {
                    messageDiv.innerHTML = ''; // Clears the message
                }, 10000);  // 10000 milliseconds = 10 seconds
            }
        });      

        // Add an event listener for the Update Profile button
//        document.getElementById("updateProfile").addEventListener("click", updateProfile);
    } else {
        // If no user data is found, redirect to login
        alert("You need to log in to edit your profile.");
        window.location.href = "login.html";
    }
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
        // If the number is not the correct size, leave it empty. Show message below the checkboxes
        const messageDiv = document.getElementById("message");
        messageDiv.innerHTML = "Invalid phone number!";
        // Make the message disappear after 5 seconds
        setTimeout(function() {
            messageDiv.innerHTML = ''; // Clears the message
        }, 5000);  // 5000 milliseconds = 5 seconds
        phone = "";
    }

    // Sets the formatted value in the input field
    event.target.value = phone;
});





// Add an event listener to the "Update Profile" button
document.getElementById("updateProfile").addEventListener("click", async function () {
    // Collect the form data
    const user_id   = user;  // Ensure `user` variable is defined correctly
    const fullName  = document.getElementById("user-fullName").value;
    const phone     = document.getElementById("user-phone").value;
    const location  = document.getElementById("user-location").value;
    const isOwner   = document.getElementById("is_owner").checked;  // Check if the 'Owner' checkbox is checked

    // Validate if all required fields are filled
    if (!fullName || !phone || !location) {
        alert("Please fill out all the required fields.");
        return;
    }

    // Validate if the user is logged in (check JWT or localStorage)
    const access_token = localStorage.getItem('access_token');
    if (!access_token) {
        alert("You need to be logged in to update the profile.");
        return;
    }

    // Prepare the data to send
    const profileData = {
        user_id: user_id,  // The user's ID
        full_name: fullName,
        location: location,
        phone: phone,
        is_owner: isOwner,  // Pass the value of the 'Owner' checkbox
        is_coworker: true  // Always set to TRUE as per the request
    };

    try {
        // Send the updated data to the backend
        const response = await fetch('/api/users/user_login/profile_update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`,  // Pass the JWT token in the header
            },
            body: JSON.stringify(profileData)  // Send the profile data in the body of the request
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // If the update is successful
            alert("Profile updated successfully.");
            console.log('result:', result);

            // Update localStorage with the new data
            const updatedUserData = {
                ...profileData,  // Include all updated data
                profilePic: user.profilePic // Optionally, update profile picture if needed
            };

            // Update localStorage with the new data
            localStorage.setItem("loggedUser", JSON.stringify(updatedUserData));

            // Optionally, update sessionStorage as well
            //sessionStorage.setItem("loggedUser", JSON.stringify(updatedUserData));

            // Update the fields on the page with the new data
            updateProfileFields(updatedUserData);

            // Redirection after updating fields (no page refresh needed)
            window.location.href = "user_profile.html"; // Redirect to the user profile page
        } else {
            alert("Failed to update the profile: " + (result.message || "Try again."));
        }
    } catch (error) {
        console.error("Error updating profile:", error);
        alert("An error occurred while updating the profile.");
    }
});

// Function to update the fields on the page with the new data
function updateProfileFields(updatedUserData) {
    // Update the form fields on the page with the new values
    document.getElementById("user-fullName").value = updatedUserData.full_name;
    document.getElementById("user-phone").value = updatedUserData.phone;
    document.getElementById("user-location").value = updatedUserData.location;

    // Optionally update the profile picture if it was changed
    if (updatedUserData.profilePic) {
        document.getElementById("profile-pic").src = updatedUserData.profilePic;
    }
}








// JavaScript to handle image upload
document.getElementById("profile-pic").addEventListener("click", function () {
    // Trigger the hidden file input when the profile image is clicked
    document.getElementById("fileInput").click();
});


document.getElementById("fileInput").addEventListener("change", async function (event) {
    const file = event.target.files[0];

    if (file) {
        // Ensure the user is logged in
//        const user = JSON.parse(sessionStorage.getItem("loggedUser"));
        if (!user) {
            alert("You must be logged in to upload an image.");
            return;
        }

        // Check if the file is an image
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        // Create a FormData to send the file
        const formData = new FormData();
        formData.append("user_id", user);  // Send the user ID
        formData.append("file", file);  // Enviar o arquivo

        // Get the JWT token from localStorage
        const access_token = localStorage.getItem('access_token');
        if (!access_token) {
            alert("Authentication token not found.");
            return;
        }

        try {
            // Send the file to the backend
            const response = await fetch("/api/users/user_login/profile_picture", {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,  // Pass the JWT token in the header
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Update the profile picture on the page with the new URL
                // document.getElementById("profile-pic").src = result.newImageUrl;
                alert("Profile image updated successfully.");
            } else {
                alert("Failed to update profile picture.");
            }
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("An error occurred while uploading the image.");
        }
    }
});

