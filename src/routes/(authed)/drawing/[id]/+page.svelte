<script>
	import Hand from 'lucide-svelte/icons/hand';
	import Eraser from 'lucide-svelte/icons/eraser';
	import Pen from 'lucide-svelte/icons/pen';
	import Undo from 'lucide-svelte/icons/undo';
	import Redo from 'lucide-svelte/icons/redo';
	import Trash2 from 'lucide-svelte/icons/trash-2'; // Import trash icon for clear button

	// --- Constants ---
	const MIN_ZOOM = 0.1;
	const MAX_ZOOM = 10;
	const SCROLL_SENSITIVITY = 0.001;
	const DOT_SPACING = 25;
	const DOT_RADIUS = 0.75; // Slightly smaller dots
	const DOT_COLOR = '#e0e0e0'; // Lighter dots
	const BACKGROUND_COLOR = '#ffffff';
	const SIMPLIFICATION_TOLERANCE = 1.0;

	// Jamboard-like UI constants
	const JAMBOARD_COLORS = [
		'#000000',
		'#ef4444',
		'#f97316',
		'#eab308',
		'#22c55e',
		'#0ea5e9',
		'#6366f1',
		'#a855f7'
	];
	const JAMBOARD_THICKNESSES = [
		{ label: 'Fine', value: 2 },
		{ label: 'Medium', value: 6 },
		{ label: 'Thick', value: 12 },
		{ label: 'Heavy', value: 25 }
	];

	// --- State ---
	let canvasElement = $state(null);
	let ctx = $state(null);

	// Drawing/Interaction State
	let isDrawing = $state(false);
	let isPanning = $state(false);
	let currentTool = $state('pen'); // 'pen', 'hand', 'eraser'
	let penColor = $state(JAMBOARD_COLORS[0]); // Default to black
	let penThickness = $state(JAMBOARD_THICKNESSES[1].value); // Default to medium

	// View State
	let zoom = $state(1);
	let offsetX = $state(0);
	let offsetY = $state(0);
	let lastX = $state(0);
	let lastY = $state(0);

	// Drawing Data & History
	let strokes = $state([]);
	let currentStroke = $state(null);
	let history = $state([]);
	let redoStack = $state([]);

	// UI State
	let showPenOptions = $state(false);
	let showEraserOptions = $state(false);
	let showClearConfirm = $state(false); // State for clear confirmation dialog

	// --- Computed State ---
	let canUndo = $derived(history.length > 0);
	let canRedo = $derived(redoStack.length > 0);
	let hasStrokes = $derived(strokes.length > 0); // Check if there are strokes to clear

	// Compute current thickness label for display/tooltip
	let currentThicknessLabel = $derived(
		JAMBOARD_THICKNESSES.find((t) => t.value === penThickness)?.label || `${penThickness}px`
	);

	// --- Lifecycle & Setup ---
	$effect(() => {
		if (canvasElement) {
			ctx = canvasElement.getContext('2d');
			resizeCanvas();
			window.addEventListener('resize', resizeCanvas);
			requestAnimationFrame(draw);
			updateCursor();
			// Close options if clicking outside the toolbar
			document.addEventListener('click', handleClickOutside);

			return () => {
				window.removeEventListener('resize', resizeCanvas);
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});

	function handleClickOutside(event) {
		const toolbar = document.querySelector('.sidebar-toolbar');
		if (toolbar && !toolbar.contains(event.target)) {
			showPenOptions = false;
			showEraserOptions = false;
			showClearConfirm = false; // Also close clear confirmation
		}
	}

	function resizeCanvas() {
		if (!canvasElement) return;
		// Account for potential sidebar width if needed, but simpler is usually letting flexbox handle it
		const containerWidth = canvasElement.parentElement.clientWidth;
		const containerHeight = canvasElement.parentElement.clientHeight;
		canvasElement.width = containerWidth; // Fill available width
		canvasElement.height = containerHeight; // Fill available height
		requestAnimationFrame(draw);
	}

	// --- Coordinate Transformation --- (No changes)
	function getCanvasCoords(event) {
		if (!canvasElement) return { x: 0, y: 0 };
		const rect = canvasElement.getBoundingClientRect();
		return {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		};
	}

	function getWorldCoords(screenX, screenY) {
		return {
			x: (screenX - offsetX) / zoom,
			y: (screenY - offsetY) / zoom
		};
	}

	// --- Drawing Logic --- (Mostly unchanged, adjusted background)
	function draw() {
		if (!ctx || !canvasElement) return;

		const width = canvasElement.width;
		const height = canvasElement.height;

		// Use native textil operations for efficiency
		ctx.save(); // Save base state

		// Clear and fill background (essential for eraser)
		ctx.fillStyle = BACKGROUND_COLOR;
		ctx.fillRect(0, 0, width, height);

		// Apply view transformations
		ctx.translate(offsetX, offsetY);
		ctx.scale(zoom, zoom);

		// Draw background pattern (dots)
		drawBackground();

		// Draw saved strokes
		strokes.forEach(drawSingleStroke);

		// Draw the stroke currently being made
		if (currentStroke && currentStroke.points.length > 0) {
			// Temporarily draw the raw current stroke for responsiveness
			drawSingleStroke(currentStroke);
		}

		ctx.restore(); // Restore base state
	}

	// Simplified drawBackground
	function drawBackground() {
		if (!ctx || !canvasElement || zoom < 0.2) return; // Don't draw dots if zoomed far out

		const screenWidth = canvasElement.width;
		const screenHeight = canvasElement.height;

		const worldLeft = -offsetX / zoom;
		const worldTop = -offsetY / zoom;
		const worldRight = (screenWidth - offsetX) / zoom;
		const worldBottom = (screenHeight - offsetY) / zoom;

		const startWorldX = Math.floor(worldLeft / DOT_SPACING) * DOT_SPACING;
		const startWorldY = Math.floor(worldTop / DOT_SPACING) * DOT_SPACING;

		// Adjust radius based on zoom, but ensure it's visible
		const radius = Math.max(0.2 / zoom, DOT_RADIUS / zoom);

		ctx.fillStyle = DOT_COLOR;
		ctx.beginPath();

		for (let x = startWorldX; x < worldRight; x += DOT_SPACING) {
			for (let y = startWorldY; y < worldBottom; y += DOT_SPACING) {
				ctx.moveTo(x + radius, y); // Move to the starting point of the arc
				ctx.arc(x, y, radius, 0, Math.PI * 2);
			}
		}
		ctx.fill();
	}

	// drawSingleStroke (Unchanged)
	function drawSingleStroke(stroke) {
		if (!ctx || !stroke || stroke.points.length < 1) return;

		ctx.beginPath();
		ctx.strokeStyle = stroke.color;
		ctx.lineWidth = stroke.thickness / zoom; // Adjust thickness based on zoom
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		// If only one point, draw a small circle (dot)
		if (stroke.points.length === 1) {
			const radius = stroke.thickness / 2 / zoom;
			ctx.fillStyle = stroke.color; // Use fill for single point
			ctx.arc(stroke.points[0].x, stroke.points[0].y, Math.max(radius, 0.1 / zoom), 0, Math.PI * 2); // Ensure minimum visible radius
			ctx.fill();
		} else {
			// Draw line for multiple points
			ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
			for (let i = 1; i < stroke.points.length; i++) {
				ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
			}
			ctx.stroke();
		}
	}

	// --- Stroke Simplification --- (Unchanged)
	function perpendicularDistance(pt, lineStart, lineEnd) {
		let dx = lineEnd.x - lineStart.x;
		let dy = lineEnd.y - lineStart.y;
		if (dx === 0 && dy === 0) {
			dx = pt.x - lineStart.x;
			dy = pt.y - lineStart.y;
			return Math.sqrt(dx * dx + dy * dy);
		}
		const t = ((pt.x - lineStart.x) * dx + (pt.y - lineStart.y) * dy) / (dx * dx + dy * dy);
		let closestX, closestY;
		if (t < 0) {
			closestX = lineStart.x;
			closestY = lineStart.y;
		} else if (t > 1) {
			closestX = lineEnd.x;
			closestY = lineEnd.y;
		} else {
			closestX = lineStart.x + t * dx;
			closestY = lineStart.y + t * dy;
		}
		dx = pt.x - closestX;
		dy = pt.y - closestY;
		return Math.sqrt(dx * dx + dy * dy);
	}
	function simplifyStroke(points, tolerance) {
		if (points.length <= 2) return points;
		let dmax = 0;
		let index = 0;
		const end = points.length - 1;
		for (let i = 1; i < end; i++) {
			const d = perpendicularDistance(points[i], points[0], points[end]);
			if (d > dmax) {
				index = i;
				dmax = d;
			}
		}
		if (dmax > tolerance) {
			const rec1 = simplifyStroke(points.slice(0, index + 1), tolerance);
			const rec2 = simplifyStroke(points.slice(index, points.length), tolerance);
			return rec1.slice(0, rec1.length - 1).concat(rec2);
		} else {
			return [points[0], points[end]];
		}
	}

	// --- History Management --- (Unchanged, ensure deep copy)
	function saveStateForUndo() {
		const currentStrokesState = strokes.map((stroke) => ({
			...stroke,
			points: stroke.points.map((p) => ({ ...p }))
		}));
		history = [...history, currentStrokesState];
		redoStack = [];
	}
	function undo() {
		if (!canUndo) return;
		const currentStrokesState = strokes.map((stroke) => ({
			...stroke,
			points: stroke.points.map((p) => ({ ...p }))
		}));
		redoStack = [...redoStack, currentStrokesState];
		const prevState = history.pop(); // Use pop for simplicity
		strokes = prevState;
		requestAnimationFrame(draw);
	}
	function redo() {
		if (!canRedo) return;
		const currentStrokesState = strokes.map((stroke) => ({
			...stroke,
			points: stroke.points.map((p) => ({ ...p }))
		}));
		history = [...history, currentStrokesState];
		const nextState = redoStack.pop(); // Use pop
		strokes = nextState;
		requestAnimationFrame(draw);
	}

	// --- Clear All Function ---
	function clearAll() {
		if (!hasStrokes) return;

		// Save current state for undo before clearing
		saveStateForUndo();

		// Clear all strokes
		strokes = [];
		showClearConfirm = false; // Close confirmation dialog
		requestAnimationFrame(draw);
	}

	// --- Event Handlers --- (Mostly unchanged logic, just cursor/state updates)
	function handleMouseDown(event) {
		const { x: screenX, y: screenY } = getCanvasCoords(event);
		if (event.button === 1 || (event.button === 0 && currentTool === 'hand')) {
			isPanning = true;
			lastX = screenX;
			lastY = screenY;
			updateCursor();
			event.preventDefault();
			return;
		}
		if (event.button === 0) {
			if (currentTool === 'pen' || currentTool === 'eraser') {
				isDrawing = true;
				const worldCoords = getWorldCoords(screenX, screenY);
				lastX = worldCoords.x;
				lastY = worldCoords.y;
				const strokeColor = currentTool === 'eraser' ? BACKGROUND_COLOR : penColor;
				currentStroke = {
					points: [{ x: worldCoords.x, y: worldCoords.y }],
					color: strokeColor,
					thickness: penThickness
				};
				requestAnimationFrame(draw);
				updateCursor();
				event.preventDefault();
				// Close popups when starting a new drawing action
				showPenOptions = false;
				showEraserOptions = false;
				showClearConfirm = false;
			}
		}
	}
	function handleMouseMove(event) {
		const { x: screenX, y: screenY } = getCanvasCoords(event);
		if (isPanning) {
			const dx = screenX - lastX;
			const dy = screenY - lastY;
			offsetX += dx;
			offsetY += dy;
			lastX = screenX;
			lastY = screenY;
			requestAnimationFrame(draw);
		} else if (isDrawing && currentStroke) {
			const worldCoords = getWorldCoords(screenX, screenY);
			const lastPoint = currentStroke.points[currentStroke.points.length - 1];
			const worldDistSq = (worldCoords.x - lastPoint.x) ** 2 + (worldCoords.y - lastPoint.y) ** 2;
			const MIN_DIST_SQ_WORLD = 0.25;
			if (worldDistSq > MIN_DIST_SQ_WORLD) {
				currentStroke.points.push({ x: worldCoords.x, y: worldCoords.y });
				// No need to update lastX/lastY here for drawing logic
				requestAnimationFrame(draw);
			}
		} else {
			// updateCursor(true); // Cursor updated in updateCursor effect / mouse down
		}
	}
	function finalizeStroke() {
		if (currentStroke?.points.length > 0) {
			if (currentStroke.points.length > 2) {
				const simplified = simplifyStroke(currentStroke.points, SIMPLIFICATION_TOLERANCE);
				if (simplified.length > 0) {
					currentStroke.points = simplified;
				} else if (currentStroke.points.length > 0) {
					currentStroke.points = [currentStroke.points[0]]; // Fallback if over-simplified
				}
			}
			saveStateForUndo();
			strokes = [...strokes, currentStroke];
		}
		currentStroke = null;
	}
	function handleMouseUp(event) {
		if (event.button === 1 && isPanning) {
			isPanning = false;
			updateCursor();
			return;
		}
		if (event.button === 0) {
			if (isPanning) {
				isPanning = false;
			} else if (isDrawing) {
				isDrawing = false;
				finalizeStroke();
				requestAnimationFrame(draw);
			}
			updateCursor();
		}
	}
	function handleMouseLeave(event) {
		let needsRedraw = false;
		if (isDrawing) {
			isDrawing = false;
			finalizeStroke();
			needsRedraw = true;
		}
		if (isPanning) {
			isPanning = false;
		}
		updateCursor();
		if (needsRedraw) requestAnimationFrame(draw);
	}
	function handleWheel(event) {
		event.preventDefault();
		const { x: screenX, y: screenY } = getCanvasCoords(event);
		const zoomFactor = 1 - event.deltaY * SCROLL_SENSITIVITY;
		const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * zoomFactor));
		const worldXBefore = (screenX - offsetX) / zoom;
		const worldYBefore = (screenY - offsetY) / zoom;
		offsetX = screenX - worldXBefore * newZoom;
		offsetY = screenY - worldYBefore * newZoom;
		zoom = newZoom;
		requestAnimationFrame(draw);
	}

	// --- UI Actions ---
	function selectTool(tool) {
		currentTool = tool;
		isDrawing = false;
		isPanning = false;
		// Toggle options visibility
		if (tool === 'pen') {
			showPenOptions = !showPenOptions;
			showEraserOptions = false; // Close other options
			showClearConfirm = false;
		} else if (tool === 'eraser') {
			showEraserOptions = !showEraserOptions;
			showPenOptions = false; // Close other options
			showClearConfirm = false;
		} else {
			// Close options if selecting hand tool etc.
			showPenOptions = false;
			showEraserOptions = false;
			showClearConfirm = false;
		}
		updateCursor();
	}

	function selectColor(color) {
		penColor = color;
		// Maybe close the options after selection? Optional.
		// showPenOptions = false;
	}

	function selectThickness(thickness) {
		penThickness = thickness;
		// Maybe close the options after selection? Optional.
		// showPenOptions = false;
		// showEraserOptions = false;
	}

	function toggleClearConfirm() {
		showClearConfirm = !showClearConfirm;
		showPenOptions = false;
		showEraserOptions = false;
	}

	function updateCursor() {
		if (!canvasElement) return;
		let cursorStyle = 'default';
		if (isPanning) {
			cursorStyle = 'grabbing';
		} else {
			switch (currentTool) {
				case 'pen':
					cursorStyle = 'crosshair';
					break; // Or custom pen cursor
				case 'hand':
					cursorStyle = 'grab';
					break;
				case 'eraser':
					cursorStyle = 'cell';
					break; // Or custom eraser cursor
				default:
					cursorStyle = 'default';
			}
		}
		if (canvasElement.style.cursor !== cursorStyle) {
			canvasElement.style.cursor = cursorStyle;
		}
	}

	// --- Effects --- (Minor changes)
	$effect(() => {
		const trigger = zoom || offsetX || offsetY;
		requestAnimationFrame(draw);
	});
	$effect(() => {
		const trigger = strokes;
		requestAnimationFrame(draw);
	});
	$effect(() => {
		const trigger = currentTool;
		if (!isPanning && !isDrawing) {
			updateCursor();
		}
	});

	// Close options if tool changes *away* from pen/eraser externally (might not happen here)
	$effect(() => {
		if (currentTool !== 'pen') showPenOptions = false;
		if (currentTool !== 'eraser') showEraserOptions = false;
	});
</script>

<div
	class="relative flex h-screen min-h-[500px] w-full overflow-hidden border border-gray-300 bg-gray-50"
>
	<div
		class="sidebar-toolbar relative z-10 flex w-16 shrink-0 flex-col items-center gap-2 border-r border-gray-300 bg-gray-100 py-3"
	>
		<button
			class={`flex h-11 w-11 items-center justify-center rounded-full text-gray-600 transition-colors ${currentTool === 'pen' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-200'}`}
			onclick={() => selectTool('pen')}
			title={`Pen (${currentThicknessLabel})`}
		>
			<Pen />
		</button>

		<button
			class={`flex h-11 w-11 items-center justify-center rounded-full text-gray-600 transition-colors ${currentTool === 'eraser' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-200'}`}
			onclick={() => selectTool('eraser')}
			title={`Eraser (${currentThicknessLabel})`}
		>
			<Eraser />
		</button>

		<button
			class={`flex h-11 w-11 items-center justify-center rounded-full text-gray-600 transition-colors ${currentTool === 'hand' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-200'}`}
			onclick={() => selectTool('hand')}
			title="Select / Pan"
		>
			<Hand />
		</button>

		<!-- Clear All button -->
		<button
			class={`mt-2 flex h-11 w-11 items-center justify-center rounded-full text-gray-600 transition-colors ${!hasStrokes ? 'cursor-not-allowed opacity-40' : 'hover:bg-gray-200 hover:text-red-500'}`}
			onclick={toggleClearConfirm}
			disabled={!hasStrokes}
			title="Clear All"
		>
			<Trash2 />
		</button>

		{#if showClearConfirm}
			<div
				class="absolute left-[72px] top-[118px] z-20 flex w-max flex-col gap-2 rounded-lg bg-white p-3 shadow-lg"
			>
				<p class="text-sm text-gray-700">Clear all drawings?</p>
				<div class="flex gap-2">
					<button
						class="rounded-md bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
						onclick={clearAll}
					>
						Clear
					</button>
					<button
						class="rounded-md bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
						onclick={toggleClearConfirm}
					>
						Cancel
					</button>
				</div>
			</div>
		{/if}

		{#if showPenOptions}
			<div
				class="absolute left-[72px] top-[10px] z-20 flex w-max flex-col gap-3 rounded-lg bg-white p-3 shadow-lg"
			>
				<div class="flex flex-wrap items-center gap-2">
					{#each JAMBOARD_THICKNESSES as thicknessOpt}
						<button
							class={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${penThickness === thicknessOpt.value ? 'border-blue-600' : 'border-transparent hover:border-gray-200'}`}
							onclick={() => selectThickness(thicknessOpt.value)}
							title={thicknessOpt.label}
						>
							<span
								class="rounded-full bg-gray-600"
								style={`width: ${thicknessOpt.value * 0.8 + 4}px; height: ${thicknessOpt.value * 0.8 + 4}px; ${penThickness === thicknessOpt.value ? 'background-color: #1967d2;' : ''}`}
							></span>
						</button>
					{/each}
				</div>
				<div class="flex max-w-[160px] flex-wrap items-center gap-2">
					{#each JAMBOARD_COLORS as color}
						<button
							class={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-transform hover:scale-110 ${penColor === color ? 'border-blue-600' : 'border-gray-200'}`}
							style={`background-color: ${color};`}
							onclick={() => selectColor(color)}
							title={`Color: ${color}`}
						>
							{#if penColor === color}<span
									class="text-sm font-bold text-white mix-blend-difference">✔</span
								>{/if}
						</button>
					{/each}
					<div class="flex flex-col space-y-2">
						<small>Custom</small>
						<div class="relative">
							<div
								class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-gray-200 shadow-xs transition-transform hover:scale-110"
								style={`background-color: ${penColor};`}
							>
								<span class="text-xs text-white mix-blend-difference">+</span>
							</div>
							<input
								type="color"
								class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
								bind:value={penColor}
								title="Custom Color"
							/>
						</div>
					</div>
				</div>
			</div>
		{/if}

		{#if showEraserOptions}
			<div
				class="absolute left-[72px] top-[64px] z-20 flex w-max flex-col gap-3 rounded-lg bg-white p-3 shadow-lg"
			>
				<div class="flex flex-wrap items-center gap-2">
					{#each JAMBOARD_THICKNESSES as thicknessOpt}
						<button
							class={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${penThickness === thicknessOpt.value ? 'border-blue-600' : 'border-transparent hover:border-gray-200'}`}
							onclick={() => selectThickness(thicknessOpt.value)}
							title={thicknessOpt.label}
						>
							<span
								class="rounded-full bg-gray-600"
								style={`width: ${thicknessOpt.value * 0.8 + 4}px; height: ${thicknessOpt.value * 0.8 + 4}px; ${penThickness === thicknessOpt.value ? 'background-color: #1967d2;' : ''}`}
							></span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<div class="grow"></div>

		<button
			class={`mt-2 flex h-11 w-11 items-center justify-center rounded-full text-gray-600 transition-colors ${!canUndo ? 'cursor-not-allowed opacity-40' : 'hover:bg-gray-200'}`}
			onclick={undo}
			disabled={!canUndo}
			title="Undo (Ctrl+Z)"
		>
			<Undo />
		</button>
		<button
			class={`flex h-11 w-11 items-center justify-center rounded-full text-gray-600 transition-colors ${!canRedo ? 'cursor-not-allowed opacity-40' : 'hover:bg-gray-200'}`}
			onclick={redo}
			disabled={!canRedo}
			title="Redo (Ctrl+Y)"
		>
			<Redo />
		</button>
	</div>

	<canvas
		bind:this={canvasElement}
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseLeave}
		onwheel={handleWheel}
		class="block h-full w-full grow touch-none"
		style={`background-color: ${BACKGROUND_COLOR};`}
	></canvas>
</div>
