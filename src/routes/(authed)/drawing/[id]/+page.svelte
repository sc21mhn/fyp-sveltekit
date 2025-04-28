<script>
	import Hand from 'lucide-svelte/icons/hand';
	import Eraser from 'lucide-svelte/icons/eraser';
	import Pen from 'lucide-svelte/icons/pen';
	import Undo from 'lucide-svelte/icons/undo';
	import Redo from 'lucide-svelte/icons/redo';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import Users from 'lucide-svelte/icons/users';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';

	import { session } from '$lib/session.svelte';
	let { data } = $props();

	let { supabase } = $derived(data);

	// --- Constants ---
	const MIN_ZOOM = 0.1;
	const MAX_ZOOM = 10;
	const SCROLL_SENSITIVITY = 0.001;
	const DOT_SPACING = 25;
	const DOT_RADIUS = 0.75;
	const DOT_COLOR = '#e0e0e0';
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

	let currentUser = $derived({
		id: session.user?.id,
		username: session.user?.user_metadata.preferred_username,
		email: session.user?.email,
		avatar: session.user?.user_metadata.avatar_url,
		color: getRandomColor()
	});

	// --- State ---
	let canvasElement = $state(null);
	let ctx = $state(null);

	// Drawing/Interaction State
	let isDrawing = $state(false);
	let isPanning = $state(false);
	let currentTool = $state('pen');
	let penColor = $state(JAMBOARD_COLORS[0]);
	let penThickness = $state(JAMBOARD_THICKNESSES[1].value);

	// View State
	let zoom = $state(1);
	let offsetX = $state(0);
	let offsetY = $state(0);
	let lastX = $state(0);
	let lastY = $state(0);

	// Drawing Data & History
	let strokes = $state([]);
	let currentStroke = $state(null);
	let deletedStrokeIds = $state([]); // Track strokes deleted for undo
	let history = $state([]);
	let redoStack = $state([]);
	let lastLoadedStrokeId = $state(null); // For pagination/incremental loading

	// UI State
	let showPenOptions = $state(false);
	let showEraserOptions = $state(false);
	let showClearConfirm = $state(false);
	let showActiveUsers = $state(false);
	let isLoading = $state(true);

	// --- Supabase Realtime State ---
	let drawingId = $state('');
	let realtimeChannel = $state(null);
	let strokesSubscription = $state(null);
	let isInitialLoad = $state(true);
	let activeUsers = $state([]);

	// --- Computed State ---
	let canUndo = $derived(history.length > 0);
	let canRedo = $derived(redoStack.length > 0);
	let hasStrokes = $derived(strokes.length > 0);

	let currentThicknessLabel = $derived(
		JAMBOARD_THICKNESSES.find((t) => t.value === penThickness)?.label || `${penThickness}px`
	);

	// --- Lifecycle & Setup ---
	onMount(() => {
		// Get drawing ID from route params
		drawingId = $page.params.id;

		// Initialize canvas
		if (canvasElement) {
			ctx = canvasElement.getContext('2d');
			resizeCanvas();
			window.addEventListener('resize', resizeCanvas);
			updateCursor();
			document.addEventListener('click', handleClickOutside);
		}

		// Load initial strokes
		loadStrokes();

		// Setup Supabase Realtime channel
		setupRealtimeChannel();

		return () => {
			cleanupRealtimeChannel();
			window.removeEventListener('resize', resizeCanvas);
			document.removeEventListener('click', handleClickOutside);
		};
	});

	onDestroy(() => {
		cleanupRealtimeChannel();
	});

	// --- Supabase Functions ---
	async function loadStrokes(limit = 100) {
		isLoading = true;

		try {
			// Query to get strokes for this drawing
			let query = supabase
				.from('strokes')
				.select('*')
				.eq('drawing_id', drawingId)
				.order('created_at', { ascending: true });

			// Add pagination if we have a last loaded stroke ID
			if (lastLoadedStrokeId) {
				query = query.gt('id', lastLoadedStrokeId);
			}

			// Add limit
			query = query.limit(limit);

			const { data, error } = await query;

			if (error) {
				console.error('Error loading strokes:', error);
				return;
			}

			if (data && data.length > 0) {
				// Format strokes for our canvas
				const loadedStrokes = data.map((stroke) => ({
					id: stroke.id,
					points: stroke.points,
					color: stroke.color,
					thickness: stroke.thickness,
					userId: stroke.user_id,
					userName: stroke.user_name,
					userColor: stroke.user_color,
					tool: stroke.tool || 'pen',
					timestamp: stroke.created_at
				}));

				// Update last loaded ID for pagination
				lastLoadedStrokeId = data[data.length - 1].id;

				// Add to our strokes array
				strokes = [...strokes, ...loadedStrokes];

				// If we got a full page, there might be more
				if (data.length === limit) {
					// Could load more, but let's wait until user scrolls/zooms
				}
			}

			isInitialLoad = false;
			requestAnimationFrame(draw);
		} catch (err) {
			console.error('Error in loadStrokes:', err);
		} finally {
			isLoading = false;
		}
	}

	function setupRealtimeChannel() {
		// Clean up existing channel if any
		cleanupRealtimeChannel();

		// Create a new channel for this drawing's presence
		realtimeChannel = supabase.channel(`drawing:${drawingId}`, {
			config: {
				presence: {
					key: currentUser?.id
				}
			}
		});

		// Setup presence for showing active users
		realtimeChannel.on('presence', { event: 'sync' }, handlePresenceSync);
		realtimeChannel.on('presence', { event: 'join' }, handlePresenceJoin);
		realtimeChannel.on('presence', { event: 'leave' }, handlePresenceLeave);

		// Track the current user's presence
		if (currentUser) {
			realtimeChannel.track({
				user_id: currentUser.id,
				name: currentUser.username,
				email: currentUser.email,
				color: currentUser.color,
				online_at: new Date().toISOString()
			});
		}

		// Subscribe to the presence channel
		realtimeChannel.subscribe((status) => {
			console.log(`Presence channel status: ${status}`);
		});

		// Subscribe to strokes table changes
		setupStrokesSubscription();
	}

	function setupStrokesSubscription() {
		// Subscribe to changes on the strokes table for this drawing
		strokesSubscription = supabase
			.channel(`strokes:${drawingId}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'strokes',
					filter: `drawing_id=eq.${drawingId}`
				},
				handleStrokeInsert
			)
			.on(
				'postgres_changes',
				{
					event: 'DELETE',
					schema: 'public',
					table: 'strokes',
					filter: `drawing_id=eq.${drawingId}`
				},
				handleStrokeDelete
			)
			.subscribe();
	}

	function cleanupRealtimeChannel() {
		if (realtimeChannel) {
			realtimeChannel.unsubscribe();
			realtimeChannel = null;
		}

		if (strokesSubscription) {
			strokesSubscription.unsubscribe();
			strokesSubscription = null;
		}
	}

	async function saveStrokeToSupabase(stroke) {
		if (!drawingId || !currentUser || !stroke) return null;

		try {
			// Prepare stroke data for database
			const strokeData = {
				drawing_id: drawingId,
				user_id: currentUser.id,
				points: stroke.points,
				color: stroke.color,
				thickness: stroke.thickness,
				tool: stroke.tool || 'pen',
				user_name: currentUser.username,
				user_color: currentUser.color
			};

			// Insert the stroke
			const { data, error } = await supabase.from('strokes').insert(strokeData).select().single();

			if (error) {
				console.error('Error saving stroke:', error);
				return null;
			}

			// Return the saved stroke with its ID
			return {
				...stroke,
				id: data.id
			};
		} catch (err) {
			console.error('Error in saveStrokeToSupabase:', err);
			return null;
		}
	}

	async function deleteStrokeFromSupabase(strokeId) {
		if (!strokeId) return false;

		try {
			const { error } = await supabase.from('strokes').delete().eq('id', strokeId);

			if (error) {
				console.error('Error deleting stroke:', error);
				return false;
			}

			return true;
		} catch (err) {
			console.error('Error in deleteStrokeFromSupabase:', err);
			return false;
		}
	}

	async function clearAllStrokes() {
		if (!drawingId) return false;

		try {
			const { error } = await supabase.from('strokes').delete().eq('drawing_id', drawingId);

			if (error) {
				console.error('Error clearing strokes:', error);
				return false;
			}

			return true;
		} catch (err) {
			console.error('Error in clearAllStrokes:', err);
			return false;
		}
	}

	// --- Realtime Event Handlers ---
	function handleStrokeInsert(payload) {
		if (!payload || isInitialLoad) return;

		// Skip strokes from the current user (we already have them)
		if (payload.new.user_id === currentUser?.id) return;

		// Add the received stroke to our local state
		const receivedStroke = {
			id: payload.new.id,
			points: payload.new.points,
			color: payload.new.color,
			thickness: payload.new.thickness,
			userId: payload.new.user_id,
			userName: payload.new.user_name,
			userColor: payload.new.user_color,
			tool: payload.new.tool || 'pen',
			timestamp: payload.new.created_at
		};

		// Add to our strokes array
		strokes = [...strokes, receivedStroke];

		requestAnimationFrame(draw);
	}

	function handleStrokeDelete(payload) {
		if (!payload || isInitialLoad) return;

		// If the deleted stroke was created by the current user and we're the ones
		// who initiated the delete, we should already have removed it from our local state

		// Remove the stroke from our local state if it still exists
		const deletedStrokeId = payload.old.id;
		strokes = strokes.filter((stroke) => stroke.id !== deletedStrokeId);

		requestAnimationFrame(draw);
	}

	function handlePresenceSync() {
		if (!realtimeChannel) return;

		const presenceState = realtimeChannel.presenceState();
		const users = [];

		// Extract unique users from the presence state
		Object.keys(presenceState).forEach((key) => {
			const userPresence = presenceState[key][0];
			if (userPresence && userPresence.user_id !== currentUser?.id) {
				users.push({
					id: userPresence.user_id,
					name: userPresence.name,
					email: userPresence.email,
					color: userPresence.color,
					online_at: userPresence.online_at,
					cursor: userPresence.cursor
				});
			}
		});

		activeUsers = users;
	}

	function handlePresenceJoin({ key, newPresences }) {
		if (!newPresences || newPresences.length === 0) return;

		// Only add users who aren't already in our list
		newPresences.forEach((presence) => {
			if (presence.user_id !== currentUser?.id) {
				const existingUserIndex = activeUsers.findIndex((u) => u.id === presence.user_id);

				if (existingUserIndex === -1) {
					activeUsers = [
						...activeUsers,
						{
							id: presence.user_id,
							name: presence.name,
							email: presence.email,
							color: presence.color,
							online_at: presence.online_at,
							cursor: presence.cursor
						}
					];
				}
			}
		});
	}

	function handlePresenceLeave({ key, leftPresences }) {
		if (!leftPresences || leftPresences.length === 0) return;

		// Remove users who left
		leftPresences.forEach((presence) => {
			activeUsers = activeUsers.filter((user) => user.id !== presence.user_id);
		});
	}

	function getRandomColor() {
		return JAMBOARD_COLORS[Math.floor(Math.random() * JAMBOARD_COLORS.length)];
	}

	// --- Coordinate Transformation ---
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

	// --- Drawing Logic ---
	function draw() {
		if (!ctx || !canvasElement) return;

		const width = canvasElement.width;
		const height = canvasElement.height;

		ctx.save();

		ctx.fillStyle = BACKGROUND_COLOR;
		ctx.fillRect(0, 0, width, height);

		ctx.translate(offsetX, offsetY);
		ctx.scale(zoom, zoom);

		drawBackground();

		strokes.forEach(drawSingleStroke);

		if (currentStroke && currentStroke.points.length > 0) {
			drawSingleStroke(currentStroke);
		}

		// Draw active users' cursors
		if (zoom > 0.4) {
			drawActiveCursors();
		}

		ctx.restore();
	}

	function drawBackground() {
		if (!ctx || !canvasElement || zoom < 0.2) return;

		const screenWidth = canvasElement.width;
		const screenHeight = canvasElement.height;

		const worldLeft = -offsetX / zoom;
		const worldTop = -offsetY / zoom;
		const worldRight = (screenWidth - offsetX) / zoom;
		const worldBottom = (screenHeight - offsetY) / zoom;

		const startWorldX = Math.floor(worldLeft / DOT_SPACING) * DOT_SPACING;
		const startWorldY = Math.floor(worldTop / DOT_SPACING) * DOT_SPACING;

		const radius = Math.max(0.2 / zoom, DOT_RADIUS / zoom);

		ctx.fillStyle = DOT_COLOR;
		ctx.beginPath();

		for (let x = startWorldX; x < worldRight; x += DOT_SPACING) {
			for (let y = startWorldY; y < worldBottom; y += DOT_SPACING) {
				ctx.moveTo(x + radius, y);
				ctx.arc(x, y, radius, 0, Math.PI * 2);
			}
		}
		ctx.fill();
	}

	function drawSingleStroke(stroke) {
		if (!ctx || !stroke || stroke.points.length < 1) return;

		ctx.beginPath();
		ctx.strokeStyle = stroke.color;
		ctx.lineWidth = stroke.thickness / zoom;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		// If only one point, draw a small circle (dot)
		if (stroke.points.length === 1) {
			const radius = stroke.thickness / 2 / zoom;
			ctx.fillStyle = stroke.color;
			ctx.arc(stroke.points[0].x, stroke.points[0].y, Math.max(radius, 0.1 / zoom), 0, Math.PI * 2);
			ctx.fill();
		} else {
			// Draw line for multiple points
			ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
			for (let i = 1; i < stroke.points.length; i++) {
				ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
			}
			ctx.stroke();
		}

		// Draw user indicator for collaborative strokes
		if (stroke.userId && stroke.userId !== currentUser?.id && stroke.userName) {
			// Only draw user indicators at a reasonable zoom level
			if (zoom > 0.5) {
				const lastPoint = stroke.points[stroke.points.length - 1];
				ctx.fillStyle = stroke.userColor || '#000000';
				ctx.font = `${12 / zoom}px sans-serif`;
				ctx.fillText(stroke.userName, lastPoint.x + 5 / zoom, lastPoint.y - 5 / zoom);
			}
		}
	}

	function drawActiveCursors() {
		if (!ctx || activeUsers.length === 0) return;

		activeUsers.forEach((user) => {
			if (user.cursor) {
				const { x, y } = user.cursor;

				// Draw cursor circle
				ctx.beginPath();
				ctx.fillStyle = user.color || '#000000';
				ctx.arc(x, y, 5 / zoom, 0, Math.PI * 2);
				ctx.fill();

				// Draw user name
				ctx.fillStyle = user.color || '#000000';
				ctx.font = `${12 / zoom}px sans-serif`;
				ctx.fillText(user.name, x + 10 / zoom, y);
			}
		});
	}

	// --- Stroke Simplification ---
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

	// --- History Management with Database Integration ---
	function saveStateForUndo() {
		// Create a deep copy of the current strokes state
		const currentStrokesState = strokes.map((stroke) => ({
			...stroke,
			points: stroke.points.map((p) => ({ ...p }))
		}));

		history = [...history, currentStrokesState];
		redoStack = [];
	}

	async function undo() {
		if (!canUndo) return;

		// Get the previous state from history
		const prevState = history.pop();

		// Prepare the current state for redo
		const currentStrokesState = strokes.map((stroke) => ({
			...stroke,
			points: stroke.points.map((p) => ({ ...p }))
		}));
		redoStack = [...redoStack, currentStrokesState];

		// Identify strokes that were added and need to be removed
		const prevIds = new Set(prevState.map((s) => s.id).filter(Boolean));
		const currentIds = new Set(strokes.map((s) => s.id).filter(Boolean));

		// Find strokes to delete (exist in current but not in prev)
		const strokesToDelete = strokes.filter((s) => s.id && !prevIds.has(s.id));

		// Find strokes to add (exist in prev but not in current)
		const strokesToAdd = prevState.filter((s) => s.id && !currentIds.has(s.id));

		// Update the local state first
		strokes = prevState;

		// Now update the database (deletions first, then additions)
		for (const stroke of strokesToDelete) {
			await deleteStrokeFromSupabase(stroke.id);
		}

		// Store deleted stroke IDs for potential redo
		deletedStrokeIds = [...deletedStrokeIds, ...strokesToDelete.map((s) => s.id)];

		requestAnimationFrame(draw);
	}

	async function redo() {
		if (!canRedo) return;

		// Get the next state from redo stack
		const nextState = redoStack.pop();

		// Prepare the current state for undo
		const currentStrokesState = strokes.map((stroke) => ({
			...stroke,
			points: stroke.points.map((p) => ({ ...p }))
		}));
		history = [...history, currentStrokesState];

		// Identify strokes that were added and need to be removed
		const nextIds = new Set(nextState.map((s) => s.id).filter(Boolean));
		const currentIds = new Set(strokes.map((s) => s.id).filter(Boolean));

		// Find strokes to delete (exist in current but not in next)
		const strokesToDelete = strokes.filter((s) => s.id && !nextIds.has(s.id));

		// Find strokes to add (exist in next but not in current)
		const strokesToAdd = nextState.filter((s) => s.id && !currentIds.has(s.id));

		// Update the local state first
		strokes = nextState;

		// Now update the database
		for (const stroke of strokesToDelete) {
			await deleteStrokeFromSupabase(stroke.id);
		}

		// For strokes to add, check if they were previously deleted (have an ID)
		// If so, we need to re-add them to the database
		for (const stroke of strokesToAdd) {
			if (!stroke.id) {
				// This is a new stroke that needs to be saved
				const savedStroke = await saveStrokeToSupabase(stroke);
				if (savedStroke) {
					// Update the stroke in our local state with its new ID
					const index = strokes.findIndex((s) => s === stroke);
					if (index !== -1) {
						strokes[index] = savedStroke;
					}
				}
			}
		}

		requestAnimationFrame(draw);
	}

	// --- Clear All Function ---
	async function clearAll() {
		if (!hasStrokes) return;

		// Save current state for undo before clearing
		saveStateForUndo();

		// Clear all strokes from database
		const success = await clearAllStrokes();

		if (success) {
			// Clear local strokes array
			strokes = [];
			showClearConfirm = false;
			requestAnimationFrame(draw);
		} else {
			// Handle error - perhaps revert the undo state
			alert('Failed to clear drawing. Please try again.');
			history.pop(); // Remove the saved state since we didn't clear
		}
	}

	// --- Event Handlers ---
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

				// Create a new stroke (without an ID yet - will be assigned when saved)
				currentStroke = {
					points: [{ x: worldCoords.x, y: worldCoords.y }],
					color: strokeColor,
					thickness: penThickness,
					tool: currentTool
				};

				requestAnimationFrame(draw);
				updateCursor();
				event.preventDefault();

				// Close popups when starting a new drawing action
				showPenOptions = false;
				showEraserOptions = false;
				showClearConfirm = false;
				showActiveUsers = false;
			}
		}
	}

	function handleMouseMove(event) {
		const { x: screenX, y: screenY } = getCanvasCoords(event);

		// Update cursor position for other users via presence
		if (realtimeChannel && currentUser) {
			const worldCoords = getWorldCoords(screenX, screenY);
			realtimeChannel.track({
				user_id: currentUser.id,
				name: currentUser.username,
				email: currentUser.email,
				color: currentUser.color,
				online_at: new Date().toISOString(),
				cursor: { x: worldCoords.x, y: worldCoords.y }
			});
		}

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
				requestAnimationFrame(draw);
			}
		}
	}

	async function finalizeStroke() {
		if (currentStroke?.points.length > 0) {
			if (currentStroke.points.length > 2) {
				const simplified = simplifyStroke(currentStroke.points, SIMPLIFICATION_TOLERANCE);
				if (simplified.length > 0) {
					currentStroke.points = simplified;
				} else if (currentStroke.points.length > 0) {
					currentStroke.points = [currentStroke.points[0]];
				}
			}

			// Save the stroke to the database
			const savedStroke = await saveStrokeToSupabase(currentStroke);

			if (savedStroke) {
				// Add the stroke with its new database ID to our local state
				saveStateForUndo();
				strokes = [...strokes, savedStroke];
			} else {
				// Handle error case - still add stroke locally but mark it somehow
				console.error('Failed to save stroke to database. Adding locally only.');
				saveStateForUndo();
				strokes = [...strokes, { ...currentStroke, saveError: true }];
			}
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

	function handleClickOutside(event) {
		const toolbar = document.querySelector('.sidebar-toolbar');
		if (toolbar && !toolbar.contains(event.target)) {
			showPenOptions = false;
			showEraserOptions = false;
			showClearConfirm = false;
			showActiveUsers = false;
		}
	}

	function resizeCanvas() {
		if (!canvasElement) return;
		const containerWidth = canvasElement.parentElement.clientWidth;
		const containerHeight = canvasElement.parentElement.clientHeight;
		canvasElement.width = containerWidth;
		canvasElement.height = containerHeight;
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
			showEraserOptions = false;
			showClearConfirm = false;
			showActiveUsers = false;
		} else if (tool === 'eraser') {
			showEraserOptions = !showEraserOptions;
			showPenOptions = false;
			showClearConfirm = false;
			showActiveUsers = false;
		} else {
			showPenOptions = false;
			showEraserOptions = false;
			showClearConfirm = false;
		}
		updateCursor();
	}

	function selectColor(color) {
		penColor = color;
	}

	function selectThickness(thickness) {
		penThickness = thickness;
	}

	function toggleClearConfirm() {
		showClearConfirm = !showClearConfirm;
		showPenOptions = false;
		showEraserOptions = false;
		showActiveUsers = false;
	}

	function toggleActiveUsers() {
		showActiveUsers = !showActiveUsers;
		showPenOptions = false;
		showEraserOptions = false;
		showClearConfirm = false;
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
					break;
				case 'hand':
					cursorStyle = 'grab';
					break;
				case 'eraser':
					cursorStyle = 'cell';
					break;
				default:
					cursorStyle = 'default';
			}
		}
		if (canvasElement.style.cursor !== cursorStyle) {
			canvasElement.style.cursor = cursorStyle;
		}
	}

	// --- Effects ---
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

	$effect(() => {
		if (currentTool !== 'pen') showPenOptions = false;
		if (currentTool !== 'eraser') showEraserOptions = false;
	});

	$effect(() => {
		const trigger = activeUsers;
		requestAnimationFrame(draw);
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

		<!-- Active Users Button -->
		<button
			class={`flex h-11 w-11 items-center justify-center rounded-full text-gray-600 transition-colors ${showActiveUsers ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-200'}`}
			onclick={toggleActiveUsers}
			title={`${activeUsers.length} Active User${activeUsers.length !== 1 ? 's' : ''}`}
		>
			<Users />
			{#if activeUsers.length > 0}
				<span
					class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white"
				>
					{activeUsers.length}
				</span>
			{/if}
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
				class="absolute top-[118px] left-[72px] z-20 flex w-max flex-col gap-2 rounded-lg bg-white p-3 shadow-lg"
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

		{#if showActiveUsers && activeUsers.length > 0}
			<div
				class="absolute top-[118px] left-[72px] z-20 flex w-max max-w-xs flex-col gap-2 rounded-lg bg-white p-3 shadow-lg"
			>
				<h3 class="font-medium text-gray-900">Active Users</h3>
				<ul class="max-h-60 overflow-y-auto">
					{#each activeUsers as user}
						<li class="flex items-center gap-2 py-1">
							<span
								class="h-3 w-3 rounded-full"
								style={`background-color: ${user.color || '#000000'};`}
							></span>
							<span class="text-sm text-gray-700">{user.name}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if showPenOptions}
			<div
				class="absolute top-[10px] left-[72px] z-20 flex w-max flex-col gap-3 rounded-lg bg-white p-3 shadow-lg"
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
				class="absolute top-[64px] left-[72px] z-20 flex w-max flex-col gap-3 rounded-lg bg-white p-3 shadow-lg"
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

	<!-- Loading indicator -->
	{#if isLoading}
		<div class="absolute bottom-4 left-4 rounded-full bg-blue-500 px-3 py-1 text-sm text-white">
			Loading...
		</div>
	{/if}

	<!-- Collaborative indicator badge -->
	{#if activeUsers.length > 0}
		<div class="absolute right-4 bottom-4 rounded-full bg-blue-500 px-3 py-1 text-sm text-white">
			{activeUsers.length + 1}
			{activeUsers.length + 1 === 1 ? 'person' : 'people'} editing
		</div>
	{/if}
</div>
