extends CharacterBody3D

## ─── Exports ───
@export var agent_name: String = "Guest"
@export var show_safety_path: bool = true

## ─── Node references (resolved at runtime) ───
@onready var nav_agent: NavigationAgent3D = $NavigationAgent3D


var inside_room: bool = true
var assigned_door: Marker3D = null
var ai_state: String = "wander"   # wander, evacuate, escape_room
var last_door: Marker3D = null
var wander_timer: float = 0.0
var wander_wait: float = 0.0
var wander_target: Vector3 = Vector3.ZERO

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
var _fire_response_target: Node3D = null
var _extinguish_cooldown: float = 0.0
var _fire_response_state: bool = false
var _extinguishing_in_progress: bool = false
var _path_line_instance: MeshInstance3D = null
var _path_line_mesh: ImmediateMesh = null
var _path_line_material: StandardMaterial3D = null
var _safe_marker_instance: MeshInstance3D = null
var _path_refresh_timer: float = 0.0

const PATH_REFRESH_INTERVAL: float = 0.12
const PATH_Y_OFFSET: float = 0.07


func _ready() -> void:
	_setup_safety_visuals()

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
	ai_state = "wander"
	status = "idle"


func _physics_process(delta: float) -> void:
	if status == "dead" or status == "safe":
		_clear_safety_visuals()
		return
	
	if _extinguish_cooldown > 0.0:
		_extinguish_cooldown = maxf(0.0, _extinguish_cooldown - delta)
		if _extinguishing_in_progress and _extinguish_cooldown <= 0.0:
			_extinguishing_in_progress = false
			if status != "dead" and status != "safe":
				status = "idle"
	
	# Global fire check: if a fire spawned anywhere, force AI into evacuation mode
	if Global.fire_active and not fire_detected:
		trigger_fire()
	elif not Global.fire_active and fire_detected:
		clear_fire()
	
	# Choose movement based on mode
	match mode:
		"ai":
			_ai_move(delta)
		"manual":
			_manual_move(delta)
	
	# Update bridge state
	_update_bridge()
	_update_safety_visuals(delta)

func find_nearest_door() -> Marker3D:
	var doors = get_tree().get_nodes_in_group("doors")
	var closest: Marker3D = null
	var min_dist = INF
	
	for d in doors:
		var dist = global_position.distance_to(d.global_position)
		if dist < min_dist:
			min_dist = dist
			closest = d
	
	return closest
	
	
func find_random_point() -> Marker3D:
	var doors = get_tree().get_nodes_in_group("doors")
	if doors.size() == 0:
		return null
	return doors.pick_random()
	
## ─── AI Movement (using NavigationAgent3D) ───

func _ai_move(_delta: float) -> void:
	if _fire_response_state:
		_fire_response_move(_delta)
		return
	
	match ai_state:
		
		"wander":
			wander_timer -= _delta
			if wander_timer <= 0:
				wander_wait = randf_range(1.0, 3.0)
				wander_timer = wander_wait
				var offset = Vector3(randf_range(-5, 5), 0, randf_range(-5, 5))
				nav_agent.target_position = global_position + offset
		
		"escape_room":
			if last_door != null:
				nav_agent.target_position = last_door.global_position
			
			if not inside_room:
				ai_state = "evacuate"
				status = "evacuating"
				_find_safest_exit()
		
		"evacuate":
			if current_target != null:
				nav_agent.target_position = current_target.global_position
	
	# Movement execution
	var target_pos = nav_agent.target_position
	var dist_to_target = Vector2(global_position.x, global_position.z).distance_to(Vector2(target_pos.x, target_pos.z))
	
	if dist_to_target < 2.0:
		velocity = Vector3.ZERO
		# If evacuating and reached exit
		if ai_state == "evacuate" and current_target != null:
			status = "safe"
			_clear_safety_visuals()
			visible = false
	else:
		var next_pos = nav_agent.get_next_path_position()
		var dir = next_pos - global_position
		dir.y = 0
		
		if dir.length() > 0.2:
			var spd_mult = 1.2 if ai_state == "evacuate" else 0.8
			velocity = dir.normalized() * speed * spd_mult
		else:
			# Fallback: NavMesh is missing or broken. Move directly!
			var fallback_dir = target_pos - global_position
			fallback_dir.y = 0
			if fallback_dir.length() > 0.1:
				var spd_mult = 1.2 if ai_state == "evacuate" else 0.8
				velocity = fallback_dir.normalized() * speed * spd_mult
			else:
				velocity = Vector3.ZERO
	
	move_and_slide()


## ─── Manual Movement (dashboard-controlled) ───

func _manual_move(_delta: float) -> void:
	if not _has_manual_target:
		return
	
	nav_agent.target_position = _manual_target
	var dist_to_target = Vector2(global_position.x, global_position.z).distance_to(Vector2(_manual_target.x, _manual_target.z))
	
	if dist_to_target < 2.0:
		velocity = Vector3.ZERO
		_has_manual_target = false
	else:
		var next_pos = nav_agent.get_next_path_position()
		var direction = next_pos - global_position
		direction.y = 0
		
		if direction.length() > 0.2:
			velocity = direction.normalized() * speed
		else:
			# Fallback direct movement
			var fallback_dir = _manual_target - global_position
			fallback_dir.y = 0
			velocity = fallback_dir.normalized() * speed
			
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
	_fire_response_state = false
	_fire_response_target = null
	_clear_safety_visuals()


## ─── Fire interaction (called by fire.gd Area3D) ───

func trigger_fire() -> void:
	if fire_detected:
		return
	fire_detected = true
	
	if _is_fire_responder():
		# Responders prioritize crisis location, never evacuation exits.
		status = "responding"
		ai_state = "fire_response"
		var nearest_fire = _find_nearest_fire()
		if nearest_fire != null:
			assign_fire_response_target(nearest_fire)
		return
	
	ai_state = "evacuate"
	status = "evacuating"
	_find_safest_exit()


func _get_all_exits() -> Array:
	var exits = get_tree().get_nodes_in_group("exits")
	if exits.is_empty():
		# Fallback: manually grab default exits if group isn't set up
		var p = get_parent()
		if p and p.has_node("MainExit"): exits.append(p.get_node("MainExit"))
		if p and p.has_node("FireExit"): exits.append(p.get_node("FireExit"))
	return exits

func _find_safest_exit() -> void:
	var exits = _get_all_exits()
	if exits.is_empty():
		return
	
	var best_exit: Node3D = null
	var min_score = INF
	
	for exit in exits:
		if not is_instance_valid(exit): continue
		var dist = global_position.distance_to(exit.global_position)
		
		if Global.fire_active:
			var fire_pos = Global.fire_position
			if fire_pos.distance_to(exit.global_position) < 5.0:
				dist += 1000.0  # Massive penalty if fire is too close
				
		if dist < min_score:
			min_score = dist
			best_exit = exit
			
	if best_exit:
		set_target(best_exit)


func clear_fire() -> void:
	fire_detected = false
	_fire_response_target = null
	_fire_response_state = false
	_extinguishing_in_progress = false
	_clear_safety_visuals()
	if mode == "ai" and status != "safe":
		status = "idle"
		ai_state = "wander"
		set_target(null)


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
			if _is_fire_responder():
				var nearest_fire = _find_nearest_fire()
				if nearest_fire != null:
					assign_fire_response_target(nearest_fire)
				else:
					status = "responding"
					ai_state = "fire_response"
			else:
				_find_safest_exit()
		else:
			status = "idle"
			ai_state = "wander"
			set_target(null)
		_has_manual_target = false
	else:
		_clear_safety_visuals()
	print("[Agent %s] Mode changed to: %s" % [agent_name, mode])


func _on_bridge_reset() -> void:
	_clear_safety_visuals()
	queue_free()


## ─── Bridge state update ───

func _update_bridge() -> void:
	var bridge = get_node_or_null("/root/JSBridge")
	if bridge:
		bridge.update_agent(agent_id, Vector2(global_position.x, global_position.z), status, health)


func _is_fire_responder() -> bool:
	var normalized_name = agent_name.to_lower()
	return normalized_name.find("[security]") != -1 \
		or normalized_name.find("[staff]") != -1 \
		or normalized_name.find("[responder]") != -1 \
		or normalized_name.begins_with("security ") \
		or normalized_name.begins_with("staff ") \
		or normalized_name.begins_with("responder ")


func assign_fire_response_target(fire_node: Node3D) -> void:
	if fire_node == null or not is_instance_valid(fire_node):
		return
	if status == "dead" or status == "safe":
		return
	_fire_response_target = fire_node
	_fire_response_state = true
	fire_detected = true
	status = "responding"
	ai_state = "fire_response"
	mode = "ai"


func clear_fire_response_target() -> void:
	_fire_response_target = null
	_fire_response_state = false
	_clear_safety_visuals()
	if status != "dead" and status != "safe":
		status = "idle"
		ai_state = "wander"


func _fire_response_move(_delta: float) -> void:
	if _fire_response_target == null or not is_instance_valid(_fire_response_target):
		_fire_response_target = null
		_fire_response_state = false
		status = "idle"
		ai_state = "wander"
		velocity = Vector3.ZERO
		return
	
	nav_agent.target_position = _fire_response_target.global_position
	var next_pos = nav_agent.get_next_path_position()
	var dir = next_pos - global_position
	dir.y = 0
	
	if dir.length() > 0.15:
		velocity = dir.normalized() * speed * 1.3
	else:
		var fallback_dir = _fire_response_target.global_position - global_position
		fallback_dir.y = 0
		if fallback_dir.length() > 0.1:
			velocity = fallback_dir.normalized() * speed * 1.3
		else:
			velocity = Vector3.ZERO
	
	move_and_slide()
	
	if _extinguish_cooldown > 0.0:
		return
	
	var fire_distance = global_position.distance_to(_fire_response_target.global_position)
	if fire_distance <= 1.35:
		_extinguish_cooldown = 0.8
		_extinguishing_in_progress = true
		status = "extinguishing"
		var fire_to_remove = _fire_response_target
		_fire_response_target = null
		if is_instance_valid(fire_to_remove):
			fire_to_remove.queue_free()
		ai_state = "wander"
		_fire_response_state = false


func _find_nearest_fire() -> Node3D:
	var fire_nodes = get_tree().get_nodes_in_group("fire_hazards")
	var nearest_fire: Node3D = null
	var nearest_dist := INF
	
	for fire in fire_nodes:
		if not is_instance_valid(fire):
			continue
		var dist = global_position.distance_to(fire.global_position)
		if dist < nearest_dist:
			nearest_dist = dist
			nearest_fire = fire
	
	return nearest_fire


func _setup_safety_visuals() -> void:
	if not show_safety_path:
		return

	_path_line_material = StandardMaterial3D.new()
	_path_line_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_path_line_material.albedo_color = Color(0.16, 0.98, 0.35, 0.95)
	_path_line_material.emission_enabled = true
	_path_line_material.emission = Color(0.16, 0.98, 0.35, 1.0)
	_path_line_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA

	_path_line_mesh = ImmediateMesh.new()
	_path_line_instance = MeshInstance3D.new()
	_path_line_instance.mesh = _path_line_mesh
	add_child(_path_line_instance)
	_path_line_instance.visible = false

	var marker_mesh := SphereMesh.new()
	marker_mesh.radius = 0.35

	var marker_material := StandardMaterial3D.new()
	marker_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	marker_material.albedo_color = Color(0.28, 1.0, 0.48, 0.75)
	marker_material.emission_enabled = true
	marker_material.emission = Color(0.28, 1.0, 0.48, 1.0)
	marker_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA

	_safe_marker_instance = MeshInstance3D.new()
	_safe_marker_instance.mesh = marker_mesh
	_safe_marker_instance.material_override = marker_material
	add_child(_safe_marker_instance)
	_safe_marker_instance.visible = false


func _update_safety_visuals(delta: float) -> void:
	if not show_safety_path:
		return

	var can_show := mode == "ai" and ai_state == "evacuate" and current_target != null and is_instance_valid(current_target)
	if not can_show:
		_clear_safety_visuals()
		return

	if _safe_marker_instance != null:
		_safe_marker_instance.visible = true
		_safe_marker_instance.global_position = current_target.global_position + Vector3(0.0, 0.35, 0.0)

	if _path_line_instance != null:
		_path_line_instance.visible = true

	_path_refresh_timer += delta
	if _path_refresh_timer < PATH_REFRESH_INTERVAL:
		return
	_path_refresh_timer = 0.0

	var nav_path: PackedVector3Array = nav_agent.get_current_navigation_path()
	_draw_path_line(nav_path)


func _draw_path_line(path_points: PackedVector3Array) -> void:
	if _path_line_mesh == null:
		return

	_path_line_mesh.clear_surfaces()
	if _path_line_material == null:
		return

	var has_current_target := current_target != null and is_instance_valid(current_target)

	_path_line_mesh.surface_begin(Mesh.PRIMITIVE_LINE_STRIP, _path_line_material)
	_path_line_mesh.surface_add_vertex(global_position + Vector3(0.0, PATH_Y_OFFSET, 0.0))

	for point in path_points:
		_path_line_mesh.surface_add_vertex(point + Vector3(0.0, PATH_Y_OFFSET, 0.0))

	if has_current_target:
		_path_line_mesh.surface_add_vertex(current_target.global_position + Vector3(0.0, PATH_Y_OFFSET, 0.0))

	_path_line_mesh.surface_end()


func _clear_safety_visuals() -> void:
	if _path_line_instance != null:
		_path_line_instance.visible = false
	if _safe_marker_instance != null:
		_safe_marker_instance.visible = false
	if _path_line_mesh != null:
		_path_line_mesh.clear_surfaces()
