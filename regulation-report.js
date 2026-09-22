const { createApp, ref, computed, watch, nextTick, onMounted, onBeforeUnmount } = Vue;

createApp({
  setup() {
    const currentUser = ref(LegalDemo.readUser());
    const userInitials = computed(() => LegalDemo.initials(currentUser.value.displayName));
    const showAccountMenu = ref(false);
    const showHelpModal = ref(false);
    const helpVideoUrl = ref('./static/tutorials/demo.mp4');
    const showHistoryModal = ref(false);
    const showAsyncModal = ref(false);
    const showKnowledgeModal = ref(false);
    const showSkillModal = ref(false);
    const currentPage = ref('report');
    let onboardingHost = null;
    const historyModeFilter = ref('report');

    const reportTitle = ref('Regulation & Policy Briefing');
    const foreignReportTitle = ref('Foreign Intelligence Analysis Report');
    const dateMode = ref('preset');
    const days = ref(30);
    const startDate = ref('');
    const endDate = ref('');
    const previewResult = ref(null);
    const previewActiveTab = ref('law');
    const foreignPreviewSample = ref(null);
    const reportRequested = ref(false);
    const reportSourcesConfirmed = ref(false);
    const reportParamsConfirmed = ref(false);
    const foreignRequested = ref(false);
    const foreignUploadConfirmed = ref(false);
    const foreignTitleConfirmed = ref(false);
    const foreignConfirmedTitle = ref('');
    const reportGenerating = ref(false);
    const reportCrawling = ref(false);
    const foreignGenerating = ref(false);
    const selectedSources = ref([]);
    const sourceSearchInput = ref('');
    const sourceSearchQuery = ref('');
    const reportSourcesSnapshot = ref(null);
    const reportCrawlResult = ref(null);
    const reportConfirmedSnapshot = ref(null);

    const asyncTaskStatus = ref('pending');
    const asyncTaskError = ref('');
    const asyncElapsed = ref(0);
    let asyncTimer = null;
    let asyncElapsedTimer = null;

    const isDragOver = ref(false);
    const selectedPdfs = ref([]);
    const pdfInput = ref(null);

    const skillPatcher = LegalSkillPatcher.createSkillPatcher(
      { ref, computed, watch },
      showSkillModal
    );

    const crawlStatus = ref([]);

    const reportHistory = ref([
      { id: 'rh-1', mode: 'report', fileName: 'Regulation & Policy Briefing.html', kind: 'html', date: '2026-08-20T09:12:00+08:00' },
      { id: 'rh-2', mode: 'report', fileName: 'Key Regulations Summary - Last 15 Days.csv', kind: 'excel', date: '2026-08-12T14:30:00+08:00' },
      { id: 'rh-3', mode: 'foreign', fileName: 'Foreign Intelligence Analysis Report (2026-08-28).html', kind: 'html', date: '2026-08-28T16:40:00+08:00' }
    ]);

    const previewDateRange = computed(() => {
      const p = previewResult.value;
      if (!p) return '';
      if (p.date_range) return p.date_range;
      if (p.summary?.start_date && p.summary?.end_date) {
        return p.summary.start_date === p.summary.end_date
          ? p.summary.start_date
          : `${p.summary.start_date} to ${p.summary.end_date}`;
      }
      if (startDate.value && endDate.value) return `${startDate.value} to ${endDate.value}`;
      return '';
    });

    const previewProposalCount = computed(() => {
      const p = previewResult.value;
      if (!p) return 0;
      return (
        (p.std_proposals_lixiang?.length || 0) +
        (p.std_proposals_zhengqiu?.length || 0) +
        (p.std_proposals_baopi?.length || 0)
      );
    });

    function stripMarkdown(text) {
      if (!text) return '';
      return String(text)
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`([^`]*)`/g, '$1')
        .trim();
    }

    function clonePreview(data) {
      return JSON.parse(JSON.stringify(data));
    }

    async function loadForeignPreviewSample() {
      try {
        const response = await fetch('./js/preview-sample-foreign.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('load failed');
        foreignPreviewSample.value = await response.json();
      } catch (_) {
        foreignPreviewSample.value = null;
      }
    }

    const FALLBACK_CRAWL = [
      { site_key: 'catarc_gzdt', display_name: 'CATARC - Work Updates', record_count: 205, last_crawl_status: 'success', is_crawling: false },
      { site_key: 'catarc_jhgg', display_name: 'CATARC - Plan Announcements', record_count: 5, last_crawl_status: 'success', is_crawling: false },
      { site_key: 'catarc_zqyj', display_name: 'CATARC - Public Consultation', record_count: 169, last_crawl_status: 'success', is_crawling: false },
      { site_key: 'catarc_hytz', display_name: 'CATARC - Meeting Notices', record_count: 205, last_crawl_status: 'success', is_crawling: false },
      { site_key: 'miit_eidc_zytz', display_name: 'MIIT - Equipment Industry Development Center', record_count: 17, last_crawl_status: 'success', is_crawling: false },
      { site_key: 'miit_zbys_qcgy', display_name: 'MIIT - Equipment Dept. I - Auto Industry', record_count: 251, last_crawl_status: 'success', is_crawling: false },
      { site_key: 'sac_tzgg', display_name: 'SAC - Notices & Announcements', record_count: 41, last_crawl_status: 'success', is_crawling: false },
      { site_key: 'samr_nocGB', display_name: 'SAMR - National Standards Approvals', record_count: 1626, last_crawl_status: 'success', is_crawling: false },
      { site_key: 'samr_gbPlanDraft', display_name: 'SAMR - Standards Development Plan Consultation', record_count: 309, last_crawl_status: 'success', is_crawling: false },
      { site_key: 'mee_gsgg_tz', display_name: 'MEE - Notices', record_count: 243, last_crawl_status: 'success', is_crawling: false },
      { site_key: 'tc260_xwdt', display_name: 'TC260 - News & Updates', record_count: 159, last_crawl_status: 'success', is_crawling: false },
      { site_key: 'caam_bzfg', display_name: 'CAAM - Standards & Regulations', record_count: 159, last_crawl_status: 'success', is_crawling: false }
    ];

    function syncDefaultSelectedSources() {
      if (reportSourcesConfirmed.value) return;
      selectedSources.value = [];
      sourceSearchInput.value = '';
      sourceSearchQuery.value = '';
    }

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

    const filteredReportHistory = computed(() =>
      reportHistory.value.filter((item) => !historyModeFilter.value || item.mode === historyModeFilter.value)
    );

    const sidebarHistory = computed(() => {
      // Show export records for the current module only; do not mix other modes / platform-wide history
      if (currentPage.value === 'foreign') {
        return reportHistory.value.filter((item) => item.mode === 'foreign');
      }
      if (currentPage.value === 'report') {
        return reportHistory.value.filter((item) => item.mode === 'report');
      }
      return [];
    });

    const greeting = computed(() => {
      const hour = new Date().getHours();
      if (hour < 12) return { text: 'Good morning', icon: '☀️' };
      if (hour < 18) return { text: 'Good afternoon', icon: '🌤️' };
      return { text: 'Good evening', icon: '🌙' };
    });

    function formatDate(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    function setDateRange(n) {
      dateMode.value = 'preset';
      days.value = n;
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - (n - 1));
      startDate.value = formatDate(start);
      endDate.value = formatDate(end);
    }

    function enableCustomDate() {
      dateMode.value = 'custom';
    }

    function onDateInputChange() {
      dateMode.value = 'custom';
    }

    function segIndicatorStyle() {
      const index =
        dateMode.value === 'custom'
          ? 0
          : days.value === 15
            ? 1
            : days.value === 30
              ? 2
              : 3;
      return { transform: `translateX(${index * 100}%)` };
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

    async function crawlSelectedSources() {
      const keys = [...selectedSources.value];
      if (!keys.length || reportCrawling.value) return;
      reportCrawling.value = true;
      reportCrawlResult.value = null;
      reportSourcesConfirmed.value = false;
      reportSourcesSnapshot.value = {
        keys,
        count: keys.length,
        names: crawlStatus.value
          .filter((s) => keys.includes(s.site_key))
          .map((s) => s.display_name),
        records: crawlStatus.value
          .filter((s) => keys.includes(s.site_key))
          .reduce((sum, s) => sum + (s.record_count || 0), 0)
      };
      invalidateReportParams();
      await Promise.all(keys.map((key) => crawlOne(key)));
      const selected = crawlStatus.value.filter((s) => keys.includes(s.site_key));
      reportCrawlResult.value = {
        successCount: selected.filter((s) => s.last_crawl_status === 'success').length,
        totalRecords: selected.reduce((sum, s) => sum + (s.record_count || 0), 0),
        selectedCount: keys.length
      };
      reportSourcesSnapshot.value = {
        ...reportSourcesSnapshot.value,
        records: reportCrawlResult.value.totalRecords
      };
      reportSourcesConfirmed.value = true;
      reportCrawling.value = false;
    }

    function isSourceSelected(siteKey) {
      return selectedSources.value.includes(siteKey);
    }

    function applySourceSearch() {
      sourceSearchQuery.value = sourceSearchInput.value.trim();
    }

    const filteredCrawlStatus = computed(() => {
      const q = sourceSearchQuery.value.trim().toLowerCase();
      if (!q) return crawlStatus.value;
      return crawlStatus.value.filter((s) =>
        String(s.display_name || '').toLowerCase().includes(q) ||
        String(s.site_key || '').toLowerCase().includes(q)
      );
    });

    function toggleSource(siteKey) {
      if (reportBusy.value) return;
      const idx = selectedSources.value.indexOf(siteKey);
      if (idx >= 0) selectedSources.value = selectedSources.value.filter((k) => k !== siteKey);
      else selectedSources.value = [...selectedSources.value, siteKey];
    }

    function selectAllSources() {
      if (reportBusy.value) return;
      const keys = filteredCrawlStatus.value.map((s) => s.site_key);
      selectedSources.value = Array.from(new Set([...selectedSources.value, ...keys]));
    }

    function clearSelectedSources() {
      if (reportBusy.value) return;
      selectedSources.value = [];
    }

    const selectedSourceCount = computed(() => selectedSources.value.length);
    const selectedSourceRecords = computed(() =>
      crawlStatus.value
        .filter((s) => selectedSources.value.includes(s.site_key))
        .reduce((sum, s) => sum + (s.record_count || 0), 0)
    );
    const selectedSourceNames = computed(() =>
      crawlStatus.value
        .filter((s) => selectedSources.value.includes(s.site_key))
        .map((s) => s.display_name)
    );
    const selectedSourceItems = computed(() =>
      crawlStatus.value.filter((s) => selectedSources.value.includes(s.site_key))
    );

    function openSkillConfig() {
      showKnowledgeModal.value = false;
      showSkillModal.value = true;
      location.hash = '#/skill';
    }

    function closeSkillModal() {
      showSkillModal.value = false;
      if ((location.hash || '').replace('#/', '') === 'skill') {
        location.hash = `#/${currentPage.value}`;
      }
    }

    function startNewTask() {
      previewResult.value = null;
      previewActiveTab.value = 'law';
      reportTitle.value = 'Regulation & Policy Briefing';
      foreignReportTitle.value = 'Foreign Intelligence Analysis Report';
      selectedPdfs.value = [];
      isDragOver.value = false;
      reportRequested.value = false;
      reportSourcesConfirmed.value = false;
      reportSourcesSnapshot.value = null;
      reportCrawlResult.value = null;
      reportCrawling.value = false;
      reportParamsConfirmed.value = false;
      reportConfirmedSnapshot.value = null;
      foreignRequested.value = false;
      foreignUploadConfirmed.value = false;
      foreignTitleConfirmed.value = false;
      foreignConfirmedTitle.value = '';
      reportGenerating.value = false;
      foreignGenerating.value = false;
      setDateRange(30);
      syncDefaultSelectedSources();
    }

    const reportStep = computed(() => {
      if (previewResult.value?.success && !previewResult.value.isForeignReport) return 4;
      if (reportGenerating.value || reportParamsConfirmed.value) return 3;
      if (reportSourcesConfirmed.value) return 2;
      if (reportCrawling.value) return 1;
      return 0;
    });

    const foreignStep = computed(() => {
      if (previewResult.value?.success && previewResult.value.isForeignReport) return 3;
      if (foreignGenerating.value) return 2;
      if (foreignUploadConfirmed.value) return 1;
      return 0;
    });

    const reportBusy = computed(() => reportGenerating.value || reportCrawling.value);
    const foreignBusy = computed(() => foreignGenerating.value);
    const reportDone = computed(() => !!(previewResult.value?.success && !previewResult.value.isForeignReport));
    const foreignDone = computed(() => !!(previewResult.value?.success && previewResult.value.isForeignReport));

    const reportComposerTitle = computed(() => {
      if (reportCrawling.value) return 'Crawling data…';
      if (reportBusy.value) return 'Generating report…';
      if (reportDone.value) return 'Report generated';
      if (reportParamsConfirmed.value) return 'Parameters confirmed — ready to generate';
      if (reportSourcesConfirmed.value) return 'Data ready — please set parameters';
      return 'Start regulation report generation';
    });
    const reportComposerDesc = computed(() => {
      if (reportCrawling.value) return 'Assistant is fetching the selected data sources';
      if (reportGenerating.value) return 'Aggregating regulation intelligence and policy updates';
      if (reportDone.value) return 'You can adjust parameters, reconfirm and regenerate, or view history';
      if (reportParamsConfirmed.value) return 'Click "Generate Report" to start aggregation';
      if (reportSourcesConfirmed.value) return 'Set the report title and date range, then click "Confirm Parameters"';
      return 'Select data sources first, then click "Crawl Data".';
    });
    const reportPrimaryLabel = computed(() => {
      if (reportCrawling.value) return 'Crawling…';
      if (reportGenerating.value) return 'Generating…';
      if (reportDone.value) return 'Completed';
      if (reportParamsConfirmed.value) return 'Generate Report';
      if (reportSourcesConfirmed.value) return 'Confirm Parameters';
      return 'Crawl Data';
    });
    const reportComposerReady = computed(() => {
      if (reportBusy.value || reportDone.value) return false;
      if (!reportSourcesConfirmed.value) return selectedSources.value.length > 0;
      return !!reportTitle.value.trim();
    });

    const foreignComposerTitle = computed(() => {
      if (foreignBusy.value) return 'Parsing foreign intelligence…';
      if (foreignDone.value) return 'Analysis report generated';
      if (foreignTitleConfirmed.value) return 'Title confirmed — ready to generate';
      if (foreignUploadConfirmed.value) return 'Confirm the title, then generate the report';
      if (selectedPdfs.value.length) return 'Files selected — please confirm upload';
      return 'Upload PDFs to start analysis';
    });
    const foreignComposerDesc = computed(() => {
      if (foreignBusy.value) return 'AI is identifying and structuring foreign regulation intelligence';
      if (foreignDone.value) return 'You can replace PDFs and re-analyze, or view history';
      if (foreignTitleConfirmed.value) return 'Click "Generate Report" to start analysis';
      if (foreignUploadConfirmed.value) return 'Enter the report title in the chat area, then click "Confirm Title"';
      if (selectedPdfs.value.length) return `${selectedPdfs.value.length} PDF(s) selected — click "Confirm Upload"`;
      return 'Multiple PDFs supported · max 20MB per file';
    });
    const foreignPrimaryLabel = computed(() => {
      if (foreignBusy.value) return 'Parsing…';
      if (foreignDone.value) return 'Completed';
      if (foreignTitleConfirmed.value) return 'Generate Report';
      if (foreignUploadConfirmed.value) return 'Confirm Title';
      if (selectedPdfs.value.length) return 'Confirm Upload';
      return 'Waiting for upload';
    });
    const foreignComposerReady = computed(() => {
      if (foreignBusy.value || foreignDone.value) return false;
      if (foreignTitleConfirmed.value) return selectedPdfs.value.length > 0;
      if (foreignUploadConfirmed.value) return !!foreignReportTitle.value.trim() && selectedPdfs.value.length > 0;
      return selectedPdfs.value.length > 0;
    });

    function invalidateReportParams() {
      if (!reportParamsConfirmed.value) return;
      reportParamsConfirmed.value = false;
      reportConfirmedSnapshot.value = null;
      reportRequested.value = false;
      if (previewResult.value && !previewResult.value.isForeignReport) {
        previewResult.value = null;
      }
    }

    function invalidateReportSources() {
      if (!reportSourcesConfirmed.value && !reportSourcesSnapshot.value && !reportCrawlResult.value) return;
      reportSourcesConfirmed.value = false;
      reportSourcesSnapshot.value = null;
      reportCrawlResult.value = null;
      reportCrawling.value = false;
      invalidateReportParams();
    }

    function confirmReportParams() {
      if (!reportSourcesConfirmed.value || !reportTitle.value.trim()) return;
      reportParamsConfirmed.value = true;
      reportRequested.value = true;
      reportConfirmedSnapshot.value = {
        title: reportTitle.value.trim(),
        dateMode: dateMode.value,
        days: days.value,
        startDate: startDate.value,
        endDate: endDate.value,
        sources: [...selectedSources.value]
      };
    }

    async function onReportPrimaryAction() {
      if (!reportSourcesConfirmed.value) {
        await crawlSelectedSources();
        return;
      }
      if (!reportParamsConfirmed.value) {
        confirmReportParams();
        return;
      }
      await generateReportAsync();
    }

    function confirmForeignUpload() {
      if (!selectedPdfs.value.length) return;
      foreignUploadConfirmed.value = true;
      foreignTitleConfirmed.value = false;
      foreignConfirmedTitle.value = '';
      foreignRequested.value = false;
      if (previewResult.value?.isForeignReport) previewResult.value = null;
    }

    function invalidateForeignUpload() {
      if (!foreignUploadConfirmed.value && !foreignTitleConfirmed.value) return;
      foreignUploadConfirmed.value = false;
      foreignTitleConfirmed.value = false;
      foreignConfirmedTitle.value = '';
      foreignRequested.value = false;
      if (previewResult.value?.isForeignReport) previewResult.value = null;
    }

    function invalidateForeignTitle() {
      if (!foreignTitleConfirmed.value) return;
      foreignTitleConfirmed.value = false;
      foreignConfirmedTitle.value = '';
      foreignRequested.value = false;
      if (previewResult.value?.isForeignReport) previewResult.value = null;
    }

    function confirmForeignTitle() {
      if (!foreignUploadConfirmed.value || !foreignReportTitle.value.trim()) return;
      foreignTitleConfirmed.value = true;
      foreignConfirmedTitle.value = foreignReportTitle.value.trim();
    }

    async function onForeignPrimaryAction() {
      if (!foreignUploadConfirmed.value) {
        confirmForeignUpload();
        return;
      }
      if (!foreignTitleConfirmed.value) {
        confirmForeignTitle();
        return;
      }
      if (!foreignConfirmedTitle.value || !selectedPdfs.value.length) return;
      foreignRequested.value = true;
      await generateForeignReportAsync();
    }

    watch(foreignReportTitle, () => {
      if (!foreignTitleConfirmed.value) return;
      if (foreignReportTitle.value.trim() !== foreignConfirmedTitle.value) invalidateForeignTitle();
    });

    watch(selectedSources, () => {
      if (!reportSourcesConfirmed.value || !reportSourcesSnapshot.value) return;
      const prev = [...(reportSourcesSnapshot.value.keys || [])].sort().join(',');
      const next = [...selectedSources.value].sort().join(',');
      if (prev !== next) invalidateReportSources();
    }, { deep: true });

    watch([reportTitle, dateMode, days, startDate, endDate], () => {
      if (!reportParamsConfirmed.value || !reportConfirmedSnapshot.value) return;
      const snap = reportConfirmedSnapshot.value;
      const unchanged =
        snap.title === reportTitle.value.trim() &&
        snap.dateMode === dateMode.value &&
        snap.days === days.value &&
        snap.startDate === startDate.value &&
        snap.endDate === endDate.value;
      if (!unchanged) invalidateReportParams();
    });

    function switchToPage(page) {
      currentPage.value = page;
      location.hash = `#/${page}`;
    }

    function buildPreview(title, options = {}) {
      const rangeLabel =
        dateMode.value === 'preset'
          ? `${startDate.value} to ${endDate.value}`
          : `${startDate.value || ''} to ${endDate.value || ''}`;
      return {
        success: true,
        title,
        isForeignReport: false,
        date_range: rangeLabel,
        summary: {
          start_date: startDate.value,
          end_date: endDate.value,
          law_count: 5,
          meeting_count: 2,
          std_announcement_count: 0,
          lixiang_count: 0,
          zhengqiu_count: 0,
          baopi_count: 0
        },
        law_policies: [
          {
            title: 'Notice on Strengthening Safety Supervision of New Energy Vehicle Traction Batteries',
            url: '#',
            display_name: 'MIIT',
            list_date_iso: '2026-08-01',
            detail_date: '2026-08-01',
            ai_key_points: '1. Focus on traction battery thermal propagation and production consistency requirements.\n2. Clarify enterprise safety supervision responsibilities and spot-check mechanisms.',
            ai_interpretation: 'The policy aims to strengthen full-lifecycle safety control of NEV traction batteries.',
            ai_suggestion: 'Immediately inventory thermal propagation test evidence for in-production battery packs and complete consistency control documentation.',
            ai_peer_reference: 'Leading OEMs have established dedicated battery safety compliance checklists.',
            _expanded: false
          },
          {
            title: 'GB 18384-2025 Electric Vehicle Safety Requirements Implementation Guidance',
            url: '#',
            display_name: 'SAMR',
            list_date_iso: '2026-07-20',
            detail_date: '2026-07-20',
            ai_key_points: '1. Clarify GB 18384-2025 implementation transition arrangements.\n2. Emphasize high-voltage safety and protection requirements.',
            ai_interpretation: 'Implementation guidance helps enterprises complete the transition between old and new standards.',
            ai_suggestion: 'Build conformity difference tables by model and schedule supplemental tests.',
            ai_peer_reference: 'Multiple OEMs have started old-vs-new standard benchmarking.',
            _expanded: false
          },
          {
            title: 'Latest interpretation of seat system strength and anchorage standards',
            url: '#',
            display_name: 'CATARC',
            list_date_iso: '2026-07-12',
            detail_date: '2026-07-12',
            ai_key_points: '1. Related to GB 15083-2019 requirements.\n2. Focus on anchorage strength test conditions.',
            ai_interpretation: 'Seat system safety remains a key compliance focus for occupant protection.',
            ai_suggestion: 'Review seat supplier test report versions and applicable standards.',
            ai_peer_reference: 'Peers commonly include seat strength in pre-export certification checks.',
            _expanded: false
          },
          {
            title: 'UNECE software update related regulation briefing',
            url: '#',
            display_name: 'UNECE',
            list_date_iso: '2026-07-05',
            detail_date: '2026-07-05',
            ai_key_points: '1. Software update type-approval requirements continue to evolve.\n2. Pay attention to RXSWIN identifier management.',
            ai_interpretation: 'Software update compliance has become a key barrier for intelligent connected vehicle export.',
            ai_suggestion: 'Establish a ledger mapping software versions to type approvals.',
            ai_peer_reference: 'Export-oriented OEMs have set up dedicated OTA compliance teams.',
            _expanded: false
          },
          {
            title: 'Export market compliance checklist highlights (battery/seats)',
            url: '#',
            display_name: 'NHTSA',
            list_date_iso: '2026-06-28',
            detail_date: '2026-06-28',
            ai_key_points: '1. Covers key battery and seat inspection items.\n2. Emphasizes completeness of the documentary evidence chain.',
            ai_interpretation: 'Export market inspections place greater emphasis on evidence traceability.',
            ai_suggestion: 'Compile battery/seat compliance evidence packs by market.',
            ai_peer_reference: 'Export teams commonly use closed-loop checklist management.',
            _expanded: false
          }
        ],
        meeting_policies: [
          {
            title: 'Minutes of the Intelligent Connected Vehicle Regulation Coordination Working Group meeting',
            url: '#',
            display_name: 'MIIT',
            list_date_iso: '2026-08-10',
            ai_key_points: 'Discussed ICV regulation coordination progress and next steps.',
            _expanded: false
          },
          {
            title: 'Export certification regulation update briefing',
            url: '#',
            display_name: 'CATARC',
            list_date_iso: '2026-08-03',
            ai_key_points: 'Shared export certification regulation updates and enterprise response practices.',
            _expanded: false
          }
        ],
        std_announcements: [],
        std_proposals_lixiang: [],
        std_proposals_zhengqiu: [],
        std_proposals_baopi: [],
        ...options
      };
    }

    function buildForeignPreview(title) {
      if (foreignPreviewSample.value) {
        const preview = clonePreview(foreignPreviewSample.value);
        preview.success = true;
        preview.isForeignReport = true;
        preview.title = title || preview.title;
        (preview.law_policies || []).forEach((p) => {
          p._expanded = false;
        });
        return preview;
      }
      return {
        success: true,
        title: title || 'Foreign Intelligence Analysis Report',
        isForeignReport: true,
        date_range: formatDate(new Date()),
        summary: { start_date: formatDate(new Date()), end_date: formatDate(new Date()), law_count: 0, meeting_count: 0 },
        law_policies: [],
        meeting_policies: [],
        std_announcements: [],
        std_proposals_lixiang: [],
        std_proposals_zhengqiu: [],
        std_proposals_baopi: []
      };
    }

    function removePreviewLaw(index) {
      if (!previewResult.value?.law_policies) return;
      previewResult.value.law_policies.splice(index, 1);
      if (previewResult.value.summary) {
        previewResult.value.summary.law_count = previewResult.value.law_policies.length;
      }
    }

    function downloadBlob(filename, content, mime) {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    function rememberDownloadFile(fileName, kind) {
      const mode = currentPage.value === 'foreign' ? 'foreign' : currentPage.value === 'report' ? 'report' : '';
      if (!mode) return;
      const name = String(fileName || 'Exported file').replace(/[\\/:*?"<>|]/g, '_');
      reportHistory.value.unshift({
        id: LegalDemo.uid('rh'),
        mode,
        fileName: name,
        kind: kind || (/\.(csv|xlsx)$/i.test(name) ? 'excel' : 'html'),
        date: new Date().toISOString()
      });
    }

    function downloadPreviewHtml() {
      const p = previewResult.value;
      if (!p?.success) return;
      const laws = (p.law_policies || [])
        .map((item, i) => {
          return `<tr>
  <td>${i + 1}</td>
  <td><a href="${item.url || '#'}">${item.title || ''}</a><div>${item.display_name || ''} · ${item.list_date_iso || item.detail_date || ''}</div></td>
</tr>
<tr><td colspan="2"><pre>${stripMarkdown(item.ai_key_points) || ''}</pre>
<pre>${stripMarkdown(item.ai_interpretation) || ''}</pre>
<pre>${stripMarkdown(item.ai_suggestion) || ''}</pre>
<pre>${stripMarkdown(item.ai_peer_reference) || ''}</pre></td></tr>`;
        })
        .join('\n');
      const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${p.title || 'Regulation Report'}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f6fa;color:#333;padding:24px}
.wrap{max-width:1100px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.08)}
.hdr{background:linear-gradient(135deg,#0066FF,#0052CC);color:#fff;padding:28px 36px}
.hdr h1{margin:0 0 6px;font-size:22px}.hdr p{margin:0;opacity:.85;font-size:13px}
.body{padding:28px 36px} table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}
pre{white-space:pre-wrap;font-family:inherit;margin:0 0 10px;color:#475569;font-size:12px;line-height:1.7}
.footer{margin-top:24px;text-align:center;color:#94a3b8;font-size:12px}
</style></head><body><div class="wrap">
<div class="hdr"><h1>📋 ${p.title || ''}</h1><p>${previewDateRange.value || ''}</p></div>
<div class="body">
<p>Key regulation intelligence/policies: ${(p.law_policies || []).length} item(s)</p>
<table><thead><tr><th>No.</th><th>Regulation/Policy Name</th></tr></thead><tbody>${laws}</tbody></table>
<div class="footer">Exported at: ${new Date().toLocaleString('en-US')} · Dynamic HTML</div>
</div></div></body></html>`;
      const safeName = String(p.title || 'Regulation Report').replace(/[\\/:*?"<>|]/g, '_');
      const fileName = `${safeName}.html`;
      downloadBlob(fileName, html, 'text/html;charset=utf-8');
      rememberDownloadFile(fileName, 'html');
    }

    function downloadPreviewExcel() {
      const p = previewResult.value;
      if (!p?.success) return;
      const rows = [['No.', 'Regulation/Policy Name', 'Source', 'Date', 'Key Points', 'Interpretation', 'Suggestions', 'Peer Reference']];
      (p.law_policies || []).forEach((item, i) => {
        rows.push([
          i + 1,
          item.title || '',
          item.display_name || '',
          item.list_date_iso || item.detail_date || '',
          stripMarkdown(item.ai_key_points),
          stripMarkdown(item.ai_interpretation),
          stripMarkdown(item.ai_suggestion),
          stripMarkdown(item.ai_peer_reference)
        ]);
      });
      const csv = rows
        .map((row) =>
          row
            .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\n');
      const safeName = String(p.title || 'Regulation Report').replace(/[\\/:*?"<>|]/g, '_');
      const fileName = `${safeName}.csv`;
      downloadBlob(fileName, `\uFEFF${csv}`, 'text/csv;charset=utf-8');
      rememberDownloadFile(fileName, 'excel');
    }

    function clearAsyncTimers() {
      if (asyncTimer) clearTimeout(asyncTimer);
      if (asyncElapsedTimer) clearInterval(asyncElapsedTimer);
      asyncTimer = null;
      asyncElapsedTimer = null;
    }

    function closeAsyncModal() {
      if (asyncTaskStatus.value === 'processing') return;
      showAsyncModal.value = false;
      clearAsyncTimers();
    }

    async function generateReportAsync() {
      if (!reportTitle.value.trim()) {
        previewResult.value = { success: false, error: 'Please enter a report title first' };
        return;
      }
      reportGenerating.value = true;
      showAsyncModal.value = false;
      asyncTaskStatus.value = 'pending';
      asyncTaskError.value = '';
      asyncElapsed.value = 0;
      clearAsyncTimers();
      asyncElapsedTimer = setInterval(() => {
        asyncElapsed.value += 1;
      }, 1000);

      await LegalDemo.delay(600);
      asyncTaskStatus.value = 'processing';

      await LegalDemo.delay(1800 + Math.random() * 800);
      // Demo: simulate failure when the title contains "fail" or "error"
      if (/fail|error/i.test(reportTitle.value)) {
        asyncTaskStatus.value = 'failed';
        asyncTaskError.value = 'Upstream intelligence sources temporarily unavailable. Please try again later. (Demo simulated failure)';
        clearInterval(asyncElapsedTimer);
        asyncElapsedTimer = null;
        reportGenerating.value = false;
        return;
      }

      asyncTaskStatus.value = 'completed';
      clearInterval(asyncElapsedTimer);
      asyncElapsedTimer = null;
      const preview = buildPreview(reportTitle.value.trim());
      previewActiveTab.value = 'law';
      previewResult.value = preview;
      /* Do not save sessions; write download history only when exporting files */
      reportGenerating.value = false;
    }

    async function generateForeignReportAsync() {
      if (!selectedPdfs.value.length) return;
      foreignGenerating.value = true;
      showAsyncModal.value = false;
      asyncTaskStatus.value = 'pending';
      asyncTaskError.value = '';
      asyncElapsed.value = 0;
      clearAsyncTimers();
      asyncElapsedTimer = setInterval(() => {
        asyncElapsed.value += 1;
      }, 1000);
      await LegalDemo.delay(500);
      asyncTaskStatus.value = 'processing';
      await LegalDemo.delay(1600);
      asyncTaskStatus.value = 'completed';
      clearInterval(asyncElapsedTimer);
      asyncElapsedTimer = null;
      const preview = buildForeignPreview(foreignConfirmedTitle.value || foreignReportTitle.value.trim() || 'Foreign Intelligence Analysis Report');
      previewActiveTab.value = 'law';
      previewResult.value = preview;
      /* Do not save sessions; write download history only when exporting files */
      foreignGenerating.value = false;
    }

    function openHistoryModal(mode = 'report') {
      historyModeFilter.value = mode;
      showHistoryModal.value = true;
    }

    function openReport(item) {
      // Do not restore sessions; downloads are triggered only by the Download button
      return;
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
      const fileName = item.fileName || `${item.title || 'Exported file'}.txt`;
      const kind = item.kind || (String(fileName).endsWith('.csv') || String(fileName).endsWith('.xlsx') ? 'excel' : 'html');
      const content = [
        `File: ${fileName}`,
        `Generated at: ${item.date || ''}`,
        item.mode === 'foreign' ? 'Type: Foreign intelligence export' : 'Type: Regulation report export',
        `Format: ${kind === 'excel' ? 'Excel/CSV' : 'HTML'}`,
        '',
        '(Demo mock download content · export files only; sessions are not saved)'
      ].join('\n');
      const mime = kind === 'excel' ? 'text/csv;charset=utf-8' : 'text/html;charset=utf-8';
      const blob = new Blob([kind === 'excel' ? '\uFEFF' + content : content], { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = String(fileName).replace(/[\\/:*?"<>|]/g, '_');
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    async function deleteHistoryItem(item) {
      if (!item?.id) return;
      const label = item.fileName || item.title || 'this file';
      const ok = await LegalDemo.confirm({
        title: 'Delete record',
        message: `Delete "${label}"?`
      });
      if (!ok) return;
      reportHistory.value = reportHistory.value.filter((entry) => entry.id !== item.id);
    }

    function formatFileSize(size) {
      if (size < 1024) return `${size} B`;
      if (size < 1048576) return `${(size / 1024).toFixed(1)} KB`;
      return `${(size / 1048576).toFixed(1)} MB`;
    }

    function addPdfs(fileList) {
      const files = Array.from(fileList || []);
      files.forEach((file) => {
        if (!/\.pdf$/i.test(file.name)) return;
        if (file.size > 20 * 1024 * 1024) return;
        if (selectedPdfs.value.length >= 10) return;
        if (!selectedPdfs.value.find((f) => f.name === file.name && f.size === file.size)) {
          selectedPdfs.value.push(file);
        }
      });
      isDragOver.value = false;
    }

    function pickPdf() {
      pdfInput.value?.click();
    }

    function onPdfPick(event) {
      addPdfs(event.target.files);
      event.target.value = '';
    }

    function onPdfDrop(event) {
      addPdfs(event.dataTransfer.files);
    }

    function removePdf(index) {
      selectedPdfs.value.splice(index, 1);
      if (!selectedPdfs.value.length) invalidateForeignUpload();
    }

    function openKnowledgeBase() {
      showSkillModal.value = false;
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
        const topbar = doc.querySelector('.kb-topbar');
        if (topbar) topbar.hidden = true;
      } catch (_) {
        /* cross-origin safe no-op */
      }
    }

    function logout() {
      LegalDemo.logout();
    }

    function syncHash() {
      const hash = (location.hash || '#/report').replace('#/', '');
      if (hash === 'skill') {
        currentPage.value = 'report';
        showSkillModal.value = true;
        return;
      }
      if (['report', 'foreign'].includes(hash)) currentPage.value = hash;
      else currentPage.value = 'report';
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
        reportSourcesConfirmed,
        reportCrawling,
        reportCrawlResult,
        reportParamsConfirmed,
        reportGenerating,
        previewResult,
        foreignUploadConfirmed,
        foreignTitleConfirmed,
        foreignGenerating
      ],
      () => revealActiveStream(),
      { flush: 'post' }
    );

    function startOnboardingTour(force = false) {
      if (!onboardingHost) return;
      onboardingHost.startCurrent(!!force);
    }

    onMounted(() => {
      setDateRange(30);
      syncHash();
      loadCrawlStatus();
      loadForeignPreviewSample();
      addEventListener('hashchange', syncHash);
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
            showSkillModal.value = false;
            showKnowledgeModal.value = false;
            showHistoryModal.value = false;
            showAsyncModal.value = false;
          },
          modeWatch: (cb) => {
            watch(currentPage, () => cb());
          },
          tours: {
            report: {
              storageKey: 'legal-report-onboarding-v2',
              steps: [
                {
                  selector: '[data-ob="mode-tabs"]',
                  title: 'Mode switch',
                  desc: 'Switch between Regulation Report and Foreign Intelligence. Regulation Report crawls and aggregates from data sources; Foreign Intelligence uploads PDFs for analysis.',
                  placement: 'bottom',
                  ensurePage: 'report'
                },
                {
                  selector: '[data-ob="sources"]',
                  title: 'Select data sources',
                  desc: 'Check the data sources to include. Selected items appear as tags above; you can also search, select all, or clear.',
                  placement: 'right',
                  ensurePage: 'report'
                },
                {
                  selector: '[data-ob="composer"]',
                  title: 'Bottom action bar',
                  desc: 'After selecting sources, click Crawl Data; then set the title and date range, Confirm Parameters, and Generate Report.',
                  placement: 'top',
                  ensurePage: 'report'
                },
                {
                  selector: '[data-ob="new-task"]',
                  title: 'New task',
                  desc: 'Click here to clear current progress and start a new report generation.',
                  placement: 'right',
                  ensurePage: 'report'
                }
              ]
            },
            foreign: {
              storageKey: 'legal-foreign-onboarding-v1',
              steps: [
                {
                  selector: '[data-ob="mode-tabs"]',
                  title: 'Foreign intelligence mode',
                  desc: 'Switch to Foreign Intelligence to upload foreign regulation/policy PDFs and generate structured analysis reports.',
                  placement: 'bottom',
                  ensurePage: 'foreign'
                },
                {
                  selector: '[data-ob="foreign-welcome"]',
                  title: 'Analysis notes',
                  desc: 'Upload PDFs as prompted: the system identifies regulations/standards/consultations item by item and generates key points, interpretation, suggestions, and peer references.',
                  placement: 'right',
                  ensurePage: 'foreign'
                },
                {
                  selector: '[data-ob="foreign-composer"]',
                  title: 'Bottom action bar',
                  desc: 'Click the attachment icon to choose PDFs, then Confirm Upload → Confirm Title → Generate Report. You can also drag files into the chat area.',
                  placement: 'top',
                  ensurePage: 'foreign'
                },
                {
                  selector: '[data-ob="new-task"]',
                  title: 'New task',
                  desc: 'To start over with different materials, click here to clear progress and begin again.',
                  placement: 'right',
                  ensurePage: 'foreign'
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
      if (onboardingHost) onboardingHost.destroy();
      document.body.classList.remove('ob-tour-lock');
      clearAsyncTimers();
    });

    return {
      currentUser,
      userInitials,
      showAccountMenu,
      showHelpModal,
      helpVideoUrl,
      startOnboardingTour,
      showHistoryModal,
      showAsyncModal,
      showKnowledgeModal,
      showSkillModal,
      closeSkillModal,
      currentPage,
      historyModeFilter,
      reportTitle,
      foreignReportTitle,
      dateMode,
      days,
      startDate,
      endDate,
      previewResult,
      previewActiveTab,
      previewDateRange,
      previewProposalCount,
      stripMarkdown,
      removePreviewLaw,
      downloadPreviewHtml,
      downloadPreviewExcel,
      asyncTaskStatus,
      asyncTaskError,
      asyncElapsed,
      isDragOver,
      selectedPdfs,
      pdfInput,
      reportRequested,
      reportSourcesConfirmed,
      reportSourcesSnapshot,
      reportCrawlResult,
      reportCrawling,
      reportParamsConfirmed,
      reportConfirmedSnapshot,
      selectedSources,
      selectedSourceCount,
      selectedSourceRecords,
      selectedSourceNames,
      selectedSourceItems,
      sourceSearchInput,
      filteredCrawlStatus,
      applySourceSearch,
      reportComposerReady,
      foreignRequested,
      foreignUploadConfirmed,
      foreignTitleConfirmed,
      foreignConfirmedTitle,
      foreignComposerReady,
      reportGenerating,
      foreignGenerating,
      reportStep,
      foreignStep,
      reportBusy,
      foreignBusy,
      reportDone,
      foreignDone,
      reportComposerTitle,
      reportComposerDesc,
      reportPrimaryLabel,
      foreignComposerTitle,
      foreignComposerDesc,
      foreignPrimaryLabel,
      onReportPrimaryAction,
      onForeignPrimaryAction,
      crawlStatus,
      reportHistory,
      filteredReportHistory,
      sidebarHistory,
      greeting,
      setDateRange,
      enableCustomDate,
      onDateInputChange,
      segIndicatorStyle,
      successCount,
      totalRecords,
      isAnyCrawling,
      crawlOne,
      crawlAll,
      crawlSelectedSources,
      isSourceSelected,
      toggleSource,
      selectAllSources,
      clearSelectedSources,
      openSkillConfig,
      startNewTask,
      switchToPage,
      generateReportAsync,
      generateForeignReportAsync,
      openHistoryModal,
      openReport,
      formatHistoryDate,
      downloadHistoryItem,
      deleteHistoryItem,
      closeAsyncModal,
      formatFileSize,
      pickPdf,
      onPdfPick,
      onPdfDrop,
      removePdf,
      ...skillPatcher,
      openKnowledgeBase,
      closeKnowledgeModal,
      onKnowledgeFrameLoad,
      logout
    };
  }
}).mount('#app');
