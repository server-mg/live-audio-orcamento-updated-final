# Setup Completo - Live Audio-Orçamento

## 🚀 Guia de Instalação

### Pré-requisitos
- Node.js 18+ 
- NPM ou Yarn
- Navegador moderno (Chrome 88+, Firefox 85+, Safari 14.1+)

### 1. Clonar e Instalar
```bash
# Clonar o repositório
git clone [URL_DO_REPO]
cd live-audio-orcamento-updated-final

# Instalar dependências
npm install
```

### 2. Configurar API Key do Google Gemini

**Obter API Key:**
1. Acesse https://aistudio.google.com/
2. Faça login com sua conta Google
3. Clique em "Get API Key"
4. Crie uma nova API key
5. Copie a chave gerada

**Configurar localmente:**
1. O arquivo `.env.local` já existe na raiz do projeto
2. Abra o arquivo e substitua `YOUR_GEMINI_API_KEY_HERE` pela sua chave real:

```env
GEMINI_API_KEY=sua_chave_aqui_sem_aspas
```

### 3. Executar o Projeto
```bash
npm run dev
```

A aplicação estará disponível em: `http://localhost:3000`

## 🔧 Configurações Avançadas

### HTTPS para Produção (Opcional)
Para usar microfone em produção, você precisa de HTTPS. Para desenvolvimento local, use:

```bash
# Criar pasta para certificados
mkdir certs

# Gerar certificado auto-assinado (macOS/Linux)
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost"

# Windows (usar Git Bash ou WSL)
```

O Vite detectará automaticamente os certificados e habilitará HTTPS.

### Variáveis de Ambiente Opcionais

No `.env.local`, você pode configurar:

```env
# API do Gemini
GEMINI_API_KEY=sua_chave_aqui

# Timeout para API calls (em ms)
VITE_API_TIMEOUT=30000

# Debug mode (true/false)
VITE_DEBUG=false
```

## 🧪 Testes e Validação

### Verificar Funcionamento:

1. **API Connection**: A página deve mostrar "Conectado. Pronto para ajudar com seu evento!"
2. **Microfone**: Clicar no botão vermelho deve pedir permissão do microfone
3. **3D Visuals**: Esferas 3D devem aparecer no canto superior esquerdo
4. **Upload PDF**: Botão de upload deve processar PDFs corretamente

### Resolução de Problemas Comuns:

**❌ "Configure sua GEMINI_API_KEY"**
- Verifique se `.env.local` existe e tem a chave correta
- Reinicie o servidor após alterar o arquivo

**❌ "Permissão do microfone negada"**
- Permita acesso ao microfone no navegador
- Em Chrome: ícone de cadeado na barra de endereços > Permitir microfone

**❌ "Microfone requer HTTPS"**
- Use `http://localhost:3000` (permite microfone)
- Ou configure HTTPS conforme instruções acima

**❌ Visualizações 3D não aparecem**
- Verifique se WebGL está habilitado
- Desabilite extensões que bloqueiam WebGL
- Teste em modo incógnito

**❌ PDFs não processam**
- Verifique conexão com internet (usa CDN)
- Teste com PDFs menores primeiro
- Verifique console do navegador para erros

## 📁 Estrutura de Arquivos

```
projeto/
├── .env.local              # ✅ Configurações
├── package.json            # ✅ Dependências
├── vite.config.ts          # ✅ Configuração build
├── tsconfig.json           # ✅ TypeScript config
├── index.html              # ✅ HTML principal
├── index.tsx               # ✅ Componente principal
├── analyser.ts             # ✅ Análise de áudio
├── utils.ts                # ✅ Utilitários
├── visual-3d.ts            # ✅ Visualizações 3D
├── backdrop-shader.ts      # ✅ Shader do fundo
├── sphere-shader.ts        # ✅ Shader da esfera
├── public/
│   └── piz_compressed.exr  # ✅ Textura HDR
├── src/
│   └── utils/
│       └── editAnalytics.ts # ✅ Sistema de analytics
└── certs/                  # 📁 Certificados HTTPS (opcional)
    ├── key.pem
    └── cert.pem
```

## 🎯 Comandos Principais

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview

# Limpar cache
npm run dev -- --force
```

## 🔍 Debug e Analytics

### Console do Navegador:
- Pressione F12 para abrir DevTools
- Aba Console mostra logs da aplicação
- Filtrar por "EditAnalytics" para ver edições

### Analytics Button:
- Após editar um orçamento, clique no botão "Ver Analytics"
- Mostra estatísticas de campos mais editados

### Variables Globais (Debug):
```javascript
// No console do navegador:
console.log(window.__budgetEditCounts);  // Contadores de edição
console.log(window.__editAnalytics);     // Sistema completo
window.__showBudgetAnalytics();          // Mostrar analytics
```

## ✅ Checklist Final

- [ ] Node.js instalado
- [ ] Dependências instaladas (`npm install`)
- [ ] API Key configurada no `.env.local`
- [ ] Servidor rodando (`npm run dev`)
- [ ] Página abre em `http://localhost:3000`
- [ ] Mensagem "Conectado. Pronto para ajudar"
- [ ] Microfone funciona (permissão concedida)
- [ ] Visualizações 3D aparecem
- [ ] Upload de PDF funciona
- [ ] Orçamentos são gerados corretamente

**🎉 Se todos os itens estão ✅, a ferramenta está funcionando perfeitamente!**

## 📞 Suporte

Se encontrar problemas:
1. Verifique console do navegador (F12)
2. Teste em modo incógnito
3. Verifique se `.env.local` está correto
4. Reinicie o servidor
5. Teste em navegador diferente