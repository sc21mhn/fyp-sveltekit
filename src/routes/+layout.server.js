export const load = async ({ locals, cookies }) => {
	const { session } = await locals.safeGetSession();
	return {
		session,
		cookies: cookies.getAll()
	};
};
