const { createApp, ref, computed, nextTick, onMounted } = Vue;

createApp({
  setup() {
    const examples = [
      'What must be verified or changed for M1 passenger-car seats exported to the EU?',
      'Which strength requirements should a China passenger-car seat project focus on during validation?',
      'How should the seat-back strength clauses in GB 15083-2019 be interpreted?'
    ];
    const question = ref('');
    const messages = ref([]);
    const sessions = ref([]);
    const activeSessionId = ref('');
    const isLoading = ref(false);
    const isHistoryLoading = ref(false);
    const showAccountMenu = ref(false);
    const showHelpModal = ref(false);
    const helpVideoUrl = ref('./static/tutorials/demo.mp4');
    const showHistory = ref(false);
    const threadElement = ref(null);
    const composerInput = ref(null);
    const currentUser = ref(LegalDemo.readUser());
    const initials = computed(() => LegalDemo.initials(currentUser.value.displayName));
    const greeting = computed(() => {
      const hour = new Date().getHours();
      if (hour < 11) return 'Good morning';
      if (hour < 18) return 'Good afternoon';
      return 'Good evening';
    });
    const canSend = computed(() => Boolean(question.value.trim()) && !isLoading.value);

    function logout() {
      LegalDemo.logout();
    }

    function goKnowledge() {
      location.href = './regulation-knowledge.html';
    }

    function formatTime(value) {
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

    function loadSessions() {
      isHistoryLoading.value = true;
      setTimeout(() => {
        sessions.value = MockStore.listSessions().sessions;
        isHistoryLoading.value = false;
      }, 250);
    }

    function newConversation() {
      if (isLoading.value) return;
      activeSessionId.value = '';
      messages.value = [];
      question.value = '';
      showHistory.value = false;
      nextTick(autoResize);
    }

    function openConversation(item) {
      if (!item?.id || isLoading.value) return;
      const payload = MockStore.getSession(item.id);
      activeSessionId.value = item.id;
      messages.value = (payload.messages || []).map((message) => {
        if (message.role === 'user') {
          return { id: message.id, role: 'user', content: message.content };
        }
        return {
          id: message.id,
          role: 'assistant',
          content: message.content,
          status: 'done',
          answer: message.answer || null,
          error: ''
        };
      });
      showHistory.value = false;
      scrollToLatest();
    }

    async function deleteConversation(item) {
      const ok = await LegalDemo.confirm({
        title: 'Delete session',
        message: `Delete "${item.title || 'Untitled consultation'}"?`
      });
      if (!ok) return;
      MockStore.deleteSession(item.id);
      sessions.value = MockStore.listSessions().sessions;
      if (activeSessionId.value === item.id) newConversation();
    }

    function useExample(example) {
      question.value = example;
      nextTick(autoResize);
    }

    function autoResize() {
      const el = composerInput.value;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
    }

    function scrollToLatest() {
      nextTick(() => {
        const thread = threadElement.value;
        if (thread) thread.scrollTop = thread.scrollHeight;
      });
    }

    function markdownHtml(value) {
      const source = String(value || '').replace(/\r\n?/g, '\n').trim();
      if (!source) return '';
      const escape = (text) =>
        text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
      const inline = (text) =>
        escape(text)
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/`([^`]+)`/g, '<code>$1</code>');
      return source
        .split(/\n{2,}/)
        .map((block) => {
          const lines = block.split('\n');
          if (lines.every((line) => /^[-*]\s+/.test(line.trim()) || !line.trim())) {
            return `<ul>${lines
              .filter(Boolean)
              .map((line) => `<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`)
              .join('')}</ul>`;
          }
          return `<p>${lines.map(inline).join('<br>')}</p>`;
        })
        .join('');
    }

    function changeLabel(decision) {
      return (
        {
          conditional_change: 'Conditional change',
          verify: 'Needs confirmation',
          blocked: 'Unable to determine'
        }[decision] || 'Needs confirmation'
      );
    }

    async function resolveMessage(assistantMessage) {
      isLoading.value = true;
      assistantMessage.status = 'loading';
      assistantMessage.error = '';
      assistantMessage.answer = null;
      scrollToLatest();
      try {
        const payload = await MockStore.ask(assistantMessage.question, activeSessionId.value || null);
        activeSessionId.value = payload.session.id;
        assistantMessage.id = payload.assistant_message.id;
        assistantMessage.content = payload.assistant_message.content;
        assistantMessage.answer = payload.assistant_message.answer;
        assistantMessage.status = 'done';
        loadSessions();
      } catch (error) {
        assistantMessage.status = 'error';
        assistantMessage.error = error?.message || 'Regulation Q&A is temporarily unavailable. Please try again later.';
      } finally {
        isLoading.value = false;
        scrollToLatest();
        nextTick(autoResize);
      }
    }

    async function submitQuestion() {
      const content = question.value.trim();
      if (!content || isLoading.value) return;
      question.value = '';
      nextTick(autoResize);
      const clientId = LegalDemo.uid('msg');
      messages.value.push({ id: `${clientId}-user`, role: 'user', content });
      const assistantMessage = {
        id: `${clientId}-assistant`,
        role: 'assistant',
        question: content,
        status: 'loading',
        answer: null,
        error: ''
      };
      messages.value.push(assistantMessage);
      await resolveMessage(assistantMessage);
    }

    function handleComposerKeydown(event) {
      if (event.key !== 'Enter' || event.shiftKey) return;
      if (event.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      submitQuestion();
    }

    async function retryMessage(message) {
      if (!message || isLoading.value) return;
      await resolveMessage(message);
    }

    onMounted(loadSessions);

    return {
      examples,
      question,
      messages,
      sessions,
      activeSessionId,
      isLoading,
      isHistoryLoading,
      showAccountMenu,
      showHelpModal,
      helpVideoUrl,
      showHistory,
      threadElement,
      composerInput,
      currentUser,
      initials,
      greeting,
      canSend,
      logout,
      goKnowledge,
      formatTime,
      newConversation,
      openConversation,
      deleteConversation,
      useExample,
      submitQuestion,
      handleComposerKeydown,
      retryMessage,
      markdownHtml,
      changeLabel,
      autoResize
    };
  }
}).mount('#qa-app');
