import express from 'express';
import { supabase } from '../../lib/supabase.js';
import { requireAuth, requireCsrf } from '../middleware/auth.js';

const router = express.Router();

router.use(express.json());

// Helper: today's date as YYYY-MM-DD (matches the date columns used by reservations)
function todayStr() {
    return new Date().toISOString().split('T')[0];
}

// GET /api/reviews/pending
// Returns the logged-in user's reservations that have already ended and don't have a review yet,
// combined with the workspace info needed to render the "rate your stay" card. Identity comes
// from the verified session cookie now, not a client-supplied user_id query param.
router.get('/pending', requireAuth, async (req, res) => {
    const user_id = req.userId;

    try {
        // 1. Reservations belonging to this user that have already finished. Uses the JWT-scoped
        // client - reservations RLS only allows a user to read their own reservations (or ones on
        // a workspace they own), so the plain anon client would always return nothing here.
        const { data: pastReservations, error: reservationsError } = await req.supabaseAuthed
            .from('reservations')
            .select('*')
            .eq('user_id', user_id)
            .lt('end_time', todayStr())
            .order('end_time', { ascending: false });

        if (reservationsError) {
            return res.status(500).json({ error: 'Error fetching past reservations.' });
        }

        if (!pastReservations || pastReservations.length === 0) {
            return res.json([]);
        }

        // 2. Which of those reservations already have a review?
        const reservationIds = pastReservations.map(r => r.id);
        const { data: existingReviews, error: reviewsError } = await supabase
            .from('reviews')
            .select('reservation_id')
            .in('reservation_id', reservationIds);

        if (reviewsError) {
            return res.status(500).json({ error: 'Error checking existing reviews.' });
        }

        const reviewedIds = new Set((existingReviews || []).map(r => r.reservation_id));
        const pendingReservations = pastReservations.filter(r => !reviewedIds.has(r.id));

        if (pendingReservations.length === 0) {
            return res.json([]);
        }

        // 3. Workspace info (title, image, neighborhood) for each pending reservation.
        const workspaceIds = [...new Set(pendingReservations.map(r => r.workspace_id))];
        const { data: workspaces, error: workspacesError } = await supabase
            .from('workspaces')
            .select('id, title, neighborhood, image_01, lease_time')
            .in('id', workspaceIds);

        if (workspacesError) {
            return res.status(500).json({ error: 'Error fetching workspace details.' });
        }

        const pending = pendingReservations.map(reservation => {
            const workspace = (workspaces || []).find(w => w.id === reservation.workspace_id);
            return {
                reservation_id: reservation.id,
                workspace_id: reservation.workspace_id,
                title: workspace?.title || 'Workspace',
                neighborhood: workspace?.neighborhood || '',
                image: workspace?.image_01 || null,
                start_time: reservation.start_time,
                end_time: reservation.end_time,
            };
        });

        res.json(pending);

    } catch (error) {
        console.error('Error fetching pending reviews:', error);
        res.status(500).json({ error: error.message });
    }
});


// POST /api/reviews/submit
// Body: { reservation_id, rating, comment }
router.post('/submit', requireAuth, requireCsrf, async (req, res) => {
    const { reservation_id, rating, comment } = req.body;
    const user_id = req.userId;

    if (!reservation_id || !rating) {
        return res.status(400).json({ error: 'reservation_id and rating are required' });
    }

    const ratingNumber = Number(rating);
    if (!Number.isInteger(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
        return res.status(400).json({ error: 'Rating must be a whole number between 1 and 5' });
    }

    try {
        // Confirm the reservation exists, belongs to this user, and has actually ended -
        // mirrors the same "does this belong to the user" pattern used for workspaces.
        const { data: reservation, error: reservationError } = await req.supabaseAuthed
            .from('reservations')
            .select('*')
            .eq('id', reservation_id)
            .eq('user_id', user_id)
            .single();

        if (reservationError || !reservation) {
            return res.status(404).json({ error: 'Reservation not found or does not belong to this user.' });
        }

        if (reservation.end_time >= todayStr()) {
            return res.status(400).json({ error: 'You can only review a reservation after it has ended.' });
        }

        const { error: insertError } = await req.supabaseAuthed
            .from('reviews')
            .insert({
                reservation_id,
                workspace_id: reservation.workspace_id,
                user_id,
                rating: ratingNumber,
                comment: comment || null,
            });

        if (insertError) {
            // 23505 = unique_violation -> this reservation was already reviewed (e.g. double submit)
            if (insertError.code === '23505') {
                return res.status(409).json({ error: 'This reservation has already been reviewed.' });
            }
            console.error('Error inserting review:', insertError);
            return res.status(500).json({ error: 'Failed to submit review.' });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Server error submitting review:', error);
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
});

export default router;
