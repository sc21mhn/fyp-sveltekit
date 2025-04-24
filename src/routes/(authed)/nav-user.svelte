<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	// import { supabase } from '$lib/supabaseClient';
	import BadgeCheck from 'lucide-svelte/icons/badge-check';
	import Bell from 'lucide-svelte/icons/bell';
	import ChevronsUpDown from 'lucide-svelte/icons/chevrons-up-down';
	import CreditCard from 'lucide-svelte/icons/credit-card';
	import LogOut from 'lucide-svelte/icons/log-out';
	import Settings_2 from 'lucide-svelte/icons/settings-2';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import UserRound from 'lucide-svelte/icons/user-round';

	import { session } from '$lib/session.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { user }: { user: { name: string; username: string; email: string; avatar: string } } =
		$props();

	let { supabase } = $derived(page.data);

	const sidebar = useSidebar();

	async function signOut() {
		const { error } = await supabase?.auth.signOut();
		if (!error) {
			goto('/login');
		}
	}
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						{...props}
					>
						<Avatar.Root class="h-8 w-8 rounded-lg">
							{#if user.avatar}
								<Avatar.Image src={user.avatar} alt={user.username} />
							{:else}
								<Avatar.Fallback class="rounded-lg">
									<UserRound></UserRound>
								</Avatar.Fallback>
							{/if}
						</Avatar.Root>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-semibold">{user.username}</span>
							<span class="truncate text-xs">{user.email}</span>
						</div>
						<ChevronsUpDown class="ml-auto size-4" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				align="end"
				sideOffset={4}
			>
				<DropdownMenu.Label class="p-0 font-normal">
					<div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
						<Avatar.Root class="h-8 w-8 rounded-lg">
							{#if user.avatar}
								<Avatar.Image src={user.avatar} alt={user.username} />
							{:else}
								<Avatar.Fallback class="rounded-lg">
									<UserRound></UserRound>
								</Avatar.Fallback>
							{/if}
						</Avatar.Root>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-semibold">{user.username}</span>
							<span class="truncate text-xs">{user.email}</span>
						</div>
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Group></DropdownMenu.Group>
				<DropdownMenu.Separator />
				<DropdownMenu.Group>
					<DropdownMenu.Item>
						<Settings_2 />
						Settings
					</DropdownMenu.Item>
					<DropdownMenu.Item>
						<Bell />
						Notifications
					</DropdownMenu.Item>
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				<DropdownMenu.Item onclick={signOut}>
					<LogOut />Log out
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
