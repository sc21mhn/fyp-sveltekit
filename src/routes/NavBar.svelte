<!-- Header/Navigation -->
<script>
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { ChevronDown, Globe, Image } from 'lucide-svelte';

	let isLoading = $state(false);

	// Handle support dropdown
	let isSupported = $state(false);
	const toggleSupport = () => {
		isSupported = !isSupported;
	};
</script>

<header class="flex w-full items-center justify-between border-b px-6 py-4">
	<div class="flex items-center gap-8">
		<!-- Logo -->
		<a href="/" class="text-xl font-bold">LOGO</a>

		<!-- Navigation -->
		<nav class="flex items-center gap-6">
			<a href="/home" class="text-gray-700 hover:text-gray-900">Home page</a>
			<a href="/features" class="text-gray-700 hover:text-gray-900">Features</a>

			<!-- Support Dropdown -->
			<div class="relative">
				<button
					onclick={toggleSupport}
					class="flex items-center gap-1 text-gray-700 hover:text-gray-900"
				>
					Support
					<ChevronDown class="h-4 w-4" />
				</button>

				{#if isSupported}
					<div class="absolute left-0 top-full mt-2 rounded-md border bg-white py-2 shadow-lg">
						<a href="/quote" class="block px-4 py-2 hover:bg-gray-100">Quote</a>
						<a href="/about" class="block px-4 py-2 hover:bg-gray-100">About us</a>
						<a href="/contact" class="block px-4 py-2 hover:bg-gray-100">Contact</a>
					</div>
				{/if}
			</div>

			<!-- Language Selector -->
			<div class="flex items-center gap-1">
				<span>English</span>
				<Globe class="h-4 w-4" />
			</div>
		</nav>
	</div>

	<!-- Auth Buttons -->
	<div class="flex items-center gap-4">
		<Button variant="outline">Sign up</Button>
		<Button variant="default">Login</Button>
	</div>
</header>
