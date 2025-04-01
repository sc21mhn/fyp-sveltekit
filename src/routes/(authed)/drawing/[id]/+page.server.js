export const load = async ({ params, parent, url }) => {
	await parent();
	console.log(url);
	console.log(params);
	const data = { 1: 'a' };

	return {
		data
	};
};
