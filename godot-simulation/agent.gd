extends CharacterBody3D

## ─── Exports ───
@export var agent_name: String = "Guest"

## ─── Node references (resolved at runtime) ───
@onready var main_exit: Marker3D = $"../MainExit"
@onready var fire_exit: Marker3D = $"../FireExit"

## ─── State ───
var agent_id: String = ""
var speed: float = 4.0
var fire_detected: bool = false
var current_target: Node3D = null
var status: String = "idle"       # idle, evacuating, trapped, safe, dead
var health: int = 100
var mode: String = "ai"           # ai, manual
var _manual_target: Vector3 = Vector3.ZERO
var _has_manual_target: bool = false


func _ready() -> void:
	# Generate a unique ID
	agent_id = "agent_" + str(get_instance_id())
	
	# Register with JSBridge (if available)
	var bridge = get_node_or_null("/root/JSBridge")
	if bridge:
		bridge.register_agent(agent_id, agent_name, Vector2(global_position.x, global_position.z), status, health, mode)
		# Listen for commands aimed at this agent
		if bridge.has_signal("agent_move_requested"):
			bridge.agent_move_requested.connect(_on_bridge_move)
		if bridge.has_signal("agent_mode_changed"):
			bridge.agent_mode_changed.connect(_on_bridge_mode_changed)
		if bridge.has_signal("simulation_reset_requested"):
			bridge.simulation_reset_requested.connect(_on_bridge_reset)
	
	# Default behavior: walk to main exit
	set_target(main_exit)
	status = "evacuating"


func _physics_process(delta: float) -> void:
	if status == "dead" or status == "safe":
		return
	
	# Choose movement based on mode
	match mode:
		"ai":
			_ai_move(delta)
		"manual":
			_manual_move(delta)
	
	# Update bridge state
	_update_bridge()


## ─── AI Movement (original behavior) ───

func _ai_move(_delta: float) -> void:
	if current_target == null:
		return
	
	var direction = current_target.global_position - global_position
	direction.y = 0
	
	if direction.length() > 0.1:
		velocity = direction.normalized() * speed
	else:
		# Reached the exit
		velocity = Vector3.ZERO
		status = "safe"
	
	move_and_slide()


## ─── Manual Movement (dashboard-controlled) ───

func _manual_move(_delta: float) -> void:
	if not _has_manual_target:
		return
	
	var direction = _manual_target - global_position
	direction.y = 0
	
	if direction.length() > 0.2:
		velocity = direction.normalized() * speed
	else:
		velocity = Vector3.ZERO
		_has_manual_target = false
	
	move_and_slide()


## ─── Target management ───

func set_target(target_node: Node3D) -> void:
	current_target = target_node
	if target_node:
		print("[Agent %s] Target set to: %s" % [agent_name, target_node.name])


func move_to_position(world_pos: Vector3) -> void:
	_manual_target = world_pos
	_manual_target.y = global_position.y  # Keep same height
	_has_manual_target = true


## ─── Fire interaction (called by fire.gd Area3D) ───

func trigger_fire() -> void:
	if not fire_detected:
		fire_detected = true
		status = "evacuating"
		if mode == "ai":
			set_target(fire_exit)
		print("[Agent %s] Fire detected! Rerouting." % agent_name)


func clear_fire() -> void:
	fire_detected = false
	if mode == "ai":
		set_target(main_exit)


## ─── Bridge signal handlers ───

func _on_bridge_move(target_agent_id: String, target: Vector2) -> void:
	if target_agent_id != agent_id:
		return
	# The manager will convert pixel coords to world coords and call move_to_position directly
	# This handler is for direct bridge commands with world coords
	move_to_position(Vector3(target.x, global_position.y, target.y))


func _on_bridge_mode_changed(target_agent_id: String, new_mode: String) -> void:
	if target_agent_id != agent_id:
		return
	mode = new_mode
	if mode == "ai":
		# Resume AI behavior
		if fire_detected:
			set_target(fire_exit)
		else:
			set_target(main_exit)
		_has_manual_target = false
	print("[Agent %s] Mode changed to: %s" % [agent_name, mode])


func _on_bridge_reset() -> void:
	queue_free()


## ─── Bridge state update ───

func _update_bridge() -> void:
	var bridge = get_node_or_null("/root/JSBridge")
	if bridge:
		bridge.update_agent(agent_id, Vector2(global_position.x, global_position.z), status, health)
