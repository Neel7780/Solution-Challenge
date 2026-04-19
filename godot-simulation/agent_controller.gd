## agent_controller.gd — Attach to your Agent/Person scene's root node.
## Handles both AI-driven pathfinding (autonomous evacuation) and manual control from dashboard.
##
## USAGE:
##   1. Attach this script to each agent/person scene in your Godot project.
##   2. Make sure the JSBridge AutoLoad is enabled.
##   3. Set the NavigationAgent2D node path if using navigation.
##
## AI MODE:
##   Agent autonomously navigates to the nearest exit, avoiding fire.
##   Uses NavigationAgent2D for pathfinding.
##
## MANUAL MODE:
##   Agent only moves when the dashboard sends a move command.

extends CharacterBody2D

## ─── Export Variables ───
@export var agent_name: String = "Guest"
@export var move_speed: float = 120.0
@export var initial_health: int = 100
@export var fire_damage_rate: float = 10.0  ## HP/sec when touching fire

## ─── Internal State ───
var agent_id: String = ""
var mode: String = "ai"  ## "ai" or "manual"
var status: String = "idle"  ## idle, evacuating, trapped, safe, dead
var health: int = 100
var _manual_target: Vector2 = Vector2.ZERO
var _has_manual_target: bool = false

## ─── Node References ───
@onready var nav_agent: NavigationAgent2D = $NavigationAgent2D if has_node("NavigationAgent2D") else null

## ─── Exit points — set these in your scene ───
## You can either export these or detect them via groups.
var exit_points: Array[Vector2] = []


func _ready() -> void:
	health = initial_health
	agent_id = "agent_" + str(get_instance_id())
	
	# Register with JSBridge
	if Engine.has_singleton("JSBridge") or has_node("/root/JSBridge"):
		var bridge = get_node_or_null("/root/JSBridge")
		if bridge:
			bridge.register_agent(agent_id, agent_name, global_position, status, health, mode)
			bridge.agent_move_requested.connect(_on_move_requested)
			bridge.agent_mode_changed.connect(_on_mode_changed)
			bridge.simulation_reset_requested.connect(_on_reset)
	
	# Find exits via group
	_find_exits()
	
	# Start evacuating if in AI mode
	if mode == "ai":
		_start_evacuation()


func _physics_process(delta: float) -> void:
	if status == "dead" or status == "safe":
		return
	
	# Fire damage check
	_check_fire_damage(delta)
	
	if health <= 0:
		_die()
		return
	
	# Movement
	match mode:
		"ai":
			_ai_move(delta)
		"manual":
			_manual_move(delta)
	
	# Update bridge
	_update_bridge()


## ─── AI Movement ───

func _ai_move(delta: float) -> void:
	if nav_agent == null:
		return
	
	if nav_agent.is_navigation_finished():
		if status == "evacuating":
			_reach_exit()
		return
	
	var next_pos = nav_agent.get_next_path_position()
	var direction = (next_pos - global_position).normalized()
	velocity = direction * move_speed
	move_and_slide()


func _start_evacuation() -> void:
	status = "evacuating"
	if nav_agent and exit_points.size() > 0:
		var nearest_exit = _find_nearest_exit()
		nav_agent.target_position = nearest_exit


func _find_nearest_exit() -> Vector2:
	var nearest = exit_points[0]
	var min_dist = global_position.distance_to(nearest)
	for ep in exit_points:
		var dist = global_position.distance_to(ep)
		if dist < min_dist:
			min_dist = dist
			nearest = ep
	return nearest


## ─── Manual Movement ───

func _manual_move(delta: float) -> void:
	if not _has_manual_target:
		return
	
	var direction = (_manual_target - global_position).normalized()
	var distance = global_position.distance_to(_manual_target)
	
	if distance < 5.0:
		_has_manual_target = false
		velocity = Vector2.ZERO
		return
	
	velocity = direction * move_speed
	move_and_slide()


## ─── Fire Damage ───

func _check_fire_damage(delta: float) -> void:
	# Check if overlapping with any fire area
	# This assumes fire nodes are in a "fire" group with Area2D
	var fire_areas = get_tree().get_nodes_in_group("fire")
	for fire in fire_areas:
		if fire is Area2D:
			# Simple distance check
			if global_position.distance_to(fire.global_position) < 50.0:
				health -= int(fire_damage_rate * delta)
				if status != "trapped":
					status = "trapped"
				return


func _die() -> void:
	status = "dead"
	health = 0
	velocity = Vector2.ZERO
	# Visual feedback
	modulate = Color(0.3, 0.3, 0.3, 0.5)
	_update_bridge()


func _reach_exit() -> void:
	status = "safe"
	velocity = Vector2.ZERO
	visible = false
	_update_bridge()


## ─── Signal Handlers ───

func _on_move_requested(target_agent_id: String, target: Vector2) -> void:
	if target_agent_id != agent_id:
		return
	_manual_target = target
	_has_manual_target = true
	if mode == "ai" and nav_agent:
		nav_agent.target_position = target


func _on_mode_changed(target_agent_id: String, new_mode: String) -> void:
	if target_agent_id != agent_id:
		return
	mode = new_mode
	if mode == "ai":
		_start_evacuation()
	else:
		if nav_agent:
			nav_agent.target_position = global_position  # Stop navigation


func _on_reset() -> void:
	queue_free()


## ─── Bridge Update ───

func _update_bridge() -> void:
	var bridge = get_node_or_null("/root/JSBridge")
	if bridge:
		bridge.update_agent(agent_id, global_position, status, health)


## ─── Utilities ───

func _find_exits() -> void:
	# Find all nodes in the "exit" group and use their positions
	var exit_nodes = get_tree().get_nodes_in_group("exit")
	for node in exit_nodes:
		if node is Node2D:
			exit_points.append(node.global_position)
	
	# Fallback: hardcoded exit if none found
	if exit_points.size() == 0:
		exit_points.append(Vector2(400, 700))  # Default bottom exit
		exit_points.append(Vector2(100, 0))    # Default top exit
