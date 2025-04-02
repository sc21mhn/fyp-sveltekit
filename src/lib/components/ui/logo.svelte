<script>
	export let size = 'default';
	export let variant = 'default';

	const sizeClasses = {
		sm: 'h-6 w-6',
		default: 'h-8 w-8',
		lg: 'h-10 w-10'
	};

	const variantClasses = {
		default: 'bg-primary text-primary-foreground',
		outline: 'bg-transparent border border-primary text-primary',
		secondary: 'bg-secondary text-secondary-foreground'
	};

	$: logoSize = sizeClasses[size] || sizeClasses.default;
	$: logoVariant = variantClasses[variant] || variantClasses.default;
</script>

<div class="flex items-center gap-2">
	<div class={`flex items-center justify-center rounded-md ${logoSize} ${logoVariant}`}>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="h-5 w-5"
		>
			<path
				d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"
			></path>
		</svg>
	</div>
	<slot>
		<span class="text-xl font-bold">CANVAS</span>
	</slot>
</div> 