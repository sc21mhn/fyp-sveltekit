<script lang="ts" module>
	import Bird from 'lucide-svelte/icons/bird';
	import FilePlus2 from 'lucide-svelte/icons/file-plus-2';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import MoreVertical from 'lucide-svelte/icons/more-vertical';
	import { session } from '$lib/session.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { goto } from '$app/navigation';

	let user = $derived({
		username: session.user?.user_metadata.preferred_username,
		email: session.user?.email,
		avatar: session.user?.user_metadata.avatar_url
	});

	const data = $derived({
		user: user,
		team: {
			name: 'Canvas',
			logo: Bird
		}
	});
</script>

<script lang="ts">
	import NavUser from './nav-user.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import type { ComponentProps } from 'svelte';

	let {
		renderSidebarHeader,
		open,
		ref = $bindable(null),
		collapsible = 'icon',
		supabase,
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & { supabase: any } = $props();

	// Initialize drawings as an empty array
	let drawings: { id: string; title: string; created_at: string }[] = $state([]);
	let isLoading = $state(true);

	// State for rename dialog
	let renameDialogOpen = $state(false);
	let currentDrawingId = $state('');
	let currentDrawingTitle = $state('');
	let newDrawingTitle = $state('');

	// Function to fetch drawings from Supabase
	async function fetchDrawings() {
		isLoading = true;
		try {
			// Get the current user's ID from the session
			const userId = session.user?.id;

			if (!userId) {
				isLoading = false;
				return;
			}

			const { data: fetchedDrawings, error } = await supabase
				.from('drawings')
				.select('id, title, created_at')
				.eq('user_id', userId) // Only fetch drawings belonging to the current user
				.order('created_at', { ascending: false });

			if (error) {
				console.error('Error fetching drawings:', error);
				toast.error('Failed to load drawings');
			} else {
				drawings = fetchedDrawings || [];
			}
		} catch (error) {
			console.error('Error fetching drawings:', error);
			toast.error('Failed to load drawings');
		} finally {
			isLoading = false;
		}
	}

	// Function to create a new drawing
	async function createNewDrawing() {
		try {
			// Get the current user's ID from the session
			const userId = session.user?.id;

			if (!userId) {
				toast.error('You need to be logged in to create a drawing');
				return;
			}

			const { data: newDrawing, error } = await supabase
				.from('drawings')
				.insert([
					{
						title: 'Untitled',
						data: {},
						is_public: false,
						user_id: userId // Explicitly set the user_id to comply with RLS
					}
				])
				.select()
				.single();

			if (error) {
				console.error('Error creating new drawing:', error);
				toast.error('Failed to create new drawing');
			} else {
				toast.success('New drawing created');
				// Add the new drawing to the list and re-fetch to ensure consistency
				fetchDrawings();
			}
		} catch (error) {
			console.error('Error creating new drawing:', error);
			toast.error('Failed to create new drawing');
		}
	}

	// Function to rename a drawing
	async function renameDrawing() {
		if (!newDrawingTitle.trim()) {
			toast.error('Drawing title cannot be empty');
			return;
		}

		try {
			const { error } = await supabase
				.from('drawings')
				.update({ title: newDrawingTitle.trim() })
				.eq('id', currentDrawingId);

			if (error) {
				console.error('Error renaming drawing:', error);
				toast.error('Failed to rename drawing');
			} else {
				toast.success('Drawing renamed successfully');
				fetchDrawings();
				closeRenameDialog();
			}
		} catch (error) {
			console.error('Error renaming drawing:', error);
			toast.error('Failed to rename drawing');
		}
	}

	// Function to delete a drawing
	async function deleteDrawing(drawingId: string, drawingTitle: string) {
		// Confirm before deleting
		if (!confirm(`Are you sure you want to delete "${drawingTitle}"?`)) {
			return;
		}

		try {
			const { error } = await supabase.from('drawings').delete().eq('id', drawingId);

			if (error) {
				console.error('Error deleting drawing:', error);
				toast.error('Failed to delete drawing');
			} else {
				toast.success('Drawing deleted successfully');
				fetchDrawings();
			}
		} catch (error) {
			console.error('Error deleting drawing:', error);
			toast.error('Failed to delete drawing');
		}
	}

	// Open rename dialog
	function openRenameDialog(drawingId: string, drawingTitle: string) {
		currentDrawingId = drawingId;
		currentDrawingTitle = drawingTitle;
		newDrawingTitle = drawingTitle;
		renameDialogOpen = true;
	}

	// Close rename dialog
	function closeRenameDialog() {
		renameDialogOpen = false;
		currentDrawingId = '';
		currentDrawingTitle = '';
		newDrawingTitle = '';
	}

	// Fetch drawings on component mount
	$effect(() => {
		if (supabase && session.user) {
			fetchDrawings();
		}
	});
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
	<Sidebar.Header>
		<div class="flex flex-row items-center">
			{#if open}
				<Sidebar.MenuButton
					size="lg"
					class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
				>
					<div
						class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
					>
						<data.team.logo class="size-4" />
					</div>
					<div class="grid flex-1 text-left text-sm leading-tight">
						<span class="truncate font-semibold">
							{data.team.name}
						</span>
					</div>
				</Sidebar.MenuButton>
			{/if}

			{@render renderSidebarHeader()}
		</div>

		{#if open}
			<Button
				variant="outline"
				class="border-none bg-transparent"
				size="icon"
				on:click={createNewDrawing}
			>
				<FilePlus2 />
			</Button>
		{/if}
	</Sidebar.Header>
	<Sidebar.Content>
		{#if open}
			<ScrollArea class="rounded-md">
				<div class="space-y-2 p-4">
					{#if isLoading}
						<div class="text-sm text-muted-foreground">Loading drawings...</div>
					{:else if drawings.length === 0}
						<div class="text-sm text-muted-foreground">
							No drawings yet. Click the + button to create one.
						</div>
					{:else}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						{#each drawings as drawing (drawing.id)}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<div
								class="group flex cursor-pointer items-center justify-between rounded px-2 py-1.5 hover:bg-muted/50"
								onclick={() => goto(`/drawing/${drawing.id}`)}
							>
								<div class="truncate text-sm hover:underline">
									{drawing.title}
								</div>
								<DropdownMenu.Root>
									<DropdownMenu.Trigger
										class="invisible flex h-8 w-8 items-center justify-center rounded-sm hover:bg-muted group-hover:visible"
									>
										<MoreVertical class="h-4 w-4" />
										<span class="sr-only">Open menu</span>
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end" class="w-40">
										<DropdownMenu.Item onclick={() => openRenameDialog(drawing.id, drawing.title)}>
											<Pencil class="mr-2 h-4 w-4" />
											<span>Rename</span>
										</DropdownMenu.Item>
										<DropdownMenu.Separator />
										<DropdownMenu.Item
											onclick={() => deleteDrawing(drawing.id, drawing.title)}
											class="text-destructive focus:bg-destructive focus:text-destructive-foreground"
										>
											<Trash2 class="mr-2 h-4 w-4" />
											<span>Delete</span>
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</div>
						{/each}
					{/if}
				</div>
			</ScrollArea>
		{/if}
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser user={data.user} />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>

<!-- Rename Dialog -->
<Dialog.Root bind:open={renameDialogOpen}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Rename Drawing</Dialog.Title>
			<Dialog.Description>Enter a new name for your drawing.</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<Input id="name" bind:value={newDrawingTitle} class="col-span-4" />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={closeRenameDialog}>Cancel</Button>
			<Button onclick={renameDrawing}>Save changes</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
