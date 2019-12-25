var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

const userList = []

io.on('connection', function (socket) {
	// console.log('客户端已经连接了');
	socket.on('join', msg => {
		let result = userList.find(user => user.userId == msg.userId)
		if (result) {
			// console.log('该用户已登陆', JSON.stringify(userList))
			io.emit('mine-broadcast', {
				message: '该用户已登陆',
				info: msg
			})
		} else {
			// console.log('新用户', JSON.stringify(userList))
			userList.push({
				userId: msg.userId,
				avatar: msg.avatar,
				socketId: socket.id,
				latestNew: ''
			})
			io.emit('broadcastJoin', userList)
		}
	})
	socket.on('joinGroup', function (msg) {
		// socket.broadcast.emit('broadcast', msg);
		io.emit('broadcast', msg)
		if (userList.length) {
			let i = userList.findIndex(item => item.userId == msg.userId)
			if (i > -1) {
				if (msg.type == 'img') {
					userList[i]['latestNew'] = '[图片]'
				} else {
					userList[i]['latestNew'] = msg.content
				}
			}
		}
	});

	socket.on('disconnect', () => {
		//监听用户断开事件
		let idx = userList.findIndex(user => user.socketId == socket.id)
		if (idx > -1) {
			let result = userList.splice(idx, 1)
			io.emit('broadcastOut', result)
		}
	});

});

http.listen(3000, function () {
	console.log('服务器已启动，监听端口为3000');
});
