const user = localStorage.getItem('user_id');

if (user) {
    // User is logged in, can send the token to the server or do other actions
    //alert("User ID: " + user);
    //console.log('Users is logged - ID: ', user);
} else {
    // User is not logged in
    alert("User is not logged in. Please log in to access this page.");
    // Redirect to login page or show a message
    window.location.href = 'login.html'; // Uncomment this line to redirect to login page
    console.log('User is not logged in');
}

// ---------------------------------------------------------------------------
// Shared helpers (used by both the rented-spaces report and the owned-spaces report)
// ---------------------------------------------------------------------------

// Formats a numeric CAD amount consistently across tiles, chart and table.
function formatCurrency(value) {
    const n = Number(value) || 0;
    return `C$ ${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// Formats an ISO date (YYYY-MM-DD) as e.g. "Aug 11".
function formatShortDate(isoDate) {
    if (!isoDate) return "—";
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Formats a start/end pair as "Aug 11 – Aug 12" (or a single date when they match).
function formatDateRange(from, to) {
    if (!from) return "—";
    if (!to || to === from) return formatShortDate(from);
    return `${formatShortDate(from)} – ${formatShortDate(to)}`;
}

// Formats a Date as a local YYYY-MM-DD string (no UTC conversion, unlike
// toISOString() - that matters here since rented_from/rented_to are plain
// local calendar dates and comparing them as strings must stay in that
// same "no timezone" world).
function formatIsoDateLocal(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Turns a period preset (+ optional custom bounds) into an inclusive
// { from, to } ISO-date range. Either side can be null, meaning unbounded.
function getPeriodRangeIso(preset, customFrom, customTo) {
    const today = new Date();
    switch (preset) {
        case "30": {
            const from = new Date(today);
            from.setDate(from.getDate() - 29);
            return { from: formatIsoDateLocal(from), to: formatIsoDateLocal(today) };
        }
        case "90": {
            const from = new Date(today);
            from.setDate(from.getDate() - 89);
            return { from: formatIsoDateLocal(from), to: formatIsoDateLocal(today) };
        }
        case "month": {
            const from = new Date(today.getFullYear(), today.getMonth(), 1);
            const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            return { from: formatIsoDateLocal(from), to: formatIsoDateLocal(to) };
        }
        case "year": {
            const from = new Date(today.getFullYear(), 0, 1);
            const to = new Date(today.getFullYear(), 11, 31);
            return { from: formatIsoDateLocal(from), to: formatIsoDateLocal(to) };
        }
        case "custom":
            return { from: customFrom || null, to: customTo || null };
        default:
            return { from: null, to: null };
    }
}

// Classifies a start/end date pair against today: "upcoming" | "ongoing" | "completed".
// Shared by the rented-spaces report (my bookings) and the owned-spaces report (bookings I received).
function classifyReservationStatus(startTime, endTime) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = startTime ? new Date(startTime) : null;
    const end = endTime ? new Date(endTime) : null;
    if (start && end) {
        if (today < start) return "upcoming";
        if (today >= start && today <= end) return "ongoing";
        return "completed";
    }
    return "completed";
}

function statusBadge(status) {
    const map = {
        upcoming:  { label: "Upcoming",  cls: "status-upcoming" },
        ongoing:   { label: "Ongoing",   cls: "status-ongoing" },
        completed: { label: "Completed", cls: "status-completed" }
    };
    const info = map[status] || map.completed;
    return `<span class="status-badge ${info.cls}"><span class="status-dot"></span>${info.label}</span>`;
}

// Human label for how long a reservation runs.
function getDurationLabel(space) {
    if (space.lease_time === "hour") return "Hourly";
    if (!Number.isFinite(space.duration_days) || space.duration_days <= 0) return "—";
    return space.duration_days === 1 ? "1 day" : `${space.duration_days} days`;
}

// Display label for a workspace's "type" column (matches the DB check constraint).
function spaceTypeLabel(type) {
    const map = {
        meeting_room: "Meeting room",
        private_office: "Private office",
        open_desk: "Open desk"
    };
    return map[type] || type || "—";
}

// Generic "money over time" bar chart used by both reports - records just need
// a `rented_from` (ISO date) and `rent_total` (number) field.
function renderMonthlySpendChart(containerId, records, hasAnyData) {
    const chart = document.getElementById(containerId);
    if (!chart) return;

    const monthTotals = {};
    records.forEach(r => {
        if (!r.rented_from) return;
        const d = new Date(r.rented_from);
        if (isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthTotals[key] = (monthTotals[key] || 0) + r.rent_total;
    });

    const months = Object.keys(monthTotals).sort();
    chart.innerHTML = "";

    if (months.length === 0) {
        const message = hasAnyData
            ? "No spending to show for the current filters."
            : "Not enough data yet.";
        chart.innerHTML = `<p class="report-chart-empty">${message}</p>`;
        return;
    }

    const maxValue = Math.max(...months.map(m => monthTotals[m]));

    months.forEach(key => {
        const value = monthTotals[key];
        const heightPct = maxValue > 0 ? Math.max(6, (value / maxValue) * 100) : 0;
        const [y, m] = key.split("-");
        const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short" });

        const col = document.createElement("div");
        col.className = "chart-col";
        col.innerHTML = `
            <span class="chart-value">${formatCurrency(value)}</span>
            <div class="chart-bar-track">
                <div class="chart-bar" style="height:${heightPct}%"></div>
            </div>
            <span class="chart-axis-label">${label}</span>
        `;
        chart.appendChild(col);
    });
}

function updateSortIndicatorsFor(tableSelector, sortState) {
    document.querySelectorAll(`${tableSelector} thead th`).forEach(th => {
        const arrow = th.querySelector(".sort-arrow");
        if (!arrow) return;
        if (th.dataset.sort === sortState.key) {
            arrow.textContent = sortState.dir === "asc" ? "▲" : "▼";
            th.classList.add("sorted");
        } else {
            arrow.textContent = "";
            th.classList.remove("sorted");
        }
    });
}

function downloadCsv(filename, header, rows) {
    const csv = [header, ...rows]
        .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Rented-spaces report ("Work4Fun - spaces rented by you"): state + helpers
// ---------------------------------------------------------------------------
let allRentedSpaces = [];               // raw reservation+workspace records for the logged-in user
let currentSort = { key: "rented_from", dir: "desc" };
let currentFilter = "all";              // "all" | "upcoming" | "ongoing" | "completed"
let currentLocationFilter = "all";      // "all" | one of the user's rented locations
let currentPeriodPreset = "all";        // "all" | "30" | "90" | "month" | "year" | "custom"
let currentPeriodFrom = "";             // ISO date, only used when currentPeriodPreset === "custom"
let currentPeriodTo = "";               // ISO date, only used when currentPeriodPreset === "custom"
let currentSearch = "";
let currentViewMode = "table";          // "table" | "cards"
let reportControlsWired = false;

// Turns one raw reservation (as returned by /coworker_spaces) into the flat
// record every report view (tiles, chart, table, cards) is built from.
function buildRentedSpaceRecord(space) {
    const workspace = space.workspace || {};
    const startTime = space.start_time || null;
    const endTime = space.end_time || null;

    let durationDays = 0;
    if (startTime && endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            durationDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
        }
    }

    return {
        id: space.workspace_id,
        title: workspace.title || "Unknown",
        location: workspace.neighborhood || "Unknown",
        image: workspace.image_01,
        lease_time: space.lease_time,
        rent_price: Number(space.rent_price) || 0,
        rent_total: Number(space.rent_total) || 0,
        rented_from: startTime,
        rented_to: endTime,
        duration_days: durationDays,
        status: classifyReservationStatus(startTime, endTime)
    };
}

// Aggregate numbers for the stat-tile row.
function computeReportSummary(spaces) {
    const total = spaces.reduce((sum, s) => sum + s.rent_total, 0);
    const count = spaces.length;
    const avg = count ? total / count : 0;

    const nextUpcoming = spaces
        .filter(s => s.status === "upcoming" && s.rented_from)
        .sort((a, b) => new Date(a.rented_from) - new Date(b.rented_from))[0];

    return { total, count, avg, nextUpcoming };
}

function renderReportSummary(summary) {
    const container = document.getElementById("report-summary");
    if (!container) return;

    if (summary.count === 0) {
        const message = allRentedSpaces.length === 0
            ? "No reservations yet - once you book a space, your stats will show up here."
            : "No reservations match the current filters.";
        container.innerHTML = `<p class="report-empty-summary">${message}</p>`;
        return;
    }

    container.innerHTML = `
        <div class="stat-tile">
            <span class="stat-label">Total spent</span>
            <span class="stat-value">${formatCurrency(summary.total)}</span>
        </div>
        <div class="stat-tile">
            <span class="stat-label">Reservations</span>
            <span class="stat-value">${summary.count}</span>
        </div>
        <div class="stat-tile">
            <span class="stat-label">Avg. per booking</span>
            <span class="stat-value">${formatCurrency(summary.avg)}</span>
        </div>
        <div class="stat-tile">
            <span class="stat-label">Next reservation</span>
            <span class="stat-value">${summary.nextUpcoming ? formatShortDate(summary.nextUpcoming.rented_from) : "—"}</span>
        </div>
    `;
}

// Applies the current status/location/period filters + search text + sort column to allRentedSpaces.
function getFilteredSortedRentedSpaces() {
    const query = currentSearch.trim().toLowerCase();
    const period = getPeriodRangeIso(currentPeriodPreset, currentPeriodFrom, currentPeriodTo);

    let filtered = allRentedSpaces.filter(s => {
        if (currentFilter !== "all" && s.status !== currentFilter) return false;
        if (currentLocationFilter !== "all" && s.location !== currentLocationFilter) return false;
        // Period filters on the reservation's start date (same field the chart groups by).
        if (period.from && (!s.rented_from || s.rented_from < period.from)) return false;
        if (period.to && (!s.rented_from || s.rented_from > period.to)) return false;
        if (query && !s.title.toLowerCase().includes(query) && !s.location.toLowerCase().includes(query)) return false;
        return true;
    });

    filtered.sort((a, b) => {
        let va = a[currentSort.key];
        let vb = b[currentSort.key];

        if (currentSort.key === "rented_from") {
            va = a.rented_from ? new Date(a.rented_from).getTime() : 0;
            vb = b.rented_from ? new Date(b.rented_from).getTime() : 0;
        } else if (typeof va === "string") {
            va = va.toLowerCase();
            vb = String(vb).toLowerCase();
        }

        if (va < vb) return currentSort.dir === "asc" ? -1 : 1;
        if (va > vb) return currentSort.dir === "asc" ? 1 : -1;
        return 0;
    });

    return filtered;
}

function renderRentedTable(spaces) {
    const tbody = document.getElementById("rented-spaces-table-body");
    const table = document.getElementById("report-table");
    const emptyState = document.getElementById("report-empty-state");
    if (!tbody || !table || !emptyState) return;

    tbody.innerHTML = "";

    if (spaces.length === 0) {
        table.style.display = "none";
        emptyState.style.display = "block";
        return;
    }

    table.style.display = "table";
    emptyState.style.display = "none";

    spaces.forEach(space => {
        const tr = document.createElement("tr");
        tr.className = "report-table-row";
        tr.innerHTML = `
            <td>
                <div class="report-table-space">
                    <img src="${space.image}" alt="${space.title}">
                    <span>${space.title}</span>
                </div>
            </td>
            <td>${space.location}</td>
            <td>${formatDateRange(space.rented_from, space.rented_to)}</td>
            <td>${getDurationLabel(space)}</td>
            <td>${statusBadge(space.status)}</td>
            <td class="report-table-value">${formatCurrency(space.rent_total)}</td>
        `;
        tr.addEventListener("click", () => openSpaceDetails(space.id));
        tbody.appendChild(tr);
    });
}

function exportRentedSpacesCsv(spaces) {
    downloadCsv(
        "work4fun-rentals.csv",
        ["Space", "Location", "Start", "End", "Status", "Total (CAD)"],
        spaces.map(s => [s.title, s.location, s.rented_from || "", s.rented_to || "", s.status, s.rent_total])
    );
}

// Card view (alternate to the report table) - kept for people who prefer the
// visual grid over rows. Driven by the same flat records as the table.
function populateSpacesRented(containerId, spaces) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    if (spaces.length === 0) {
        container.innerHTML = `<p class="report-empty-state">No reservations found.</p>`;
        return;
    }

    spaces.forEach(space => {
        const spaceCard = document.createElement("div");
        spaceCard.classList.add("space-card");
        spaceCard.innerHTML = `
            <div class="spaces-rented" onclick="openSpaceDetails('${space.id}')">
                <img src="${space.image}" alt="${space.title}">
                <h4>${space.title}</h4>
                <p>${space.location} / <strong>C$ ${space.rent_price} / ${space.lease_time}</strong></p>
                <p>${formatDateRange(space.rented_from, space.rented_to)} &middot; ${statusBadge(space.status)}</p>
                <p><strong>Rent total ${formatCurrency(space.rent_total)}</strong></p>
            </div>
        `;
        container.appendChild(spaceCard);
    });
}

// Fills the location dropdown with the distinct locations that actually
// appear in this user's reservations - a picklist beats free text since it
// can't typo and shows exactly what's filterable.
function populateLocationFilterOptions(selectId, spaces) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const locations = [...new Set(spaces.map(s => s.location).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));

    locations.forEach(location => {
        const option = document.createElement("option");
        option.value = location;
        option.textContent = location;
        select.appendChild(option);
    });
}

// Re-renders the whole report - stat tiles, chart, and whichever view (table
// or cards) is currently active - against the active filters/search/sort.
// Call this after data loads or any control changes, so every piece of the
// report always reflects the same filtered slice.
function refreshRentedSpacesReport() {
    const filtered = getFilteredSortedRentedSpaces();
    updateSortIndicatorsFor("#report-table", currentSort);
    renderReportSummary(computeReportSummary(filtered));
    renderMonthlySpendChart("report-chart", filtered, allRentedSpaces.length > 0);
    if (currentViewMode === "table") {
        renderRentedTable(filtered);
    } else {
        populateSpacesRented("rented-spaces", filtered);
    }
}

// Wires up the toolbar/table controls once (filter select, search box, sort
// headers, view toggle, CSV export). Safe to call even with zero reservations.
function setupReportControls() {
    if (reportControlsWired) return;
    reportControlsWired = true;

    const filterSelect = document.getElementById("report-filter-status");
    const locationSelect = document.getElementById("report-filter-location");
    const periodSelect = document.getElementById("report-filter-period");
    const periodCustomWrap = document.getElementById("report-period-custom");
    const periodFromInput = document.getElementById("report-period-from");
    const periodToInput = document.getElementById("report-period-to");
    const searchInput = document.getElementById("report-search");
    const clearFiltersBtn = document.getElementById("report-clear-filters-btn");
    const viewTableBtn = document.getElementById("view-table-btn");
    const viewCardsBtn = document.getElementById("view-cards-btn");
    const exportBtn = document.getElementById("export-csv-btn");
    const tableWrap = document.getElementById("report-table-wrap");
    const cardsWrap = document.getElementById("rented-spaces");

    if (filterSelect) {
        filterSelect.addEventListener("change", (e) => {
            currentFilter = e.target.value;
            refreshRentedSpacesReport();
        });
    }

    if (locationSelect) {
        locationSelect.addEventListener("change", (e) => {
            currentLocationFilter = e.target.value;
            refreshRentedSpacesReport();
        });
    }

    if (periodSelect) {
        periodSelect.addEventListener("change", (e) => {
            currentPeriodPreset = e.target.value;
            if (periodCustomWrap) {
                periodCustomWrap.style.display = currentPeriodPreset === "custom" ? "inline-flex" : "none";
            }
            // Wait for the from/to inputs when "Custom range" is picked - filtering on an empty
            // range would otherwise briefly show everything, then jump once a date is entered.
            if (currentPeriodPreset !== "custom") {
                refreshRentedSpacesReport();
            }
        });
    }

    if (periodFromInput) {
        periodFromInput.addEventListener("change", (e) => {
            currentPeriodFrom = e.target.value;
            refreshRentedSpacesReport();
        });
    }

    if (periodToInput) {
        periodToInput.addEventListener("change", (e) => {
            currentPeriodTo = e.target.value;
            refreshRentedSpacesReport();
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentSearch = e.target.value;
            refreshRentedSpacesReport();
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener("click", () => {
            currentFilter = "all";
            currentLocationFilter = "all";
            currentPeriodPreset = "all";
            currentPeriodFrom = "";
            currentPeriodTo = "";
            currentSearch = "";

            if (filterSelect) filterSelect.value = "all";
            if (locationSelect) locationSelect.value = "all";
            if (periodSelect) periodSelect.value = "all";
            if (periodFromInput) periodFromInput.value = "";
            if (periodToInput) periodToInput.value = "";
            if (periodCustomWrap) periodCustomWrap.style.display = "none";
            if (searchInput) searchInput.value = "";

            refreshRentedSpacesReport();
        });
    }

    document.querySelectorAll("#report-table thead th[data-sort]").forEach(th => {
        th.addEventListener("click", () => {
            const key = th.dataset.sort;
            if (currentSort.key === key) {
                currentSort.dir = currentSort.dir === "asc" ? "desc" : "asc";
            } else {
                currentSort = { key, dir: "asc" };
            }
            refreshRentedSpacesReport();
        });
    });

    if (viewTableBtn && viewCardsBtn && tableWrap && cardsWrap) {
        viewTableBtn.addEventListener("click", () => {
            currentViewMode = "table";
            viewTableBtn.classList.add("active");
            viewCardsBtn.classList.remove("active");
            tableWrap.style.display = "block";
            cardsWrap.style.display = "none";
            refreshRentedSpacesReport();
        });

        viewCardsBtn.addEventListener("click", () => {
            currentViewMode = "cards";
            viewCardsBtn.classList.add("active");
            viewTableBtn.classList.remove("active");
            tableWrap.style.display = "none";
            cardsWrap.style.display = "flex";
            refreshRentedSpacesReport();
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            exportRentedSpacesCsv(getFilteredSortedRentedSpaces());
        });
    }
}

// ---------------------------------------------------------------------------
// Owned-spaces report ("Work4Fun - your spaces available"): state + helpers
// Only loaded/shown for confirmed owners (user_owner === 'true').
// ---------------------------------------------------------------------------
let allOwnedSpaces = [];                // one aggregated record per space the user owns
let allOwnedReservations = [];          // flat list of every booking received, across all owned spaces
let ownedCurrentSort = { key: "title", dir: "asc" };
let ownedCurrentTypeFilter = "all";     // "all" | "meeting_room" | "private_office" | "open_desk"
let ownedCurrentLocationFilter = "all";
let ownedCurrentSearch = "";
let ownedCurrentViewMode = "table";     // "table" | "cards"
let ownedReportControlsWired = false;

// Fetches reservation stats for every owned space in parallel (there's no single
// "all reservations across all my spaces" endpoint, so this calls /owner_reservations
// once per space) and returns the per-space records the owned report is built from.
// Also fills allOwnedReservations, the flat per-booking list the revenue chart uses.
async function buildOwnedSpacesReport(rawWorkspaces) {
    allOwnedReservations = [];

    const records = await Promise.all(rawWorkspaces.map(async (workspace) => {
        let reservations = [];
        try {
            const resp = await apiFetch('/api/spaces/workspaces/owner_reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspace_id: workspace.id }),
            });
            if (resp.ok) {
                const payload = await resp.json();
                reservations = payload.reservations || [];
            }
        } catch (error) {
            console.error('Error fetching reservations for workspace', workspace.id, error);
        }

        const bookings = reservations.length;
        const revenue = reservations.reduce((sum, r) => sum + (Number(r.rent_total) || 0), 0);
        const nextUpcoming = reservations
            .filter(r => classifyReservationStatus(r.start_time, r.end_time) === "upcoming")
            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0];

        reservations.forEach(r => {
            allOwnedReservations.push({
                rented_from: r.start_time || null,
                rent_total: Number(r.rent_total) || 0,
                space_id: workspace.id
            });
        });

        return {
            id: workspace.id,
            title: workspace.title,
            location: workspace.neighborhood || "Unknown",
            image: workspace.image_01,
            price: Number(workspace.price) || 0,
            lease_time: workspace.lease_time,
            type: workspace.type,
            active: workspace.active !== false, // missing/null treated as active (matches DB default)
            bookings,
            revenue,
            nextBooking: nextUpcoming ? nextUpcoming.start_time : null
        };
    }));

    return records;
}

function computeOwnedReportSummary(spaces) {
    const totalSpaces = spaces.length;
    const totalBookings = spaces.reduce((sum, s) => sum + s.bookings, 0);
    const totalRevenue = spaces.reduce((sum, s) => sum + s.revenue, 0);

    let topSpace = null;
    spaces.forEach(s => {
        if (s.revenue > 0 && (!topSpace || s.revenue > topSpace.revenue)) topSpace = s;
    });

    return { totalSpaces, totalBookings, totalRevenue, topSpace };
}

function renderOwnedReportSummary(summary) {
    const container = document.getElementById("owned-report-summary");
    if (!container) return;

    if (summary.totalSpaces === 0) {
        const message = allOwnedSpaces.length === 0
            ? "You don't have any listed spaces yet - add one to start hosting."
            : "No spaces match the current filters.";
        container.innerHTML = `<p class="report-empty-summary">${message}</p>`;
        return;
    }

    container.innerHTML = `
        <div class="stat-tile">
            <span class="stat-label">Listed spaces</span>
            <span class="stat-value">${summary.totalSpaces}</span>
        </div>
        <div class="stat-tile">
            <span class="stat-label">Bookings received</span>
            <span class="stat-value">${summary.totalBookings}</span>
        </div>
        <div class="stat-tile">
            <span class="stat-label">Revenue earned</span>
            <span class="stat-value">${formatCurrency(summary.totalRevenue)}</span>
        </div>
        <div class="stat-tile">
            <span class="stat-label">Best performing space</span>
            <span class="stat-value">${summary.topSpace ? summary.topSpace.title : "—"}</span>
        </div>
    `;
}

function getFilteredSortedOwnedSpaces() {
    const query = ownedCurrentSearch.trim().toLowerCase();

    let filtered = allOwnedSpaces.filter(s => {
        if (ownedCurrentTypeFilter !== "all" && s.type !== ownedCurrentTypeFilter) return false;
        if (ownedCurrentLocationFilter !== "all" && s.location !== ownedCurrentLocationFilter) return false;
        if (query && !s.title.toLowerCase().includes(query) && !s.location.toLowerCase().includes(query)) return false;
        return true;
    });

    filtered.sort((a, b) => {
        let va = a[ownedCurrentSort.key];
        let vb = b[ownedCurrentSort.key];

        if (typeof va === "string") {
            va = va.toLowerCase();
            vb = String(vb).toLowerCase();
        }

        if (va < vb) return ownedCurrentSort.dir === "asc" ? -1 : 1;
        if (va > vb) return ownedCurrentSort.dir === "asc" ? 1 : -1;
        return 0;
    });

    return filtered;
}

// Activates or deactivates a workspace directly from the list (table row or card icon), without
// going through the delete modal. Reversible either direction, so no confirmation prompt - just an
// optimistic disable-while-in-flight and a reload on success to refresh bookings/active state.
async function handleToggleActive(spaceId, isCurrentlyActive, buttonEl) {
    const nextActive = !isCurrentlyActive;
    if (buttonEl) buttonEl.disabled = true;

    try {
        const response = await apiFetch('/api/spaces/workspaces/set_active', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ space_id: spaceId, active: nextActive })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            window.location.reload();
        } else {
            alert(`Failed to ${nextActive ? "activate" : "deactivate"} workspace: ` + (result.error || "Unknown error"));
            if (buttonEl) buttonEl.disabled = false;
        }
    } catch (error) {
        console.error("Error updating workspace active status:", error);
        alert("An error occurred while updating the workspace status.");
        if (buttonEl) buttonEl.disabled = false;
    }
}

function renderOwnedTable(spaces) {
    const tbody = document.getElementById("owned-spaces-table-body");
    const table = document.getElementById("owned-report-table");
    const emptyState = document.getElementById("owned-report-empty-state");
    if (!tbody || !table || !emptyState) return;

    tbody.innerHTML = "";

    if (spaces.length === 0) {
        table.style.display = "none";
        emptyState.style.display = "block";
        return;
    }

    table.style.display = "table";
    emptyState.style.display = "none";

    spaces.forEach(space => {
        const hasReservations = space.bookings > 0;
        const isActive = space.active !== false;

        const tr = document.createElement("tr");
        tr.className = "report-table-row" + (isActive ? "" : " report-table-row-inactive");
        tr.innerHTML = `
            <td>
                <div class="report-table-space">
                    <img src="${space.image}" alt="${space.title}">
                    <span>${space.title}</span>
                    ${isActive ? "" : '<span class="status-badge status-inactive"><span class="status-dot"></span>Inactive</span>'}
                </div>
            </td>
            <td>${space.location}</td>
            <td>${formatCurrency(space.price)} / ${space.lease_time}</td>
            <td>${spaceTypeLabel(space.type)}</td>
            <td>${space.bookings}</td>
            <td class="report-table-value">${formatCurrency(space.revenue)}</td>
            <td>
                <div class="report-table-actions">
                    <button type="button" class="report-row-action-btn" data-action="reservations">View reservations</button>
                    <button type="button" class="report-row-toggle-btn${isActive ? "" : " is-inactive"}" data-action="toggle-active" title="${isActive ? "Deactivate workspace" : "Activate workspace"}" aria-label="${isActive ? "Deactivate workspace" : "Activate workspace"}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                            <line x1="12" y1="2" x2="12" y2="12"></line>
                        </svg>
                    </button>
                    <button type="button" class="report-row-delete-btn" data-action="delete" title="${hasReservations ? "Can't delete: this space has reservations - deactivate it instead" : "Delete workspace"}" aria-label="Delete workspace" ${hasReservations ? "disabled" : ""}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                            <path d="M10 11v6"></path>
                            <path d="M14 11v6"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;

        tr.querySelector('[data-action="reservations"]').addEventListener("click", (event) => {
            event.stopPropagation();
            window.location.href = `space_reservations.html?space_id=${space.id}`;
        });
        tr.querySelector('[data-action="toggle-active"]').addEventListener("click", (event) => {
            event.stopPropagation();
            handleToggleActive(space.id, isActive, event.currentTarget);
        });
        const deleteBtn = tr.querySelector('[data-action="delete"]');
        deleteBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            if (deleteBtn.disabled) return;
            openDeleteModal(space.id, space.title);
        });
        tr.addEventListener("click", () => {
            window.location.href = `space_manage.html?space_id=${space.id}`;
        });

        tbody.appendChild(tr);
    });
}

function exportOwnedSpacesCsv(spaces) {
    downloadCsv(
        "work4fun-owned-spaces.csv",
        ["Space", "Location", "Price", "Lease time", "Type", "Bookings received", "Revenue earned (CAD)"],
        spaces.map(s => [s.title, s.location, s.price, s.lease_time, spaceTypeLabel(s.type), s.bookings, s.revenue])
    );
}

// Card view (alternate to the report table) - the original grid layout, now
// driven by the aggregated report records so it also shows bookings/revenue.
function populateSpacesOwned(containerId, spaces) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    if (spaces.length === 0) {
        container.innerHTML = `<p class="report-empty-state">No spaces found.</p>`;
        return;
    }

    spaces.forEach(space => {
        const hasReservations = space.bookings > 0;
        const isActive = space.active !== false;

        const wrapper = document.createElement("div");
        wrapper.classList.add("space-card-wrapper");
        if (!isActive) wrapper.classList.add("space-card-wrapper-inactive");
        wrapper.innerHTML = `
            <button type="button" class="space-toggle-btn${isActive ? "" : " is-inactive"}" title="${isActive ? "Deactivate workspace" : "Activate workspace"}" aria-label="${isActive ? "Deactivate workspace" : "Activate workspace"}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                    <line x1="12" y1="2" x2="12" y2="12"></line>
                </svg>
            </button>
            <button type="button" class="space-delete-btn" title="${hasReservations ? "Can't delete: this space has reservations - deactivate it instead" : "Delete workspace"}" aria-label="Delete workspace" ${hasReservations ? "disabled" : ""}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                    <path d="M10 11v6"></path>
                    <path d="M14 11v6"></path>
                </svg>
            </button>
            <div class="space-card">
                <img src="${space.image}" alt="${space.title}">
                <h4>${space.title}</h4>
                ${isActive ? "" : '<span class="status-badge status-inactive"><span class="status-dot"></span>Inactive</span>'}
                <p>${space.location}</p>
                <p><strong>${formatCurrency(space.price)} / ${space.lease_time}</strong></p>
                <p class="report-card-meta">${space.bookings} booking${space.bookings === 1 ? "" : "s"} &middot; ${formatCurrency(space.revenue)} earned</p>
                <button type="button" class="space-reservations-btn">View reservations</button>
            </div>
        `;

        // Wire up events with real listeners (avoids HTML-escaping issues with inline onclick strings)
        wrapper.querySelector(".space-toggle-btn").addEventListener("click", function (event) {
            event.stopPropagation();
            handleToggleActive(space.id, isActive, this);
        });
        const cardDeleteBtn = wrapper.querySelector(".space-delete-btn");
        cardDeleteBtn.addEventListener("click", function (event) {
            event.stopPropagation();
            if (cardDeleteBtn.disabled) return;
            openDeleteModal(space.id, space.title);
        });
        wrapper.querySelector(".space-reservations-btn").addEventListener("click", function (event) {
            event.stopPropagation();
            window.location.href = `space_reservations.html?space_id=${space.id}`;
        });
        wrapper.querySelector(".space-card").addEventListener("click", function () {
            window.location.href = `space_manage.html?space_id=${space.id}`;
        });

        container.appendChild(wrapper);
    });
}

function refreshOwnedSpacesReport() {
    const filtered = getFilteredSortedOwnedSpaces();
    updateSortIndicatorsFor("#owned-report-table", ownedCurrentSort);
    renderOwnedReportSummary(computeOwnedReportSummary(filtered));

    const filteredIds = new Set(filtered.map(s => s.id));
    const filteredReservations = allOwnedReservations.filter(r => filteredIds.has(r.space_id));
    renderMonthlySpendChart("owned-report-chart", filteredReservations, allOwnedReservations.length > 0);

    if (ownedCurrentViewMode === "table") {
        renderOwnedTable(filtered);
    } else {
        populateSpacesOwned("owned-spaces", filtered);
    }
}

function setupOwnedReportControls() {
    if (ownedReportControlsWired) return;
    ownedReportControlsWired = true;

    const typeSelect = document.getElementById("owned-filter-type");
    const locationSelect = document.getElementById("owned-filter-location");
    const searchInput = document.getElementById("owned-search");
    const clearFiltersBtn = document.getElementById("owned-clear-filters-btn");
    const viewTableBtn = document.getElementById("owned-view-table-btn");
    const viewCardsBtn = document.getElementById("owned-view-cards-btn");
    const exportBtn = document.getElementById("owned-export-csv-btn");
    const tableWrap = document.getElementById("owned-report-table-wrap");
    const cardsWrap = document.getElementById("owned-spaces");

    if (typeSelect) {
        typeSelect.addEventListener("change", (e) => {
            ownedCurrentTypeFilter = e.target.value;
            refreshOwnedSpacesReport();
        });
    }

    if (locationSelect) {
        locationSelect.addEventListener("change", (e) => {
            ownedCurrentLocationFilter = e.target.value;
            refreshOwnedSpacesReport();
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            ownedCurrentSearch = e.target.value;
            refreshOwnedSpacesReport();
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener("click", () => {
            ownedCurrentTypeFilter = "all";
            ownedCurrentLocationFilter = "all";
            ownedCurrentSearch = "";

            if (typeSelect) typeSelect.value = "all";
            if (locationSelect) locationSelect.value = "all";
            if (searchInput) searchInput.value = "";

            refreshOwnedSpacesReport();
        });
    }

    document.querySelectorAll("#owned-report-table thead th[data-sort]").forEach(th => {
        th.addEventListener("click", () => {
            const key = th.dataset.sort;
            if (ownedCurrentSort.key === key) {
                ownedCurrentSort.dir = ownedCurrentSort.dir === "asc" ? "desc" : "asc";
            } else {
                ownedCurrentSort = { key, dir: "asc" };
            }
            refreshOwnedSpacesReport();
        });
    });

    if (viewTableBtn && viewCardsBtn && tableWrap && cardsWrap) {
        viewTableBtn.addEventListener("click", () => {
            ownedCurrentViewMode = "table";
            viewTableBtn.classList.add("active");
            viewCardsBtn.classList.remove("active");
            tableWrap.style.display = "block";
            cardsWrap.style.display = "none";
            refreshOwnedSpacesReport();
        });

        viewCardsBtn.addEventListener("click", () => {
            ownedCurrentViewMode = "cards";
            viewCardsBtn.classList.add("active");
            viewTableBtn.classList.remove("active");
            tableWrap.style.display = "none";
            cardsWrap.style.display = "flex";
            refreshOwnedSpacesReport();
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            exportOwnedSpacesCsv(getFilteredSortedOwnedSpaces());
        });
    }
}

// ---------------------------------------------------------------------------
// Profile tabs ("Your spaces available" / "Spaces rented by you")
// Only wired up for confirmed owners - everyone else just sees the rented
// report directly, with no tab bar (nothing to switch between).
// ---------------------------------------------------------------------------
function setupProfileTabs() {
    const tabBtnOwned = document.getElementById("tab-btn-owned");
    const tabBtnRented = document.getElementById("tab-btn-rented");
    const panelOwned = document.getElementById("tab-panel-owned");
    const panelRented = document.getElementById("tab-panel-rented");

    if (!tabBtnOwned || !tabBtnRented || !panelOwned || !panelRented) return;

    function activate(tab) {
        const isOwnedTab = tab === "owned";
        tabBtnOwned.classList.toggle("active", isOwnedTab);
        tabBtnRented.classList.toggle("active", !isOwnedTab);
        panelOwned.style.display = isOwnedTab ? "block" : "none";
        panelRented.style.display = isOwnedTab ? "none" : "block";
    }

    tabBtnOwned.addEventListener("click", () => activate("owned"));
    tabBtnRented.addEventListener("click", () => activate("rented"));

    activate("owned");
}

// When loaded, return all workspaces related to the user
// User OWNER
// User COWORKER
document.addEventListener("DOMContentLoaded", async function () {
    try {

        const userId = localStorage.getItem('user_id'); // Gets the user ID from localStorage
        const userEmail = localStorage.getItem('user_email'); // Get user email from localStorage
        const userPhone = localStorage.getItem('user_phone'); // Get the user's phone from localStorage
        const userLocation = localStorage.getItem('user_location'); // Get user's phone from localStorage
        const userFullName = localStorage.getItem('user_fullname'); // Gets the full name
        const userProfilePic = localStorage.getItem('user_picture'); // Get user profile picture from localStorage

        const userIsOwner    = localStorage.getItem('user_owner'); // Checks if the user is an owner
        const userIsCoworker = localStorage.getItem('user_coworker'); // Checks if the user is a coworker

        try {
            const response = await apiFetch('/api/spaces/workspaces/owner_spaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,  // Pass the user_id in the request body
                }),
            });

            const ownedWorkspacesRaw = await response.json();

            // Fetch rented spaces for the user
            const respRentedSpaces = await apiFetch('/api/spaces/workspaces/coworker_spaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,  // Pass the user_id in the request body
                }),
            });

            // Check if the response status is OK (status code 200-299)
            if (!respRentedSpaces.ok) {
                throw new Error('Failed to fetch rented spaces');
            }

            // Parse the JSON response data
            const dataRentedSpaces = await respRentedSpaces.json();

            // Build the flat records the rented-spaces report (stat tiles, chart, table, cards) is driven from.
            allRentedSpaces = dataRentedSpaces.map(buildRentedSpaceRecord);

            if (dataRentedSpaces.length === 0) {
                console.log('No rented spaces found for this user');
            }

            populateLocationFilterOptions("report-filter-location", allRentedSpaces);
            setupReportControls();
            refreshRentedSpacesReport(); // renders stat tiles, chart and the active view together

            // Fill user profile info
            document.getElementById("user-name").textContent = userFullName;
            document.getElementById("user-email").textContent = userEmail;
            document.getElementById("user-phone").textContent = userPhone;
            document.getElementById("user-location").textContent = userLocation;
            document.querySelector(".profile-pic").src = userProfilePic;

            // Tabs + owned-spaces report - only for confirmed owners. Non-owners just see the
            // rented-spaces panel directly, with no tab bar (there's nothing else to switch to).
            if (userIsOwner === 'true') {
                document.getElementById('profile-tabs').style.display = 'flex';
                document.getElementById('tab-panel-owned').style.display = 'block';
                document.querySelector('.add-new-btn').style.display = 'inline-block';
                setupProfileTabs();

                allOwnedSpaces = await buildOwnedSpacesReport(ownedWorkspacesRaw);
                populateLocationFilterOptions("owned-filter-location", allOwnedSpaces);
                setupOwnedReportControls();
                refreshOwnedSpacesReport();
            } else {
                document.getElementById('tab-panel-rented').style.display = 'block';
            }

        } catch (error) {
            console.error('Error in the request:', error);
        }

    } catch (error) {
        console.error("Error loading user data:", error);
    }
});

// Function to open space details page
function openSpaceDetails(spaceId) {
    window.location.href = `space_details.html?id=${spaceId}`;
}

// DELETE WORKSPACE - Custom confirmation modal ---------------------------------------------------------------------
// Two states: the normal "permanently delete?" confirmation, and a "blocked" state the confirm
// handler switches into when the backend refuses (409, hasReservations: true) because the space
// has reservation history - steers the owner toward deactivating instead (keeps history,
// reversible) rather than just showing an alert() and leaving them stuck.
let pendingDeleteSpaceId = null;

const DELETE_MODAL_CONFIRM_BTN_DEFAULT_HTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18"></path>
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
        <path d="M10 11v6"></path>
        <path d="M14 11v6"></path>
    </svg>
    Delete`;

function resetDeleteModalToDefault(spaceTitle) {
    document.getElementById("deleteModalTitle").textContent = "Delete this workspace?";
    document.getElementById("deleteModalText").innerHTML =
        `You're about to permanently delete <strong id="deleteModalSpaceName">${spaceTitle || "this workspace"}</strong>. This will also remove any reservations linked to it. This action cannot be undone.`;

    const confirmBtn = document.getElementById("deleteModalConfirm");
    confirmBtn.style.display = "inline-flex";
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = DELETE_MODAL_CONFIRM_BTN_DEFAULT_HTML;

    const deactivateBtn = document.getElementById("deleteModalDeactivate");
    deactivateBtn.style.display = "none";
    deactivateBtn.disabled = false;
    deactivateBtn.textContent = "Deactivate instead";
}

function showDeleteModalBlockedByReservations() {
    document.getElementById("deleteModalTitle").textContent = "Can't delete — this space has history";
    document.getElementById("deleteModalText").textContent =
        "This space has reservation history, so deleting it would also erase past bookings, reviews and messages tied to it (and could silently cancel an upcoming reservation). Deactivate it instead: it disappears from the public catalog immediately, but everything is kept and you can turn it back on later.";

    document.getElementById("deleteModalConfirm").style.display = "none";
    document.getElementById("deleteModalDeactivate").style.display = "inline-flex";
}

function openDeleteModal(spaceId, spaceTitle) {
    pendingDeleteSpaceId = spaceId;
    resetDeleteModalToDefault(spaceTitle);
    document.getElementById("deleteModal").classList.add("open");
}

function closeDeleteModal() {
    pendingDeleteSpaceId = null;
    document.getElementById("deleteModal").classList.remove("open");
}

document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("deleteModal");
    const cancelBtn = document.getElementById("deleteModalCancel");
    const confirmBtn = document.getElementById("deleteModalConfirm");
    const deactivateBtn = document.getElementById("deleteModalDeactivate");

    if (!modal || !cancelBtn || !confirmBtn || !deactivateBtn) return;

    // Cancel button closes the modal without deleting anything
    cancelBtn.addEventListener("click", closeDeleteModal);

    // Clicking the dark backdrop (outside the card) also cancels
    modal.addEventListener("click", function (event) {
        if (event.target === modal) closeDeleteModal();
    });

    // Confirm button actually calls the delete endpoint
    confirmBtn.addEventListener("click", async function () {
        if (!pendingDeleteSpaceId) return;

        const spaceId = pendingDeleteSpaceId;

        confirmBtn.disabled = true;
        confirmBtn.textContent = "Deleting...";

        try {
            const response = await apiFetch('/api/spaces/workspaces/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ space_id: spaceId })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                closeDeleteModal();
                window.location.reload();
            } else if (response.status === 409 && result.hasReservations) {
                // Blocked by design (see api/spaces/workspaces.js) - offer deactivation instead
                // of just an alert() dead end.
                showDeleteModalBlockedByReservations();
            } else {
                alert("Failed to delete workspace: " + (result.error || "Unknown error"));
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = DELETE_MODAL_CONFIRM_BTN_DEFAULT_HTML;
            }
        } catch (error) {
            console.error("Error deleting workspace:", error);
            alert("An error occurred while deleting the workspace.");
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = DELETE_MODAL_CONFIRM_BTN_DEFAULT_HTML;
        }
    });

    // Deactivate button (only visible after a blocked delete attempt) - sets active=false,
    // keeping the space's full reservation/review/message history intact.
    deactivateBtn.addEventListener("click", async function () {
        if (!pendingDeleteSpaceId) return;

        const spaceId = pendingDeleteSpaceId;

        deactivateBtn.disabled = true;
        deactivateBtn.textContent = "Deactivating...";

        try {
            const response = await apiFetch('/api/spaces/workspaces/set_active', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ space_id: spaceId, active: false })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                closeDeleteModal();
                window.location.reload();
            } else {
                alert("Failed to deactivate workspace: " + (result.error || "Unknown error"));
                deactivateBtn.disabled = false;
                deactivateBtn.textContent = "Deactivate instead";
            }
        } catch (error) {
            console.error("Error deactivating workspace:", error);
            alert("An error occurred while deactivating the workspace.");
            deactivateBtn.disabled = false;
            deactivateBtn.textContent = "Deactivate instead";
        }
    });
});

document.querySelector(".add-new-btn").addEventListener("click", function () {
    window.location.href = "space_manage.html";
});
