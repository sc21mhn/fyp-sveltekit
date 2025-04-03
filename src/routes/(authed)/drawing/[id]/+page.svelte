<script>
	import { onMount } from 'svelte';

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

	// --- Computed State ---
	let canUndo = $derived(history.length > 0);
	let canRedo = $derived(redoStack.length > 0);
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
		} else if (tool === 'eraser') {
			showEraserOptions = !showEraserOptions;
			showPenOptions = false; // Close other options
		} else {
			// Close options if selecting hand tool etc.
			showPenOptions = false;
			showEraserOptions = false;
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

<div class="jamboard-container">
	<div class="sidebar-toolbar">
		<button
			class="tool-button"
			class:active={currentTool === 'pen'}
			onclick={() => selectTool('pen')}
			title="Pen ({currentThicknessLabel})"
		>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
				><path
					d="M18.783 3.217a1 1 0 0 0-1.414 0L14 6.586l-2.293-2.293a1 1 0 0 0-1.414 0L3.217 11.217a1 1 0 0 0 0 1.414l8.071 8.071a1 1 0 0 0 1.414 0l7.071-7.071a1 1 0 0 0 0-1.414L18.783 3.217ZM12 19.586l-7.071-7.071 6.364-6.364 7.071 7.071-6.364 6.364Z"
				></path></svg
			>
		</button>

		<button
			class="tool-button"
			class:active={currentTool === 'eraser'}
			onclick={() => selectTool('eraser')}
			title="Eraser ({currentThicknessLabel})"
		>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
				><path
					d="M19.707 5.293a1 1 0 0 0-1.414 0L14 9.586l-4.293-4.293a1 1 0 0 0-1.414 0L2.293 11.293a1 1 0 0 0 0 1.414l9 9a1 1 0 0 0 1.414 0l7-7a1 1 0 0 0 0-1.414L19.707 5.293ZM13 19.586l-7.293-7.293L11.586 10l1.707 1.707a1 1 0 0 0 1.414 0l1.707-1.707L18.707 13 13 18.707V19.586Z"
				></path></svg
			>
		</button>

		<button
			class="tool-button"
			class:active={currentTool === 'hand'}
			onclick={() => selectTool('hand')}
			title="Select / Pan"
		>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
				><path
					d="M15 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-3.65 2.546a3.5 3.5 0 0 0-4.932-.88l-1.827 1.33a1 1 0 0 0-.39.807l-.08 3.334a1 1 0 0 0 .996.996l3.334-.08a1 1 0 0 0 .808-.39l1.33-1.827a3.502 3.502 0 0 0 4.398-5.597l-3.637 1.977ZM19 11.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-2.15 2.546a3.502 3.502 0 0 0-5.597 4.398l1.977-3.637-3.637 1.977a3.502 3.502 0 0 0 4.398-5.597l2.86-2.86a1.5 1.5 0 1 0-2.12-2.12l-2.86 2.86a3.5 3.5 0 0 0-4.95 4.95l-1.4 1.918a3 3 0 0 1-2.423 1.17H4a1 1 0 0 1-1-1v-.17a3 3 0 0 1 1.17-2.424l1.918-1.4a3.5 3.5 0 0 0 4.95-4.95l2.86-2.86a1.5 1.5 0 1 0-2.12-2.12l-2.86 2.86a3.5 3.5 0 0 0-5.597 4.398L3.04 12.546a1.5 1.5 0 1 1-2.096-2.14l1.977-3.637a3.502 3.502 0 0 0 4.398 5.597l2.86 2.86a1.5 1.5 0 1 0 2.12 2.12l-2.86-2.86a3.5 3.5 0 0 0-4.95-4.95l-1.918 1.4A3 3 0 0 1 4.17 12H4a1 1 0 0 1-1 1v-.17a3 3 0 0 1 1.17-2.424l1.4-1.918a3.5 3.5 0 0 0 4.95 4.95l2.86 2.86a1.5 1.5 0 1 0 2.12 2.12l-2.86-2.86a3.5 3.5 0 0 0-4.398-5.597l-1.977 3.637a1.5 1.5 0 1 1-2.14-2.096l3.637-1.977a3.5 3.5 0 0 0 5.597-4.398L15.454 3.04a1.5 1.5 0 1 1 2.096 2.14L13.913 8.817a3.5 3.5 0 0 0 4.398 5.597l2.86 2.86A1.5 1.5 0 1 0 23.29 15.15l-2.86-2.86a3.5 3.5 0 0 0-4.95-4.95l1.4-1.918A3 3 0 0 1 19.83 4H20a1 1 0 0 1 1 1v.17a3 3 0 0 1-1.17 2.424l-1.918 1.4a3.5 3.5 0 0 0-4.95 4.95l-2.86 2.86a1.5 1.5 0 1 0 2.12 2.12l2.86-2.86a3.5 3.5 0 0 0 5.597 4.398l3.637-1.977a1.5 1.5 0 1 1 2.14 2.096L18.96 18.96a3.5 3.5 0 0 0-5.597-4.398L10.504 20.96a1.5 1.5 0 1 1-2.14-2.096l3.637-1.977Z"
				></path></svg
			>
		</button>

		{#if showPenOptions}
			<div class="tool-options-panel pen-options">
				<div class="thickness-options">
					{#each JAMBOARD_THICKNESSES as thicknessOpt}
						<button
							class="thickness-button"
							class:active={penThickness === thicknessOpt.value}
							onclick={() => selectThickness(thicknessOpt.value)}
							title={thicknessOpt.label}
						>
							<span
								class="dot"
								style:width="{thicknessOpt.value * 0.8 + 4}px"
								style:height="{thicknessOpt.value * 0.8 + 4}px"
							></span>
						</button>
					{/each}
				</div>
				<div class="color-options">
					{#each JAMBOARD_COLORS as color}
						<button
							class="color-button"
							class:active={penColor === color}
							style:background-color={color}
							onclick={() => selectColor(color)}
							title="Color: {color}"
						>
							{#if penColor === color}<span class="checkmark">✔</span>{/if}
						</button>
					{/each}
					<input
						type="color"
						class="custom-color-input"
						bind:value={penColor}
						title="Custom Color"
					/>
				</div>
			</div>
		{/if}

		{#if showEraserOptions}
			<div class="tool-options-panel eraser-options">
				<div class="thickness-options">
					{#each JAMBOARD_THICKNESSES as thicknessOpt}
						<button
							class="thickness-button"
							class:active={penThickness === thicknessOpt.value}
							onclick={() => selectThickness(thicknessOpt.value)}
							title={thicknessOpt.label}
						>
							<span
								class="dot"
								style:width="{thicknessOpt.value * 0.8 + 4}px"
								style:height="{thicknessOpt.value * 0.8 + 4}px"
							></span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<div style="flex-grow: 1;"></div>

		<button
			class="tool-button history-button"
			onclick={undo}
			disabled={!canUndo}
			title="Undo (Ctrl+Z)"
		>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
				><path
					d="M12.5 2C7.25 2 3 6.25 3 11.5h3.5c0-3.03 2.47-5.5 5.5-5.5s5.5 2.47 5.5 5.5S15.53 17 12.5 17H9.212l1.646-1.646a.5.5 0 0 0-.707-.707L7.293 17.5a1 1 0 0 0 0 1.414l2.858 2.858a.5.5 0 0 0 .707-.707L9.212 19H12.5c4.42 0 8.5-3.58 8.5-7.5S16.92 2 12.5 2Z"
				></path></svg
			>
		</button>
		<button
			class="tool-button history-button"
			onclick={redo}
			disabled={!canRedo}
			title="Redo (Ctrl+Y)"
		>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
				><path
					d="M18.5 11.5c0-3.03-2.47-5.5-5.5-5.5S7.5 8.47 7.5 11.5H4c0-4.42 3.58-8.5 7.5-8.5s7.5 4.08 7.5 8.5c0 3.92-2.85 7.5-7.5 7.5h-3.288l1.646 1.646a.5.5 0 0 1-.707.707l-2.858-2.858a1 1 0 0 1 0-1.414l2.858-2.858a.5.5 0 0 1 .707.707L11.788 17H13c2.75 0 5.5-2.47 5.5-5.5Z"
				></path></svg
			>
		</button>
	</div>

	<canvas
		bind:this={canvasElement}
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseLeave}
		onwheel={handleWheel}
		class="main-canvas"
		style="touch-action: none; background-color: {BACKGROUND_COLOR};"
	></canvas>
</div>

<style>
	.jamboard-container {
		width: 100%;
		height: 100vh; /* Adjust height as needed */
		min-height: 500px;
		border: 1px solid #dadce0; /* Jamboard-like border */
		display: flex;
		overflow: hidden;
		background-color: #f8f9fa; /* Light background for the container itself */
		position: relative; /* Needed for potential absolute positioning inside */
	}

	.sidebar-toolbar {
		width: 64px; /* Typical icon toolbar width */
		background-color: #f1f3f4; /* Jamboard toolbar color */
		border-right: 1px solid #dadce0;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 12px 0;
		gap: 8px; /* Spacing between main tools */
		flex-shrink: 0; /* Prevent sidebar from shrinking */
		position: relative; /* For positioning option panels */
		z-index: 10; /* Ensure toolbar is above canvas for clicks */
	}

	.tool-button {
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		width: 44px;
		height: 44px;
		border-radius: 50%; /* Circular buttons */
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #5f6368; /* Default icon color */
		transition: background-color 0.2s ease;
	}
	.tool-button:hover:not(:disabled) {
		background-color: #e8eaed; /* Light grey hover */
	}
	.tool-button.active {
		background-color: #e8f0fe; /* Jamboard active blue background */
		color: #1967d2; /* Jamboard active blue color */
	}
	.tool-button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.tool-button svg {
		width: 24px;
		height: 24px;
	}

	/* Specific styling for undo/redo if needed */
	.history-button {
		margin-top: 8px; /* Add some space above undo/redo */
	}

	/* --- Options Panel --- */
	.tool-options-panel {
		background-color: #ffffff;
		border-radius: 8px;
		box-shadow:
			0 1px 3px rgba(60, 64, 67, 0.3),
			0 4px 8px rgba(60, 64, 67, 0.15);
		padding: 12px;
		position: absolute;
		left: 72px; /* Position next to the toolbar */
		top: 10px; /* Adjust vertical alignment as needed */
		display: flex;
		flex-direction: column;
		gap: 12px;
		width: max-content; /* Fit content */
		z-index: 20; /* Above toolbar */
	}
	/* Adjust vertical position based on which tool is active */
	.pen-options {
		top: 10px;
	}
	.eraser-options {
		top: 64px;
	} /* Approx below the eraser button */

	.thickness-options,
	.color-options {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap; /* Allow wrapping if many colors */
	}

	.thickness-button {
		background: none;
		border: 2px solid transparent; /* For active state */
		padding: 4px;
		margin: 0;
		width: 36px; /* Adjust size */
		height: 36px;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: border-color 0.2s ease;
	}
	.thickness-button:hover {
		border-color: #e0e0e0;
	}
	.thickness-button.active {
		border-color: #1967d2; /* Blue border for active */
	}

	.thickness-button .dot {
		display: block;
		background-color: #5f6368; /* Match icon color */
		border-radius: 50%;
	}
	.thickness-button.active .dot {
		background-color: #1967d2; /* Match active color */
	}

	.color-options {
		max-width: 160px; /* Limit width to encourage wrapping */
	}

	.color-button {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2px solid rgba(0, 0, 0, 0.1);
		cursor: pointer;
		padding: 0;
		position: relative;
		transition: transform 0.1s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.color-button:hover {
		transform: scale(1.1);
	}
	.color-button.active {
		border-color: #1967d2; /* Highlight active color */
	}
	.color-button .checkmark {
		color: white; /* Or black depending on background */
		font-size: 14px;
		font-weight: bold;
		mix-blend-mode: difference; /* Make checkmark visible on most colors */
	}

	.custom-color-input {
		width: 32px;
		height: 32px;
		border: 1px solid #dadce0;
		border-radius: 50%;
		padding: 0;
		overflow: hidden;
		cursor: pointer;
		appearance: none;
		-webkit-appearance: none;
		background-color: transparent; /* Hide default system UI */
	}
	/* Style the inner color picker button */
	.custom-color-input::-webkit-color-swatch-wrapper {
		padding: 0;
		border: none;
	}
	.custom-color-input::-webkit-color-swatch {
		border: none;
		border-radius: 50%;
	}
	/* Similar for Firefox if needed */
	.custom-color-input::-moz-color-swatch {
		border: none;
		border-radius: 50%;
	}

	.main-canvas {
		flex-grow: 1; /* Canvas takes remaining space */
		display: block;
		width: 100%; /* Fill flex item width */
		height: 100%; /* Fill flex item height */
		cursor: default; /* Base cursor, overridden by JS */
		/* Background set inline via JS */
	}
</style>
