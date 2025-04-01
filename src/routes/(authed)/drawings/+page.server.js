import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, parent }) {
	await parent();
	const { session, user } = await locals.safeGetSession();

	if (!session) {
		throw redirect(303, '/login');
	}

	const { data: materials, error } = await locals.supabase
		.from('materials')
		.select(
			`
			*,
			profile:profiles(email)
		`
		)
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error fetching materials:', error);
		return {
			materials: []
		};
	}

	// Transform the data to match the column accessors
	const transformedMaterials = materials.map((material) => ({
		id: material.id,
		title: material.title,
		isActive: material.is_active,
		creatorEmail: material.profile?.email,
		createdAt: material.created_at,
		updatedAt: material.updated_at
	}));

	return {
		materials: transformedMaterials,
		user
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	createMaterial: async ({ locals }) => {
		const { session, user } = await locals.safeGetSession();

		if (!session) {
			return {
				status: 401,
				error: 'Unauthorized'
			};
		}

		const newMaterial = {
			title: 'Untitled Material',
			is_active: true,
			created_by: user.id
		};

		const { data: rawData, error } = await locals.supabase
			.from('materials')
			.insert([newMaterial])
			.select(
				`
				*,
				profile:profiles(email)
			`
			)
			.single();

		if (error) {
			console.error('Error creating material:', error);
			return {
				status: 500,
				error: 'Failed to create material'
			};
		}

		// Transform the data to match the column accessors
		const data = {
			id: rawData.id,
			title: rawData.title,
			isActive: rawData.is_active,
			creatorEmail: rawData.profile?.email,
			createdAt: rawData.created_at,
			updatedAt: rawData.updated_at
		};

		return {
			status: 201,
			body: data
		};
	},

	deleteMaterial: async ({ locals, request }) => {
		const { session } = await locals.safeGetSession();

		if (!session) {
			return {
				status: 401,
				error: 'Unauthorized'
			};
		}

		const formData = await request.formData();
		const id = formData.get('id');

		if (!id) {
			return {
				status: 400,
				error: 'Material ID is required'
			};
		}

		const { error } = await locals.supabase.from('materials').delete().eq('id', id);

		if (error) {
			console.error('Error deleting material:', error);
			return {
				status: 500,
				error: 'Failed to delete material'
			};
		}

		return {
			status: 200
		};
	}
};
