var express = require('express');
var app = express();
var serv = require('http').Server(app);
app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

serv.listen(2000);
console.log('Server started');

/* List of socket. Every time the client connect to the server*/ 
var SOCKET_LIST = {}; 
var PLAYER_LIST = {};

var Player = function(id){ // Player attribute
    var self = {
        x:250,
        y:250,
        id:id,
        number:"" + Math.floor(10 * Math.random()),
        pressingRight:false,
        pressingLeft:false,
        pressingUp:false,
        pressingDown:false,
        maxSpd:10,
    }
    self.updatePostion = function(){ // Update postion according to maxSPD variable with client keypress event
        if(self.pressingRight)
            self.x += self.maxSpd;
        if(self.pressingLeft)
            self.x -= self.maxSpd;
        if(self.pressingUp)
            self.y -= self.maxSpd;
        if(self.pressingDown)
            self.y += self.maxSpd;
    }
    return self;
}

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
    
    var player = Player(socket.id);
    PLAYER_LIST[socket.id] = player;

    socket.on('disconnect', function(){ // delete user when disconnet
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
    });

    socket.on('keyPress', function(data){  //Server Make event on the client keypress event
        if(data.inputId === 'left')
            player.pressingLeft = data.state;
        else if(data.inputId === 'right')
            player.pressingRight = data.state;
        else if(data.inputId === 'up')
            player.pressingUp = data.state;
        else if (data.inputId === 'down')
            player.pressingDown = data.state;
    });

    console.log('socket connection');
});

setInterval(function() {
    var pack = [];
    for(var i in PLAYER_LIST){
        var player = PLAYER_LIST[i];
        player.updatePostion(); // Update position according to keyboard press;
        pack.push({
            x:player.x,
            y:player.y, 
            number:player.number,
        });
    }
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions', pack);
    }
}, 1000/25);