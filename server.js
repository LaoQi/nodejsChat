var WebSocketServer = require('websocket').server;
var http = require('http');


var connects = [];
var count = 0;

var logic = {
    broadcast : function (msg) {
        for( c in connects ) {
            connects[c].send(msg);
        }
    },
    send : function (tar, msg) {
        for (c in connects) {
            if (connects[c].id == tar) {
                connects[c].send(msg);
            }
        }
    },
    received : function (msg) {
        if (msg["t"]) {
            if (msg["t"] == "all") {
                this.broadcast(this.msgToStr(msg));
            }
            else if (msg["t"]) {
                this.send(msg["t"], this.msgToStr(msg));
            }
        }
    },
    accept : function (conn, id) {
        var msg = '{"type" : "init" ,"t":' + id + ', "content" : "welcome !", "s" : "sys"}';
        conn.send(msg);
        var bmsg = '{"type" : "new","t":"all", "content":"' + id + '", "s" : "sys"}';
        this.broadcast(bmsg);
    },
    leave : function (id) {
        var msg = '{"type": "left","t":"all", "content":"' + id + '", "s" : "sys"}';
        this.broadcast(msg);
    },
    msgToStr : function (obj) {
        var tar = obj["t"] == "all" ? '"all"' : obj["t"];
        var src;
        if (obj["s"] == "sys") {
            src = '"sys"';
        } else {
            src = obj["s"];
        }
        var json = '{"type":"msg" ,"t": ' + tar + ' , "content":"' + obj["content"] + '", "s":' + src + '}';
        return json;
    }
};

var server = http.createServer(function(request, response) {
    // process HTTP request. Since we're writing just WebSockets server
    // we don't have to implement anything.
    response.writeHead(200, { 'Content-Type': 'text-plain' });
    response.end(require('fs').readFileSync(__dirname + '/client.html'));
});
server.listen(1337, function() {
	console.log((new Date()) + ' Server is listening on port 1337');
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log(' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    count++;
    var connection = request.accept('echo-protocol', request.origin);
    connection.id = count;
    connects.push(connection);
    logic.accept(connection, count);

    console.log(count + ' Connection accepted.');
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            // console.log('Received Message: ' + message.utf8Data);
            // connection.sendUTF(message.utf8Data);
            var json = JSON.parse(message.utf8Data);
            logic.received(json);
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function(reasonCode, description) {
        logic.leave(connection.id);
        console.log(connection.id + ' Peer ' + connection.remoteAddress + ' disconnected.');
        console.log(connects.length);
        for (c in connects) {
            if (connection == connects[c]) {
                connects.splice(c, 1);
            }
        }
        console.log(connects.length);
    });
});