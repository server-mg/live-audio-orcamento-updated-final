/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Analyser class for live audio visualisation.
 * Provides enhanced frequency analysis with smoothing and peak detection.
 */
export class Analyser {
  private analyser: AnalyserNode;
  private bufferLength = 0;
  private dataArray: Uint8Array;
  private smoothedData: Float32Array;
  private smoothingFactor = 0.8;
  private isConnected = false;

  constructor(node: AudioNode) {
    try {
      this.analyser = node.context.createAnalyser();
      this.analyser.fftSize = 32;
      this.analyser.smoothingTimeConstant = 0.85;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;
      
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);
      this.smoothedData = new Float32Array(this.bufferLength);
      
      node.connect(this.analyser);
      this.isConnected = true;
    } catch (error) {
      console.warn('Erro ao criar analyser:', error);
      this.bufferLength = 16;
      this.dataArray = new Uint8Array(this.bufferLength);
      this.smoothedData = new Float32Array(this.bufferLength);
    }
  }

  update() {
    if (!this.isConnected || !this.analyser) {
      // Dados padrão se não conectado
      this.dataArray.fill(0);
      return;
    }
    
    try {
      this.analyser.getByteFrequencyData(this.dataArray);
      
      // Aplicar smoothing
      for (let i = 0; i < this.bufferLength; i++) {
        this.smoothedData[i] = this.smoothedData[i] * this.smoothingFactor + 
                              (this.dataArray[i] / 255) * (1 - this.smoothingFactor);
        this.dataArray[i] = Math.floor(this.smoothedData[i] * 255);
      }
    } catch (error) {
      console.warn('Erro ao atualizar analyser:', error);
    }
  }

  get data() {
    return this.dataArray;
  }

  get isActive() {
    return this.isConnected;
  }

  // Obter pico de frequência
  get peak() {
    return Math.max(...this.dataArray);
  }

  // Obter média de frequência
  get average() {
    const sum = this.dataArray.reduce((a, b) => a + b, 0);
    return sum / this.bufferLength;
  }

  disconnect() {
    if (this.analyser && this.isConnected) {
      try {
        this.analyser.disconnect();
        this.isConnected = false;
      } catch (error) {
        console.warn('Erro ao desconectar analyser:', error);
      }
    }
  }
}
