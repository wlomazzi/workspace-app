// Owner-facing management report for a single workspace: every reservation ever made on it,
// who made it, when, and how much it was worth - plus a small set of summary KPIs and filters.

const user = localStorage.getItem('user_id');
let allReservations = []; // Unfiltered data as returned by the API, kept so filters can re-run client-side.

document.addEventListener("DOMContentLoaded", async function () {
    const spaceId = new URLSearchParams(window.location.search).get('space_id');

    if (!user) {
        alert("You need to be logged in to view this page.");
        window.location.href = "/login.html";
        return;
    }

    if (!spaceId) {
        alert("No workspace specified.");
        window.location.href = "/user_profile.html";
        return;
    }

    try {
        const response = await apiFetch('/api/spaces/workspaces/owner_reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: spaceId })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            alert(errData.error || "This workspace was not found or does not belong to you.");
            window.location.href = "/user_profile.html";
            return;
        }

        const data = await response.json();
        allReservations = data.reservations || [];

        renderWorkspaceHeader(data.workspace);
        applyFilters(); // Initial render with no filters applied.

    } catch (error) {
        console.error("Error loading reservation report:", error);
        alert("Failed to load the reservation report.");
    }

    // Wire up filter controls.
    document.getElementById("filter-from").addEventListener("change", applyFilters);
    document.getElementById("filter-to").addEventListener("change", applyFilters);
    document.getElementById("filter-status").addEventListener("change", applyFilters);
    document.getElementById("filter-clear").addEventListener("click", function () {
        document.getElementById("filter-from").value = "";
        document.getElementById("filter-to").value = "";
        document.getElementById("filter-status").value = "all";
        applyFilters();
    });
});


// Fills in the workspace image/title/location/price header at the top of the page.
function renderWorkspaceHeader(workspace) {
    if (!workspace) return;

    const fallbackImage = 'https://taeieijsgxjagfulbndt.supabase.co/storage/v1/object/public/workspaces/spaces/000.jpg';

    document.getElementById("ws-image").src = workspace.image_01 || fallbackImage;
    document.getElementById("ws-title").textContent = workspace.title;
    document.getElementById("ws-location").textContent = workspace.neighborhood || workspace.address || "";
    document.getElementById("ws-price").textContent = `C$ ${workspace.price} / ${workspace.lease_time}`;
}


// A reservation's lifecycle state, derived from today's date rather than the raw "status"
// column (which is always "confirmed" in this app - there's no cancellation flow yet).
function computeLifecycleStatus(reservation) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, comparable as strings

    if (reservation.end_time < today) return "completed";
    if (reservation.start_time > today) return "upcoming";
    return "ongoing";
}


// Number of calendar days covered by a reservation (inclusive), used for the "Booked days" KPI.
function reservationDays(reservation) {
    const start = new Date(reservation.start_time);
    const end = new Date(reservation.end_time);
    const diffMs = end - start;
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return days > 0 ? days : 0;
}


// Re-applies the date range + status filters over `allReservations`, then re-renders both the
// KPI cards and the table so the summary numbers always reflect what's currently visible.
function applyFilters() {
    const from = document.getElementById("filter-from").value;
    const to = document.getElementById("filter-to").value;
    const status = document.getElementById("filter-status").value;

    const filtered = allReservations.filter(reservation => {
        if (from && reservation.end_time < from) return false;
        if (to && reservation.start_time > to) return false;
        if (status !== "all" && computeLifecycleStatus(reservation) !== status) return false;
        return true;
    });

    renderSummary(filtered);
    renderTable(filtered);
}


function renderSummary(reservations) {
    const totalRevenue = reservations.reduce((sum, r) => sum + (Number(r.rent_total) || 0), 0);
    const upcomingCount = reservations.filter(r => computeLifecycleStatus(r) === "upcoming").length;
    const totalDays = reservations.reduce((sum, r) => sum + reservationDays(r), 0);

    document.getElementById("kpi-revenue").textContent = `C$ ${totalRevenue.toFixed(2)}`;
    document.getElementById("kpi-count").textContent = reservations.length;
    document.getElementById("kpi-upcoming").textContent = upcomingCount;
    document.getElementById("kpi-days").textContent = totalDays;
}


function renderTable(reservations) {
    const tbody = document.getElementById("reservations-tbody");
    const emptyMessage = document.getElementById("reservations-empty");
    tbody.innerHTML = "";

    if (reservations.length === 0) {
        emptyMessage.style.display = "block";
        return;
    }
    emptyMessage.style.display = "none";

    reservations.forEach(reservation => {
        const renterName = reservation.renter?.full_name || "Unknown renter";
        const renterPhone = reservation.renter?.phone || "-";
        const lifecycleStatus = computeLifecycleStatus(reservation);

        const hoursLabel = (reservation.start_hour !== null && reservation.start_hour !== undefined)
            ? `${String(reservation.start_hour).padStart(2, "0")}:00 - ${String(reservation.end_hour).padStart(2, "0")}:00`
            : "-";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${renterName}</td>
            <td>${renterPhone}</td>
            <td>${reservation.start_time}</td>
            <td>${reservation.end_time}</td>
            <td>${hoursLabel}</td>
            <td>${reservation.lease_time || "-"}</td>
            <td>C$ ${Number(reservation.rent_total || 0).toFixed(2)}</td>
            <td><span class="status-badge status-${lifecycleStatus}">${lifecycleStatus}</span></td>
        `;
        tbody.appendChild(row);
    });
}
