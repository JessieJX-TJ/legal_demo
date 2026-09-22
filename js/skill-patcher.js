/**
 * Skill Patcher (Demo) — mirrors http://10.182.37.12:8091/#/skill
 * Persists to localStorage; seeds from ./js/skill-config-default.json
 */
(function (global) {
  const STORAGE_KEY = 'legal_demo_skill_config_v1';
  const AUDIT_KEY = 'legal_demo_skill_audit_v1';
  const OPERATOR_KEY = 'skill_operator';
  const REMOTE_BASE = 'http://10.182.37.12:8091';

  const FALLBACK_DEFAULTS = {
    m1_keywords: ['passenger car', 'sedan', 'SUV', 'MPV', 'small passenger vehicle', '9-seat', 'M1', 'passenger-carrying vehicle', 'passenger vehicle', 'passenger', 'household', 'personal', 'private', 'consumer', 'vehicle owner', 'light-duty', 'small', 'emissions', 'fuel consumption', 'range', 'new energy vehicle', 'EV', 'electric vehicle', 'battery electric'],
    exclude_keywords: ['truck', 'cargo', 'freight', 'heavy truck', 'light truck', 'pickup', 'bus', 'coach', 'midibus', 'city bus', 'school bus', 'special-purpose vehicle', 'construction vehicle', 'commercial vehicle', 'commercial operation', 'taxi', 'three-wheeler']
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) { /* ignore */ }
  }

  async function remoteApi(method, path, body, timeoutMs) {
    const opt = {
      method,
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors'
    };
    if (body !== undefined) opt.body = JSON.stringify(body);
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (ctrl) {
      opt.signal = ctrl.signal;
      setTimeout(() => ctrl.abort(), timeoutMs || 8000);
    }
    const r = await fetch(REMOTE_BASE + path, opt);
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`HTTP ${r.status}: ${txt.slice(0, 120)}`);
    }
    return r.json();
  }

  function demoAuditSeed() {
    return [
      {
        id: 'demo_audit_1',
        action: 'update_keywords',
        operator: 'im',
        at: '2026-08-17T14:29:48.284328',
        note: 'Frontend save'
      },
      {
        id: 'demo_audit_2',
        action: 'update_rules',
        operator: 'im',
        at: '2026-08-16T10:12:03.000000',
        note: 'Added intelligent-driving priority rule'
      },
      {
        id: 'demo_audit_3',
        action: 'add_example',
        operator: 'im',
        at: '2026-06-16T13:32:34.054515',
        note: 'Added positive example: GB 20071'
      },
      {
        id: 'demo_audit_4',
        action: 'add_example',
        operator: 'im',
        at: '2026-06-16T13:36:54.834883',
        note: 'Added negative example: GB 7258 heavy vehicle braking'
      },
      {
        id: 'demo_audit_5',
        action: 'reset',
        operator: 'system',
        at: '2026-06-10T09:00:00.000000',
        note: 'Initialized default config'
      }
    ];
  }

  function createSkillPatcher(VueApi, skillModalOpen) {
    const { ref, computed, watch } = VueApi;

    const skillLoading = ref(false);
    const skillConfig = ref(null);
    const m1Keywords = ref([]);
    const excludeKeywords = ref([]);
    const positiveExamples = ref([]);
    const negativeExamples = ref([]);
    const newM1Kw = ref('');
    const newExcludeKw = ref('');
    const extraRules = ref('');
    const competitorBlacklist = ref('');
    const previewDays = ref(30);
    const previewLoading = ref(false);
    const skillPreviewResult = ref(null);
    const auditLog = ref([]);
    const auditLoading = ref(false);
    const skillToast = ref(null);
    const exampleModal = ref({ open: false, label: true, title: '', reason: '', editingId: null });

    let seedBundle = null;

    function _loadOperator() {
      try {
        return localStorage.getItem(OPERATOR_KEY) || 'im';
      } catch (_) {
        return 'im';
      }
    }
    const currentOperator = ref(_loadOperator());

    function saveOperatorToLocal() {
      const v = (currentOperator.value || '').trim() || 'im';
      currentOperator.value = v;
      try {
        localStorage.setItem(OPERATOR_KEY, v);
      } catch (_) { /* ignore */ }
      _showToast('Operator set to: ' + v, 'ok');
    }

    function _showToast(text, type = 'ok') {
      skillToast.value = { text, type };
      setTimeout(() => {
        if (skillToast.value && skillToast.value.text === text) skillToast.value = null;
      }, 2500);
    }

    function pushAudit(action, note, before) {
      const entry = {
        id: uid('audit'),
        action,
        operator: currentOperator.value || 'im',
        at: nowIso(),
        note: note || '',
        before: before || null
      };
      const items = readJson(AUDIT_KEY, []);
      items.unshift(entry);
      const next = items.slice(0, 50);
      writeJson(AUDIT_KEY, next);
      auditLog.value = next;
    }

    async function ensureSeed() {
      if (seedBundle) return seedBundle;
      try {
        const r = await fetch('./js/skill-config-default.json', { cache: 'no-store' });
        if (!r.ok) throw new Error('seed missing');
        seedBundle = await r.json();
      } catch (_) {
        seedBundle = {
          success: true,
          config: {
            m1_keywords: [...FALLBACK_DEFAULTS.m1_keywords],
            exclude_keywords: [...FALLBACK_DEFAULTS.exclude_keywords],
            extra_rules: 'Prioritize intelligent-driving related regulations',
            competitor_blacklist_extra: [],
            updated_at: nowIso(),
            updated_by: 'system'
          },
          examples: { positive: [], negative: [] },
          defaults: clone(FALLBACK_DEFAULTS)
        };
      }
      return seedBundle;
    }

    function applyBundle(bundle) {
      skillConfig.value = clone(bundle);
      m1Keywords.value = [...(bundle.config.m1_keywords || [])];
      excludeKeywords.value = [...(bundle.config.exclude_keywords || [])];
      extraRules.value = bundle.config.extra_rules || '';
      competitorBlacklist.value = (bundle.config.competitor_blacklist_extra || []).join(', ');
      positiveExamples.value = [...(bundle.examples.positive || [])];
      negativeExamples.value = [...(bundle.examples.negative || [])];
    }

    function persistCurrent(note, action) {
      const before = skillConfig.value ? clone(skillConfig.value.config) : null;
      const bundle = {
        success: true,
        config: {
          m1_keywords: [...m1Keywords.value],
          exclude_keywords: [...excludeKeywords.value],
          extra_rules: extraRules.value || '',
          competitor_blacklist_extra: competitorBlacklist.value
            .split(/[,，、\s]+/)
            .map((s) => s.trim())
            .filter(Boolean),
          updated_at: nowIso(),
          updated_by: currentOperator.value || 'im'
        },
        examples: {
          positive: [...positiveExamples.value],
          negative: [...negativeExamples.value]
        },
        defaults: clone((skillConfig.value && skillConfig.value.defaults) || seedBundle.defaults || FALLBACK_DEFAULTS)
      };
      writeJson(STORAGE_KEY, bundle);
      skillConfig.value = bundle;
      if (action) pushAudit(action, note, before);
      return bundle;
    }

    const keywordsDirty = computed(() => {
      if (!skillConfig.value) return false;
      const a = m1Keywords.value;
      const b = skillConfig.value.config.m1_keywords;
      const c = excludeKeywords.value;
      const d = skillConfig.value.config.exclude_keywords;
      return JSON.stringify(a) !== JSON.stringify(b) || JSON.stringify(c) !== JSON.stringify(d);
    });

    const rulesDirty = computed(() => {
      if (!skillConfig.value) return false;
      return (
        extraRules.value !== (skillConfig.value.config.extra_rules || '') ||
        competitorBlacklist.value !== (skillConfig.value.config.competitor_blacklist_extra || []).join(', ')
      );
    });

    const skillIsCustom = computed(() => {
      if (!skillConfig.value) return false;
      const d = skillConfig.value.defaults || {};
      return (
        JSON.stringify(m1Keywords.value) !== JSON.stringify(d.m1_keywords || []) ||
        JSON.stringify(excludeKeywords.value) !== JSON.stringify(d.exclude_keywords || [])
      );
    });

    async function loadSkillConfig() {
      skillLoading.value = true;
      try {
        const seed = await ensureSeed();
        try {
          const remote = await remoteApi('GET', '/api/skill/config', undefined, 8000);
          if (remote && remote.config) {
            remote.defaults = remote.defaults || seed.defaults;
            applyBundle(remote);
            writeJson(STORAGE_KEY, remote);
            return;
          }
        } catch (_) { /* fall through to local */ }

        const stored = readJson(STORAGE_KEY, null);
        if (stored && stored.config) {
          stored.defaults = stored.defaults || seed.defaults;
          applyBundle(stored);
        } else {
          applyBundle(seed);
        }
      } catch (e) {
        _showToast('Load failed: ' + e.message, 'err');
      } finally {
        skillLoading.value = false;
      }
    }

    function addM1Keyword() {
      const v = newM1Kw.value.trim();
      if (!v) return;
      if (m1Keywords.value.includes(v)) {
        _showToast('Already exists', 'err');
        return;
      }
      m1Keywords.value.push(v);
      newM1Kw.value = '';
    }
    function removeM1Keyword(i) {
      m1Keywords.value.splice(i, 1);
    }
    function addExcludeKeyword() {
      const v = newExcludeKw.value.trim();
      if (!v) return;
      if (excludeKeywords.value.includes(v)) {
        _showToast('Already exists', 'err');
        return;
      }
      excludeKeywords.value.push(v);
      newExcludeKw.value = '';
    }
    function removeExcludeKeyword(i) {
      excludeKeywords.value.splice(i, 1);
    }

    async function saveKeywords() {
      skillLoading.value = true;
      try {
        const r = persistCurrent('Frontend save', 'update_keywords');
        _showToast(`Saved: M1 ${r.config.m1_keywords.length} terms, exclude ${r.config.exclude_keywords.length} terms`, 'ok');
      } catch (e) {
        _showToast('Save failed: ' + e.message, 'err');
      } finally {
        skillLoading.value = false;
      }
    }

    function openAddExample(label) {
      exampleModal.value = { open: true, label, title: '', reason: '', editingId: null };
    }
    function openEditExample(ex) {
      exampleModal.value = {
        open: true,
        label: ex.label,
        title: ex.title,
        reason: ex.reason || '',
        editingId: ex.id
      };
    }

    async function submitExample() {
      const m = exampleModal.value;
      if (!m.title.trim()) return;
      skillLoading.value = true;
      try {
        if (m.editingId) {
          const lists = [positiveExamples.value, negativeExamples.value];
          lists.forEach((list) => {
            const idx = list.findIndex((x) => x.id === m.editingId);
            if (idx >= 0) list.splice(idx, 1);
          });
        }
        const item = {
          id: m.editingId || uid('ex'),
          label: !!m.label,
          title: m.title.trim(),
          reason: (m.reason || '').trim(),
          added_at: nowIso(),
          added_by: currentOperator.value || 'im'
        };
        if (item.label) positiveExamples.value.unshift(item);
        else negativeExamples.value.unshift(item);
        persistCurrent(m.editingId ? 'Edit sample' : 'Add sample', m.editingId ? 'add_example' : 'add_example');
        _showToast(m.editingId ? 'Updated' : m.label ? 'Positive example added' : 'Negative example added', 'ok');
        m.open = false;
      } catch (e) {
        _showToast('Operation failed: ' + e.message, 'err');
      } finally {
        skillLoading.value = false;
      }
    }

    async function deleteExample(ex) {
      const ok = await LegalDemo.confirm({
        title: 'Delete sample',
        message: 'Delete this sample?'
      });
      if (!ok) return;
      skillLoading.value = true;
      try {
        const list = ex.label ? positiveExamples.value : negativeExamples.value;
        const idx = list.findIndex((x) => x.id === ex.id);
        if (idx >= 0) list.splice(idx, 1);
        persistCurrent('Delete sample', 'remove_example');
        _showToast('Deleted', 'ok');
      } catch (e) {
        _showToast('Delete failed: ' + e.message, 'err');
      } finally {
        skillLoading.value = false;
      }
    }

    async function saveExtraRules() {
      skillLoading.value = true;
      try {
        persistCurrent('Frontend save', 'update_rules');
        _showToast('LLM rules saved', 'ok');
      } catch (e) {
        _showToast('Save failed: ' + e.message, 'err');
      } finally {
        skillLoading.value = false;
      }
    }

    async function runPreview() {
      previewLoading.value = true;
      try {
        // Prefer live 8091 API (same as http://10.182.37.12:8091/#/skill)
        try {
          const remote = await remoteApi(
            'POST',
            '/api/skill/preview',
            { days: previewDays.value, sample_size: 5 },
            25000
          );
          if (remote && remote.summary) {
            skillPreviewResult.value = remote;
            _showToast(`Scanned ${remote.summary.total_scanned} items`, 'ok');
            return;
          }
        } catch (_) { /* fall through to local demo */ }

        await new Promise((r) => setTimeout(r, 450));
        const seed = await ensureSeed();
        const total = 80 + previewDays.value * 2;
        const m1n = m1Keywords.value.length;
        const exn = excludeKeywords.value.length;
        const defM1 = (seed.defaults.m1_keywords || []).length;
        const defEx = (seed.defaults.exclude_keywords || []).length;
        const curPass = Math.max(8, Math.round(total * (0.28 + m1n * 0.004) - exn * 0.3));
        const curBlock = Math.max(0, total - curPass);
        const defPass = Math.max(8, Math.round(total * (0.28 + defM1 * 0.004) - defEx * 0.3));
        const defBlock = Math.max(0, total - defPass);
        const passSamples = (positiveExamples.value.length
          ? positiveExamples.value
          : [{ title: 'GB 20071 Occupant protection in lateral collisions', reason: 'Matched M1 keyword' }]
        )
          .slice(0, 5)
          .map((s, i) => ({
            title: s.title,
            site_key: 'catarc_gzdt',
            list_date_iso: `2026-08-${String(20 - i).padStart(2, '0')}`,
            reason: s.reason || 'Matched M1 keyword'
          }));
        const blockSamples = (negativeExamples.value.length
          ? negativeExamples.value
          : [{ title: 'GB 7258 Heavy vehicle braking', reason: 'Matched exclude term' }]
        )
          .slice(0, 5)
          .map((s, i) => ({
            title: s.title,
            site_key: 'miit_zbys_qcgy',
            list_date_iso: `2026-08-${String(18 - i).padStart(2, '0')}`,
            reason: s.reason || 'Matched exclude term'
          }));
        skillPreviewResult.value = {
          success: true,
          summary: {
            days: previewDays.value,
            total_scanned: total,
            current_skill: {
              pass: curPass,
              block: curBlock,
              m1_keyword_count: m1n,
              exclude_keyword_count: exn
            },
            default_skill: { pass: defPass, block: defBlock },
            diff_vs_default: {
              kept_by_new_skill: Math.max(0, curPass - defPass),
              blocked_by_new_skill: Math.max(0, curBlock - defBlock)
            }
          },
          samples: { pass: passSamples, block: blockSamples }
        };
        _showToast(`Scanned ${total} items`, 'ok');
      } catch (e) {
        _showToast('Dry-run failed: ' + e.message, 'err');
      } finally {
        previewLoading.value = false;
      }
    }

    async function loadAuditLog() {
      auditLoading.value = true;
      try {
        try {
          const remote = await remoteApi('GET', '/api/skill/audit-log?limit=30', undefined, 8000);
          if (remote && Array.isArray(remote.items)) {
            auditLog.value = remote.items;
            if (remote.items.length) writeJson(AUDIT_KEY, remote.items);
            return;
          }
        } catch (_) { /* fall through */ }

        const local = readJson(AUDIT_KEY, null);
        if (Array.isArray(local) && local.length) {
          auditLog.value = local;
        } else {
          const seed = demoAuditSeed();
          writeJson(AUDIT_KEY, seed);
          auditLog.value = seed;
        }
      } finally {
        auditLoading.value = false;
      }
    }

    async function confirmResetSkill() {
      const ok = await LegalDemo.confirm({
        title: 'Restore default config',
        message: 'Restore the default configuration? Existing positive/negative samples will not be deleted.'
      });
      if (!ok) return;
      skillLoading.value = true;
      try {
        const seed = await ensureSeed();
        const keepPos = [...positiveExamples.value];
        const keepNeg = [...negativeExamples.value];
        m1Keywords.value = [...(seed.defaults.m1_keywords || seed.config.m1_keywords)];
        excludeKeywords.value = [...(seed.defaults.exclude_keywords || seed.config.exclude_keywords)];
        extraRules.value = seed.config.extra_rules || '';
        competitorBlacklist.value = '';
        positiveExamples.value = keepPos;
        negativeExamples.value = keepNeg;
        persistCurrent('Frontend restore defaults', 'reset');
        _showToast('Default configuration restored', 'ok');
      } catch (e) {
        _showToast('Reset failed: ' + e.message, 'err');
      } finally {
        skillLoading.value = false;
      }
    }

    function auditActionLabel(a) {
      return (
        {
          update_keywords: 'Update keywords',
          add_example: 'Add sample',
          remove_example: 'Delete sample',
          update_rules: 'Update LLM rules',
          reset: 'Restore defaults'
        }[a] || a
      );
    }
    function auditDotColor(a) {
      if (a === 'add_example') return 'background: var(--sk-pos);';
      if (a === 'remove_example' || a === 'reset') return 'background: var(--sk-neg);';
      if (a === 'update_keywords' || a === 'update_rules') return 'background: var(--sk-brand);';
      return '';
    }

    watch(skillModalOpen, async (open) => {
      if (open) {
        await Promise.all([loadSkillConfig(), loadAuditLog()]);
      }
    });

    return {
      skillLoading,
      skillConfig,
      m1Keywords,
      excludeKeywords,
      positiveExamples,
      negativeExamples,
      newM1Kw,
      newExcludeKw,
      extraRules,
      competitorBlacklist,
      previewDays,
      previewLoading,
      skillPreviewResult,
      auditLog,
      auditLoading,
      skillToast,
      exampleModal,
      currentOperator,
      saveOperatorToLocal,
      keywordsDirty,
      rulesDirty,
      skillIsCustom,
      loadSkillConfig,
      addM1Keyword,
      removeM1Keyword,
      addExcludeKeyword,
      removeExcludeKeyword,
      saveKeywords,
      openAddExample,
      openEditExample,
      submitExample,
      deleteExample,
      saveExtraRules,
      runPreview,
      loadAuditLog,
      confirmResetSkill,
      auditActionLabel,
      auditDotColor
    };
  }

  global.LegalSkillPatcher = { createSkillPatcher };
})(window);
