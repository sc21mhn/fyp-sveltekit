export const load = async ({ params, parent }) => {
	await parent();

	// Extract the drawing ID from params
	const { id } = params;

	return {
		id
	};
};
