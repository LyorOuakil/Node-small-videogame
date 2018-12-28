var express = require('express');
var app = express();
var serv = require('http').Server(app);
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

serv.listen(2000);
console.log('Server started');

/* List of socket. Every time the client connect to the server*/
var SOCKET_LIST = {};

var Entity = function () {
    var self = {
        x: 250,
        y: 250,
        spdX: 0,
        spdY: 0,
        id: "",
    }
    self.update = function () {
        self.updatePostion();
    }
    self.updatePostion = function () {
        self.x += self.spdX;
        self.y += self.spdY;
    }
    return self;
};


var Player = function (id) { // Player attribute
    var self = Entity();
    self.id = id;
    self.number = "" + Math.floor(10 * Math.random());
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.maxSpd = 10;

    var super_update = self.update;
    self.update = function () {
        self.updateSpd();
        super_update();
    }

    self.updateSpd = function () {
        if (self.pressingRight)
            self.spdX = self.maxSpd;
        else if (self.pressingLeft)
            self.spdX = -self.maxSpd;
        else
            self.spdX = 0;

        if (self.pressingUp)
            self.spdY = -self.maxSpd;
        else if (self.pressingDown)
            self.spdY = self.maxSpd;
        else
            self.spdY = 0;
    }
    Player.list[id] = self;
    return self;
}
Player.list = {};
Player.onConnect = function (socket) {
    var player = Player(socket.id);
    socket.on('keyPress', function (data) {  //Server Make event on the client keypress event
        if (data.inputId === 'left')
            player.pressingLeft = data.state;
        else if (data.inputId === 'right')
            player.pressingRight = data.state;
        else if (data.inputId === 'up')
            player.pressingUp = data.state;
        else if (data.inputId === 'down')
            player.pressingDown = data.state;
    });
}

Player.onDisconnect = function (socket) {
    delete Player.list[socket.id];
}

Player.update = function () {
    var pack = [];
    for (var i in Player.list) {
        var player = Player.list[i];
        player.update(); // Update position according to keyboard press;
        pack.push({
            x: player.x,
            y: player.y,
            number: player.number,
        });
    }
    return pack;
}


var Bullet = function(angle){ // Add bullet to the game with position
    var self = Entity();
    self.id = Math.random();
    self.spdX = Math.cos(angle/180*Math.PI) * 10;
    self.spdY = Math.sin(angle/180*Math.PI) * 10;

    self.timer = 0;
    self.toRemove = false;
    var super_update = self.update;
    self.update = function(){
        if(self.timer++ > 100)
            self.toRemove = true;
        super_update();
    }
    Bullet.list[self.id] = self;
    return self;
} 

Bullet.list = {};

Bullet.update = function () {
    if(Math.random() < 0.1){
        Bullet(Math.random()*360);  
    }

    var pack = [];
    for (var i in Bullet.list) {
        var bullet = Bullet.list[i];
        bullet.update(); // Update position according to keyboard press;
        pack.push({
            x: bullet.x,
            y: bullet.y,
        });
    }
    return pack;
}

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function (socket) {
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    Player.onConnect(socket);
 
    socket.on('disconnect', function () { // delete user when disconnet
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);
    });
    console.log('socket connection');
});

setInterval(function () {
    var pack = {
        player:Player.update(),
        bullet:Bullet.update(),
    }

    for (var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions', pack);
    }
}, 1000/25);