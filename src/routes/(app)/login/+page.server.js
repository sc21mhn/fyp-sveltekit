import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();
	if (user) {
		redirect(303, '/home');
	}
};
