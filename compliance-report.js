(() => {
  const reportFileInput = document.querySelector('#reportFileInput');
  const reportDropzone = document.querySelector('#reportDropzone');
  const reportSelectedFile = document.querySelector('#reportSelectedFile');
  const inspectReportButton = document.querySelector('#inspectReportButton');
  const reportErrorMessage = document.querySelector('#reportErrorMessage');
  const reportForm = document.querySelector('#reportForm');
  const reportComposerBox = document.querySelector('#reportComposerBox');
  const reportComposerTitle = document.querySelector('#reportComposerTitle');
  const reportComposerDesc = document.querySelector('#reportComposerDesc');
  const reportUserUploadMsg = document.querySelector('#reportUserUploadMsg');
  const reportUserUploadTitle = document.querySelector('#reportUserUploadTitle');
  const reportUserUploadMeta = document.querySelector('#reportUserUploadMeta');
  const reportStreamEnd = document.querySelector('#reportStreamEnd');
  const reportComposerArea = document.querySelector('#reportComposerArea');
  if (!reportFileInput || !reportDropzone) return;

  let reportFile = null;
  let inspectionData = null;
  let reportBusy = false;
  let reportPhase = 'upload';
  const STORAGE_KEY = 'compliance-report-inspection';
  const DRAFT_KEY = 'compliance-report-draft';

  function reportFormatSize(bytes) {
    return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function reportEscapeHtml(value) {
    const node = document.createElement('div');
    node.textContent = String(value ?? '');
    return node.innerHTML;
  }

  function reportShowError(message) {
    reportErrorMessage.textContent = message;
    reportErrorMessage.classList.remove('hidden');
  }

  function scrollReportStream() {
    const stream = document.querySelector('#reportDropzone') || reportStreamEnd?.closest('.cc-message-stream');
    if (window.LegalDemo?.revealConversationStream) {
      LegalDemo.revealConversationStream(reportStreamEnd || stream, { behavior: 'smooth', force: true });
      return;
    }
    if (!reportStreamEnd) return;
    requestAnimationFrame(() => {
      reportStreamEnd.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }

  function setReportComposerState() {
    if (!reportComposerBox) return;
    const ready = Boolean(reportFile) && !reportBusy && reportPhase === 'upload';
    reportComposerBox.classList.toggle('ready', ready);
    reportComposerBox.classList.toggle('busy', reportBusy);
    if (reportBusy) {
      reportComposerTitle.textContent = 'Validating annotations';
      reportComposerDesc.textContent = 'Please wait. Results will appear in the conversation when done';
      inspectReportButton.disabled = true;
      inspectReportButton.textContent = 'Processing…';
      return;
    }
    if (reportPhase === 'ready') {
      reportComposerTitle.textContent = 'Annotation validated — ready to generate report';
      reportComposerDesc.textContent = 'Click Generate evaluation report in the result area to continue';
      inspectReportButton.disabled = true;
      inspectReportButton.textContent = 'Awaiting generation';
      return;
    }
    if (reportFile) {
      reportComposerTitle.textContent = 'Annotated file ready';
      reportComposerDesc.textContent = 'Confirm to read assessment results and risk information';
      inspectReportButton.disabled = false;
      inspectReportButton.textContent = 'Read annotation results';
    } else {
      reportComposerTitle.textContent = 'Upload annotation results to analyze';
      reportComposerDesc.textContent = 'Single .xlsx file, max 30 MB';
      inspectReportButton.disabled = true;
      inspectReportButton.textContent = 'Waiting for upload';
    }
  }

  function storedInspection() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (!saved) return null;
      const inspection = JSON.parse(saved);
      return inspection?.fileName && inspection?.reportData ? inspection : null;
    } catch (_) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  function setReportFlow() {}

  function updateReportUserBubble() {
    const hasFile = Boolean(reportFile);
    reportUserUploadMsg?.classList.toggle('hidden', !hasFile);
    if (!hasFile) return;
    reportUserUploadTitle.textContent = 'Annotated file uploaded';
    reportUserUploadMeta.textContent = `${reportFile.name} · ${reportFormatSize(reportFile.size)}`;
  }

  function showReportUpload({ discardInspection = false } = {}) {
    reportFile = null;
    inspectionData = null;
    reportBusy = false;
    reportPhase = 'upload';
    if (reportFileInput) reportFileInput.value = '';
    reportSelectedFile?.classList.add('hidden');
    reportUserUploadMsg?.classList.add('hidden');
    document.querySelector('#reportProcessingView')?.classList.add('hidden');
    document.querySelector('#reportResultView')?.classList.add('hidden');
    document.querySelector('#reportUploadView')?.classList.add('hidden');
    document.querySelector('#reportInspectPhase')?.classList.remove('hidden');
    document.querySelector('#reportGenerateView')?.classList.add('hidden');
    reportComposerArea?.classList.remove('hidden');
    reportErrorMessage?.classList.add('hidden');
    reportDropzone?.classList.remove('dragover');
    if (discardInspection) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(DRAFT_KEY);
      } catch (_) {}
    }
    setReportFlow(false);
    setReportComposerState();
    scrollReportStream();
  }

  function selectReportFile(file) {
    if (reportBusy || reportPhase !== 'upload') return;
    reportErrorMessage.classList.add('hidden');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      reportShowError('Please select an .xlsx annotation result');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      reportShowError(`"${file.name}" exceeds 30 MB`);
      return;
    }
    reportFile = file;
    reportSelectedFile.classList.remove('hidden');
    document.querySelector('#reportFileName').textContent = file.name;
    document.querySelector('#reportFileSize').textContent = reportFormatSize(file.size);
    updateReportUserBubble();
    setReportComposerState();
    scrollReportStream();
  }

  function clearReportFile() {
    if (reportBusy) return;
    reportFile = null;
    reportFileInput.value = '';
    reportSelectedFile.classList.add('hidden');
    reportUserUploadMsg?.classList.add('hidden');
    reportErrorMessage.classList.add('hidden');
    setReportComposerState();
  }

  function saveInspection(payload) {
    inspectionData = payload;
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        fileName: payload.fileName,
        sheetName: payload.sheetName,
        stats: payload.stats,
        reportData: payload.reportData
      })
    );
  }

  function enrichReportData(payload) {
    const mock = MockStore.complianceReportInspect(payload.fileName);
    payload.reportData = {
      ...mock.reportData,
      ...payload.reportData,
      riskCounts: payload.reportData?.riskCounts || mock.reportData.riskCounts,
      riskItems: payload.reportData?.riskItems?.length ? payload.reportData.riskItems : mock.reportData.riskItems
    };
    return payload;
  }

  function renderReportInspection(payload) {
    reportBusy = false;
    reportPhase = 'ready';
    document.querySelector('#reportProcessingView').classList.add('hidden');
    document.querySelector('#reportResultView').classList.remove('hidden');
    document.querySelector('#reportUploadView').classList.add('hidden');
    setReportFlow(true);
    const cards = [
      ['totalRows', 'Total regulations'],
      ['completeRows', 'Fully annotated'],
      ['partialRows', 'Partially annotated'],
      ['pendingRows', 'Not annotated']
    ];
    document.querySelector('#reportStats').innerHTML = cards
      .map(([key, label]) => `<div class="stat"><strong>${payload.stats[key]}</strong><span>${label}</span></div>`)
      .join('');
    const headers = payload.preview.headers || [];
    const rows = payload.preview.rows || [];
    document.querySelector('#reportPreviewHead').innerHTML = `<tr>${headers.map((value) => `<th>${reportEscapeHtml(value)}</th>`).join('')}</tr>`;
    document.querySelector('#reportPreviewBody').innerHTML = rows.length
      ? rows
          .map(
            (row) =>
              `<tr>${headers.map((_, index) => `<td>${reportEscapeHtml(row[index] || '')}</td>`).join('')}</tr>`
          )
          .join('')
      : `<tr><td class="empty-row" colspan="${Math.max(headers.length, 1)}">No annotation data</td></tr>`;
    document.querySelector('#reportPreviewMeta').textContent = `${payload.fileName} · ${payload.sheetName} · showing ${payload.preview.shownRows} rows`;
    saveInspection(enrichReportData(payload));
    document.querySelector('#openReportGenerator').disabled = false;
    setReportComposerState();
    scrollReportStream();
  }

  async function inspectReport() {
    if (!reportFile || reportBusy) return;
    reportBusy = true;
    reportPhase = 'upload';
    setReportComposerState();
    document.querySelector('#reportUploadView').classList.add('hidden');
    document.querySelector('#reportResultView').classList.add('hidden');
    document.querySelector('#reportProcessingView').classList.remove('hidden');
    reportErrorMessage.classList.add('hidden');
    scrollReportStream();
    try {
      let payload = null;
      try {
        const body = new FormData();
        body.append('file', reportFile);
        const response = await LegalDemo.fetchWithTimeout(
          'http://10.182.37.12:8010/api/compliance-report/inspect',
          { method: 'POST', body },
          1200
        );
        if (response.ok) payload = await response.json();
      } catch (_) {}
      if (!payload) {
        await LegalDemo.delay(500);
        payload = MockStore.complianceReportInspect(reportFile.name);
      }
      renderReportInspection(payload);
    } catch (error) {
      reportBusy = false;
      reportPhase = 'upload';
      document.querySelector('#reportProcessingView').classList.add('hidden');
      document.querySelector('#reportUploadView').classList.remove('hidden');
      setReportComposerState();
      reportShowError(error.message || 'Annotation file validation failed');
    }
  }

  function reportRiskCounts() {
    return (
      inspectionData?.reportData?.riskCounts || {
        highRisk: 0,
        mediumRisk: 0,
        lowRisk: 0,
        pending: 0,
        notApplicable: 0
      }
    );
  }

  function fieldValue(name) {
    const field = reportForm.elements.namedItem(name);
    if (!field) return '';
    if (field instanceof RadioNodeList) return field.value || '';
    return field.value.trim();
  }

  function syncPreviewFieldToForm(name, value) {
    const field = reportForm.elements.namedItem(name);
    if (!field) return;
    if (field instanceof RadioNodeList) {
      Array.from(field).forEach((option) => {
        option.checked = option.value === value;
      });
    } else {
      field.value = value;
    }
  }

  function numericValue(name) {
    const value = Number.parseInt(fieldValue(name), 10);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function currentPayload() {
    return {
      projectName: fieldValue('projectName'),
      assessmentStage: fieldValue('assessmentStage'),
      listType: fieldValue('listType'),
      finalCount: numericValue('finalCount'),
      sourceFileName: inspectionData?.fileName || '',
      riskCounts: reportRiskCounts(),
      riskItems: inspectionData?.reportData?.riskItems || []
    };
  }

  function renderRiskItems(items) {
    const body = document.querySelector('#previewRiskBody');
    body.innerHTML = items.length
      ? items
          .map(
            (item) => `
    <tr>
      <td>${reportEscapeHtml(item.responsibility)}</td>
      <td>${reportEscapeHtml(item.market)}</td>
      <td>${reportEscapeHtml(item.standard)}</td>
      <td>${reportEscapeHtml(item.name)}</td>
      <td><span class="cc-risk-badge ${item.riskLevel === 'High Risk' ? 'high' : 'medium'}">${reportEscapeHtml(item.riskLevel)}</span></td>
      <td>${reportEscapeHtml(item.strategy)}</td>
    </tr>`
          )
          .join('')
      : '<tr><td colspan="6" class="cc-empty-state">No high- or medium-risk items</td></tr>';
  }

  function updatePreview() {
    const payload = currentPayload();
    const counts = payload.riskCounts;
    const titleInput = document.querySelector('#previewReportTitleInput');
    if (document.activeElement !== titleInput) {
      titleInput.value = payload.projectName || 'Regulation requirement confirmation result';
    }
    document.querySelector('#previewAssessmentStage').value = payload.assessmentStage || '';
    document.querySelector('#previewListType').value = payload.listType || '';
    document.querySelector('#previewFinalCount').textContent = String(payload.finalCount);
    document.querySelector('#previewHighRisk').textContent = String(counts.highRisk || 0);
    document.querySelector('#previewMediumRisk').textContent = String(counts.mediumRisk || 0);
    document.querySelector('#previewLowRisk').textContent = String(counts.lowRisk || 0);
    document.querySelector('#previewPending').textContent = String(counts.pending || 0);
    document.querySelector('#previewNotApplicable').textContent = String(counts.notApplicable || 0);
    renderRiskItems(payload.riskItems);
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }

  function restoreForm() {
    const saved = sessionStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const payload = JSON.parse(saved);
      Object.entries(payload).forEach(([name, value]) => {
        const field = reportForm.elements.namedItem(name);
        if (!field) return;
        if (field instanceof RadioNodeList) {
          Array.from(field).forEach((option) => {
            option.checked = option.value === value;
          });
        } else {
          field.value = value ?? '';
        }
      });
    } catch (_) {
      sessionStorage.removeItem(DRAFT_KEY);
    }
  }

  function restoreAnnotationSource() {
    const inspection = storedInspection();
    if (!inspection) return false;
    inspectionData = inspection;
    document.querySelector('#annotationSource').textContent = inspection.fileName;
    document.querySelector('#finalCount').value = inspection.reportData.totalRows || 0;
    return true;
  }

  function showReportGenerate() {
    if (!restoreAnnotationSource()) {
      window.alert('Please complete annotation file validation first');
      return;
    }
    reportPhase = 'generate';
    document.querySelector('#reportInspectPhase').classList.add('hidden');
    document.querySelector('#reportGenerateView').classList.remove('hidden');
    reportComposerArea?.classList.add('hidden');
    restoreForm();
    if (!fieldValue('projectName')) {
      document.querySelector('#projectName').value = 'Regulation requirement confirmation result';
    }
    updatePreview();
    requestAnimationFrame(() => {
      document.querySelector('#reportGenerateView .cc-message-stream')?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function backToInspectResult() {
    reportPhase = 'ready';
    document.querySelector('#reportGenerateView').classList.add('hidden');
    document.querySelector('#reportInspectPhase').classList.remove('hidden');
    document.querySelector('#reportUploadView').classList.add('hidden');
    document.querySelector('#reportProcessingView').classList.add('hidden');
    document.querySelector('#reportResultView').classList.remove('hidden');
    reportComposerArea?.classList.remove('hidden');
    setReportFlow(true);
    setReportComposerState();
    scrollReportStream();
  }

  reportFileInput.addEventListener('change', () => {
    selectReportFile(reportFileInput.files[0]);
    reportFileInput.value = '';
  });
  ['dragenter', 'dragover'].forEach((type) =>
    reportDropzone.addEventListener(type, (event) => {
      event.preventDefault();
      if (reportBusy || reportPhase !== 'upload') return;
      reportDropzone.classList.add('dragover');
    })
  );
  ['dragleave', 'drop'].forEach((type) =>
    reportDropzone.addEventListener(type, (event) => {
      event.preventDefault();
      reportDropzone.classList.remove('dragover');
    })
  );
  reportDropzone.addEventListener('drop', (event) => selectReportFile(event.dataTransfer.files[0]));
  document.querySelector('#pickReportBtn').addEventListener('click', (event) => {
    event.stopPropagation();
    if (reportBusy || reportPhase !== 'upload') return;
    reportFileInput.click();
  });
  document.querySelector('#removeReportFile').addEventListener('click', (event) => {
    event.stopPropagation();
    clearReportFile();
  });
  inspectReportButton.addEventListener('click', inspectReport);
  document.querySelector('#openReportGenerator').addEventListener('click', showReportGenerate);
  document.querySelector('#replaceReportFile').addEventListener('click', () => showReportUpload());

  const titleInput = document.querySelector('#previewReportTitleInput');

  titleInput.addEventListener('input', () => {
    document.querySelector('#projectName').value = titleInput.value.trim();
  });

  titleInput.addEventListener('change', () => {
    document.querySelector('#projectName').value = titleInput.value.trim() || 'Regulation requirement confirmation result';
    updatePreview();
  });

  document.querySelector('#previewAssessmentStage').addEventListener('change', (event) => {
    syncPreviewFieldToForm('assessmentStage', event.target.value);
    updatePreview();
  });

  document.querySelector('#previewListType').addEventListener('change', (event) => {
    syncPreviewFieldToForm('listType', event.target.value);
    updatePreview();
  });

  reportForm.addEventListener('input', updatePreview);
  reportForm.addEventListener('change', updatePreview);

  document.querySelector('#exportReportButton').addEventListener('click', async () => {
    const exportBtn = document.querySelector('#exportReportButton');
    const originalLabel = exportBtn.innerHTML;
    const fileName = `${fieldValue('projectName') || 'regulation-requirement'}_requirement-confirmation-report.xlsx`;
    exportBtn.disabled = true;
    exportBtn.textContent = 'Generating Excel...';
    try {
      let ok = false;
      try {
        const response = await LegalDemo.fetchWithTimeout(
          'http://10.182.37.12:8010/api/compliance-report/download',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentPayload())
          },
          1200
        );
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
          ok = true;
        }
      } catch (_) {}
      if (!ok) {
        await LegalDemo.delay(800);
        const blob = new Blob(
          [`Demo regulation requirement confirmation report\nProject: ${fieldValue('projectName') || ''}\n`],
          { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }
      if (window.MockStore?.addComplianceHistory) {
        MockStore.addComplianceHistory({
          mode: 'report',
          title: fileName,
          status: 'completed'
        });
        window.dispatchEvent(new CustomEvent('compliance-history-updated'));
      }
    } catch (error) {
      window.alert(error.message || 'Failed to export evaluation report');
    } finally {
      exportBtn.disabled = false;
      exportBtn.innerHTML = originalLabel;
    }
  });

  window.ComplianceReport = {
    showReportUpload,
    showReportGenerate,
    resetNewTask() {
      try {
        sessionStorage.removeItem(DRAFT_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (_) {}
      inspectionData = null;
      reportFile = null;
      reportBusy = false;
      reportPhase = 'upload';
      showReportUpload({ discardInspection: true });
      document.querySelector('#reportResultView')?.classList.add('hidden');
      document.querySelector('#reportProcessingView')?.classList.add('hidden');
      document.querySelector('#reportGenerateView')?.classList.add('hidden');
      document.querySelector('#reportInspectPhase')?.classList.remove('hidden');
      reportComposerArea?.classList.remove('hidden');
      reportUserUploadMsg?.classList.add('hidden');
      reportSelectedFile?.classList.add('hidden');
      if (reportForm) reportForm.reset();
      const titleInput = document.querySelector('#previewReportTitleInput');
      if (titleInput) titleInput.value = '';
      setReportFlow(false);
      setReportComposerState();
    }
  };
  showReportUpload();
})();
