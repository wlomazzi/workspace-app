document.addEventListener("DOMContentLoaded", function() {
    flatpickr("#date-range", {
        mode: "range", // Allows you to select a date range
        dateFormat: "M j, Y", // Format of displayed text
        minDate: "today", // Does not allow selecting past dates
        showMonths: 2 // Displays two months side by side
    });
});
