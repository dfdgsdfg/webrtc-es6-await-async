let localStream
let remoteStreams
let answer
let offer

const pcConfig = {'iceServers': [{'urls': ['stun:stun.services.mozilla.com']}, {'urls': ['stun:stun.l.google.com:19302']}]}
const localVideo = document.getElementById('localVideo')
const remoteVideo = document.getElementById('remoteVideo')
const constraints = { video: true, audio: true }
const pc = new RTCPeerConnection(pcConfig)
const sc = new WebSocket('ws://127.0.0.1:1234')

const l = (() => {
  return Function.prototype.bind.call(console.log, console)
})()

async function getMedia () {
  try {
    localStream = await navigator.mediaDevices.getUserMedia(constraints)
    l('got local stream from device', localStream)
    localVideo.srcObject = localStream
  } catch (err) {
    l('error', err)
  }
}

function addLocalStream () {
  // pc.addStream(localStream)
  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream)
  })
  l('added local stream to pc', pc.getLocalStreams())
}

async function startNegotiation () {
  l('event fired: onnegotiationneeded')
  try {
    offer = await pc.createOffer()
    l('created offer', offer)
    await pc.setLocalDescription(offer)
    l('setted local description from offer', pc.localDescription)
    sc.send(JSON.stringify({sdp: pc.localDescription}))
  } catch (err) {
    l(err)
  }
}

function sendLocalCandidate ({candidate}) {
  l('event fired: onicecandidate', {candidate})
  sc.send(JSON.stringify({candidate}))
}

function bindRemoteStreams (ev) {
  l('event fired: ontrack')
  remoteStreams = ev.streams
  remoteVideo.srcObject = remoteStreams[0]
  l('setted remote stream to video', pc.getRemoteStreams())
}

async function handleServerMessage (msg) {
  const signal = JSON.parse(msg.data)
  const sdp = signal.sdp
  const candidate = signal.candidate

  try {
    if (sdp) {
      l(`event fired: got ${sdp.type} from server`, sdp)
      await pc.setRemoteDescription(sdp)
      l('setted remote description', pc.remoteDescription)
      if (pc.signalingState !== 'stable') {
        answer = await pc.createAnswer()
        l('created answer', answer)
        await pc.setLocalDescription(answer)
        l('setted local description form answer', pc.localDescription)
        sc.send(JSON.stringify({sdp: pc.localDescription}))
      }
    } else if (candidate) {
      l('event fired: got candidate from server', candidate)
      await pc.addIceCandidate(candidate)
      l('added candidate to pc')
    }
  } catch (err) {
    l('error', err)
  }
}

document.addEventListener('DOMContentLoaded', getMedia)
document.getElementById('start').addEventListener('click', addLocalStream)

pc.onnegotiationneeded = startNegotiation
pc.ontrack = bindRemoteStreams
pc.onicecandidate = sendLocalCandidate
sc.onmessage = handleServerMessage
