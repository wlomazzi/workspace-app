const user = localStorage.getItem('user_id');  // Get the user ID from localStorage 

// Function to open the space details page
async function fetchAndDisplayWorkspaces() {
    try {
        const response = await fetch('/api/spaces/workspaces'); // Call the API to get the workspaces data
        const spaces   = await response.json();  // Convert the response to JSON

        displaySpaces(spaces);  // Call the function to display the spaces on the page
    } catch (error) {
        console.error("Erro ao buscar dados dos workspaces:", error);
    }
}


// Function to filter the spaces based on the search criteria
function displaySpaces(spaces) {
    const spacesContainer = document.querySelector(".spaces");
    spacesContainer.innerHTML = "";  // Clear the container before displaying new spaces

    spaces.forEach(space => {
        const spaceElement = document.createElement("div");
        spaceElement.classList.add("space");

        spaceElement.setAttribute("onclick", `openSpaceDetails('${space.id}')`);

        //console.log('space',space); // debug data
        spaceElement.innerHTML = `
            <img src="${space.image_01}" alt="${space.title}">
            <p><strong>${space.title}</strong></p>
            <p style="color:#969494;">${space.neighborhood}</p>
            <p><strong>C$ ${space.price}</strong> ${space.lease_time}</p>
            <p>Seats 👤: ${space.seats}</p>
            <p>Rating: ${getStars(space.rating)} (${space.rating})</p>
            <hr>
            <p>
                ${space.amn_parking ? '<img src="/images/icon-parking.png" alt="Parking" class="icon">' : ""}
                ${space.amn_public_transport ? '<img src="/images/icon-public-transport.png" alt="Public transport?" class="icon">' : ""}
                ${space.amn_kitchen ? '<img src="/images/icon-kitchen.png" alt="Kitchen/Cafee" class="icon">' : ""}
                ${space.amn_wifi ? '<img src="/images/icon-wifi.png" alt="Wifi" class="icon">' : ""}
                ${space.amn_printer ? '<img src="/images/icon-printer.png" alt="Printer" class="icon">' : ""}
                ${space.amn_air ? '<img src="/images/icon-air-conditioner.png" alt="Air Conditioning" class="icon">' : ""}
                ${space.amn_smoking ? '<img src="/images/icon-smoke.png" alt="Smoking" class="icon">' : ""}
            </p>
        `;
        
        spacesContainer.appendChild(spaceElement);
    });
}


/* SEARCH BAR
// Create and display a shadowed container with icons and search items instead of the title Featured Coworking Spaces
*/
const featuredSection = document.querySelector(".search");
if (featuredSection) {
    featuredSection.innerHTML = `
    <div class="search-container">
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
            <div class="icon-box" id="filter-icon"><img src="/images/filter-icon.png" alt="Icon 1" class="feature-icon"></div>
            <!--
            <div class="icon-box"><img src="/images/public-transport.png" alt="Icon 2" class="feature-icon"></div>
            <div class="icon-box"><img src="/images/parked-car.png" alt="Icon 3" class="feature-icon"></div>
            <div class="icon-box"><img src="/images/cutlery.png" alt="Icon 4" class="feature-icon"></div>
            -->
        </div>
    </div>
    `;
}

/* FILTER FORM: Activated when click on filter icon
// Function o show the filter form when clicking the filter icon - on Search bar */
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
                        <label for="price-range-min">$ Range (min): <span id="price-range-value-min">20</span></label>
                        <input type="range" id="price-range-min" min="10" max="300" step="10" value="20" oninput="document.getElementById('price-range-value-min').textContent = this.value;"><br>
                        <label for="price-range-max">$ Range (max): <span id="price-range-value-max">2000</span></label>
                        <input type="range" id="price-range-max" min="10" max="2000" step="5" value="2000" oninput="document.getElementById('price-range-value-max').textContent = this.value;">                        
                    </div>
                    <div class="filter-group">
                        <br>
                        <div class="checkbox-group">
                            <input type="checkbox" id="parking"> <label for="parking">Parking</label><br>
                            <input type="checkbox" id="public_transport"> <label for="public_transport">Public Transport</label><br>
                            <input type="checkbox" id="kitchen"> <label for="kitchen">Coffee/Kitchen</label><br>
                            <input type="checkbox" id="wifi"> <label for="wifi">WiFi</label><br>
                            <input type="checkbox" id="printer"> <label for="printer">Printer</label><br>
                            <input type="checkbox" id="air_conditioning"> <label for="air_conditioning">Air Conditioning</label><br>
                            <input type="checkbox" id="smoke"> <label for="smoke">Smoking</label>
                        </div>
                    </div>
                    
                    <div class="filter-group">
                        <br>
                        <label for="location-type">Location Type</label>
                        <select id="location-type">
                            <option value="all">All</option>
                            <option value="meeting_room">Meeting Room</option>
                            <option value="private_office">Private Office</option>
                            <option value="open_desk">Open Desk</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <br>
                        <label for="rating">Rating</label>
                        <select id="rating">
                            <option value="0">All</option>
                            <option value="1">1 Star</option>
                            <option value="2">2 Stars</option>
                            <option value="3">3 Stars</option>
                            <option value="4">4 Stars</option>
                            <option value="5">5 Stars</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <br>
                        <label for="sort">Sort</label>
                        <select id="sort">
                            <option value="value_less">Value: Low to high</option>
                            <option value="value_high">Value: High to low</option>
                            <option value="recently">Recently Added</option>
                            <option value="rating">Rating</option>
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
        // document.getElementById("filter-form").style.display = "none"; // Hide the form after applying filters (Disabled becouse the user can apply multiple filters)
        filterSpaces();
    }
});



// SEARCH BAR BUTTON - Executed when the user click on the Search button
document.querySelector('button').addEventListener('click', async function () {
    // Pegando os valores dos campos de filtro
    const location = document.getElementById('location').value.trim();
    const checkIn  = document.getElementById('check-in').value;
    const checkOut = document.getElementById('check-out').value;
    const teamSize = document.getElementById('team-size').value;

    //const user = JSON.parse(sessionStorage.getItem("loggedUser"));
    /*
    if (!user) {
        alert("Please log in to search for spaces.");
        return;
    }
    */
    const filters = {
        location,
        check_in: checkIn,
        check_out: checkOut,
        team_size: teamSize
    };

    // Enviando os filtros para o backend via POST
    try {
        const response = await fetch("/api/spaces/workspaces/filter_spaces", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(filters)
        });

        const result = await response.json();

        if (result.error) {
            alert(`Error: ${result.error}`);
        } else {
            //console.log(result); // Displays the filtered workspaces in the console
            displaySpaces(result);  // Call the function to display the spaces on the page
            // Here you can display the filtered workspaces on the screen
        }
    } catch (error) {
        console.error('Error filtering spaces:', error);
        alert('Error while filtering workspaces.');
    }
});




// Function to filter spaces based on selected criteria
// This form is executed when the user confirm the filter on the FORM FILTER
async function filterSpaces() {

    //Get the filter from the Filter Form --------------------------------------------------------------------------------------------------------------
    const filterForm = document.getElementById("filter-form");
    // Getting the values ​​from the filter fields
    const location = document.getElementById('location').value.trim();
    const checkIn  = document.getElementById('check-in').value;
    const checkOut = document.getElementById('check-out').value;
    const teamSize = document.getElementById('team-size').value;

    // Minimum and maximum price
    const priceMin = document.getElementById('price-range-min').value;
    const priceMax = document.getElementById('price-range-max').value;

    // Amenities (checkboxes) - Individual, rather than an object
    const parking = document.getElementById('parking').checked;
    const publicTransport = document.getElementById('public_transport').checked;
    const kitchen = document.getElementById('kitchen').checked;
    const wifi = document.getElementById('wifi').checked;
    const printer = document.getElementById('printer').checked;
    const airConditioning = document.getElementById('air_conditioning').checked;
    const smoke = document.getElementById('smoke').checked;

    // Location type
    const locationType = document.getElementById('location-type').value;

    // Rating
    const rating = document.getElementById('rating').value;

    // Sort
    const sort = document.getElementById('sort').value;

    const filters = {
        location: location,
        check_in: checkIn,
        check_out: checkOut,
        team_size: teamSize,
        price_min: priceMin,
        price_max: priceMax,
        amn_kitchen: kitchen,
        amn_parking: parking, 
        amn_public_transport: publicTransport,
        amn_wifi: wifi,
        amn_printer: printer,
        amn_air: airConditioning,
        amn_smoking: smoke,
        location_type: locationType,
        rating: rating,
        sort: sort
    };

    // Sending filters to the backend via POST
    try {
        const response = await fetch("/api/spaces/workspaces/filter_spaces", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(filters)
        });

        const result = await response.json();

        if (result.error) {
            alert(`Error: ${result.error}`);
        } else {
            //console.log(result); // Displays the filtered workspaces in the console
            displaySpaces(result);  // Call the function to display the spaces on the page
            // Here we can display the filtered workspaces on the screen
        }
    } catch (error) {
        console.error('Error filtering spaces:', error);
        alert('Error while filtering workspaces.');
    }    

}




function getStars(rating) {
    const maxStars = 5; // Maximum stars
    const fullStar = "⭐"; // Full star
    const emptyStar = "☆"; // Empty star
    // Convert the rating to a number
    const roundedRating = Math.round(rating); 
    // Generates the stars
    return fullStar.repeat(roundedRating) + emptyStar.repeat(maxStars - roundedRating);
}


function openSpaceDetails(spaceId) {
    window.location.href = `space_details.html?id=${spaceId}`;
}
  

//<p>Rating: ${space.rating}</p>
function displayNoResults() {
    const spacesContainer = document.querySelector(".spaces");
    spacesContainer.innerHTML = `<p class="no-results">No coworking spaces found with the selected filters.</p>`;
}


// Load the workspaces when the page is loaded
window.onload = fetchAndDisplayWorkspaces;