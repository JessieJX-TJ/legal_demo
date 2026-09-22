const { createApp, ref, computed, watch, nextTick, onMounted, onBeforeUnmount } = Vue;

createApp({
  setup() {
    LegalDemo.requireLogin();

    const currentUser = ref(LegalDemo.readUser());
    const userInitials = computed(() => LegalDemo.initials(currentUser.value.displayName));
    const showAccountMenu = ref(false);
    const showHelpModal = ref(false);
    const showKnowledgeModal = ref(false);
    const helpVideoUrl = ref('./static/tutorials/demo.mp4');
    const showHistoryModal = ref(false);
    const currentPage = ref('breakdown');
    let onboardingHost = null;
    const historyModeFilter = ref('breakdown');

    const crawlStatus = ref([]);
    const showCrawlPanel = ref(false);
    const FALLBACK_CRAWL = [
      { site_key: 'catarc_gzdt', display_name: 'CATARC - Work updates', record_count: 205, last_crawl_status: 'success', is_crawling: false },
      { site_key: 'catarc_jhgg', display_name: 'CATARC - Plan notices', record_count: 5, last_crawl_status: 'success', is_crawling: false },
      { site_key: 'catarc_zqyj', display_name: 'CATARC - Public consultation', record_count: 169, last_crawl_status: 'success', is_crawling: false },
      { site_key: 'miit_zbys_qcgy', display_name: 'MIIT Equipment Dept I - Auto industry', record_count: 251, last_crawl_status: 'success', is_crawling: false },
      { site_key: 'sac_tzgg', display_name: 'SAC - Notices', record_count: 41, last_crawl_status: 'success', is_crawling: false },
      { site_key: 'samr_nocGB', display_name: 'SAMR - National standard approvals', record_count: 1626, last_crawl_status: 'success', is_crawling: false }
    ];

    const greeting = computed(() => {
      const hour = new Date().getHours();
      if (hour < 12) return { text: 'Good morning', icon: '☀️' };
      if (hour < 18) return { text: 'Good afternoon', icon: '🌤️' };
      return { text: 'Good evening', icon: '🌙' };
    });

    /* ===== Regulation breakdown ===== */
    const breakdownTitle = ref('Regulation breakdown');
    const breakdownDepth = ref(5);
    const breakdownDepthOptions = [
      { value: 1, label: 'Level-1 heading (2)' },
      { value: 2, label: 'Level-2 heading (2.1)' },
      { value: 3, label: 'Level-3 heading (2.1.1)' },
      { value: 4, label: 'Level-4 heading (2.1.1.1)' },
      { value: 5, label: 'Level-5 / finest (2.1.1.1.1)' }
    ];
    const breakdownDragOver = ref(false);
    const breakdownFile = ref(null);
    const breakdownUploadConfirmed = ref(false);
    const breakdownInput = ref(null);
    const breakdownForceRebuild = ref(false);
    const breakdownLoading = ref(false);
    const breakdownStatus = ref('');
    const breakdownError = ref('');
    const breakdownPreviewLoading = ref(false);
    const breakdownPreview = ref(null);
    const breakdownPreviewError = ref('');
    const breakdownTaskId = ref('');
    const isBreakdownPreviewFullscreen = ref(false);

    /* ===== Old vs new compare ===== */
    const compareReportTitle = ref('Old vs New Regulation Comparison Report');
    const compareLeftFile = ref(null);
    const compareUploadConfirmed = ref(false);
    const compareRightFile = ref(null);
    const compareLeftInput = ref(null);
    const compareRightInput = ref(null);
    const isCompareLeftDragOver = ref(false);
    const isCompareRightDragOver = ref(false);
    const compareMode = ref('same_depth');
    const compareDepth = ref(3);
    const compareDepthOptions = breakdownDepthOptions;
    const compareSimilarityThreshold = ref(0.55);
    const compareLoading = ref(false);
    const compareProgress = ref(null);
    const compareResult = ref(null);
    const compareError = ref('');
    const compareSearchQuery = ref('');
    const isCompareFullscreen = ref(false);
    const leftStdLabel = ref('');
    const rightStdLabel = ref('');

    const historyItems = ref([
      {
        id: 'bd-1',
        mode: 'breakdown',
        title: 'GB 15083-2019 seat regulation breakdown',
        fileName: 'GB 15083-2019 seat regulation breakdown.csv',
        date: '2026-08-20T09:12:00+08:00',
        preview: null
      },
      {
        id: 'bd-2',
        mode: 'breakdown',
        title: 'GB 18384-2025 battery safety breakdown',
        fileName: 'GB 18384-2025 battery safety breakdown.csv',
        date: '2026-08-12T14:30:00+08:00',
        preview: null
      },
      {
        id: 'cmp-1',
        mode: 'compare',
        title: 'GB 15083-2006 → GB 15083-2019',
        fileName: 'GB 15083-2006 → GB 15083-2019.csv',
        date: '2026-08-18T16:40:00+08:00',
        preview: null
      },
      {
        id: 'cmp-2',
        mode: 'compare',
        title: 'Prior battery safety requirements → GB 18384-2025',
        fileName: 'Prior battery safety requirements → GB 18384-2025.csv',
        date: '2026-08-05T11:05:00+08:00',
        preview: null
      }
    ]);

    const activeHistoryId = ref('');

    const filteredHistory = computed(() =>
      historyItems.value.filter((item) => !historyModeFilter.value || item.mode === historyModeFilter.value)
    );

    const sidebarHistory = computed(() =>
      historyItems.value.filter((item) => item.mode === currentPage.value)
    );

    const compareAllRows = computed(() => (compareResult.value && compareResult.value.rows) || []);
    const compareTotalRows = computed(() => compareAllRows.value.length);
    const compareRows = computed(() => {
      const q = (compareSearchQuery.value || '').toLowerCase();
      if (!q) return compareAllRows.value;
      return compareAllRows.value.filter((row) => {
        const hay = [row.topic, row.clauses, row.old, row.new, row.explanation, row.impact]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    });

    const compareModeSummary = computed(() => {
      if (compareMode.value === 'cross_level') return 'Cross-level match';
      return `Same level · ${compareDepth.value} level(s)`;
    });

    const breakdownStep = computed(() => {
      if (breakdownPreview.value || breakdownPreviewError.value) return 3;
      if (breakdownLoading.value || breakdownPreviewLoading.value) return 2;
      if (breakdownUploadConfirmed.value) return 1;
      return 0;
    });

    const breakdownComposerTitle = computed(() => {
      if (breakdownLoading.value || breakdownPreviewLoading.value) return 'Breaking down regulation PDF';
      if (breakdownPreview.value) return 'Breakdown complete';
      if (breakdownUploadConfirmed.value) return 'Confirm parameters, then start breakdown';
      if (breakdownFile.value) return 'File selected — please confirm upload';
      return 'Upload a regulation PDF to start breakdown';
    });

    const breakdownComposerDesc = computed(() => {
      if (breakdownLoading.value || breakdownPreviewLoading.value) {
        return breakdownStatus.value || 'TextIn parsing, LLM filtering, and Excel generation in progress';
      }
      if (breakdownPreview.value) return 'Export the preview, or start a new task to break down again';
      if (breakdownUploadConfirmed.value) return 'Enter title and detail level in the conversation, then start breakdown';
      if (breakdownFile.value) return 'Click "Confirm upload" to set parameters';
      return 'Click the paperclip or drag a PDF into the conversation · max 100MB';
    });

    const breakdownPrimaryLabel = computed(() => {
      if (breakdownLoading.value || breakdownPreviewLoading.value) return 'Breaking down…';
      if (breakdownPreview.value) return 'Completed';
      if (breakdownUploadConfirmed.value) return 'Start breakdown';
      if (breakdownFile.value) return 'Confirm upload';
      return 'Waiting for upload';
    });

    const breakdownComposerReady = computed(() => {
      if (breakdownLoading.value || breakdownPreviewLoading.value || breakdownPreview.value) return false;
      return !!breakdownFile.value;
    });

    const compareStep = computed(() => {
      if (compareResult.value) return 3;
      if (compareLoading.value) return 2;
      if (compareUploadConfirmed.value) return 1;
      return 0;
    });

    const compareComposerTitle = computed(() => {
      if (compareLoading.value) return 'Comparing old and new regulations';
      if (compareResult.value) return 'Compare complete';
      if (compareUploadConfirmed.value) return 'Confirm parameters, then start compare';
      if (compareLeftFile.value && compareRightFile.value) return 'File selected — please confirm upload';
      if (compareLeftFile.value || compareRightFile.value) return 'Please select the other regulation PDF';
      return 'Upload old and new PDFs to start compare';
    });

    const compareComposerDesc = computed(() => {
      if (compareLoading.value) return (compareProgress.value && compareProgress.value.message) || 'Breakdown, alignment, and clause comparison in progress';
      if (compareResult.value) return 'Export differences, or start a new task to compare again';
      if (compareUploadConfirmed.value) return 'Enter the report title and compare options in the conversation';
      if (compareLeftFile.value && compareRightFile.value) return 'Click "Confirm upload" to set parameters';
      if (compareLeftFile.value && !compareRightFile.value) return 'Old version selected — please select the new PDF';
      if (!compareLeftFile.value && compareRightFile.value) return 'New version selected — please select the old PDF';
      return 'Select old and new PDFs separately · max 100MB each';
    });

    const comparePrimaryLabel = computed(() => {
      if (compareLoading.value) return 'Comparing…';
      if (compareResult.value) return 'Completed';
      if (compareUploadConfirmed.value) return 'Start compare';
      if (compareLeftFile.value && compareRightFile.value) return 'Confirm upload';
      return 'Waiting for upload';
    });

    const compareComposerReady = computed(() => {
      if (compareLoading.value || compareResult.value) return false;
      return !!(compareLeftFile.value && compareRightFile.value);
    });

    async function loadCrawlStatus() {
      try {
        const response = await fetch('./js/crawl-status.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('load failed');
        const data = await response.json();
        crawlStatus.value = (Array.isArray(data) ? data : []).map((item) => ({
          site_key: item.site_key,
          display_name: item.display_name,
          record_count: item.record_count || 0,
          last_crawl_status: item.last_crawl_status || 'none',
          is_crawling: false
        }));
        if (!crawlStatus.value.length) crawlStatus.value = FALLBACK_CRAWL.map((x) => ({ ...x }));
      } catch (_) {
        crawlStatus.value = FALLBACK_CRAWL.map((x) => ({ ...x }));
      }
    }

    function successCount() {
      return crawlStatus.value.filter((s) => s.last_crawl_status === 'success').length;
    }

    function totalRecords() {
      return crawlStatus.value.reduce((sum, s) => sum + (s.record_count || 0), 0);
    }

    function isAnyCrawling() {
      return crawlStatus.value.some((s) => s.is_crawling);
    }

    async function crawlOne(siteKey) {
      const src = crawlStatus.value.find((s) => s.site_key === siteKey);
      if (!src || src.is_crawling) return;
      src.is_crawling = true;
      await LegalDemo.delay(900 + Math.random() * 600);
      src.is_crawling = false;
      src.last_crawl_status = 'success';
      src.record_count = (src.record_count || 0) + Math.floor(Math.random() * 5) + 1;
    }

    async function crawlAll() {
      if (isAnyCrawling()) return;
      await Promise.all(crawlStatus.value.map((s) => crawlOne(s.site_key)));
    }

    function toggleCrawlPanel() {
      showCrawlPanel.value = !showCrawlPanel.value;
      if (showCrawlPanel.value) loadCrawlStatus();
    }

    function formatFileSize(bytes) {
      if (!bytes && bytes !== 0) return '';
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function pickPdfFromEvent(event) {
      const file = event?.target?.files?.[0] || event?.dataTransfer?.files?.[0] || null;
      if (event?.target) event.target.value = '';
      if (!file) return null;
      const name = (file.name || '').toLowerCase();
      if (!name.endsWith('.pdf') && file.type !== 'application/pdf') {
        alert('Please upload a PDF file');
        return null;
      }
      if (file.size > 100 * 1024 * 1024) {
        alert('Each PDF must be 100MB or smaller');
        return null;
      }
      return file;
    }

    function switchToPage(page) {
      currentPage.value = page;
      location.hash = `#/${page}`;
      document.body.classList.remove('compare-fullscreen');
      isCompareFullscreen.value = false;
      isBreakdownPreviewFullscreen.value = false;
    }

    function openKnowledgeBase() {
      showKnowledgeModal.value = true;
    }

    function closeKnowledgeModal() {
      showKnowledgeModal.value = false;
    }

    function onKnowledgeFrameLoad(event) {
      try {
        const doc = event && event.target && event.target.contentDocument;
        if (!doc) return;
        doc.documentElement.classList.add('kb-embed');
        doc.querySelectorAll('#kbStaticTopbar, .kb-topbar, header.kb-topbar').forEach((el) => el.remove());
      } catch (_) {}
    }

    function clearFileInput(inputRef) {
      if (inputRef && inputRef.value) inputRef.value.value = '';
    }

    function resetBreakdownTask() {
      breakdownTitle.value = 'Regulation breakdown';
      breakdownDepth.value = 5;
      breakdownDragOver.value = false;
      breakdownFile.value = null;
      breakdownUploadConfirmed.value = false;
      breakdownForceRebuild.value = false;
      breakdownLoading.value = false;
      breakdownStatus.value = '';
      breakdownError.value = '';
      breakdownPreviewLoading.value = false;
      breakdownPreview.value = null;
      breakdownPreviewError.value = '';
      breakdownTaskId.value = '';
      isBreakdownPreviewFullscreen.value = false;
      clearFileInput(breakdownInput);
    }

    function resetCompareTask() {
      compareReportTitle.value = 'Old vs New Regulation Comparison Report';
      compareLeftFile.value = null;
      compareRightFile.value = null;
      compareUploadConfirmed.value = false;
      isCompareLeftDragOver.value = false;
      isCompareRightDragOver.value = false;
      compareMode.value = 'same_depth';
      compareDepth.value = 3;
      compareSimilarityThreshold.value = 0.55;
      compareLoading.value = false;
      compareProgress.value = null;
      compareResult.value = null;
      compareError.value = '';
      compareSearchQuery.value = '';
      isCompareFullscreen.value = false;
      leftStdLabel.value = '';
      rightStdLabel.value = '';
      clearFileInput(compareLeftInput);
      clearFileInput(compareRightInput);
    }

    function startNewTask() {
      activeHistoryId.value = '';
      document.body.classList.remove('compare-fullscreen');
      if (currentPage.value === 'compare') {
        resetCompareTask();
      } else {
        resetBreakdownTask();
      }
      requestAnimationFrame(() => {
        const stream = document.querySelector('.content-card.is-conversation .cc-message-stream');
        if (stream) stream.scrollTop = 0;
      });
    }

    function logout() {
      LegalDemo.logout();
    }

    function openHistoryModal(mode) {
      historyModeFilter.value = mode || currentPage.value;
      showHistoryModal.value = true;
    }

    function openHistoryItem(item) {
      showHistoryModal.value = false;
      activeHistoryId.value = item.id;
      if (item.mode === 'breakdown') {
        switchToPage('breakdown');
        breakdownTitle.value = item.title;
        breakdownTaskId.value = item.id;
        breakdownPreview.value = buildMockBreakdownPreview(item.title);
      } else {
        switchToPage('compare');
        compareReportTitle.value = item.title;
        leftStdLabel.value = item.title.split('→')[0]?.trim() || 'Old version';
        rightStdLabel.value = item.title.split('→')[1]?.trim() || 'New version';
        compareResult.value = { rows: buildMockCompareRows() };
      }
    }

    function formatHistoryDate(value) {
      if (!value) return '';
      let date = new Date(value);
      if (Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        date = new Date(`${value}T09:00:00+08:00`);
      }
      if (Number.isNaN(date.getTime())) return String(value);
      const datePart = date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
      const timePart = date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      return `${datePart} ${timePart}`;
    }

    function downloadHistoryItem(item) {
      if (!item) return;
      const content = [
        `Title: ${item.title || ''}`,
        `Date: ${item.date || ''}`,
        item.meta ? `Summary: ${item.meta}` : '',
        item.mode === 'compare' ? 'Type: regulation compare' : 'Type: regulation breakdown',
        '',
        '(Demo mock download content)'
      ]
        .filter(Boolean)
        .join('\n');
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = String(item.title || 'History').replace(/[\\/:*?"<>|]/g, '_');
      link.href = url;
      link.download = `${safeName}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    async function deleteHistoryItem(item) {
      if (!item?.id) return;
      const ok = await LegalDemo.confirm({
        title: 'Delete record',
        message: `Delete "${item.title || 'this record'}"?`
      });
      if (!ok) return;
      historyItems.value = historyItems.value.filter((entry) => entry.id !== item.id);
      if (activeHistoryId.value === item.id) activeHistoryId.value = '';
    }

    /* ===== breakdown handlers ===== */
    function onBreakdownPick(e) {
      const file = pickPdfFromEvent(e);
      if (file) {
        breakdownFile.value = file;
        breakdownUploadConfirmed.value = false;
      }
      breakdownDragOver.value = false;
    }

    function onBreakdownDrop(e) {
      breakdownDragOver.value = false;
      const file = pickPdfFromEvent(e);
      if (file) {
        breakdownFile.value = file;
        breakdownUploadConfirmed.value = false;
      }
    }

    function removeBreakdownFile() {
      breakdownFile.value = null;
      breakdownUploadConfirmed.value = false;
    }

    function confirmBreakdownUpload() {
      if (!breakdownFile.value) return;
      breakdownUploadConfirmed.value = true;
    }

    function onBreakdownPrimaryAction() {
      if (!breakdownComposerReady.value) return;
      if (!breakdownUploadConfirmed.value) {
        confirmBreakdownUpload();
        return;
      }
      startRegulationBreakdown();
    }

    function buildMockBreakdownPreview(title) {
      const name = title || breakdownTitle.value || 'Regulation breakdown';
      return {
        row_count: 8,
        breakdown_depth: breakdownDepth.value,
        table_count: 2,
        image_count: 1,
        breakdown_version: 'mock-v1',
        rows: [
          { excel_row: 1, clause_no: '4', type: 'text', text: `${name} · General requirements` },
          {
            excel_row: 2,
            clause_no: '4.1',
            type: 'text',
            text: 'Seats and their anchorages shall withstand the specified static and dynamic loads without failure that endangers occupants.'
          },
          {
            excel_row: 3,
            clause_no: '4.1.1',
            type: 'text',
            text: 'Head restraints and seat backs shall each meet forward-displacement limits; no sharp edges after the test.'
          },
          {
            excel_row: 4,
            clause_no: '4.2',
            type: 'text',
            text: 'Luggage retention devices shall limit forward luggage movement to avoid striking occupants.'
          },
          {
            excel_row: 5,
            clause_no: '4.2.1',
            type: 'text',
            text: 'Head-restraint forward limit 150 mm; seat-back forward limit 100 mm (demo mock).'
          },
          {
            excel_row: 6,
            clause_no: '5',
            type: 'text',
            text: 'Test method: apply loads per appendix conditions and record displacement curves.'
          },
          {
            excel_row: 7,
            clause_no: 'Figure',
            type: 'image',
            asset_url:
              'data:image/svg+xml,' +
              encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="120"><rect width="100%" height="100%" fill="#f1f5f9"/><text x="50%" y="55%" text-anchor="middle" fill="#64748b" font-size="14">Schematic (mock)</text></svg>'
              ),
            alt: 'Schematic'
          },
          {
            excel_row: 8,
            clause_no: 'Source',
            type: 'source',
            is_link: false,
            text: breakdownFile.value?.name || 'uploaded.pdf'
          }
        ]
      };
    }

    async function startRegulationBreakdown() {
      if (!breakdownFile.value || breakdownLoading.value) return;
      breakdownError.value = '';
      breakdownPreview.value = null;
      breakdownPreviewError.value = '';
      breakdownLoading.value = true;
      breakdownStatus.value = 'Breaking down regulation PDF';
      await LegalDemo.delay(900);
      breakdownStatus.value = 'TextIn parsing…';
      await LegalDemo.delay(700);
      breakdownStatus.value = 'LLM technical filtering…';
      await LegalDemo.delay(800);
      breakdownStatus.value = 'Generating Excel…';
      await LegalDemo.delay(600);
      breakdownLoading.value = false;
      breakdownTaskId.value = LegalDemo.uid('bd');
      breakdownPreviewLoading.value = true;
      await LegalDemo.delay(500);
      breakdownPreviewLoading.value = false;
      breakdownPreview.value = buildMockBreakdownPreview();
    }

    function rememberHistoryExport(mode, title, fileName) {
      historyItems.value.unshift({
        id: LegalDemo.uid(mode === 'compare' ? 'cmp' : 'bd'),
        mode,
        title: title || fileName || 'Export file',
        fileName: fileName || title || 'Export file',
        date: new Date().toISOString()
      });
    }

    function downloadBreakdownExcel() {
      if (!breakdownPreview.value) return;
      const lines = ['Clause No.,Regulatory requirement'];
      (breakdownPreview.value.rows || []).forEach((row) => {
        const text = String(row.text || row.alt || '').replace(/"/g, '""');
        lines.push(`"${row.clause_no}","${text}"`);
      });
      const fileName = `${breakdownTitle.value || 'Regulation breakdown'}.csv`;
      const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      rememberHistoryExport('breakdown', breakdownTitle.value || breakdownFile.value?.name, fileName);
    }

    function toggleBreakdownPreviewFullscreen() {
      isBreakdownPreviewFullscreen.value = !isBreakdownPreviewFullscreen.value;
      document.body.classList.toggle('compare-fullscreen', isBreakdownPreviewFullscreen.value);
    }

    /* ===== compare handlers ===== */
    function onCompareLeftPick(e) {
      const file = pickPdfFromEvent(e);
      if (file) {
        compareLeftFile.value = file;
        leftStdLabel.value = file.name.replace(/\.pdf$/i, '');
        compareUploadConfirmed.value = false;
      }
      isCompareLeftDragOver.value = false;
    }

    function onCompareRightPick(e) {
      const file = pickPdfFromEvent(e);
      if (file) {
        compareRightFile.value = file;
        rightStdLabel.value = file.name.replace(/\.pdf$/i, '');
        compareUploadConfirmed.value = false;
      }
      isCompareRightDragOver.value = false;
    }

    function onCompareLeftDrop(e) {
      isCompareLeftDragOver.value = false;
      const file = pickPdfFromEvent(e);
      if (file) {
        compareLeftFile.value = file;
        leftStdLabel.value = file.name.replace(/\.pdf$/i, '');
        compareUploadConfirmed.value = false;
      }
    }

    function onCompareRightDrop(e) {
      isCompareRightDragOver.value = false;
      const file = pickPdfFromEvent(e);
      if (file) {
        compareRightFile.value = file;
        rightStdLabel.value = file.name.replace(/\.pdf$/i, '');
        compareUploadConfirmed.value = false;
      }
    }

    function removeCompareFile(side) {
      if (side === 'left') {
        compareLeftFile.value = null;
        leftStdLabel.value = '';
      } else {
        compareRightFile.value = null;
        rightStdLabel.value = '';
      }
      compareUploadConfirmed.value = false;
    }

    function confirmCompareUpload() {
      if (!compareLeftFile.value || !compareRightFile.value) return;
      compareUploadConfirmed.value = true;
    }

    function onComparePrimaryAction() {
      if (!compareComposerReady.value) return;
      if (!compareUploadConfirmed.value) {
        confirmCompareUpload();
        return;
      }
      startCompare();
    }

    function setCompareMode(mode) {
      compareMode.value = mode;
    }

    function normalizeCompareSimilarityThreshold() {
      let v = Number(compareSimilarityThreshold.value);
      if (Number.isNaN(v)) v = 0.55;
      compareSimilarityThreshold.value = Math.min(1, Math.max(0, Math.round(v * 20) / 20));
    }

    function setCompareSimilarityPercent(raw) {
      let percent = Number(raw);
      if (Number.isNaN(percent)) percent = 55;
      percent = Math.min(100, Math.max(0, Math.round(percent / 5) * 5));
      compareSimilarityThreshold.value = percent / 100;
    }

    const compareSimilarityMarks = [0, 25, 50, 75, 100];

    function escapeHtml(text) {
      return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function highlightDiff(text) {
      return escapeHtml(text);
    }

    function renderDiffCell(oldText, newText, changeType) {
      if (changeType === 'added' || (!oldText && newText)) {
        return `<span class="d-badge d-badge-add">Added</span> <span class="d-ins">${escapeHtml(newText)}</span>`;
      }
      if (changeType === 'removed' || (oldText && !newText)) {
        return `<span class="d-badge d-badge-del">Delete</span> <span class="d-del">${escapeHtml(oldText)}</span>`;
      }
      if (!oldText && !newText) return '<span class="d-empty">—</span>';
      if (oldText === newText) return `<span class="d-eq">${escapeHtml(newText)}</span>`;
      return `<span class="d-del">${escapeHtml(oldText)}</span> <span class="d-ins">${escapeHtml(newText)}</span>`;
    }

    function renderDiffExplanation(row) {
      return escapeHtml(row.explanation || '—');
    }

    function buildMockCompareRows() {
      return [
        {
          topic: 'Luggage retention',
          clauses: '4.11.1',
          old: 'Luggage displacement shall be limited to avoid endangering occupants.',
          new: 'Head restraints and seat backs shall correspond to forward limits of 150 mm / 100 mm respectively.',
          change_type: 'modified',
          explanation: 'The new version specifies separate forward limits for head restraint and seat back; the old wording was more general.',
          impact: 'Seat system design should recheck retention structures',
          impact_level: 'warn'
        },
        {
          topic: 'Head-restraint strength',
          clauses: '5.2 / 5.2.1',
          old: 'The head restraint shall withstand the specified static load.',
          new: 'The head restraint shall withstand the specified static load and add dynamic-condition verification.',
          change_type: 'modified',
          explanation: 'Adds dynamic-condition verification requirements.',
          impact: 'Add dynamic items to the test plan',
          impact_level: 'info'
        },
        {
          topic: 'Sharp edges',
          clauses: '4.3',
          old: '',
          new: 'No sharp edges that endanger occupants shall remain after the test.',
          change_type: 'added',
          explanation: 'The new version adds a sharp-edge determination clause.',
          impact: 'Verify structural chamfers and coverings',
          impact_level: 'warn'
        },
        {
          topic: 'Appendix figures',
          clauses: 'Appendix A',
          old: 'Appendix schematic (old)',
          new: '',
          change_type: 'removed',
          explanation: 'The old appendix figure was replaced/removed in the new version.',
          impact: 'N/A',
          impact_level: 'info'
        }
      ];
    }

    async function startCompare() {
      if (!compareLeftFile.value || !compareRightFile.value || compareLoading.value) return;
      compareError.value = '';
      compareResult.value = null;
      compareLoading.value = true;
      const stages = [
        { stage: 'extracting', message: 'Extracting PDF text', total_chunks: 0, chunks_done: 0 },
        { stage: 'chunking', message: 'Segmenting sections', total_chunks: 0, chunks_done: 0 },
        { stage: 'comparing', message: 'Comparing clause by clause', total_chunks: 4, chunks_done: 0 },
        { stage: 'comparing', message: 'Comparing clause by clause', total_chunks: 4, chunks_done: 2 },
        { stage: 'comparing', message: 'Comparing clause by clause', total_chunks: 4, chunks_done: 4 },
        { stage: 'merging', message: 'Merging compare results', total_chunks: 4, chunks_done: 4 }
      ];
      for (const step of stages) {
        compareProgress.value = step;
        await LegalDemo.delay(450);
      }
      compareLoading.value = false;
      compareProgress.value = null;
      leftStdLabel.value = compareLeftFile.value.name.replace(/\.pdf$/i, '');
      rightStdLabel.value = compareRightFile.value.name.replace(/\.pdf$/i, '');
      compareResult.value = { rows: buildMockCompareRows() };
    }

    function exportCompareToExcel() {
      const lines = ['Topic,Related clauses,Old,New,Content diff,Diff explanation,Vehicle impact'];
      compareRows.value.forEach((row) => {
        const cells = [row.topic, row.clauses, row.old, row.new, `${row.old || ''} => ${row.new || ''}`, row.explanation, row.impact]
          .map((c) => `"${String(c || '').replace(/"/g, '""')}"`);
        lines.push(cells.join(','));
      });
      const fileName = `${compareReportTitle.value || 'Old vs new regulation compare'}.csv`;
      const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      rememberHistoryExport(
        'compare',
        compareReportTitle.value || `${leftStdLabel.value} → ${rightStdLabel.value}`,
        fileName
      );
    }

    function toggleCompareFullscreen() {
      isCompareFullscreen.value = !isCompareFullscreen.value;
      document.body.classList.toggle('compare-fullscreen', isCompareFullscreen.value);
    }

    function syncHash() {
      const hash = (location.hash || '#/breakdown').replace('#/', '');
      if (hash === 'compare' || hash === 'breakdown') currentPage.value = hash;
      else {
        currentPage.value = 'breakdown';
        location.hash = '#/breakdown';
      }
    }

    function onFullscreenKeydown(event) {
      if (event.key !== 'Escape') return;
      if (isBreakdownPreviewFullscreen.value) toggleBreakdownPreviewFullscreen();
      else if (isCompareFullscreen.value) toggleCompareFullscreen();
    }

    function revealActiveStream() {
      nextTick(() => {
        requestAnimationFrame(() => {
          const stream = document.querySelector('.content-card.is-conversation .cc-message-stream, .cc-conversation .cc-message-stream');
          window.LegalDemo?.revealConversationStream?.(stream, { behavior: 'smooth', force: true });
        });
      });
    }

    watch(
      [
        currentPage,
        breakdownUploadConfirmed,
        breakdownLoading,
        breakdownPreviewLoading,
        breakdownPreview,
        breakdownError,
        compareUploadConfirmed,
        compareLoading,
        compareResult,
        compareError
      ],
      () => revealActiveStream(),
      { flush: 'post' }
    );

    onMounted(() => {
      loadCrawlStatus();
      syncHash();
      addEventListener('hashchange', syncHash);
      addEventListener('keydown', onFullscreenKeydown);
      revealActiveStream();

      if (window.LegalOnboarding) {
        onboardingHost = LegalOnboarding.createModeHost({
          getMode: () => currentPage.value,
          setMode: async (page) => {
            if (currentPage.value !== page) {
              currentPage.value = page;
              location.hash = `#/${page}`;
            }
            await nextTick();
          },
          closeModals: () => {
            showHelpModal.value = false;
            showHistoryModal.value = false;
            showKnowledgeModal.value = false;
          },
          modeWatch: (cb) => {
            watch(currentPage, () => cb());
          },
          tours: {
            breakdown: {
              storageKey: 'legal-breakdown-onboarding-v1',
              steps: [
                {
                  selector: '[data-ob="mode-tabs"]',
                  title: 'Mode switch',
                  desc: 'Switch between Regulation breakdown and Old vs new. Breakdown is for one PDF; compare is for old and new regulations.',
                  placement: 'bottom',
                  ensurePage: 'breakdown'
                },
                {
                  selector: '[data-ob="breakdown-welcome"]',
                  title: 'Breakdown overview',
                  desc: 'After you upload a regulation PDF, the system parses its structure and produces an exportable breakdown.',
                  placement: 'right',
                  ensurePage: 'breakdown'
                },
                {
                  selector: '[data-ob="breakdown-composer"]',
                  title: 'Bottom action bar',
                  desc: 'Select PDF → Confirm upload → set title and detail level → Start breakdown. You may also drag into the conversation.',
                  placement: 'top',
                  ensurePage: 'breakdown'
                },
                {
                  selector: '[data-ob="new-task"]',
                  title: 'New task',
                  desc: 'Click here to clear the current progress before starting another breakdown.',
                  placement: 'right',
                  ensurePage: 'breakdown'
                }
              ]
            },
            compare: {
              storageKey: 'legal-compare-onboarding-v1',
              steps: [
                {
                  selector: '[data-ob="mode-tabs"]',
                  title: 'Old vs new mode',
                  desc: 'After switching to "Old vs new", upload old and new PDFs separately for clause-level comparison.',
                  placement: 'bottom',
                  ensurePage: 'compare'
                },
                {
                  selector: '[data-ob="compare-welcome"]',
                  title: 'Compare overview',
                  desc: 'Prepare old and new regulation PDFs, confirm upload, then set compare mode and similarity threshold.',
                  placement: 'right',
                  ensurePage: 'compare'
                },
                {
                  selector: '[data-ob="compare-composer"]',
                  title: 'Bottom action bar',
                  desc: 'Select old/new → Confirm upload → set parameters → Start compare.',
                  placement: 'top',
                  ensurePage: 'compare'
                },
                {
                  selector: '[data-ob="new-task"]',
                  title: 'New task',
                  desc: 'Click here to clear progress when starting with a new pair of regulations.',
                  placement: 'right',
                  ensurePage: 'compare'
                }
              ]
            }
          }
        });
        onboardingHost.autoStart();
      }
    });

    onBeforeUnmount(() => {
      removeEventListener('hashchange', syncHash);
      removeEventListener('keydown', onFullscreenKeydown);
      if (onboardingHost) onboardingHost.destroy();
      document.body.classList.remove('compare-fullscreen');
      document.body.classList.remove('ob-tour-lock');
    });

    function startOnboardingTour(force = false) {
      if (!onboardingHost) return;
      onboardingHost.startCurrent(!!force);
    }

    return {
      currentUser,
      userInitials,
      showAccountMenu,
      showHelpModal,
      helpVideoUrl,
      startOnboardingTour,
      showHistoryModal,
      currentPage,
      historyModeFilter,
      crawlStatus,
      showCrawlPanel,
      toggleCrawlPanel,
      greeting,
      filteredHistory,
      sidebarHistory,
      historyItems,
      activeHistoryId,
      breakdownTitle,
      breakdownDepth,
      breakdownDepthOptions,
      breakdownDragOver,
      breakdownFile,
      breakdownInput,
      breakdownForceRebuild,
      breakdownLoading,
      breakdownStatus,
      breakdownError,
      breakdownPreviewLoading,
      breakdownPreview,
      breakdownPreviewError,
      breakdownTaskId,
      isBreakdownPreviewFullscreen,
      compareReportTitle,
      compareLeftFile,
      compareRightFile,
      compareLeftInput,
      compareRightInput,
      isCompareLeftDragOver,
      isCompareRightDragOver,
      compareMode,
      compareDepth,
      compareDepthOptions,
      compareSimilarityThreshold,
      compareSimilarityMarks,
      compareLoading,
      compareProgress,
      compareResult,
      compareError,
      compareSearchQuery,
      isCompareFullscreen,
      leftStdLabel,
      rightStdLabel,
      compareRows,
      compareTotalRows,
      compareModeSummary,
      breakdownStep,
      breakdownComposerTitle,
      breakdownComposerDesc,
      breakdownPrimaryLabel,
      breakdownComposerReady,
      breakdownUploadConfirmed,
      compareStep,
      compareComposerTitle,
      compareComposerDesc,
      comparePrimaryLabel,
      compareComposerReady,
      compareUploadConfirmed,
      successCount,
      totalRecords,
      isAnyCrawling,
      crawlOne,
      crawlAll,
      formatFileSize,
      switchToPage,
      openKnowledgeBase,
      closeKnowledgeModal,
      onKnowledgeFrameLoad,
      showKnowledgeModal,
      startNewTask,
      logout,
      openHistoryModal,
      openHistoryItem,
      formatHistoryDate,
      downloadHistoryItem,
      deleteHistoryItem,
      onBreakdownPick,
      onBreakdownDrop,
      removeBreakdownFile,
      confirmBreakdownUpload,
      onBreakdownPrimaryAction,
      startRegulationBreakdown,
      downloadBreakdownExcel,
      toggleBreakdownPreviewFullscreen,
      onCompareLeftPick,
      onCompareRightPick,
      onCompareLeftDrop,
      onCompareRightDrop,
      removeCompareFile,
      confirmCompareUpload,
      onComparePrimaryAction,
      setCompareMode,
      normalizeCompareSimilarityThreshold,
      setCompareSimilarityPercent,
      highlightDiff,
      renderDiffCell,
      renderDiffExplanation,
      startCompare,
      exportCompareToExcel,
      toggleCompareFullscreen
    };
  }
}).mount('#app');
