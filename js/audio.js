class AudioController {
    // ======== INITIALIZATION ========
    // Initializes the AudioController instance.
    constructor() {
        this.ctx = null;
        this.nextNoteTime = 0;
        this.beatCount = 0;
        this.isPlaying = false;
        this.tempo = GAME_CONFIG.TEMPO;
        this.lookahead = 25.0;
        this.scheduleAheadTime = 0.1;
        this.onBeat = null;
    }

    // Initializes the audio context.
    init() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // ======== PLAYBACK CONTROL ========
    // Starts the audio engine.
    start() {
        if (this.isPlaying) return;
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        this.isPlaying = true;
        this.nextNoteTime = this.ctx.currentTime;
        this.scheduler();
    }

    // Stops the audio engine.
    stop() {
        this.isPlaying = false;
        clearTimeout(this.timerID);
    }

    // ======== SCHEDULING ========
    // Schedules notes ahead of time.
    scheduler() {
        if (!this.isPlaying) return;
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.nextNoteTime);
            this.nextNote();
        }
        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    // Advances to the next beat.
    nextNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        this.nextNoteTime += secondsPerBeat;
        this.beatCount++;
    }

    // Plays audio for the current beat.
    scheduleNote(time) {
        // Only trigger game logic every 4 beats (approx 1.7s at 140BPM) 
        // to match the "1 second" requirement roughly while keeping musicality.
        // Actually, 60 BPM = 1 sec/beat. Dubstep at 140 is fast.
        // Let's stick to 60 BPM for the game logic tick as per requirement (1s),
        // but maybe play 140 BPM audio? No, synchronization is key.
        // Let's do 60 BPM for now as requested (1 tick = 1 sec).

        // Kick
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.start(time);
        osc.stop(time + 0.5);

        // Wobble Bass (every other beat)
        if (this.beatCount % 2 === 0) {
            const bass = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            bass.type = 'sawtooth';
            bass.frequency.setValueAtTime(55, time); // A1

            filter.type = 'lowpass';
            filter.Q.value = 1;
            // Wobble LFO effect via automation
            filter.frequency.setValueAtTime(100, time);
            filter.frequency.linearRampToValueAtTime(800, time + 0.25);
            filter.frequency.linearRampToValueAtTime(100, time + 0.5);

            bass.connect(filter);
            filter.connect(bassGain);
            bassGain.connect(this.ctx.destination);

            bassGain.gain.setValueAtTime(0.5, time);
            bassGain.gain.linearRampToValueAtTime(0, time + 0.8);

            bass.start(time);
            bass.stop(time + 0.8);
        }

        // Sync visual beat
        const timeUntilBeat = (time - this.ctx.currentTime) * 1000;
        setTimeout(() => {
            if (this.onBeat) this.onBeat(this.beatCount);
        }, Math.max(0, timeUntilBeat));
    }
}
