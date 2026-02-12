// ---------- CONFIG ----------
const PEER_CONFIG = {
    host: '0.peerjs.com',
    port: 443,
    secure: true,
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    }
};

// ---------- GLOBALS ----------
let peer = null;
let receiverPeerId = null;
let localStream = null;

// ---------- RECEIVER ----------
window.startReceiving = function() {
    const statusEl = document.getElementById('receiverPeerId');
    statusEl.innerHTML = '⏳ Connecting to PeerJS server...';
    
    peer = new Peer(PEER_CONFIG);
    
    peer.on('open', function(id) {
        receiverPeerId = id;
        statusEl.innerHTML = `<strong style="font-size:1.2em;">✅ Receiver ID: ${id}</strong>`;
        statusEl.style.background = '#e6f7e6';
        
        // Generate QR code using absolute base URL
        const baseUrl = window.location.href.split('?')[0];
        const qrUrl = baseUrl + '?receiver=' + id;
        console.log('📲 QR URL:', qrUrl); // CHECK THIS IN CONSOLE
        
        const qr = qrcode(0, 'M');
        qr.addData(qrUrl);
        qr.make();
        document.getElementById('qrContainer').innerHTML = qr.createImgTag(6);
        
        // Show hint
        document.getElementById('qrContainer').innerHTML += 
            '<p style="color:green;">⬅️ Scan this QR with your phone</p>';
    });

    peer.on('call', function(call) {
        call.answer();
        call.on('stream', function(remoteStream) {
            const video = document.getElementById('remoteVideo');
            video.srcObject = remoteStream;
            video.play();
            console.log('🎥 Received stream');
        });
        call.on('close', () => console.log('Call closed'));
    });

    peer.on('error', function(err) {
        statusEl.innerHTML = '❌ PeerJS error: ' + err.type;
        console.error(err);
    });
};

// ---------- SENDER ----------
window.startSending = function() {
    const remoteId = document.getElementById('receiverIdInput').value.trim();
    if (!remoteId) return alert('⚠️ Enter the Receiver ID first');
    console.log('📤 Calling peer:', remoteId);
    
    // Try screen capture
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
            .then(stream => initiateCall(remoteId, stream))
            .catch(err => {
                console.warn('Screen capture failed:', err);
                alert('Screen capture blocked or unavailable. Trying camera...');
                fallbackToCamera(remoteId);
            });
    } else {
        fallbackToCamera(remoteId);
    }
};

function fallbackToCamera(remoteId) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => initiateCall(remoteId, stream))
        .catch(err => alert('❌ Camera access denied: ' + err.message));
}

function initiateCall(remoteId, stream) {
    localStream = stream;
    
    const senderPeer = new Peer(PEER_CONFIG);
    senderPeer.on('open', () => {
        console.log('📞 Initiating call to', remoteId);
        const call = senderPeer.call(remoteId, stream);
        
        call.on('stream', remoteStream => {
            // Not used
        });
        
        call.on('close', () => {
            document.getElementById('mirrorStatus').innerText = '⏹️ Mirroring stopped';
            localStream.getTracks().forEach(t => t.stop());
        });
        
        document.getElementById('mirrorStatus').innerText = '🔴 Mirroring active...';
        document.getElementById('localVideo').srcObject = stream;
        document.getElementById('localVideo').style.display = 'block';
    });
    
    senderPeer.on('error', err => {
        if (err.type === 'peer-unavailable') {
            alert('❌ Receiver ID not found. Did the receiver click "Start Receiving"?');
        } else {
            alert('❌ Connection error: ' + err.type);
        }
        console.error(err);
    });
}

// ---------- UI AUTO-SWITCH (with debug) ----------
window.onload = function() {
    console.log('📄 Page loaded');
    const urlParams = new URLSearchParams(window.location.search);
    const receiverParam = urlParams.get('receiver');
    
    if (receiverParam) {
        console.log('✅ Found receiver param:', receiverParam);
        // Switch to sender UI
        document.getElementById('receiverView').style.display = 'none';
        document.getElementById('senderView').style.display = 'block';
        document.getElementById('receiverIdInput').value = receiverParam;
        document.getElementById('mirrorStatus').innerHTML = 
            '📲 Ready to mirror. Click "Start Mirroring".';
    } else {
        console.log('ℹ️ No receiver param – showing receiver UI');
        document.getElementById('receiverView').style.display = 'block';
        document.getElementById('senderView').style.display = 'none';
    }
};

// ---------- MANUAL SWITCH (use this if QR doesn't work) ----------
window.showSenderUI = function() {
    console.log('🔄 Manual switch to sender UI');
    document.getElementById('receiverView').style.display = 'none';
    document.getElementById('senderView').style.display = 'block';
};

// ---------- ADD A MANUAL BUTTON (TEMPORARY FIX) ----------
// This adds a small link at the bottom for easy switching
window.addManualButton = function() {
    const fallbackDiv = document.querySelector('.fallback');
    if (fallbackDiv) {
        const btn = document.createElement('button');
        btn.innerText = '📱 Switch to Sender (Phone) Mode';
        btn.onclick = window.showSenderUI;
        btn.style.background = '#555';
        fallbackDiv.appendChild(btn);
    }
};
window.onload = function() {
    // Keep original onload, then add button
    const urlParams = new URLSearchParams(window.location.search);
    const receiverParam = urlParams.get('receiver');
    
    if (receiverParam) {
        document.getElementById('receiverView').style.display = 'none';
        document.getElementById('senderView').style.display = 'block';
        document.getElementById('receiverIdInput').value = receiverParam;
        document.getElementById('mirrorStatus').innerHTML = '📲 Ready to mirror.';
    } else {
        document.getElementById('receiverView').style.display = 'block';
        document.getElementById('senderView').style.display = 'none';
    }
    window.addManualButton(); // always add manual switch
};