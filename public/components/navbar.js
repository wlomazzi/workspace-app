document.addEventListener("DOMContentLoaded", function () {
    // Fetch the navbar HTML and insert it into the page first
    fetch("/components/navbar.html") // Path to the navbar HTML file
        .then(response => response.text()) // Convert the response to text
        .then(async html => {
            const navbarContainer = document.createElement("div");
            navbarContainer.innerHTML = html;

            // Insert the navbar HTML at the top of the body
            document.body.insertBefore(navbarContainer, document.body.firstChild);

            // The session itself lives in an httpOnly cookie now - this page's JS can't read it
            // directly, so ask the server whether the visitor is actually logged in. (localStorage
            // still keeps a non-sensitive user_id/email hint for other pages' instant UI checks,
            // but the navbar always defers to this real check since it runs on every single page.)
            const sessionResult = await checkSession();
            const userId = sessionResult.loggedIn ? sessionResult.user.id : null;
            const userEmail = sessionResult.loggedIn ? sessionResult.user.email : null;

            if (userId) {
                localStorage.setItem('user_id', userId);
                localStorage.setItem('user_email', userEmail);
            } else {
                localStorage.removeItem('user_id');
                localStorage.removeItem('user_email');
            }

            // Show only the menu options that make sense for the current auth state:
            // logged in -> Profile / Logout, logged out -> Log in / Sign up.
            const menuLogin = document.getElementById('menu-login');
            const menuSignup = document.getElementById('menu-signup');
            const menuProfile = document.getElementById('menu-profile');
            const menuLogout = document.getElementById('menu-logout');

            if (menuLogin) menuLogin.style.display = userId ? 'none' : 'block';
            if (menuSignup) menuSignup.style.display = userId ? 'none' : 'block';
            if (menuProfile) menuProfile.style.display = userId ? 'block' : 'none';
            if (menuLogout) menuLogout.style.display = userId ? 'block' : 'none';

            if (userId) {
                try {
                    const response = await apiFetch('/api/users/user_login/session', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    const data = await response.json();

                    //console.log(data); // Here you we see the user data returned by the server

                    localStorage.setItem('user_picture' , data.profile.avatar_url);
                    localStorage.setItem('user_fullname', data.profile.full_name);
                    localStorage.setItem('user_location', data.profile.location);
                    localStorage.setItem('user_phone'   , data.profile.phone);
                    localStorage.setItem('user_coworker', data.profile.is_coworker);
                    localStorage.setItem('user_owner'   , data.profile.is_owner);

                    const profilePicElement = document.querySelector(".user-session-profile-pic");
                    if (profilePicElement) {
                        profilePicElement.src = data.profile.avatar_url;
                    }
    
                    const userNameElement = document.getElementById("user-session-name");
                    if (userNameElement) {
                        userNameElement.textContent = `${data.profile.full_name}`;
                    } else {
                        console.error("User name element not found.");
                    }
    
                    const userEmailElement = document.getElementById("user-session-email");
                    if (userEmailElement) {
                        userEmailElement.textContent = userEmail;
                    }
    
                    const userLocationElement = document.getElementById("user-session-location");
                    if (userLocationElement) {
                        userLocationElement.textContent = data.profile.location;
                    }

                    // Check for reservations that already ended and haven't been rated yet.
                    checkPendingReviews(userId);

                } catch (error) {
                    console.error('Error in request:', error);
                }

            }else{
                const profilePicElement = document.querySelector(".user-session-profile-pic");
                if (profilePicElement) {
                    profilePicElement.src = "user.profilePic";
                    profilePicElement.src = "/images/user_default.png";
                }

                const userNameElement = document.getElementById("user-session-name");
                if (userNameElement) {
                    userNameElement.textContent = "User";
                } else {
                    console.error("User name element not found.");
                }
            }
        })
        .catch(error => console.error("Error loading navbar:", error));
});



// Top menu: When clicking on the Home link, redirect to the home page
function menuHomeRedirect() {
    window.location.href = "index.html"; // Redirects to the homepage
}


// Top menu: Open the menu when clicking on the menu icon (sandwich icon)
function toggleMenu() {
    const menu = document.getElementById("menu");
    if (menu.style.display === "block") {
        menu.style.display = "none";
    } else {
        menu.style.display = "block";
    }
}


// Top menu: Close the menu when clicking outside of it (close sandwich icon menu)
document.addEventListener("click", function(event) {
    const menu = document.getElementById("menu");
    const menuIcon = document.querySelector(".user-icon");
    // Check if menu and menuIcon exist before using contains()
    if (menu && menuIcon && !menu.contains(event.target) && !menuIcon.contains(event.target)) {
        menu.style.display = "none";
    }
});



// Function to handle the logout process. The local session is always cleared client-side,
// even if the server call fails - there's no reason to leave the user "stuck" logged in
// on their own browser just because the logout API had an issue.
async function logout() {
    try {
        const response = await apiFetch('/api/users/user_login/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            console.error('Logout error:', data.error);
        }
    } catch (error) {
        console.error('Error during logout:', error);
    } finally {
        // Remove all user-related data from localStorage (the actual session cookie is cleared
        // server-side by the call above - this just clears the display hints kept client-side)
        localStorage.removeItem('logged_user');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_picture');
        localStorage.removeItem('user_fullname');
        localStorage.removeItem('user_location');
        localStorage.removeItem('user_phone');
        localStorage.removeItem('user_coworker');
        localStorage.removeItem('user_owner');

        window.location.href = "index.html";
    }
}



// ================================================================================================
// REVIEWS - "Rate your past stays" modal
// Runs on every page (navbar.js loads everywhere). Once per browser session, if the logged-in
// user has reservations whose end_time has already passed and that haven't been reviewed yet,
// a modal pops up listing them so the user can rate each one (1-5 stars + optional comment).
// ================================================================================================

async function checkPendingReviews(userId) {
    // Don't nag on every single page navigation within the same session - only once,
    // unless the user still has pending reviews next time they log in.
    if (sessionStorage.getItem('reviews_prompt_shown') === 'true') return;

    try {
        const response = await apiFetch('/api/reviews/pending');
        if (!response.ok) return;

        const pendingReviews = await response.json();
        if (!Array.isArray(pendingReviews) || pendingReviews.length === 0) return;

        sessionStorage.setItem('reviews_prompt_shown', 'true');
        openReviewsModal(pendingReviews);

    } catch (error) {
        console.error('Error checking pending reviews:', error);
    }
}


function injectReviewsStyles() {
    if (document.getElementById('reviews-modal-styles')) return; // Only inject once

    const style = document.createElement('style');
    style.id = 'reviews-modal-styles';
    style.textContent = `
        .reviews-modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: 10000;
            background: #00000080;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .reviews-modal {
            background: #fff;
            width: 100%;
            max-width: 480px;
            max-height: 85vh;
            border-radius: 14px;
            box-shadow: 0 12px 32px #00000033;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .reviews-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 22px 12px;
            border-bottom: 1px solid #eee;
        }
        .reviews-modal-header h3 {
            margin: 0 0 4px;
            font-size: 18px;
            color: #222;
        }
        .reviews-modal-header p {
            margin: 0;
            font-size: 13px;
            color: #777;
        }
        .reviews-modal-close {
            background: none;
            border: none;
            font-size: 20px;
            line-height: 1;
            color: #999;
            cursor: pointer;
            padding: 4px;
        }
        .reviews-modal-close:hover { color: #333; }
        .reviews-modal-list {
            overflow-y: auto;
            padding: 14px 22px 22px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .review-card {
            border: 1px solid #eee;
            border-radius: 10px;
            padding: 14px;
            display: flex;
            gap: 12px;
        }
        .review-card img {
            width: 64px;
            height: 64px;
            object-fit: cover;
            border-radius: 8px;
            flex-shrink: 0;
            background: #f2f2f2;
        }
        .review-card-body { flex: 1; min-width: 0; }
        .review-card-title { font-weight: bold; font-size: 14px; color: #222; }
        .review-card-sub { font-size: 12px; color: #888; margin: 2px 0 8px; }
        .review-stars { display: flex; gap: 4px; margin-bottom: 8px; }
        .review-star {
            font-size: 22px;
            line-height: 1;
            cursor: pointer;
            color: #ddd;
            transition: color 0.15s ease, transform 0.1s ease;
            user-select: none;
        }
        .review-star:hover { transform: scale(1.1); }
        .review-star.filled { color: #ffb400; }
        .review-comment {
            width: 100%;
            resize: vertical;
            min-height: 44px;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 13px;
            font-family: inherit;
            margin-bottom: 8px;
        }
        .review-submit-btn {
            background: #007bff;
            color: #fff;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
        }
        .review-submit-btn:hover:not(:disabled) { background: #0056b3; }
        .review-submit-btn:disabled { background: #a9c6e8; cursor: not-allowed; }
        .review-card-message {
            font-size: 12px;
            margin-top: 6px;
        }
        .review-card-message.error { color: #b3261e; }
        .review-card-message.success { color: #1fa855; }
        .reviews-modal-empty {
            padding: 30px 22px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
}


function openReviewsModal(pendingReviews) {
    injectReviewsStyles();

    const backdrop = document.createElement('div');
    backdrop.className = 'reviews-modal-backdrop';
    backdrop.id = 'reviewsModalBackdrop';

    backdrop.innerHTML = `
        <div class="reviews-modal">
            <div class="reviews-modal-header">
                <div>
                    <h3>Rate your recent stays</h3>
                    <p>Your feedback helps other coworkers pick the right space.</p>
                </div>
                <button type="button" class="reviews-modal-close" id="reviewsModalCloseBtn" aria-label="Close">&times;</button>
            </div>
            <div class="reviews-modal-list" id="reviewsModalList"></div>
        </div>
    `;

    document.body.appendChild(backdrop);

    const listEl = backdrop.querySelector('#reviewsModalList');
    pendingReviews.forEach(item => listEl.appendChild(buildReviewCard(item)));

    backdrop.querySelector('#reviewsModalCloseBtn').addEventListener('click', closeReviewsModal);
    backdrop.addEventListener('click', function (event) {
        if (event.target === backdrop) closeReviewsModal();
    });
}


function closeReviewsModal() {
    const backdrop = document.getElementById('reviewsModalBackdrop');
    if (backdrop) backdrop.remove();
}


function buildReviewCard(item) {
    const card = document.createElement('div');
    card.className = 'review-card';
    card.dataset.reservationId = item.reservation_id;

    const fallbackImage = '/images/logo.png';
    let selectedRating = 0;

    card.innerHTML = `
        <img src="${item.image || fallbackImage}" alt="${item.title}">
        <div class="review-card-body">
            <div class="review-card-title">${item.title}</div>
            <div class="review-card-sub">${item.neighborhood ? item.neighborhood + ' · ' : ''}${item.start_time} to ${item.end_time}</div>
            <div class="review-stars" role="radiogroup" aria-label="Rating"></div>
            <textarea class="review-comment" placeholder="Leave a comment (optional)"></textarea>
            <button type="button" class="review-submit-btn" disabled>Submit Review</button>
            <div class="review-card-message"></div>
        </div>
    `;

    // Build the 5-star clickable rating widget
    const starsContainer = card.querySelector('.review-stars');
    const submitBtn = card.querySelector('.review-submit-btn');
    const stars = [];

    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.className = 'review-star';
        star.textContent = '★';
        star.dataset.value = i;
        star.addEventListener('click', function () {
            selectedRating = i;
            stars.forEach((s, idx) => s.classList.toggle('filled', idx < selectedRating));
            submitBtn.disabled = false;
        });
        stars.push(star);
        starsContainer.appendChild(star);
    }

    submitBtn.addEventListener('click', async function () {
        const messageEl = card.querySelector('.review-card-message');
        const comment = card.querySelector('.review-comment').value.trim();

        messageEl.textContent = '';
        messageEl.className = 'review-card-message';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            const response = await apiFetch('/api/reviews/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reservation_id: item.reservation_id,
                    rating: selectedRating,
                    comment: comment || null,
                }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                card.style.transition = 'opacity 0.25s ease';
                card.style.opacity = '0';
                setTimeout(() => {
                    card.remove();
                    // If that was the last card, close the whole modal.
                    const list = document.getElementById('reviewsModalList');
                    if (list && list.children.length === 0) closeReviewsModal();
                }, 250);
            } else {
                messageEl.textContent = result.error || 'Failed to submit review.';
                messageEl.className = 'review-card-message error';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Review';
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            messageEl.textContent = 'An error occurred. Please try again.';
            messageEl.className = 'review-card-message error';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Review';
        }
    });

    return card;
}
