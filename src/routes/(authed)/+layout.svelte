<script lang="ts">
	import '../../app.css';
	import { onMount } from 'svelte';
	import { session as sessionState } from '$lib/session.svelte';
	import { invalidate } from '$app/navigation';

	import AppSidebar from './app-sidebar.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Toaster } from '$lib/components/ui/sonner/index.js';

	let { data, children } = $props();
	let { session, supabase, user } = $derived(data);
	// let { supabase } = $derived(data);

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

	let open = $state(true);
</script>

<Toaster />

{#snippet sidebarTrigger()}
	<header
		class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
	>
		<Sidebar.Trigger />
	</header>
{/snippet}

<Sidebar.Provider bind:open>
	<AppSidebar renderSidebarHeader={sidebarTrigger} {supabase} {open} />
	<Sidebar.Inset>
		<div class="w-full">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
