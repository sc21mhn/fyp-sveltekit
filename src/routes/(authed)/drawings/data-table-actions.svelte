<script>
	import Ellipsis from 'lucide-svelte/icons/ellipsis';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Icons } from '$lib/components/docs/icons';
	import { enhance } from '$app/forms';

	let { id } = $props();
	let isDeleting = $state(false);

	function handleEdit() {
		// Implementation for edit action
		console.log('Edit material:', id);
	}

	function handleDeleteEnhance() {
		return async ({ result, update }) => {
			isDeleting = true;
			try {
				if (result.type === 'success') {
					await update();
				}
			} finally {
				isDeleting = false;
			}
		};
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
				<span class="sr-only">Open menu</span>
				<Ellipsis />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content>
		<DropdownMenu.Item onclick={handleEdit}>Edit</DropdownMenu.Item>
		<form method="POST" action="?/deleteMaterial" use:enhance={handleDeleteEnhance} class="w-full">
			<input type="hidden" name="id" value={id} />
			<DropdownMenu.Item asChild disabled={isDeleting}>
				<button class="w-full cursor-pointer text-left text-red-600">
					{#if isDeleting}
						<Icons.spinner class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Delete
				</button>
			</DropdownMenu.Item>
		</form>
	</DropdownMenu.Content>
</DropdownMenu.Root>
