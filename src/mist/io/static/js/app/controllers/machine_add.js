define('app/controllers/machine_add', ['ember'],
    /**
     *  Machine Add Controller
     *
     *  @returns Class
     */
    function() {
        return Ember.Object.extend({

            //
            //  Properties
            //

            callback: null,
            formReady: null,
            addingMachine: null,
            selectedImage: null,

            newMachineKey: null,
            newMachineName: null,
            newMachineSize: null,
            newMachineImage: null,
            newMachineCloudInit: null,
            newMachineScript: null,
            newMachineLocation: null,
            newMachineProvider: null,
            newMachineProject: null,
            newMachineMonitoring: null,
            newMachineAssociateFloatingIp: true,
            newMachineDockerCommand: null,
            newMachineDockerEnvironment: null,
            newMachineDockerPorts: null,
            newMachineAzurePorts: null,


            //
            //  Methods
            //

            open: function(callback) {
                // In case page is scrolled, opening the
                // panel introduces an unpleasant view.
                // Scrolling to top fixes that
                $('#machine-create').find('[data-role="collapsible"]')
                    .collapsible('option', 'collapsedIcon', 'carat-d')
                    .collapsible('collapse');

                this._clear();
                this._updateFormReady();
                this.set('callback', callback);
                this.view.checkImageSelected(this.get('selectedImage'));
            },

            close: function() {
                this._clear();
                $('#create-machine').collapsible('collapse');
            },

            add: function() {
                var providerName = this.newMachineProvider.title;
                var machineSize = this.newMachineSize.name;
                var machineImage = this.newMachineImage.name;
                var machineName = this.newMachineName;

                // Validate machine name
                // TODO: This thing is ugly. Move regex and strings into a dict

                if (providerName == 'NephoScale') {
                    var re = /^[0-9a-z_-]*$/;
                    if ( machineName.length > 64 || !re.test(machineName)) {

                        Mist.notificationController.timeNotify(
                            'Server name in NephoScale may have lower-case letters, numbers, hyphen (\'-\') and underscore (\'_\') characters, cannot exceed 64 ' +
                            'characters, and can end with a letter or a number.', 7000);
                        return;
                    }
                    if (machineSize.indexOf('CS025') > -1) {
                        if ((machineImage != 'Linux Ubuntu Server 10.04 LTS 64-bit') &&
                            (machineImage !='Linux CentOS 6.2 64-bit')) {

                                Mist.notificationController.timeNotify(
                                    'On CS025 size you can only create one of the two images: ' +
                                    'Linux Ubuntu Server 10.04 LTS 64-bit or Linux CentOS 6.2 64-bit', 7000);
                                return;
                        }
                    }
                }
                if (providerName == 'Azure') {
                    var re = /^[0-9a-zA-Z-]*$/;
                    if (!re.test(machineName)) {
                        Mist.notificationController.timeNotify('The name can contain only letters, numbers, and hyphens. The name must start with a letter and must end with a letter or a number.', 7000);
                        return;
                    }
                }
                if (providerName == 'Google Compute Engine') {
                    var re = /^[0-9a-z-]*$/;
                    if (!re.test(machineName)) {
                        Mist.notificationController.timeNotify('Name must be lowercase letters, numbers, and hyphens', 7000);
                        return;
                    }
                }
                if (providerName == 'SoftLayer') {
                    var re = /^[0-9a-zA-Z.-]*$/;
                    if (machineName.length > 253 || !re.test(machineName)) {
                        Mist.notificationController.timeNotify(
                            'Server name in Softlayer must be an alphanumeric string,' +
                            ' that may contain period (\'.\') and dash (\'-\') special characters.', 7000);
                        return;
                    }
                }

                var that = this;
                this.newMachineProvider.machines.newMachine(
                        this.get('newMachineName'),
                        this.get('newMachineImage'),
                        this.get('newMachineSize'),
                        this.get('newMachineLocation'),
                        this.get('newMachineKey'),
                        this.get('newMachineCloudInit'),
                        this.get('newMachineScript'),
                        this.get('newMachineProject'),
                        this.get('newMachineMonitoring'),
                        this.get('newMachineAssociateFloatingIp'),
                        this.get('newMachineDockerEnvironment').trim(),
                        this.get('newMachineDockerCommand'),
                        this.get('newMachineScriptParams'),
                        this.get('newMachineDockerPorts'),
                        this.get('newMachineAzurePorts'),
                        function(success, machine) {
                            that._giveCallback(success, machine);
                        }
                );

                this.close();

                // Redirect to machine list view if user is in image list view
                if ($('#image-list-page').length) {
                    Mist.__container__.lookup('router:main').transitionTo('machines');
                }
            },


            //
            //  Pseudo-Private Methods
            //

             _clear: function() {
                this.set('callback', null)
                    .set('newMachineName', '')
                    .set('newMachineCloudInit', '')
                    .set('newMachineScript', '')
                    .set('newMachineProject', '')
                    .set('newMachineKey', {'title' : 'Select Key'})
                    .set('newMachineSize', {'name' : 'Select Size'})
                    .set('newMachineImage', {'name' : 'Select Image'})
                    .set('newMachineLocation', {'name' : 'Select Location'})
                    .set('newMachineProvider', {'title' : 'Select Provider'})
                    .set('newMachineMonitoring', Mist.email ? true : false)
                    .set('newMachineAssociateFloatingIp', true)
                    .set('newMachineDockerEnvironment', '')
                    .set('newMachineDockerCommand', '')
                    .set('newMachineScriptParams', '')
                    .set('newMachineDockerPorts', '')
                    .set('newMachineAzurePorts', '');
                this.view.clear();
             },

            _updateFormReady: function() {
                var formReady = false;
                if (this.newMachineName &&
                    this.newMachineSize.id &&
                    this.newMachineImage.id &&
                    this.newMachineProvider.id) {
                    formReady = true;
                }

                // SSH key is optional for docker
                if (this.newMachineProvider.provider != 'docker') {
                    if (!Mist.keysController.keyExists(this.newMachineKey.id)) {
                        formReady = false;
                    }
                }

                if (this.newMachineProvider.provider == 'docker' && !this.view.dockerNeedScript) {
                    if(! this.newMachineDockerCommand) {
                        formReady = false;
                    }
                }

                if (this.newMachineImage.id &&
                    this.newMachineImage.get('isMist')) {
                        if (!Mist.keysController.keyExists(this.newMachineKey.id))
                            formReady = false;
                }

                if (formReady && this.addingMachine) {
                    formReady = false;
                }

                this.set('formReady', formReady);
            },

            _giveCallback: function(success, machine) {
                if (this.callback) this.callback(success, machine);
            },

            _resetProvider: function() {
                this.set('callback', null)
                    .set('newMachineCloudInit', '')
                    .set('newMachineScript', '')
                    .set('newMachineProject', '')
                    .set('newMachineKey', {'title' : 'Select Key'})
                    .set('newMachineSize', {'name' : 'Select Size'})
                    .set('newMachineImage', {'name' : 'Select Image'})
                    .set('newMachineLocation', {'name' : 'Select Location'})
                    .set('newMachineAssociateFloatingIp', true)
                    .set('newMachineDockerEnvironment', '')
                    .set('newMachineDockerCommand', '')
                    .set('newMachineScriptParams', '')
                    .set('newMachineDockerPorts', '')
                    .set('newMachineAzurePorts', '');
            },

            _selectUnique: function() {
                // Locations Check
                if (this.newMachineProvider.locations) {
                    if (this.newMachineProvider.locations.model.length == 1) {
                        this.set('newMachineLocation', this.newMachineProvider.locations.model[0]);
                    }
                }

                // Sizes Check
                if (this.newMachineProvider.sizes) {
                    if (this.newMachineProvider.sizes.model.length == 1) this.set('newMachineSize', this.newMachineProvider.sizes.model[0]);
                }

                // Projects Check
                if (this.newMachineProvider.projects) {
                    if (this.newMachineProvider.projects.model.length == 1) this.set('newMachineProject', this.newMachineProvider.projects.model[0]);
                }
            },

            //
            //  Observers
            //

            providerObserver: function() {
                Ember.run.once(this, '_selectUnique');
            }.observes('newMachineProvider', 'newMachineImage', 'newMachineSize', 'newMachineProject'),

            formObserver: function() {
                Ember.run.once(this, '_updateFormReady');
            }.observes('newMachineKey',
                       'newMachineName',
                       'newMachineSize',
                       'newMachineImage',
                       'newMachineScript',
                       'newMachineLocation',
                       'newMachineProvider')
        });
    }
);
