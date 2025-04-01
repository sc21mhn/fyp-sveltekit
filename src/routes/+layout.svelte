<script>
	import '../app.css';
	import { onMount } from 'svelte';
	// import { supabase } from '$lib/supabaseClient';
	import { session as sessionState } from '$lib/session.svelte';
	import { invalidate } from '$app/navigation';
	import NavBar from './NavBar.svelte';
	let { data, children } = $props();
	let { session, supabase, user } = $derived(data);

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange((_, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
			if (newSession) {
				sessionState.user = newSession.user;
				sessionState.supabase = supabase;
			}
		});

		return () => data.subscription.unsubscribe();
	});
</script>

<main class="flex flex-1 items-center">
	<NavBar />
	{@render children()}
</main>
