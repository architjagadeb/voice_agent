// Voice Agent Interface JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const textInput = document.getElementById('text-input');
    const generateBtn = document.getElementById('generate-btn');
    const audioSection = document.getElementById('audio-section');
    const audioPlayer = document.getElementById('audio-player');
    const voiceSelect = document.getElementById('voice-select');

    // Generate button click handler
    generateBtn.addEventListener('click', async function() {
        const text = textInput.value.trim();
        
        if (!text) {
            showNotification('Please enter some text to generate audio.', 'warning');
            return;
        }

        // Show loading state
        generateBtn.classList.add('loading');
        generateBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Generating...</span>';

        try {
            // Get selected voice and style
            const selectedOption = voiceSelect.options[voiceSelect.selectedIndex];
            const voiceId = selectedOption.value;
            const style = selectedOption.getAttribute('data-style');
            
            console.log('Sending request with:', { text, voiceId, style });
            
            // Call API with voice parameters
            await generateAudio(text, voiceId, style);
            
            // Show success state
            showNotification('Audio generated successfully!', 'success');
            
            // Show audio section with animation
            audioSection.style.display = 'block';
            setTimeout(() => {
                audioSection.classList.add('show');
            }, 10);

        } catch (error) {
            console.error('Error generating audio:', error);
            let errorMessage = 'Failed to generate audio. Please try again.';
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                errorMessage = 'Network error: Unable to connect to server. Please check if the backend is running on localhost:5000';
            } else if (error.message.includes('CORS')) {
                errorMessage = 'CORS error: Backend needs CORS configuration';
            }
            
            showNotification(errorMessage, 'error');
        } finally {
            // Reset button state
            generateBtn.classList.remove('loading');
            generateBtn.innerHTML = '<span class="btn-icon">🎵</span><span class="btn-text">Generate & Play</span>';
        }
    });

    async function generateAudio(text, voiceId, style) {
        // Prepare request body matching Murf API format
        const requestBody = {
            text: text,
            voice_id: voiceId
        };
        
        // Add style if specified
        if (style) {
            requestBody.style = style;
        }
        
        console.log('Request body:', requestBody);
        console.log('Making request to: http://localhost:5000/tts');
        
        try {
            const response = await fetch('http://localhost:5000/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error response:', errorText);
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Response data:', data);
            
            if (data.audio_url) {
                const audioPlayer = document.getElementById('audio-player');
                audioPlayer.src = data.audio_url;
                audioPlayer.load();
                audioPlayer.play();
            } else {
                throw new Error(data.error || 'No audio URL received');
            }
            
        } catch (fetchError) {
            console.error('Fetch error details:', {
                name: fetchError.name,
                message: fetchError.message,
                stack: fetchError.stack
            });
            
            // Check if it's a network error
            if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
                console.error('Network error detected. Possible causes:');
                console.error('1. Backend server not running');
                console.error('2. Wrong URL (should be http://localhost:5000/tts)');
                console.error('3. CORS issues');
                console.error('4. Network connectivity problems');
            }
            
            throw fetchError;
        }
    }

    // Simple notification system
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Add some interactive effects
    textInput.addEventListener('input', function() {
        if (this.value.trim()) {
            generateBtn.style.opacity = '1';
        } else {
            generateBtn.style.opacity = '0.7';
        }
    });

    // Add keyboard shortcut (Ctrl+Enter to generate)
    textInput.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            generateBtn.click();
        }
    });

    // Voice selection change handler
    voiceSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const voiceName = selectedOption.textContent;
        
        // Show a subtle notification about voice change
        showNotification(`Voice changed to: ${voiceName}`, 'info');
    });

    // Initialize button state
    generateBtn.style.opacity = '0.7';
    
    // Test server connectivity on page load
    console.log('Testing server connectivity...');
    fetch('http://localhost:5000/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test', voice_id: 'en-US-natalie' })
    }).then(response => {
        console.log('Server is reachable, status:', response.status);
    }).catch(error => {
        console.error('Server connectivity test failed:', error);
        showNotification('Warning: Backend server may not be running on localhost:5000', 'warning');
    });

    // Echo Bot functionality
    const startRecordingBtn = document.getElementById('start-recording-btn');
    const stopRecordingBtn = document.getElementById('stop-recording-btn');
    const echoAudioContainer = document.getElementById('echo-audio-container');
    const echoAudioPlayer = document.getElementById('echo-audio-player');
    
    let mediaRecorder = null;
    let audioChunks = [];
    let audioStream = null;

    // Check if MediaRecorder is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification('MediaRecorder API is not supported in this browser', 'error');
        startRecordingBtn.disabled = true;
        stopRecordingBtn.disabled = true;
    }

    // Start recording function
    startRecordingBtn.addEventListener('click', async function() {
        try {
            // Request microphone access
            audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });

            // Initialize MediaRecorder
            mediaRecorder = new MediaRecorder(audioStream);
            audioChunks = [];

            // Set up event listeners
            mediaRecorder.ondataavailable = function(event) {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = function() {
                // Create audio blob and URL
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                
                // Set audio source and play
                echoAudioPlayer.src = audioUrl;
                echoAudioPlayer.load();
                
                // Show audio container with animation
                echoAudioContainer.style.display = 'block';
                setTimeout(() => {
                    echoAudioContainer.classList.add('show');
                }, 10);
                
                // Auto-play the recorded audio
                echoAudioPlayer.play().catch(error => {
                    console.log('Auto-play prevented by browser:', error);
                    showNotification('Click play to hear your recording', 'info');
                });

                showNotification('Recording completed! Playing back your voice...', 'success');
            };

            // Start recording
            mediaRecorder.start();
            
            // Update UI
            startRecordingBtn.classList.add('recording');
            startRecordingBtn.disabled = true;
            stopRecordingBtn.disabled = false;
            
            showNotification('Recording started... Speak now!', 'info');

        } catch (error) {
            console.error('Error starting recording:', error);
            
            if (error.name === 'NotAllowedError') {
                showNotification('Microphone access denied. Please allow microphone access and try again.', 'error');
            } else if (error.name === 'NotFoundError') {
                showNotification('No microphone found. Please connect a microphone and try again.', 'error');
            } else {
                showNotification('Failed to start recording: ' + error.message, 'error');
            }
        }
    });

    // Stop recording function
    stopRecordingBtn.addEventListener('click', function() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            
            // Stop all tracks in the stream
            if (audioStream) {
                audioStream.getTracks().forEach(track => track.stop());
            }
            
            // Update UI
            startRecordingBtn.classList.remove('recording');
            startRecordingBtn.disabled = false;
            stopRecordingBtn.disabled = true;
            
            showNotification('Stopping recording...', 'info');
        }
    });

    // Clean up audio URL when audio is loaded
    echoAudioPlayer.addEventListener('loadeddata', function() {
        // Clean up previous blob URL to prevent memory leaks
        const currentSrc = echoAudioPlayer.src;
        if (currentSrc.startsWith('blob:')) {
            setTimeout(() => {
                URL.revokeObjectURL(currentSrc);
            }, 1000);
        }
    });

    // Handle audio play errors
    echoAudioPlayer.addEventListener('error', function() {
        showNotification('Error playing recorded audio', 'error');
    });

    // Add keyboard shortcuts for recording
    document.addEventListener('keydown', function(e) {
        // Ctrl+Shift+R to start recording
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            if (!startRecordingBtn.disabled) {
                startRecordingBtn.click();
            }
        }
        // Ctrl+Shift+S to stop recording
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            if (!stopRecordingBtn.disabled) {
                stopRecordingBtn.click();
            }
        }
    });
});