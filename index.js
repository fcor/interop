"use strict";

const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const Bean = require('ble-bean')
let intervalId, connectedBean

const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;
const port = new SerialPort('/dev/ttyACM0');
const parser = new Readline();


app.get('/', function(req, res){
res.sendFile(__dirname + '/index.html')
})

io.on('connection', function(socket){
  console.log('User connected');
  // setTimeout(function() {
  //   io.emit('getLux', 'Works! 3 secs later')
  // } , 3000);

  port.pipe(parser);
  parser.on('data', function (data) {
    io.emit('getNum', data)
  });

  Bean.discover(function(bean){
    connectedBean = bean;
    process.on('SIGINT', exitHandler.bind(this));

    bean.on("serial", function(data, valid){
      const lux = parseInt(data.toString());
      io.emit('getLux', lux)
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
  console.log('listening on *:3000')
})
