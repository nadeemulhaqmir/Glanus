import { redirect } from 'next/navigation';

/**
 * Redirect /partners/me → /partners/dashboard
 * The partner dashboard page already fetches and displays the current partner's profile.
 */
export default function PartnersMe() {
    redirect('/partners/dashboard');
}
