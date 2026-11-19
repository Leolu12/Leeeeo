/* Camada de modelo de linguagem: Claude (no link do claude.ai), modelo local no navegador (WebLLM)
   ou API compatível com OpenAI (OpenRouter, Groq, Gemini, Ollama). Sem IA, o jogo usa as frases por regras. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U;
  const KEY = 'skeld-ia-v1';
  const WEBLLM_URL = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/+esm';

  const WEBLLM_MODELS = [
    { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen 2.5 1.5B', note: 'leve · baixa ~1 GB · pede ~1,7 GB de memória de vídeo' },
    { id: 'gemma-2-2b-it-q4f16_1-MLC', name: 'Gemma 2 2B', note: 'bom em português · baixa ~1,4 GB · pede ~1,9 GB de memória de vídeo' },
    { id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC', name: 'Qwen 2.5 3B', note: 'melhor texto · baixa ~1,8 GB · pede ~2,5 GB de memória de vídeo' },
  ];

  const API_PRESETS = {
    openrouter: { name: 'OpenRouter (modelos grátis)', base: 'https://openrouter.ai/api/v1', model: 'google/gemma-4-31b-it:free', keyUrl: 'https://openrouter.ai/keys', needsKey: true },
    groq: { name: 'Groq (plano grátis)', base: 'https://api.groq.com/openai/v1', model: '', keyUrl: 'https://console.groq.com/keys', needsKey: true },
    gemini: { name: 'Google Gemini (plano grátis)', base: 'https://generativelanguage.googleapis.com/v1beta/openai', model: '', keyUrl: 'https://aistudio.google.com/apikey', needsKey: true },
    ollama: { name: 'Ollama no seu computador', base: 'http://localhost:11434/v1', model: 'llama3.2', keyUrl: 'https://ollama.com', needsKey: false },
    custom: { name: 'Outro endereço compatível com OpenAI', base: '', model: '', keyUrl: '', needsKey: false },
  };

  const DEFAULT_CFG = { mode: 'auto', webllmModel: WEBLLM_MODELS[0].id, webllmAuto: false, preset: 'openrouter', base: API_PRESETS.openrouter.base, key: '', model: API_PRESETS.openrouter.model };

  const LLM = {
    WEBLLM_MODELS, API_PRESETS,
    cfg: Object.assign({}, DEFAULT_CFG, U.store.get(KEY, {})),
    status: 'off', // off | available | ready | loading | limited | error
    provider: null, // 'claude' | 'webllm' | 'api'
    detail: '',
    progress: 0,
    claudeSample: null,
    claudeChecked: false,
    engine: null,
    hasWebGPU: typeof navigator !== 'undefined' && !!navigator.gpu,
    listeners: new Set(),
    running: 0,
    waiters: [],
    coolUntil: 0,
    stats: { calls: 0, fails: 0, ok: 0 },
    lastError: null,
    failStreak: 0,
    wantWarm: false,
    /* No link do claude.ai a página roda sem acesso à internet: só o Claude funciona lá. */
    inClaude: typeof window !== 'undefined' && !!(window.claude && (typeof window.claude.use === 'function' || typeof window.claude.complete === 'function')),
    claudeFlat: null,

    save() {
      U.store.set(KEY, this.cfg);
    },
    onChange(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    },
    set(status, detail, progress) {
      this.status = status;
      if (detail != null) this.detail = detail;
      if (progress != null) this.progress = progress;
      this.listeners.forEach((fn) => {
        try {
          fn(this);
        } catch (e) {
          /* ignora */
        }
      });
    },
    ready() {
      return this.status === 'ready' && Date.now() >= this.coolUntil;
    },
    label() {
      if (this.provider === 'claude') return 'Claude';
      if (this.provider === 'webllm') {
        const m = WEBLLM_MODELS.find((x) => x.id === this.cfg.webllmModel);
        return (m ? m.name : 'modelo local') + ' (no navegador)';
      }
      if (this.provider === 'api') return this.cfg.model || 'API';
      return 'regras';
    },

    /* Chamado no carregamento: descobre se o Claude está disponível (link do claude.ai). */
    async detect() {
      this.set(this.status, this.inClaude ? 'Procurando o Claude…' : this.detail);
      try {
        if (window.claude && typeof window.claude.use === 'function') {
          const s = await window.claude.use('sample');
          if (typeof s === 'function') this.claudeSample = s;
        } else if (window.claude && typeof window.claude.complete === 'function') {
          /* artefato de chat antigo: API "achatada" window.claude.complete(prompt) */
          this.claudeFlat = window.claude.complete;
        }
      } catch (e) {
        this.claudeSample = null;
      }
      this.claudeChecked = true;
      await this.applyMode(false);
      /* a partida começou antes de o Claude responder: pede a permissão agora */
      if (this.wantWarm && this.status === 'available') this.warmup();
    },
    hasClaude() {
      return !!(this.claudeSample || this.claudeFlat);
    },
    /* Chamado ao iniciar a partida (userAction) e ao abrir uma reunião. */
    ensure(userAction) {
      if (this.status === 'available') return this.warmup();
      if (userAction && this.status === 'limited' && Date.now() >= this.coolUntil) return this.retry();
      if (!this.claudeChecked && this.inClaude) this.wantWarm = true;
      return null;
    },
    /* Nova tentativa pedida pelo jogador (botão), depois de limite ou erro. */
    async retry() {
      this.coolUntil = 0;
      this.failStreak = 0;
      if (this.status === 'limited' || this.status === 'error') this.status = this.provider === 'claude' && !this.claudeGranted && !this.claudeFlat ? 'available' : 'ready';
      if (!this.provider) await this.applyMode(true);
      return this.test();
    },

    async applyMode(userAction) {
      const mode = this.cfg.mode;
      this.provider = null;
      if (mode === 'off') return this.set('off', 'Conversas por regras (sem IA).');
      if ((mode === 'auto' || mode === 'claude' || this.inClaude) && this.hasClaude()) {
        this.provider = 'claude';
        if (this.claudeGranted || this.claudeFlat) return this.set('ready', 'Claude conectado.');
        if (userAction) return this.warmup();
        return this.set('available', 'Claude disponível: na primeira fala o claude.ai pede sua permissão.');
      }
      if (this.inClaude) {
        if (!this.claudeChecked) return this.set('off', 'Procurando o Claude…');
        return this.set('error', 'O claude.ai não liberou o Claude nesta tela. Abra o jogo pelo link no navegador (claude.ai), com a conta conectada. Aqui dentro não há internet para outros modelos.');
      }
      if (mode === 'claude') return this.set('error', 'O Claude só funciona quando o jogo é aberto pelo link do claude.ai.');
      if (mode === 'api' || (mode === 'auto' && this.cfg.key && this.cfg.base)) {
        this.provider = 'api';
        if (!this.cfg.base || !this.cfg.model) return this.set('error', 'Informe o endereço e o modelo da API.');
        return this.set('ready', 'API configurada: ' + this.cfg.model);
      }
      if (mode === 'webllm' || (mode === 'auto' && this.cfg.webllmAuto)) {
        this.provider = 'webllm';
        if (this.engine) return this.set('ready', 'Modelo local carregado.');
        if (userAction || this.cfg.webllmAuto) return this.loadWebLLM();
        return this.set('available', 'Modelo local escolhido: clique em "Baixar e ativar".');
      }
      return this.set('off', 'Sem IA configurada: as conversas usam o sistema de regras.');
    },

    /* Primeira chamada ao Claude (pede consentimento ao jogador). Só em resposta a um clique. */
    async warmup() {
      this.wantWarm = false;
      if (this.provider === 'claude' && this.claudeSample && !this.claudeGranted) {
        if (this.warming) return this.warming;
        this.set('loading', 'Pedindo permissão para usar o Claude (confira o aviso do claude.ai)…', 0.5);
        const sample = this.claudeSample;
        this.warming = (async () => {
          try {
            await sample('Responda apenas com a palavra: pronto', { modelTier: 'quick', cache: false });
            this.claudeGranted = true;
            this.failStreak = 0;
            this.set('ready', 'Claude conectado.');
          } catch (e) {
            this.handleError(e);
          } finally {
            this.warming = null;
          }
        })();
        return this.warming;
      } else if (this.provider === 'webllm' && !this.engine) await this.loadWebLLM();
    },

    async loadWebLLM() {
      if (this.inClaude) {
        this.set('error', 'O modelo local não pode ser baixado dentro do claude.ai (a página não tem internet). Aqui use o Claude, ou abra o arquivo do jogo no navegador.');
        return;
      }
      if (!navigator.gpu) {
        this.set('error', 'Este navegador não tem WebGPU. Use Chrome ou Edge atualizados num computador, ou configure uma API grátis.');
        return;
      }
      this.provider = 'webllm';
      this.set('loading', 'Carregando a biblioteca…', 0);
      try {
        const webllm = await import(WEBLLM_URL);
        this.set('loading', 'Baixando o modelo (só na primeira vez)…', 0);
        const conf = { initProgressCallback: (r) => this.set('loading', r.text || 'Carregando…', r.progress || 0) };
        if (typeof caches === 'undefined' && webllm.prebuiltAppConfig) conf.appConfig = Object.assign({}, webllm.prebuiltAppConfig, { useIndexedDBCache: true });
        this.engine = await webllm.CreateMLCEngine(this.cfg.webllmModel, conf);
        this.cfg.webllmAuto = true;
        this.save();
        this.set('ready', 'Modelo local pronto.');
      } catch (e) {
        this.engine = null;
        this.set('error', 'Não foi possível carregar o modelo local: ' + (e && e.message ? e.message : e));
      }
    },

    handleError(e) {
      const code = e && e.code;
      this.stats.fails++;
      this.failStreak++;
      this.lastError = { code: code || 'erro', message: String((e && (e.message || e.code)) || e).slice(0, 200), at: Date.now() };
      if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) {
        this.claudeSample = null;
        this.provider = null;
        this.set('off', code === 'not_granted'
          ? 'A permissão do Claude foi recusada. Para ligar a IA, recarregue a página e aceite o aviso do claude.ai.'
          : 'O claude.ai não liberou o Claude nesta conta ou tela (' + code + '). As conversas usam o sistema de regras.');
        return;
      }
      const http429 = /^HTTP 429/.test(this.lastError.message);
      if (code === 'rate_limited' || http429) {
        /* nada de tentar de novo sozinho: o jogador decide quando (botão "Tentar de novo") */
        this.coolUntil = Date.now() + 90000;
        const why = http429
          ? 'O serviço da API recusou por limite de uso do plano grátis.'
          : 'O claude.ai recusou por limite de uso: ou o limite da sua conta do Claude acabou por enquanto, ou houve chamadas demais seguidas (por exemplo, o jogo aberto em outra aba ou no app ao mesmo tempo).';
        this.set('limited', why + ' As falas voltam para as regras. Espere alguns minutos e toque em "Tentar de novo".');
        return;
      }
      if (code === 'session_expired') {
        this.set('error', 'Sessão do Claude expirada: entre de novo no claude.ai.');
        return;
      }
      if (this.status === 'loading' || this.failStreak >= 3) {
        this.set('error', 'A IA falhou ' + this.failStreak + 'x seguidas (' + this.lastError.message + '). As falas voltam para as regras; use "Testar" para tentar de novo.');
        return;
      }
      this.set(this.status, 'Falha momentânea da IA: ' + this.lastError.message);
    },

    async slot() {
      /* uma chamada por vez: o claude.ai limita chamadas simultâneas por pessoa */
      const max = this.provider === 'api' ? 2 : 1;
      if (this.running < max) {
        this.running++;
        return;
      }
      await new Promise((res) => this.waiters.push(res));
      this.running++;
    },
    release() {
      this.running--;
      const w = this.waiters.shift();
      if (w) w();
    },

    /* Gera um texto. Devolve null se a IA não estiver pronta ou falhar (o jogo cai nas regras). */
    async complete(system, prompt, opts) {
      opts = opts || {};
      if (!this.ready()) return null;
      await this.slot();
      this.stats.calls++;
      try {
        let text = '';
        if (this.provider === 'claude') {
          const input = system + '\n\n' + prompt;
          if (this.claudeSample) {
            const o = { modelTier: 'quick', cache: false };
            if (opts.signal) o.signal = opts.signal;
            const sample = this.claudeSample;
            const r = await sample(input, o);
            text = r && r.text;
          } else if (this.claudeFlat) {
            text = await this.claudeFlat.call(window.claude, input);
          }
        } else if (this.provider === 'webllm') {
          const r = await this.engine.chat.completions.create({
            messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
            temperature: opts.temperature != null ? opts.temperature : 0.8,
            max_tokens: opts.maxTokens || 320,
          });
          text = r.choices && r.choices[0] && r.choices[0].message ? r.choices[0].message.content : '';
        } else if (this.provider === 'api') {
          text = await this.apiCall(system, prompt, opts);
        }
        const out = cleanReply(text);
        if (out) {
          this.stats.ok++;
          this.failStreak = 0;
          this.lastError = null;
        }
        return out;
      } catch (e) {
        if (!(e && (e.code === 'cancelled' || e.name === 'AbortError'))) {
          if (window.console) console.warn('IA falhou', e);
          this.handleError(e);
        }
        return null;
      } finally {
        this.release();
      }
    },

    async apiCall(system, prompt, opts) {
      if (this.inClaude) throw new Error('Dentro do claude.ai a página não tem internet: use o Claude ou abra o jogo fora do claude.ai.');
      const base = this.cfg.base.replace(/\/+$/, '');
      const headers = { 'Content-Type': 'application/json' };
      if (this.cfg.key) headers.Authorization = 'Bearer ' + this.cfg.key;
      if (/openrouter\.ai/.test(base)) {
        headers['X-Title'] = 'Impostor a Bordo';
        if (location.origin && location.origin.startsWith('http')) headers['HTTP-Referer'] = location.origin;
      }
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), opts.timeout || 25000);
      if (opts.signal) opts.signal.addEventListener('abort', () => ctl.abort());
      try {
        const res = await fetch(base + '/chat/completions', {
          method: 'POST', headers, signal: ctl.signal,
          body: JSON.stringify({
            model: this.cfg.model,
            messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
            temperature: opts.temperature != null ? opts.temperature : 0.85,
            max_tokens: opts.maxTokens || 320,
          }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          if (res.status === 429) this.coolUntil = Date.now() + 20000;
          throw new Error('HTTP ' + res.status + ' ' + body.slice(0, 160));
        }
        const j = await res.json();
        const c = j.choices && j.choices[0];
        return (c && c.message && (c.message.content || c.message.reasoning_content)) || '';
      } finally {
        clearTimeout(timer);
      }
    },

    async listModels() {
      const base = this.cfg.base.replace(/\/+$/, '');
      const headers = {};
      if (this.cfg.key) headers.Authorization = 'Bearer ' + this.cfg.key;
      const res = await fetch(base + '/models', { headers });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      const list = (j.data || j.models || []).map((m) => m.id || m.name).filter(Boolean);
      const free = list.filter((id) => /:free$/.test(id));
      return free.length ? free.concat(list.filter((id) => !/:free$/.test(id))) : list;
    },

    async test() {
      const prev = this.status;
      if (this.provider === 'claude' && this.claudeSample && !this.claudeGranted) {
        await this.warmup();
        if (!this.claudeGranted) return null;
      }
      const ok = this.provider === 'api' || this.provider === 'webllm' || this.provider === 'claude';
      if (!ok) {
        this.set(prev, this.detail);
        return null;
      }
      this.set('loading', 'Testando…', 0.5);
      this.status = 'ready';
      this.coolUntil = 0;
      this.failStreak = 0;
      const t0 = performance.now();
      const r = await this.complete('Você é um jogador num chat de jogo.', 'Diga "oi, bora jogar" de um jeito descontraído, em até 8 palavras.', { maxTokens: 40, timeout: 20000 });
      const ms = Math.round(performance.now() - t0);
      if (r) this.set('ready', 'Funcionando (' + ms + ' ms): "' + r.slice(0, 60) + '"');
      else if (this.status !== 'off' && this.status !== 'limited') {
        const why = this.lastError ? ' Erro: ' + this.lastError.message : '';
        this.set('error', (this.provider === 'claude' ? 'O Claude não respondeu.' : 'A IA não respondeu. Confira a chave, o endereço e o modelo.') + why);
      }
      return r;
    },
  };

  /* Limpa blocos de raciocínio e marcações comuns. */
  function cleanReply(text) {
    if (!text) return '';
    return String(text)
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/^```[a-z]*\n?|```$/gim, '')
      .trim();
  }

  AU.LLM = LLM;
})();
