const fs = require('fs');
const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const dayjs = require('dayjs');

// 所有用户列表
const userList = []
// 聊天记录
let recode = ''

io.on('connection', function (socket) {
	// 判断是否存在文件夹
	fs.exists('./images', (exists) => {
		if (!exists) {
			fs.mkdirSync("./images")
		}
	})

	fs.exists('./files', (exists) => {
		if (!exists) {
			fs.mkdirSync("./files")
		}
	})


	// 登陆
	socket.on('userLogin', () => {
		socket.emit('handleLogin')
	})

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
		// 聊天内容，创建写入文件，图片
		let time = dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss')
		if (msg.type == 'img') {
			recode = `时间: ${time}，\nuserId: ${msg.userId}，\n内容：['图片']\n\r`
			let base64Data = msg.content.replace(/^data:image\/\w+;base64,/, "");
			let decodeImg = Buffer.from(base64Data, 'base64')
			fs.writeFile(`./images/${msg.userId}_${Date.now()}.png`, decodeImg, err => {
				if (err) {
					throw '写入图片失败！'
				}
			});
		} else {
			recode = `时间: ${time}，\nuserId: ${msg.userId}，\n内容：${msg.content}\n\r`
		}
		// 追加文件内容
		fs.appendFile('./files/record.txt', recode, {}, err => {
			if (err) {
				throw '写入文件失败！'
			}
		})

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

	// 先删除文件夹下的所有文件，再删除文件夹
	fs.exists('./files', (exists) => {
		if (exists) {
			// console.log("文件目录存在")
			let fileList = fs.readdirSync('./files')
			if (fileList.length) {
				fileList.forEach(file => {
					fs.unlinkSync('./files/' + file);
				})
			} else {
				fs.rmdirSync('./files')
			}
		}
		if (!exists) {
			// console.log("文件目录不存在")
		}
	})

	fs.exists('./images', (exists) => {
		if (exists) {
			// console.log("图片目录存在")
			let imgList = fs.readdirSync('./images')
			if (imgList.length) {
				imgList.forEach(img => {
					fs.unlinkSync('./images/' + img)
				})
			} else {
				fs.rmdirSync('./images')
			}
		}
		if (!exists) {
			// console.log("图片目录不存在")
		}
	})
});
