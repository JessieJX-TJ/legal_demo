const { createApp, ref, computed, nextTick, onMounted, onBeforeUnmount } = Vue;

createApp({
  setup() {
    const isEmbed = ref(
      (() => {
        try {
          return new URLSearchParams(window.location.search).get('embed') === '1';
        } catch (e) {
          return false;
        }
      })()
    );
    const tab = ref('documents');
    const path = ref('');
    const folders = ref([]);
    const files = ref([]);
    const recycle = ref({ folders: [], files: [] });
    const masterRecords = ref([]);
    const assessments = ref([]);
    const loading = ref(false);
    const error = ref('');
    const dialog = ref(null);
    const fileInput = ref(null);
    const excelInput = ref(null);
    const masterTopScroll = ref(null);
    const masterTableScroll = ref(null);
    const assessmentTopScroll = ref(null);
    const assessmentTableScroll = ref(null);
    const masterScrollWidth = ref(0);
    const assessmentScrollWidth = ref(0);
    const masterPage = ref(1);
    const masterPages = ref(1);
    const masterTotal = ref(0);
    const masterSearch = ref('');
    const assessmentPage = ref(1);
    const assessmentPages = ref(1);
    const assessmentTotal = ref(0);
    const assessmentSearch = ref('');
    const assessmentProject = ref('');
    const documentSearch = ref('');
    const activeDocumentSearch = ref('');
    const documentSearchActive = ref(false);
    const documentPage = ref(1);
    const documentPages = ref(1);
    const documentTotal = ref(0);
    const selectedFileIds = ref([]);
    const selectedMasterIds = ref([]);
    const selectedAssessmentIds = ref([]);
    const excelTarget = ref('master');
    const excelProjectName = ref('');
    const loadedTabs = new Set(['documents']);
    const showAccountMenu = ref(false);
    const currentUser = ref(LegalDemo.readUser());
    const initials = computed(() => LegalDemo.initials(currentUser.value.displayName));
    const pathParts = computed(() => (path.value ? path.value.split('/').filter(Boolean) : []));

    const allFilesSelected = computed(
      () => files.value.length > 0 && files.value.every((item) => selectedFileIds.value.includes(item.file_id))
    );
    const allMasterSelected = computed(
      () =>
        masterRecords.value.length > 0 &&
        masterRecords.value.every((item) => selectedMasterIds.value.includes(item.record_id))
    );
    const allAssessmentsSelected = computed(
      () =>
        assessments.value.length > 0 &&
        assessments.value.every((item) => selectedAssessmentIds.value.includes(item.assessment_id))
    );

    function logout() {
      LegalDemo.logout();
    }

    function openRegulationQa() {
      location.href = './regulation-qa.html';
    }

    function previewFile(file) {
      alertMessage(`Demo: preview opened (mock)
${file.display_name}`);
    }

    function alertMessage(message) {
      window.alert(message);
    }

    async function openPath(next = '') {
      documentSearchActive.value = false;
      activeDocumentSearch.value = '';
      documentPage.value = 1;
      loading.value = true;
      error.value = '';
      await LegalDemo.delay(280);
      try {
        const data = MockStore.directory(next);
        path.value = data.path || '';
        folders.value = data.folders || [];
        files.value = data.files || [];
        selectedFileIds.value = [];
      } catch (e) {
        error.value = e.message;
      } finally {
        loading.value = false;
      }
    }

    async function loadDocumentSearch() {
      loading.value = true;
      error.value = '';
      await LegalDemo.delay(300);
      try {
        const data = MockStore.searchFiles(activeDocumentSearch.value, documentPage.value);
        folders.value = [];
        files.value = data.records || [];
        selectedFileIds.value = [];
        documentTotal.value = data.total || 0;
        documentPages.value = data.pages || 1;
        documentSearchActive.value = true;
      } catch (e) {
        error.value = e.message;
      } finally {
        loading.value = false;
      }
    }

    function searchDocuments() {
      const keyword = documentSearch.value.trim();
      if (!keyword) {
        clearDocumentSearch();
        return;
      }
      activeDocumentSearch.value = keyword;
      documentPage.value = 1;
      loadDocumentSearch();
    }

    function changeDocumentPage(page) {
      documentPage.value = page;
      loadDocumentSearch();
    }

    function clearDocumentSearch() {
      documentSearch.value = '';
      activeDocumentSearch.value = '';
      documentSearchActive.value = false;
      documentPage.value = 1;
      openPath(path.value);
    }

    function openFileFolder(file) {
      const parent = String(file.relative_path || '').split('/').slice(0, -1).join('/');
      documentSearch.value = '';
      activeDocumentSearch.value = '';
      documentSearchActive.value = false;
      openPath(parent);
    }

    function goUp() {
      openPath(path.value.split('/').slice(0, -1).join('/'));
    }

    function pickFiles() {
      fileInput.value?.click();
    }

    function pickExcel(kind) {
      excelTarget.value = kind;
      if (kind === 'assessment' && !excelProjectName.value.trim()) {
        alertMessage('Enter the project name before selecting an Excel file.');
        return;
      }
      excelInput.value?.click();
    }

    async function uploadSelected(event) {
      const selected = Array.from(event.target.files || []);
      event.target.value = '';
      if (!selected.length) return;
      alertMessage(`Simulated upload of ${selected.length} file(s) to the current folder (demo; nothing was written).`);
      await openPath(path.value);
    }

    async function uploadExcelSelected(event) {
      const selected = Array.from(event.target.files || []);
      event.target.value = '';
      if (!selected.length) return;
      if (excelTarget.value === 'assessment' && !excelProjectName.value.trim()) {
        alertMessage('Project name is required. Enter it before uploading.');
        return;
      }
      await LegalDemo.delay(500);
      alertMessage(
        `Import complete: ${selected.length} file(s) succeeded (demo).${
          excelTarget.value === 'master' ? 'Master list refreshed.' : 'Project assessments refreshed.'
        }`
      );
      if (excelTarget.value === 'master') await loadMaster();
      else await loadAssessments();
    }

    function formatSize(size) {
      if (size < 1024) return `${size} B`;
      if (size < 1048576) return `${(size / 1024).toFixed(1)} KB`;
      return `${(size / 1048576).toFixed(1)} MB`;
    }

    function parseStatusLabel(status) {
      return (
        {
          ingested: 'Ingested',
          ready: 'Ready for Q&A',
          failed: 'Parse failed',
          checking: 'Checking'
        }[status] || 'Ingested'
      );
    }

    async function checkParse(file) {
      file.parse_status = 'checking';
      const updated = await MockStore.checkParse(file);
      Object.assign(file, updated);
      if (file.parse_status === 'failed') alertMessage(`Parse failed: ${file.parse_error || 'Unknown reason'}`);
    }

    function confirmDelete(type, item) {
      dialog.value = {
        title: type === 'file' ? 'Delete regulation file' : 'Delete folder',
        message:
          type === 'file'
            ? `Move "${item.display_name}" to the recycle bin?`
            : `Move "${item.name}" and its contents to the recycle bin?`,
        submit: async () => {
          if (type === 'file') MockStore.trashFile(item);
          else MockStore.trashFolder(item);
          dialog.value = null;
          await openPath(path.value);
        }
      };
    }

    function togglePageSelection(kind, checked) {
      const records = kind === 'files' ? files.value : kind === 'master' ? masterRecords.value : assessments.value;
      const key = kind === 'files' ? 'file_id' : kind === 'master' ? 'record_id' : 'assessment_id';
      const target =
        kind === 'files' ? selectedFileIds : kind === 'master' ? selectedMasterIds : selectedAssessmentIds;
      target.value = checked ? records.map((item) => item[key]) : [];
    }

    function confirmBatchDelete(kind) {
      const target =
        kind === 'files' ? selectedFileIds : kind === 'master' ? selectedMasterIds : selectedAssessmentIds;
      const count = target.value.length;
      if (!count) return;
      const labels = { files: 'regulation files', master: 'master-list records', assessments: 'project assessment records' };
      dialog.value = {
        title: `Bulk delete ${labels[kind]}`,
        message:
          kind === 'files'
            ? `Move the selected ${count} regulation file(s) to the recycle bin?`
            : `Delete the selected ${count} ${labels[kind]}? This immediately affects Regulation Q&A and cannot be restored from the recycle bin.`,
        submit: async () => {
          if (kind === 'files') {
            const result = MockStore.batchTrashFiles(target.value);
            dialog.value = null;
            if (documentSearchActive.value) await loadDocumentSearch();
            else await openPath(path.value);
            if (result.failed?.length) alertMessage(`${result.failed.length} file(s) could not be deleted.`);
          } else if (kind === 'master') {
            MockStore.batchDeleteMaster(target.value);
            selectedMasterIds.value = [];
            dialog.value = null;
            await loadMaster();
          } else {
            MockStore.batchDeleteAssessments(target.value);
            selectedAssessmentIds.value = [];
            dialog.value = null;
            await loadAssessments();
          }
        }
      };
    }

    function showFolderDialog() {
      dialog.value = {
        type: 'folder',
        title: 'New folder',
        message: 'Enter a name for the new folder.',
        name: '',
        submit: async () => {
          try {
            MockStore.createFolder(path.value, dialog.value.name);
            dialog.value = null;
            await openPath(path.value);
          } catch (e) {
            alertMessage(e.message);
          }
        }
      };
    }

    function loadRecycle() {
      recycle.value = MockStore.getRecycle();
    }

    function restore(type, id) {
      dialog.value = {
        title: 'Restore item',
        message: 'Restore this item?',
        submit: async () => {
          MockStore.restore(type, id);
          dialog.value = null;
          loadRecycle();
          await openPath(path.value);
        }
      };
    }

    function purge(type, id) {
      dialog.value = {
        title: 'Delete permanently',
        message: 'Permanent deletion cannot be undone. Continue?',
        submit: async () => {
          MockStore.purge(type, id);
          dialog.value = null;
          loadRecycle();
        }
      };
    }

    function editMaster(item = {}) {
      const record = { status: 'draft', ...item };
      dialog.value = {
        type: 'master',
        title: item.record_id ? 'Edit master-list record' : 'Add master-list record',
        message:
          'Regulation code, name, market, and category are required. Market aliases may be Chinese, English, or local names, separated by commas. Saving a published record immediately affects Regulation Q&A; new records default to draft and take effect after publish.',
        record,
        fields: [
          { key: 'code', label: 'Regulation code', required: true },
          { key: 'name', label: 'Regulation name', required: true },
          { key: 'market', label: 'Market', required: true },
          { key: 'market_aliases', label: 'Market aliases (optional)' },
          { key: 'category', label: 'Category (tag)', required: true },
          { key: 'applicable_object', label: 'Certification / applicable object' },
          { key: 'vehicle_types', label: 'Applicable vehicle types' },
          { key: 'file_names', label: 'Full-text file names' }
        ],
        submit: async () => {
          if (!record.code || !record.name || !record.market || !record.category) {
            alertMessage('Please complete required fields');
            return;
          }
          MockStore.saveMaster(record);
          dialog.value = null;
          await loadMaster();
        }
      };
    }

    async function loadMaster() {
      await LegalDemo.delay(200);
      const data = MockStore.master(masterSearch.value.trim(), masterPage.value);
      masterRecords.value = data.records || [];
      selectedMasterIds.value = [];
      masterTotal.value = data.total || 0;
      masterPages.value = data.pages || 1;
      loadedTabs.add('master');
      await nextTick();
      updateTableScrollWidths();
    }

    function searchMaster() {
      masterPage.value = 1;
      loadMaster();
    }

    function changeMasterPage(page) {
      masterPage.value = page;
      loadMaster();
    }

    function publishMaster(item) {
      dialog.value = {
        title: 'Publish regulation record',
        message: 'After publish, this record will be used in Regulation Q&A. Publish now?',
        submit: async () => {
          MockStore.publishMaster(item.record_id);
          dialog.value = null;
          await loadMaster();
        }
      };
    }

    function editAssessment(item = {}) {
      const record = { status: 'draft', ...item };
      dialog.value = {
        type: 'assessment',
        title: item.assessment_id ? 'Edit project assessment' : 'Add project assessment',
        message:
          'Project name, regulation code, and market are required. Market aliases are optional (comma-separated). If result or risk is empty, Regulation Q&A will report insufficient assessment basis.',
        record,
        fields: [
          { key: 'project_name', label: 'Project name', required: true },
          { key: 'code', label: 'Regulation code', required: true },
          { key: 'name', label: 'Regulation name' },
          { key: 'market', label: 'Market', required: true },
          { key: 'market_aliases', label: 'Market aliases (optional)' },
          { key: 'category', label: 'Category' },
          { key: 'result', label: 'Assessment result' },
          { key: 'risk_detail', label: 'Risk detail', multiline: true }
        ],
        submit: async () => {
          if (!record.project_name || !record.code || !record.market) {
            alertMessage('Please complete required fields');
            return;
          }
          MockStore.saveAssessment(record);
          dialog.value = null;
          await loadAssessments();
        }
      };
    }

    async function loadAssessments() {
      await LegalDemo.delay(200);
      const data = MockStore.assessments(
        assessmentSearch.value.trim(),
        assessmentProject.value.trim(),
        assessmentPage.value
      );
      assessments.value = data.records || [];
      selectedAssessmentIds.value = [];
      assessmentTotal.value = data.total || 0;
      assessmentPages.value = data.pages || 1;
      loadedTabs.add('assessments');
      await nextTick();
      updateTableScrollWidths();
    }

    function searchAssessments() {
      assessmentPage.value = 1;
      loadAssessments();
    }

    function changeAssessmentPage(page) {
      assessmentPage.value = page;
      loadAssessments();
    }

    function publishAssessment(item) {
      dialog.value = {
        title: 'Publish project assessment',
        message: 'After publish, this assessment will be used in Regulation Q&A. Publish now?',
        submit: async () => {
          MockStore.publishAssessment(item.assessment_id);
          dialog.value = null;
          await loadAssessments();
        }
      };
    }

    function selectTab(name) {
      tab.value = name;
      if (name === 'master' && !loadedTabs.has('master')) loadMaster();
      if (name === 'assessments' && !loadedTabs.has('assessments')) loadAssessments();
      if (name === 'recycle') loadRecycle();
    }

    function refreshAll() {
      if (tab.value === 'documents' && documentSearchActive.value) loadDocumentSearch();
      else if (tab.value === 'documents') openPath(path.value);
      if (tab.value === 'master') loadMaster();
      if (tab.value === 'assessments') loadAssessments();
      if (tab.value === 'recycle') loadRecycle();
    }

    function updateTableScrollWidths() {
      masterScrollWidth.value = masterTableScroll.value?.scrollWidth || 0;
      assessmentScrollWidth.value = assessmentTableScroll.value?.scrollWidth || 0;
    }

    function syncTableScroll(kind, source) {
      const top = kind === 'master' ? masterTopScroll.value : assessmentTopScroll.value;
      const table = kind === 'master' ? masterTableScroll.value : assessmentTableScroll.value;
      if (!top || !table) return;
      if (source === 'top') table.scrollLeft = top.scrollLeft;
      else top.scrollLeft = table.scrollLeft;
    }

    function handleResize() {
      nextTick(updateTableScrollWidths);
    }

    const showFolder = computed({
      get: () => dialog.value?.type === 'folder',
      set: (value) => {
        if (value) showFolderDialog();
        else dialog.value = null;
      }
    });

    onMounted(() => {
      openPath('');
      addEventListener('resize', handleResize);
    });

    onBeforeUnmount(() => removeEventListener('resize', handleResize));

    return {
      tab,
      path,
      folders,
      files,
      recycle,
      masterRecords,
      assessments,
      loading,
      error,
      dialog,
      fileInput,
      excelInput,
      currentUser,
      initials,
      isEmbed,
      showAccountMenu,
      pathParts,
      masterTopScroll,
      masterTableScroll,
      assessmentTopScroll,
      assessmentTableScroll,
      masterScrollWidth,
      assessmentScrollWidth,
      masterPage,
      masterPages,
      masterTotal,
      masterSearch,
      assessmentPage,
      assessmentPages,
      assessmentTotal,
      assessmentSearch,
      assessmentProject,
      documentSearch,
      activeDocumentSearch,
      documentSearchActive,
      documentPage,
      documentPages,
      documentTotal,
      selectedFileIds,
      selectedMasterIds,
      selectedAssessmentIds,
      allFilesSelected,
      allMasterSelected,
      allAssessmentsSelected,
      excelTarget,
      excelProjectName,
      showFolder,
      logout,
      openRegulationQa,
      selectTab,
      openPath,
      goUp,
      pickFiles,
      uploadSelected,
      pickExcel,
      uploadExcelSelected,
      confirmDelete,
      confirmBatchDelete,
      togglePageSelection,
      parseStatusLabel,
      checkParse,
      loadRecycle,
      restore,
      purge,
      editMaster,
      publishMaster,
      editAssessment,
      publishAssessment,
      refreshAll,
      formatSize,
      syncTableScroll,
      searchMaster,
      changeMasterPage,
      searchAssessments,
      changeAssessmentPage,
      searchDocuments,
      changeDocumentPage,
      clearDocumentSearch,
      openFileFolder,
      previewFile
    };
  }
}).mount('#knowledge-app');
