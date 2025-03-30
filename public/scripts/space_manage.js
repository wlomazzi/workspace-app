
// Function to get the user session
const user = JSON.parse(sessionStorage.getItem("loggedUser"));
let latitude  = 0;
let longitude = 0;


// START INSERT or UPDATE the space *********************************************************************************************************/
document.addEventListener("DOMContentLoaded", async function() {
    const spaceId = new URLSearchParams(window.location.search).get('space_id'); // Get space_id from URL
    
    // [ INSERT ]
    if (!spaceId) {
        // We are creating a new space, so the form is empty
        // Change button text to "Update Space" and the H2 text to "Edit space for work"
        document.querySelector("button[type='submit']").textContent = "Add New Space";
        document.querySelector("h2").textContent = "Add a New Space";

        // Handle form submission for creating new space
        document.getElementById("spaceForm").addEventListener("submit", function(event) {
            event.preventDefault();
            createSpace();
        });        
    }else{
        // [ UPDATE ]
        try {

            // Change button text to "Update Space" and the H2 text to "Edit space for work"
            document.querySelector("button[type='submit']").textContent = "Update Space";
            document.querySelector("h2").textContent = "Edit space for work";

            // Fetch the spaces data (assuming it's stored in a local file or endpoint)
            const response  = await fetch("http://localhost:3000/api/spaces");  // Your API endpoint to fetch spaces data - GET Space data
            const allSpaces = await response.json();
    
            // Find the space by space_id
            const space = allSpaces.find(space => space.id === parseInt(spaceId)); // Ensure you compare using the correct type (int or string)
            
            if (!space) {
                alert("Space not found.");
                return;
            }

            // Only one result — use directly
            latitude  = parseFloat(space.latitude);
            longitude = parseFloat(space.longitude);

            // Populate the form with the data from the space
            document.getElementById("title").value = space.title;
            document.getElementById("details").value = space.details;
            document.getElementById("price").value = space.price;
            document.getElementById("address").value = space.address;
            document.getElementById("neighborhood").value = space.neighborhood;
            document.getElementById("workspace_seats").value = space.workspace_seats;
            document.getElementById("type").value = space.type;
            document.getElementById("lease_time").value = space.lease_time;
            document.getElementById("available_from").value = space.available_from;
    
            // Set amenities checkboxes
            document.getElementById("kitchen").checked = space.amenities.kitchen;
            document.getElementById("parking").checked = space.amenities.parking;
            document.getElementById("public_transport").checked = space.amenities.public_transport;
            document.getElementById("wifi").checked = space.amenities.wifi;
            document.getElementById("printer").checked = space.amenities.printer;
            document.getElementById("air_conditioning").checked = space.amenities.air_conditioning;
    
            // If you have images, handle the image display
            const imageInput = document.getElementById("images");
            // You can pre-fill the images input if needed or handle it differently
            // However, for security reasons, input fields like file inputs can't be populated by JS due to browser restrictions
            console.log(space.image);

            // Handle form submission for editing
            document.getElementById("spaceForm").addEventListener("submit", function(event) {
                event.preventDefault();
                updateSpace(spaceId);
            });            


        } catch (error) {
            console.error("Error loading space data:", error);
        }        
    }

});


// Function to create a new space
async function createSpace() {

    // Description: This script is used to add a new space to the database.
    document.getElementById("spaceForm").addEventListener("submit", async function(event) {
        event.preventDefault();

        console.log(user);
        if (user) {
            console.log("Logged in user: ", user.user_id, user.firstName);
        } else {
            // Redirect to login if not logged in
            window.location.href = "login.html";
        }

        const formData = new FormData(this); // Create FormData to send files and text


        event.preventDefault(); // Avoid automatic sending

        const imageInput = document.getElementById("images");
        const selectedFiles = imageInput.files;

        // Check the number of images
        if (selectedFiles.length === 0) {
            alert("Please select at least one image.");
            return;
        }

        // The usar can upload max 4 images
        if (selectedFiles.length > 4) {
            alert("You can upload a maximum of 4 images.");
            return;
        }

        // Check the type or size of each image
        for (let file of selectedFiles) {
            if (!file.type.startsWith("image/")) {
                alert("Only image files are allowed.");
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB limit per image 
                alert(`Image ${file.name} is too large (max 5MB).`);
                return;
            }
        }

        // Add geographic coordinates
        formData.append("latitude", latitude);
        formData.append("longitude", longitude);
        formData.append("user_id", user.user_id);


        try {
            // Call the api to add the data to JSON file / database 
            const response = await fetch("http://localhost:3000/api/spaces", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                alert("Space successfully added!");
                window.location.href = "index.html";  // Redirect to index page
            } else {
                alert("Error inserting the Space: " + result.message);
            }
        } catch (error) {
            console.error("Fetch error:", error);
            alert("Failed to connect to the server. Please check your internet or server status.");
        }
    });

}



// Function to update an existing space
async function updateSpace(spaceId) {
    const formData = new FormData(document.getElementById("spaceForm"));  // Get the form data as FormData object
    
    // Add the spaceId into the form data (in case it's not already part of the form)
    formData.append("id", spaceId); 

    // Add geographic coordinates
    formData.append("latitude", latitude);
    formData.append("longitude", longitude);

    // If the space has images, handle them as well
    const imageInput = document.getElementById("images");
    const selectedFiles = imageInput.files;

    // Check if the user selected new images
    if (selectedFiles.length > 0) {
        // The form already includes the image files with FormData, so no need to modify further
    } else {
        // In case no new images are selected, make sure the existing images are retained in FormData
        const existingImages = document.getElementById("existing-images").value;
        formData.append("existing_images", existingImages);  // Include the existing images in the update if any
    }

    try {
        // Send the form data (with images) to the server for updating
        const response = await fetch("http://localhost:3000/api/spaces", {
            method: "POST", // POST is used because the API logic decides whether to update or create
            body: formData // Send the FormData containing both text data and images
        });

        const result = await response.json();

        if (result.success) {
            alert("Space updated successfully!");
            window.location.href = "index.html"; // Redirect to home page or dashboard after update
        } else {
            alert(result.message); // Show the error message from the server
        }
    } catch (error) {
        console.error("Error updating space:", error);
        alert("Failed to update space. Please try again later.");
    }
}



// Function to gather the form data
function getFormData() {
    return {
        title: document.getElementById("title").value,
        details: document.getElementById("details").value,
        price: document.getElementById("price").value,
        address: document.getElementById("address").value,
        neighborhood: document.getElementById("neighborhood").value,
        workspace_seats: document.getElementById("workspace_seats").value,
        type: document.getElementById("type").value,
        lease_time: document.getElementById("lease_time").value,
        available_from: document.getElementById("available_from").value,
        amenities: {
            kitchen: document.getElementById("kitchen").checked,
            parking: document.getElementById("parking").checked,
            public_transport: document.getElementById("public_transport").checked,
            wifi: document.getElementById("wifi").checked,
            printer: document.getElementById("printer").checked,
            air_conditioning: document.getElementById("air_conditioning").checked
        },
        // Add geographic coordinates
        latitude: latitude,
        longitude: longitude
    };
}
// END Functions: CREATE / UPDATE space **************************************************************************************************/




// Function called when the address field loses focus
async function fetchCoordinatesFromAddress() {
    const addressInput = document.getElementById("address");
    const address = addressInput.value.trim();

    if (!address) return;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "work4fun-app/1.0 (email@exemplo.com)"
            }
        });

        const data = await response.json();
        // console.log("Data returned from API:", data);
        const neighborhoodField     = document.getElementById("neighborhood");

        if (data.length === 1) {
            // Only one result — use directly
            latitude  = parseFloat(data[0].lat);
            longitude = parseFloat(data[0].lon);

            //console.log("Unique coordinates:", latitude, longitude);
            //console.log(data);
            //console.log(data[0].display_name);
            const selectedNeighbourhood = data[0].display_name
            if (neighborhoodField && selectedNeighbourhood) {
                neighborhoodField.value = selectedNeighbourhood;
                //console.log("Filled neighborhood:", selectedNeighbourhood);
            } else {
                neighborhoodField.value = "";
                console.warn("Neighborhood not found in response.");
            }
            //showAddressOptions(data); // Show the form with the address
        } else if (data.length > 1) {
            // Multiple results — show modal
            showAddressOptions(data); 
        } else {
            neighborhoodField.value = "";
            alert("Address not found. Please check and try again.");
        }
    } catch (error) {
        console.error("Error fetching coordinates:", error);
    }
}


/*
  This function returns the data from the API that queries the address and 
  returns the geographic coordinates and the full address. */
  function showAddressOptions(addresses) {
    const modal = document.getElementById("addressModal");
    const list = document.getElementById("addressList");
    list.innerHTML = ""; // Limpa a lista

    // Cria as opções de endereço
    addresses.forEach((addr, index) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <label style="display: block; margin-bottom: 10px; margin-top: 10px; cursor: pointer;">
                <input type="radio" name="addressOption" value="${index}">
                ${addr.display_name}
            </label>
        `;
        list.appendChild(li);
    });

    // Container dos botões
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "modal-buttons";

    // Botão Confirmar
    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Confirm";
    confirmBtn.className = "modal-button";
    confirmBtn.onclick = () => {
        const selected = document.querySelector('input[name="addressOption"]:checked');
        if (!selected) {
            alert("Please select an address.");
            return;
        }

        const chosen = addresses[parseInt(selected.value)];
        latitude  = parseFloat(chosen.lat);
        longitude = parseFloat(chosen.lon);

        document.getElementById("address").value = chosen.display_name;

        const addressData = chosen.address || {};
        const neighborhoodField = document.getElementById("neighborhood");

        const selectedNeighbourhood =
            addressData.neighbourhood ||
            addressData.suburb ||
            addressData.city_district ||
            addressData.city ||
            addressData.town ||
            addressData.village ||
            extractNeighborhoodFromDisplayName(chosen.display_name);

        if (neighborhoodField && selectedNeighbourhood) {
            neighborhoodField.value = selectedNeighbourhood;
        }

        closeAddressModal();
    };

    // Botão Cancelar
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "modal-button modal-cancel";
    cancelBtn.onclick = closeAddressModal;

    // Adiciona os dois botões
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(confirmBtn);
    list.appendChild(buttonContainer);

    modal.style.display = "flex";
}

function extractNeighborhoodFromDisplayName(displayName) {
    if (!displayName) return "";

    const parts = displayName.split(",");
    if (parts.length >= 2) {
        return parts[1].trim(); // get the second part. Usually is where the neighborhood is
    }

    return "";
}

function closeAddressModal() {
    document.getElementById("addressModal").style.display = "none";
}
