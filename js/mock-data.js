/**
 * Offline mock payloads for AI Regulation Agent 2.0 demo.
 * Mimics loading / success / failure behaviors without a backend.
 */
window.MockStore = (() => {
  const SAMPLE_ANSWER = {
    kind: 'answer',
    status: 'answered',
    answer_mode: 'clause_lookup',
    answer:
      'Under GB 15083-2019, seat-back strength requirements cover two dimensions: (1) seat backs forming the front luggage-compartment boundary must provide protective strength against luggage displacement injuring occupants (clause 4.11.1); and (2) the seat back and its adjustment devices must meet general static strength requirements (clause 5.2).\n\n**Key conclusions**\n* Luggage displacement protection: after the dynamic test, back locks shall not fail and deformation shall not exceed the limit forward of the R-point.\n* General static strength: structure shall not fail after applying a 530 Nm moment to the back frame.\n* Locking devices shall not release during the test.',
    uncertainty: 'Some statements in this answer have not yet completed sentence-level source verification; please rely on cited original text.',
    conclusion_summary: 'Seat-back strength must satisfy both luggage-displacement protection and static strength requirements.',
    conclusion_source_ids: ['S12', 'S36'],
    applicable_regulations: [
      {
        code: 'GB 15083-2019',
        name: 'Strength requirements and test methods for automobile seats, seat anchorages and head restraints',
        basis: 'Master regulation list records the market as China; certification object is whole vehicle + components; category is seats.',
        source_ids: ['S1'],
        document_status: 'Version status pending review',
        applicable_markets: ['China']
      }
    ],
    key_clauses: [
      {
        reference: '4.11.1',
        original_text:
          'When the seat is in the manufacturer-specified normal use position, the seat back and/or head restraint forming the luggage compartment shall have sufficient strength to protect occupants from injury due to forward luggage movement in a frontal impact.',
        explanation: 'Seat backs forming the luggage compartment boundary must provide protective strength against forward luggage movement injuring occupants.',
        source_ids: ['S12'],
        regulation_code: 'GB 15083-2019',
        source_location: 'China-NEW / GB 15083-2019 / page 9 / clause 4.11.1',
        page_no: 9,
        applicable_markets: ['China']
      },
      {
        reference: '5.2',
        original_text:
          'Using a simulated human backform, apply a 530 Nm moment relative to the seat R-point rearward along the longitudinal direction to the upper seat-back frame.',
        explanation: 'General static strength test: structure shall not fail after 530 Nm moment loading.',
        source_ids: ['S36'],
        regulation_code: 'GB 15083-2019',
        source_location: 'China-NEW / GB 15083-2019 / page 10 / clause 5.2',
        page_no: 10,
        applicable_markets: ['China']
      }
    ],
    risks: ['If the seat-back locking device releases during the dynamic test, nonconformity with 4.11.1 / 4.2.6 is directly determined.'],
    next_steps: ['Verify whether this model seat forms the front luggage-compartment boundary', 'Confirm head-restraint height adjustment covers the worst-case condition'],
    sources: [
      {
        title: 'GB 15083-2019 Strength requirements and test methods for automobile seats, seat anchorages and head restraints',
        regulation_code: 'GB 15083-2019',
        provider: 'managed_knowledge_base',
        jurisdiction: 'China',
        source_ids: ['S1', 'S12', 'S36'],
        locations: ['Master Regulation List / Sheet1!1750', 'page 9 / 4.11.1', 'page 10 / 5.2']
      }
    ],
    consultation_context: {
      product_type: null,
      target_market: 'China',
      project_stage: null,
      focus: 'Seat-back strength',
      conditions: []
    },
    evidence_notice: 'Some statements in this answer have not yet completed sentence-level source verification; please rely on cited original text.'
  };

  const EU_ANSWER = {
    kind: 'answer',
    status: 'answered',
    answer_mode: 'change_plan',
    answer:
      'Even if M1 passenger-car seats already meet GB 15083-2019, EU export still requires focused verification of UN R17 / related ECE requirements and test-condition differences; GB compliance cannot be treated as automatic equivalence.',
    conclusion_summary: 'Passing the GB system does not mean free entry into the EU market; re-verify against the target market.',
    conclusion_source_ids: ['S100'],
    applicable_regulations: [
      {
        code: 'UN R17',
        name: 'Seats, their anchorages and head restraints',
        basis: 'Common certification basis for seat systems in the EU market',
        source_ids: ['S100'],
        document_status: 'In force',
        applicable_markets: ['EU']
      }
    ],
    key_clauses: [],
    change_items: [
      {
        decision: 'verify',
        title: 'Seat strength test conditions need alignment review against UN R17',
        current: 'Domestic validation completed under GB 15083-2019',
        target: 'Review differences against UN R17 test configuration and criteria',
        action: 'Produce a difference matrix and have certification engineers confirm any supplemental tests',
        acceptance: 'Differences closed or supplemental tests passed'
      },
      {
        decision: 'conditional_change',
        title: 'Head-restraint height and locking notices may need supplemental instructions',
        current: 'Domestic owner-manual wording',
        target: 'Meet EU market user information and labeling requirements',
        action: 'Check whether manuals/labels cover EU languages and notices',
        acceptance: 'Documentation complete'
      }
    ],
    risks: ['Relying solely on GB reports for export may lead to certification rejection'],
    next_steps: ['Pull the UN R17 vs GB 15083 difference list', 'Confirm whether target-model seats already have EU type approval'],
    sources: [
      {
        title: 'UN R17 / GB 15083 comparison (Demo)',
        regulation_code: 'UN R17',
        provider: 'mock',
        jurisdiction: 'EU',
        source_ids: ['S100'],
        locations: ['Demo knowledge base']
      }
    ],
    consultation_context: {
      target_market: 'EU',
      focus: 'Export change verification',
      conditions: []
    },
    evidence_notice: 'This answer is demo mock data for interaction demonstration only.'
  };

  const BATTERY_ANSWER = {
    kind: 'answer',
    status: 'answered',
    answer_mode: 'requirements',
    answer:
      'EU traction battery thermal propagation requirements usually need combined assessment under whole-vehicle safety and battery system regulations, focusing on thermal runaway propagation suppression, warnings, and occupant protection.',
    conclusion_summary: 'Match the applicable regulation package to the target vehicle and battery architecture, and define test boundaries clearly.',
    conclusion_source_ids: ['S200'],
    applicable_regulations: [
      {
        code: 'UN R100 / related battery safety requirements',
        name: 'EV traction battery safety (Demo)',
        basis: 'Common battery safety focus points for EU export',
        source_ids: ['S200'],
        document_status: 'Demo',
        applicable_markets: ['EU']
      }
    ],
    key_clauses: [
      {
        reference: 'Thermal propagation',
        original_text: 'Measures shall be taken to reduce the risk of thermal runaway propagation within the battery pack and ensure occupants have sufficient time to evacuate.',
        explanation: 'Thermal propagation requirements typically treat occupant protection time and warning strategy as key acceptance points.',
        source_ids: ['S200'],
        regulation_code: 'UN R100',
        source_location: 'Demo / Thermal propagation section',
        page_no: 1,
        applicable_markets: ['EU']
      }
    ],
    risks: ['Unclear thermal propagation test boundaries make conclusions non-reproducible'],
    next_steps: ['Confirm battery pack architecture and sensor layout', 'Compile the applicable regulation list for the target market'],
    sources: [
      {
        title: 'Traction battery thermal propagation demo knowledge entry',
        regulation_code: 'UN R100',
        provider: 'mock',
        jurisdiction: 'EU',
        source_ids: ['S200'],
        locations: ['Demo']
      }
    ],
    consultation_context: { target_market: 'EU', focus: 'Thermal propagation', conditions: [] },
    evidence_notice: 'Demo mock data'
  };

  let sessions = [
    {
      id: 'sess-demo-1',
      title: 'GB 15083-2019 Clause Interpretation',
      updated_at: '2026-08-25T07:58:51.063000+00:00',
      created_at: '2026-08-25T07:58:14.388000+00:00'
    },
    {
      id: 'sess-demo-2',
      title: 'EU export seat difference check',
      updated_at: '2026-08-24T11:20:00.000000+00:00',
      created_at: '2026-08-24T11:10:00.000000+00:00'
    }
  ];

  const sessionMessages = {
    'sess-demo-1': [
      {
        id: 'm1-user',
        role: 'user',
        content: 'How should the seat-back strength clauses in GB 15083-2019 be understood?',
        created_at: '2026-08-25T07:58:14.398777+00:00'
      },
      {
        id: 'm1-assistant',
        role: 'assistant',
        content: SAMPLE_ANSWER.answer,
        answer: SAMPLE_ANSWER,
        created_at: '2026-08-25T07:58:51.063130+00:00'
      }
    ],
    'sess-demo-2': [
      {
        id: 'm2-user',
        role: 'user',
        content: 'M1 passenger-car seats already meet GB 15083-2019; what needs verification or change for EU export?',
        created_at: '2026-08-24T11:10:10.000000+00:00'
      },
      {
        id: 'm2-assistant',
        role: 'assistant',
        content: EU_ANSWER.answer,
        answer: EU_ANSWER,
        created_at: '2026-08-24T11:20:00.000000+00:00'
      }
    ]
  };

  const foldersByPath = JSON.parse(JSON.stringify(window.KB_DIRECTORY_DATA || { '': { path: '', folders: [], files: [] } }));

  let masterRecords = [
    {
      record_id: 'master-1',
      code: 'GB 15083-2019',
      name: 'Strength requirements and test methods for automobile seats, seat anchorages and head restraints',
      market: 'China',
      market_aliases: 'China,CN',
      category: 'Seats',
      applicable_object: 'Whole vehicle + components',
      vehicle_types: 'M1',
      file_names: 'GB 15083-2019 CN.pdf',
      status: 'published'
    },
    {
      record_id: 'master-2',
      code: 'UN R17',
      name: 'Seats, their anchorages and head restraints',
      market: 'EU',
      market_aliases: 'EU,Europe',
      category: 'Seats',
      applicable_object: 'Whole vehicle',
      vehicle_types: 'M1',
      file_names: 'UN R17.pdf',
      status: 'published'
    },
    {
      record_id: 'master-3',
      code: 'GB 18384-2025',
      name: 'Electric vehicle safety requirements',
      market: 'China',
      market_aliases: 'China',
      category: 'Vehicle safety',
      applicable_object: 'Whole vehicle',
      vehicle_types: 'M1',
      file_names: 'GB 18384-2025.pdf',
      status: 'draft'
    }
  ];

  let assessments = [
    {
      assessment_id: 'as-1',
      project_name: 'LS6 Pro Seat Project',
      code: 'GB 15083-2019',
      name: 'Strength requirements and test methods for automobile seats, seat anchorages and head restraints',
      market: 'China',
      category: 'Seats',
      result: 'OK',
      risk_detail: 'Current design meets seat-back strength and locking requirements.',
      status: 'published'
    },
    {
      assessment_id: 'as-2',
      project_name: 'LS6 Pro Seat Project',
      code: 'UN R17',
      name: 'Seats, their anchorages and head restraints',
      market: 'EU',
      category: 'Seats',
      result: 'TBD',
      risk_detail: 'Evidence aligning with EU test conditions is still missing.',
      status: 'draft'
    }
  ];

  let recycle = { folders: [], files: [] };

  let complianceHistory = [
    {
      id: 'job-1001',
      mode: 'check',
      title: 'China_EU_Seat Checklist.xlsx',
      markets: ['China', 'EU'],
      status: 'completed',
      createdAt: '2026-08-20T09:12:00+08:00',
      progress: 100
    },
    {
      id: 'job-1002',
      mode: 'check',
      title: 'US_Southeast Asia_Battery Checklist.xlsx',
      markets: ['United States', 'Southeast Asia'],
      status: 'failed',
      createdAt: '2026-08-18T16:40:00+08:00',
      progress: 42,
      message: 'Some standard numbers could not be matched in the regulation library'
    },
    {
      id: 'rpt-1001',
      mode: 'report',
      title: 'Seat Project_Regulation Requirements Confirmation Report.xlsx',
      markets: [],
      status: 'completed',
      createdAt: '2026-08-19T11:20:00+08:00',
      progress: 100
    }
  ];

  function pickAnswer(question) {
    const q = String(question || '');
    if (/fail|error|unavailable/.test(q)) {
      const err = new Error('Regulation Q&A service temporarily unavailable. Please try again later. (Demo simulated failure)');
      err.mockFail = true;
      throw err;
    }
    if (/EU|export|UN R17|change/.test(q)) return EU_ANSWER;
    if (/thermal|battery|propagation/.test(q)) return BATTERY_ANSWER;
    return SAMPLE_ANSWER;
  }

  async function ask(question, sessionId) {
    await LegalDemo.delay(1200 + Math.random() * 800);
    const answer = pickAnswer(question);
    const sid = sessionId || LegalDemo.uid('sess');
    const now = new Date().toISOString();
    if (!sessions.find((s) => s.id === sid)) {
      sessions.unshift({
        id: sid,
        title: String(question).slice(0, 28) || 'Untitled consultation',
        created_at: now,
        updated_at: now
      });
      sessionMessages[sid] = [];
    } else {
      const s = sessions.find((x) => x.id === sid);
      s.updated_at = now;
      sessions = [s, ...sessions.filter((x) => x.id !== sid)];
    }
    const userMsg = {
      id: LegalDemo.uid('user'),
      role: 'user',
      content: question,
      created_at: now
    };
    const assistantMsg = {
      id: LegalDemo.uid('assistant'),
      role: 'assistant',
      content: answer.answer,
      answer,
      created_at: new Date().toISOString()
    };
    sessionMessages[sid] = [...(sessionMessages[sid] || []), userMsg, assistantMsg];
    return {
      session: sessions.find((s) => s.id === sid),
      user_message: userMsg,
      assistant_message: assistantMsg
    };
  }

  return {
    listSessions() {
      return { sessions: sessions.slice() };
    },
    getSession(id) {
      return {
        session: sessions.find((s) => s.id === id) || null,
        messages: (sessionMessages[id] || []).slice()
      };
    },
    deleteSession(id) {
      sessions = sessions.filter((s) => s.id !== id);
      delete sessionMessages[id];
    },
    ask,
    directory(path = '') {
      const key = path || '';
      const data = foldersByPath[key] || { path: key, folders: [], files: [] };
      return JSON.parse(JSON.stringify(data));
    },
    searchFiles(keyword, page = 1, pageSize = 50) {
      const all = Object.values(foldersByPath).flatMap((d) => d.files || []);
      const records = all.filter((f) =>
        `${f.display_name} ${f.relative_path}`.toLowerCase().includes(String(keyword).toLowerCase())
      );
      const total = records.length;
      const pages = Math.max(1, Math.ceil(total / pageSize));
      const start = (page - 1) * pageSize;
      return { records: records.slice(start, start + pageSize), total, pages };
    },
    master(search = '', page = 1, pageSize = 50) {
      const keyword = String(search).trim().toLowerCase();
      const filtered = masterRecords.filter((r) =>
        !keyword ||
        `${r.code} ${r.name} ${r.market} ${r.market_aliases || ''} ${r.category}`.toLowerCase().includes(keyword)
      );
      const total = filtered.length;
      const pages = Math.max(1, Math.ceil(total / pageSize));
      const start = (page - 1) * pageSize;
      return { records: filtered.slice(start, start + pageSize), total, pages };
    },
    saveMaster(record) {
      if (record.record_id) {
        masterRecords = masterRecords.map((r) => (r.record_id === record.record_id ? { ...r, ...record } : r));
      } else {
        masterRecords.unshift({ ...record, record_id: LegalDemo.uid('master'), status: record.status || 'draft' });
      }
      return { ok: true };
    },
    publishMaster(id) {
      masterRecords = masterRecords.map((r) => (r.record_id === id ? { ...r, status: 'published' } : r));
    },
    assessments(search = '', project = '', page = 1, pageSize = 50) {
      const keyword = String(search).trim().toLowerCase();
      const filtered = assessments.filter((r) => {
        const hitKeyword =
          !keyword ||
          `${r.project_name} ${r.code} ${r.name} ${r.market} ${r.market_aliases || ''} ${r.risk_detail || ''}`
            .toLowerCase()
            .includes(keyword);
        const hitProject = !project || r.project_name.toLowerCase().includes(String(project).trim().toLowerCase());
        return hitKeyword && hitProject;
      });
      const total = filtered.length;
      const pages = Math.max(1, Math.ceil(total / pageSize));
      const start = (page - 1) * pageSize;
      return { records: filtered.slice(start, start + pageSize), total, pages };
    },
    saveAssessment(record) {
      if (record.assessment_id) {
        assessments = assessments.map((r) =>
          r.assessment_id === record.assessment_id ? { ...r, ...record } : r
        );
      } else {
        assessments.unshift({
          ...record,
          assessment_id: LegalDemo.uid('as'),
          status: record.status || 'draft'
        });
      }
    },
    publishAssessment(id) {
      assessments = assessments.map((r) => (r.assessment_id === id ? { ...r, status: 'published' } : r));
    },
    getRecycle() {
      return JSON.parse(JSON.stringify(recycle));
    },
    trashFile(file) {
      const parent = file.relative_path.split('/').slice(0, -1).join('/');
      const dir = foldersByPath[parent];
      if (dir) dir.files = (dir.files || []).filter((f) => f.file_id !== file.file_id);
      recycle.files.push({ ...file });
    },
    batchTrashFiles(ids = []) {
      const failed = [];
      ids.forEach((id) => {
        const file = Object.values(foldersByPath)
          .flatMap((d) => d.files || [])
          .find((f) => f.file_id === id);
        if (file) trashFile(file);
        else failed.push(id);
      });
      return { failed };
    },
    trashFolder(folder) {
      const parentKey = folder.relative_path.includes('/')
        ? folder.relative_path.split('/').slice(0, -1).join('/')
        : '';
      const parentDir = foldersByPath[parentKey];
      if (!parentDir) return;
      parentDir.folders = (parentDir.folders || []).filter((f) => f.folder_id !== folder.folder_id);
      delete foldersByPath[folder.relative_path];
      recycle.folders.push({ ...folder });
    },
    createFolder(parentPath, name) {
      const trimmed = String(name || '').trim();
      if (!trimmed) throw new Error('Folder name cannot be empty');
      const relativePath = parentPath ? `${parentPath}/${trimmed}` : trimmed;
      if (foldersByPath[relativePath]) throw new Error('Folder already exists');
      const parentKey = parentPath || '';
      if (!foldersByPath[parentKey]) {
        foldersByPath[parentKey] = { path: parentKey, folders: [], files: [] };
      }
      const folder = {
        folder_id: LegalDemo.uid('folder'),
        name: trimmed,
        relative_path: relativePath
      };
      foldersByPath[parentKey].folders.push(folder);
      foldersByPath[relativePath] = { path: relativePath, folders: [], files: [] };
      return folder;
    },
    batchDeleteMaster(ids = []) {
      masterRecords = masterRecords.filter((r) => !ids.includes(r.record_id));
    },
    batchDeleteAssessments(ids = []) {
      assessments = assessments.filter((r) => !ids.includes(r.assessment_id));
    },
    restore(type, id) {
      if (type === 'file') {
        const idx = recycle.files.findIndex((f) => f.file_id === id);
        if (idx >= 0) {
          const file = recycle.files.splice(idx, 1)[0];
          const parent = file.relative_path.split('/').slice(0, -1).join('/');
          if (!foldersByPath[parent]) foldersByPath[parent] = { path: parent, folders: [], files: [] };
          foldersByPath[parent].files.push(file);
        }
      }
      if (type === 'folder') {
        const idx = recycle.folders.findIndex((f) => f.folder_id === id);
        if (idx >= 0) {
          const folder = recycle.folders.splice(idx, 1)[0];
          const parentKey = folder.relative_path.includes('/')
            ? folder.relative_path.split('/').slice(0, -1).join('/')
            : '';
          if (!foldersByPath[parentKey]) foldersByPath[parentKey] = { path: parentKey, folders: [], files: [] };
          foldersByPath[parentKey].folders.push(folder);
          if (!foldersByPath[folder.relative_path]) {
            foldersByPath[folder.relative_path] = { path: folder.relative_path, folders: [], files: [] };
          }
        }
      }
    },
    purge(type, id) {
      if (type === 'file') recycle.files = recycle.files.filter((f) => f.file_id !== id);
      if (type === 'folder') recycle.folders = recycle.folders.filter((f) => f.folder_id !== id);
    },
    async checkParse(file) {
      await LegalDemo.delay(900);
      if (file.file_id === 'file-failed') {
        return { ...file, parse_status: 'failed', parse_error: 'Could not detect a valid text layer' };
      }
      return { ...file, parse_status: 'ready', clause_count: file.clause_count || 42, parse_error: '' };
    },
    complianceHistory(mode) {
      const list = complianceHistory.slice();
      if (!mode) return list;
      return list.filter((item) => (item.mode || 'check') === mode);
    },
    addComplianceHistory(entry) {
      const item = {
        id: entry.id || LegalDemo.uid('hist'),
        mode: entry.mode || 'check',
        title: entry.title || 'Exported file.xlsx',
        markets: entry.markets || [],
        status: entry.status || 'completed',
        createdAt: entry.createdAt || new Date().toISOString(),
        progress: entry.progress == null ? 100 : entry.progress
      };
      complianceHistory.unshift(item);
      return item;
    },
    removeComplianceHistory(id) {
      complianceHistory = complianceHistory.filter((item) => item.id !== id);
      return complianceHistory.slice();
    },
    async runCompliance(files) {
      const jobId = LegalDemo.uid('job');
      const title = files.map((f) => f.name).join(' + ') || 'Compliance screening task';
      const markets = files.map((f) => f.name.replace(/\.xlsx$/i, ''));
      return { jobId, title, markets };
    },
    compliancePreview(markets) {
      return {
        stats: [
          { label: 'Markets', value: String(markets.length || 2) },
          { label: 'Merged standard Nos.', value: '128' },
          { label: 'Difference items', value: '17' },
          { label: 'Pending confirmation', value: '6' }
        ],
        columns: ['Standard No.', 'Regulation name', ...markets, 'Difference notes', 'Suggested owner'],
        rows: [
          ['GB 15083-2019', 'Seat strength', 'Applicable', markets[1] ? 'Needs verification' : '-', 'Test condition differences', 'Seat system'],
          ['UN R17', 'Seat anchorages', markets[0] === 'China' ? 'Reference' : 'Applicable', 'Applicable', 'Different certification pathways', 'Certification engineering'],
          ['GB 18384-2025', 'Electric vehicle safety', 'Applicable', 'Partially applicable', 'Thermal propagation clause boundaries', 'High-voltage system']
        ]
      };
    },
    reportNews() {
      return [
        {
          id: 1,
          title: 'EU updates overview of traction battery safety intelligence',
          source: 'Demo news source',
          date: '2026-08-21',
          tags: ['EU', 'Battery']
        },
        {
          id: 2,
          title: 'GB 18384-2025 implementation focus areas',
          source: 'Domestic standards updates',
          date: '2026-08-18',
          tags: ['China', 'Vehicle safety']
        },
        {
          id: 3,
          title: 'US software update compliance checklist (excerpt)',
          source: 'Overseas regulation watch',
          date: '2026-08-12',
          tags: ['United States', 'Software']
        }
      ];
    },
    comparePairs() {
      return [
        {
          id: 'cmp-1',
          oldName: 'GB 15083-2006',
          newName: 'GB 15083-2019',
          status: 'completed',
          diffCount: 23
        },
        {
          id: 'cmp-2',
          oldName: 'Previous battery safety requirements',
          newName: 'GB 18384-2025',
          status: 'processing',
          diffCount: 0
        }
      ];
    },
    complianceReportInspect(fileName) {
      return {
        fileName: fileName || 'Annotated checklist.xlsx',
        sheetName: 'Regulation annotations',
        stats: {
          totalRows: 128,
          completeRows: 96,
          partialRows: 22,
          pendingRows: 10
        },
        preview: {
          headers: ['Standard No.', 'Regulation name', 'Assessment result', 'Risk level', 'Suggested owner'],
          rows: [
            ['GB 15083-2019', 'Motor vehicle seat strength', 'Compliant', 'Low', 'Seat system'],
            ['GB 18384-2025', 'Electric vehicle safety requirements', 'Partially compliant', 'Medium', 'High-voltage system'],
            ['UN R17', 'Seat anchorages', 'Pending assessment', 'Medium', 'Certification engineering'],
            ['GB 7258-2017', 'Technical specifications for safety of power-driven vehicles', 'Compliant', 'Low', 'Vehicle integration'],
            ['ECE R94', 'Frontal impact protection', 'Non-compliant', 'High', 'Passive safety']
          ],
          shownRows: 5
        },
        reportData: {
          totalRows: 128,
          riskCounts: {
            highRisk: 3,
            mediumRisk: 12,
            lowRisk: 68,
            pending: 10,
            notApplicable: 35
          },
          riskItems: [
            {
              responsibility: 'Passive safety',
              market: 'China',
              standard: 'ECE R94',
              name: 'Frontal impact protection',
              riskLevel: 'High risk',
              strategy: 'Need to supplement frontal impact test validation plan'
            },
            {
              responsibility: 'High-voltage system',
              market: 'EU',
              standard: 'GB 18384-2025',
              name: 'Electric vehicle safety requirements',
              riskLevel: 'Medium risk',
              strategy: 'Thermal propagation clauses need alignment with EU regulations'
            },
            {
              responsibility: 'Certification engineering',
              market: 'United States',
              standard: 'UN R17',
              name: 'Seat anchorages',
              riskLevel: 'Medium risk',
              strategy: 'Certification pathway differences need further confirmation'
            }
          ]
        }
      };
    }
  };
})();
