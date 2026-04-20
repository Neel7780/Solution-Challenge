extends Area3D


func _ready():
	add_to_group("fire_hazards")
	Global.fire_active = true
	Global.fire_position = global_position

func _exit_tree():
	# Fire removed: keep fire_active true if other fires still exist
	var remaining_fires = get_tree().get_nodes_in_group("fire_hazards")
	var still_active = false
	var fallback_position = Vector3.ZERO
	
	for fire in remaining_fires:
		if fire != self and is_instance_valid(fire):
			still_active = true
			fallback_position = fire.global_position
			break
	
	Global.fire_active = still_active
	if still_active:
		Global.fire_position = fallback_position
	else:
		print("🔥 Fire cleared!")

func _on_body_entered(body):
	# Optional: damage or special reaction
	if body.has_method("trigger_fire"):
		body.trigger_fire()

func _on_body_exited(body):
	# Optional: recovery logic
	if body.has_method("clear_fire"):
		body.clear_fire()
