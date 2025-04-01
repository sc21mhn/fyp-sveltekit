import { redirect } from '@sveltejs/kit';

export const load = async ({ locals, url }) => {
	const { session, user } = await locals.safeGetSession();
	if (!user) {
		redirect(303, '/login');
	}
};
