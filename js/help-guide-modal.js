/**
 * Shared usage-guide modal markup (aligned with index / report).
 * Vue pages: use LegalHelpGuide.vueTemplate with showHelpModal / helpVideoUrl.
 * Vanilla pages: LegalHelpGuide.mount(container) then open/close via API.
 */
(function (global) {
  const VIDEO_URL = './static/tutorials/demo.mp4';

  const BODY_INNER = `
          <div class="help-section">
            <div class="help-section-title">Feature overview</div>
            <p>The AI Regulation Agent is built for automotive regulatory intelligence and offers 3 working modes:</p>

            <div class="help-feature-grid">
              <div class="help-feature-card">
                <div class="help-feature-card-title">📌 Regulation report generation</div>
                <div class="help-feature-card-desc">Automatically crawl the latest regulations/standards from CATARC, MIIT, SAMR, and other sources, then aggregate a structured analysis report (key regulations / meetings / standard notices / drafts in progress).</div>
              </div>
              <div class="help-feature-card">
                <div class="help-feature-card-title">🌐 Overseas intelligence parsing</div>
                <div class="help-feature-card-desc">Upload overseas regulation/policy PDFs; AI automatically identifies each independent regulation/standard/consultation and produces the same 4-section analysis structure as the domestic report.</div>
              </div>
              <div class="help-feature-card">
                <div class="help-feature-card-title">🧠 Skill configuration</div>
                <div class="help-feature-card-desc">Tune M1 passenger-car pre-filter keywords, add few-shot positive/negative examples, and configure LLM prompt rules; support dry-runs on historical data; all changes are written to an audit log for traceability.</div>
              </div>
            </div>

            <ol>
              <li>The left "Data source status" shows crawled regulation sources — click an item to crawl individually, or click "<strong>Crawl all</strong>" to pull everything</li>
              <li>Choose a time range (custom / last 15 days / 1 month / 3 months) → click <strong>Generate report</strong> → async generation → auto-jump to preview</li>
              <li>Overseas intelligence: drag a PDF into the dashed box or click "Select PDF" → click <strong>Generate report</strong> → backend parsing + LLM item-by-item recognition</li>
              <li>In the report, expand each regulation to view: <strong>Key points / Policy interpretation / Enterprise response / Peer reference</strong></li>
              <li>Skill configuration: after changing keywords/rules, click <strong>Save</strong>; to preview impact, use the "Dry-run" button in PATCH 04 on historical data</li>
            </ol>
          </div>

          <div class="help-section">
            <div class="help-section-title">Video tutorial</div>
            <div class="help-video-frame">
              <video controls preload="metadata" src="${VIDEO_URL}"></video>
            </div>
            <p style="margin-top:10px;color:#94a3b8;font-size:12px">If playback fails, place the video at <code>./static/tutorials/demo.mp4</code> and refresh the page.</p>
          </div>

          <div class="help-section">
            <div class="help-section-title">Skill configuration details</div>
            <p>Skill configuration tells the AI "what counts as an M1 passenger car" — every newly crawled regulation passes this gate before inclusion in the report. If this step is wrong, later accuracy does not help.</p>

            <h4 style="margin: 14px 0 6px; font-size: 13px; color: #334155;">UI has 4 PATCH panels</h4>
            <ul>
              <li><strong>PATCH 01 · Filter keywords</strong> — two tag groups: M1 feature terms (hit = keep) and exclude terms (hit = drop). Type a word and press Enter to add; click ✕ after a tag to remove. Remember to click Save at the bottom; changes apply on the next filter run.</li>
              <li><strong>PATCH 02 · Few-shot samples</strong> — left/right columns for positive examples (should be M1) and negative examples (should not be M1). Samples are injected into the LLM prompt and directly affect is_m1 decisions. Aim for 5–10 typical samples per class with clear reasons so the LLM learns faster.</li>
              <li><strong>PATCH 03 · LLM prompt rules</strong> — the extra-rules textarea (e.g. "prioritize safety + intelligent driving") is appended to the end of the LLM system prompt; the peer blacklist hides in-house brands (SAIC group: IM / Rising / MG / Roewe, etc.) from the "Peer reference" module.</li>
              <li><strong>PATCH 04 · Preview &amp; history</strong> — a non-persisting dry-run area. Click Dry-run to run the current skill on recent N days of MongoDB data, showing pass/block counts and diffs vs the default config (newly kept X / newly dropped Y). Below is the change history: who, when, and what changed.</li>
            </ul>

            <h4 style="margin: 14px 0 6px; font-size: 13px; color: #334155;">Recommended tuning workflow</h4>
            <ol>
              <li>In PATCH 04, click Dry-run to see the current default filter effect (baseline)</li>
              <li>In PATCH 01, change a set of keywords (e.g. add "intelligent driving" to M1, or "commercial vehicle" to exclude), <strong>do not click Save yet</strong></li>
              <li>Click Dry-run in PATCH 04 again and compare the "diff" numbers before/after</li>
              <li>If the diff looks right → click Save at the bottom of PATCH 01 → takes effect immediately</li>
              <li>To undo → click Restore defaults in the top-right to return to factory settings (note: positive/negative samples are not cleared)</li>
            </ol>

            <div class="help-tip" style="margin-top:14px">
              <strong>💡 Operator field</strong> · The "Operator" input at the top-right is written into every audit log. Set it to your name (e.g. zhangsan) before making changes so history shows who edited what. Default is im; it is stored in browser localStorage and persists across reloads.
            </div>
          </div>

          <div class="help-section">
            <div class="help-section-title">Input / output examples</div>

            <div class="help-example-grid">
              <div class="help-example-card">
                <div class="help-example-card-header">Example 1 · Overseas intelligence</div>
                <div class="help-example-card-label">Input</div>
                <div class="help-example-card-content">
                  Upload <code>SAIC Group Policy &amp; Standards Weekly Brief (Issue 53, 2026.05.29).pdf</code> (one PDF containing 12+ regulations)
                </div>
                <div class="help-example-card-label">Output</div>
                <div class="help-example-card-content">
                  Automatically splits into 12 independent regulations; each gets 4-section analysis (key points / policy interpretation / enterprise response / peer reference), ordered by sequence number
                </div>
              </div>

              <div class="help-example-card">
                <div class="help-example-card-header">Example 2 · Regulation aggregation</div>
                <div class="help-example-card-label">Input</div>
                <div class="help-example-card-content">
                  Time range = <code>Last 15 days</code><br>
                  Report title = <code>Regulation information summary report</code>
                </div>
                <div class="help-example-card-label">Output</div>
                <div class="help-example-card-content">
                  Crawl all regulations from 4 data sources (CATARC / MIIT / SAMR) over the last 15 days into an ordered list under the "<strong>Key regulation news/policy</strong>" tab
                </div>
              </div>
            </div>

            <div class="help-tip" style="margin-top:14px">
              <strong>💡 Tip</strong> · Closing the modal while an async task runs does not stop it — the task continues in the background. Scanned or encrypted PDFs cannot extract text; a friendly message will be shown.
            </div>
          </div>`;

  /** Vue SFC-style template fragment (bindings: showHelpModal, helpVideoUrl) */
  const vueTemplate = `
    <div v-if="showHelpModal" class="async-modal-overlay" @click.self="showHelpModal = false">
      <div class="async-modal help-modal" role="dialog" aria-modal="true" aria-labelledby="helpTitle">
        <div class="help-modal-header">
          <div class="help-modal-title" id="helpTitle">
            <span class="help-modal-title-icon">📖</span>
            <span>User guide</span>
          </div>
          <button class="help-modal-close" type="button" @click="showHelpModal = false" title="Close" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="help-modal-body">
          ${BODY_INNER.replace(`src="${VIDEO_URL}"`, ':src="helpVideoUrl || \'\'"')}
        </div>
      </div>
    </div>`;

  function vanillaHtml() {
    return `
    <div id="legalHelpGuideOverlay" class="async-modal-overlay" style="display:none" role="presentation">
      <div class="async-modal help-modal" role="dialog" aria-modal="true" aria-labelledby="helpTitle">
        <div class="help-modal-header">
          <div class="help-modal-title" id="helpTitle">
            <span class="help-modal-title-icon">📖</span>
            <span>User guide</span>
          </div>
          <button class="help-modal-close" type="button" data-help-close title="Close" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="help-modal-body">${BODY_INNER}</div>
      </div>
    </div>`;
  }

  function open() {
    const el = document.getElementById('legalHelpGuideOverlay');
    if (el) el.style.display = 'flex';
  }

  function close() {
    const el = document.getElementById('legalHelpGuideOverlay');
    if (el) el.style.display = 'none';
  }

  function mount(parent, options) {
    const opts = options || {};
    const host = typeof parent === 'string' ? document.querySelector(parent) : parent;
    if (!host) return null;
    let overlay = document.getElementById('legalHelpGuideOverlay');
    if (!overlay) {
      host.insertAdjacentHTML('beforeend', vanillaHtml());
      overlay = document.getElementById('legalHelpGuideOverlay');
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
      overlay.querySelectorAll('[data-help-close]').forEach((btn) => {
        btn.addEventListener('click', close);
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
      });
    }
    if (typeof opts.onRestartTour === 'function') {
      let restartWrap = overlay.querySelector('[data-help-restart-wrap]');
      if (!restartWrap) {
        const section = overlay.querySelector('.help-section');
        if (section) {
          restartWrap = document.createElement('p');
          restartWrap.setAttribute('data-help-restart-wrap', '1');
          restartWrap.style.marginTop = '10px';
          restartWrap.innerHTML = '<button type="button" class="btn btn-outline" data-help-restart>Restart onboarding tour</button><span style="margin-left:8px;color:#94a3b8;font-size:12px">Guides the mode you are currently in</span>';
          const title = section.querySelector('.help-section-title');
          const intro = title && title.nextElementSibling;
          if (intro) intro.after(restartWrap);
          else section.appendChild(restartWrap);
        }
      }
      const btn = overlay.querySelector('[data-help-restart]');
      if (btn) {
        btn.onclick = () => {
          close();
          opts.onRestartTour();
        };
      }
    }
    return overlay;
  }

  global.LegalHelpGuide = {
    videoUrl: VIDEO_URL,
    vueTemplate,
    mount,
    open,
    close
  };
})(window);
