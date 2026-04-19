extends Area3D

func _on_body_entered(body):
	if body.has_method("trigger_fire"):
		body.trigger_fire()

func _on_body_exited(body):
	if body.has_method("clear_fire"):
		body.clear_fire()
