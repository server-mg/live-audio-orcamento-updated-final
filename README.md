<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Live Audio-Orçamento 🎙️✨

> Sistema inteligente de geração de orçamentos audiovisuais com IA do Google Gemini, visualizações 3D em tempo real e interface conversacional por voz.

## 🎆 Funcionalidades Principais

### 🤖 **Inteligência Artificial Avançada**
- **Gemini 2.5 Flash**: Conversação natural em português brasileiro
- **Processamento de Voz**: Entrada e saída de áudio em tempo real
- **Aprendizado de Padrões**: Sistema aprende preferências do usuário
- **Análise de PDFs**: Extração inteligente de orçamentos existentes

### 🎨 **Visualizações 3D Interativas**
- Esferas 3D que reagem ao áudio usando **Three.js**
- Shaders customizados com efeitos de bloom
- Cores e animações que respondem à conversa
- Texturas HDR para realismo visual

### 📊 **Geração de Orçamentos**
- Orçamentos profissionais para eventos audiovisuais
- Categorização automática: Som, Iluminação, Pista, LED
- Edição colaborativa em tempo real
- Export para PDF com templates personalizados

### 📨 **Interface Profissional**
- **Lit Element**: Web Components modernos
- **TypeScript**: Tipagem estática para confiabilidade
- **Tailwind CSS**: Design responsivo e elegante
- **Vite**: Build otimizado e hot reload

## 🚀 Setup Rápido

### **Pré-requisitos**
- Node.js 18+
- Navegador moderno (Chrome, Firefox, Safari)
- Chave da API do Google Gemini

### **1. Instalação**
```bash
# Instalar dependências
npm install
```

### **2. Configurar API Key**
1. Obtenha sua chave em: https://aistudio.google.com/
2. Edite o arquivo `.env.local` na raiz do projeto:
```env
GEMINI_API_KEY=sua_chave_aqui
```

### **3. Executar**
```bash
npm run dev
```

Acesse: `http://localhost:3000`

## 🛠️ Comandos Disponíveis

```bash
# Desenvolvimento
npm run dev              # Servidor local
npm run dev:https        # Servidor com HTTPS

# Produção
npm run build           # Build otimizado
npm run preview         # Preview da build

# Utilitários
npm run type-check      # Verificação TypeScript
npm run clean           # Limpar cache
```

## 📁 Estrutura do Projeto

```
projeto/
├── .env.local              # ⚙️ Configurações de ambiente
├── index.tsx               # 🏠 Componente principal
├── visual-3d.ts            # 🎨 Visualizações 3D
├── analyser.ts             # 🔊 Análise de áudio
├── utils.ts                # 🔧 Utilitários
├── *-shader.ts             # 🌈 Shaders GLSL
├── src/
│   └── utils/
│       └── editAnalytics.ts # 📊 Sistema de analytics
├── public/
│   └── piz_compressed.exr   # 🌅 Textura HDR
└── SETUP.md                # 📝 Guia detalhado
```

## 🏢 Tecnologias Utilizadas

### **Frontend**
- **[Lit Element](https://lit.dev/)** - Web Components modernos
- **[TypeScript](https://www.typescriptlang.org/)** - JavaScript tipado
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework CSS utilitário
- **[Three.js](https://threejs.org/)** - Biblioteca 3D

### **IA & Processamento**
- **[Google Gemini](https://ai.google.dev/)** - Modelo de linguagem multimodal
- **[PDF.js](https://mozilla.github.io/pdf.js/)** - Processamento de PDFs
- **[Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)** - Processamento de áudio

### **Build & Dev**
- **[Vite](https://vitejs.dev/)** - Build tool moderna
- **[ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)** - Módulos nativos

## 🎯 Funcionalidades Detalhadas

### **Conversão por Voz**
- Processamento de áudio bidirecional
- Reconhecimento de voz em português
- Síntese de fala natural
- Tratamento de ruído e eco

### **Geração de Orçamentos**
- Identificação de tipo de evento
- Precificação inteligente por categoria
- Cálculo automático de taxas e descontos
- Validação de margens mínimas

### **Sistema de Aprendizado**
- Memória de clientes e projetos
- Padrões de precificação aprendidos
- Preferências de desconto e margem
- Analytics de edições em tempo real

### **Export e Impressão**
- Templates PDF personalizados
- Upload de logo da empresa
- Seções configuráveis
- Formatação A4 profissional

## 🔧 Configurações Avançadas

### **HTTPS para Produção**
Para usar microfone em produção, configure HTTPS:

```bash
mkdir certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
npm run dev:https
```

### **Variáveis de Ambiente**
```env
# API do Gemini
GEMINI_API_KEY=sua_chave_aqui

# Timeout para API calls (ms)
VITE_API_TIMEOUT=30000

# Debug mode
VITE_DEBUG=false
```

## 📈 Analytics e Debug

### **Sistema de Analytics**
- Rastreamento de edições por campo
- Histórico completo de alterações
- Estatísticas de uso em tempo real
- Export de dados para análise

### **Debug no Console**
```javascript
// Ver contadores de edição
console.log(window.__budgetEditCounts);

// Sistema completo de analytics
console.log(window.__editAnalytics);

// Mostrar estatísticas
window.__showBudgetAnalytics();
```

## ✅ Checklist de Verificação

- [ ] Node.js 18+ instalado
- [ ] Dependências instaladas
- [ ] API Key configurada
- [ ] Servidor rodando
- [ ] Mensagem "Conectado. Pronto para ajudar"
- [ ] Microfone funcionando
- [ ] Visualizações 3D aparecem
- [ ] Upload de PDF funciona
- [ ] Orçamentos são gerados

## 📝 Documentação Adicional

- **[SETUP.md](./SETUP.md)** - Guia completo de instalação
- **[Gemini API Docs](https://ai.google.dev/docs)** - Documentação da API
- **[Three.js Docs](https://threejs.org/docs/)** - Referência 3D
- **[Lit Docs](https://lit.dev/docs/)** - Web Components

## 👥 Contribuição

Este projeto foi desenvolvido para **MegaSom&Luz** como solução avançada de orçamentos audiovisuais.

## 📦 Licença

Apache-2.0 License - Consulte [LICENSE](./LICENSE) para detalhes.

---

<div align="center">

**🎆 Live Audio-Orçamento - Transformando orçamentos em experiências interativas 🎆**

View your app in AI Studio: https://ai.studio/apps/drive/14m1KOViomzMLFJ-uObLTIrC9GR85DUHB

</div>
