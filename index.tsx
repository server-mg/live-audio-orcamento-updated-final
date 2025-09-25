/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, LiveServerMessage, Modality, Session} from '@google/genai';
import {LitElement, css, html} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import * as pdfjsLib from 'pdfjs-dist';
import {createBlob, decode, decodeAudioData} from './utils';
import {EditAnalytics} from './src/utils/editAnalytics';
import './visual-3d';

// Set worker path for pdf.js
(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
  'https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.mjs';

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() status =
    'Clique no botão para iniciar a conversa com nosso assistente.';
  @state() error = '';
  @state() private fileContext = '';
  @state() private lastResponse = '';
  @state() private showBudgetPreview = false;
  @state() private budgetDraft: any | null = null;
  @state() private originalBudgetDraft: any | null = null;
  @state() private editLog: Array<{
    path: string;
    oldValue: any;
    newValue: any;
    timestamp: Date;
  }> = [];
  private editCounts: Record<string, number> = {};
  private editAnalytics: EditAnalytics;


  @state() private showPdfOptions = false;
  @state() private pdfOptions = {
    logo: '', // Base64 string for the logo
    template: 'moderno', // 'moderno' or 'classico'
    includedSections: {
      premissas: true,
      itens: true,
      taxasDescontos: true,
      resumo: true,
      condicoes: true,
    },
  };

  private client: GoogleGenAI;
  private session: Session;
  // FIX: Cast window to `any` to access `webkitAudioContext` for older browsers.
  private inputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 16000});
  // FIX: Cast window to `any` to access `webkitAudioContext` for older browsers.
  private outputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 24000});
  @state() inputNode = this.inputAudioContext.createGain();
  @state() outputNode = this.outputAudioContext.createGain();
  private nextStartTime = 0;
  private mediaStream: MediaStream;
  private sourceNode: AudioBufferSourceNode;
  private scriptProcessorNode: ScriptProcessorNode;
  private sources = new Set<AudioBufferSourceNode>();

  static styles = css`
    .header {
      position: absolute;
      top: 5vh;
      left: 0;
      right: 0;
      text-align: center;
      z-index: 10;
      color: white;
      text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    }

    .header h1 {
      font-size: 2.5rem;
      margin: 0;
      font-weight: 700;
    }

    .header p {
      margin: 0;
      font-size: 1.2rem;
      opacity: 0.8;
    }

    #status {
      position: absolute;
      bottom: 20vh;
      left: 0;
      right: 0;
      z-index: 10;
      text-align: center;
      padding: 0 20px;
    }

    .controls {
      z-index: 10;
      position: absolute;
      bottom: 5vh;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: row;
      gap: 10px;

      button {
        outline: none;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        width: 64px;
        height: 64px;
        cursor: pointer;
        font-size: 24px;
        padding: 0;
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      }

      button[disabled] {
        display: none;
      }
    }

    [contenteditable] {
      outline: none;
      padding: 2px 4px;
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    [contenteditable]:hover,
    [contenteditable]:focus {
      background-color: rgba(0, 0, 0, 0.05);
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.5); /* blue-500 */
    }

    .ai-response-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 600px;
      background: rgba(0, 0, 0, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 16px;
      color: white;
      z-index: 100;
      max-height: 300px;
      overflow-y: auto;
    }

    .ai-response-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-weight: bold;
      font-size: 14px;
      color: #60a5fa; /* blue-400 */
    }

    .clear-response-btn {
      background: none;
      border: none;
      color: #ef4444; /* red-500 */
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }

    .clear-response-btn:hover {
      background: rgba(239, 68, 68, 0.1);
    }

    .ai-response-content {
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .printable-area[data-template='classico'] {
      font-family: serif;
    }
    .printable-area[data-template='classico'] h1,
    .printable-area[data-template='classico'] h2,
    .printable-area[data-template='classico'] h3 {
      font-family: serif;
      font-weight: bold;
    }
    .printable-area[data-template='classico'] h2 {
      font-size: 2.5rem;
      border-bottom: 2px solid #374151; /* gray-700 */
      padding-bottom: 0.5rem;
    }
    .printable-area[data-template='classico'] h3 {
      border-bottom-color: #4b5563; /* gray-600 */
    }
    .printable-area[data-template='classico'] table {
      font-size: 0.9rem;
    }
    .printable-area[data-template='classico'] .bg-gray-950\\/50 {
      background-color: transparent;
    }
    .printable-area[data-template='classico'] .rounded-lg {
      border-radius: 0;
    }

    @media print {
      @page {
        size: A4;
        margin: 1.5cm;
      }
      .no-print {
        display: none !important;
      }
      body {
        background-color: #fff !important;
      }
      body > gdm-live-audio {
        height: auto;
        overflow: visible;
      }
      .printable-area-container {
        position: static !important;
        background: none !important;
        padding: 0 !important;
        display: block !important;
      }
      .printable-area {
        max-width: 100% !important;
        max-height: none !important;
        overflow: visible !important;
        box-shadow: none !important;
        border: none !important;
        background-color: white !important;
        color: black !important;
        border-radius: 0 !important;
        padding: 0 !important;
      }
      .text-white,
      .text-blue-700,
      .text-gray-800,
      .text-gray-600,
      .text-gray-500,
      .text-green-600 {
        color: black !important;
      }
      .border-gray-300,
      .border-gray-400 {
        border-color: #ccc !important;
      }
      .hover\\:bg-gray-100:hover {
        background-color: transparent !important;
      }
      gdm-live-audio-visuals-3d {
        display: none;
      }
      .bg-yellow-100 {
        background-color: transparent !important;
      }
    }
  

  /* A4 page styling for budget preview */
  .a4-page {
    width: 210mm;
    min-height: 297mm;
    margin: 20px auto;
    padding: 20mm;
    background: white;
    color: black;
    box-shadow: 0 0 10px rgba(0,0,0,0.15);
    font-family: "Times New Roman", serif;
  }

  @media print {
    body * { visibility: hidden; }
    .a4-page, .a4-page * { visibility: visible; }
    .a4-page { box-shadow: none; margin: 0; padding: 20mm; }
    .no-print { display: none !important; }
  }

`;

  constructor() {
    super();
    this.editAnalytics = new EditAnalytics();
    this.initClient();
  }

  private initAudio() {
    this.nextStartTime = this.outputAudioContext.currentTime;
  }

  private async initClient() {
    this.initAudio();

    // Verificar se API key está configurada
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      this.updateError('⚠️ Configure sua GEMINI_API_KEY no arquivo .env.local');
      return;
    }

    try {
      this.client = new GoogleGenAI({
        apiKey: apiKey,
      });

      this.outputNode.connect(this.outputAudioContext.destination);
      await this.initSession();
    } catch (error: any) {
      console.error('Erro ao inicializar cliente:', error);
      this.updateError(`Erro na inicialização: ${error.message}`);
    }
  }

  private async initSession() {
    const model = 'gemini-2.5-flash-preview-native-audio-dialog';

    const baseInstruction = `Você é o Agente de Orçamentos da MegaSom&Luz. Seu papel é criar, ajustar e explicar orçamentos de locação de equipamentos audiovisuais em conversa natural, aprendendo o estilo do usuário a cada uso. Responda sempre em português do Brasil, direto e amigável.

Objetivos

Criar orçamentos profissionais em tempo real e gerar PDF pronto para envio/edição colaborativa.
Analisar orçamentos/contratos enviados (PDF/imagem) para extrair itens, quantidades, preços, taxas e pacotes.
Aprender padrões do usuário (rácios de locação vs. venda, margens, descontos, itens/pacotes por tipo de evento).
Trabalhar com mínima intrusão: fazer no máximo 3 perguntas objetivas quando faltar dado essencial.
Nunca inventar números. Se faltar referência, pedir o mínimo necessário ou devolver faixa estimada com premissas claras.
Memória e Aprendizado

Manter memória por cliente/projeto: id, data, evento, itens/quantidades, preços (unitário/total), moeda, impostos, prazos, condições, validade, status, observações.
Aprender e atualizar preferências: moeda padrão, políticas de desconto, margem mínima, taxa de transporte/operador, validade típica, arredondamentos, pacotes recorrentes, faixas de preço aceitáveis, tom de voz.
Ao detectar um novo padrão, confirmar rapidamente com o usuário antes de consolidar.
Persistência: quando necessário, emita um bloco memory_update com as novas preferências/padrões inferidos para o host salvar.
Fluxo de Atendimento

Identificar cliente/projeto e recuperar histórico relevante.
Micro-resumo do que já sabe (1–2 linhas) e validação de premissas.
Se faltar dado crítico, fazer até 3 perguntas (evento/porte, data/local, duração).
Montar orçamento: escopo, premissas, itens com preços (unitário e total), taxas (transporte, montagem, operador), subtotais, descontos, impostos, validade, cronograma e condições de pagamento.
Comparar com históricos quando útil (ex.: “+8% vs. orçamento #123 por escopo maior/prazo menor”).
Oferecer 1–2 alternativas de pacote (básico/premium) quando fizer sentido.
Gerar PDF e aceitar edições do usuário em tempo real (“pdf_delta”). Registrar ajustes como aprendizado.
Precificação e Proporção

Base por item: preço_unit = preço_venda × rácio_locação × multiplicadores (quantidade, duração, urgência, complexidade, demanda, nível de qualidade, tipo de evento, perfil do cliente).
rácio_locação é aprendido por item/categoria/evento a partir de históricos e edições do usuário.
Se houver meta de total, redistribuir proporcionalmente por categoria/sensibilidade preservando margens mínimas.
Arredondar conforme preferência aprendida (ex.: múltiplos de 10/50/.900).
Se faltar preço de venda, priorizar: histórico e documentos enviados. Se permitido, solicitar autorização para buscar referência de mercado. Caso contrário, retornar faixa com premissas.
Análise de Documentos Enviados

Extrair: cliente, evento, data/local, itens (nome, marca/modelo), quantidades, valores unitários e total, taxas/descontos, pacotes.
Normalizar nomes e mapear para categorias (Som, Iluminação, Pista, LED).
Aprender rácios por item/categoria/evento a partir da comparação entre preço de venda e locação praticada.
Validar com o usuário quando houver ambiguidade antes de atualizar a base.
Estilo de Conversa

Curto, direto, cordial. Personalize com base no histórico.
Se faltar dado, pedir só o essencial. Sem jargão. Sem rodeios.
Transparência: sinalizar incertezas, premissas e principais alavancas de custo.
Diretriz de Tratamento de Erros (auto-reparo)

Detectar e diagnosticar: quando falhar extração, geração ou formatação, descrever em uma linha a causa provável.
Autocorreção: propor e aplicar patch específico (ex.: reduzir contexto, dividir em blocos, remover ruído, reformatar estrutura), reprocessar e validar.
Retentativas semânticas: até 3 variações com backoff e estratégias diferentes (compactar, sumarizar, chunking).
Validação: se a saída vier incompleta/malformada, pedir a si mesmo um “reparo” preservando o conteúdo e corrigindo apenas a estrutura.
Escalonar: se persistir o erro, informar diagnóstico curto e listar os dados úteis já extraídos, sem cair em resposta genérica.
Saídas Estruturadas (sempre que relevante)

budget_draft: rascunho de orçamento em JSON para o host renderizar.
pdf_delta: instruções concisas para atualizar o PDF (adição/remocão/edição de itens, textos comerciais).
memory_update: preferências/padrões aprendidos com nível de confiança.
error_repair: diagnóstico, patch aplicado e resultado.
Esquemas de saída

JSON

{
  "type": "budget_draft",
  "meta": {
    "cliente": "string",
    "evento": "string",
    "data": "YYYY-MM-DD",
    "local": "string",
    "moeda": "BRL",
    "validade_dias": 7
  },
  "premissas": ["string"],
  "itens": [
    {
      "categoria": "Som|Iluminacao|Pista|LED|Outro",
      "nome": "string",
      "quantidade": 1,
      "duracao_h": 6,
      "preco_unit": 0,
      "subtotal": 0,
      "fonte_preco": "historico|documento|mercado|estimativa",
      "observacoes": "string opcional"
    }
  ],
  "taxas": [
    {"nome": "Transporte", "valor": 0},
    {"nome": "Montagem/Operador", "valor": 0}
  ],
  "descontos": [{"nome": "À vista", "valor": 0}],
  "impostos": [{"nome": "ISS", "percentual": 0}],
  "totais": {"subtotal_itens": 0, "taxas": 0, "descontos": 0, "impostos": 0, "total_geral": 0},
  "condicoes": {"pagamento": "string", "prazo_execucao": "string", "observacoes": "string"}
}
JSON

{
  "type": "memory_update",
  "cliente_id": "string|opcional",
  "preferencias": {
    "moeda": "BRL",
    "validade_padrao_dias": 7,
    "margem_minima": 0.2,
    "politica_desconto": "ex.: 5% à vista",
    "arredondamento": "ex.: múltiplos de 50",
    "racios_por_categoria": {"Som": 0.08, "Iluminacao": 0.1}
  },
  "padroes": [
    {"chave": "pacote_casamento_basico", "itens": ["..."], "viés_preco": "+6%"}
  ],
  "confiança": "alta|média|baixa"
}
Políticas

Padrão: moeda BRL, região Brasil. Se diferente, confirmar.
Privacidade: não expor dados de outros clientes. Não inventar histórico.
Sem “pensamento em voz alta”: fornecer apenas conclusões curtas e resultados.
Exclusivamente via IA: toda análise e correção devem ocorrer dentro da conversa do agente, sem dependência de scripts locais.
Perguntas mínimas padrão (quando necessário)

Tipo de evento e porte (público estimado).
Data e local (impacta disponibilidade/logística).
Duração (montagem, evento, desmontagem).
Exemplo de turno (resumo)
Usuário: “Quero orçamento casamento 200 pessoas, 12/10 em Campinas.”
Assistente:

Micro-resumo + 1 pergunta se faltar dado (ex.: duração).
Emite um budget_draft com itens, taxas, validade 7 dias, total e 1 alternativa (básico/premium).
Emite memory_update se detectar novo padrão (ex.: arredondamento para múltiplos de 50).`;
    const systemInstruction = this.fileContext
      ? `${baseInstruction}\n\nUse o seguinte orçamento como contexto para a conversa:\n\n${this.fileContext}`
      : baseInstruction;

    try {
      this.session = await this.client.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            this.updateStatus('Conectado. Pronto para ajudar com seu evento!');
          },
          onmessage: async (message: LiveServerMessage) => {
            const parts = message.serverContent?.modelTurn?.parts;

            if (parts) {
              console.log('Received message parts:', parts.length);
              
              for (const part of parts) {
                // Log the type of content received for debugging
                if (part.inlineData) {
                  console.log('Processing audio content:', part.inlineData.mimeType || 'unknown mime type');
                  const audio = part.inlineData;
                  this.nextStartTime = Math.max(
                    this.nextStartTime,
                    this.outputAudioContext.currentTime,
                  );

                  const audioBuffer = await decodeAudioData(
                    decode(audio.data),
                    this.outputAudioContext,
                    24000,
                    1,
                  );
                  const source = this.outputAudioContext.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(this.outputNode);
                  source.addEventListener('ended', () => {
                    this.sources.delete(source);
                  });

                  source.start(this.nextStartTime);
                  this.nextStartTime =
                    this.nextStartTime + audioBuffer.duration;
                  this.sources.add(source);
                } else if (part.text) {
                  console.log('Processing text content:', part.text.length, 'characters');
                  // PIPELINE APRIMORADO - usar novo sistema de processamento
                  this.processAIResponse(part.text);
                } else {
                  console.warn('Unknown part type received:', Object.keys(part));
                }
              }
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of this.sources.values()) {
                source.stop();
                this.sources.delete(source);
              }
              this.nextStartTime = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            this.updateError(e.message);
          },
          onclose: (e: CloseEvent) => {
            this.updateStatus('Conexão fechada: ' + e.reason);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          speechConfig: {
            voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Orus'}},
            languageCode: 'pt-BR',
          },
        },
      });
    } catch (e) {
      console.error(e);
      this.updateError('Falha ao iniciar a sessão: ' + e.message);
    }
  }

  private updateStatus(msg: string) {
    this.status = msg;
    this.error = '';
  }

  // Sistema de parsing inteligente para múltiplos formatos com medição de performance
  private parseBudgetResponse(text: string): any | null {
    const startTime = performance.now();
    let result = null;
    let method = '';
    const performanceMetrics = {
      jsonParsing: 0,
      fallbackParsing: 0,
      totalTime: 0,
      textLength: text.length
    };

    try {
      // 1. Tentar JSON estruturado primeiro (método atual)
      const jsonStartTime = performance.now();
      
      const cleanText = text
        .trim()
        .replace(/^```json\s*/, '')
        .replace(/```$/, '');

      if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
        const data = JSON.parse(cleanText);
        if (data.type === 'budget_draft') {
          result = data;
          method = 'json_structured';
        }
      }
      
      const jsonEndTime = performance.now();
      performanceMetrics.jsonParsing = jsonEndTime - jsonStartTime;
      
      // Analytics: registrar tempo de parsing JSON
      this.editAnalytics.recordFieldEdit('parser_performance_json_ms', null, performanceMetrics.jsonParsing);
      
    } catch (e) {
      const jsonErrorTime = performance.now();
      performanceMetrics.jsonParsing = jsonErrorTime - startTime;
      
      console.log('JSON parsing falhou, tentando fallback...', `(${performanceMetrics.jsonParsing.toFixed(2)}ms)`);
      
      // Analytics: registrar falha de JSON com tempo e contexto
      this.editAnalytics.recordFieldEdit('json_parsing_failure', null, {
        error: e.message,
        duration: performanceMetrics.jsonParsing,
        textLength: text.length,
        textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
      });
    }

    // 2. Fallback: Parser regex/NLP para texto puro (apenas se JSON falhou)
    if (!result) {
      const fallbackStartTime = performance.now();
      
      result = this.parseTextToBudgetWithMetrics(text);
      method = result ? 'text_extraction' : 'extraction_failed';
      
      const fallbackEndTime = performance.now();
      performanceMetrics.fallbackParsing = fallbackEndTime - fallbackStartTime;
      
      // Analytics: registrar tempo de fallback com detalhes
      this.editAnalytics.recordFieldEdit('parser_performance_fallback_ms', null, {
        duration: performanceMetrics.fallbackParsing,
        textLength: text.length,
        success: !!result,
        method: method
      });
    }

    const totalEndTime = performance.now();
    performanceMetrics.totalTime = totalEndTime - startTime;
    
    // Analytics: registrar performance total com métricas completas
    this.editAnalytics.recordFieldEdit('parser_performance_total', null, {
      ...performanceMetrics,
      method: method,
      success: !!result,
      efficiency: performanceMetrics.totalTime / text.length, // ms por caractere
    });
    
    // Log detalhado se debug ativado
    if (process.env.VITE_DEBUG === 'true') {
      console.log(`[Parser Performance] ${method}: ${performanceMetrics.totalTime.toFixed(2)}ms (${text.length} chars)`, {
        breakdown: {
          json: `${performanceMetrics.jsonParsing.toFixed(2)}ms`,
          fallback: `${performanceMetrics.fallbackParsing.toFixed(2)}ms`,
          efficiency: `${(performanceMetrics.totalTime / text.length).toFixed(4)}ms/char`
        }
      });
    }
    
    // Performance warnings com thresholds inteligentes
    const expectedTimePerChar = 0.1; // 0.1ms por caractere é razoável
    const expectedTotalTime = text.length * expectedTimePerChar;
    
    if (performanceMetrics.totalTime > Math.max(100, expectedTotalTime * 2)) {
      console.warn(`⚠️ Parser lento detectado: ${performanceMetrics.totalTime.toFixed(2)}ms para ${text.length} caracteres (${(performanceMetrics.totalTime / text.length).toFixed(4)}ms/char)`);
      
      // Analytics: registrar parser lento com contexto
      this.editAnalytics.recordFieldEdit('parser_slow_warning', null, {
        actualTime: performanceMetrics.totalTime,
        expectedTime: expectedTotalTime,
        slownessFactor: performanceMetrics.totalTime / expectedTotalTime,
        textLength: text.length,
        method: method,
        breakdown: performanceMetrics
      });
    }
    
    // Performance excelente - logar também para análise
    if (performanceMetrics.totalTime < expectedTotalTime * 0.5) {
      this.editAnalytics.recordFieldEdit('parser_fast_performance', null, {
        time: performanceMetrics.totalTime,
        textLength: text.length,
        efficiency: performanceMetrics.totalTime / text.length,
        method: method
      });
    }

    return result;
  }

  // Parser inteligente para extrair orçamento de texto livre com métricas
  private parseTextToBudgetWithMetrics(text: string): any | null {
    const stepMetrics = {};
    let stepStart = performance.now();
    
    // Step 1: Análise inicial de keywords
    const lines = text.split('\n').filter(line => line.trim());
    const budgetKeywords = ['orçamento', 'preço', 'valor', 'total', 'item', 'equipamento', 'som', 'iluminação'];
    const hasBudgetContent = budgetKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
    stepMetrics['keyword_analysis'] = performance.now() - stepStart;

    if (!hasBudgetContent) {
      // Analytics: registrar tentativa sem keywords relevantes
      this.editAnalytics.recordFieldEdit('text_parsing_no_keywords', null, {
        duration: stepMetrics['keyword_analysis'],
        textLength: text.length,
        textPreview: text.substring(0, 100)
      });
      return null;
    }

    // Step 2: Extração de metadados
    stepStart = performance.now();
    const meta = {
      cliente: this.extractClientInfo(text),
      evento: this.extractEventInfo(text),
      data: this.extractDateInfo(text),
      local: this.extractLocationInfo(text),
      moeda: 'BRL',
      validade_dias: 7
    };
    stepMetrics['meta_extraction'] = performance.now() - stepStart;

    // Step 3: Extração de premissas
    stepStart = performance.now();
    const premissas = this.extractPremissas(text);
    stepMetrics['premissas_extraction'] = performance.now() - stepStart;

    // Step 4: Extração de itens (mais custosa)
    stepStart = performance.now();
    const itens = this.extractItems(text);
    stepMetrics['items_extraction'] = performance.now() - stepStart;

    // Step 5: Construção do orçamento
    stepStart = performance.now();
    const budget = {
      type: 'budget_draft',
      meta,
      premissas,
      itens,
      taxas: [{ nome: 'Transporte', valor: 0 }],
      descontos: [],
      impostos: [{ nome: 'ISS', percentual: 5 }],
      totais: { subtotal_itens: 0, taxas: 0, descontos: 0, impostos: 0, total_geral: 0 },
      condicoes: {
        pagamento: '50% entrada + 50% no evento',
        prazo_execucao: 'Conforme agendado',
        observacoes: text
      }
    };

    // Calcular totais
    budget.totais.subtotal_itens = budget.itens.reduce((sum: number, item: any) => 
      sum + (item.quantidade * item.preco_unit), 0
    );
    budget.totais.total_geral = budget.totais.subtotal_itens;
    
    stepMetrics['budget_construction'] = performance.now() - stepStart;
    
    // Analytics: registrar breakdown detalhado de performance
    this.editAnalytics.recordFieldEdit('text_parsing_breakdown', null, {
      steps: stepMetrics,
      totalSteps: Object.keys(stepMetrics).length,
      slowestStep: Object.entries(stepMetrics).reduce((max, [step, time]) => 
        (time as number) > max.time ? { step, time: time as number } : max, { step: '', time: 0 }
      ),
      itemsExtracted: itens.length,
      textLength: text.length
    });

    return budget;
  }

  // Parser inteligente para extrair orçamento de texto livre (método original mantido para compatibilidade)
  private parseTextToBudget(text: string): any | null {
    return this.parseTextToBudgetWithMetrics(text);
  }

  // Métodos auxiliares de extração via regex
  private extractClientInfo(text: string): string {
    const clientPatterns = [
      /cliente:?\s*([^\n]+)/i,
      /para:?\s*([^\n]+)/i,
      /sr\.?\s*([^\n]+)/i,
      /sra\.?\s*([^\n]+)/i
    ];
    
    for (const pattern of clientPatterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return 'Cliente';
  }

  private extractEventInfo(text: string): string {
    const eventPatterns = [
      /evento:?\s*([^\n]+)/i,
      /(casamento|festa|formatura|aniversário|corporativo)/i,
      /para\s+(um|uma|o|a)?\s*(\w+)/i
    ];
    
    for (const pattern of eventPatterns) {
      const match = text.match(pattern);
      if (match) return match[1] || match[2] || match[0];
    }
    return 'Evento';
  }

  private extractDateInfo(text: string): string {
    const datePatterns = [
      /data:?\s*([^\n]+)/i,
      /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/,
      /(\d{1,2}\s+de\s+\w+)/i
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) return match[1] || match[0];
    }
    return new Date().toLocaleDateString('pt-BR');
  }

  private extractLocationInfo(text: string): string {
    const locationPatterns = [
      /local:?\s*([^\n]+)/i,
      /em\s+([^\n,]+)/i,
      /endereço:?\s*([^\n]+)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return 'A definir';
  }

  private extractPremissas(text: string): string[] {
    const premissas = [];
    
    if (text.includes('pessoas')) {
      const peopleMatch = text.match(/(\d+)\s*pessoas/i);
      if (peopleMatch) {
        premissas.push(`Evento para ${peopleMatch[1]} pessoas`);
      }
    }
    
    if (text.includes('horas')) {
      const hoursMatch = text.match(/(\d+)\s*horas/i);
      if (hoursMatch) {
        premissas.push(`Duração de ${hoursMatch[1]} horas`);
      }
    } else {
      premissas.push('Duração padrão de 6 horas');
    }
    
    premissas.push('Montagem e desmontagem incluídas');
    premissas.push('Operador técnico durante todo evento');
    
    return premissas;
  }

  private extractItems(text: string): any[] {
    const items = [];
    const itemPatterns = [
      { regex: /(som|áudio|caixa|microfone)/i, categoria: 'Som', base: 300 },
      { regex: /(luz|iluminação|led|refletor)/i, categoria: 'Iluminacao', base: 200 },
      { regex: /(pista|dança)/i, categoria: 'Pista', base: 500 },
      { regex: /(dj|mesa|mixer)/i, categoria: 'Som', base: 400 }
    ];

    // Detectar itens mencionados
    for (const pattern of itemPatterns) {
      if (pattern.regex.test(text)) {
        items.push({
          categoria: pattern.categoria,
          nome: this.getItemName(pattern.categoria),
          quantidade: 1,
          duracao_h: 6,
          preco_unit: pattern.base,
          subtotal: pattern.base,
          fonte_preco: 'estimativa',
          observacoes: 'Extraído do texto'
        });
      }
    }

    // Se nenhum item detectado, criar pacote básico
    if (items.length === 0) {
      items.push({
        categoria: 'Som',
        nome: 'Pacote de Som Básico',
        quantidade: 1,
        duracao_h: 6,
        preco_unit: 800,
        subtotal: 800,
        fonte_preco: 'estimativa',
        observacoes: 'Pacote padrão'
      });
    }

    return items;
  }

  private getItemName(categoria: string): string {
    const names = {
      'Som': 'Sistema de Som Completo',
      'Iluminacao': 'Iluminação Ambiente',
      'Pista': 'Pista de Dança',
      'LED': 'Painel de LED'
    };
    return names[categoria] || 'Item Personalizado';
  }

  // Sistema de processamento multi-tipo
  private processAIResponse(text: string): void {
    // Tentar parsing estruturado primeiro
    const parsedData = this.parseBudgetResponse(text);
    
    if (parsedData) {
      this.handleStructuredResponse(parsedData);
    } else {
      // Fallback: processar como resposta de texto livre
      this.handleTextResponse(text);
    }
  }

  private handleStructuredResponse(data: any): void {
    // Analytics: registrar tipo de resposta recebida
    this.editAnalytics.recordFieldEdit('ai_response_type', null, data.type);

    switch (data.type) {
      case 'budget_draft':
        this.processBudgetDraft(data);
        break;
      
      case 'budget_partial':
        this.processBudgetPartial(data);
        break;
        
      case 'contract_analysis':
        this.processContractAnalysis(data);
        break;
        
      case 'price_comparison':
        this.processPriceComparison(data);
        break;
        
      case 'memory_update':
        this.processMemoryUpdate(data);
        break;
        
      default:
        console.warn('Tipo de resposta desconhecido:', data.type);
        this.handleTextResponse(JSON.stringify(data));
    }
  }

  private processBudgetDraft(data: any): void {
    this.lastResponse = JSON.stringify(data);
    this.budgetDraft = data;
    this.originalBudgetDraft = JSON.parse(JSON.stringify(data));
    this.showBudgetPreview = true;
    this.editLog = [];
    this.editCounts = {};
    this.editAnalytics.reset();
    
    // Analytics: registrar geração de orçamento
    this.editAnalytics.recordFieldEdit('budget_generated', null, {
      items_count: data.itens?.length || 0,
      total_value: data.totais?.total_geral || 0,
      generation_method: 'structured'
    });
    
    (window as any).__budgetEditCounts = this.editCounts;
  }

  private processBudgetPartial(data: any): void {
    // Streaming progressivo: atualizar orçamento em tempo real
    if (!this.budgetDraft) {
      // Primeira parte: inicializar structure básica
      this.budgetDraft = {
        type: 'budget_draft',
        meta: data.meta || {},
        premissas: [],
        itens: [],
        taxas: [],
        descontos: [],
        impostos: [],
        totais: { subtotal_itens: 0, taxas: 0, descontos: 0, impostos: 0, total_geral: 0 },
        condicoes: {}
      };
      this.showBudgetPreview = true;
    }

    // Merge incremental dos dados
    if (data.meta) Object.assign(this.budgetDraft.meta, data.meta);
    if (data.premissas) this.budgetDraft.premissas.push(...data.premissas);
    if (data.itens) this.budgetDraft.itens.push(...data.itens);
    if (data.taxas) this.budgetDraft.taxas.push(...data.taxas);
    if (data.condicoes) Object.assign(this.budgetDraft.condicoes, data.condicoes);

    // Recalcular totais
    this.budgetDraft = this.recalculateTotals(this.budgetDraft);
    
    // Forçar re-render
    this.requestUpdate();
  }

  private processContractAnalysis(data: any): void {
    // Futuro: modal de análise de contrato
    console.log('Análise de contrato:', data);
    this.updateStatus(`Análise de contrato concluída: ${data.summary || 'Dados processados'}`);
  }

  private processPriceComparison(data: any): void {
    // Futuro: comparação de preços
    console.log('Comparação de preços:', data);
    this.updateStatus(`Comparação: ${data.message || 'Preços analisados'}`);
  }

  private processMemoryUpdate(data: any): void {
    // Sistema de aprendizado: salvar preferências
    console.log('Atualização de memória:', data);
    
    // Aqui você pode implementar persistência local
    if (data.preferencias) {
      localStorage.setItem('user_preferences', JSON.stringify(data.preferencias));
    }
    
    this.updateStatus('Preferências atualizadas e salvas!');
  }

  private handleTextResponse(text: string): void {
    // Analytics: registrar resposta em texto livre
    this.editAnalytics.recordFieldEdit('ai_response_type', null, 'text_free');
    
    // Tentar extrair orçamento de texto livre
    const extractedBudget = this.parseTextToBudget(text);
    
    if (extractedBudget) {
      console.log('Orçamento extraído de texto livre:', extractedBudget);
      this.processBudgetDraft(extractedBudget);
      
      // Analytics: sucesso na extração
      this.editAnalytics.recordFieldEdit('text_extraction_success', null, true);
    } else {
      // Não conseguiu extrair orçamento: exibir resposta de texto na interface
      console.log('Resposta em texto livre (sem orçamento):', text);
      
      // CORREÇÃO: Armazenar e exibir o texto da resposta para o usuário
      this.lastResponse = text;
      this.updateStatus('Resposta da IA recebida. Veja o conteúdo abaixo ou continue a conversa.');
      
      // Analytics: falha na extração
      this.editAnalytics.recordFieldEdit('text_extraction_success', null, false);
    }
  }

  private updateError(msg: string) {
    this.error = msg;
    this.status = '';
  }

  private clearTextResponse() {
    this.lastResponse = '';
    this.updateStatus('Resposta limpa. Continue a conversa.');
  }

  private discardChanges() {
    if (this.originalBudgetDraft) {
      this.budgetDraft = JSON.parse(JSON.stringify(this.originalBudgetDraft));
    }
    this.editLog = [];
    this.closeBudgetPreview();
  }

  private saveChanges() {
    console.log('User edits log:', this.editLog);
    // Here you could send the log to a server or back to the AI
    // For now, we'll just log it.

    // Update the original draft to reflect the saved changes
    this.originalBudgetDraft = JSON.parse(JSON.stringify(this.budgetDraft));
    this.editLog = [];
    this.updateStatus('Orçamento atualizado com sucesso!');
    this.closeBudgetPreview();
  }

  private closeBudgetPreview() {
    this.showBudgetPreview = false;
    this.budgetDraft = null;
    this.lastResponse = '';
    // We keep originalBudgetDraft until a new one is generated
  }

  private async startRecording() {
    if (this.isRecording) {
      return;
    }

    this.closeBudgetPreview();
    
    try {
      // Verificar se está em HTTPS ou localhost
      const isSecureContext = window.location.protocol === 'https:' || 
                             window.location.hostname === 'localhost' ||
                             window.location.hostname === '127.0.0.1';
      
      if (!isSecureContext) {
        this.updateError('⚠️ Microfone requer HTTPS. Use localhost para desenvolvimento.');
        return;
      }

      // Verificar suporte do navegador
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.updateError('⚠️ Seu navegador não suporta gravação de áudio.');
        return;
      }

      await this.inputAudioContext.resume();
      await this.outputAudioContext.resume();

      this.updateStatus('Aguardando permissão do microfone...');

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
        video: false,
      });

      this.updateStatus('Microfone conectado. Pode falar!');

      this.sourceNode = this.inputAudioContext.createMediaStreamSource(
        this.mediaStream,
      );
      this.sourceNode.connect(this.inputNode);

      const bufferSize = 256;
      this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(
        bufferSize,
        1,
        1,
      );

      this.scriptProcessorNode.onaudioprocess = (audioProcessingEvent) => {
        if (!this.isRecording || !this.session) return;

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);

        try {
          this.session.sendRealtimeInput({media: createBlob(pcmData)});
        } catch (error) {
          console.warn('Erro ao enviar áudio:', error);
        }
      };

      this.sourceNode.connect(this.scriptProcessorNode);
      this.scriptProcessorNode.connect(this.inputAudioContext.destination);

      this.isRecording = true;
      this.updateStatus('🔴 Gravando... Fale sobre o seu evento.');
      
    } catch (err: any) {
      console.error('Error starting recording:', err);
      
      let errorMessage = `Erro: ${err.message}`;
      if (err.name === 'NotAllowedError') {
        errorMessage = '⚠️ Permissão do microfone negada. Permita o acesso e tente novamente.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = '⚠️ Nenhum microfone encontrado. Conecte um microfone e tente novamente.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = '⚠️ Microfone em uso por outro aplicativo.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = '⚠️ Configurações de áudio não suportadas.';
      }
      
      this.updateError(errorMessage);
      this.stopRecording();
    }
  }

  private stopRecording() {
    if (!this.isRecording && !this.mediaStream && !this.inputAudioContext)
      return;

    this.updateStatus('Gravação parada.');

    this.isRecording = false;

    if (this.scriptProcessorNode && this.sourceNode && this.inputAudioContext) {
      this.scriptProcessorNode.disconnect();
      this.sourceNode.disconnect();
    }

    this.scriptProcessorNode = null;
    this.sourceNode = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.updateStatus('Clique no botão para falar novamente.');
  }

  private reset() {
    this.closeBudgetPreview();
    this.session?.close();
    this.initSession();
    this.updateStatus('Sessão reiniciada.');
  }

  private async handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    this.updateStatus('Processando PDFs...');

    const files = Array.from(input.files);
    const pdfFiles = files.filter((file) => file.type === 'application/pdf');

    if (pdfFiles.length === 0) {
      this.updateError('Nenhum arquivo PDF válido selecionado.');
      input.value = ''; // Reset input
      return;
    }

    try {
      const allTextContents = await Promise.all(
        pdfFiles.map((file) => this.readPdfFile(file)),
      );
      this.fileContext = allTextContents.join('\n\n---\n\n'); // Separator between docs

      this.reset();
      this.updateStatus(
        `${pdfFiles.length} PDF(s) carregado(s). A sessão foi reiniciada com o novo contexto.`,
      );
    } catch (err) {
      console.error('Error processing PDF files:', err);
      this.updateError(`Erro ao processar PDF: ${err.message}`);
    } finally {
      // Reset input value to allow re-uploading the same file
      input.value = '';
    }
  }

  private async readPdfFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (!e.target?.result) {
          return reject(new Error('Falha ao ler o arquivo.'));
        }
        try {
          const typedArray = new Uint8Array(e.target.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          const pagePromises = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            pagePromises.push(
              pdf.getPage(i).then((page) => page.getTextContent()),
            );
          }
          const pageContents = await Promise.all(pagePromises);
          const pdfText = pageContents
            .map((content) =>
              content.items
                .map((item) => ('str' in item ? item.str : ''))
                .join(' '),
            )
            .join('\n');

          resolve(pdfText);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(new Error('Erro do FileReader: ' + err));
      reader.readAsArrayBuffer(file); // Read as ArrayBuffer for pdf.js
    });
  }

  private getByPath(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
  }

  private isChanged(path: string): boolean {
    if (!this.originalBudgetDraft || !this.budgetDraft) return false;
    const originalValue = this.getByPath(this.originalBudgetDraft, path);
    const currentValue = this.getByPath(this.budgetDraft, path);
    return JSON.stringify(originalValue) !== JSON.stringify(currentValue);
  }

  private handleBudgetEdit(e: Event) {
    const target = e.target as HTMLElement;
    const path = target.dataset.path;

    if (!path) return;

    // Use innerHTML for rich text fields, otherwise innerText
    const isRichTextField = path === 'condicoes.observacoes';
    let value: string | number | string[] = isRichTextField
      ? target.innerHTML
      : target.innerText;

    const newDraft = JSON.parse(JSON.stringify(this.budgetDraft));

    const keys = path.split('.');
    let current = newDraft;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }

    const lastKey = keys[keys.length - 1];
    const oldValue = current[lastKey];

    if (typeof oldValue === 'number') {
      const sanitizedValue = value
        .toString()
        .replace(/\./g, '')
        .replace(',', '.')
        .replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(sanitizedValue);
      value = isNaN(parsed) ? 0 : parsed;
    }

    if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
      this.editLog.push({
        path,
        oldValue,
        newValue: value,
        timestamp: new Date(),
      });
      const prev = this.editCounts[path] || 0;
      this.editCounts[path] = prev + 1;
      
      // Registrar no sistema de analytics
      this.editAnalytics.recordFieldEdit(path, oldValue, value);
      
      (window as any).__budgetEditCounts = this.editCounts;
    }

    current[lastKey] = value;

    console.log('Emitting change (pdf_delta):', {
      type: 'pdf_delta',
      ops: [
        {op: 'replace', path: `/${path.replace(/\./g, '/')}`, value: value},
      ],
    });

    this.budgetDraft = this.recalculateTotals(newDraft);
  }

  private recalculateTotals(draft: any) {
    let subtotalItens = 0;
    draft.itens.forEach((item: any) => {
      item.subtotal = (item.quantidade || 0) * (item.preco_unit || 0);
      subtotalItens += item.subtotal;
    });

    draft.totais.subtotal_itens = subtotalItens;

    let totalTaxas = draft.taxas.reduce(
      (acc: number, taxa: any) => acc + (taxa.valor || 0),
      0,
    );
    draft.totais.taxas = totalTaxas;

    let totalDescontos = draft.descontos.reduce(
      (acc: number, d: any) => acc + (d.valor || 0),
      0,
    );
    draft.totais.descontos = totalDescontos;

    let baseParaImposto = subtotalItens + totalTaxas - totalDescontos;
    let totalImpostos = 0;
    draft.impostos.forEach((imposto: any) => {
      totalImpostos += baseParaImposto * ((imposto.percentual || 0) / 100);
    });
    draft.totais.impostos = totalImpostos;

    draft.totais.total_geral = baseParaImposto + totalImpostos;

    return draft;
  }

  private addItem(section: 'itens' | 'taxas' | 'descontos') {
    const newDraft = JSON.parse(JSON.stringify(this.budgetDraft));
    if (section === 'itens') {
      newDraft.itens.push({
        categoria: 'Outro',
        nome: 'Novo Item',
        quantidade: 1,
        duracao_h: 0,
        preco_unit: 0,
        subtotal: 0,
        fonte_preco: 'manual',
        observacoes: '',
      });
    } else {
      newDraft[section].push({nome: 'Nova Taxa/Desconto', valor: 0});
    }
    this.budgetDraft = this.recalculateTotals(newDraft);
  }

  private removeItem(index: number, section: 'itens' | 'taxas' | 'descontos') {
    const newDraft = JSON.parse(JSON.stringify(this.budgetDraft));
    newDraft[section].splice(index, 1);
    this.budgetDraft = this.recalculateTotals(newDraft);
  }

  private handleLogoUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.pdfOptions = {
          ...this.pdfOptions,
          logo: e.target?.result as string,
        };
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  private handlePdfOptionChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const {name, value, type, checked, dataset} = input;

    if (type === 'checkbox') {
      const section =
        dataset.section as keyof typeof this.pdfOptions.includedSections;
      if (section) {
        this.pdfOptions = {
          ...this.pdfOptions,
          includedSections: {
            ...this.pdfOptions.includedSections,
            [section]: checked,
          },
        };
      }
    } else if (type === 'radio') {
      if (name === 'template') {
        this.pdfOptions = {
          ...this.pdfOptions,
          template: value,
        };
      }
    }
  }

  private renderPdfOptionsModal() {
    if (!this.showPdfOptions) return html``;

    return html`
      <div
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] no-print"
        @click=${() => (this.showPdfOptions = false)}>
        <div
          class="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-lg p-6"
          @click=${(e: Event) => e.stopPropagation()}>
          <h2 class="text-2xl font-bold mb-6">Personalizar PDF</h2>

          <!-- Logo Upload -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-300 mb-2"
              >Logo da Empresa</label
            >
            <div class="flex items-center gap-4">
              ${this.pdfOptions.logo
                ? html`<img
                    src="${this.pdfOptions.logo}"
                    alt="Logo Preview"
                    class="h-16 w-16 object-contain bg-white/10 rounded" />`
                : html`<div
                    class="h-16 w-16 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400">
                    Sem logo
                  </div>`}
              <input
                type="file"
                @change=${this.handleLogoUpload}
                accept="image/*"
                class="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />
            </div>
          </div>

          <!-- Template Selection -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-300 mb-2"
              >Template</label
            >
            <div class="flex gap-4">
              <label class="flex items-center">
                <input
                  type="radio"
                  name="template"
                  value="moderno"
                  .checked=${this.pdfOptions.template === 'moderno'}
                  @change=${this.handlePdfOptionChange}
                  class="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500" />
                <span class="ml-2">Moderno</span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  name="template"
                  value="classico"
                  .checked=${this.pdfOptions.template === 'classico'}
                  @change=${this.handlePdfOptionChange}
                  class="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500" />
                <span class="ml-2">Clássico</span>
              </label>
            </div>
          </div>

          <!-- Sections to Include -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-300 mb-2"
              >Seções para Incluir</label
            >
            <div class="grid grid-cols-2 gap-2">
              ${Object.entries({
                premissas: 'Premissas',
                itens: 'Itens',
                taxasDescontos: 'Taxas e Descontos',
                resumo: 'Resumo Financeiro',
                condicoes: 'Condições',
              }).map(
                ([key, label]) => html`
                  <label class="flex items-center">
                    <input
                      type="checkbox"
                      data-section=${key}
                      .checked=${this.pdfOptions.includedSections[
                        key as keyof typeof this.pdfOptions.includedSections
                      ]}
                      @change=${this.handlePdfOptionChange}
                      class="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" />
                    <span class="ml-2">${label}</span>
                  </label>
                `,
              )}
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-4 mt-8">
            <button
              @click=${() => (this.showPdfOptions = false)}
              class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
              Fechar
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderBudgetPreview() {
    if (!this.budgetDraft) return html`
              <div class="no-print"><button onclick="window.__showBudgetAnalytics && window.__showBudgetAnalytics(window.__budgetEditCounts)">Ver Analytics</button></div>
`;

    const {meta, itens, taxas, descontos, totais, condicoes, premissas} =
      this.budgetDraft;

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: meta.moeda || 'BRL',
      }).format(value || 0);
    };

    return html`
      <div
        class="fixed inset-0 bg-gray-700/75 flex items-center justify-center z-50 p-4 printable-area-container"
        @click=${this.discardChanges}>
        <div
          class="bg-white text-gray-800 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-12 lg:p-16 printable-area"
          data-template=${this.pdfOptions.template}
          @click=${(e: Event) => e.stopPropagation()}>
          <div class="flex justify-between items-start mb-8">
            <div>
              ${this.pdfOptions.logo
                ? html`<img
                    src="${this.pdfOptions.logo}"
                    alt="Company Logo"
                    class="max-h-20 mb-4 print:max-h-16" />`
                : ''}
              <h1 class="text-3xl font-bold text-blue-700">MegaSom&Luz</h1>
              <h2 class="text-4xl font-bold text-gray-900 mt-2">
                Proposta de Orçamento
              </h2>
            </div>
            <button
              @click=${this.discardChanges}
              class="text-gray-500 hover:text-gray-800 text-3xl no-print">
              &times;
            </button>
          </div>

          <div class="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 text-base">
            <div>
              <strong class="text-gray-600">Cliente:</strong>
              <span
                contenteditable="true"
                class="p-1 rounded-md ${this.isChanged('meta.cliente')
                  ? 'bg-yellow-100'
                  : ''}"
                data-path="meta.cliente"
                @blur=${this.handleBudgetEdit}
                >${meta.cliente}</span
              >
            </div>
            <div>
              <strong class="text-gray-600">Evento:</strong>
              <span
                contenteditable="true"
                class="p-1 rounded-md ${this.isChanged('meta.evento')
                  ? 'bg-yellow-100'
                  : ''}"
                data-path="meta.evento"
                @blur=${this.handleBudgetEdit}
                >${meta.evento}</span
              >
            </div>
            <div>
              <strong class="text-gray-600">Data:</strong>
              <span
                contenteditable="true"
                class="p-1 rounded-md ${this.isChanged('meta.data')
                  ? 'bg-yellow-100'
                  : ''}"
                data-path="meta.data"
                @blur=${this.handleBudgetEdit}
                >${meta.data}</span
              >
            </div>
            <div>
              <strong class="text-gray-600">Local:</strong>
              <span
                contenteditable="true"
                class="p-1 rounded-md ${this.isChanged('meta.local')
                  ? 'bg-yellow-100'
                  : ''}"
                data-path="meta.local"
                @blur=${this.handleBudgetEdit}
                >${meta.local}</span
              >
            </div>
          </div>

          <!-- Assumptions -->
          ${this.pdfOptions.includedSections.premissas &&
          premissas &&
          premissas.length > 0
            ? html`
                <div class="mb-8">
                  <h3
                    class="text-2xl font-semibold mb-3 border-b border-gray-300 pb-2 text-gray-800">
                    Premissas
                  </h3>
                  <ul
                    class="list-disc list-inside text-gray-700 space-y-1">
                    ${premissas.map(
                      (premisa: string, index: number) => html`
                        <li>
                          <span
                            contenteditable="true"
                            data-path="premissas.${index}"
                            @blur=${this.handleBudgetEdit}
                            class="outline-none p-1 rounded-md hover:bg-gray-100 focus:bg-gray-100 focus:ring-1 focus:ring-blue-500 ${this.isChanged(
                              `premissas.${index}`,
                            )
                              ? 'bg-yellow-100'
                              : ''}"
                            >${premisa}</span
                          >
                        </li>
                      `,
                    )}
                  </ul>
                </div>
              `
            : ''}

          <!-- Items Table -->
          ${this.pdfOptions.includedSections.itens
            ? html`
                <div class="mb-8">
                  <h3
                    class="text-2xl font-semibold mb-4 border-b border-gray-300 pb-2 text-gray-800">
                    Itens do Orçamento
                  </h3>
                  <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                      <thead>
                        <tr class="border-b-2 border-gray-400">
                          <th class="p-2 font-semibold">Categoria</th>
                          <th class="p-2 font-semibold">Nome</th>
                          <th class="p-2 text-right font-semibold">Qtd.</th>
                          <th class="p-2 text-right font-semibold">
                            Preço Unit.
                          </th>
                          <th class="p-2 text-right font-semibold">Subtotal</th>
                          <th class="p-2 no-print"></th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itens.map(
                          (item: any, index: number) => html`
                            <tr
                              class="border-b border-gray-300 hover:bg-gray-100">
                              <td
                                class="p-2 ${this.isChanged(
                                  `itens.${index}.categoria`,
                                )
                                  ? 'bg-yellow-100'
                                  : ''}"
                                contenteditable="true"
                                data-path="itens.${index}.categoria"
                                @blur=${this.handleBudgetEdit}>
                                ${item.categoria}
                              </td>
                              <td
                                class="p-2 ${this.isChanged(
                                  `itens.${index}.nome`,
                                )
                                  ? 'bg-yellow-100'
                                  : ''}"
                                contenteditable="true"
                                data-path="itens.${index}.nome"
                                @blur=${this.handleBudgetEdit}>
                                ${item.nome}
                              </td>
                              <td
                                class="p-2 text-right ${this.isChanged(
                                  `itens.${index}.quantidade`,
                                )
                                  ? 'bg-yellow-100'
                                  : ''}"
                                contenteditable="true"
                                data-path="itens.${index}.quantidade"
                                @blur=${this.handleBudgetEdit}>
                                ${item.quantidade}
                              </td>
                              <td
                                class="p-2 text-right ${this.isChanged(
                                  `itens.${index}.preco_unit`,
                                )
                                  ? 'bg-yellow-100'
                                  : ''}"
                                contenteditable="true"
                                data-path="itens.${index}.preco_unit"
                                @blur=${this.handleBudgetEdit}>
                                ${formatCurrency(item.preco_unit)}
                              </td>
                              <td class="p-2 text-right">
                                ${formatCurrency(item.subtotal)}
                              </td>
                              <td class="p-2 text-center no-print">
                                <button
                                  @click=${() =>
                                    this.removeItem(index, 'itens')}
                                  class="text-red-500 hover:text-red-400 font-bold">
                                  &times;
                                </button>
                              </td>
                            </tr>
                          `,
                        )}
                        <tr class="no-print">
                          <td colspan="6" class="pt-2">
                            <button
                              @click=${() => this.addItem('itens')}
                              class="text-green-600 hover:text-green-500 text-sm font-semibold">
                              + Adicionar Item
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              `
            : ''}

          <!-- Totals & Fees -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <!-- Fees & Discounts -->
            ${this.pdfOptions.includedSections.taxasDescontos
              ? html`
                  <div>
                    <h3
                      class="text-xl font-semibold mb-3 border-b border-gray-300 pb-2">
                      Taxas e Descontos
                    </h3>
                    <div class="space-y-2 text-sm">
                      ${taxas.map(
                        (taxa: any, index: number) => html`<div
                          class="flex justify-between items-center">
                          <span
                            contenteditable="true"
                            data-path="taxas.${index}.nome"
                            @blur=${this.handleBudgetEdit}
                            class="text-gray-600 p-1 rounded-md ${this.isChanged(
                              `taxas.${index}.nome`,
                            )
                              ? 'bg-yellow-100'
                              : ''}"
                            >${taxa.nome}</span
                          >
                          <span class="flex items-center">
                            <span
                              contenteditable="true"
                              data-path="taxas.${index}.valor"
                              @blur=${this.handleBudgetEdit}
                              class="p-1 rounded-md ${this.isChanged(
                                `taxas.${index}.valor`,
                              )
                                ? 'bg-yellow-100'
                                : ''}"
                              >${formatCurrency(taxa.valor)}</span
                            >
                            <button
                              @click=${() => this.removeItem(index, 'taxas')}
                              class="text-red-500 hover:text-red-400 font-bold ml-2 no-print">
                              &times;
                            </button>
                          </span>
                        </div>`,
                      )}
                      ${descontos.map(
                        (desconto: any, index: number) => html`<div
                          class="flex justify-between items-center text-green-600">
                          <span
                            contenteditable="true"
                            data-path="descontos.${index}.nome"
                            @blur=${this.handleBudgetEdit}
                            class="p-1 rounded-md ${this.isChanged(
                              `descontos.${index}.nome`,
                            )
                              ? 'bg-yellow-100'
                              : ''}"
                            >${desconto.nome}</span
                          >
                          <span class="flex items-center">
                            <span
                              >-
                              <span
                                contenteditable="true"
                                data-path="descontos.${index}.valor"
                                @blur=${this.handleBudgetEdit}
                                class="p-1 rounded-md ${this.isChanged(
                                  `descontos.${index}.valor`,
                                )
                                  ? 'bg-yellow-100'
                                  : ''}"
                                >${formatCurrency(desconto.valor)}</span
                              ></span
                            >
                            <button
                              @click=${() =>
                                this.removeItem(index, 'descontos')}
                              class="text-red-500 hover:text-red-400 font-bold ml-2 no-print">
                              &times;
                            </button>
                          </span>
                        </div>`,
                      )}
                      <div class="flex gap-4 pt-2 no-print">
                        <button
                          @click=${() => this.addItem('taxas')}
                          class="text-green-600 hover:text-green-500 text-sm font-semibold">
                          + Taxa
                        </button>
                        <button
                          @click=${() => this.addItem('descontos')}
                          class="text-green-600 hover:text-green-500 text-sm font-semibold">
                          + Desconto
                        </button>
                      </div>
                    </div>
                  </div>
                `
              : html`<div></div>`}
            <!-- Totals -->
            ${this.pdfOptions.includedSections.resumo
              ? html`
                  <div class="self-start">
                    <h3
                      class="text-xl font-semibold mb-3 border-b border-gray-300 pb-2">
                      Resumo Financeiro
                    </h3>
                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-500">Subtotal Itens</span>
                        <span>${formatCurrency(totais.subtotal_itens)}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-500">Taxas</span>
                        <span>${formatCurrency(totais.taxas)}</span>
                      </div>
                      <div class="flex justify-between text-green-600">
                        <span>Descontos</span>
                        <span>- ${formatCurrency(totais.descontos)}</span>
                      </div>
                      <div
                        class="flex justify-between font-bold text-xl mt-4 border-t-2 border-gray-400 pt-2">
                        <span>Total Geral</span>
                        <span class="text-blue-700"
                          >${formatCurrency(totais.total_geral)}</span
                        >
                      </div>
                    </div>
                  </div>
                `
              : html`<div></div>`}
          </div>

          <!-- Conditions -->
          ${this.pdfOptions.includedSections.condicoes
            ? html`
                <div class="mb-6">
                  <h3
                    class="text-xl font-semibold mb-3 border-b border-gray-300 pb-2">
                    Condições e Observações
                  </h3>
                  <div
                    class="text-gray-700 text-sm outline-none prose max-w-none"
                    contenteditable="true"
                    data-path="condicoes.observacoes"
                    @blur=${this.handleBudgetEdit}
                    aria-label="Edite as condições e observações aqui">
                    ${unsafeHTML(condicoes.observacoes)}
                  </div>
                </div>
              `
            : ''}

          <!-- Action Buttons -->
          <div
            class="mt-12 pt-6 border-t border-gray-300 flex items-center justify-end gap-4 no-print">
            <button
              @click=${this.discardChanges}
              class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
              Descartar
            </button>
            <button
              @click=${() => (this.showPdfOptions = true)}
              class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
              Personalizar
            </button>
            <button
              @click=${() => window.print()}
              class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
              Imprimir / PDF
            </button>
            <button
              @click=${this.saveChanges}
              class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
              Salvar
            </button>
          </div>
        </div>
      </div>
      ${this.renderPdfOptionsModal()}
    `;
  }

  render() {
    return html`
      <div>
        ${this.showBudgetPreview
          ? this.renderBudgetPreview()
          : html`
              <div class="header">
                <h1>MegaSom&Luz</h1>
                <p>Seu Orçamento Interativo</p>
              </div>

              <gdm-live-audio-visuals-3d
                .inputNode=${this.inputNode}
                .outputNode=${this.outputNode}></gdm-live-audio-visuals-3d>

              <div id="status">${this.error || this.status}</div>

              ${this.lastResponse && !this.showBudgetPreview
                ? html`
                    <div class="ai-response-container">
                      <div class="ai-response-header">
                        <span>Resposta da IA:</span>
                        <button 
                          @click=${this.clearTextResponse}
                          class="clear-response-btn"
                          title="Limpar resposta">
                          ×
                        </button>
                      </div>
                      <div class="ai-response-content">
                        ${unsafeHTML(this.lastResponse.replace(/\n/g, '<br>'))}
                      </div>
                    </div>
                  `
                : ''}

              <input
                type="file"
                id="file-upload"
                @change=${this.handleFileUpload}
                style="display: none;"
                accept=".pdf"
                multiple />

              <div class="controls">
                <button
                  id="startButton"
                  @click=${this.startRecording}
                  ?disabled=${this.isRecording}
                  title="Iniciar Gravação">
                  <svg
                    viewBox="0 0 100 100"
                    width="32px"
                    height="32px"
                    fill="#c80000"
                    xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" />
                  </svg>
                </button>
                <button
                  id="stopButton"
                  @click=${this.stopRecording}
                  ?disabled=${!this.isRecording}
                  title="Parar Gravação">
                  <svg
                    viewBox="0 0 100 100"
                    width="32px"
                    height="32px"
                    fill="#ffffff"
                    xmlns="http://www.w3.org/2000/svg">
                    <rect x="15" y="15" width="70" height="70" rx="15" />
                  </svg>
                </button>
                <button
                  id="uploadButton"
                  @click=${() => {
                    // FIX: Property 'renderRoot' does not exist on type 'GdmLiveAudio'. Replaced with 'this.shadowRoot'.
                    (
                      this.shadowRoot!.querySelector(
                        '#file-upload',
                      ) as HTMLElement
                    ).click();
                  }}
                  ?disabled=${this.isRecording}
                  title="Carregar Orçamento">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="40px"
                    viewBox="0 -960 960 960"
                    width="40px"
                    fill="#ffffff">
                    <path
                      d="M440-320v-326L330-536l-56-56 206-206 206 206-56 56-110-110v326h-80ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" />
                  </svg>
                </button>
                <button
                  id="resetButton"
                  @click=${this.reset}
                  ?disabled=${this.isRecording}
                  title="Reiniciar Sessão">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="40px"
                    viewBox="0 -960 960 960"
                    width="40px"
                    fill="#ffffff">
                    <path
                      d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
                  </svg>
                </button>
              </div>
            `}
      </div>
    `;
  }
}