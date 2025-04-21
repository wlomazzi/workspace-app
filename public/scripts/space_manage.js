// Function to get the user session
//const user    = JSON.parse(sessionStorage.getItem("loggedUser"));
const user  = localStorage.getItem('user_id');  // Get the user ID from localStoragelet latitude  = 0;
let longitude = 0;



document.addEventListener("DOMContentLoaded", async function () {
    const spaceId = new URLSearchParams(window.location.search).get('space_id');  // Get space_id from URL

    // Seleciona todas as imagens (thumbnails) clicáveis
    const imageBoxes = document.querySelectorAll(".image-box");

    imageBoxes.forEach((box, index) => {
        const imageInput = document.getElementById(`imageInput${index + 1}`);
        const image = document.getElementById(`image${index + 1}`);
        
        // Torna a imagem clicável
        image.addEventListener("click", function() {
            // Aciona o input file clicando na imagem
            imageInput.click();
        });

        // Manipula a seleção de arquivos no input
        imageInput.addEventListener("change", function(event) {
            const file = event.target.files[0];

            if (file) {
                const reader = new FileReader();
                reader.onloadend = function() {
                    // Substitui a imagem do thumbnail pela imagem selecionada
                    image.src = reader.result;
                    image.style.display = "block"; // Torna a imagem visível
                };
                reader.readAsDataURL(file); // Lê a imagem como base64
            }
        });
    });
    
    
    if (!spaceId) {
        if (!user){
            alert("Insert not allowed. User not loged in.");
            window.location.href = "/login.html"; // Redirect to login page
        }else{
            document.querySelector("h2#form-title").textContent = "Insert Workspace";
            document.querySelector("button[type='submit']").textContent = "Insert Workspace";
            populateImages('none');  // Assuming workspace is an array and we're fetching the first object
        }
        return;
    }else{
        document.querySelector("h2#form-title").textContent = "Edit Workspace";
        document.querySelector("button[type='submit']").textContent = "Update Workspace";
    }

    // Fetch workspace data from the API using the spaceId
    try {

        const response = await fetch(`/api/spaces/workspaces?id=${spaceId}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch workspace data: ${response.statusText}`);
        }

        const workspaceData = await response.json();

        if (workspaceData.length === 0) {
            alert("Workspace not found.");
            return;
        }
        
        // Populate the form with the fetched data
        const workspace = workspaceData[0];  // Assuming the response returns an array with one object
        //console.log('workspace:',workspace); debug JSON return

        // Populate text fields
        document.getElementById("title").value = workspace.title;
        document.getElementById("details").value = workspace.details;
        document.getElementById("price").value = workspace.price;
        document.getElementById("lease_time").value = workspace.lease_time;
        document.getElementById("workspace_seats").value = workspace.seats;
        document.getElementById("address").value = workspace.address;
        document.getElementById("neighborhood").value = workspace.neighborhood;
        document.getElementById("available_from").value = workspace.available_from;

        latitude  = workspace.latitude;
        longitude = workspace.longitude;
        
        // Populate amenities (checkboxes)
        document.getElementById("amn_kitchen").checked = workspace.amn_kitchen;
        document.getElementById("amn_parking").checked = workspace.amn_parking;
        document.getElementById("amn_public_transport").checked = workspace.amn_public_transport;
        document.getElementById("amn_wifi").checked = workspace.amn_wifi;
        document.getElementById("amn_printer").checked = workspace.amn_printer;
        document.getElementById("amn_air").checked = workspace.amn_air;
        document.getElementById("amn_smoking").checked = workspace.amn_smoking;

        document.getElementById("workspace-status").checked = workspace.active;

        console.log('workspace',workspace);

        // Populate images
        if (workspace){
            populateImages(workspace);  // Assuming workspace is an array and we're fetching the first object
        } else {
            console.error("Workspace not found");
        }

        // You can set additional fields or handle more image previews as needed
    } catch (error) {
        console.error("Error loading workspace data:", error);
        alert("Failed to load workspace data.");
    }
});



// Function to populate images from workspace data
function populateImages(workspace) {
    // Check if workspace has image URLs and set the src attributes for the thumbnails

    if (workspace.image_01) {
        document.getElementById("image1").src = workspace.image_01;
        document.getElementById("image1").style.display = "block";  // Make the image visible
    }else{
        document.getElementById("image1").src ='https://taeieijsgxjagfulbndt.supabase.co/storage/v1/object/public/workspaces/spaces/000.jpg';
        document.getElementById("image1").style.display = "block";  // Make the image visible
    }

    if (workspace.image_02) {
        document.getElementById("image2").src = workspace.image_02;
        document.getElementById("image2").style.display = "block";
    }else{
        document.getElementById("image2").src ='https://taeieijsgxjagfulbndt.supabase.co/storage/v1/object/public/workspaces/spaces/000.jpg';
        document.getElementById("image2").style.display = "block";  // Make the image visible
    }
    if (workspace.image_03) {
        document.getElementById("image3").src = workspace.image_03;
        document.getElementById("image3").style.display = "block";
    }else{
        document.getElementById("image3").src ='https://taeieijsgxjagfulbndt.supabase.co/storage/v1/object/public/workspaces/spaces/000.jpg';
        document.getElementById("image3").style.display = "block";  // Make the image visible
    }
    if (workspace.image_04) {
        document.getElementById("image4").src = workspace.image_04;
        document.getElementById("image4").style.display = "block";
    }else{
        document.getElementById("image4").src ='https://taeieijsgxjagfulbndt.supabase.co/storage/v1/object/public/workspaces/spaces/000.jpg';
        document.getElementById("image4").style.display = "block";  // Make the image visible
    }
}



// Function to update the workspace data
document.getElementById("spaceForm").addEventListener("submit", async function(event) {
    event.preventDefault(); 

    const spaceId = new URLSearchParams(window.location.search).get('space_id'); // Get the ID space from the URL
    //const user    = JSON.parse(sessionStorage.getItem("loggedUser"));  // Get the logged in user

    if (!user) {
        alert("You need to be logged in to update the workspace.");
        return;
    }

    const updatedData = {
        user_id: user,
        space_id: spaceId,
        title: document.getElementById("title").value,
        details: document.getElementById("details").value,
        price: document.getElementById("price").value,
        address: document.getElementById("address").value,
        neighborhood: document.getElementById("neighborhood").value,
        seats: document.getElementById("workspace_seats").value,
        type: document.getElementById("type").value,
        lease_time: document.getElementById("lease_time").value,
        latitude: latitude,
        longitude: longitude,
        available_from: document.getElementById("available_from").value,
        amn_kitchen: document.getElementById("amn_kitchen").checked,
        amn_parking: document.getElementById("amn_parking").checked,
        amn_public_transport: document.getElementById("amn_public_transport").checked,
        amn_wifi: document.getElementById("amn_wifi").checked,
        amn_printer: document.getElementById("amn_printer").checked,
        amn_air: document.getElementById("amn_air").checked,
        amn_smoking: document.getElementById("amn_smoking").checked,

        active: document.getElementById("workspace-status").checked,

        // Images should be passed as URLs, update them if new images are selected
        image_01: document.getElementById("image1").src,
        image_02: document.getElementById("image2").src,
        image_03: document.getElementById("image3").src,
        image_04: document.getElementById("image4").src
        
    };

    // Send the updated data to the backend
    try {

        let api_type = '';
        if (spaceId && spaceId.trim() !== ""){
            api_type = 'update';
        }else{
            api_type = 'insert';
        }

        const response = await fetch(`/api/spaces/workspaces/${api_type}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedData)
        });

        console.log(`${api_type}Data: `, updatedData);

        const result = await response.json();

        if (result.success) {
            console.log('result:',result);
            alert("Workspace updated successfully.");
            //window.location.href = "/workspace_details.html?space_id=" + spaceId;  // Redirect to the updated workspace page
        } else {
            alert("Failed to update workspace: " + result.error);
        }
    } catch (error) {
        console.error("Error updating workspace:", error);
        alert("An error occurred while updating the workspace.");
    }
});



async function uploadImageToBackend(event, imageCode) {
    const spaceId = new URLSearchParams(window.location.search).get('space_id');  // Get the space_id from the URL
    const file    = event.target.files[0];  // Get the selected image file

    if (!file || !spaceId) {
        alert("Invalid file or space ID.");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);  // Add the file to the request
    formData.append("space_id", spaceId);  // Add the space_id
    formData.append("image_code", imageCode);  // Add the image code (image_01, image_02, etc.)

    try {
        const response = await fetch("/api/spaces/workspaces/upload_image", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("access_token")}`,  // If necessary, pass the token in the header
            },
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            //alert("Image uploaded and workspace updated successfully!");
            // Here we can update the image view or provide other feedback.
        } else {
            alert("Failed to upload image: " + result.message);
        }
    } catch (error) {
        console.error("Error uploading image:", error);
        alert("An error occurred while uploading the image.");
    }
}

// Attach the event listener for each image input
document.getElementById("imageInput1").addEventListener("change", function(event) {
    uploadImageToBackend(event, "image_01");  // Passa o código da imagem para o backend
});
document.getElementById("imageInput2").addEventListener("change", function(event) {
    uploadImageToBackend(event, "image_02");
});
document.getElementById("imageInput3").addEventListener("change", function(event) {
    uploadImageToBackend(event, "image_03");
});
document.getElementById("imageInput4").addEventListener("change", function(event) {
    uploadImageToBackend(event, "image_04");
});




// Function called when the address field loses focus - This function is for LATITUDE and LONGITUDE data
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

    // Button container
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "modal-buttons";

    // Submit / Confirm button
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

    // Cancel button
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "modal-button modal-cancel";
    cancelBtn.onclick = closeAddressModal;

    // Add the two buttons
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


