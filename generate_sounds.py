import wave
import math
import struct
import random
import os

# Ensure directory exists
os.makedirs("assets/sounds", exist_ok=True)

def write_wav(filename, duration, frequency, vol=0.5, type="sine"):
    sample_rate = 44100
    num_samples = int(sample_rate * duration)
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            t = i / sample_rate
            value = 0
            if type == "sine":
                # Sine wave
                value = int(vol * 32767.0 * math.sin(2.0 * math.pi * frequency * t))
            elif type == "noise":
                # White noise for dragging
                value = int(vol * 32767.0 * (random.random() * 2 - 1))
            elif type == "pop":
                # Pitch decay for a pop sound
                freq = frequency * (1 - (i / num_samples))
                value = int(vol * 32767.0 * math.sin(2.0 * math.pi * freq * t))
            
            # Clamp value
            value = max(-32768, min(32767, value))
            wav_file.writeframes(struct.pack('<h', value))

print("Generating sounds...")

# Pick: Short high pop
write_wav("assets/sounds/pick.wav", 0.08, 600, 0.6, "pop")

# Drop: Lower thud
write_wav("assets/sounds/drop.wav", 0.1, 300, 0.6, "pop")

# Drag: Very soft static noise (loopable)
write_wav("assets/sounds/drag.wav", 2.0, 0, 0.05, "noise")

print("Done.")
