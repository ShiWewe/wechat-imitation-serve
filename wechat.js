const fs = require('fs');
const path = require('path');
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

	// console.log('客户端已经连接了');
	socket.on('join', msg => {
		let result = userList.find(user => user.username == msg.username)
		if (result) {
			// console.log('该用户已登陆', JSON.stringify(userList))
			// 给指定的客户端发消息（socket.id）
			io.to(socket.id).emit('mine-broadcast', {
				message: '该用户已登陆',
				info: msg
			});
		} else {
			// console.log('新用户', JSON.stringify(userList))
			userList.push({
				userId: msg.userId,
				username: msg.username,
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
			recode = `时间: ${time}，\nusername: ${msg.username}，\n内容：['图片']\n\r`
			let base64Data = msg.content.replace(/^data:image\/\w+;base64,/, "");
			let decodeImg = Buffer.from(base64Data, 'base64')
			fs.writeFile(`./images/${msg.userId}_${Date.now()}.png`, decodeImg, err => {
				if (err) {
					throw '写入图片失败！'
				}
			});
		} else if (msg.type.indexOf('file') > -1) {
			let result = Buffer.from(msg.content, 'utf8')
			let idx = msg.type.indexOf(',') + 1
			let name = msg.type.slice(idx)
			fs.writeFile(`./files/${name}`, result, err => {
				if (err) {
					throw '写入文件失败！'
				}
			});
			recode = `时间: ${time}，\nusername: ${msg.username}，\n内容：['文件']\n\r`
		} else {
			recode = `时间: ${time}，\nusername: ${msg.username}，\n内容：${msg.content}\n\r`
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
				} else if (msg.type.indexOf('file') > -1) {
					userList[i]['latestNew'] = '[文件]'
				} else {
					userList[i]['latestNew'] = msg.content
				}
			}
		}
	});

	// 监听用户断开事件
	socket.on('disconnect', () => {
		let idx = userList.findIndex(user => user.socketId == socket.id)
		if (idx > -1) {
			let result = userList.splice(idx, 1)
			io.emit('broadcastOut', result)
		}
	});

});

app.get('/download', function (req, res) {
	let name = req.query.name;
	let i = name.lastIndexOf('_') + 1
	let fileName = name.slice(i)
	let idx = name.lastIndexOf('.')
	let exe = name.slice(idx)
	// 只能英文？
	let newName = 'test' + exe
	let paths = './files/' + name;
	let p = path.join(__dirname, paths);
	let size = fs.statSync(p).size;
	let f = fs.createReadStream(p);
	res.writeHead(200, {
		'Content-Type': 'application/force-download',
		'Content-Disposition': 'attachment; filename=' + newName,
		'Content-Length': size
	});
	f.pipe(res);
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
