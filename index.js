const { spawn } = require('child_process');

var Accessory, Service, Characteristic, UUIDGen;

module.exports = function(homebridge) {
  // Accessory must be created from PlatformAccessory Constructor
  Accessory = homebridge.platformAccessory;

  // Service and Characteristic are from hap-nodejs
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  
  // For platform plugin to be considered as dynamic platform plugin,
  // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
  homebridge.registerPlatform("homebridge-rtl_433", "rtl_433", RTL433Platform, true);
}

// Platform constructor
// config may be null
// api may be null if launched from old homebridge version
function RTL433Platform(log, config, api) {
  log("RTL433Platform Init");
  var platform = this;
  this.log = log;
  this.config = config;
  this.accessories = [];
  
  this.protocols = [ 73 ];
  this.device = config['device'] || "RTL2838";
  
  if (typeof(config.protocols) !== "undefined" && config.protocols !== null) {
    this.protocols = config.protocols;
  }
  
  this.cmdFlags = ['-F', 'json', '-d', this.device];
  this.protocols.forEach(function(protocol) {
    Array.prototype.push.apply(this.cmdFlags, '-R');
    Array.prototype.push.apply(this.cmdFlags, protocol);
    //this.cmdFlags.pushValues('-R');
    //this.cmdFlags.pushValues(protocol);
  });
  
  if (typeof(config.aliases) !== "undefined" && config.aliases !== null) {
    this.aliases = config.aliases;
  }
  log("Waiting for Launch...");
  if (api) {
      this.api = api;
      this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
  }
}

// Function invoked when homebridge tries to restore cached accessory.
// Developer can configure accessory at here (like setup event handler).
// Update current value.
RTL433Platform.prototype.configureAccessory = function(accessory) {
  this.log(accessory.displayName, "Configure Accessory");
  var platform = this;

  // Set the accessory to reachable if plugin can currently process the accessory,
  // otherwise set to false and update the reachability later by invoking 
  // accessory.updateReachability()
  accessory.reachable = false;
  
  accessory.on('identify', function(paired, callback) {
    platform.log(accessory.displayName, "Identify!!!");
    callback();
  });

  //if (accessory.getService(Service.TemperatureSensor)) {
  //  accessory.log = this.log;
  //}

  //if (accessory.getService(Service.HumiditySensor)) {
  //  accessory.log = this.log;
  //}
  accessory.log = this.log;
  
  var name = accessory.context.name;
  this.accessories[name] = accessory;
}

// Handler will be invoked when user try to config your plugin.
// Callback can be cached and invoke when necessary.
RTL433Platform.prototype.configurationRequestHandler = function(context, request, callback) {
  this.log("configurationRequestHandler");
}

RTL433Platform.prototype.didFinishLaunching = function() {
  log("RTL_433 Ready to Go...");
  var self = this;
  this.receiveBuffer = [];
  this.startAndListen();
}

RTL433Platform.prototype.startAndListen = function() {
  this.log("Starting RTL_433 Process...");
  this.child = spawn('rtl_433', this.cmdFlags);
  this.child.stdout.on('data', this.receivedData.bind(this));
}

RTL433Platform.prototype.receivedData = function(data) {
  this.log("Data! ", data);
  try{
    Array.prototype.push.apply(this.receivedData, data);
    var received = JSON.parse(data);
    var name = received.id + "_" + received.model.replace(' ', '_');
    this.log("Got name: ", name);
  }
  catch(err) {
    //eat the error for now
  }
}

RTL433Platform.prototype.addThermoAccessory = function(thermoData) {
  this.log("Add Thermo Accessory");
  var platform = this;
  var uuid;
  var accessoryName = thermo.sensor_name;

  uuid = UUIDGen.generate(accessoryName);

  if(!this.accessories[accessoryName])
  {
    var displayName = this.aliases[accessoryName];
    if (typeof(displayName) == "undefined") {
      displayName = accessoryName;
    }
    var accessory = new Accessory(accessoryName, uuid, 10);

    this.log("Adding Thermo Device:", accessoryName, displayName);
    accessory.reachable = true;
    accessory.context.model = "RTL433 Thermo";
    accessory.context.name = accessoryName;
    accessory.context.displayName = displayName;

    accessory.addService(Service.TemperatureSensor, displayName)
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: -100,
        maxValue: 100
      });
    
    accessory.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, "RTL433")
      .setCharacteristic(Characteristic.Model, "RTL433 Thermo")
      .setCharacteristic(Characteristic.SerialNumber, "rtl." + accessoryName)
      .setCharacteristic(Characteristic.FirmwareRevision, require('./package.json').version);
    
    accessory.on('identify', function(paired, callback) {
      platform.log(accessory.displayName, "Identify!!!");
      callback();
    });
    
    accessory.log = this.log;
    this.accessories[accessoryName] = accessory;
    this.api.registerPlatformAccessories("homebridge-rtl_433", "rtl_433", [accessory]);
  }
  else {
    this.log("Skipping %s", accessoryName);
    //accessory = this.accessories[name];

    // Fix for devices moving on the network
    //if (accessory.context.url != url) {
    //  debug("URL Changed", name);
    //  accessory.context.url = url;
    //} else {
    //  debug("URL Same", name);
    //}
    ////        accessory.updateReachability(true);
  }
}

function roundInt(string) {
  return Math.round(parseFloat(string) * 10) / 10;
}
