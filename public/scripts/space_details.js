const user = JSON.parse(sessionStorage.getItem("loggedUser"));
let calendarLeaseType = '';
let calendarPrice = 0;

document.addEventListener("DOMContentLoaded", async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const spaceId = urlParams.get("id");

    if (!spaceId) {
        alert("Nenhum ID foi informado na URL. Exemplo: ?id=2");
        return;
    }

    const spaceData = await getSpaceByIdFromApi(spaceId);

    if (!spaceData) {
        alert("Espaço não encontrado.");
        return;
    }

    const mainImage = document.getElementById("space-image");
    const thumbnailContainer = document.getElementById("thumbnail-container");
    const amenitiesContainer = document.getElementById("space-amenities");


    // Pega a latitude e longitude e exibe a localização do espaço de trabalho
    // Verifica se o espaço tem coordenadas
    // Test: alert(`latitude: ${spaceData.latitude} - longitude: ${spaceData.longitude}`)
    if (spaceData.latitude && spaceData.longitude) {
        const latitude = parseFloat(spaceData.latitude);
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


    // Imagem principal
    mainImage.src = spaceData.images?.[0] || spaceData.image;
    mainImage.alt = spaceData.title;

    // Thumbnails
    if (Array.isArray(spaceData.images)) {
        spaceData.images.forEach((imageSrc, index) => {
            //if (index > 0) {
                const thumb = document.createElement("img");
                thumb.src = imageSrc;
                thumb.classList.add("thumbnail");
                thumb.alt = "Thumbnail Image";
                thumb.addEventListener("click", () => {
                    mainImage.src = imageSrc;
                });
                thumbnailContainer.appendChild(thumb);
            //}
        });
    }

    // Preencher dados
    document.getElementById("space-title").textContent = spaceData.title;
    document.getElementById("space-details").textContent = spaceData.details || "Sem descrição";
    document.getElementById("space-price").textContent = `C$ ${spaceData.price}`;
    document.getElementById("space-lease").textContent = spaceData.lease_time;
    document.getElementById("space-neighborhood").textContent = spaceData.neighborhood;
    document.getElementById("space-seats").textContent = spaceData.workspace_seats || spaceData.seats;
    document.getElementById("space-type").textContent = spaceData.type;
    document.getElementById("space-rating").innerHTML = `${getStars(spaceData.rating)} (${spaceData.rating})`;

    // Guardar tipo e preço para cálculo
    calendarLeaseType = spaceData.lease_time;
    calendarPrice = parseFloat(spaceData.price);

    // Amenidades
    const amenityIcons = {
        kitchen: '<img src="/images/icon-kitchen.png" alt="Kitchen" class="icon">',
        parking: '<img src="/images/icon-parking.png" alt="Parking" class="icon">',
        public_transport: '<img src="/images/icon-public-transport.png" alt="Public Transport" class="icon">',
        wifi: '<img src="/images/icon-wifi.png" alt="Wi-Fi" class="icon">',
        printer: '<img src="/images/icon-printer.png" alt="Printer" class="icon">',
        air_conditioning: '<img src="/images/icon-air-conditioner.png" alt="Air Conditioning" class="icon">'
    };

    Object.keys(spaceData.amenities || {}).forEach(key => {
        if (spaceData.amenities[key]) {
            const amenityElement = document.createElement("span");
            amenityElement.innerHTML = amenityIcons[key] || key;
            amenitiesContainer.appendChild(amenityElement);
        }
    });
});


// Função para buscar um espaço específico pelo ID
async function getSpaceByIdFromApi(id) {
    try {
        const response = await fetch("http://localhost:3000/api/spaces");
        const data = await response.json();
        const filtered = data.filter(space => String(space.id) === String(id));
        return filtered[0] || null;
    } catch (error) {
        console.error("Erro ao buscar espaço:", error);
        return null;
    }
}

// Exibe as estrelas com base na nota
function getStars(rating) {
    const fullStar = "⭐";
    const emptyStar = "☆";
    const maxStars = 5;
    const rounded = Math.round(rating);
    return fullStar.repeat(rounded) + emptyStar.repeat(maxStars - rounded);
}


/* CALENDAR: Select the dates and calculate the value */
document.addEventListener('DOMContentLoaded', function () {
    const spaceId = new URLSearchParams(window.location.search).get('id'); // Get the space_id from URL

    // Fetch the occupied dates for the space
    console.log('spaceId:', spaceId); 
    fetch(`http://localhost:3000/api/spaces/occupied-dates?space_id=${spaceId}`)
        .then(response => response.json())
        .then(data => {
            const occupiedDates = data.occupied_dates; // Array of occupied dates
            console.log(occupiedDates);

            // Initialize flatpickr for the date range input
            flatpickr("#date-range", {
                mode: "range",  // Allow date range selection
                minDate: "today", // Disallow past dates
                disable: occupiedDates, // Disable occupied dates
                dateFormat: "Y-m-d",  // Set date format
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
        
                        // Verifica qual unidade usar (day, week, month)
                        if (calendarLeaseType === "day") {
                            totalUnits = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        } else if (calendarLeaseType === "week") {
                            totalUnits = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
                        } else if (calendarLeaseType === "month") {
                            totalUnits = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
                        } else {
                            totalUnits = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Default para dias
                        }
        
                        // Calcula o preço total
                        const totalPrice = totalUnits * calendarPrice;
        
                        // Atualiza a mensagem no HTML
                        document.getElementById("message").innerHTML = `
                            <p>You selected <strong>${totalUnits} ${calendarLeaseType}(s)</strong>.</p>
                            <br>
                            <p>Total Price: <strong>C$ ${totalPrice.toLocaleString()}</strong></p>
                        `;
                    }
                }

            });
        })
        .catch(error => {
            console.error("Error fetching occupied dates:", error);
        });

});


/* BOOKING CONFIRMATION - After select the dates and confirm booking */
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
