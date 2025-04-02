<script>
	import '../../app.css';
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

<div class="flex min-h-screen flex-col">
	<NavBar />
	<main class="flex-1">
		{@render children()}
	</main>
	
	<!-- Footer -->
	<footer class="border-t bg-muted/30 py-8">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
				<div>
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider">Company</h3>
					<ul class="space-y-2 text-sm">
						<li><a href="/about" class="text-muted-foreground hover:text-foreground">About</a></li>
						<li><a href="/careers" class="text-muted-foreground hover:text-foreground">Careers</a></li>
						<li><a href="/blog" class="text-muted-foreground hover:text-foreground">Blog</a></li>
					</ul>
				</div>
				<div>
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider">Services</h3>
					<ul class="space-y-2 text-sm">
						<li><a href="/development" class="text-muted-foreground hover:text-foreground">Development</a></li>
						<li><a href="/design" class="text-muted-foreground hover:text-foreground">Design</a></li>
						<li><a href="/consulting" class="text-muted-foreground hover:text-foreground">Consulting</a></li>
					</ul>
				</div>
				<div>
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider">Legal</h3>
					<ul class="space-y-2 text-sm">
						<li><a href="/privacy" class="text-muted-foreground hover:text-foreground">Privacy</a></li>
						<li><a href="/terms" class="text-muted-foreground hover:text-foreground">Terms</a></li>
						<li><a href="/cookies" class="text-muted-foreground hover:text-foreground">Cookies</a></li>
					</ul>
				</div>
				<div>
					<h3 class="mb-4 text-sm font-semibold uppercase tracking-wider">Contact</h3>
					<ul class="space-y-2 text-sm">
						<li class="text-muted-foreground">sc21mhn@leeds.ac.uk</li>
						<li class="text-muted-foreground">(00)0000-000-000</li>
						<li class="text-muted-foreground">Headingley, Leeds</li>
					</ul>
				</div>
			</div>
			<div class="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
				<p>&copy; {new Date().getFullYear()} CANVAS. All rights reserved.</p>
			</div>
		</div>
	</footer>
</div>
