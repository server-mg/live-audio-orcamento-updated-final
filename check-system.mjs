#!/usr/bin/env node

/**
 * Script de verificação do sistema Live Audio-Orçamento
 * Verifica se todos os componentes estão funcionando corretamente
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  const color = exists ? 'green' : 'red';
  log(`${status} ${description}: ${filePath}`, color);
  return exists;
}

function checkEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    log('❌ Arquivo .env.local não encontrado', 'red');
    return false;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const apiKeyLine = content.split('\n').find(line => line.startsWith('GEMINI_API_KEY='));
  const hasApiKey = apiKeyLine && 
                   apiKeyLine.length > 15 && 
                   !apiKeyLine.includes('YOUR_GEMINI_API_KEY_HERE');
  
  if (hasApiKey) {
    log('✅ API Key configurada no .env.local', 'green');
    return true;
  } else {
    log('⚠️  API Key não configurada no .env.local', 'yellow');
    log('   Configure sua chave do Gemini em https://aistudio.google.com/', 'yellow');
    return false;
  }
}

function checkPackageJson() {
  const packagePath = path.join(__dirname, 'package.json');
  if (!fs.existsSync(packagePath)) {
    log('❌ package.json não encontrado', 'red');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const requiredDeps = ['lit', '@google/genai', 'three', '@lit/context'];
  
  let allDepsOk = true;
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      log(`✅ Dependência ${dep} encontrada`, 'green');
    } else {
      log(`❌ Dependência ${dep} ausente`, 'red');
      allDepsOk = false;
    }
  });

  return allDepsOk;
}

function checkNodeModules() {
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  const exists = fs.existsSync(nodeModulesPath);
  
  if (exists) {
    log('✅ node_modules existe', 'green');
    
    // Verificar algumas dependências específicas
    const criticalDeps = ['lit', 'three', 'vite'];
    criticalDeps.forEach(dep => {
      const depPath = path.join(nodeModulesPath, dep);
      if (fs.existsSync(depPath)) {
        log(`✅ ${dep} instalado`, 'green');
      } else {
        log(`❌ ${dep} não instalado`, 'red');
      }
    });
    
    return true;
  } else {
    log('❌ node_modules não encontrado. Execute: npm install', 'red');
    return false;
  }
}

function main() {
  log('\n🔍 VERIFICAÇÃO DO SISTEMA LIVE AUDIO-ORÇAMENTO\n', 'bold');

  let allChecksPass = true;

  // Verificar arquivos essenciais
  log('📁 ARQUIVOS ESSENCIAIS:', 'blue');
  allChecksPass &= checkFile('package.json', 'Package.json');
  allChecksPass &= checkFile('vite.config.ts', 'Configuração Vite');
  allChecksPass &= checkFile('tsconfig.json', 'Configuração TypeScript');
  allChecksPass &= checkFile('index.html', 'HTML principal');
  allChecksPass &= checkFile('index.tsx', 'Componente principal');
  allChecksPass &= checkFile('visual-3d.ts', 'Visualizações 3D');
  allChecksPass &= checkFile('analyser.ts', 'Analisador de áudio');
  allChecksPass &= checkFile('utils.ts', 'Utilitários');
  
  console.log('');

  // Verificar configuração
  log('⚙️  CONFIGURAÇÃO:', 'blue');
  allChecksPass &= checkEnvFile();
  allChecksPass &= checkPackageJson();
  
  console.log('');

  // Verificar dependências
  log('📦 DEPENDÊNCIAS:', 'blue');
  allChecksPass &= checkNodeModules();
  
  console.log('');

  // Verificar arquivos públicos
  log('🎨 RECURSOS:', 'blue');
  allChecksPass &= checkFile('public/piz_compressed.exr', 'Textura HDR');
  allChecksPass &= checkFile('src/utils/editAnalytics.ts', 'Sistema de Analytics');
  
  console.log('');

  // Resultado final
  if (allChecksPass) {
    log('🎉 SISTEMA VERIFICADO COM SUCESSO!', 'green');
    log('\n📋 PRÓXIMOS PASSOS:', 'bold');
    log('1. Configure sua API Key no .env.local se ainda não fez', 'blue');
    log('2. Execute: npm run dev', 'blue');
    log('3. Acesse: http://localhost:3000', 'blue');
    log('4. Permita acesso ao microfone quando solicitado', 'blue');
    log('5. Comece a conversar sobre seu evento!', 'blue');
  } else {
    log('⚠️  PROBLEMAS ENCONTRADOS', 'yellow');
    log('\n🔧 SOLUÇÕES:', 'bold');
    log('1. Execute: npm install', 'yellow');
    log('2. Configure .env.local com sua API Key', 'yellow');
    log('3. Execute este script novamente', 'yellow');
  }

  console.log('');
  log('📚 Documentação completa: SETUP.md', 'blue');
  log('🌐 Obter API Key: https://aistudio.google.com/', 'blue');
  
  process.exit(allChecksPass ? 0 : 1);
}

main();