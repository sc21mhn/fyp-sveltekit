<script>
	import DataTable from './data-table.svelte';
	import { columns } from './columns.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { enhance } from '$app/forms';
	import { Icons } from '$lib/components/docs/icons';

	/** @type {import('./$types').PageData} */
	let { data } = $props();
	let materials = $derived(data.materials);
	let user = $derived(data.user);
	let isCreating = $state(false);

	function handleEnhance() {
		return async ({ result, update }) => {
			isCreating = true;
			try {
				if (result.type === 'success') {
					await update();
				}
			} finally {
				isCreating = false;
			}
		};
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold tracking-tight">Course Materials</h2>
		<form method="POST" action="?/createMaterial" use:enhance={handleEnhance}>
			<Button type="submit" disabled={isCreating}>
				{#if isCreating}
					<Icons.spinner class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Create Material
			</Button>
		</form>
	</div>

	<DataTable data={materials} {columns} />
</div>
