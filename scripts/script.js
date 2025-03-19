
document.addEventListener("DOMContentLoaded", () => {
    fetchSpaces();
});

function fetchSpaces() {
    fetch("http://localhost:3000/api/spaces")
        .then(response => response.json())
        .then(data => {
            const spacesContainer = document.querySelector(".spaces");
            spacesContainer.innerHTML = "";

            data.forEach(space => {
                const spaceElement = document.createElement("div");
                spaceElement.classList.add("space");

                spaceElement.innerHTML = `
                    <img src="${space.image}" alt="${space.title}">
                    <h3>${space.title}</h3>
                    <p>${space.price}</p>
                `;

                spacesContainer.appendChild(spaceElement);
            });
        })
        .catch(error => console.error("Error fetching data:", error));
}

// Update json data dynamically
function updateSpaces(newData) {
    fetch("http://localhost:3000/api/spaces", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(newData)
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
        fetchSpaces(); // Reload spaces after updating
    })
    .catch(error => console.error("Error updating data:", error));
}


// Create and display a shadowed container with icons and search items instead of the title Featured Coworking Spaces
const featuredSection = document.querySelector(".search");
if (featuredSection) {
    featuredSection.innerHTML = `
        <div class="icon-container">
            <div class="search-bar">
                <label for="location">Neighborhood</label>
                <input type="text" id="location" placeholder="Enter neighborhood">
                
                <label for="check-in">Check-in</label>
                <input type="date" id="check-in">
                
                <label for="check-out">Check-out</label>
                <input type="date" id="check-out">
                
                <label for="team-size">Team Size</label>
                <select id="team-size">
                    <option value="1">1 Person</option>
                    <option value="2">2 People</option>
                    <option value="3">3 People</option>
                    <option value="4">4 People</option>
                    <option value="5">5+ People</option>
                </select>
                <button>Search</button>
            </div>
            <div class="icon-box" id="filter-icon"><img src="/images/filter-icon.png" alt="Icon 1" class="feature-icon"></div>
            <div class="icon-box"><img src="/images/public-transport.png" alt="Icon 2" class="feature-icon"></div>
            <div class="icon-box"><img src="/images/parked-car.png" alt="Icon 3" class="feature-icon"></div>
            <div class="icon-box"><img src="/images/cutlery.png" alt="Icon 4" class="feature-icon"></div>
        </div>
    `;
}




// Function o show the filter form when clicking the filter icon - on Search bar
document.addEventListener("DOMContentLoaded", function() {
    const filterIcon = document.getElementById("filter-icon");
    
    filterIcon.addEventListener("click", function() {
        let filterForm = document.getElementById("filter-form");
        
        if (!filterForm) {
            filterForm = document.createElement("div");
            filterForm.id = "filter-form";
            filterForm.innerHTML = `
                <div class="filter-card">
                    <h3>Filters</h3>
                    
                    <div class="filter-group">
                        <label for="price-range">Price Range: <span id="price-range-value">20</span></label>
                        <input type="range" id="price-range" min="10" max="300" step="10" value="20" oninput="document.getElementById('price-range-value').textContent = this.value;">                        
                    </div>
                    <div class="filter-group">
                        <br>
                        <label for="capacity">Capacity</label>
                        <select id="capacity">
                            <option value="1">1 Person</option>
                            <option value="2">2 People</option>
                            <option value="3">3 People</option>
                            <option value="4">4 People</option>
                            <option value="5+">5+ People</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <br>
                        <label for="amenities">Amenities</label>
                        <div class="checkbox-group">
                            <input type="checkbox" id="parking"> <label for="parking">Parking</label><br>
                            <input type="checkbox" id="public_transport"> <label for="public_transport">Public Transport</label><br>
                            <input type="checkbox" id="kitchen"> <label for="kitchen">Coffee/Kitchen</label><br>
                            <input type="checkbox" id="wifi"> <label for="wifi">WiFi</label><br>
                            <input type="checkbox" id="printer"> <label for="printer">Printer</label>
                        </div>
                    </div>
                    
                    <div class="filter-group">
                        <br>
                        <label for="location-type">Location Type</label>
                        <select id="location-type">
                            <option value="all">All</option>
                            <option value="open_space">Open Space</option>
                            <option value="private_office">Private Office</option>
                            <option value="shared_desk">Shared Desk</option>
                            <option value="meeting_room">Meeting Room</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <br>
                        <label for="rating">Rating</label>
                        <select id="rating">
                            <option value="1">1 Star</option>
                            <option value="2">2 Stars</option>
                            <option value="3">3 Stars</option>
                            <option value="4">4 Stars</option>
                            <option value="5">5 Stars</option>
                        </select>
                    </div>
                    
                    <div class="filter-buttons" style="display: flex; justify-content: space-between; margin-top: 15px;">
                        <button id="apply-filters" style="padding: 10px 15px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">Apply</button>
                        <button id="close-filters" style="padding: 10px 15px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">Close</button>
                    </div>

                </div>
            `;

            document.body.appendChild(filterForm);

        } else {
            filterForm.style.display = "block";
        }
    });

    // Close the form when clicking the Close button
    document.addEventListener("click", function(event) {
        if (event.target.id === "close-filters") {
            document.getElementById("filter-form").style.display = "none";
        }
    });

});


// Apply filters when clicking the Apply button - On the filter form (Form that hides and shows when clicking the filter icon)
document.addEventListener("click", function(event) {
    if (event.target.id === "apply-filters") {
        console.log("Applying filters...");
        document.getElementById("filter-form").style.display = "none";
        filterSpaces();
    }
});





// Top menu: Open the menu when clicking on the menu icon (sandwich icon)
function toggleMenu() {
    const menu = document.getElementById("menu");
    if (menu.style.display === "block") {
        menu.style.display = "none";
    } else {
        menu.style.display = "block";
    }
}

// Top menu: Close the menu when clicking outside of it
document.addEventListener("click", function(event) {
    const menu = document.getElementById("menu");
    const menuIcon = document.querySelector(".menu-icon");
    
    if (!menu.contains(event.target) && !menuIcon.contains(event.target)) {
        menu.style.display = "none";
    }
});


/*
@ Function to filter the spaces by neighborhood
@ The function will be triggered when clicking the Search button
*/
document.addEventListener("DOMContentLoaded", () => {
    fetchSpaces();
    document.querySelector(".search-bar button").addEventListener("click", filterSpaces);
});

function fetchSpaces() {
    fetch("http://localhost:3000/api/spaces")
        .then(response => response.json())
        .then(data => {
            displaySpaces(data);
        })
        .catch(error => console.error("Error fetching data:", error));
}


// Function to filter spaces based on selected criteria
function filterSpaces() {
    const neighborhoodInput = document.getElementById("location").value.trim().toLowerCase();
    const checkInDate  = document.getElementById("check-in").value;
    const teamSize     = document.getElementById("team-size").value;

    //Get the filter from the Filter Form --------------------------------------------------------------------------------------------------------------
    const filterForm = document.getElementById("filter-form");
    
    fetch("http://localhost:3000/api/spaces")
        .then(response => response.json())
        .then(data => {

            const filteredSpaces = data.filter(space => {
                const matchNeighborhood = space.neighborhood.toLowerCase().includes(neighborhoodInput);
                const matchTeamSize     = space.workspace_seats ? space.workspace_seats >= teamSize : true;
                const matchCheckIn = !checkInDate || (space.available_from && new Date(space.available_from) >= new Date(checkInDate));


                if (filterForm){
                    const capacity = parseInt(filterForm.querySelector("#capacity")?.value) || null;
                    const priceRange = parseFloat(filterForm.querySelector("#price-range")?.value) || null;
                    const locationType = filterForm.querySelector("#location-type")?.value || "";
                    const rating = parseInt(filterForm.querySelector("#rating")?.value) || null;

                    const matchPriceRange   = space.price ? space.price >= priceRange : true;
                    const matchCapacity     = space.workspace_seats ? space.workspace_seats >= capacity : true;
                    const matchLocationType = space.type ? space.type === locationType || locationType === "all": true;
                    const matchRating       = space.rating ? space.rating >= rating : true;

                    
                    let matchAmenities = true;
                    const selectedAmenities = Array.from(filterForm.querySelectorAll(".checkbox-group input[type='checkbox']:checked"))
                    .map(checkbox => checkbox.id);
            
                    //console.log("Selected Amenities:", selectedAmenities);
                    if (selectedAmenities.length === 0) {
                        matchAmenities = true; // No filter applied
                    }else{
                        for (let amenity of selectedAmenities) {
                            //console.log('amenity: ' + amenity + ' space.amenities[amenity]: ' + space.amenities[amenity]);
                            if (!space.amenities[amenity]) {
                                matchAmenities = false;
                                break;
                            }
                        }
                    }

                    return matchNeighborhood && matchTeamSize && matchCheckIn && matchPriceRange && matchCapacity && matchLocationType && matchRating && matchAmenities;
                    
                }else{
                    console.log(' checkInDate : ' + checkInDate + ' space.available_to: ' + space.available_from);
                    return matchNeighborhood && matchTeamSize && matchCheckIn;
                }
                
            });
            
            if (filteredSpaces.length === 0) {
                displayNoResults();
            } else {
                displaySpaces(filteredSpaces);
            }
        })
        .catch(error => console.error("Error filtering data:", error));
}

function displaySpaces(spaces) {
    const spacesContainer = document.querySelector(".spaces");
    spacesContainer.innerHTML = "";

    spaces.forEach(space => {
        const spaceElement = document.createElement("div");
        spaceElement.classList.add("space");
        
        spaceElement.innerHTML = `
            <img src="${space.image}" alt="${space.title}">
            <h3>${space.title}</h3>
            <p>${space.price} / ${space.lease_time}</p>
            <p>Seats 👤: ${space.workspace_seats}</p>
            <p>Rating: ${space.rating}</p>
        `;

        spacesContainer.appendChild(spaceElement);
    });
}

function displayNoResults() {
    const spacesContainer = document.querySelector(".spaces");
    spacesContainer.innerHTML = `<p class="no-results">No coworking spaces found with the selected filters.</p>`;
}
