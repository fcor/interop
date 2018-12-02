"use strict";

const express = require('express');
const app = express();
const http = require('http').Server(app)
const io = require('socket.io')(http)
const Bean = require('ble-bean')
let intervalId, connectedBean

const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;
const port = new SerialPort('/dev/ttyACM0');
const parser = new Readline();

const Particle = require('particle-api-js')
const particle = new Particle()
const token = '86d6bf630f3a67efdd35ea2a6c1a5903fbc10898'
const deviceID = '450028000851363136363935'


app.get('/', function(req, res){
res.sendFile(__dirname + '/index.html')
})

app.use(express.static('public'));

io.on('connection', function(socket){
  console.log('User connected');
  // setTimeout(function() {
  //   io.emit('getLux', 'Works! 3 secs later')
  // } , 3000);

  async function fetchFromParticle (variable){
    const response = await particle.getVariable({ deviceId: deviceID, name: variable, auth: token })
    return response.body.result
  }
  
  async function getData(){
    try {
      const sensor = await fetchFromParticle(`sensor`)
      const rssi = await fetchFromParticle(`rss1`)
    
      console.log(sensor)
      console.log(rssi)
    } catch (error) {
      console.log('There was an error')
    }
  }
  
  setInterval(getData, 3000)

  port.pipe(parser);
  parser.on('data', function (data) {
    const res = data.split(" ")
    const temp = res[1]
    const rssi = res[3]
    // console.log(temp)
    // console.log(rssi)
    io.emit('getNum', temp)
  });

  Bean.discover(function(bean){
    connectedBean = bean;
    process.on('SIGINT', exitHandler.bind(this));

    bean.on("serial", function(data, valid){
      const lux = parseInt(data.toString());
      const timeStamp = new Date()
      const ms = timeStamp.getTime()
      io.emit('getLux', lux, ms)
    });


    bean.on("disconnect", function(){
      process.exit();
    });

    bean.connectAndSetup(function(){
      //Here goes data send over scratch caracteristic
    });

  });

  process.stdin.resume();//so the program will not close instantly
  var triedToExit = false;

  //turns off led before disconnecting
  var exitHandler = function exitHandler() {

    var self = this;
    if (connectedBean && !triedToExit) {
      triedToExit = true;
      console.log('Turning off led...');
      clearInterval(intervalId);
      connectedBean.setColor(new Buffer([0x0,0x0,0x0]), function(){});
      //no way to know if succesful but often behind other commands going out, so just wait 2 seconds
      console.log('Disconnecting from Device...');
      setTimeout(connectedBean.disconnect.bind(connectedBean, function(){}), 2000);
    } else {
      process.exit();
    }
  };

})



http.listen(80, function(){
  console.log('listening on *:80')
})
