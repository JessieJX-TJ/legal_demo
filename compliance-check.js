(() => {
  const fileInput = document.querySelector('#fileInput');
  const dropzone = document.querySelector('#dropzone');
  const selectedFile = document.querySelector('#selectedFile');
  const submitButton = document.querySelector('#submitButton');
  const continueButton = document.querySelector('#continueButton');
  const annotationAnalysisButton = document.querySelector('#annotationAnalysisButton');
  const errorMessage = document.querySelector('#errorMessage');
  const historyList = document.querySelector('#historyList');
  const composerBox = document.querySelector('#checkComposerBox');
  const composerTitle = document.querySelector('#composerTitle');
  const composerDesc = document.querySelector('#composerDesc');
  const userUploadMsg = document.querySelector('#userUploadMsg');
  const userUploadTitle = document.querySelector('#userUploadTitle');
  const userUploadMeta = document.querySelector('#userUploadMeta');
  const streamEnd = document.querySelector('#streamEnd');
  const complianceCard = document.querySelector('#complianceCard');
  let currentFiles = [];
  let markets = [];
  let phase = 'upload';
  let excelDownloaded = false;
  let busy = false;
  let currentMode = 'check';

  function setAnnotationAnalysisLocked(locked) {
    if (!annotationAnalysisButton) return;
    annotationAnalysisButton.disabled = locked;
  }

  function formatSize(bytes) {
    return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
  }

  function scrollStreamToEnd() {
    const stream = document.querySelector('#dropzone') || streamEnd?.closest('.cc-message-stream');
    if (window.LegalDemo?.revealConversationStream) {
      LegalDemo.revealConversationStream(streamEnd || stream, { behavior: 'smooth', force: true });
      return;
    }
    if (!streamEnd) return;
    requestAnimationFrame(() => {
      streamEnd.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }

  function setComposerState() {
    const hasFiles = currentFiles.length > 0;
    const ready = hasFiles && !busy && phase === 'upload';
    composerBox?.classList.toggle('ready', ready);
    composerBox?.classList.toggle('busy', busy);
    if (busy) {
      composerTitle.textContent = 'Processing task';
      composerDesc.textContent = 'Please wait. Results will appear in the conversation when done';
      submitButton.disabled = true;
      submitButton.textContent = 'Processing…';
      return;
    }
    if (phase === 'merge') {
      composerTitle.textContent = 'Merged result ready — continue to gap analysis';
      composerDesc.textContent = 'After confirming the preview, click Continue in the result area';
      submitButton.disabled = true;
      submitButton.textContent = 'Awaiting continue';
      return;
    }
    if (phase === 'analysis') {
      composerTitle.textContent = 'Review result ready';
      composerDesc.textContent = 'Download Excel, or go to annotation analysis';
      submitButton.disabled = true;
      submitButton.textContent = 'Completed';
      return;
    }
    if (hasFiles) {
      composerTitle.textContent = `${currentFiles.length} market checklist(s) selected`;
      composerDesc.textContent = 'Confirm and start merge preview';
      submitButton.disabled = false;
      submitButton.textContent = 'Merge & preview';
    } else {
      composerTitle.textContent = 'Upload Excel checklists to start';
      composerDesc.textContent = 'Multiple .xlsx supported · each file maps to one market; file name is used as the market name';
      submitButton.disabled = true;
      submitButton.textContent = 'Waiting for upload';
    }
  }

  function setActiveStep() {}

  function formatHistoryTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const datePart = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    const timePart = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return `${datePart} ${timePart}`;
  }

  const historyFileIcon =
    '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h8"/><path d="M8 17h6"/></svg>';
  const historyDownloadIcon =
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>';
  const historyDeleteIcon =
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>';
  const attachmentRemoveIcon =
    '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

  function renderHistory() {
    const items = MockStore.complianceHistory(currentMode);
    if (!items.length) {
      historyList.innerHTML = '<p class="history-empty">No download history for this section</p>';
      return;
    }
    historyList.innerHTML = items
      .map((item) => {
        const ok = item.status === 'completed';
        const marketsLabel = (item.markets || []).join(' / ');
        const statusLabel = ok ? 'Completed' : 'Failed';
        return `
      <div class="history-entry" data-id="${item.id}">
        <div class="history-entry-main" title="${marketsLabel ? `${marketsLabel} · ${statusLabel}` : statusLabel}">
          ${historyFileIcon}
          <span class="history-entry-text">
            <span class="history-entry-name">${item.title}</span>
            <time>${formatHistoryTime(item.createdAt)}</time>
          </span>
        </div>
        <button class="download-entry" type="button" title="Download file" aria-label="Download file" data-id="${item.id}" ${ok ? '' : 'disabled'}>
          ${historyDownloadIcon}
        </button>
        <button class="delete-entry" type="button" title="Delete record" aria-label="Delete record" data-id="${item.id}">
          ${historyDeleteIcon}
        </button>
      </div>`;
      })
      .join('');
  }

  function rememberExport(title, mode = currentMode, marketsList = []) {
    MockStore.addComplianceHistory({
      mode,
      title,
      markets: marketsList,
      status: 'completed'
    });
    renderHistory();
  }

  function downloadHistoryItem(id) {
    const item = MockStore.complianceHistory().find((entry) => entry.id === id);
    if (!item) return;
    const blob = new Blob(
      [`Demo compliance checklist export\nFile: ${item.title}\nMarkets: ${(item.markets || []).join(' / ')}\n`],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.title || 'compliance-checklist.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function deleteHistoryItem(id) {
    const item = MockStore.complianceHistory().find((entry) => entry.id === id);
    if (!item) return;
    const ok = await LegalDemo.confirm({
      title: 'Delete record',
      message: `Delete "${item.title || 'this record'}"?`
    });
    if (!ok) return;
    MockStore.removeComplianceHistory(id);
    renderHistory();
  }

  function updateUserUploadBubble() {
    const hasFiles = currentFiles.length > 0;
    userUploadMsg?.classList.toggle('hidden', !hasFiles);
    if (!hasFiles) return;
    const names = currentFiles.map((f) => f.name.replace(/\.xlsx$/i, '')).join(', ');
    userUploadTitle.textContent = `${currentFiles.length} market checklist(s) uploaded`;
    userUploadMeta.textContent = `${names} · ${formatSize(currentFiles.reduce((t, f) => t + f.size, 0))}`;
  }

  function addFiles(files) {
    if (busy || phase !== 'upload') return;
    const selected = Array.from(files || []);
    errorMessage.classList.add('hidden');
    if (!selected.length) return;
    if (selected.some((file) => !file.name.toLowerCase().endsWith('.xlsx'))) {
      showError('All files must be .xlsx format');
      return;
    }
    selected.forEach((file) => {
      if (!currentFiles.find((f) => f.name === file.name && f.size === file.size)) currentFiles.push(file);
    });
    renderSelectedFiles();
    scrollStreamToEnd();
  }

  function renderSelectedFiles() {
    const hasFiles = currentFiles.length > 0;
    selectedFile.classList.toggle('hidden', !hasFiles);
    updateUserUploadBubble();
    setComposerState();
    if (!hasFiles) return;
    document.querySelector('#fileSummary').textContent = `${currentFiles.length} Excel file(s) selected · total ${formatSize(currentFiles.reduce((t, f) => t + f.size, 0))}`;
    document.querySelector('#fileList').innerHTML = currentFiles
      .map(
        (file, index) => `
      <div class="pdf-list-item">
        <span class="pdf-list-item-icon">${historyFileIcon}</span>
        <div class="pdf-list-item-meta">
          <span class="pdf-list-item-name" title="${file.name}">${file.name}</span>
          <span class="pdf-list-item-size">${formatSize(file.size)}</span>
        </div>
        <button class="pdf-list-item-remove remove-one-file" type="button" data-index="${index}" title="Remove" aria-label="Remove">${attachmentRemoveIcon}</button>
      </div>`
      )
      .join('');
  }

  function showProcessing(title, detail) {
    busy = true;
    setComposerState();
    document.querySelector('#resultView').classList.add('hidden');
    document.querySelector('#processingView').classList.remove('hidden');
    document.querySelector('#processingTitle').textContent = title;
    document.querySelector('#processingDetail').textContent = detail;
    scrollStreamToEnd();
  }

  function updateProgress(progress, stage, detail) {
    document.querySelector('#progressBar').style.width = `${progress}%`;
    document.querySelector('#progressPercent').textContent = `${progress}%`;
    document.querySelector('#progressStage').textContent = stage;
    document.querySelector('#processingDetail').textContent = detail;
    document.querySelector('#progressRemaining').textContent =
      progress >= 100 ? 'Est. remaining 00:00:00' : 'Estimating time remaining';
    const track = document.querySelector('#progressTrack');
    if (track) track.setAttribute('aria-valuenow', String(progress));
  }

  function renderPreview(preview, title, finished) {
    busy = false;
    document.querySelector('#processingView').classList.add('hidden');
    document.querySelector('#resultView').classList.remove('hidden');
    document.querySelector('#resultTitle').textContent = title;
    document.querySelector('#resultEyebrow').textContent = finished ? 'RESULT READY' : 'MERGE REVIEW';
    document.querySelector('#previewTitle').textContent = finished ? 'Gap result preview' : 'Merged result preview';
    document.querySelector('#previewMeta').textContent = finished
      ? 'Gap analysis complete — download Mock Excel'
      : 'Please confirm the merged result before continuing';
    document.querySelector('#stats').innerHTML = preview.stats
      .map((s) => `<div class="stat"><strong>${s.value}</strong><span>${s.label}</span></div>`)
      .join('');
    document.querySelector('#previewHead').innerHTML = `<tr>${preview.columns.map((c) => `<th>${c}</th>`).join('')}</tr>`;
    document.querySelector('#previewBody').innerHTML = preview.rows
      .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
      .join('');
    continueButton.classList.toggle('hidden', finished);
    document.querySelector('#downloadButton').classList.toggle('hidden', !finished);
    if (annotationAnalysisButton) {
      annotationAnalysisButton.classList.toggle('hidden', !finished);
      excelDownloaded = false;
      setAnnotationAnalysisLocked(true);
    }
    phase = finished ? 'analysis' : 'merge';
    setActiveStep(finished ? 3 : 1);
    setComposerState();
    scrollStreamToEnd();
  }

  async function runMerge() {
    if (!currentFiles.length || busy) return;
    markets = currentFiles.map((f) => f.name.replace(/\.xlsx$/i, ''));
    phase = 'merge';
    showProcessing('Merging checklists and assigning owners', 'Reading Excel and matching standard numbers...');
    setActiveStep(1);
    const stages = [
      [18, 'Reading data', 'Parsing uploaded checklists'],
      [46, 'Matching regulations', 'Merging by standard number'],
      [72, 'Gap analysis', 'Filling suggested owners'],
      [100, 'Awaiting confirmation', 'Merge complete — awaiting confirmation']
    ];
    for (const [progress, stage, detail] of stages) {
      await LegalDemo.delay(450);
      updateProgress(progress, stage, detail);
    }
    const preview = MockStore.compliancePreview(markets);
    renderPreview(preview, 'Merged result pending confirmation', false);
  }

  async function runAnalysis() {
    if (busy) return;
    phase = 'analysis';
    showProcessing('Generating regulation gaps and remediation suggestions', 'Comparing applicability differences across markets...');
    setActiveStep(2);
    const stages = [
      [20, 'Gap analysis', 'Identifying cross-market differences'],
      [55, 'Building table', 'Writing remediation suggestions'],
      [85, 'Saving result', 'Preparing export content'],
      [100, 'Complete', 'Gap generation finished']
    ];
    for (const [progress, stage, detail] of stages) {
      await LegalDemo.delay(500);
      updateProgress(progress, stage, detail);
    }
    const preview = MockStore.compliancePreview(markets);
    renderPreview(preview, 'Review result generated', true);
  }

  function reset() {
    currentFiles = [];
    markets = [];
    phase = 'upload';
    busy = false;
    try {
      if (window.ComplianceReport && typeof window.ComplianceReport.resetNewTask === 'function') {
        window.ComplianceReport.resetNewTask();
      } else if (window.ComplianceReport && typeof window.ComplianceReport.showReportUpload === 'function') {
        window.ComplianceReport.showReportUpload({ discardInspection: true });
      }
    } catch (error) {
      console.warn('Failed to reset report generation', error);
    }
    renderSelectedFiles();
    document.querySelector('#processingView')?.classList.add('hidden');
    document.querySelector('#resultView')?.classList.add('hidden');
    userUploadMsg?.classList.add('hidden');
    excelDownloaded = false;
    setAnnotationAnalysisLocked(true);
    if (annotationAnalysisButton) annotationAnalysisButton.classList.add('hidden');
    setActiveStep(0);
    setComposerState();
    errorMessage?.classList.add('hidden');
  }

  fileInput.addEventListener('change', () => {
    addFiles(fileInput.files);
    fileInput.value = '';
  });
  ['dragenter', 'dragover'].forEach((type) =>
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      if (busy || phase !== 'upload') return;
      dropzone.classList.add('dragover');
    })
  );
  ['dragleave', 'drop'].forEach((type) =>
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.remove('dragover');
    })
  );
  dropzone.addEventListener('drop', (event) => addFiles(event.dataTransfer.files));
  document.querySelector('#pickFilesBtn').addEventListener('click', (event) => {
    event.stopPropagation();
    if (busy || phase !== 'upload') return;
    fileInput.click();
  });
  document.querySelector('#fileList').addEventListener('click', (event) => {
    const button = event.target.closest('.remove-one-file');
    if (!button || busy || phase !== 'upload') return;
    currentFiles.splice(Number(button.dataset.index), 1);
    renderSelectedFiles();
  });
  submitButton.addEventListener('click', runMerge);
  continueButton.addEventListener('click', runAnalysis);
  document.querySelector('#newCheckButton').addEventListener('click', reset);
  const newTaskBtn = document.querySelector('#newTaskBtn');
  if (newTaskBtn) newTaskBtn.addEventListener('click', reset);
  document.querySelector('#downloadButton').addEventListener('click', (event) => {
    event.preventDefault();
    excelDownloaded = true;
    setAnnotationAnalysisLocked(false);
    const title = `${(markets || []).join('_') || 'compliance-check'}_gap-checklist.xlsx`;
    const blob = new Blob(
      [`Demo compliance checklist export\nFile: ${title}\nMarkets: ${(markets || []).join(' / ')}\n`],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = title;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    rememberExport(title, 'check', markets.slice());
  });
  annotationAnalysisButton?.addEventListener('click', () => {
    if (annotationAnalysisButton.disabled) return;
    switchComplianceMode('report');
  });
  historyList.addEventListener('click', (event) => {
    const downloadBtn = event.target.closest('.download-entry');
    if (downloadBtn) {
      event.preventDefault();
      event.stopPropagation();
      if (!downloadBtn.disabled) downloadHistoryItem(downloadBtn.dataset.id);
      return;
    }
    const deleteBtn = event.target.closest('.delete-entry');
    if (deleteBtn) {
      event.preventDefault();
      event.stopPropagation();
      deleteHistoryItem(deleteBtn.dataset.id);
    }
  });
  document.querySelector('#kbBtn').addEventListener('click', () => {
    openKnowledgeModal();
  });

  const kbModal = document.querySelector('#kbModal');
  const kbModalFrame = document.querySelector('#kbModalFrame');
  const kbModalClose = document.querySelector('#kbModalClose');

  function openKnowledgeModal() {
    if (!kbModal) return;
    kbModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeKnowledgeModal() {
    if (!kbModal) return;
    kbModal.hidden = true;
    document.body.style.overflow = '';
  }

  function onKnowledgeFrameLoad() {
    try {
      const doc = kbModalFrame && kbModalFrame.contentDocument;
      if (!doc) return;
      doc.documentElement.classList.add('kb-embed');
      doc.querySelectorAll('#kbStaticTopbar, .kb-topbar, header.kb-topbar').forEach((el) => el.remove());
    } catch (_) {}
  }

  if (kbModalClose) kbModalClose.addEventListener('click', closeKnowledgeModal);
  if (kbModal) {
    kbModal.addEventListener('click', (event) => {
      if (event.target === kbModal) closeKnowledgeModal();
    });
  }
  if (kbModalFrame) kbModalFrame.addEventListener('load', onKnowledgeFrameLoad);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && kbModal && !kbModal.hidden) closeKnowledgeModal();
  });

  const accountBtn = document.querySelector('#accountBtn');
  const accountMenu = document.querySelector('#accountMenu');
  const user = LegalDemo.readUser();
  const displayName = user.displayName || user.username || 'Guest';
  const displayNameEl = document.querySelector('#userDisplayName');
  const roleEl = document.querySelector('#userRole');
  if (displayNameEl) displayNameEl.textContent = displayName;
  if (roleEl) roleEl.textContent = user.role || 'Administrator';
  accountBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const expanded = accountBtn.getAttribute('aria-expanded') === 'true';
    accountBtn.setAttribute('aria-expanded', String(!expanded));
    accountMenu.classList.toggle('hidden', expanded);
  });
  document.addEventListener('click', () => {
    accountBtn.setAttribute('aria-expanded', 'false');
    accountMenu.classList.add('hidden');
  });
  document.querySelector('#logoutBtn').addEventListener('click', () => LegalDemo.logout());

  function switchComplianceMode(mode) {
    currentMode = mode === 'report' ? 'report' : 'check';
    document.querySelectorAll('.mode-tab[data-mode]').forEach((tab) => {
      const active = tab.dataset.mode === currentMode;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    document.querySelector('#panelCheck').classList.toggle('hidden', currentMode !== 'check');
    document.querySelector('#panelCheck').hidden = currentMode !== 'check';
    document.querySelector('#panelReport').classList.toggle('hidden', currentMode !== 'report');
    document.querySelector('#panelReport').hidden = currentMode !== 'report';
    complianceCard?.classList.toggle('is-conversation', true);
    renderHistory();
    document.dispatchEvent(new CustomEvent('compliance-mode-changed', { detail: { mode: currentMode } }));
  }

  document.querySelectorAll('.mode-tab[data-mode]').forEach((tab) => {
    tab.addEventListener('click', () => switchComplianceMode(tab.dataset.mode));
  });

  window.addEventListener('compliance-history-updated', renderHistory);

  let onboardingHost = null;
  if (window.LegalOnboarding) {
    onboardingHost = LegalOnboarding.createModeHost({
      getMode: () => currentMode,
      setMode: (mode) => {
        switchComplianceMode(mode);
      },
      closeModals: () => {
        if (window.LegalHelpGuide) LegalHelpGuide.close();
        if (kbModal && !kbModal.hidden) closeKnowledgeModal();
      },
      modeWatch: (cb) => {
        document.addEventListener('compliance-mode-changed', cb);
      },
      tours: {
        check: {
          storageKey: 'legal-compliance-check-onboarding-v1',
          steps: [
            {
              selector: '[data-ob="mode-tabs"]',
              title: 'Mode switch',
              desc: 'Switch between Checklist Review and Report Generation. Checklist Review merges multi-market Excel files; Report Generation builds an evaluation report from annotated results.',
              placement: 'bottom',
              ensurePage: 'check'
            },
            {
              selector: '[data-ob="check-welcome"]',
              title: 'Review overview',
              desc: 'Upload Excel checklists by market: the file name is the market name. The system merges by standard number and annotates differences.',
              placement: 'right',
              ensurePage: 'check'
            },
            {
              selector: '[data-ob="check-composer"]',
              title: 'Bottom action bar',
              desc: 'Click the attachment icon to select multiple .xlsx files, or drag them into the conversation, then start the review and download the gap checklist.',
              placement: 'top',
              ensurePage: 'check'
            },
            {
              selector: '[data-ob="new-task"]',
              title: 'New task',
              desc: 'Click here to clear the current upload and results when you need to start a new review.',
              placement: 'right',
              ensurePage: 'check'
            }
          ]
        },
        report: {
          storageKey: 'legal-compliance-report-onboarding-v1',
          steps: [
            {
              selector: '[data-ob="mode-tabs"]',
              title: 'Report generation mode',
              desc: 'After switching to Report Generation, upload a manually annotated checklist, validate it, then generate an evaluation report.',
              placement: 'bottom',
              ensurePage: 'report'
            },
            {
              selector: '[data-ob="report-welcome"]',
              title: 'Report overview',
              desc: 'Read annotation results and risk fields, confirm accuracy, then generate an exportable evaluation report.',
              placement: 'right',
              ensurePage: 'report'
            },
            {
              selector: '[data-ob="report-composer"]',
              title: 'Bottom action bar',
              desc: 'Upload a single annotated .xlsx → validate → Generate evaluation report, then edit project fields and export.',
              placement: 'top',
              ensurePage: 'report'
            },
            {
              selector: '[data-ob="new-task"]',
              title: 'New task',
              desc: 'When starting over with a different annotated file, click here to clear current progress.',
              placement: 'right',
              ensurePage: 'report'
            }
          ]
        }
      }
    });
    onboardingHost.autoStart();
  }

  document.querySelector('#helpBtn')?.addEventListener('click', () => {
    if (window.LegalHelpGuide) {
      LegalHelpGuide.mount(document.body, {
        onRestartTour: () => {
          if (onboardingHost) onboardingHost.startCurrent(true);
        }
      });
      LegalHelpGuide.open();
    }
  });

  renderHistory();
  setComposerState();
})();
