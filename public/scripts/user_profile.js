
const user = JSON.parse(sessionStorage.getItem("loggedUser"));

document.addEventListener("DOMContentLoaded", async function () {
    try {

        //console.log(user);
        if (user) {
            //console.log("Logged in user: ", user.user_id, user.firstName);
        } else {
            // Redirect to login if not logged in
//            window.location.href = "login.html";
        }

        // Fetch owned spaces
        const ownedResponse = await fetch("http://localhost:3000/api/spaces");
        const allOwnedSpaces = await ownedResponse.json();
        const ownedSpaces = allOwnedSpaces.filter(space => space.user_id === user.user_id);

        // Fetch rented spaces
        const rentedResponse  = await fetch("http://localhost:3000/api/spaces_rented");
        const allRentedSpaces = await rentedResponse.json();
        const rentedSpaces = allRentedSpaces.filter(space => space.user_rent === user.user_id);

        console.log(rentedSpaces);

        // Build user data
        const userData = {
            name: user.firstName + ' ' +  user.lastName,
            email: user.email,
            location: user.location,
            profilePic: user.profilePic,
            ownedSpaces: ownedSpaces.map(space => ({
                id: space.id,
                title: space.title,
                location: space.neighborhood || "Unknown",
                price: `C$ ${space.price}/${space.lease_time}`,
                image: space.image
            })),
            rentedSpaces: rentedSpaces.map(space => ({
                id: space.id,
                title: space.title,
                location: space.neighborhood || "Unknown",
                rented_from: space.rented_from || "Unknown",
                rented_to: space.rented_to || "Unknown",
                price: `C$ ${space.price}/${space.lease_time}`,
                rent_total: `Rent total C$ ${space.rent_total}`,
                image: space.image
            }))
        };

        //console.log(userData.rentedSpaces);
        // Fill user profile info
        document.getElementById("user-name").textContent = userData.name;
        document.getElementById("user-email").textContent = userData.email;
        document.getElementById("user-location").textContent = userData.location;
        document.querySelector(".profile-pic").src = userData.profilePic;

        // Populate spaces
        populateSpacesOwned("owned-spaces", userData.ownedSpaces);
        populateSpacesRented("rented-spaces", userData.rentedSpaces);

    } catch (error) {
        console.error("Error loading user data:", error);
    }

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
                </a>
            `;
            container.appendChild(spaceCard);
        });
    }

    function populateSpacesRented(containerId, spaces) {
        const container = document.getElementById(containerId);
        container.innerHTML = "";
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


function openSpaceDetails(spaceId) {
    window.location.href = `space_details.html?id=${spaceId}`;
}


document.querySelector(".add-new-btn").addEventListener("click", function () {
    window.location.href = "space_manage.html";
});