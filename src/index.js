const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000

const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

io.on('connection',(socket)=>{

    socket.on('join', (options, callback)=>{
        const { error, user } = addUser({ id: socket.id, ...options })   //...options Spreading operator is used

        if(error){
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin-Prahlad', 'Welcome!'))
        // Broadcasting a message to a room except entered user
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin-Prahlad', `${user.username} has joined this Room!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        
        callback()
        //socket.emit, io.emit, socket.broadcast.emit
        //io.to.emit socket.broadcast.to.emit
    })

    socket.on('sendMessage', (message, callback)=>{
        const filter = new Filter()

        const user = getUser(socket.id)

        if(filter.isProfane(message)){
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message))
        //Acknowledgement Callback section
        callback()
    })

    socket.on('sendLocation', (coords, callback)=>{
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        //Acknowledgement Callback section
        callback()
    })

    socket.on('disconnect', ()=>{
        const user = removeUser(socket.id)

        if(user){
            io.to(user.room).emit('message', generateMessage('Admin-Prahlad', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, ()=>{
    console.log("Server is up on port :"+port)
})