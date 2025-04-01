export let session = $state({ user: null });

export class User {
	session = $state(null);
	userData = $state(null);
	supabase = $state(null);
}

export const user = new User();
