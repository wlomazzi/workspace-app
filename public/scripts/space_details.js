const user = JSON.parse(sessionStorage.getItem("loggedUser"));
let calendarLeaseType = '';
let calendarPrice = 0;



// Function to fetch space data by ID from the API. Fetches the space data from the API using the provided ID ----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const spaceId = urlParams.get("id");

    if (!spaceId) {
        alert("There is no ID in the URL. Example: ?id=2");
        return;
    }

    const spaceData = await getSpaceById(spaceId);

    if (!spaceData) {
        alert("Space not found.");
        return;
    }

    const mainImage = document.getElementById("space-image");
    const amenitiesContainer = document.getElementById("space-amenities");


    // Get latitude and longitude and display the workspace location. Check if the space has coordinates
    // Test: alert(`latitude: ${spaceData.latitude} - longitude: ${spaceData.longitude}`)
    if (spaceData.latitude && spaceData.longitude) {
        const latitude  = parseFloat(spaceData.latitude);
        const longitude = parseFloat(spaceData.longitude);
        
        const map = L.map("map").setView([latitude, longitude], 13);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
        }).addTo(map);

        L.marker([latitude, longitude])
            .addTo(map)
            .bindPopup(`<b>${spaceData.title}</b><br>${spaceData.neighborhood}`)
            .openPopup();
        
    } else {
        document.getElementById("map").innerHTML =
            "<p style='padding:1rem;'>Location not available for this space.</p>";
    }    


    // Get all images and generate thumbnails and default image
    generateImages(spaceData);


    // Get all data from the space and display in the HTML
    document.getElementById("space-title").textContent = spaceData.title;
    document.getElementById("space-details").textContent = spaceData.details || "No description available.";
    document.getElementById("space-price").textContent = `C$ ${spaceData.price}`;
    document.getElementById("space-lease").textContent = spaceData.lease_time;
    document.getElementById("space-neighborhood").textContent = spaceData.neighborhood;
    document.getElementById("space-seats").textContent = spaceData.workspace_seats || spaceData.seats;
    document.getElementById("space-type").textContent = spaceData.type;
    document.getElementById("space-rating").innerHTML = `${getStars(spaceData.rating)} (${spaceData.rating})`;

    // Store the lease type and price for later use in the calendar
    calendarLeaseType = spaceData.lease_time;
    calendarPrice = parseFloat(spaceData.price);

    // Defining the icons for each amenity
    const amenityIcons = {
        amn_kitchen: '<img src="/images/icon-kitchen.png" alt="Kitchen" class="icon">',
        amn_parking: '<img src="/images/icon-parking.png" alt="Parking" class="icon">',
        amn_public_transport: '<img src="/images/icon-public-transport.png" alt="Public Transport" class="icon">',
        amn_wifi: '<img src="/images/icon-wifi.png" alt="Wi-Fi" class="icon">',
        amn_printer: '<img src="/images/icon-printer.png" alt="Printer" class="icon">',
        amn_air: '<img src="/images/icon-air-conditioner.png" alt="Air Conditioning" class="icon">'
    };

    // Checking if the spaceData object has the keys defined in amenityIcons and if the value is true, then create the icon element
    Object.keys(amenityIcons).forEach(key => {
        // Check if the key exists in spaceData and if the value is true
        if (spaceData[key] === true) { // If the value is true, add the icon
            const amenityElement = document.createElement("span");
            amenityElement.innerHTML = amenityIcons[key]; // Using the icon HTML from the amenityIcons object
            amenitiesContainer.appendChild(amenityElement);
        }
    });

});
// END Function to fetch space data by ID from the API. Fetches the space data from the API using the provided ID ------------------------------------------------------------



// Function to generate images and thumbnails --------------------------------------------------------------------------------------------------------------------------------
// This function generates the main image and thumbnails for the workspace
function generateImages(spaceData) {
    const mainImage = document.getElementById("space-image");
    const thumbnailContainer = document.getElementById("thumbnail-container");
    
    // Default image: DEFINE THE DEFAULT IMAGE HERE
    mainImage.src = spaceData.image_01 || spaceData.image_01;  // Using image_01 as default
    mainImage.alt = spaceData.title;

    // Clear the thumbnail container before adding new ones
    thumbnailContainer.innerHTML = "";

    // Generate thumbnails for image_01, image_02, image_03, image_04
    const images = [
        { src: spaceData.image_01 || spaceData.image_01, alt: "Thumb Img 1" },
        { src: spaceData.image_02 || spaceData.image_02, alt: "Thumb Img 2" },
        { src: spaceData.image_03 || spaceData.image_03, alt: "Thumb Img 3" },
        { src: spaceData.image_04 || spaceData.image_04, alt: "Thumb Img 4" }
    ];

    // Generate thumbnails
    images.forEach((image, index) => {
        if (image.src) {
            const thumb = document.createElement("img");
            thumb.src = image.src;
            thumb.classList.add("thumbnail");
            thumb.alt = image.alt;
            thumb.addEventListener("click", () => {
                mainImage.src = image.src;  // Change the main image when thumbnail is clicked
            });
            thumbnailContainer.appendChild(thumb);
        }
    });
}
// END Function to generate images and thumbnails ----------------------------------------------------------------------------------------------------------------------------



// Function to fetch space data by ID from the API. Fetches the space data from the API using the provided ID ----------------------------------------------------------------
async function getSpaceById(id) {
    try {
        const response = await fetch(`/api/spaces/workspaces?id=${id}`);  // Relative URL to the API endpoint
        
        if (!response.ok) {
            throw new Error(`HTTP error getting the data! status: ${response.status}`);
        }

        const data = await response.json();

        // If the response is empty, return null
        if (data.length === 0) {
            return null;
        }

        return data[0];  // Return the first (and only) element of the array
    } catch (error) {
        console.error("Error fetching space data:", error);
        return null;
    }
}
// END Function to fetch space data by ID from the API. Fetches the space data from the API using the provided ID ------------------------------------------------------------


// Shows the stars based on the rating. This function generates a string of stars based on the rating value ------------------------------------------------------------------
function getStars(rating) {
    const fullStar = "⭐";
    const emptyStar = "☆";
    const maxStars = 5;
    const rounded = Math.round(rating);
    return fullStar.repeat(rounded) + emptyStar.repeat(maxStars - rounded);
}
// END Shows the stars based on the rating. This function generates a string of stars based on the rating value -------------------------------------------------------------




// Function to fetch reservations by workspace ID from the API -------------------------------------------------------------------------------------------------------------
// This function fetches all reservations for a specific workspace ID from the API
// and returns the data as an array. It handles errors and logs them to the console.
async function getReservationsByWorkspaceId(id) {

    try {
        const response = await fetch(`/api/spaces/workspaces/reservations?id=${id}`);  // Relative URL to the API endpoint
        
        if (!response.ok) {
            throw new Error(`HTTP error getting the data! status: ${response.status}`);
        }

        const data = await response.json();

        // If the response is empty, return an empty array
        if (data.length === 0) {
            return [];
        }

        return data;  // Return all reservation data
    } catch (error) {
        console.log("Error fetching reservations:", error);
        return [];
    }
}
// END Function to fetch reservations by workspace ID from the API ---------------------------------------------------------------------------------------------------------



// CALENDAR: Select the dates and calculate the value ---------------------------------------------------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const spaceId   = urlParams.get("id");
    const reservations = await getReservationsByWorkspaceId(spaceId);
    let occupiedDates = []; // Array to store occupied dates
    if (reservations.length > 0) {
        // Shows the reservations in the console for debugging
        console.log("Reservations:", reservations);
        occupiedDates = getOccupiedDates(reservations); // Array to store occupied dates
    } else {
        console.log("No reservations found for this workspace.");
    }

    // CALENDAR - Initialize flatpickr for the date range input ------------------------------------------------------------------
    flatpickr("#date-range", {
        mode: "range",          // Allow date range selection
        minDate: "today",       // Disallow past dates
        disable: occupiedDates, // Disable occupied dates - Returned by the API getReservationsByWorkspaceId(spaceId);
        dateFormat: "Y-m-d",    // Set date format
        onDayCreate: function (dObj, dStr, instance) {
            const occupied = occupiedDates.includes(dStr); // Check if the date is occupied
            if (occupied) {
                // Apply a different color for occupied dates
                dObj.classList.add("occupied");
            }
        },        
        onClose: function(selectedDates) {
            if (selectedDates.length === 2) {
                const startDate = new Date(selectedDates[0]);
                const endDate = new Date(selectedDates[1]);
                const diffTime = Math.abs(endDate - startDate);
                let totalUnits;

                // Check which unit to use (day, week, month) and Do the calculation -----------------------
                // Calculation units: day, week, month
                if (calendarLeaseType === "day") {
                    totalUnits = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                } else if (calendarLeaseType === "week") {
                    totalUnits = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
                } else if (calendarLeaseType === "month") {
                    totalUnits = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
                } else {
                    totalUnits = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Default para dias
                }

                // Calculate the total price, based on the selected unit and price
                const totalPrice = totalUnits * calendarPrice;

                // Update the message in the HTML
                document.getElementById("message").innerHTML = `
                    <p>You selected <strong>${totalUnits} ${calendarLeaseType}(s)</strong>.</p>
                    <br>
                    <p>Total Price: <strong>C$ ${totalPrice.toLocaleString()}</strong></p>
                `;
            }
        }
    });
    // END CALENDAR - Initialize flatpickr for the date range input --------------------------------------------------------------
});
// END CALENDAR: Select the dates and calculate the value -----------------------------------------------------------------------------------------------------------------






// This function generates the occupied dates from the reservations array--------------------------------------------------------------------------------------------------
// It takes an array of reservations and returns an array of occupied dates without duplicates.
function getOccupiedDates(reservations) {
    const occupiedDates = [];

    // This function generates the date range between two dates
    function generateDateRange(start, end) {
        const dates = [];
        const currentDate = new Date(start);
        const finalDate = new Date(end);
        // Loop through all dates between start and end dates (inclusive)
        while (currentDate <= finalDate) {
            // Date format: YYYY-MM-DD
            dates.push(currentDate.toISOString().split('T')[0]);
            // Avance one day
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates;
    }

    // For each reservation, generate the date range and add to the occupiedDates array
    reservations.forEach(reservation => {
        const dates = generateDateRange(reservation.start_time, reservation.end_time);
        occupiedDates.push(...dates); // Add all dates to the occupiedDates array
    });

    // Return an array of occupied dates without duplicates
    return [...new Set(occupiedDates)];
}
// END This function generates the occupied dates from the reservations array -----------------------------------------------------------------------------------------------








// BOOKING CONFIRMATION - After select the dates and confirm booking 
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("form-space");

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault(); // impede o envio padrão do form

            // Check if user is logged in
            if (!user) {
                alert('You are not logged in. Please log in and do the reservation again.');

                // Save the current URL in sessionStorage before redirecting to login
                sessionStorage.setItem('redirectAfterLogin', window.location.href);

                // Redirect to login page
                window.location.href = "login.html";
                return;
            } 

            // Fetch the occupied dates for the space
            const spaceId = new URLSearchParams(window.location.search).get('id');  // Get space_id from URL
            const selectedDates = document.getElementById("date-range").value; // Assuming the value contains the date range

            // Assuming the selectedDates are split into an array (e.g. '2025-03-01 to 2025-03-10')
            const datesArray = getDatesBetween(selectedDates); // Get all dates between the selected range

            //console.log('spaceId:', spaceId);  // Ensure the spaceId is correct
            //console.log('datesArray:', datesArray);  // Ensure the dates are correct

            // Prepare the body to send to the server
            const bodyData = {
                space_id: spaceId,
                dates: datesArray // Send the dates as an array
            };

            //console.log('Sending body data:', bodyData);  // Log the body data

            // Enviar a atualização das datas para o servidor
            fetch("http://localhost:3000/api/spaces/update-occupied-dates", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(bodyData)  // Ensure the body is correctly stringified
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert("Booking confirmed!");
                    window.location.href = "index.html";  // Redirect after successful booking
                } else {
                    alert("Failed to update booking. Please try again.");
                }
            })
            .catch(error => {
                console.error("Error confirming booking:", error);
                alert("Error confirming booking. Please try again later.");
            });
        });
    }
});

// Function to generate all dates between two dates
function getDatesBetween(range) {
    const [startDate, endDate] = range.split(' to ');  // Split the date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];

    // Loop through all dates between start and end dates (inclusive)
    for (let currentDate = start; currentDate <= end; currentDate.setDate(currentDate.getDate() + 1)) {
        // Format date to YYYY-MM-DD
        const formattedDate = currentDate.toISOString().split('T')[0];
        dates.push(formattedDate);
    }

    return dates;
}
