/* jshint node:true */
"use strict";

// modules
var io = require("sandbox-io");

var Room = require("./room");
// TODO: rename to Player
var Point = require("./point");
var Target = require("./target");

// constants
// TODO: should be Player.SIZE resp. Target.SIZE
var POINT_SIZE = 0.025;
var TARGET_RADIUS = 0.05;

// variables
// TODO: should be object {"roomid": room}
var rooms = [];

// socket.io
io.on("connection", function(socket) {
	// lobby
	socket.on("requestCurrentRooms", function() {
		socket.emit("currentRooms", rooms.map(function(room) {
			return room.info();
		}));
	});

	// TODO: rename to requestNewRoom
	socket.on("newRoom", function() {
		var room = new Room();
		room.fill();
		rooms.push(room);
		// TODO: rename accordingly to TODO above
		socket.emit("room", room.info());
	});

	// TODO: rename client to player
	// client
	// TODO: rename "client" to "playerConnect"
	// TODO: rename id to roomId
	socket.on("client", function(id) {
		// var room = rooms[id];
		var room = null;
		for (var i = 0; i < rooms.length; i++) {
			if (rooms[i].id === id) {
				room = rooms[i];
				break;
			}
		}

		if (room === null) {
			socket.emit("noSuchRoom");
			return;
		}

		// TODO: 4 should be const
		if (room.numberOfPlayers() >= 4) {
			socket.emit("roomFull");
			return;
		}

		var point = new Point();
		room.addPoint(point);

		// TODO: rename "move" ("playerMove"/"playerMoved"/"newPlayerMove"?)
		// TODO: rename x, y to diffX, diffY
		socket.on("move", function(x, y) {
			x = point.x - x;
			y = point.y - y;

			// restrict players to game field bounds
			point.x = Math.min(Math.max(0, x), 1 - POINT_SIZE);
			point.y = Math.min(Math.max(0, y), 1 - POINT_SIZE);
		});

		// TODO: "fire" -> "playerFired"
		socket.on("fire", function(id) {
			var point = room.points[id];
			var x = point.x + POINT_SIZE / 2;
			var y = point.y + POINT_SIZE / 2;
			// TODO: "fired" -> "playerFired"
			room.emitToHosts("fired", {
				x: x,
				y: y,
				point: point
			});
			room.targets.forEach(function(target) {
				if (TARGET_RADIUS + Math.sqrt(2 * Math.pow(POINT_SIZE / 2, 2)) > Math.max(Math.abs(x - target.x), Math.abs(y - target.y))) {
					point.score++;
					if (point.score >= 10) {
						room.updateHosts();
						// TODO: "winner" -> "gameWon"
						room.emitToHosts("winner", point);
						room.stop();
					}
					// TODO: room.removeTarget(target);
					room.targets.splice(room.targets.indexOf(target), 1);
					// TODO: room.newTarget();
					setTimeout(Target.new.bind(Target, room), 2000);
				}
			});
		});
		socket.on("disconnect", function() {
			room.removePoint(point);
		});
		// TODO: "clientPoint" -> "playerInfo"
		socket.emit("clientPoint", point);
	});

	// host
	// TODO: id -> roomId
	socket.on("host", function(id) {
		var room = null;
		for (var i = 0; i < rooms.length; i++) {
			if (rooms[i].id === id) {
				room = rooms[i];
				break;
			}
		}

		// TODO: if (room === undefined) return;
		if (room !== null) {
			// TODO: "sizes" -> "objectSizes"
			socket.emit("sizes", {
				pointSize: POINT_SIZE,
				targetRadius: TARGET_RADIUS
			});
			room.hosts.push(socket);
		}

		// TODO: "reset" -> "requestReset"
		socket.on("reset", function() {
			room.reset();
		});

		socket.on("disconnect", function() {
			// TODO: room.removeHost(socket);
			room.hosts.splice(room.hosts.indexOf(socket), 1);
			if (room.hosts.length === 0) {
				setTimeout(function() {
					var index = rooms.indexOf(room);
					if (room.hosts.length === 0 && index >= 0) {
						room.stop();
						rooms.splice(index, 1);
					}
				}, 2000);
			}
		});
	});
});
