<!-- <script>
	import { Button } from '$lib/components/ui/button';
</script>

<Button href="/login" variant="ghost" class="absolute right-4 top-4 md:right-8 md:top-8"
	>Login</Button
> -->

<script>
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	
	// Animation control
	let visible = $state(false);
	
	onMount(() => {
		visible = true;
	});
</script>

<!-- Hero Section -->
<section class="mx-auto px-4 py-20 md:px-8 lg:px-16">
	<div class="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
		<!-- Hero Text -->
		<div class="space-y-6" class:animate-in={visible} in:fly={{ y: 20, duration: 800, delay: 200 }}>
			<h1 class="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
				Where Your Bad Drawings <span class="text-primary">Turn Into Brilliant Ideas</span>
			</h1>
			<p class="max-w-prose text-lg text-muted-foreground">
				It doesn't matter if you draw like an artist or a toddler - our whiteboard helps you
				work together and share ideas. No need to be perfect, just have fun and create!
			</p>
			<div class="flex flex-wrap gap-4">
				<Button size="lg">Get Started</Button>
				<Button variant="outline" size="lg">Learn More</Button>
			</div>
		</div>
		
		<!-- Hero Image -->
		<div class="relative" in:fade={{ duration: 1000, delay: 400 }}>
			<div class="overflow-hidden rounded-lg shadow-xl">
				<img
					src="/images/whiteboard.jpg"
					alt="Whiteboard canvas interface"
					class="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
				/>
			</div>
			<div class="absolute -bottom-4 -right-4 -z-10 h-full w-full rounded-lg bg-primary/20"></div>
		</div>
	</div>
</section>

<!-- Services Section -->
<section class="bg-muted/50 py-24">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="mb-16 text-center" in:fade={{ duration: 800, delay: 300 }}>
			<h2 class="text-3xl font-bold tracking-tight sm:text-4xl">Our Services</h2>
			<Separator class="mx-auto mt-8 w-24" />
		</div>

		<div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
			{#each [
				{
					title: 'Live Whiteboard',
					description: 'Draw, write and brainstorm in real time with your team',
					icon: '✏️'
				},
				{
					title: 'File and Image Sharing',
					description: 'Upload and add files and notes easily',
					icon: '📁'
				},
				{
					title: 'Team Collaboration Tools',
					description: 'Comment and organize ideas seamlessly',
					icon: '👥'
				}
			] as service, i}
				<div in:fly={{ y: 20, duration: 800, delay: 200 + i * 150 }}>
					<Card class="overflow-hidden p-6 transition-all duration-300 hover:shadow-lg">
						<div class="mb-4 text-4xl">{service.icon}</div>
						<h3 class="mb-2 text-xl font-medium">{service.title}</h3>
						<p class="text-muted-foreground">{service.description}</p>
					</Card>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Features Section -->
<section class="py-24">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="mb-16 text-center" in:fade={{ duration: 800 }}>
			<h2 class="text-3xl font-bold tracking-tight sm:text-4xl">Why Choose Us</h2>
			<Separator class="mx-auto mt-8 w-24" />
		</div>

		<div class="grid gap-12 md:grid-cols-2">
			{#each [
				{
					title: 'Real-time Collaboration',
					description:
						'Work together instantly with your team, no delays or waiting for updates'
				},
				{
					title: 'Easy to Use',
					description:
						'Simple tools with no learning curve - jump right in and start creating'
				},
				{
					title: 'Anywhere, Anytime',
					description:
						'Access your whiteboards from any device, whenever and wherever you need them'
				},
				{
					title: 'Unlimited Creativity',
					description:
						'Draw, brainstorm and organize ideas freely with our flexible canvas'
				}
			] as feature, i}
				<div class="flex gap-4" in:fly={{ x: i % 2 ? 20 : -20, duration: 800, delay: 200 + i * 100 }}>
					<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
						{i + 1}
					</div>
					<div>
						<h3 class="mb-2 text-xl font-medium">{feature.title}</h3>
						<p class="text-muted-foreground">{feature.description}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Call to Action -->
<section class="bg-primary text-primary-foreground">
	<div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
		<div class="grid gap-10 md:grid-cols-2 md:gap-16" in:fade={{ duration: 800 }}>
			<div>
				<h2 class="text-3xl font-bold tracking-tight sm:text-4xl">Ready to get started?</h2>
			</div>
			<div class="flex flex-col items-start justify-center gap-4 sm:flex-row sm:items-center">
				<Button variant="secondary" size="lg">Contact Us</Button>
			</div>
		</div>
	</div>
</section>

<style>
	/* Smooth scrolling */
	:global(html) {
		scroll-behavior: smooth;
	}
	
	/* Animation classes */
	.animate-in {
		animation: fadeIn 0.8s ease-out forwards;
	}
	
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
