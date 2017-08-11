const server = require('http').createServer()
const WebSocketServer = require('ws').Server
const wss = new WebSocketServer({ server: server })
const express = require('express')
const app = express()
const port = 1234

// static express server
app.use(express.static('.'))
server.on('request', app)
server.listen(port, function () { console.log('Listening on ' + server.address().port) })

// listen socket and broadcast msg to other
wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    console.log('received: %s', msg)
    wss.clients.forEach((other) => {
      if (other === ws) return
      other.send(msg)
    })
  })
})
