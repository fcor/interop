const app = require('express')()
const http = require('http').Server(app)
var io = require('socket.io')(http)

app.get('/', function(req, res){
res.sendFile(__dirname + '/index.html')
})

io.on('connection', function(socket){
  socket.on('numClick', function(msg){
    console.log('message: ' + msg)
  })
  setTimeout(function() {
    io.emit('getLux', 'Works! 3 secs later')
  } , 3000);
})

http.listen(3000, function(){
  console.log('listening on *:3000')
})
