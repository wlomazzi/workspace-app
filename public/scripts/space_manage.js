// Function to get the user session
//const user    = JSON.parse(sessionStorage.getItem("loggedUser"));
const user  = localStorage.getItem('user_id');  // Get the user ID from localStoragelet latitude  = 0;
let longitude = 0;

// Images picked by the user are kept in memory (not uploaded yet) until the workspace
// itself is saved and we know for sure which space_id to attach them to.
// This works the same way for both "Insert" (space_id doesn't exist yet) and "Edit" (it does).
const pendingImageFiles = {
    image_01: null,
    image_02: null,
    image_03: null,
    image_04: null
};



// HOUR WINDOW FIELDS - populate the Opening/Closing hour <select> options and show/hide them
// depending on whether "Lease time" is set to "Hour" -------------------------------------------
function populateHourSelect(selectEl, maxHour) {
    selectEl.innerHTML = "";
    for (let hour = 0; hour <= maxHour; hour++) {
        const option = document.createElement("option");
        option.value = hour;
        option.textContent = `${String(hour).padStart(2, "0")}:00`;
        selectEl.appendChild(option);
    }
}

function toggleHourWindowFields() {
    const leaseTime = document.getElementById("lease_time").value;
    const hourFields = document.getElementById("hourWindowFields");
    if (!hourFields) return;
    hourFields.style.display = leaseTime === "hour" ? "block" : "none";
}

document.addEventListener("DOMContentLoaded", function () {
    const openHourSelect = document.getElementById("open_hour");
    const closeHourSelect = document.getElementById("close_hour");

    if (openHourSelect) populateHourSelect(openHourSelect, 23); // 00:00 to 23:00
    if (closeHourSelect) populateHourSelect(closeHourSelect, 24); // 00:00 to 24:00
    if (closeHourSelect) closeHourSelect.value = 18; // sensible default (6pm)

    toggleHourWindowFields();

    const leaseTimeSelect = document.getElementById("lease_time");
    if (leaseTimeSelect) {
        leaseTimeSelect.addEventListener("change", toggleHourWindowFields);
    }
});
// END HOUR WINDOW FIELDS -------------------------------------------------------------------------



document.addEventListener("DOMContentLoaded", async function () {
    const spaceId = new URLSearchParams(window.location.search).get('space_id');  // Get space_id from URL

    // Select all clickable images (thumbnails)
    const imageBoxes = document.querySelectorAll(".image-box");

    imageBoxes.forEach((box, index) => {
        const imageInput = document.getElementById(`imageInput${index + 1}`);
        const image = document.getElementById(`image${index + 1}`);
        const imageCode = `image_0${index + 1}`;

        // Makes the image clickable
        image.addEventListener("click", function() {
            // Triggers the file input by clicking the image
            imageInput.click();
        });

        // Handles the file selection on the input: only generates the local preview and
        // keeps the file in memory. The actual upload only happens when the form is saved.
        imageInput.addEventListener("change", function(event) {
            const file = event.target.files[0];

            if (file) {
                pendingImageFiles[imageCode] = file;

                const reader = new FileReader();
                reader.onloadend = function() {
                    // Replaces the thumbnail image with the selected image
                    image.src = reader.result;
                    image.style.display = "block"; // Makes the image visible
                };
                reader.readAsDataURL(file); // Reads the image as base64 (preview only)
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

        // Only relevant when lease_time is "hour" - populate + reveal the opening/closing hour fields.
        if (workspace.open_hour !== null && workspace.open_hour !== undefined) {
            document.getElementById("open_hour").value = workspace.open_hour;
        }
        if (workspace.close_hour !== null && workspace.close_hour !== undefined) {
            document.getElementById("close_hour").value = workspace.close_hour;
        }
        toggleHourWindowFields();

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



// Function to save the workspace data (insert or update), then upload any pending images
// using the workspace's real id, then show the success confirmation.
document.getElementById("spaceForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const spaceId = new URLSearchParams(window.location.search).get('space_id'); // Get the ID space from the URL
    const submitBtn = document.querySelector("button[type='submit']");

    if (!user) {
        alert("You need to be logged in to update the workspace.");
        return;
    }

    const leaseTimeValue = document.getElementById("lease_time").value;
    const openHourValue = leaseTimeValue === "hour" ? parseInt(document.getElementById("open_hour").value, 10) : null;
    const closeHourValue = leaseTimeValue === "hour" ? parseInt(document.getElementById("close_hour").value, 10) : null;

    if (leaseTimeValue === "hour" && openHourValue >= closeHourValue) {
        alert("Closing hour must be after opening hour.");
        return;
    }

    // Note: image_01..04 are intentionally NOT part of this payload. They're only ever
    // written by the /upload_image endpoint, once we know the workspace's real id.
    const workspaceData = {
        user_id: user,
        space_id: spaceId,
        title: document.getElementById("title").value,
        details: document.getElementById("details").value,
        price: document.getElementById("price").value,
        address: document.getElementById("address").value,
        neighborhood: document.getElementById("neighborhood").value,
        seats: document.getElementById("workspace_seats").value,
        type: document.getElementById("type").value,
        lease_time: leaseTimeValue,
        open_hour: openHourValue,
        close_hour: closeHourValue,
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
        active: document.getElementById("workspace-status").checked
    };

    const api_type = (spaceId && spaceId.trim() !== "") ? 'update' : 'insert';

    submitBtn.disabled = true;
    submitBtn.textContent = api_type === 'insert' ? "Creating..." : "Saving...";

    try {
        // Step 1: save the workspace's text/boolean fields first.
        const response = await apiFetch(`/api/spaces/workspaces/${api_type}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(workspaceData)
        });

        const result = await response.json();

        if (!result.success) {
            alert("Failed to save workspace: " + result.error);
            return;
        }

        // Step 2: now that the workspace definitely has an id (either the one already in
        // the URL, or the one just created by the insert), upload any images the user picked.
        const resolvedSpaceId = api_type === 'insert' ? result.insertWorkspaceData.id : spaceId;
        const uploadErrors = await uploadPendingImages(resolvedSpaceId);

        if (uploadErrors.length > 0) {
            console.error("Some images failed to upload:", uploadErrors);
            alert("The workspace was saved, but some images failed to upload: " + uploadErrors.join(", "));
        }

        showSaveSuccessModal(api_type);

    } catch (error) {
        console.error("Error saving workspace:", error);
        alert("An error occurred while saving the workspace.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = api_type === 'insert' ? "Insert Workspace" : "Update Workspace";
    }
});

// Uploads every image the user selected (if any) for the given space id.
// Returns an array of error messages (empty if everything succeeded).
async function uploadPendingImages(spaceId) {
    const entries = Object.entries(pendingImageFiles).filter(([, file]) => file !== null);
    if (entries.length === 0) return [];

    const results = await Promise.all(
        entries.map(([imageCode, file]) => uploadImageFile(file, spaceId, imageCode))
    );

    return results.filter(r => !r.success).map(r => r.message);
}

// Uploads a single image file to the backend for the given space/imageCode.
async function uploadImageFile(file, spaceId, imageCode) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("space_id", spaceId);
    formData.append("image_code", imageCode);

    try {
        const response = await apiFetch("/api/spaces/workspaces/upload_image", {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        return result.success ? { success: true } : { success: false, message: result.message || imageCode };
    } catch (error) {
        console.error(`Error uploading ${imageCode}:`, error);
        return { success: false, message: imageCode };
    }
}

// SAVE SUCCESS MODAL - Shown after a workspace is inserted or updated, then redirects to the user's own spaces list --
function showSaveSuccessModal(apiType) {
    const modal = document.getElementById("saveSuccessModal");
    const title = document.getElementById("saveSuccessModalTitle");
    const message = document.getElementById("saveSuccessModalMessage");

    if (!modal) return;

    if (apiType === 'insert') {
        title.textContent = "Workspace created";
        message.textContent = "Your new workspace was created successfully.";
    } else {
        title.textContent = "Workspace updated";
        message.textContent = "Your changes were saved successfully.";
    }

    modal.classList.add("open");
}

document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("saveSuccessModalBtn");
    if (btn) {
        btn.addEventListener("click", function () {
            window.location.href = "/user_profile.html";
        });
    }
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
                "User-Agent": "work4fun-app/1.0 (email@example.com)"
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
    list.innerHTML = ""; // Clear the list

    // Create the address options
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


