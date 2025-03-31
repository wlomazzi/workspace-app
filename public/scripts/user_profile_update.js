// Get the user data from sessionStorage
const user = JSON.parse(sessionStorage.getItem("loggedUser"));

document.addEventListener("DOMContentLoaded", function () {
    if (user) {
        // Populate the fields with the logged-in user's data
        document.getElementById("user-firstName").value = user.firstName;
        document.getElementById("user-lastName").value = user.lastName;
        document.getElementById("user-email").value = user.email;
        document.getElementById("user-location").value = user.location;
        document.getElementById("profile-pic").src = user.profilePic;

        // Add an event listener for the Update Profile button
        document.getElementById("updateProfile").addEventListener("click", updateProfile);
    } else {
        // If no user data is found, redirect to login
        alert("You need to log in to edit your profile.");
        window.location.href = "login.html";
    }
});

// Function to handle updating the profile
async function updateProfile() {
    const updatedFirstName = document.getElementById("user-firstName").value;
    const updatedLastName = document.getElementById("user-lastName").value;
    const updatedEmail = document.getElementById("user-email").value;
    const updatedLocation = document.getElementById("user-location").value;

    // Validate the form
    if (!updatedFirstName || !updatedLastName || !updatedEmail || !updatedLocation) {
        alert("Please fill out all fields.");
        return;
    }

    // Prepare the updated data to send
    const updatedUserData = {
        user_id: user.user_id,  // Get user_id from sessionStorage
        firstName: updatedFirstName,
        lastName: updatedLastName,
        email: updatedEmail,
        location: updatedLocation,
        profilePic: user.profilePic // Profile picture is not being updated in this example
    };

    // Send the updated data to the server
    try {
        const response = await fetch("http://localhost:3000/api/users/update", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updatedUserData)
        });

        const result = await response.json();

        if (result.success) {
            // Update the sessionStorage with the new data
            sessionStorage.setItem("loggedUser", JSON.stringify(updatedUserData));

            // Show success message and redirect
            alert("Profile updated successfully!");
            window.location.href = "index.html"; // Redirect to home page or dashboard
        } else {
            alert(result.message); // Show error message from server
        }
    } catch (error) {
        console.error("Error updating profile:", error);
        alert("Failed to update profile. Please try again later.");
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
        // Ensure user data is fetched correctly
        const user = JSON.parse(sessionStorage.getItem("loggedUser"));
        console.log(user);

        if (!user || !user.user_id) {
            alert("User is not logged in.");
            return;
        }

        // Check if the file is an image
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        // Create a FormData object to send the image to the server
        const formData = new FormData();

        // Append the image and user_id to the form data
        formData.append("user_id", user.user_id);
        formData.append("image", file);

        // Debugging the FormData - log its content
        for (let pair of formData.entries()) {
            if (pair[0] === "image") {
                console.log(`${pair[0]}: ${pair[1].name} (${pair[1].size} bytes, ${pair[1].type})`); // Log the file name, size and type
            } else {
                console.log(pair[0] + ": " + pair[1]); // Log the other form data values
            }
        }

        try {
            const response = await fetch("http://localhost:3000/api/users/update/profile_picture", {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Update the profile image source on the page
                document.getElementById("profile-pic").src = `/img_profile/user_${user.user_id}.jpg`;
                alert("Profile picture updated successfully.");
            } else {
                alert("Failed to update profile picture.");
            }
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("An error occurred while uploading the image.");
        }

    }
});

