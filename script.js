// ---------- GLOBALS ----------
let peer = null;
let receiverPeerId = null;
let localStream = null;

// ---------- RECEIVER ----------
window.startReceiving = function() {
    // Create a Peer (random ID)
    peer = new Peer();
    
    peer.on('open', function(id) {
        receiverPeerId = id;
        document.getElementById('receiverPeerId').innerHTML = `
            <strong>Receiver ID:</strong> ${id}
        `;
        
        // Generate QR code for easy pairing
        const qr = qrcode(0, 'M');
        qr.addData(window.location.href + '?receiver=' + id);
        qr.make();
        document.getElementById('qrContainer').innerHTML = qr.createImgTag(6);
    });

    peer.on('call', function(call) {
        call.answer(); // Answer without sending any stream (we only receive)
        call.on('stream', function(remoteStream) {
            const video = document.getElementById('remoteVideo');
            video.srcObject = remoteStream;
            video.play();
        });
    });
};

// ---------- SENDER ----------
window.startSending = function() {
    const remoteId = document.getElementById('receiverIdInput').value.trim();
    if (!remoteId) return alert('Please enter Receiver ID');

    // Try screen capture first
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
            .then(function(stream) {
                localStream = stream;
                initiateCall(remoteId, stream);
            })
            .catch(function(err) {
                alert('Screen capture failed. Trying camera fallback...');
                fallbackToCamera(remoteId);
            });
    } else {
        fallbackToCamera(remoteId);
    }
};

function fallbackToCamera(remoteId) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(function(stream) {
            localStream = stream;
            initiateCall(remoteId, stream);
        })
        .catch(function(err) {
            alert('No media available. Cannot mirror.');
        });
}

function initiateCall(remoteId, stream) {
    // Create a new Peer for the sender
    const senderPeer = new Peer();
    senderPeer.on('open', function() {
        const call = senderPeer.call(remoteId, stream);
        call.on('stream', function(remoteStream) {
            // Not used, but required to keep the call alive
        });
        document.getElementById('mirrorStatus').innerText = '🔴 Mirroring active...';
        
        // Show local video (optional)
        const localVideo = document.getElementById('localVideo');
        localVideo.srcObject = stream;
        localVideo.style.display = 'block';
    });
}

// ---------- AUTO-SWITCH UI BASED ON URL PARAM ----------
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('receiver')) {
        // Phone opened the QR link – switch to sender mode and fill ID
        document.getElementById('receiverView').style.display = 'none';
        document.getElementById('senderView').style.display = 'block';
        document.getElementById('receiverIdInput').value = urlParams.get('receiver');
    } else {
        // Default: receiver view visible
        document.getElementById('receiverView').style.display = 'block';
        document.getElementById('senderView').style.display = 'none';
    }
};

// Manual switch (optional, can be triggered from console or add a button)
window.showSenderUI = function() {
    document.getElementById('receiverView').style.display = 'none';
    document.getElementById('senderView').style.display = 'block';
};
