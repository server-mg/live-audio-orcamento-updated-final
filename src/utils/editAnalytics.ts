/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * EditAnalytics - Sistema de analytics para edições de orçamento
 * Compatible com Lit Element, substitui o hook React anterior
 */
export class EditAnalytics {
  private editCounts: Record<string, number> = {};
  private editHistory: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    timestamp: Date;
    sessionId: string;
  }> = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    // Expor globalmente para debug (compatibilidade com código existente)
    (window as any).__budgetEditCounts = this.editCounts;
    (window as any).__editAnalytics = this;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Registra uma edição de campo
   */
  recordFieldEdit(field: string, oldValue: any = null, newValue: any = null): void {
    // Incrementar contador
    const currentCount = this.editCounts[field] || 0;
    this.editCounts[field] = currentCount + 1;

    // Adicionar ao histórico
    this.editHistory.push({
      field,
      oldValue,
      newValue,
      timestamp: new Date(),
      sessionId: this.sessionId,
    });

    // Atualizar referência global
    (window as any).__budgetEditCounts = this.editCounts;

    // Debug log se habilitado
    if (process.env.VITE_DEBUG === 'true') {
      console.log(`[EditAnalytics] Campo '${field}' editado ${this.editCounts[field]} vez(es)`);
    }

    // Analytics granular do pipeline
    this.trackPipelineMetrics(field, newValue);
  }

  /**
   * Rastreamento detalhado do pipeline de processamento com performance
   */
  private trackPipelineMetrics(field: string, value: any): void {
    // Métricas específicas por tipo de evento
    switch (field) {
      case 'ai_response_type':
        this.incrementMetric('pipeline_responses_by_type', value);
        break;
        
      case 'budget_generated':
        this.incrementMetric('budgets_generated_total');
        if (value.generation_method) {
          this.incrementMetric('budgets_by_method', value.generation_method);
        }
        break;
        
      case 'text_extraction_success':
        this.incrementMetric(value ? 'text_extraction_success' : 'text_extraction_failure');
        break;
        
      case 'json_parsing_failure':
        this.incrementMetric('json_parsing_failures');
        // Rastrear tipos de erro JSON
        if (value.error) {
          this.incrementMetric('json_error_types', value.error.split(' ')[0]);
        }
        break;
        
      // === NOVAS MÉTRICAS DE PERFORMANCE ===
      case 'parser_performance_json_ms':
        this.recordPerformanceMetric('json_parsing_time', value);
        break;
        
      case 'parser_performance_fallback_ms':
        this.recordPerformanceMetric('fallback_parsing_time', value.duration || value);
        if (typeof value === 'object') {
          this.incrementMetric(value.success ? 'fallback_success' : 'fallback_failure');
        }
        break;
        
      case 'parser_performance_total':
        this.recordPerformanceMetric('total_parsing_time', value.totalTime);
        this.recordPerformanceMetric('parsing_efficiency', value.efficiency);
        this.incrementMetric('parsing_methods', value.method);
        
        // Categorizar performance
        if (value.totalTime > 100) {
          this.incrementMetric('slow_parsing_instances');
        } else if (value.totalTime < 10) {
          this.incrementMetric('fast_parsing_instances');
        }
        break;
        
      case 'parser_slow_warning':
        this.incrementMetric('performance_warnings');
        this.recordPerformanceMetric('slowness_factor', value.slownessFactor);
        break;
        
      case 'text_parsing_breakdown':
        // Rastrear qual step é mais lento
        const slowestStep = value.slowestStep;
        if (slowestStep) {
          this.incrementMetric('slowest_parsing_steps', slowestStep.step);
          this.recordPerformanceMetric(`step_${slowestStep.step}_time`, slowestStep.time);
        }
        break;
        
      case 'response_processing_time':
        this.recordPerformanceMetric('response_time', value);
        break;
    }
  }

  private metrics: Record<string, any> = {};
  private performanceMetrics: Record<string, number[]> = {};

  private incrementMetric(key: string, subkey?: string): void {
    if (subkey) {
      if (!this.metrics[key]) this.metrics[key] = {};
      this.metrics[key][subkey] = (this.metrics[key][subkey] || 0) + 1;
    } else {
      this.metrics[key] = (this.metrics[key] || 0) + 1;
    }
  }

  private recordPerformanceMetric(key: string, value: number): void {
    if (!this.performanceMetrics[key]) this.performanceMetrics[key] = [];
    this.performanceMetrics[key].push(value);
    
    // Manter apenas últimas 100 medições
    if (this.performanceMetrics[key].length > 100) {
      this.performanceMetrics[key] = this.performanceMetrics[key].slice(-100);
    }
  }

  /**
   * Obter estatísticas completas + métricas do pipeline com análises avançadas
   */
  getStats() {
    const totalEdits = Object.values(this.editCounts).reduce((sum, count) => sum + count, 0);
    const mostEditedField = Object.entries(this.editCounts)
      .sort(([,a], [,b]) => b - a)[0];

    // Calcular estatísticas detalhadas de performance
    const performanceStats = {};
    for (const [key, values] of Object.entries(this.performanceMetrics)) {
      if (values.length === 0) continue;
      
      const sorted = [...values].sort((a, b) => a - b);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      // Calcular mediana
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      
      // Calcular P95 (95th percentile)
      const p95Index = Math.floor(sorted.length * 0.95);
      const p95 = sorted[p95Index] || sorted[sorted.length - 1];
      
      // Calcular desvio padrão
      const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      // Análise de tendência (últimas 10 medições)
      const recent = values.slice(-10);
      const trend = recent.length >= 2 ? this.calculateTrend(recent) : 'stable';
      
      // Classificação de performance
      const classification = this.classifyPerformance(key, avg, p95);
      
      performanceStats[key] = {
        avg: Math.round(avg * 100) / 100,
        min,
        max,
        median: Math.round(median * 100) / 100,
        p95: Math.round(p95 * 100) / 100,
        stdDev: Math.round(stdDev * 100) / 100,
        count: values.length,
        trend,
        classification,
        consistency: stdDev < (avg * 0.2) ? 'high' : stdDev < (avg * 0.5) ? 'medium' : 'low'
      };
    }

    // Análises de eficiência do parser
    const parsingAnalysis = this.analyzeParsingEfficiency();
    
    return {
      // Estatísticas básicas
      edits: { ...this.editCounts },
      totalEdits,
      mostEditedField: mostEditedField ? {
        field: mostEditedField[0],
        count: mostEditedField[1]
      } : null,
      sessionId: this.sessionId,
      startTime: this.editHistory[0]?.timestamp || null,
      lastEdit: this.editHistory[this.editHistory.length - 1]?.timestamp || null,
      
      // Métricas do pipeline
      pipelineMetrics: { ...this.metrics },
      performanceMetrics: performanceStats,
      
      // Análises derivadas expandidas
      analysis: {
        avgResponseTime: performanceStats['response_time']?.avg || 0,
        successRate: this.calculateSuccessRate(),
        mostUsedResponseType: this.getMostUsedResponseType(),
        extractionEfficiency: this.calculateExtractionEfficiency(),
        parsingEfficiency: parsingAnalysis,
        performanceSummary: this.getPerformanceSummary(performanceStats),
        warnings: this.getPerformanceWarnings(performanceStats)
      }
    };
  }

  private calculateSuccessRate(): number {
    const total = (this.metrics['text_extraction_success'] || 0) + (this.metrics['text_extraction_failure'] || 0);
    if (total === 0) return 100;
    return Math.round((this.metrics['text_extraction_success'] || 0) / total * 100);
  }

  private getMostUsedResponseType(): string | null {
    const responseTypes = this.metrics['pipeline_responses_by_type'];
    if (!responseTypes) return null;
    
    return Object.entries(responseTypes)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || null;
  }

  private calculateExtractionEfficiency(): number {
    const structured = this.metrics['budgets_by_method']?.['structured'] || 0;
    const extracted = this.metrics['budgets_by_method']?.['text_extraction'] || 0;
    const total = structured + extracted;
    
    if (total === 0) return 100;
    return Math.round(structured / total * 100);
  }

  /**
   * Calcular tendência das métricas (melhoria/piora)
   */
  private calculateTrend(values: number[]): 'improving' | 'degrading' | 'stable' {
    if (values.length < 3) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (Math.abs(changePercent) < 5) return 'stable';
    return changePercent < 0 ? 'improving' : 'degrading'; // Menor tempo = melhor
  }

  /**
   * Classificar performance (excelente/boa/regular/ruim)
   */
  private classifyPerformance(metricKey: string, avg: number, p95: number): string {
    const thresholds = {
      'json_parsing_time': { excellent: 5, good: 15, regular: 50 },
      'fallback_parsing_time': { excellent: 20, good: 50, regular: 150 },
      'total_parsing_time': { excellent: 30, good: 80, regular: 200 },
      'response_time': { excellent: 100, good: 300, regular: 800 }
    };
    
    const threshold = thresholds[metricKey] || { excellent: 50, good: 150, regular: 400 };
    
    if (p95 <= threshold.excellent) return 'excellent';
    if (p95 <= threshold.good) return 'good';
    if (p95 <= threshold.regular) return 'regular';
    return 'poor';
  }

  /**
   * Analisar eficiência geral do sistema de parsing
   */
  private analyzeParsingEfficiency(): any {
    const jsonTime = this.performanceMetrics['json_parsing_time'] || [];
    const fallbackTime = this.performanceMetrics['fallback_parsing_time'] || [];
    const totalCalls = jsonTime.length + fallbackTime.length;
    
    if (totalCalls === 0) {
      return {
        jsonSuccessRate: 100,
        fallbackUsageRate: 0,
        avgJsonTime: 0,
        avgFallbackTime: 0,
        recommendation: 'Nenhum dado disponível'
      };
    }
    
    const jsonSuccessRate = Math.round((jsonTime.length / totalCalls) * 100);
    const fallbackUsageRate = Math.round((fallbackTime.length / totalCalls) * 100);
    
    const avgJsonTime = jsonTime.length > 0 
      ? Math.round((jsonTime.reduce((sum, val) => sum + val, 0) / jsonTime.length) * 100) / 100
      : 0;
    
    const avgFallbackTime = fallbackTime.length > 0
      ? Math.round((fallbackTime.reduce((sum, val) => sum + val, 0) / fallbackTime.length) * 100) / 100
      : 0;
    
    // Gerar recomendação
    let recommendation = '';
    if (fallbackUsageRate > 30) {
      recommendation = '⚠️ Alto uso de fallback. Considere melhorar prompts para JSON estruturado.';
    } else if (avgFallbackTime > 100) {
      recommendation = '🐌 Fallback parsing lento. Considere otimizar regexes.';
    } else if (jsonSuccessRate > 80 && avgJsonTime < 10) {
      recommendation = '✅ Parsing eficiente! Sistema funcionando bem.';
    } else {
      recommendation = '📈 Performance moderada. Monitore tendências.';
    }
    
    return {
      jsonSuccessRate,
      fallbackUsageRate,
      avgJsonTime,
      avgFallbackTime,
      recommendation
    };
  }

  /**
   * Resumo geral de performance
   */
  private getPerformanceSummary(performanceStats: any): string {
    const criticalMetrics = ['total_parsing_time', 'response_time'];
    const poorPerformance = criticalMetrics.filter(
      metric => performanceStats[metric]?.classification === 'poor'
    );
    
    if (poorPerformance.length > 0) {
      return `⚠️ Performance crítica em: ${poorPerformance.join(', ')}`;
    }
    
    const excellentCount = Object.values(performanceStats)
      .filter((stats: any) => stats.classification === 'excellent').length;
    
    if (excellentCount >= 2) {
      return '✅ Performance excelente em geral!';
    }
    
    return '📈 Performance adequada - monitore tendências.';
  }

  /**
   * Alertas de performance
   */
  private getPerformanceWarnings(performanceStats: any): string[] {
    const warnings = [];
    
    // Warning para parsing muito lento
    if (performanceStats['total_parsing_time']?.p95 > 200) {
      warnings.push('🐌 Parsing P95 > 200ms - considere otimizações');
    }
    
    // Warning para inconsistência
    const inconsistentMetrics = Object.entries(performanceStats)
      .filter(([_, stats]: any) => stats.consistency === 'low')
      .map(([key, _]) => key);
    
    if (inconsistentMetrics.length > 0) {
      warnings.push(`📉 Métricas inconsistentes: ${inconsistentMetrics.join(', ')}`);
    }
    
    // Warning para tendência de degradação
    const degradingMetrics = Object.entries(performanceStats)
      .filter(([_, stats]: any) => stats.trend === 'degrading')
      .map(([key, _]) => key);
    
    if (degradingMetrics.length > 0) {
      warnings.push(`📉 Tendência de piora: ${degradingMetrics.join(', ')}`);
    }
    
    return warnings;
  }

  /**
   * Obter histórico completo de edições
   */
  getHistory() {
    return [...this.editHistory];
  }

  /**
   * Obter histórico de um campo específico
   */
  getFieldHistory(field: string) {
    return this.editHistory.filter(edit => edit.field === field);
  }

  /**
   * Resetar todos os dados + métricas
   */
  reset(): void {
    this.editCounts = {};
    this.editHistory = [];
    this.metrics = {};
    this.performanceMetrics = {};
    this.sessionId = this.generateSessionId();
    (window as any).__budgetEditCounts = this.editCounts;

    if (process.env.VITE_DEBUG === 'true') {
      console.log('[EditAnalytics] Dados resetados + métricas limpas');
    }
  }

  /**
   * Exportar dados para análise externa
   */
  exportData() {
    return {
      stats: this.getStats(),
      history: this.getHistory(),
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Função global para mostrar analytics completo com métricas expandidas
   */
  static showAnalytics(editCounts?: Record<string, number>) {
    const counts = editCounts || (window as any).__budgetEditCounts || {};
    const analytics = (window as any).__editAnalytics as EditAnalytics;
    
    if (!analytics) {
      console.warn('EditAnalytics não inicializado');
      return;
    }

    const stats = analytics.getStats();
    
    console.group('📊 Budget Edit Analytics COMPLETO v2.0');
    
    // Estatísticas básicas
    console.group('📋 Básico');
    console.log('Total de edições:', stats.totalEdits);
    console.log('Campo mais editado:', stats.mostEditedField);
    console.log('Edições por campo:', stats.edits);
    console.log('Sessão:', stats.sessionId);
    console.log('Período:', {
      início: stats.startTime,
      última: stats.lastEdit
    });
    console.groupEnd();
    
    // Métricas do pipeline
    console.group('🔧 Pipeline');
    console.log('Respostas por tipo:', stats.pipelineMetrics.pipeline_responses_by_type || 'Nenhuma');
    console.log('Orçamentos gerados:', stats.pipelineMetrics.budgets_generated_total || 0);
    console.log('Métodos de geração:', stats.pipelineMetrics.budgets_by_method || 'Nenhum');
    console.log('Extração de texto:', {
      sucessos: stats.pipelineMetrics.text_extraction_success || 0,
      falhas: stats.pipelineMetrics.text_extraction_failure || 0
    });
    console.log('Falhas JSON:', stats.pipelineMetrics.json_parsing_failures || 0);
    console.groupEnd();
    
    // Performance Expandida
    console.group('⚡ Performance Detalhada');
    console.log('Resumo Geral:', stats.analysis.performanceSummary);
    
    if (stats.analysis.warnings && stats.analysis.warnings.length > 0) {
      console.warn('⚠️ Alertas:');
      stats.analysis.warnings.forEach(warning => console.warn(`  • ${warning}`));
    }
    
    // Métricas detalhadas por categoria
    Object.entries(stats.performanceMetrics).forEach(([key, metrics]: [string, any]) => {
      console.group(`📈 ${key}`);
      console.log(`Média: ${metrics.avg}ms | Mediana: ${metrics.median}ms`);
      console.log(`Min: ${metrics.min}ms | Max: ${metrics.max}ms | P95: ${metrics.p95}ms`);
      console.log(`Desvio: ${metrics.stdDev}ms | Consistência: ${metrics.consistency}`);
      console.log(`Tendência: ${metrics.trend} | Classificação: ${metrics.classification}`);
      console.log(`Amostras: ${metrics.count}`);
      console.groupEnd();
    });
    
    // Análise de Parsing
    console.group('🧮 Eficiência de Parsing');
    const parsing = stats.analysis.parsingEfficiency;
    console.log(`Taxa de sucesso JSON: ${parsing.jsonSuccessRate}%`);
    console.log(`Uso de fallback: ${parsing.fallbackUsageRate}%`);
    console.log(`Tempo médio JSON: ${parsing.avgJsonTime}ms`);
    console.log(`Tempo médio fallback: ${parsing.avgFallbackTime}ms`);
    console.log(`Recomendação: ${parsing.recommendation}`);
    console.groupEnd();
    
    // Métricas consolidadas
    console.group('📊 Consolidado');
    console.log('Tempo médio de resposta:', `${stats.analysis.avgResponseTime.toFixed(2)}ms`);
    console.log('Taxa de sucesso:', `${stats.analysis.successRate}%`);
    console.log('Eficiência de extração:', `${stats.analysis.extractionEfficiency}%`);
    console.log('Tipo mais usado:', stats.analysis.mostUsedResponseType || 'Nenhum');
    console.groupEnd();
    
    console.groupEnd();

    // Modal expandido para o usuário
    if (typeof window !== 'undefined' && stats.totalEdits > 0) {
      const warnings = (stats.analysis.warnings && stats.analysis.warnings.length > 0) 
        ? `\n⚠️ Alertas:\n${stats.analysis.warnings.map(w => `• ${w}`).join('\n')}`
        : '';
      
      const performanceDetails = Object.entries(stats.performanceMetrics)
        .slice(0, 3) // Limitar para não sobrecarregar o modal
        .map(([key, metrics]: [string, any]) => 
          `• ${key}: ${metrics.avg.toFixed(1)}ms (${metrics.classification})`
        ).join('\n');
      
      const message = `
📊 Analytics do Orçamento EXPANDIDO:

📋 Básico:
• Total de edições: ${stats.totalEdits}
• Campo mais editado: ${stats.mostEditedField?.field || 'Nenhum'} (${stats.mostEditedField?.count || 0}x)

🔧 Pipeline:
• Orçamentos gerados: ${stats.pipelineMetrics.budgets_generated_total || 0}
• Taxa de sucesso: ${stats.analysis.successRate}%
• Eficiência: ${stats.analysis.extractionEfficiency}%

⚡ Performance:
${stats.analysis.performanceSummary}
${performanceDetails}

🧮 Parsing:
• JSON: ${stats.analysis.parsingEfficiency.jsonSuccessRate}% | ${stats.analysis.parsingEfficiency.avgJsonTime}ms
• Fallback: ${stats.analysis.parsingEfficiency.fallbackUsageRate}% | ${stats.analysis.parsingEfficiency.avgFallbackTime}ms

🔍 Recomendação: ${stats.analysis.parsingEfficiency.recommendation}${warnings}

🎯 Sessão: ${stats.sessionId.substring(0, 20)}...
      `.trim();
      
      // Usar modal customizado se disponível, caso contrário alert
      if ((window as any).showCustomModal) {
        (window as any).showCustomModal('Analytics Expandido', message);
      } else {
        alert(message);
      }
    }
  }
}

// Configurar função global para compatibilidade
if (typeof window !== 'undefined') {
  (window as any).__showBudgetAnalytics = EditAnalytics.showAnalytics;
}