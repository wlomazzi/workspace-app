//const user = JSON.parse(sessionStorage.getItem("loggedUser"));
const user = localStorage.getItem('user_id');  // Get the user ID from localStorage
let calendarLeaseType = '';
let calendarPrice = 0;
let totalPrice = 0;
let calendarAvailableFrom = null;
let calendarOpenHour = null;
let calendarCloseHour = null;

// Resolved by the calendar callbacks below and read directly by the submit handler, instead of
// re-parsing the (now multi-date) text field value.
let bookingStartTime = null;
let bookingEndTime = null;
let bookingStartHour = null; // Only used for "hour" lease-type spaces
let bookingEndHour = null;

// While picking hours, remembers the first slot clicked so a second click can turn it into a range.
let hourSelectionStart = null;

// Formats a Date object as YYYY-MM-DD using LOCAL time fields (not toISOString, which converts
// to UTC first and can silently roll the date back/forward a day depending on the user's timezone).
function formatDateLocal(date) {
    const year  = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day   = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Enables/disables the "Confirm Booking" button based on whether the current date selection is valid.
function toggleConfirmButton(enabled) {
    const confirmBtn = document.querySelector('.confirm-btn');
    if (confirmBtn) confirmBtn.disabled = !enabled;
}


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

    let spaceType = '';
    if (spaceData.type==='meeting_room'){
        spaceType = 'Meeting Room';
    }else if (spaceData.type==='private_office'){
        spaceType = 'Private Office';
    }else if (spaceData.type==='open_desk'){
        spaceType = 'Open Desk';
    }


    // Get all data from the space and display in the HTML
    document.getElementById("space-title").textContent = spaceData.title;
    document.getElementById("space-details").textContent = spaceData.details || "No description available.";
    document.getElementById("space-price").textContent = `C$ ${spaceData.price}`;
    document.getElementById("space-lease").textContent = spaceData.lease_time;
    document.getElementById("space-neighborhood").textContent = spaceData.neighborhood;
    document.getElementById("space-seats").textContent = spaceData.workspace_seats || spaceData.seats;
    document.getElementById("space-type").textContent  = spaceType;
    document.getElementById("space-rating").innerHTML  = `${getStars(spaceData.rating)} (${spaceData.rating})`;

    // "Hosted by" + message-the-owner button (section 6/16 of the messaging feature). Hidden
    // entirely if you're viewing your own space - messaging yourself isn't a real flow (the
    // backend rejects it too, see create_or_get_conversation() in migration_messages.sql).
    setupHostSection(spaceData, spaceId);

    // Coming back here right after logging in from the "Message the owner" button (see
    // handleMessageOwnerClick's redirect-to-login below) - finish the flow automatically instead
    // of making the user click the button a second time.
    if (urlParams.get('action') === 'message_owner' && localStorage.getItem('user_id')) {
        handleMessageOwnerClick(spaceId);
    }

    // Store the lease type and price for later use in the calendar
    calendarLeaseType = spaceData.lease_time;
    calendarPrice = parseFloat(spaceData.price);
    calendarAvailableFrom = spaceData.available_from || null;
    calendarOpenHour = spaceData.open_hour !== null && spaceData.open_hour !== undefined ? Number(spaceData.open_hour) : null;
    calendarCloseHour = spaceData.close_hour !== null && spaceData.close_hour !== undefined ? Number(spaceData.close_hour) : null;

    // For hourly spaces, show the booking window and swap the calendar label to reflect that
    // only one day gets picked (hours are picked separately, right below).
    if (calendarLeaseType === "hour" && calendarOpenHour !== null && calendarCloseHour !== null) {
        document.getElementById("space-hours-info").style.display = "block";
        document.getElementById("space-hours").textContent =
            `${String(calendarOpenHour).padStart(2, "0")}:00 - ${String(calendarCloseHour).padStart(2, "0")}:00`;

        const dateRangeLabel = document.getElementById("date-range-label");
        if (dateRangeLabel) dateRangeLabel.textContent = "Select a Day:";
    }

    //console.log('spaceData:', spaceData); // Debug data

    // Defining the icons for each amenity
    const amenityIcons = {
        amn_kitchen: '<img src="/images/icon-kitchen.png" alt="Kitchen" class="icon">',
        amn_parking: '<img src="/images/icon-parking.png" alt="Parking" class="icon">',
        amn_public_transport: '<img src="/images/icon-public-transport.png" alt="Public Transport" class="icon">',
        amn_wifi: '<img src="/images/icon-wifi.png" alt="Wi-Fi" class="icon">',
        amn_printer: '<img src="/images/icon-printer.png" alt="Printer" class="icon">',
        amn_air: '<img src="/images/icon-air-conditioner.png" alt="Air Conditioning" class="icon">',
        amn_smoking: '<img src="/images/icon-smoke.png" alt="Smoking" class="icon">'
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

    // Only now that calendarLeaseType/calendarPrice/etc. are definitely set (spaceData has
    // finished loading) is it safe to build the booking calendar. Previously this lived in its
    // own separate DOMContentLoaded listener, which raced against this one - depending on which
    // network request finished first, the calendar could get initialized while calendarLeaseType
    // was still "" and silently fall back to the wrong (range) picker.
    await initBookingCalendar(spaceId);
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


// "Hosted by <name>" block + "Message the owner" button (messaging feature, section 6/16). The
// owner's public display info is already attached server-side to spaceData.owner (see
// GET /api/spaces/workspaces in api/spaces/workspaces.js) so no extra request is needed here.
function setupHostSection(spaceData, spaceId) {
    const hostSection = document.getElementById("hostSection");
    const currentUserId = localStorage.getItem('user_id');

    // Don't show "message the owner" on your own listing - there's nobody else to talk to, and
    // the backend rejects it anyway (create_or_get_conversation raises "Cannot message yourself").
    if (currentUserId && currentUserId === spaceData.user_id) {
        return;
    }

    document.getElementById("hostName").textContent = spaceData.owner?.full_name || "Space owner";
    if (spaceData.owner?.avatar_url) {
        document.getElementById("hostAvatar").src = spaceData.owner.avatar_url;
    }
    hostSection.style.display = "flex";

    document.getElementById("messageOwnerBtn").addEventListener("click", () => handleMessageOwnerClick(spaceId));
}

async function handleMessageOwnerClick(spaceId) {
    const btn = document.getElementById("messageOwnerBtn");
    const errorEl = document.getElementById("messageOwnerError");
    errorEl.hidden = true;

    // Not logged in: hand off to the existing login flow, then come straight back here and
    // re-run this same click once signed in (section 16: "retornar para o espaço e continuar o
    // fluxo"). See login.js for the matching redirect-back logic.
    if (!localStorage.getItem('user_id')) {
        const returnTo = encodeURIComponent(`space_details.html?id=${spaceId}&action=message_owner`);
        window.location.href = `login.html?redirect=${returnTo}`;
        return;
    }

    btn.disabled = true;
    btn.textContent = "Opening chat...";

    try {
        const response = await apiFetch('/api/messages/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ space_id: Number(spaceId) }),
        });

        const data = await response.json();

        if (!response.ok) {
            errorEl.textContent = data.error || 'Could not start the conversation. Please try again.';
            errorEl.hidden = false;
            btn.disabled = false;
            btn.textContent = "Message the owner";
            return;
        }

        window.location.href = `messages.html?conversation_id=${data.conversation_id}`;

    } catch (error) {
        console.error('Error starting conversation with the owner:', error);
        errorEl.textContent = 'Could not start the conversation. Please try again.';
        errorEl.hidden = false;
        btn.disabled = false;
        btn.textContent = "Message the owner";
    }
}



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
// Called explicitly from the spaceData DOMContentLoaded handler above, once calendarLeaseType/
// calendarPrice/calendarOpenHour/calendarCloseHour are guaranteed to already be set (see comment
// at the call site for why this can't just be its own independent DOMContentLoaded listener).
async function initBookingCalendar(spaceId) {
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
    // The calendar can't allow booking before today, nor before the space's available_from date.
    const todayStr = new Date().toISOString().split('T')[0];
    const calendarMinDate = (calendarAvailableFrom && calendarAvailableFrom > todayStr)
        ? calendarAvailableFrom
        : todayStr;

    if (calendarLeaseType === "day") {
        // DAY-RATE SPACES: click a start day then an end day to pick a range in two clicks
        // (like before), or click a single day and close the calendar to book just that one day.
        // Either way, the price is (number of days covered, INCLUSIVE) x (daily price) - no
        // hotel-style "nights" math, so a 1st-to-10th range is 10 days billed, not 9.
        flatpickr("#date-range", {
            mode: "range",
            minDate: calendarMinDate,  // Disallow past dates and dates before the space becomes available
            disable: occupiedDates,    // Disable occupied dates - Returned by getReservationsByWorkspaceId(spaceId)
            dateFormat: "Y-m-d",
            onDayCreate: function (dObj, dStr, instance) {
                if (occupiedDates.includes(dStr)) {
                    dObj.classList.add("occupied");
                }
            },
            onChange: function (selectedDates) {
                if (selectedDates.length === 0) {
                    totalPrice = 0;
                    bookingStartTime = null;
                    bookingEndTime = null;
                    document.getElementById("message").innerHTML = "";
                    toggleConfirmButton(false);
                    return;
                }

                // One date clicked so far: treat it as a (provisional) single-day booking.
                // If the user clicks a second date next, this block re-runs and becomes a range.
                if (selectedDates.length === 1) {
                    const day = formatDateLocal(selectedDates[0]);
                    bookingStartTime = day;
                    bookingEndTime = day;
                    totalPrice = calendarPrice;

                    document.getElementById("message").innerHTML = `
                        <p>You selected <strong>1 day</strong>.</p>
                        <br>
                        <p>Total Price: <strong>C$ ${totalPrice.toLocaleString()}</strong></p>
                        <p style="font-size:12px;color:#888;">Click an end date to book a range, or click outside the calendar to confirm just this day.</p>
                    `;
                    toggleConfirmButton(true);
                    return;
                }

                // Two dates clicked: a full range.
                const startStr = formatDateLocal(selectedDates[0]);
                const endStr   = formatDateLocal(selectedDates[1]);
                const spanDates = getDatesBetween(`${startStr} to ${endStr}`); // inclusive list of every day in the range

                // Reservations are stored as a single continuous start/end range, so make sure
                // none of the in-between days are already booked by someone else.
                const hasOccupiedDayInRange = spanDates.some(d => occupiedDates.includes(d));
                if (hasOccupiedDayInRange) {
                    totalPrice = 0;
                    bookingStartTime = null;
                    bookingEndTime = null;
                    document.getElementById("message").innerHTML = `
                        <p style="color:#ff385c;">That range includes a day that's already booked. Please pick a different range.</p>
                    `;
                    toggleConfirmButton(false);
                    return;
                }

                bookingStartTime = startStr;
                bookingEndTime = endStr;
                totalPrice = spanDates.length * calendarPrice;

                document.getElementById("message").innerHTML = `
                    <p>You selected <strong>${spanDates.length} day(s)</strong>.</p>
                    <br>
                    <p>Total Price: <strong>C$ ${totalPrice.toLocaleString()}</strong></p>
                `;
                toggleConfirmButton(true);
            }
        });
    } else if (calendarLeaseType === "hour") {
        // HOUR-RATE SPACES: pick a single day, then pick an hour range (or a single hour) from
        // the grid that appears below the calendar. Unlike day-rate spaces, a day here is NOT
        // disabled just because it has *some* reservations on it - only specific hours are.
        document.getElementById("hour-slots-section").style.display = "block";

        flatpickr("#date-range", {
            mode: "single",
            minDate: calendarMinDate,
            dateFormat: "Y-m-d",
            onChange: function (selectedDates) {
                // Starting over on a new day always clears any in-progress hour selection.
                hourSelectionStart = null;
                bookingStartHour = null;
                bookingEndHour = null;
                totalPrice = 0;
                toggleConfirmButton(false);

                if (selectedDates.length === 0) {
                    bookingStartTime = null;
                    bookingEndTime = null;
                    document.getElementById("message").innerHTML = "";
                    document.getElementById("hour-slots-grid").innerHTML = "";
                    return;
                }

                const day = formatDateLocal(selectedDates[0]);
                bookingStartTime = day;
                bookingEndTime = day;

                // Only reservations that already exist on this exact day matter for the hour grid.
                const dayReservations = reservations.filter(r => r.start_time === day);
                renderHourSlots(dayReservations);

                document.getElementById("message").innerHTML = `
                    <p style="font-size:12px;color:#888;">Pick a start hour, then an end hour (or just one hour and click away).</p>
                `;
            }
        });
    } else {
        // WEEK/MONTH-RATE SPACES: unchanged check-in/check-out range picker.
        flatpickr("#date-range", {
            mode: "range",
            minDate: calendarMinDate,
            disable: occupiedDates,
            dateFormat: "Y-m-d",
            onDayCreate: function (dObj, dStr, instance) {
                if (occupiedDates.includes(dStr)) {
                    dObj.classList.add("occupied");
                }
            },
            onClose: function (selectedDates) {
                if (selectedDates.length !== 2) {
                    toggleConfirmButton(false);
                    return;
                }

                bookingStartTime = formatDateLocal(selectedDates[0]);
                bookingEndTime   = formatDateLocal(selectedDates[1]);

                const diffTime = Math.abs(selectedDates[1] - selectedDates[0]);
                let totalUnits;

                if (calendarLeaseType === "week") {
                    totalUnits = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
                } else if (calendarLeaseType === "month") {
                    totalUnits = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
                } else {
                    totalUnits = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Fallback to days
                }

                totalPrice = totalUnits * calendarPrice;

                document.getElementById("message").innerHTML = `
                    <p>You selected <strong>${totalUnits} ${calendarLeaseType}(s)</strong>.</p>
                    <br>
                    <p>Total Price: <strong>C$ ${totalPrice.toLocaleString()}</strong></p>
                `;
                toggleConfirmButton(true);
            }
        });
    }
    // END CALENDAR - Initialize flatpickr for the date range input --------------------------------------------------------------
}
// END CALENDAR: Select the dates and calculate the value -----------------------------------------------------------------------------------------------------------------



// HOUR SLOT PICKER - Builds the clickable hour grid for "hour" lease-type spaces, and handles
// picking a start/end hour (or a single hour) the same way the day calendar handles single vs
// range picks: first click = provisional 1-hour booking, second click on a different slot = range.
function renderHourSlots(dayReservations) {
    const grid = document.getElementById("hour-slots-grid");
    grid.innerHTML = "";

    if (calendarOpenHour === null || calendarCloseHour === null) return;

    // Every hour already covered by an existing reservation that day, e.g. a 9-12 booking marks
    // hours 9, 10 and 11 as occupied (the slot LABELED "09:00" covers 09:00-10:00, and so on).
    const occupiedHours = new Set();
    dayReservations.forEach(reservation => {
        for (let h = reservation.start_hour; h < reservation.end_hour; h++) {
            occupiedHours.add(h);
        }
    });

    for (let hour = calendarOpenHour; hour < calendarCloseHour; hour++) {
        const slot = document.createElement("div");
        slot.className = "hour-slot";
        slot.dataset.hour = hour;
        slot.textContent = `${String(hour).padStart(2, "0")}:00 - ${String(hour + 1).padStart(2, "0")}:00`;

        if (occupiedHours.has(hour)) {
            slot.classList.add("occupied");
        } else {
            slot.addEventListener("click", () => handleHourSlotClick(hour, occupiedHours));
        }

        grid.appendChild(slot);
    }
}

function handleHourSlotClick(hour, occupiedHours) {
    if (hourSelectionStart === null) {
        // First click of a new selection: a provisional 1-hour booking.
        hourSelectionStart = hour;
        bookingStartHour = hour;
        bookingEndHour = hour + 1;
        totalPrice = calendarPrice;

        highlightHourRange(bookingStartHour, bookingEndHour);
        document.getElementById("message").innerHTML = `
            <p>You selected <strong>1 hour</strong> (${String(hour).padStart(2, "0")}:00 - ${String(hour + 1).padStart(2, "0")}:00).</p>
            <br>
            <p>Total Price: <strong>C$ ${totalPrice.toLocaleString()}</strong></p>
            <p style="font-size:12px;color:#888;">Click another hour to extend the range, or confirm to book just this hour.</p>
        `;
        toggleConfirmButton(true);
        return;
    }

    // Second click: turn it into a range covering everything between the two clicked hours.
    const rangeStart = Math.min(hourSelectionStart, hour);
    const rangeEnd = Math.max(hourSelectionStart, hour) + 1; // half-open range, e.g. 9 to 12 = 9,10,11

    let hasOccupiedHourInRange = false;
    for (let h = rangeStart; h < rangeEnd; h++) {
        if (occupiedHours.has(h)) hasOccupiedHourInRange = true;
    }

    // Whichever hour was just clicked starts a fresh selection next time.
    hourSelectionStart = null;

    if (hasOccupiedHourInRange) {
        totalPrice = 0;
        bookingStartHour = null;
        bookingEndHour = null;
        clearHourHighlight();
        document.getElementById("message").innerHTML = `
            <p style="color:#ff385c;">That range includes an hour that's already booked. Please pick a different range.</p>
        `;
        toggleConfirmButton(false);
        return;
    }

    bookingStartHour = rangeStart;
    bookingEndHour = rangeEnd;
    totalPrice = (rangeEnd - rangeStart) * calendarPrice;

    highlightHourRange(rangeStart, rangeEnd);
    document.getElementById("message").innerHTML = `
        <p>You selected <strong>${rangeEnd - rangeStart} hour(s)</strong> (${String(rangeStart).padStart(2, "0")}:00 - ${String(rangeEnd).padStart(2, "0")}:00).</p>
        <br>
        <p>Total Price: <strong>C$ ${totalPrice.toLocaleString()}</strong></p>
    `;
    toggleConfirmButton(true);
}

function highlightHourRange(startHour, endHour) {
    document.querySelectorAll("#hour-slots-grid .hour-slot").forEach(slot => {
        const hour = Number(slot.dataset.hour);
        slot.classList.toggle("selected", hour >= startHour && hour < endHour);
    });
}

function clearHourHighlight() {
    document.querySelectorAll("#hour-slots-grid .hour-slot.selected").forEach(slot => {
        slot.classList.remove("selected");
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const clearBtn = document.getElementById("hour-slots-clear-btn");
    if (!clearBtn) return;

    clearBtn.addEventListener("click", function () {
        hourSelectionStart = null;
        bookingStartHour = null;
        bookingEndHour = null;
        totalPrice = 0;
        clearHourHighlight();
        document.getElementById("message").innerHTML = "";
        toggleConfirmButton(false);
    });
});
// END HOUR SLOT PICKER -----------------------------------------------------------------------------------------------------






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







// BOOKING SUCCESS MODAL - Shown after a reservation is created, replacing the old alert() ----------------------
function showBookingSuccessModal(spaceTitle, startTime, endTime, rentTotal, startHour, endHour) {
    const modal = document.getElementById("bookingSuccessModal");
    const message = document.getElementById("bookingSuccessModalMessage");

    if (!modal) return;

    const messageText = (startHour !== null && startHour !== undefined)
        ? `You booked ${spaceTitle} on ${startTime} from ${String(startHour).padStart(2, "0")}:00 to ${String(endHour).padStart(2, "0")}:00. Total: C$ ${Number(rentTotal).toFixed(2)}.`
        : `You booked ${spaceTitle} from ${startTime} to ${endTime}. Total: C$ ${Number(rentTotal).toFixed(2)}.`;

    message.textContent = messageText;
    modal.classList.add("open");
}

document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("bookingSuccessModal");
    const closeBtn = document.getElementById("bookingSuccessModalCloseBtn");
    const profileBtn = document.getElementById("bookingSuccessModalProfileBtn");

    if (!modal) return;

    // "Book another space" - close the modal and refresh the page so the calendar/occupied
    // dates reflect the reservation that was just created.
    if (closeBtn) {
        closeBtn.addEventListener("click", function () {
            window.location.reload();
        });
    }

    if (profileBtn) {
        profileBtn.addEventListener("click", function () {
            window.location.href = "/user_profile.html";
        });
    }
});


// BOOKING CONFIRMATION - After select the dates and confirm booking
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("form-space");

    if (form) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault(); // prevents the default form submission
            
            // Check if user is logged in
            if (!user) {
                alert('You are not logged in. Please log in and do the reservation again.');

                // Save the current URL in sessionStorage before redirecting to login
                sessionStorage.setItem('redirectAfterLogin', window.location.href);

                // Redirect to login page
                window.location.href = "login.html";
                return;
            } 

            const workspaceId = new URLSearchParams(window.location.search).get('id');  // Get space_id from URL

            // Define the lease type (day/hour) — this should come from your workspace info
            const lease_time = document.getElementById("space-lease").textContent; // dynamically get from the workspace object

            // bookingStartTime/bookingEndTime are set by the calendar's onChange/onClose callbacks above.
            // For "hour" spaces, bookingStartHour/bookingEndHour must also be set.
            const hasValidDates = bookingStartTime && bookingEndTime && totalPrice;
            const hasValidHours = lease_time !== 'hour' || (bookingStartHour !== null && bookingEndHour !== null);

            if (!hasValidDates || !hasValidHours) {
                alert('Please select valid dates before confirming.');
                return;
            }

            const start_time = bookingStartTime;
            const end_time = bookingEndTime;

            // Define the price per unit and calculate total
            const rent_price = parseFloat(document.getElementById('space-price').textContent.replace(/[^\d.]/g, ''));
            const rent_total = totalPrice;

            const status = 'confirmed';
            const payment_status = 'paid';

            try {
                const response = await apiFetch('/api/spaces/workspaces/reservations_insert', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_id: user,
                        workspace_id: workspaceId,
                        start_time: start_time,
                        end_time: end_time,
                        lease_time: lease_time,
                        start_hour: lease_time === 'hour' ? bookingStartHour : undefined,
                        end_hour: lease_time === 'hour' ? bookingEndHour : undefined,
                        rent_price: rent_price,
                        rent_total: rent_total,
                        status: status,
                        payment_status: payment_status
                    })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    const spaceTitle = document.getElementById('space-title').textContent;
                    showBookingSuccessModal(spaceTitle, start_time, end_time, rent_total, bookingStartHour, bookingEndHour);
                } else {
                    alert(`Error creating reservation: ${result.error}`);
                }
            } catch (error) {
                console.error('Error sending booking:', error);
                alert('An unexpected error occurred.');
            }
            


        });
    }
});


/*
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("form-space");

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault(); // prevents the default form submission
            alert("you clicked reservation");
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

            // Send the updated dates to the server
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

*/


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
