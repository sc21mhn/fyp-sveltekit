<!-- Header/Navigation -->
<script>
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { ChevronDown, Menu, X } from 'lucide-svelte';
	import Logo from '$lib/components/ui/logo.svelte';

	// Mobile menu state
	let isMenuOpen = $state(false);
	const toggleMenu = () => {
		isMenuOpen = !isMenuOpen;
	};

	// Support dropdown
	let isSupported = $state(false);
	const toggleSupport = () => {
		isSupported = !isSupported;
	};

	// Close dropdown when clicking outside
	let supportRef;
	const handleClickOutside = (event) => {
		if (supportRef && !supportRef.contains(event.target)) {
			isSupported = false;
		}
	};

	$effect(() => {
		if (isSupported) {
			document.addEventListener('click', handleClickOutside);
		} else {
			document.removeEventListener('click', handleClickOutside);
		}

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<header
	class="fixed left-0 top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm transition-all"
>
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 items-center justify-between">
			<!-- Logo -->
			<div class="flex shrink-0 items-center">
				<a href="/" class="flex items-center">
					<Logo>CANVAS</Logo>
				</a>
			</div>

			<!-- Desktop Navigation -->
			<nav class="hidden items-center space-x-8 md:flex">
				<a
					href="/"
					class="text-sm font-medium text-foreground transition-colors hover:text-primary"
				>
					Home
				</a>
				<a
					href="/features"
					class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
				>
					Features
				</a>
				<a
					href="/pricing"
					class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
				>
					Pricing
				</a>

				<!-- Support Dropdown -->
				<div class="relative" bind:this={supportRef}>
					<button
						onclick={toggleSupport}
						class="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						Support
						<ChevronDown
							class={`h-4 w-4 transition-transform ${isSupported ? 'rotate-180' : ''}`}
						/>
					</button>

					{#if isSupported}
						<div
							class="absolute right-0 top-full mt-2 w-48 rounded-md border bg-background py-2 shadow-lg"
						>
							<a
								href="/quote"
								class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
								>Quote</a
							>
							<a
								href="/about"
								class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
								>About us</a
							>
							<a
								href="/contact"
								class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
								>Contact</a
							>
						</div>
					{/if}
				</div>
			</nav>

			<!-- Auth Buttons -->
			<div class="hidden items-center gap-4 md:flex">
				<Button href="/signup" variant="outline">Sign up</Button>
				<Button href="/login">Login</Button>
			</div>

			<!-- Mobile menu button -->
			<button
				onclick={toggleMenu}
				class="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-hidden md:hidden"
			>
				<span class="sr-only">Open main menu</span>
				{#if isMenuOpen}
					<X class="h-6 w-6" />
				{:else}
					<Menu class="h-6 w-6" />
				{/if}
			</button>
		</div>
	</div>

	<!-- Mobile menu -->
	{#if isMenuOpen}
		<div class="md:hidden">
			<div class="space-y-1 px-4 pb-3 pt-2">
				<a
					href="/"
					class="block rounded-md px-3 py-2 text-base font-medium text-foreground hover:bg-muted"
					>Home</a
				>
				<a
					href="/features"
					class="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
					>Features</a
				>
				<a
					href="/pricing"
					class="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
					>Pricing</a
				>
				<button
					onclick={toggleSupport}
					class="flex w-full items-center justify-between rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					Support
					<ChevronDown class={`h-4 w-4 transition-transform ${isSupported ? 'rotate-180' : ''}`} />
				</button>
				{#if isSupported}
					<div class="ml-4 space-y-1 border-l pl-4">
						<a
							href="/quote"
							class="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
							>Quote</a
						>
						<a
							href="/about"
							class="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
							>About us</a
						>
						<a
							href="/contact"
							class="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
							>Contact</a
						>
					</div>
				{/if}
			</div>
			<div class="border-t px-4 py-3">
				<div class="flex items-center justify-between">
					<Button href="/signup" variant="outline" class="w-full">Sign up</Button>
					<div class="mx-2"></div>
					<Button href="/login" class="w-full">Login</Button>
				</div>
			</div>
		</div>
	{/if}
</header>

<!-- Spacer to prevent content from being hidden under fixed header -->
<div class="h-16"></div>
