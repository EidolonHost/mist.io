define('app/controllers/machines', [
    'app/models/machine'],
	/**
	 * Machines controller
	 *
	 * FIXME perhaps have a reference to the holding backend?
	 *
	 * @returns Class
	 */
	function(Machine) {
		return Ember.ArrayController.extend({
			backend: null,
			
			content: null,
			
			init: function() {
				this._super();
				this.set('content', []),
				this.refresh();
			},
			
			refresh: function(){
				console.log("refreshing machines");
				
				if(this.backend.state == "offline"){
					this.clear();
					return;
				}
				
				var that = this;
				
				this.backend.set('state', 'wait');
				
				$.getJSON('/backends/' + this.backend.index + '/machines', function(data) {
					
					console.log("machines for " + that.backend.title);
					console.log(data.length);
					
					var contentDidChange = false;
					
					data.forEach(function(item){
						
						var found = false;
						
						console.log("item id: " + item.id);
						
						that.content.forEach(function(machine){
							console.log("machine id: " + machine.id);
							
							if(machine.id == item.id){
								found = true;
								console.log("found");
								machine.set(item);
								return false;
							}
						});
						
						if(!found){
							console.log("not found, adding");
							item.backend = that.backend;
							var machine = Machine.create(item);
							that.content.push(machine);
							contentDidChange = true;
							
							$.ajax({
			                    url: '/machine_has_key',
			                    data: {ip: machine.public_ips[0]},
			                    success: function(data) {
			                    	console.log("machine has key? ");
			                    	console.log(data);
			                    	if(data){
			                    		machine.set('hasKey', data);
			                    	} else {
			                    		machine.set('hasKey', false);
			                    	}
			                    }
							}).error(function(e) {
								console.log('error querying for machine key for machine id: ' + machine.id);
								console.log(e.state + " " + e.stateText);
								machine.set('hasKey', false);
							});
							
						}
					})
					
					// TODO handle deletion from server
					
					if(contentDidChange){
						that.contentDidChange();
					}
					
					that.backend.set('state', 'online');
					
					Ember.run.later(that, function(){
						this.refresh();
				    }, that.backend.poll_interval);
				}).error(function(e) {
					Mist.notificationController.notify("Error loading machines for backend: " + that.backend.title);
					that.backend.set('state', 'offline');
					console.log("Error loading machines for backend: " + that.backend.title)
					console.log(e.state + " " + e.stateText);
				});
				
			},
			
			newMachine: function(name, image, size){
				var payload = {
	                    "name": name,
	                    "location" : this.backend.id,
	                    "image": image.id,
	                    "size": size.id
	            };
				$.ajax({
                    type: "POST",
                    contentType: "application/json",
                    dataType: "json",
                    data: JSON.stringify(payload),
                    url: 'backends/' + this.backend.index + '/machines',
                    success: function(data) {
                    },
                    error: function(jqXHR, textstate, errorThrown) {
                    }
                });
			}
		
		});
	}
);