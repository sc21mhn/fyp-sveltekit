<script>
	import { cn } from "$lib/utils.js";

	let { ref = $bindable(null), value = $bindable(), class: className, ...restProps } = $props();
</script>

<input
	bind:this={ref}
	class={cn(
		"border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
		className
	)}
	bind:value
	{...restProps}
/>
