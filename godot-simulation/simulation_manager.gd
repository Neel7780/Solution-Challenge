## simulation_manager.gd — Attach to the ROOT Node3D of floor.tscn
## Orchestrates spawning/removing fires and agents based on dashboard commands.
##
## SETUP:
##   1. In Godot editor, select the root "Node3D" node of floor.tscn
##   2. Right-click → Attach Script → name it simulation_manager.gd
##   3. Before using this, save your Agent and Fire as separate scenes:
##      - Right-click "Agent" node → Save Branch as Scene → agent.tscn
##      - Right-click "Fire" node → Save Branch as Scene → fire_prefab.tscn
##   4. Make sure JSBridge is registered as an AutoLoad

extends Node3D

## ─── Packed Scenes (set in editor or loaded here) ───
## After saving branches as scenes, these paths will work:
var agent_scene: PackedScene = null
var fire_scene: PackedScene = null

## ─── Tracking ───
var spawned_agents: Array[CharacterBody3D] = []
var spawned_fires: Array[Node3D] = []
var _frame_counter: int = 0
var _next_agent_number: int = 1
var _responder_assign_counter: int = 0

## ─── Agent name pool ───
const AGENT_NAMES: Array[String] = [
	"Guest Anderson", "Tourist Baker", "Staff Chen", "Visitor Davis",
	"Guest Evans", "Tourist Foster", "Staff Garcia", "Visitor Harris",
	"Guest Ibrahim", "Tourist Jackson", "Staff Kim", "Visitor Lee",
]

## ─── Camera reference (for pixel → world conversion) ───
@onready var camera: Camera3D = $Camera3D


func _ready() -> void:
	# Load the packed scenes
	# Adjust these paths if you saved them with different names
	if ResourceLoader.exists("res://agent.tscn"):
		agent_scene = load("res://agent.tscn")
		print("[SimManager] Loaded agent.tscn")
	else:
		push_warning("[SimManager] agent.tscn not found! Save your Agent node as a scene first.")
	
	if ResourceLoader.exists("res://fire.tscn"):
		fire_scene = load("res://fire.tscn")
		print("[SimManager] Loaded fire.tscn")
	else:
		push_warning("[SimManager] fire.tscn not found! Save your Fire node as a scene first.")
	
	# Connect to JSBridge signals
	var bridge = get_node_or_null("/root/JSBridge")
	if bridge:
		bridge.fire_spawn_requested.connect(_on_fire_spawn)
		bridge.fire_remove_requested.connect(_on_fire_remove)
		bridge.agent_spawn_requested.connect(_on_agent_spawn)
		bridge.agent_move_requested.connect(_on_agent_move)
		bridge.simulation_reset_requested.connect(_on_reset)
		bridge.speed_change_requested.connect(_on_speed_change)
		print("[SimManager] Connected to JSBridge signals.")
	else:
		print("[SimManager] JSBridge not found. Running without dashboard connection.")
	
	# Register the initial agent that already exists in the scene
	var existing_agent = get_node_or_null("Agent")
	if existing_agent:
		_configure_agent_collision(existing_agent)
		spawned_agents.append(existing_agent)
	
	# Register the initial fire
	var existing_fire = get_node_or_null("Fire")
	if existing_fire:
		existing_fire.add_to_group("fire_hazards")
		spawned_fires.append(existing_fire)


func _physics_process(_delta: float) -> void:
	# Update JSBridge state every 30 frames (~0.5s at 60fps)
	_frame_counter += 1
	if _frame_counter >= 30:
		_frame_counter = 0
		_sync_state_to_bridge()
	
	# Assign responder staff/security to active fire targets (~3 times per second)
	_responder_assign_counter += 1
	if _responder_assign_counter >= 20:
		_responder_assign_counter = 0
		_assign_responders_to_fires()


## ═══════════════════════════════════════════════════════
##  COORDINATE CONVERSION
## ═══════════════════════════════════════════════════════
##
## The dashboard sends pixel coordinates (e.g. x=650, y=400).
## We need to convert them to 3D world coordinates.
##
## The camera is top-down at y=20, looking straight down.
## We project the screen position onto the y=0 ground plane.

func pixel_to_world(pixel_x: float, pixel_y: float) -> Vector3:
	if camera == null:
		# Fallback: rough manual mapping
		# Scene spans roughly x: -9 to 5, z: -15 to 10
		# Viewport is whatever the browser gives (assume ~1200x800 for the iframe)
		var viewport_size = get_viewport().get_visible_rect().size
		var world_x = lerp(-9.0, 5.0, pixel_x / viewport_size.x)
		var world_z = lerp(-15.0, 10.0, pixel_y / viewport_size.y)
		return Vector3(world_x, 0.0, world_z)
	
	# Use camera projection for accurate conversion
	var screen_pos = Vector2(pixel_x, pixel_y)
	# Project from screen to a point at the ground plane (y=0)
	var from = camera.project_ray_origin(screen_pos)
	var direction = camera.project_ray_normal(screen_pos)
	
	# Intersect with y=0 plane
	if abs(direction.y) < 0.001:
		return Vector3.ZERO  # Ray is parallel to ground, can't intersect
	
	var t = -from.y / direction.y
	var world_pos = from + direction * t
	world_pos.y = 0.0
	return world_pos


## ═══════════════════════════════════════════════════════
##  FIRE SPAWNING
## ═══════════════════════════════════════════════════════

func _on_fire_spawn(pixel_pos: Vector2) -> void:
	if fire_scene == null:
		push_warning("[SimManager] Cannot spawn fire — fire.tscn not loaded")
		return
	
	var world_pos = pixel_to_world(pixel_pos.x, pixel_pos.y)
	
	var new_fire = fire_scene.instantiate()
	new_fire.global_position = world_pos
	add_child(new_fire)
	new_fire.add_to_group("fire_hazards")
	spawned_fires.append(new_fire)
	
	print("[SimManager] Fire spawned at world pos: ", world_pos)


func _on_fire_remove(pixel_pos: Vector2) -> void:
	var world_pos = pixel_to_world(pixel_pos.x, pixel_pos.y)
	
	# Find the nearest fire within 2 world units
	var nearest_fire: Node3D = null
	var nearest_dist: float = 2.0
	
	for fire in spawned_fires:
		if not is_instance_valid(fire):
			continue
		var dist = fire.global_position.distance_to(world_pos)
		if dist < nearest_dist:
			nearest_dist = dist
			nearest_fire = fire
	
	if nearest_fire:
		spawned_fires.erase(nearest_fire)
		nearest_fire.queue_free()
		print("[SimManager] Fire removed near world pos: ", world_pos)


## ═══════════════════════════════════════════════════════
##  AGENT SPAWNING
## ═══════════════════════════════════════════════════════

func _on_agent_spawn(pixel_pos: Vector2, agent_name_from_dashboard: String) -> void:
	if agent_scene == null:
		push_warning("[SimManager] Cannot spawn agent — agent.tscn not loaded")
		return
	
	var world_pos = pixel_to_world(pixel_pos.x, pixel_pos.y)
	
	var new_agent = agent_scene.instantiate()
	
	# Set the agent's name
	var display_name = agent_name_from_dashboard
	if display_name == "" or display_name == "Agent":
		display_name = AGENT_NAMES[(_next_agent_number - 1) % AGENT_NAMES.size()]
	new_agent.agent_name = display_name
	_next_agent_number += 1
	
	# Add to scene tree first (so @onready vars resolve)
	add_child(new_agent)
	
	# Then set position
	new_agent.global_position = Vector3(world_pos.x, 0.2, world_pos.z)
	_configure_agent_collision(new_agent)
	
	spawned_agents.append(new_agent)
	
	print("[SimManager] Agent '%s' spawned at world pos: %s" % [display_name, world_pos])


func _on_agent_move(agent_id: String, pixel_pos: Vector2) -> void:
	var world_pos = pixel_to_world(pixel_pos.x, pixel_pos.y)
	
	for agent in spawned_agents:
		if not is_instance_valid(agent):
			continue
		if agent.agent_id == agent_id:
			agent.move_to_position(world_pos)
			print("[SimManager] Moving agent '%s' to: %s" % [agent.agent_name, world_pos])
			return
	
	print("[SimManager] Agent not found: ", agent_id)


## ═══════════════════════════════════════════════════════
##  SIMULATION CONTROLS
## ═══════════════════════════════════════════════════════

func _on_reset() -> void:
	# Remove all dynamically spawned entities
	# Keep the originals that were in the scene from the start
	for fire in spawned_fires:
		if is_instance_valid(fire):
			fire.queue_free()
	spawned_fires.clear()
	
	for agent in spawned_agents:
		if is_instance_valid(agent):
			agent.queue_free()
	spawned_agents.clear()
	
	_next_agent_number = 1
	
	# Clear bridge state
	var bridge = get_node_or_null("/root/JSBridge")
	if bridge:
		bridge.clear_all()
	
	print("[SimManager] Simulation reset.")


func _on_speed_change(multiplier: float) -> void:
	Engine.time_scale = clampf(multiplier, 0.25, 8.0)
	print("[SimManager] Speed set to: ", multiplier)


## ═══════════════════════════════════════════════════════
##  STATE SYNC TO JSBRIDGE
## ═══════════════════════════════════════════════════════

func _sync_state_to_bridge() -> void:
	var bridge = get_node_or_null("/root/JSBridge")
	if bridge == null:
		return
	
	# Clear and rebuild agent/fire arrays
	bridge.agents.clear()
	bridge.fires.clear()
	
	var evacuated_count: int = 0
	var trapped_count: int = 0
	var casualty_count: int = 0
	
	for agent in spawned_agents:
		if not is_instance_valid(agent):
			continue
		bridge.register_agent(
			agent.agent_id,
			agent.agent_name,
			Vector2(agent.global_position.x, agent.global_position.z),
			agent.status,
			agent.health,
			agent.mode
		)
		match agent.status:
			"safe":
				evacuated_count += 1
			"trapped":
				trapped_count += 1
			"dead":
				casualty_count += 1
	
	for fire in spawned_fires:
		if not is_instance_valid(fire):
			continue
		bridge.register_fire(Vector2(fire.global_position.x, fire.global_position.z), 0.8, 2.0)
	
	# Update metrics
	bridge.update_metrics({
		"evacuated": evacuated_count,
		"trapped": trapped_count,
		"casualties": casualty_count,
		"avg_evacuation_time": 0.0,
		"fire_coverage_pct": spawned_fires.size() * 5.0,
		"blocked_exits": [],
		"total_agents": spawned_agents.size(),
	})


func _assign_responders_to_fires() -> void:
	var live_fires: Array[Node3D] = []
	for fire in spawned_fires:
		if is_instance_valid(fire):
			live_fires.append(fire)
	
	if live_fires.is_empty():
		for agent in spawned_agents:
			if not is_instance_valid(agent):
				continue
			if agent.has_method("_is_fire_responder") and agent._is_fire_responder():
				if agent.has_method("clear_fire_response_target"):
					agent.clear_fire_response_target()
		return
	
	for agent in spawned_agents:
		if not is_instance_valid(agent):
			continue
		if not agent.has_method("_is_fire_responder") or not agent._is_fire_responder():
			continue
		if not agent.has_method("assign_fire_response_target"):
			continue
		
		var nearest_fire: Node3D = null
		var nearest_dist := INF
		for fire in live_fires:
			var dist = agent.global_position.distance_to(fire.global_position)
			if dist < nearest_dist:
				nearest_dist = dist
				nearest_fire = fire
		
		if nearest_fire:
			agent.assign_fire_response_target(nearest_fire)


func _configure_agent_collision(new_agent: CharacterBody3D) -> void:
	if not is_instance_valid(new_agent):
		return
	
	for other in spawned_agents:
		if not is_instance_valid(other):
			continue
		if other == new_agent:
			continue
		# Prevent responder jams by letting agents pass through each other.
		new_agent.add_collision_exception_with(other)
		other.add_collision_exception_with(new_agent)
