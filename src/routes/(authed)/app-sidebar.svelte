<script lang="ts" module>
	import AudioWaveform from 'lucide-svelte/icons/audio-waveform';
	import BookOpen from 'lucide-svelte/icons/book-open';
	import Bot from 'lucide-svelte/icons/bot';
	import ChartPie from 'lucide-svelte/icons/chart-pie';
	import Command from 'lucide-svelte/icons/command';
	import Frame from 'lucide-svelte/icons/frame';
	import GamePad2 from 'lucide-svelte/icons/gamepad-2';
	import Map from 'lucide-svelte/icons/map';
	import Settings2 from 'lucide-svelte/icons/settings-2';
	import SquareTerminal from 'lucide-svelte/icons/square-terminal';

	import Trophy from 'lucide-svelte/icons/trophy';
	import Users from 'lucide-svelte/icons/users';

	import { session } from '$lib/session.svelte';

	let user = $derived({
		username: session.user?.user_metadata.preferred_username,
		email: session.user?.email,
		avatar: session.user?.user_metadata.avatar_url
	});

	const data = $derived({
		user: user,
		team: {
			name: 'Canvas',
			logo: GamePad2
		},
		navMain: [
			{
				title: 'My Workspace',
				url: '#',
				icon: Map,
				isActive: true,
				items: [
					{
						title: 'Recent Drawings',
						url: '/RecentDrawings'
					},
					{
						title: 'Templates',
						url: '/Templates'
					},
					{
						title: 'Drafts',
						url: '/Drafts'
					},
					{
						title: 'Trash',
						url: '/Trash'
					}
				]
			},	
		],
		
	});
</script>

<script lang="ts">
	import NavMain from './nav-main.svelte';
	import NavProjects from './nav-projects.svelte';
	import NavUser from './nav-user.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		...restProps
	}: ComponentProps<typeof Sidebar.Root> = $props();
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
	<Sidebar.Header>
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
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain items={data.navMain} />
		<NavProjects projects={data.projects} />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser user={data.user} />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
