const user = localStorage.getItem('user_id');

if (user) {
    // User is logged in, can send the token to the server or do other actions
    //alert("User ID: " + user);
    //console.log('Users is logged - ID: ', user);
} else {
    // User is not logged in
    alert("User is not logged in. Please log in to access this page.");
    // Redirect to login page or show a message
    window.location.href = 'login.html'; // Uncomment this line to redirect to login page
    console.log('User is not logged in');
}

// When loaded, return all workspaces related to the user
// User OWNER
// User COWORKER
document.addEventListener("DOMContentLoaded", async function () {
    try {

        const userId = localStorage.getItem('user_id'); // Gets the user ID from localStorage
        const userEmail = localStorage.getItem('user_email'); // Get user email from localStorage
        const userPhone = localStorage.getItem('user_phone'); // Obtém o telefone do usuário
        const userLocation = localStorage.getItem('user_location'); // Get user's phone from localStorage
        const userFullName = localStorage.getItem('user_fullname'); // Gets the full name
        const userProfilePic = localStorage.getItem('user_picture'); // Get user profile picture from localStorage

        const userIsOwner    = localStorage.getItem('user_owner'); // Checks if the user is an owner
        const userIsCoworker = localStorage.getItem('user_coworker'); // Checks if the user is a coworker
        
        try {
            const response = await fetch('/api/spaces/workspaces/owner_spaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,  // Pass the user_id in the request body
                }),
            });

            const data = await response.json();

            // Build user data for owned spaces
            const userData = {
                name: userFullName,
                email: userEmail,
                phone: userPhone,
                location: userLocation,
                profilePic: userProfilePic,
                ownedSpaces: data.map(space => ({
                    id: space.id,
                    title: space.title,
                    location: space.neighborhood || "Unknown",
                    price: `C$ ${space.price} / ${space.lease_time}`,
                    image: space.image_01
                }))
            };

            // Fetch rented spaces for the user
            const respRentedSpaces = await fetch('/api/spaces/workspaces/coworker_spaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,  // Pass the user_id in the request body
                }),
            });

            // Check if the response status is OK (status code 200-299)
            if (!respRentedSpaces.ok) {
                throw new Error('Failed to fetch rented spaces');
            }

            // Parse the JSON response data
            const dataRentedSpaces = await respRentedSpaces.json();
            if (dataRentedSpaces.length === 0) {
                console.log('No rented spaces found for this user');
            } else {
                console.log('dataRentedSpaces:', dataRentedSpaces);
                const rentedSpaces = dataRentedSpaces.map(space => ({
                    id: space.workspace_id,
                    title: space.workspace.title,
                    location: space.workspace.neighborhood || "Unknown",
                    rented_from: space.start_time || "Unknown",
                    rented_to: space.end_time || "Unknown",
                    price: `C$ ${space.rent_price} / ${space.lease_time}`,
                    rent_total: `Rent total C$ ${space.rent_total}`,
                    image: space.workspace.image_01
                }));

                console.log('rentedSpaces:', rentedSpaces);
                // Now pass rentedSpaces to the populateSpacesRented function
                populateSpacesRented("rented-spaces", rentedSpaces);
            }

            // Fill user profile info
            document.getElementById("user-name").textContent = userData.name;
            document.getElementById("user-email").textContent = userData.email;
            document.getElementById("user-phone").textContent = userData.phone;
            document.getElementById("user-location").textContent = userData.location;
            document.querySelector(".profile-pic").src = userData.profilePic;
    
            // Populate spaces for the user
            document.querySelector('.add-new-btn').style.display = 'none'; // Show the button if true
            document.querySelector('.owner-spaces-section').style.display = 'none'; // Hide available spaces for rent
            document.querySelector('.owner-line').style.display = 'none'; // Show line between Spaces for Rent and Rented Spaces
            if (userIsOwner === 'true') {
                populateSpacesOwned("owned-spaces", userData.ownedSpaces);
                document.querySelector('.add-new-btn').style.display = 'block'; // Show the button if true
                document.querySelector('.owner-spaces-section').style.display = 'block'; // Show available spaces for rent
                document.querySelector('.owner-line').style.display = 'block'; // Show line between Spaces for Rent and Rented Spaces
            }

        } catch (error) {
            console.error('Error in the request:', error);
        }

    } catch (error) {
        console.error("Error loading user data:", error);
    }

    // Function to populate owned spaces
    function populateSpacesOwned(containerId, spaces) {
        const container = document.getElementById(containerId);
        container.innerHTML = "";
        spaces.forEach(space => {
            const spaceCard = document.createElement("div");
            spaceCard.classList.add("space-card");
            spaceCard.innerHTML = `
                <div onclick="window.location.href='space_manage.html?space_id=${space.id}'">
                    <img src="${space.image}" alt="${space.title}">
                    <h4>${space.title}</h4>
                    <p>${space.location}</p>
                    <p><strong>${space.price}</strong></p>
                </div>
            `;
            container.appendChild(spaceCard);
        });
    }

    // Function to populate rented spaces
    function populateSpacesRented(containerId, spaces) {
        const container = document.getElementById(containerId);
        container.innerHTML = "";  // Clear existing content
        spaces.forEach(space => {
            const spaceCard = document.createElement("div");
            spaceCard.classList.add("space-card");
            spaceCard.innerHTML = `
                <div class="spaces-rented" onclick="openSpaceDetails('${space.id}')">
                    <img src="${space.image}" alt="${space.title}">
                    <h4>${space.title}</h4>
                    <p>${space.location} / <strong>${space.price}</strong></p>
                    <p>${space.rented_from} to ${space.rented_to}</p>
                    <p><strong>${space.rent_total}</strong></p>
                </div>
            `;
            container.appendChild(spaceCard);
        });
    }

});

// Function to open space details page
function openSpaceDetails(spaceId) {
    window.location.href = `space_details.html?id=${spaceId}`;
}

document.querySelector(".add-new-btn").addEventListener("click", function () {
    window.location.href = "space_manage.html";
});
