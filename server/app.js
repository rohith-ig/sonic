const express = require('express');
const cors = require('cors');
const http = require('http');
const nanoid = require('nanoid');
const app = express();
app.use(cors());

const map = new Map;

const server = http.createServer(app);
server.listen(8080, () => {
    console.log("Listening on 8000");
});

const io = require('socket.io')(server, {
  cors: {
    origin: '*'
  }
});

io.on('connection',(socket) => {
    socket.shortId = nanoid.nanoid(5);
    map.set(socket.shortId,socket.id);
    socket.emit("id",{"shortId":socket.shortId});
    socket.on('offer',(payload) => {
        console.log("currid",socket.shortId);
        console.log("sending to",payload.id);
        io.to(map.get(payload.id)).emit('send',{"message":payload.message,"offer":payload.offer,"id":socket.shortId});
    })
    socket.on('ice-candidate',(payload) => {
        console.log("recieved in server to",payload.target);
        console.log(map);
        io.to(map.get(payload.target)).emit("ice-candidate",{candidate : payload.candidate})
    })
    socket.on('disconnect', () => {
        console.log("disconnected",socket.shortId);
        map.delete(socket.shortId);
    })
    socket.on('answer', (payload) => {
        console.log("ans",payload.answer);
        io.to(map.get(payload.target)).emit("answer",{"answer":payload.answer});
    });
    socket.on('verify',(payload) => {
        const find = map.get(payload.target);
        console.log("targ",payload.target);
        if (find) io.to(socket.id).emit("verify",{done:true,target:payload.target});
        else io.to(socket.id).emit("verify",{done:false,target:payload.target});
    })
    socket.emit('message',`Connected ${io.engine.clientsCount}`)
    console.log(socket.id)
})


