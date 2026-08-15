import { useState, useEffect } from 'react';
import { Star, Send, AlertCircle, CheckCircle } from 'lucide-react';
import BranchFooterMap from './BranchFooterMap';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BEAM_SIZE = 5; // Maximum number of reviews stored / displayed
const STORAGE_KEY = 'kukooo_reviews'; // localStorage key

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Load the review beam from localStorage.
 * Returns an array of up to BEAM_SIZE review objects, newest first.
 */
function loadReviews() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Persist reviews to localStorage.
 * Automatically trims to the most recent BEAM_SIZE entries.
 */
function saveReviews(reviews) {
  const trimmed = reviews.slice(0, BEAM_SIZE);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/**
 * Prepend a new review to the beam and trim old entries.
 * The beam acts as a ring buffer: new reviews push old ones out once full.
 */
function addToBeam(existing, newReview) {
  return [newReview, ...existing].slice(0, BEAM_SIZE);
}

// ---------------------------------------------------------------------------
// StarRating — interactive or static star row
// ---------------------------------------------------------------------------
function StarRating({ value, onChange, readOnly = false, size = 'md' }) {
  const [hovered, setHovered] = useState(0);
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type={readOnly ? 'button' : 'button'}
          disabled={readOnly}
          onClick={() => !readOnly && onChange && onChange(n)}
          onMouseEnter={() => !readOnly && setHovered(n)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          className={readOnly ? 'cursor-default' : 'cursor-pointer transition-transform hover:scale-110 active:scale-95'}
          aria-label={readOnly ? `${n} stars` : `Rate ${n} stars`}
        >
          <Star
            className={`${sizeClass} transition-colors ${
              n <= (hovered || value)
                ? 'fill-secondary text-secondary'
                : 'fill-none text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReviewCard — displays a single approved review
// ---------------------------------------------------------------------------
function ReviewCard({ review, index }) {
  return (
    <div
      className="bg-white rounded-xl comic-border-sm comic-shadow-sm p-4 space-y-2"
      aria-label={`Review ${index + 1}`}
    >
      {/* Star rating row */}
      <StarRating value={review.stars} readOnly size="sm" />

      {/* Review body text */}
      <p className="text-sm font-semibold text-accent leading-snug line-clamp-4">
        {review.text}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReviewForm — collects order_id, stars, text; validates order; saves review
// ---------------------------------------------------------------------------
function ReviewForm({ orders, onReviewSubmitted }) {
  const [orderId, setOrderId]   = useState('');
  const [stars, setStars]       = useState(0);
  const [text, setText]         = useState('');
  const [status, setStatus]     = useState(null); // null | 'error' | 'success'
  const [message, setMessage]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  /**
   * Reset feedback state whenever the user starts editing again.
   */
  const clearStatus = () => {
    if (status) setStatus(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus(null);

    // ---- Validation ----
    if (!orderId.trim()) {
      setStatus('error');
      setMessage('Please enter your order number.');
      return;
    }
    if (stars === 0) {
      setStatus('error');
      setMessage('Please select a star rating.');
      return;
    }
    if (!text.trim() || text.trim().length < 5) {
      setStatus('error');
      setMessage('Please write at least 5 characters in your review.');
      return;
    }

    // ---- Order number existence check ----
    const orderExists = (orders || []).some(
      (o) => String(o.order_id).trim().toUpperCase() === orderId.trim().toUpperCase()
    );

    if (!orderExists) {
      setStatus('error');
      setMessage('Order not found. Please double-check your order number.');
      return;
    }

    // ---- Append to beam ----
    setSubmitting(true);
    const existing = loadReviews();
    const newReview = {
      id: `rev_${Date.now()}`,
      text: text.trim(),
      stars,
      createdAt: new Date().toISOString(),
    };
    const updated = addToBeam(existing, newReview);
    saveReviews(updated);

    setStatus('success');
    setMessage('Thank you for your review! 🎉');
    setOrderId('');
    setStars(0);
    setText('');
    setSubmitting(false);

    // Propagate to parent so the display list re-renders immediately
    if (onReviewSubmitted) onReviewSubmitted(updated);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2"
      noValidate
      id="review-form"
      aria-label="Customer review form"
    >
      {/* Order Number */}
      <div className="space-y-1">
        <label
          htmlFor="review-order-id"
          className="text-[10px] font-black uppercase tracking-wider text-accent"
        >
          Order Number
        </label>
        <input
          id="review-order-id"
          type="text"
          value={orderId}
          onChange={(e) => { setOrderId(e.target.value); clearStatus(); }}
          placeholder="e.g. KUK-20260626-001"
          className="w-full px-3 py-1.5 rounded-lg comic-border-sm bg-white text-xs font-semibold text-accent placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/40"
        />
      </div>

      {/* Star Rating */}
      <div className="space-y-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-accent">
          Your Rating
        </span>
        <StarRating
          value={stars}
          onChange={(n) => { setStars(n); clearStatus(); }}
        />
      </div>

      {/* Review Text */}
      <div className="space-y-1">
        <label
          htmlFor="review-text"
          className="text-[10px] font-black uppercase tracking-wider text-accent"
        >
          Your Review
        </label>
        <textarea
          id="review-text"
          value={text}
          onChange={(e) => { setText(e.target.value); clearStatus(); }}
          placeholder="Tell us about your experience…"
          rows={2}
          maxLength={300}
          className="w-full px-3 py-1.5 rounded-lg comic-border-sm bg-white text-xs font-semibold text-accent placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/40 resize-none"
        />
        <span className="text-[9px] text-gray-400 font-bold float-right">
          {text.length}/300
        </span>
      </div>

      {/* Feedback banner */}
      {status === 'error' && (
        <div className="flex items-start gap-1.5 bg-primary/10 comic-border-sm rounded-lg px-3 py-2" role="alert">
          <AlertCircle className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          <span className="text-[10px] font-bold text-primary">{message}</span>
        </div>
      )}
      {status === 'success' && (
        <div className="flex items-start gap-1.5 bg-green-50 border-2 border-green-500 rounded-lg px-3 py-2" role="status">
          <CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
          <span className="text-[10px] font-bold text-green-700">{message}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        id="review-submit-btn"
        className="w-full flex items-center justify-center gap-2 bg-secondary text-accent font-black text-xs rounded-xl comic-border-sm comic-shadow-sm comic-hover py-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Send className="w-3.5 h-3.5" />
        Submit Review
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// ReviewSection — exported composite section (map left, form+reviews right)
// ---------------------------------------------------------------------------
export default function ReviewSection({ branches, selectedBranchId, onSelectBranch, orders }) {
  const [reviews, setReviews] = useState(() => loadReviews());

  // Sync reviews from localStorage whenever the section mounts / tab focuses
  useEffect(() => {
    const sync = () => setReviews(loadReviews());
    window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, []);

  const handleReviewSubmitted = (updatedBeam) => {
    setReviews(updatedBeam);
  };

  return (
    <section
      className="space-y-6 border-t-2 border-dashed border-gray-150 pt-10"
      aria-labelledby="section-find-us"
    >
      {/* Section header — split description */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
        <div className="space-y-1">
          <span className="text-xs text-primary font-black uppercase tracking-wider">
            Find Us &amp; Share
          </span>
          <h2
            id="section-find-us"
            className="text-2xl font-black text-accent tracking-tight"
          >
            Our Locations &amp; Reviews
          </h2>
          <p className="text-xs text-gray-400 font-semibold max-w-md">
            Visit any branch for dine-in or pickup, then leave us a review after your order!
          </p>
        </div>
      </div>

      {/* Three-column layout: map (left) + form (middle) + reviews (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── LEFT: Branch map — fixed height ── */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-accent shrink-0">
            🗺️ Store Locations
          </h3>
          <BranchFooterMap
            branches={branches}
            selectedBranchId={selectedBranchId}
            onSelectBranch={onSelectBranch}
          />
        </div>

        {/* ── MIDDLE: Review Form ── */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-accent shrink-0">
            ⭐ Leave a Review
          </h3>
          <div className="h-80 rounded-2xl comic-border comic-shadow bg-[#FAFAFA] p-4 flex flex-col justify-center">
            <ReviewForm orders={orders} onReviewSubmitted={handleReviewSubmitted} />
          </div>
        </div>

        {/* ── RIGHT: Reviews Display ── */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-accent shrink-0">
            💬 Latest Reviews
          </h3>
          <div className="h-80 overflow-y-auto rounded-2xl comic-border comic-shadow bg-[#FAFAFA] p-4 space-y-3 scrollbar-thin">
            {reviews.length > 0 ? (
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Showing {reviews.length}/{BEAM_SIZE} Reviews
                </span>
                <div className="space-y-3">
                  {reviews.map((rev, i) => (
                    <ReviewCard key={rev.id} review={rev} index={i} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-1">
                <p className="text-xs font-black text-gray-400">No reviews yet.</p>
                <p className="text-[10px] text-gray-400 font-semibold">Be the first to share your experience!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
