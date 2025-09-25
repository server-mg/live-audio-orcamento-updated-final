Certo! Com base no padrão fornecido, aqui está o prompt de regras para o agente de desenvolvimento do "Live Audio-Orçamento", formatado para ser copiado e colado diretamente no seu sistema de regras:

---
description: 'Instruções detalhadas para o desenvolvimento do sistema "Live Audio-Orçamento", cobrindo IA, 3D, geração de orçamentos e frontend.'
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.html", "**/*.css", "package.json", ".env.local"]
alwaysApply: true
---

# Live Audio-Orçamento Development Guide

## Purpose

Este documento serve como o guia principal para o agente de desenvolvimento do "Live Audio-Orçamento". Ele descreve as especificações técnicas, funcionais e de UX para a construção de um sistema inteligente de geração de orçamentos audiovisuais, garantindo a adesão às tecnologias, arquitetura e objetivos do projeto.

## Guidelines

-   **Adesão Estrita às Tecnologias:** Utilize exclusivamente Lit Element, TypeScript, Tailwind CSS, Three.js, Google Gemini, PDF.js, Web Audio API e Vite. Não introduza novas bibliotecas ou frameworks.
-   **Estrutura do Projeto:** Mantenha a estrutura de pastas e arquivos definida na documentação (`projeto/`, `src/`, `visual-3d.ts`, `analyser.ts`, etc.) para garantir modularidade e manutenibilidade.
-   **Qualidade e UX:** Todas as funcionalidades devem ser implementadas com foco em performance, responsividade e uma experiência de usuário intuitiva e profissional.
-   **Integração Gemini:** Garanta que a integração da API do Google Gemini (`GEMINI_API_KEY`) seja feita via variáveis de ambiente (`.env.local`) e que o processamento de voz (entrada/saída) funcione em tempo real com português brasileiro.
-   **Visualização 3D:** Desenvolva as esferas 3D usando Three.js e shaders customizados, garantindo que reajam dinamicamente ao áudio e à conversa.
-   **Geração de Orçamentos:** Implemente a funcionalidade de criação, categorização automática (Som, Iluminação, Pista, LED), edição (considerar um mock para colaboração inicial) e exportação de orçamentos para PDF com templates customizáveis.
-   **Aprendizado e Analytics:** Desenvolva o sistema de aprendizado de padrões e preferências do usuário. Integre o módulo de analytics para rastrear edições e fornecer insights.
-   **HTTPS para Microfone:** Assegure que o projeto possa ser executado com HTTPS em desenvolvimento para permitir o uso do microfone, seguindo as instruções de geração de certificados.
-   **Documentação e Testes:** Mantenha a documentação (README, SETUP.md) atualizada. Implemente testes unitários e de integração para as funcionalidades críticas.
-   **Checklist de Verificação:** Ao finalizar etapas ou o projeto, use o "Checklist de Verificação" na documentação para garantir que todos os requisitos foram atendidos.

## Examples

### ✅ Correct Usage

```typescript
// Exemplo de integração do Gemini com Web Audio API
import { GoogleGenerativeLanguageServiceClient } from '@google/generative-ai';
import { LitElement, html, css } from 'lit';
import * as THREE from 'three';

// Processamento de entrada de voz
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyserNode = audioContext.createAnalyser();

// Exemplo de componente Lit Element
class BudgetApp extends LitElement {
    static styles = css`/* Tailwind CSS styles */`;
    render() {
        return html`
            <div class="flex flex-col h-screen bg-gray-900 text-white">
                <canvas id="three-canvas"></canvas>
                <div class="chat-interface">
                    <button @click="${this._startVoiceInput}">Falar</button>
                    <p>${this.currentGeminiResponse}</p>
                </div>
            </div>
        `;
    }
    _startVoiceInput() {
        // Lógica para iniciar reconhecimento de voz e enviar para Gemini
    }
}
customElements.define('budget-app', BudgetApp);

// Exemplo de exportação para PDF usando um template
// (A implementação real envolveria uma biblioteca de PDF como pdf-lib ou jsPDF)
function exportBudgetToPdf(budgetData) {
    console.log("Gerando PDF para:", budgetData);
    // ... lógica de geração de PDF aqui ...
}
```

### ❌ Avoid This

```javascript
// Evitar o uso de JavaScript vanilla ou bibliotecas não especificadas para UI
// Ex: new Vue() ou document.createElement('div') em vez de Lit Element.
// Ex: Usar um CSS inline extenso em vez de Tailwind CSS ou classes CSS adequadas.
// Ex: Acessar diretamente a API do Gemini sem encapsulamento ou variáveis de ambiente.
// Ex: Criar código 3D sem utilizar Three.js ou sem reagir ao áudio.

// Incorrect: Hardcoding API key
const GEMINI_API_KEY = "YOUR_HARDCODED_KEY";

// Incorrect: Manual DOM manipulation outside Lit's lifecycle
document.getElementById('my-element').innerHTML = 'New content';

// Incorrect: Ignoring TypeScript for core logic
function calculatePrice(items, discount) { // No type annotations
    return items.reduce((sum, item) => sum + item.price, 0) - discount;
}
```

## Additional Context

-   **Referência:** Consulte a documentação original do projeto (README.md) para detalhes completos sobre funcionalidades, estrutura e scripts.
-   **Google AI Studio:** Para chaves de API do Gemini, visite: [https://aistudio.google.com/](https://aistudio.google.com/)
-   **Lit Element Docs:** [https://lit.dev/docs/](https://lit.dev/docs/)
-   **Three.js Docs:** [https://threejs.org/docs/](https://threejs.org/docs/)
-   **Tailwind CSS Docs:** [https://tailwindcss.com/docs](https://tailwindcss.com/docs)
-   **SETUP.md:** `SETUP.md` - Guia detalhado de instalação e configuração do ambiente.
